import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const rawText = await req.text();

    // Log raw payload so we can see exactly what Smoobu sends
    console.log("=== RAW SMOOBU PAYLOAD ===");
    console.log(rawText);
    console.log("==========================");

    let payload: any;
    try {
      payload = JSON.parse(rawText);
    } catch {
      console.error("Failed to parse JSON:", rawText);
      return new Response(JSON.stringify({ error: "Invalid JSON" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    console.log("Parsed payload keys:", Object.keys(payload));

    // Smoobu can send payload in different shapes — handle all of them
    const action = payload.action ?? payload.type ?? "newReservation";

    // Try all known Smoobu payload structures
    const booking =
      payload.reservation ??
      payload.booking ??
      payload.data ??
      (payload.id ? payload : null);

    console.log("Action:", action);
    console.log("Booking ID:", booking?.id ?? "NOT FOUND");
    console.log("Booking keys:", booking ? Object.keys(booking) : "null");

    if (!booking) {
      console.error("Could not find booking in payload:", JSON.stringify(payload));
      return new Response(
        JSON.stringify({
          error: "Could not find booking data",
          received_keys: Object.keys(payload),
          payload,
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const bookingData = {
      smoobu_id:          String(booking.id),
      property_id:        String(booking.apartment?.id ?? booking.apartmentId ?? ""),
      property_name:      booking.apartment?.name ?? booking.apartmentName ?? "",
      channel_name:       booking.channel?.name ?? booking.channelName ?? "Direct",
      channel_id:         String(booking.channel?.id ?? booking.channelId ?? ""),
      guest_name:         booking["guest-name"] ?? booking.guestName ?? booking.guest_name ?? "",
      guest_email:        booking.email ?? "",
      guest_phone:        booking.phone ?? "",
      adults:             booking.adults ?? 1,
      children:           booking.children ?? 0,
      arrival:            booking.arrival ?? booking.arrivalDate ?? "",
      departure:          booking.departure ?? booking.departureDate ?? "",
      check_in_time:      booking["check-in"] ?? booking.checkIn ?? "14:00",
      check_out_time:     booking["check-out"] ?? booking.checkOut ?? "11:00",
      total_price:        booking.price ?? booking.totalPrice ?? 0,
      price_paid:         booking["price-paid"] === "Yes" || booking.pricePaid === true,
      status:             mapStatus(action),
      notice:             booking.notice ?? "",
      guest_app_url:      booking["guest-app-url"] ?? booking.guestAppUrl ?? "",
      created_at_smoobu:  booking["created-at"] ?? booking.createdAt ?? null,
      modified_at_smoobu: booking["modified-at"] ?? booking.modifiedAt ?? null,
      raw_payload:        payload,
    };

    console.log("Mapped bookingData:", JSON.stringify(bookingData));

    if (!bookingData.smoobu_id || bookingData.smoobu_id === "undefined") {
      return new Response(
        JSON.stringify({ error: "Missing booking ID", payload }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

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

    if (action !== "cancelledReservation") {
      await blockAvailability(booking);
    } else {
      await unblockAvailability(booking);
    }

    console.log("Booking processed successfully:", data.id);

    return new Response(
      JSON.stringify({ success: true, booking_id: data.id, action }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error("Webhook error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: String(err) }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});

function mapStatus(action: string): string {
  switch (action) {
    case "newReservation":       return "confirmed";
    case "modifiedReservation":  return "modified";
    case "cancelledReservation": return "cancelled";
    default:                     return "confirmed";
  }
}

async function blockAvailability(booking: any) {
  const arrival   = booking.arrival ?? booking.arrivalDate;
  const departure = booking.departure ?? booking.departureDate;
  const aptId     = booking.apartment?.id ?? booking.apartmentId;
  if (!arrival || !departure || !aptId) return;
  const dates = getDatesInRange(arrival, departure);
  const rows = dates.map((date: string) => ({
    property_id:  String(aptId),
    date,
    is_available: false,
    smoobu_id:    String(booking.id),
  }));
  const { error } = await supabase
    .from("availability")
    .upsert(rows, { onConflict: "property_id,date" });
  if (error) console.error("Availability block error:", error);
}

async function unblockAvailability(booking: any) {
  const arrival   = booking.arrival ?? booking.arrivalDate;
  const departure = booking.departure ?? booking.departureDate;
  const aptId     = booking.apartment?.id ?? booking.apartmentId;
  if (!arrival || !departure || !aptId) return;
  const dates = getDatesInRange(arrival, departure);
  for (const date of dates) {
    await supabase
      .from("availability")
      .update({ is_available: true, smoobu_id: null })
      .eq("property_id", String(aptId))
      .eq("date", date);
  }
}

function getDatesInRange(start: string, end: string): string[] {
  const dates: string[] = [];
  const current = new Date(start);
  const last    = new Date(end);
  while (current < last) {
    dates.push(current.toISOString().split("T")[0]);
    current.setDate(current.getDate() + 1);
  }
  return dates;
}