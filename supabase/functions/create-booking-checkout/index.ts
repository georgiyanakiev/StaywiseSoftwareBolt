import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import Stripe from "npm:stripe@17";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface CheckoutPayload {
  bookingId?: string;
  booking?: Record<string, unknown>;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function nightsBetween(checkIn: string, checkOut: string): number {
  const d1 = new Date(checkIn);
  const d2 = new Date(checkOut);
  return Math.max(1, Math.round((d2.getTime() - d1.getTime()) / 86400000));
}

// Return addresses are never taken from the request: an attacker could point a
// paying guest at a site they control. They are derived from the configured app
// origin instead.
function appBaseUrl(req: Request): string {
  const configured = (Deno.env.get("APP_URL") ?? "").replace(/\/+$/, "");
  const origin = req.headers.get("origin") ?? "";
  if (configured) {
    if (origin && origin.replace(/\/+$/, "") === configured) return configured;
    return configured;
  }
  try {
    const parsed = new URL(origin);
    if (parsed.protocol === "https:") return parsed.origin;
  } catch {
    // ignore
  }
  return "";
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      return json({ error: "Stripe is not configured" }, 500);
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2024-12-18.acacia" });
    const payload: CheckoutPayload = await req.json();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    let bookingId = payload.bookingId;
    if (!bookingId && payload.booking) {
      const b = payload.booking;
      const { data, error } = await supabase.rpc("reserve_direct_booking_hold", {
        p_hotel_id: b.hotelId, p_room_type_id: b.roomTypeId, p_tenant_id: b.tenantId ?? null,
        p_checkout_request_id: b.requestId, p_confirmation_number: b.confirmationNumber,
        p_guest_name: b.guestName, p_guest_email: b.guestEmail, p_guest_phone: b.guestPhone ?? '', p_guest_country: b.guestCountry ?? '',
        p_check_in: b.checkIn, p_check_out: b.checkOut, p_adults: b.adults, p_children: b.children,
        p_rate_per_night: b.ratePerNight, p_subtotal: b.subtotal, p_tax_amount: b.taxAmount,
        p_total_amount: b.totalAmount, p_deposit_amount: b.depositAmount, p_special_requests: b.specialRequests ?? '',
      });
      if (error || !data?.[0]?.id) return json({ error: error?.message ?? "Unable to reserve availability" }, 409);
      bookingId = data[0].id;
    }
    if (!bookingId) return json({ error: "Missing booking details" }, 400);

    // Everything that decides the charge is read from the stored booking, never
    // from the request body.
    const { data: booking, error: bookingErr } = await supabase
      .from("direct_bookings")
      .select(
        "id, hotel_id, tenant_id, confirmation_number, guest_email, check_in, check_out, total_amount, deposit_amount, payment_status, status, stripe_session_id, room_type:room_types(name), hotel:hotels(name, currency)"
      )
      .eq("id", bookingId)
      .maybeSingle();

    if (bookingErr || !booking) {
      return json({ error: "Booking not found" }, 404);
    }

    if (["paid", "deposit_paid", "refunded"].includes(String(booking.payment_status))) {
      return json({ error: "This booking has already been paid" }, 409);
    }

    if (["cancelled", "checked_out", "no_show"].includes(String(booking.status))) {
      return json({ error: "This booking is no longer open for payment" }, 409);
    }

    // A browser retry may arrive after Stripe created a session but before the
    // client received its URL. Reuse that open session instead of charging or
    // reserving the same booking twice.
    if (booking.stripe_session_id) {
      const existingSession = await stripe.checkout.sessions.retrieve(booking.stripe_session_id);
      if (existingSession.status === "open" && existingSession.url) {
        return json({ bookingId: booking.id, sessionId: existingSession.id, url: existingSession.url });
      }
    }

    const { data: config } = await supabase
      .from("booking_engine_config")
      .select("require_deposit, payment_mode, currency, stripe_enabled")
      .eq("hotel_id", booking.hotel_id)
      .maybeSingle();

    if (!config?.stripe_enabled) {
      return json({ error: "Online payment is not enabled for this property" }, 400);
    }

    const total = Number(booking.total_amount ?? 0);
    const deposit = Number(booking.deposit_amount ?? 0);
    const depositMode =
      config.require_deposit === true &&
      config.payment_mode === "deposit" &&
      deposit > 0 &&
      deposit < total;

    const amountToCharge = depositMode ? deposit : total;
    if (!Number.isFinite(amountToCharge) || amountToCharge <= 0) {
      return json({ error: "This booking has no payable amount" }, 400);
    }

    const hotelRecord = booking.hotel as { name?: string; currency?: string } | null;
    const roomRecord = booking.room_type as { name?: string } | null;
    const hotelName = hotelRecord?.name ?? "Hotel";
    const roomName = roomRecord?.name ?? "Room";
    const currency = (config.currency || hotelRecord?.currency || "GBP").toLowerCase();
    const nights = nightsBetween(booking.check_in, booking.check_out);

    const base = appBaseUrl(req);
    const returnParams = `hotel=${booking.hotel_id}&tenant=${booking.tenant_id ?? ""}&booking_id=${booking.id}`;
    const successUrl = `${base}/booking-engine/widget?${returnParams}&session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${base}/booking-engine/widget?${returnParams}&cancelled=true`;

    const description = depositMode
      ? `Deposit for ${roomName} (${nights} night${nights !== 1 ? "s" : ""})`
      : `${roomName} — ${nights} night${nights !== 1 ? "s" : ""} (${booking.check_in} to ${booking.check_out})`;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      customer_email: booking.guest_email || undefined,
      line_items: [
        {
          price_data: {
            currency,
            unit_amount: Math.round(amountToCharge * 100),
            product_data: {
              name: depositMode
                ? `Booking Deposit — ${hotelName}`
                : `Room Booking — ${hotelName}`,
              description,
            },
          },
          quantity: 1,
        },
      ],
      metadata: {
        booking_id: booking.id,
        hotel_name: hotelName,
        deposit_mode: String(depositMode),
      },
      success_url: successUrl,
      cancel_url: cancelUrl,
      expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
    }, {
      // Retries within the checkout hold period return the same Stripe session.
      idempotencyKey: `${booking.id}:${Math.floor(Date.now() / (30 * 60 * 1000))}`,
    });

    const { error: updateError } = await supabase
      .from("direct_bookings")
      .update({
        stripe_session_id: session.id,
        payment_status: "pending",
      })
      .eq("id", booking.id);

    if (updateError) throw updateError;

    return json({ bookingId: booking.id, sessionId: session.id, url: session.url });
  } catch (err) {
    console.error("create-booking-checkout error", err);
    return json({ error: "Unable to start checkout" }, 500);
  }
});
