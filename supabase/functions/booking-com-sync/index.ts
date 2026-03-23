import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface SyncRequest {
  hotel_id: string;
  direction: "inbound" | "outbound";
}

interface BookingComReservation {
  id: string;
  room_id: string;
  guest: {
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    country: string;
  };
  arrival_date: string;
  departure_date: string;
  adults: number;
  children: number;
  room_type_code: string;
  rate_plan_id: string;
  total_price: number;
  commission: number;
  currency: string;
  status: string;
  special_requests: string;
  created_at: string;
  modified_at: string;
}

async function getAccessToken(clientId: string, clientSecret: string): Promise<string> {
  const response = await fetch("https://account.booking.com/oauth2/v2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: clientId,
      client_secret: clientSecret,
      scope: "connectivity.reservations.read connectivity.availability.write",
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Booking.com auth failed: ${err}`);
  }

  const data = await response.json();
  return data.access_token;
}

async function fetchReservations(
  accessToken: string,
  propertyId: string,
  modifiedSince: string | null
): Promise<BookingComReservation[]> {
  const params = new URLSearchParams({ hotel_id: propertyId, rows: "100" });
  if (modifiedSince) params.set("modified_since", modifiedSince);

  const response = await fetch(
    `https://distribution-xml.booking.com/3.0/json/getHotelReservations?${params}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    }
  );

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Failed to fetch reservations: ${err}`);
  }

  const data = await response.json();
  return data.result || [];
}

async function pushAvailability(
  accessToken: string,
  propertyId: string,
  rooms: Array<{ bdc_room_type_id: string; bdc_rate_plan_id: string; base_rate: number; multiplier: number }>,
  fromDate: string,
  toDate: string
): Promise<number> {
  let pushed = 0;
  for (const room of rooms) {
    if (!room.bdc_room_type_id) continue;
    const rate = Math.round(room.base_rate * room.multiplier * 100) / 100;
    const payload = {
      hotel_id: propertyId,
      room_type_id: room.bdc_room_type_id,
      rate_plan_id: room.bdc_rate_plan_id || "BAR",
      from_date: fromDate,
      to_date: toDate,
      price: rate,
      currency: "USD",
    };

    const response = await fetch(
      "https://distribution-xml.booking.com/3.0/json/updateHotelAvailability",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }
    );

    if (response.ok) pushed++;
  }
  return pushed;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authHeader = req.headers.get("Authorization") || "";

    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { hotel_id, direction }: SyncRequest = await req.json();
    if (!hotel_id || !direction) {
      return new Response(JSON.stringify({ error: "hotel_id and direction are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: staffMember } = await adminClient
      .from("staff_members")
      .select("id, role")
      .eq("hotel_id", hotel_id)
      .eq("user_id", user.id)
      .eq("is_active", true)
      .maybeSingle();

    if (!staffMember) {
      return new Response(JSON.stringify({ error: "Access denied" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: settings } = await adminClient
      .from("booking_com_settings")
      .select("*")
      .eq("hotel_id", hotel_id)
      .maybeSingle();

    if (!settings || !settings.is_enabled) {
      return new Response(JSON.stringify({ error: "Booking.com integration is not enabled" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!settings.property_id || !settings.client_id || !settings.client_secret) {
      return new Response(JSON.stringify({ error: "Missing Booking.com credentials" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: logEntry } = await adminClient
      .from("booking_com_sync_logs")
      .insert({
        hotel_id,
        direction,
        status: "running",
        records_processed: 0,
        started_at: new Date().toISOString(),
      })
      .select()
      .single();

    const logId = logEntry?.id;
    let recordsProcessed = 0;
    let errorMessage: string | null = null;
    let finalStatus: "success" | "partial" | "failed" = "success";

    try {
      const accessToken = await getAccessToken(settings.client_id, settings.client_secret);

      if (direction === "inbound" && settings.sync_reservations) {
        const reservations = await fetchReservations(
          accessToken,
          settings.property_id,
          settings.last_sync_at
        );

        const { data: roomMappings } = await adminClient
          .from("booking_com_room_mappings")
          .select("*, room_types(*)")
          .eq("hotel_id", hotel_id);

        const { data: hotelData } = await adminClient
          .from("hotels")
          .select("tax_rate, currency")
          .eq("id", hotel_id)
          .single();

        for (const bdcRes of reservations) {
          try {
            const mapping = (roomMappings || []).find(
              (m: { bdc_room_type_id: string }) => m.bdc_room_type_id === bdcRes.room_type_code
            );

            let guestId: string | null = null;
            if (bdcRes.guest?.email) {
              const { data: existingGuest } = await adminClient
                .from("guests")
                .select("id")
                .eq("hotel_id", hotel_id)
                .eq("email", bdcRes.guest.email)
                .maybeSingle();

              if (existingGuest) {
                guestId = existingGuest.id;
              } else {
                const { data: newGuest } = await adminClient
                  .from("guests")
                  .insert({
                    hotel_id,
                    first_name: bdcRes.guest.first_name || "Guest",
                    last_name: bdcRes.guest.last_name || "",
                    email: bdcRes.guest.email || "",
                    phone: bdcRes.guest.phone || "",
                    country: bdcRes.guest.country || "",
                  })
                  .select("id")
                  .single();
                guestId = newGuest?.id || null;
              }
            }

            if (!guestId || !mapping?.room_types) continue;

            const roomType = mapping.room_types as { id: string; base_rate: number };
            const nights = Math.ceil(
              (new Date(bdcRes.departure_date).getTime() - new Date(bdcRes.arrival_date).getTime()) /
              (1000 * 60 * 60 * 24)
            );
            const taxRate = hotelData?.tax_rate || 0;
            const subtotal = bdcRes.total_price || roomType.base_rate * nights;
            const taxAmount = subtotal * (taxRate / 100);

            const bdcConfCode = `BDC-${bdcRes.id}`;
            const { data: existingRes } = await adminClient
              .from("reservations")
              .select("id")
              .eq("hotel_id", hotel_id)
              .eq("confirmation_code", bdcConfCode)
              .maybeSingle();

            const statusMap: Record<string, string> = {
              ok: "confirmed",
              new: "confirmed",
              modified: "confirmed",
              cancelled: "cancelled",
            };

            const reservationData = {
              hotel_id,
              guest_id: guestId,
              room_type_id: roomType.id,
              check_in: bdcRes.arrival_date,
              check_out: bdcRes.departure_date,
              adults: bdcRes.adults || 1,
              children: bdcRes.children || 0,
              status: statusMap[bdcRes.status] || "confirmed",
              base_rate: roomType.base_rate,
              total_amount: subtotal + taxAmount,
              tax_amount: taxAmount,
              discount_amount: 0,
              payment_status: "pending",
              amount_paid: 0,
              booking_source: "booking.com",
              special_requests: bdcRes.special_requests || "",
              confirmation_code: bdcConfCode,
            };

            if (existingRes) {
              await adminClient
                .from("reservations")
                .update(reservationData)
                .eq("id", existingRes.id);
            } else {
              await adminClient.from("reservations").insert(reservationData);
            }
            recordsProcessed++;
          } catch {
            finalStatus = "partial";
          }
        }
      } else if (direction === "outbound" && settings.sync_availability) {
        const { data: roomMappings } = await adminClient
          .from("booking_com_room_mappings")
          .select("*, room_types(base_rate)")
          .eq("hotel_id", hotel_id)
          .eq("is_active", true);

        if (roomMappings && roomMappings.length > 0) {
          const fromDate = new Date().toISOString().split("T")[0];
          const toDate = new Date(
            Date.now() + settings.max_advance_days * 24 * 60 * 60 * 1000
          )
            .toISOString()
            .split("T")[0];

          const rooms = roomMappings.map((m: {
            bdc_room_type_id: string;
            bdc_rate_plan_id: string;
            room_types: { base_rate: number };
          }) => ({
            bdc_room_type_id: m.bdc_room_type_id,
            bdc_rate_plan_id: m.bdc_rate_plan_id,
            base_rate: m.room_types?.base_rate || 0,
            multiplier: settings.rate_multiplier || 1.0,
          }));

          recordsProcessed = await pushAvailability(
            accessToken,
            settings.property_id,
            rooms,
            fromDate,
            toDate
          );
        }
      }
    } catch (syncError: unknown) {
      finalStatus = "failed";
      errorMessage = (syncError as Error).message;
    }

    const now = new Date().toISOString();
    await adminClient
      .from("booking_com_settings")
      .update({ last_sync_at: now, last_sync_status: finalStatus })
      .eq("hotel_id", hotel_id);

    if (logId) {
      await adminClient
        .from("booking_com_sync_logs")
        .update({
          status: finalStatus,
          records_processed: recordsProcessed,
          error_message: errorMessage,
          completed_at: now,
        })
        .eq("id", logId);
    }

    return new Response(
      JSON.stringify({
        success: finalStatus !== "failed",
        direction,
        status: finalStatus,
        records_processed: recordsProcessed,
        error: errorMessage,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: finalStatus === "failed" ? 500 : 200,
      }
    );
  } catch (err: unknown) {
    return new Response(
      JSON.stringify({ error: (err as Error).message || "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
