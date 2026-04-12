import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import Stripe from "npm:stripe@17";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      return jsonResponse({ error: "Stripe is not configured" }, 500);
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2024-12-18.acacia" });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { action, reservation_id, ...params } = await req.json();

    if (action === "create_checkout_session") {
      if (!reservation_id) {
        return jsonResponse({ error: "reservation_id is required" }, 400);
      }

      const { data: reservation, error: resErr } = await supabase
        .from("reservations")
        .select(
          "*, guest:guests(first_name, last_name, email), room_type:room_types(name), hotel:hotels(name, currency)"
        )
        .eq("id", reservation_id)
        .maybeSingle();

      if (resErr || !reservation) {
        return jsonResponse(
          { error: resErr?.message || "Reservation not found" },
          404
        );
      }

      const guestEmail = reservation.guest?.email || undefined;
      const guestName = reservation.guest
        ? `${reservation.guest.first_name} ${reservation.guest.last_name}`
        : "Guest";
      const hotelName = reservation.hotel?.name || "Hotel";
      const roomTypeName = reservation.room_type?.name || "Room";
      const currency = (
        reservation.hotel?.currency || "GBP"
      ).toLowerCase();
      const totalAmount = reservation.total_amount || 0;
      const amountInCents = Math.round(totalAmount * 100);

      const appUrl =
        Deno.env.get("APP_URL") || req.headers.get("origin") || "";

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        mode: "payment",
        customer_email: guestEmail || undefined,
        line_items: [
          {
            price_data: {
              currency,
              unit_amount: amountInCents,
              product_data: {
                name: `${roomTypeName} — ${hotelName}`,
                description: `Reservation ${reservation.confirmation_code}: ${reservation.check_in} to ${reservation.check_out}`,
              },
            },
            quantity: 1,
          },
        ],
        metadata: {
          reservation_id,
          guest_name: guestName,
          confirmation_code: reservation.confirmation_code,
        },
        success_url: `${appUrl}/reservations?payment=success&reservation=${reservation_id}`,
        cancel_url: `${appUrl}/reservations?payment=cancelled&reservation=${reservation_id}`,
      });

      await supabase
        .from("reservations")
        .update({ stripe_checkout_session_id: session.id })
        .eq("id", reservation_id);

      return jsonResponse({
        checkout_url: session.url,
        session_id: session.id,
      });
    }

    if (action === "refund") {
      if (!reservation_id) {
        return jsonResponse({ error: "reservation_id is required" }, 400);
      }

      const { data: reservation, error: resErr } = await supabase
        .from("reservations")
        .select("stripe_payment_intent_id, total_amount")
        .eq("id", reservation_id)
        .maybeSingle();

      if (resErr || !reservation) {
        return jsonResponse(
          { error: resErr?.message || "Reservation not found" },
          404
        );
      }

      if (!reservation.stripe_payment_intent_id) {
        return jsonResponse(
          { error: "No Stripe payment found for this reservation" },
          400
        );
      }

      const refund = await stripe.refunds.create({
        payment_intent: reservation.stripe_payment_intent_id,
      });

      await supabase
        .from("reservations")
        .update({
          payment_status: "refunded",
          amount_paid: 0,
        })
        .eq("id", reservation_id);

      await supabase
        .from("invoices")
        .update({ status: "cancelled" })
        .eq("reservation_id", reservation_id);

      return jsonResponse({
        refund_id: refund.id,
        status: refund.status,
      });
    }

    if (action === "get_status") {
      if (!reservation_id) {
        return jsonResponse({ error: "reservation_id is required" }, 400);
      }

      const { data: reservation, error: resErr } = await supabase
        .from("reservations")
        .select("stripe_payment_intent_id, payment_status, amount_paid")
        .eq("id", reservation_id)
        .maybeSingle();

      if (resErr || !reservation) {
        return jsonResponse(
          { error: resErr?.message || "Reservation not found" },
          404
        );
      }

      if (!reservation.stripe_payment_intent_id) {
        return jsonResponse({
          payment_status: reservation.payment_status,
          amount_received: reservation.amount_paid,
          currency: null,
          stripe_status: null,
        });
      }

      const pi = await stripe.paymentIntents.retrieve(
        reservation.stripe_payment_intent_id
      );

      return jsonResponse({
        payment_status: pi.status === "succeeded" ? "paid" : pi.status,
        amount_received: pi.amount_received / 100,
        currency: pi.currency,
        stripe_status: pi.status,
      });
    }

    return jsonResponse({ error: `Unknown action: ${action}` }, 400);
  } catch (err) {
    return jsonResponse({ error: String(err) }, 500);
  }
});
