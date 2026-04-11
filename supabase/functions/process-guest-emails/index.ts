import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

async function callSendGuestEmail(
  reservationId: string,
  emailType: string,
  language?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/functions/v1/send-guest-email`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reservation_id: reservationId,
          email_type: emailType,
          language,
        }),
      }
    );
    const data = await res.json();
    return { success: data.success === true, error: data.error };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];
    const tomorrowDate = new Date(now);
    tomorrowDate.setDate(tomorrowDate.getDate() + 1);
    const tomorrowStr = tomorrowDate.toISOString().split("T")[0];

    const results = {
      checkin_reminders: { queued: 0, sent: 0, failed: 0, skipped: 0 },
      checkout_thankyous: { queued: 0, sent: 0, failed: 0, skipped: 0 },
      confirmations: { queued: 0, sent: 0, failed: 0, skipped: 0 },
    };

    // 1. Check-in reminders: reservations checking in tomorrow that haven't had a reminder sent
    const { data: checkinReservations } = await supabase
      .from("reservations")
      .select("id, hotel_id, guest:guests(email), hotel:hotels(language)")
      .eq("check_in", tomorrowStr)
      .in("status", ["confirmed", "pending"])
      .not("guest_id", "is", null);

    for (const r of checkinReservations || []) {
      results.checkin_reminders.queued++;

      const { data: existing } = await supabase
        .from("guest_emails")
        .select("id, status")
        .eq("reservation_id", r.id)
        .eq("email_type", "checkin_reminder")
        .maybeSingle();

      if (existing && (existing.status === "sent" || existing.status === "skipped")) {
        results.checkin_reminders.skipped++;
        continue;
      }

      const guest = r.guest as any;
      if (!guest?.email) {
        results.checkin_reminders.skipped++;
        continue;
      }

      const hotel = r.hotel as any;
      const res = await callSendGuestEmail(
        r.id,
        "checkin_reminder",
        hotel?.language
      );

      if (res.success) {
        results.checkin_reminders.sent++;
      } else {
        results.checkin_reminders.failed++;
      }
    }

    // 2. Checkout thank-yous: reservations that checked out today
    const { data: checkoutReservations } = await supabase
      .from("reservations")
      .select("id, hotel_id, guest:guests(email), hotel:hotels(language)")
      .eq("check_out", todayStr)
      .in("status", ["confirmed", "checked_out"])
      .not("guest_id", "is", null);

    for (const r of checkoutReservations || []) {
      results.checkout_thankyous.queued++;

      const { data: existing } = await supabase
        .from("guest_emails")
        .select("id, status")
        .eq("reservation_id", r.id)
        .eq("email_type", "checkout_thankyou")
        .maybeSingle();

      if (existing && (existing.status === "sent" || existing.status === "skipped")) {
        results.checkout_thankyous.skipped++;
        continue;
      }

      const guest = r.guest as any;
      if (!guest?.email) {
        results.checkout_thankyous.skipped++;
        continue;
      }

      const hotel = r.hotel as any;
      const res = await callSendGuestEmail(
        r.id,
        "checkout_thankyou",
        hotel?.language
      );

      if (res.success) {
        results.checkout_thankyous.sent++;
      } else {
        results.checkout_thankyous.failed++;
      }
    }

    // 3. Unsent confirmations: reservations created recently with no confirmation email
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString();
    const { data: newReservations } = await supabase
      .from("reservations")
      .select("id, hotel_id, guest:guests(email), hotel:hotels(language)")
      .gte("created_at", twoHoursAgo)
      .in("status", ["confirmed", "pending"])
      .not("guest_id", "is", null);

    for (const r of newReservations || []) {
      results.confirmations.queued++;

      const { data: existing } = await supabase
        .from("guest_emails")
        .select("id, status")
        .eq("reservation_id", r.id)
        .eq("email_type", "confirmation")
        .maybeSingle();

      if (existing && (existing.status === "sent" || existing.status === "skipped")) {
        results.confirmations.skipped++;
        continue;
      }

      const guest = r.guest as any;
      if (!guest?.email) {
        results.confirmations.skipped++;
        continue;
      }

      const hotel = r.hotel as any;
      const res = await callSendGuestEmail(
        r.id,
        "confirmation",
        hotel?.language
      );

      if (res.success) {
        results.confirmations.sent++;
      } else {
        results.confirmations.failed++;
      }
    }

    console.log("process-guest-emails results:", JSON.stringify(results));

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("process-guest-emails error:", err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
