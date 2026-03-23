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

interface ExpediaReservation {
  confirmationNumber: string;
  itineraryId: string;
  hotelCode: string;
  roomTypeId: string;
  ratePlanId: string;
  arrivalDate: string;
  departureDate: string;
  primaryGuest: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    address?: { countryCode: string };
  };
  adultCount: number;
  childCount: number;
  totalPayment: { value: number; currency: string };
  specialRequest: string;
  status: string;
  createDateTime: string;
  updateDateTime: string;
}

async function fetchExpediaReservations(
  apiKey: string,
  apiSecret: string,
  hotelCode: string,
  modifiedSince: string | null
): Promise<ExpediaReservation[]> {
  const credentials = btoa(`${apiKey}:${apiSecret}`);
  const params = new URLSearchParams({ hotelCode });
  if (modifiedSince) params.set("updatedSince", modifiedSince);

  const response = await fetch(
    `https://services.expediapartnercentral.com/eqc/br?${params}`,
    {
      headers: {
        Authorization: `Basic ${credentials}`,
        Accept: "application/json",
      },
    }
  );

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Expedia reservation fetch failed: ${err}`);
  }

  const data = await response.json();
  return data.Reservations?.Reservation || [];
}

async function pushExpediaAvailability(
  apiKey: string,
  apiSecret: string,
  hotelCode: string,
  rooms: Array<{
    expedia_room_type_id: string;
    expedia_rate_plan_id: string;
    base_rate: number;
    multiplier: number;
  }>,
  fromDate: string,
  toDate: string
): Promise<number> {
  const credentials = btoa(`${apiKey}:${apiSecret}`);
  let pushed = 0;

  for (const room of rooms) {
    if (!room.expedia_room_type_id) continue;
    const rate = Math.round(room.base_rate * room.multiplier * 100) / 100;

    const payload = {
      hotelCode,
      roomTypeCode: room.expedia_room_type_id,
      ratePlanCode: room.expedia_rate_plan_id || "A1",
      dateRange: { from: fromDate, to: toDate },
      rates: [{ amount: rate, currency: "USD" }],
      availableRooms: 1,
    };

    const response = await fetch(
      "https://services.expediapartnercentral.com/eqc/ar",
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${credentials}`,
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
      .from("expedia_settings")
      .select("*")
      .eq("hotel_id", hotel_id)
      .maybeSingle();

    if (!settings || !settings.is_enabled) {
      return new Response(JSON.stringify({ error: "Expedia integration is not enabled" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!settings.hotel_code || !settings.api_key || !settings.api_secret) {
      return new Response(JSON.stringify({ error: "Missing Expedia credentials" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: logEntry } = await adminClient
      .from("expedia_sync_logs")
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
      if (direction === "inbound" && settings.sync_reservations) {
        const reservations = await fetchExpediaReservations(
          settings.api_key,
          settings.api_secret,
          settings.hotel_code,
          settings.last_sync_at
        );

        const { data: roomMappings } = await adminClient
          .from("expedia_room_mappings")
          .select("*, room_types(*)")
          .eq("hotel_id", hotel_id);

        const { data: hotelData } = await adminClient
          .from("hotels")
          .select("tax_rate")
          .eq("id", hotel_id)
          .single();

        for (const expRes of reservations) {
          try {
            const mapping = (roomMappings || []).find(
              (m: { expedia_room_type_id: string }) => m.expedia_room_type_id === expRes.roomTypeId
            );

            const guest = expRes.primaryGuest;
            let guestId: string | null = null;

            if (guest?.email) {
              const { data: existingGuest } = await adminClient
                .from("guests")
                .select("id")
                .eq("hotel_id", hotel_id)
                .eq("email", guest.email)
                .maybeSingle();

              if (existingGuest) {
                guestId = existingGuest.id;
              } else {
                const { data: newGuest } = await adminClient
                  .from("guests")
                  .insert({
                    hotel_id,
                    first_name: guest.firstName || "Guest",
                    last_name: guest.lastName || "",
                    email: guest.email || "",
                    phone: guest.phone || "",
                    country: guest.address?.countryCode || "",
                  })
                  .select("id")
                  .single();
                guestId = newGuest?.id || null;
              }
            }

            if (!guestId || !mapping?.room_types) continue;

            const roomType = mapping.room_types as { id: string; base_rate: number };
            const nights = Math.ceil(
              (new Date(expRes.departureDate).getTime() - new Date(expRes.arrivalDate).getTime()) /
              (1000 * 60 * 60 * 24)
            );
            const taxRate = hotelData?.tax_rate || 0;
            const subtotal = expRes.totalPayment?.value || roomType.base_rate * nights;
            const taxAmount = subtotal * (taxRate / 100);

            const expConfCode = `EXP-${expRes.confirmationNumber || expRes.itineraryId}`;
            const { data: existingRes } = await adminClient
              .from("reservations")
              .select("id")
              .eq("hotel_id", hotel_id)
              .eq("confirmation_code", expConfCode)
              .maybeSingle();

            const statusMap: Record<string, string> = {
              pending: "pending",
              confirmed: "confirmed",
              cancelled: "cancelled",
              modified: "confirmed",
            };

            const reservationData = {
              hotel_id,
              guest_id: guestId,
              room_type_id: roomType.id,
              check_in: expRes.arrivalDate,
              check_out: expRes.departureDate,
              adults: expRes.adultCount || 1,
              children: expRes.childCount || 0,
              status: statusMap[expRes.status?.toLowerCase()] || "confirmed",
              base_rate: roomType.base_rate,
              total_amount: subtotal + taxAmount,
              tax_amount: taxAmount,
              discount_amount: 0,
              payment_status: "pending",
              amount_paid: 0,
              booking_source: "expedia",
              special_requests: expRes.specialRequest || "",
              confirmation_code: expConfCode,
            };

            if (existingRes) {
              await adminClient.from("reservations").update(reservationData).eq("id", existingRes.id);
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
          .from("expedia_room_mappings")
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
            expedia_room_type_id: string;
            expedia_rate_plan_id: string;
            room_types: { base_rate: number };
          }) => ({
            expedia_room_type_id: m.expedia_room_type_id,
            expedia_rate_plan_id: m.expedia_rate_plan_id,
            base_rate: m.room_types?.base_rate || 0,
            multiplier: settings.rate_multiplier || 1.0,
          }));

          recordsProcessed = await pushExpediaAvailability(
            settings.api_key,
            settings.api_secret,
            settings.hotel_code,
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
      .from("expedia_settings")
      .update({ last_sync_at: now, last_sync_status: finalStatus })
      .eq("hotel_id", hotel_id);

    if (logId) {
      await adminClient
        .from("expedia_sync_logs")
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
