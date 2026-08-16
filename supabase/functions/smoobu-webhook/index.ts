import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

const MAX_ATTEMPTS = 3;
const RETRY_DELAYS = [0, 2000, 5000];

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

function timingSafeEqual(a: string, b: string): boolean {
  const encoder = new TextEncoder();
  const aBytes = encoder.encode(a);
  const bBytes = encoder.encode(b);
  if (aBytes.length !== bBytes.length) return false;
  let diff = 0;
  for (let i = 0; i < aBytes.length; i++) diff |= aBytes[i] ^ bBytes[i];
  return diff === 0;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // The webhook is intentionally reachable without a session, so the shared
  // secret is the only thing separating the channel provider from anyone else.
  const configuredSecret = Deno.env.get("SMOOBU_WEBHOOK_SECRET") ?? "";
  if (!configuredSecret) {
    console.error("smoobu-webhook rejected: SMOOBU_WEBHOOK_SECRET is not configured");
    return new Response(
      JSON.stringify({ error: "Webhook is not configured" }),
      { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const presentedSecret =
    req.headers.get("x-smoobu-signature") ??
    req.headers.get("x-webhook-secret") ??
    "";

  if (!timingSafeEqual(presentedSecret, configuredSecret)) {
    return new Response(
      JSON.stringify({ error: "Invalid signature" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const rawText = await req.text();

    let payload: any;
    try {
      payload = JSON.parse(rawText);
    } catch {
      await logWebhookEvent({
        source: "smoobu",
        event_type: "parse_error",
        status: "failed",
        attempt: 1,
        error_message: "Invalid JSON payload",
        payload: { raw: rawText.slice(0, 2000) },
        response_code: 400,
      });
      return new Response(
        JSON.stringify({ error: "Invalid JSON" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const action = payload.action ?? payload.type ?? "newReservation";

    const booking =
      payload.reservation ??
      payload.booking ??
      payload.data ??
      (payload.id ? payload : null);

    if (!booking) {
      await logWebhookEvent({
        source: "smoobu",
        event_type: action,
        status: "failed",
        attempt: 1,
        error_message: "Could not find booking data in payload",
        payload,
        response_code: 400,
      });
      return new Response(
        JSON.stringify({
          error: "Could not find booking data",
          received_keys: Object.keys(payload),
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const bookingData = {
      smoobu_id: String(booking.id),
      property_id: String(
        booking.apartment?.id ?? booking.apartmentId ?? ""
      ),
      property_name:
        booking.apartment?.name ?? booking.apartmentName ?? "",
      channel_name:
        booking.channel?.name ?? booking.channelName ?? "Direct",
      channel_id: String(
        booking.channel?.id ?? booking.channelId ?? ""
      ),
      guest_name:
        booking["guest-name"] ??
        booking.guestName ??
        booking.guest_name ??
        "",
      guest_email: booking.email ?? "",
      guest_phone: booking.phone ?? "",
      adults: booking.adults ?? 1,
      children: booking.children ?? 0,
      arrival: booking.arrival ?? booking.arrivalDate ?? "",
      departure: booking.departure ?? booking.departureDate ?? "",
      check_in_time: booking["check-in"] ?? booking.checkIn ?? "14:00",
      check_out_time: booking["check-out"] ?? booking.checkOut ?? "11:00",
      total_price: booking.price ?? booking.totalPrice ?? 0,
      price_paid:
        booking["price-paid"] === "Yes" || booking.pricePaid === true,
      status: mapStatus(action),
      notice: booking.notice ?? "",
      guest_app_url:
        booking["guest-app-url"] ?? booking.guestAppUrl ?? "",
      created_at_smoobu:
        booking["created-at"] ?? booking.createdAt ?? null,
      modified_at_smoobu:
        booking["modified-at"] ?? booking.modifiedAt ?? null,
      raw_payload: payload,
    };

    if (
      !bookingData.smoobu_id ||
      bookingData.smoobu_id === "undefined"
    ) {
      await logWebhookEvent({
        source: "smoobu",
        event_type: action,
        status: "failed",
        attempt: 1,
        error_message: "Missing booking ID in payload",
        payload,
        response_code: 400,
      });
      return new Response(
        JSON.stringify({ error: "Missing booking ID" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let lastError: string | null = null;
    let upsertedData: any = null;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      if (attempt > 1) {
        await new Promise((r) => setTimeout(r, RETRY_DELAYS[attempt - 1] || 2000));
      }

      const { data, error } = await supabase
        .from("bookings")
        .upsert(bookingData, { onConflict: "smoobu_id" })
        .select()
        .single();

      if (!error) {
        upsertedData = data;
        lastError = null;

        const hotelId = await resolveHotelId(bookingData.property_id);
        const tenantId = hotelId ? await resolveTenantId(hotelId) : null;

        await logWebhookEvent({
          source: "smoobu",
          event_type: action,
          status: "success",
          attempt,
          hotel_id: hotelId,
          tenant_id: tenantId,
          payload,
          response_code: 200,
          error_message: attempt > 1 ? `Succeeded on attempt ${attempt}` : null,
        });

        break;
      }

      lastError = error.message;
      console.error(`Attempt ${attempt}/${MAX_ATTEMPTS} failed:`, error.message);

      if (attempt < MAX_ATTEMPTS) {
        const hotelId = await resolveHotelId(bookingData.property_id);
        const tenantId = hotelId ? await resolveTenantId(hotelId) : null;
        await logWebhookEvent({
          source: "smoobu",
          event_type: action,
          status: "retrying",
          attempt,
          hotel_id: hotelId,
          tenant_id: tenantId,
          error_message: error.message,
          payload,
          response_code: 500,
        });
      }
    }

    if (lastError) {
      const hotelId = await resolveHotelId(bookingData.property_id);
      const tenantId = hotelId ? await resolveTenantId(hotelId) : null;

      await logWebhookEvent({
        source: "smoobu",
        event_type: action,
        status: "failed",
        attempt: MAX_ATTEMPTS,
        hotel_id: hotelId,
        tenant_id: tenantId,
        error_message: lastError,
        payload,
        response_code: 500,
      });

      await sendFailureAlert({
        source: "smoobu",
        event_type: action,
        error_message: lastError,
        booking_id: bookingData.smoobu_id,
        guest_name: bookingData.guest_name,
        attempts: MAX_ATTEMPTS,
        hotel_id: hotelId,
      });

      return new Response(
        JSON.stringify({ error: "Failed to process booking" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action !== "cancelledReservation") {
      await blockAvailability(booking);
    } else {
      await unblockAvailability(booking);
    }

    return new Response(
      JSON.stringify({ success: true, booking_id: upsertedData.id, action }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Webhook error:", err);

    await logWebhookEvent({
      source: "smoobu",
      event_type: "unhandled_exception",
      status: "failed",
      attempt: 1,
      error_message: String(err),
      response_code: 500,
    });

    await sendFailureAlert({
      source: "smoobu",
      event_type: "unhandled_exception",
      error_message: String(err),
      attempts: 1,
    });

    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function mapStatus(action: string): string {
  switch (action) {
    case "newReservation":
      return "confirmed";
    case "modifiedReservation":
      return "modified";
    case "cancelledReservation":
      return "cancelled";
    default:
      return "confirmed";
  }
}

async function resolveHotelId(propertyId: string): Promise<string | null> {
  if (!propertyId) return null;
  const { data } = await supabase
    .from("bookings")
    .select("id")
    .eq("property_id", propertyId)
    .limit(1)
    .maybeSingle();

  if (data) {
    const { data: room } = await supabase
      .from("rooms")
      .select("hotel_id")
      .limit(1)
      .maybeSingle();
    return room?.hotel_id ?? null;
  }
  return null;
}

async function resolveTenantId(hotelId: string): Promise<string | null> {
  const { data } = await supabase
    .from("hotels")
    .select("tenant_id")
    .eq("id", hotelId)
    .maybeSingle();
  return data?.tenant_id ?? null;
}

interface WebhookEventData {
  source: string;
  event_type: string;
  status: string;
  attempt: number;
  hotel_id?: string | null;
  tenant_id?: string | null;
  error_message?: string | null;
  payload?: any;
  response_code?: number | null;
}

async function logWebhookEvent(event: WebhookEventData) {
  try {
    await supabase.from("webhook_events").insert({
      source: event.source,
      event_type: event.event_type,
      status: event.status,
      attempt: event.attempt,
      max_attempts: MAX_ATTEMPTS,
      hotel_id: event.hotel_id ?? null,
      tenant_id: event.tenant_id ?? null,
      error_message: event.error_message ?? null,
      payload: event.payload ?? null,
      response_code: event.response_code ?? null,
      alerted: event.status === "failed",
    });
  } catch (e) {
    console.error("Failed to log webhook event:", e);
  }
}

interface AlertData {
  source: string;
  event_type: string;
  error_message: string;
  booking_id?: string;
  guest_name?: string;
  attempts: number;
  hotel_id?: string | null;
}

async function sendFailureAlert(alert: AlertData) {
  try {
    const emailEnabled = Deno.env.get("ALERT_EMAIL_ENABLED") === "true";
    if (emailEnabled) {
      const { data: admins } = await supabase
        .from("staff_members")
        .select("email")
        .eq("role", "admin")
        .limit(10);

      if (admins && admins.length > 0) {
        const emails = admins.map((a: any) => a.email).filter(Boolean);
        if (emails.length > 0) {
          await supabase.functions.invoke("send-guest-email", {
            body: {
              to: emails,
              subject: `[ALERT] Smoobu webhook failure - ${alert.event_type}`,
              html: `
                <h2>Webhook Failure Alert</h2>
                <p><strong>Source:</strong> ${alert.source}</p>
                <p><strong>Event:</strong> ${alert.event_type}</p>
                <p><strong>Attempts:</strong> ${alert.attempts}/${MAX_ATTEMPTS}</p>
                ${alert.booking_id ? `<p><strong>Booking ID:</strong> ${alert.booking_id}</p>` : ""}
                ${alert.guest_name ? `<p><strong>Guest:</strong> ${alert.guest_name}</p>` : ""}
                <p><strong>Error:</strong></p>
                <pre>${alert.error_message}</pre>
                <p>Please check the webhook events log in your dashboard for more details.</p>
              `,
            },
          });
        }
      }
    }
  } catch (e) {
    console.error("Failed to send failure alert:", e);
  }
}

async function getHotelName(hotelId: string): Promise<string> {
  const { data } = await supabase
    .from("hotels")
    .select("name")
    .eq("id", hotelId)
    .maybeSingle();
  return data?.name ?? "Unknown";
}

async function blockAvailability(booking: any) {
  const arrival = booking.arrival ?? booking.arrivalDate;
  const departure = booking.departure ?? booking.departureDate;
  const aptId = booking.apartment?.id ?? booking.apartmentId;
  if (!arrival || !departure || !aptId) return;
  const dates = getDatesInRange(arrival, departure);
  const rows = dates.map((date: string) => ({
    property_id: String(aptId),
    date,
    is_available: false,
    smoobu_id: String(booking.id),
  }));
  const { error } = await supabase
    .from("availability")
    .upsert(rows, { onConflict: "property_id,date" });
  if (error) console.error("Availability block error:", error);
}

async function unblockAvailability(booking: any) {
  const arrival = booking.arrival ?? booking.arrivalDate;
  const departure = booking.departure ?? booking.departureDate;
  const aptId = booking.apartment?.id ?? booking.apartmentId;
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
  const last = new Date(end);
  while (current < last) {
    dates.push(current.toISOString().split("T")[0]);
    current.setDate(current.getDate() + 1);
  }
  return dates;
}
