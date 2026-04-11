import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

serve(async (req: Request) => {
  // Only accept POST requests
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const payload = await req.json();

    console.log("Smoobu webhook received:", JSON.stringify(payload, null, 2));

    // Smoobu sends different event types
    const action = payload.action; // "newReservation" | "modifiedReservation" | "cancelledReservation"
    const booking = payload.reservation || payload;

    if (!booking || !booking.id) {
      return new Response(JSON.stringify({ error: "Invalid payload" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Map Smoobu booking to StayWise bookings table
    const bookingData = {
      smoobu_id:          String(booking.id),
      property_id:        String(booking.apartment?.id ?? ""),
      property_name:      booking.apartment?.name ?? "",
      channel_name:       booking.channel?.name ?? "Direct",
      channel_id:         String(booking.channel?.id ?? ""),
      guest_name:         booking["guest-name"] ?? "",
      guest_email:        booking.email ?? "",
      guest_phone:        booking.phone ?? "",
      adults:             booking.adults ?? 1,
      children:           booking.children ?? 0,
      arrival:            booking.arrival,
      departure:          booking.departure,
      check_in_time:      booking["check-in"] ?? "14:00",
      check_out_time:     booking["check-out"] ?? "11:00",
      total_price:        booking.price ?? 0,
      price_paid:         booking["price-paid"] === "Yes",
      status:             mapStatus(action),
      notice:             booking.notice ?? "",
      guest_app_url:      booking["guest-app-url"] ?? "",
      created_at_smoobu:  booking["created-at"] ?? null,
      modified_at_smoobu: booking["modified-at"] ?? null,
      raw_payload:        payload,
    };

    // Upsert — insert or update based on smoobu_id
    const { data, error } = await supabase
      .from("bookings")
      .upsert(bookingData, { onConflict: "smoobu_id" })
      .select()
      .single();

    if (error) {
      console.error("Supabase upsert error:", error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Also update property availability in the calendar
    if (action !== "cancelledReservation") {
      await blockAvailability(booking);
    } else {
      await unblockAvailability(booking);
    }

    console.log(`Booking ${action} processed:`, data.id);

    return new Response(
      JSON.stringify({ success: true, booking_id: data.id, action }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error("Webhook error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});

// Map Smoobu action to StayWise booking status
function mapStatus(action: string): string {
  switch (action) {
    case "newReservation":      return "confirmed";
    case "modifiedReservation": return "modified";
    case "cancelledReservation":return "cancelled";
    default:                    return "confirmed";
  }
}

// Block dates in the availability/calendar table
async function blockAvailability(booking: any) {
  if (!booking.arrival || !booking.departure || !booking.apartment?.id) return;

  const dates = getDatesInRange(booking.arrival, booking.departure);

  const rows = dates.map((date: string) => ({
    property_id:  String(booking.apartment.id),
    date,
    is_available: false,
    smoobu_id:    String(booking.id),
  }));

  const { error } = await supabase
    .from("availability")
    .upsert(rows, { onConflict: "property_id,date" });

  if (error) console.error("Availability block error:", error);
}

// Unblock dates when booking is cancelled
async function unblockAvailability(booking: any) {
  if (!booking.arrival || !booking.departure || !booking.apartment?.id) return;

  const dates = getDatesInRange(booking.arrival, booking.departure);

  for (const date of dates) {
    await supabase
      .from("availability")
      .update({ is_available: true, smoobu_id: null })
      .eq("property_id", String(booking.apartment.id))
      .eq("date", date);
  }
}

// Generate array of dates between arrival and departure
function getDatesInRange(start: string, end: string): string[] {
  const dates: string[] = [];
  const current = new Date(start);
  const last = new Date(end);

  while (current < last) {
    dates.push(current.toISOString().split("T")[0]);
    current.setDate(current.getDate() + 1);
  }

  return dates;
}