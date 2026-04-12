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

function nightsBetween(checkIn: string, checkOut: string): number {
  const d1 = new Date(checkIn);
  const d2 = new Date(checkOut);
  return Math.max(1, Math.round((d2.getTime() - d1.getTime()) / 86400000));
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

    const { action, reservation_id } = await req.json();

    const appUrl =
      Deno.env.get("APP_URL") || req.headers.get("origin") || "";

    async function fetchReservation(id: string) {
      const { data, error } = await supabase
        .from("reservations")
        .select(
          "*, guest:guests(id, first_name, last_name, email, stripe_customer_id), room_type:room_types(name), hotel:hotels(name, currency)"
        )
        .eq("id", id)
        .maybeSingle();
      if (error || !data) throw new Error(error?.message || "Reservation not found");
      return data;
    }

    async function getOrCreateStripeCustomer(
      stripeInstance: Stripe,
      guest: { id: string; first_name: string; last_name: string; email: string; stripe_customer_id: string | null }
    ): Promise<string> {
      if (guest.stripe_customer_id) {
        return guest.stripe_customer_id;
      }
      const customer = await stripeInstance.customers.create({
        name: `${guest.first_name} ${guest.last_name}`,
        email: guest.email || undefined,
      });
      await supabase
        .from("guests")
        .update({ stripe_customer_id: customer.id })
        .eq("id", guest.id);
      return customer.id;
    }

    if (action === "charge_checkin") {
      if (!reservation_id) return jsonResponse({ error: "reservation_id is required" }, 400);

      const reservation = await fetchReservation(reservation_id);

      if (reservation.payment_status === "paid") {
        return jsonResponse({ message: "Already paid", status: "paid" });
      }

      const guest = reservation.guest;
      const guestName = guest ? `${guest.first_name} ${guest.last_name}` : "Guest";
      const hotelName = reservation.hotel?.name || "Hotel";
      const roomTypeName = reservation.room_type?.name || "Room";
      const currency = (reservation.hotel?.currency || "GBP").toLowerCase();
      const totalAmount = reservation.total_amount || 0;
      const amountInCents = Math.round(totalAmount * 100);
      const nights = nightsBetween(reservation.check_in, reservation.check_out);

      const customerId = guest ? await getOrCreateStripeCustomer(stripe, guest) : undefined;

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        mode: "payment",
        customer: customerId || undefined,
        customer_email: !customerId && guest?.email ? guest.email : undefined,
        line_items: [
          {
            price_data: {
              currency,
              unit_amount: amountInCents,
              product_data: {
                name: `${roomTypeName} — ${hotelName}`,
                description: `${nights} night${nights > 1 ? "s" : ""} | ${reservation.confirmation_code}: ${reservation.check_in} to ${reservation.check_out}`,
              },
            },
            quantity: 1,
          },
        ],
        metadata: {
          reservation_id,
          action: "checkin",
          guest_name: guestName,
          confirmation_code: reservation.confirmation_code,
        },
        payment_intent_data: {
          receipt_email: guest?.email || undefined,
        },
        success_url: `${appUrl}/reservations?payment=success&reservation=${reservation_id}`,
        cancel_url: `${appUrl}/reservations?payment=cancelled&reservation=${reservation_id}`,
      });

      await supabase
        .from("reservations")
        .update({
          stripe_checkout_session_id: session.id,
          charged_at_checkin: new Date().toISOString(),
        })
        .eq("id", reservation_id);

      return jsonResponse({
        checkout_url: session.url,
        session_id: session.id,
        amount: totalAmount,
        currency,
      });
    }

    if (action === "charge_checkout") {
      if (!reservation_id) return jsonResponse({ error: "reservation_id is required" }, 400);

      const reservation = await fetchReservation(reservation_id);
      const remaining = (reservation.total_amount || 0) - (reservation.amount_paid || 0);

      if (remaining <= 0) {
        if (reservation.stripe_payment_intent_id && reservation.guest?.email) {
          await stripe.paymentIntents.update(reservation.stripe_payment_intent_id, {
            receipt_email: reservation.guest.email,
          });
        }
        return jsonResponse({ message: "Fully paid — receipt sent", status: "paid", remaining: 0 });
      }

      const guest = reservation.guest;
      const guestName = guest ? `${guest.first_name} ${guest.last_name}` : "Guest";
      const currency = (reservation.hotel?.currency || "GBP").toLowerCase();
      const amountInCents = Math.round(remaining * 100);

      const customerId = guest ? await getOrCreateStripeCustomer(stripe, guest) : undefined;

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        mode: "payment",
        customer: customerId || undefined,
        customer_email: !customerId && guest?.email ? guest.email : undefined,
        line_items: [
          {
            price_data: {
              currency,
              unit_amount: amountInCents,
              product_data: {
                name: `Remaining balance — ${reservation.confirmation_code}`,
                description: `Outstanding balance for reservation ${reservation.confirmation_code}`,
              },
            },
            quantity: 1,
          },
        ],
        metadata: {
          reservation_id,
          action: "checkout",
          guest_name: guestName,
          confirmation_code: reservation.confirmation_code,
        },
        payment_intent_data: {
          receipt_email: guest?.email || undefined,
        },
        success_url: `${appUrl}/reservations?payment=success&reservation=${reservation_id}`,
        cancel_url: `${appUrl}/reservations?payment=cancelled&reservation=${reservation_id}`,
      });

      await supabase
        .from("reservations")
        .update({
          stripe_checkout_session_id: session.id,
          charged_at_checkout: new Date().toISOString(),
        })
        .eq("id", reservation_id);

      return jsonResponse({
        checkout_url: session.url,
        session_id: session.id,
        amount: remaining,
        currency,
      });
    }

    if (action === "create_checkout_session") {
      if (!reservation_id) return jsonResponse({ error: "reservation_id is required" }, 400);

      const reservation = await fetchReservation(reservation_id);
      const guest = reservation.guest;
      const guestName = guest ? `${guest.first_name} ${guest.last_name}` : "Guest";
      const hotelName = reservation.hotel?.name || "Hotel";
      const roomTypeName = reservation.room_type?.name || "Room";
      const currency = (reservation.hotel?.currency || "GBP").toLowerCase();
      const totalAmount = reservation.total_amount || 0;
      const amountInCents = Math.round(totalAmount * 100);

      const customerId = guest ? await getOrCreateStripeCustomer(stripe, guest) : undefined;

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        mode: "payment",
        customer: customerId || undefined,
        customer_email: !customerId && guest?.email ? guest.email : undefined,
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

      return jsonResponse({ checkout_url: session.url, session_id: session.id });
    }

    if (action === "send_receipt") {
      if (!reservation_id) return jsonResponse({ error: "reservation_id is required" }, 400);

      const reservation = await fetchReservation(reservation_id);

      if (!reservation.stripe_payment_intent_id) {
        return jsonResponse({ error: "No Stripe payment found for this reservation" }, 400);
      }

      const guestEmail = reservation.guest?.email;
      if (!guestEmail) {
        return jsonResponse({ error: "Guest has no email address" }, 400);
      }

      await stripe.paymentIntents.update(reservation.stripe_payment_intent_id, {
        receipt_email: guestEmail,
      });

      return jsonResponse({ message: `Receipt sent to ${guestEmail}` });
    }

    if (action === "refund") {
      if (!reservation_id) return jsonResponse({ error: "reservation_id is required" }, 400);

      const { data: reservation, error: resErr } = await supabase
        .from("reservations")
        .select("stripe_payment_intent_id, total_amount")
        .eq("id", reservation_id)
        .maybeSingle();

      if (resErr || !reservation) {
        return jsonResponse({ error: resErr?.message || "Reservation not found" }, 404);
      }

      if (!reservation.stripe_payment_intent_id) {
        return jsonResponse({ error: "No Stripe payment found for this reservation" }, 400);
      }

      const refund = await stripe.refunds.create({
        payment_intent: reservation.stripe_payment_intent_id,
        reason: "requested_by_customer",
      });

      await supabase
        .from("reservations")
        .update({ payment_status: "refunded", amount_paid: 0 })
        .eq("id", reservation_id);

      await supabase
        .from("invoices")
        .update({ status: "cancelled" })
        .eq("reservation_id", reservation_id);

      return jsonResponse({
        refund_id: refund.id,
        status: refund.status,
        message: "Refund processed successfully",
      });
    }

    if (action === "get_status") {
      if (!reservation_id) return jsonResponse({ error: "reservation_id is required" }, 400);

      const { data: reservation, error: resErr } = await supabase
        .from("reservations")
        .select("stripe_payment_intent_id, payment_status, amount_paid")
        .eq("id", reservation_id)
        .maybeSingle();

      if (resErr || !reservation) {
        return jsonResponse({ error: resErr?.message || "Reservation not found" }, 404);
      }

      if (!reservation.stripe_payment_intent_id) {
        return jsonResponse({
          payment_status: reservation.payment_status,
          amount_received: reservation.amount_paid,
          currency: null,
          stripe_status: null,
        });
      }

      const pi = await stripe.paymentIntents.retrieve(reservation.stripe_payment_intent_id);

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
