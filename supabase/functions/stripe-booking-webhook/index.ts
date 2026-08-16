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
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

    if (!stripeKey || !webhookSecret) {
      return jsonResponse({ error: "Stripe not configured" }, 500);
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2024-12-18.acacia" });
    const body = await req.text();
    const signature = req.headers.get("stripe-signature");

    if (!signature) {
      return jsonResponse({ error: "Missing stripe-signature header" }, 400);
    }

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      return jsonResponse(
        { error: `Webhook verification failed: ${err}` },
        400
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const reservationId = session.metadata?.reservation_id;
      const bookingId = session.metadata?.booking_id;

      const paymentIntentId =
        typeof session.payment_intent === "string"
          ? session.payment_intent
          : session.payment_intent?.id ?? null;

      const amountTotal = session.amount_total
        ? session.amount_total / 100
        : 0;

      if (reservationId) {
        await supabase
          .from("reservations")
          .update({
            payment_status: "paid",
            amount_paid: amountTotal,
            stripe_payment_intent_id: paymentIntentId,
            payment_method: "credit_card",
          })
          .eq("id", reservationId);

        const { data: existingInvoice } = await supabase
          .from("invoices")
          .select("id")
          .eq("reservation_id", reservationId)
          .maybeSingle();

        if (!existingInvoice) {
          const { data: res } = await supabase
            .from("reservations")
            .select("hotel_id, guest_id, confirmation_code, check_in, check_out, total_amount, tax_amount, discount_amount, tenant_id")
            .eq("id", reservationId)
            .maybeSingle();

          if (res) {
            const rand = new Uint32Array(1);
            crypto.getRandomValues(rand);
            const invoiceNumber = `INV-${new Date().getFullYear()}-${String(rand[0] % 100000000).padStart(8, "0")}`;
            const subtotal = (res.total_amount || 0) - (res.tax_amount || 0);

            const { data: newInvoice } = await supabase
              .from("invoices")
              .insert({
                hotel_id: res.hotel_id,
                reservation_id: reservationId,
                guest_id: res.guest_id,
                invoice_number: invoiceNumber,
                issue_date: new Date().toISOString().split("T")[0],
                due_date: res.check_out,
                subtotal,
                tax_amount: res.tax_amount || 0,
                discount_amount: res.discount_amount || 0,
                total_amount: res.total_amount || 0,
                amount_paid: amountTotal,
                status: "paid",
                ...(res.tenant_id ? { tenant_id: res.tenant_id } : {}),
              })
              .select("id")
              .maybeSingle();

            if (newInvoice) {
              await supabase.from("invoice_items").insert({
                invoice_id: newInvoice.id,
                description: `Reservation ${res.confirmation_code}: ${res.check_in} to ${res.check_out}`,
                category: "room",
                quantity: 1,
                unit_price: subtotal,
                total_price: subtotal,
                ...(res.tenant_id ? { tenant_id: res.tenant_id } : {}),
              });
            }
          }
        }
      }

      if (bookingId) {
        // Only mark the booking paid in full when the amount Stripe actually
        // captured covers the booking total. A deposit-mode checkout captures
        // less, and must not clear the outstanding balance.
        const { data: bookingRow } = await supabase
          .from("direct_bookings")
          .select("total_amount")
          .eq("id", bookingId)
          .maybeSingle();

        const bookingTotal = Number(bookingRow?.total_amount ?? 0);
        const depositMode = session.metadata?.deposit_mode === "true";
        const fullyPaid =
          !depositMode && (bookingTotal <= 0 || amountTotal + 0.001 >= bookingTotal);

        await supabase
          .from("direct_bookings")
          .update({
            payment_status: fullyPaid ? "paid" : "deposit_paid",
            stripe_payment_intent_id: paymentIntentId,
            paid_at: new Date().toISOString(),
            status: "confirmed",
          })
          .eq("id", bookingId);
      }
    }

    if (event.type === "payment_intent.succeeded") {
      const pi = event.data.object as Stripe.PaymentIntent;
      const amountReceived = pi.amount_received / 100;

      const { data: res } = await supabase
        .from("reservations")
        .select("id")
        .eq("stripe_payment_intent_id", pi.id)
        .maybeSingle();

      if (res) {
        await supabase
          .from("reservations")
          .update({
            payment_status: "paid",
            amount_paid: amountReceived,
          })
          .eq("id", res.id);
      }
    }

    if (event.type === "payment_intent.payment_failed") {
      const pi = event.data.object as Stripe.PaymentIntent;

      await supabase
        .from("reservations")
        .update({ payment_status: "failed" })
        .eq("stripe_payment_intent_id", pi.id);
    }

    if (event.type === "charge.refunded") {
      const charge = event.data.object as Stripe.Charge;
      const paymentIntentId =
        typeof charge.payment_intent === "string"
          ? charge.payment_intent
          : charge.payment_intent?.id;

      if (paymentIntentId) {
        const { data: res } = await supabase
          .from("reservations")
          .select("id")
          .eq("stripe_payment_intent_id", paymentIntentId)
          .maybeSingle();

        if (res) {
          await supabase
            .from("reservations")
            .update({ payment_status: "refunded", amount_paid: 0 })
            .eq("id", res.id);

          await supabase
            .from("invoices")
            .update({ status: "cancelled" })
            .eq("reservation_id", res.id);
        }

        await supabase
          .from("direct_bookings")
          .update({ payment_status: "refunded" })
          .eq("stripe_payment_intent_id", paymentIntentId);
      }
    }

    if (event.type === "checkout.session.expired") {
      const session = event.data.object as Stripe.Checkout.Session;
      const bookingId = session.metadata?.booking_id;
      const reservationId = session.metadata?.reservation_id;

      if (bookingId) {
        await supabase
          .from("direct_bookings")
          .update({ payment_status: "failed", status: "cancelled" })
          .eq("id", bookingId);
      }

      if (reservationId) {
        await supabase
          .from("reservations")
          .update({ payment_status: "failed" })
          .eq("id", reservationId);
      }
    }

    return jsonResponse({ received: true });
  } catch (err) {
    return jsonResponse({ error: String(err) }, 500);
  }
});
