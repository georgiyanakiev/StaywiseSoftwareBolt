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
  bookingId: string;
  hotelName: string;
  roomName: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  currency: string;
  amountToCharge: number;
  depositMode: boolean;
  guestEmail: string;
  successUrl: string;
  cancelUrl: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      return new Response(
        JSON.stringify({ error: "Stripe is not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2024-12-18.acacia" });
    const payload: CheckoutPayload = await req.json();

    const required: (keyof CheckoutPayload)[] = [
      "bookingId",
      "hotelName",
      "roomName",
      "amountToCharge",
      "currency",
      "successUrl",
      "cancelUrl",
    ];
    for (const field of required) {
      if (!payload[field]) {
        return new Response(
          JSON.stringify({ error: `Missing required field: ${field}` }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    }

    const amountInCents = Math.round(payload.amountToCharge * 100);

    const description = payload.depositMode
      ? `Deposit for ${payload.roomName} (${payload.nights} night${payload.nights !== 1 ? "s" : ""})`
      : `${payload.roomName} — ${payload.nights} night${payload.nights !== 1 ? "s" : ""} (${payload.checkIn} to ${payload.checkOut})`;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      customer_email: payload.guestEmail || undefined,
      line_items: [
        {
          price_data: {
            currency: payload.currency.toLowerCase(),
            unit_amount: amountInCents,
            product_data: {
              name: payload.depositMode
                ? `Booking Deposit — ${payload.hotelName}`
                : `Room Booking — ${payload.hotelName}`,
              description,
            },
          },
          quantity: 1,
        },
      ],
      metadata: {
        booking_id: payload.bookingId,
        hotel_name: payload.hotelName,
        deposit_mode: String(payload.depositMode),
      },
      success_url: payload.successUrl,
      cancel_url: payload.cancelUrl,
    });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    await supabase
      .from("direct_bookings")
      .update({
        stripe_session_id: session.id,
        payment_status: "pending",
      })
      .eq("id", payload.bookingId);

    return new Response(
      JSON.stringify({ sessionId: session.id, url: session.url }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
