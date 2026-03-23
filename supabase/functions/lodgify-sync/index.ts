import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authHeader = req.headers.get("Authorization");

    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { hotel_id, direction } = await req.json();
    if (!hotel_id || !direction) {
      return new Response(JSON.stringify({ error: "hotel_id and direction are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: staffMember, error: staffError } = await supabase
      .from("staff_members")
      .select("id, role")
      .eq("hotel_id", hotel_id)
      .eq("user_id", user.id)
      .eq("is_active", true)
      .maybeSingle();

    if (staffError || !staffMember || !["admin", "manager"].includes(staffMember.role)) {
      return new Response(JSON.stringify({ error: "Insufficient permissions" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: settings, error: settingsError } = await supabase
      .from("lodgify_settings")
      .select("*")
      .eq("hotel_id", hotel_id)
      .maybeSingle();

    if (settingsError || !settings) {
      return new Response(JSON.stringify({ error: "Lodgify settings not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!settings.is_enabled) {
      return new Response(JSON.stringify({ error: "Lodgify integration is not enabled" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!settings.api_key) {
      return new Response(JSON.stringify({ error: "Lodgify API key is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const propertyId = settings.website_id || settings.property_id;
    if (!propertyId) {
      return new Response(JSON.stringify({ error: "Lodgify property ID or website ID is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: logEntry } = await supabase
      .from("lodgify_sync_logs")
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

    const lodgifyBaseUrl = "https://api.lodgify.com/v2";
    const lodgifyHeaders = {
      "X-ApiKey": settings.api_key,
      "Content-Type": "application/json",
    };

    try {
      if (direction === "inbound") {
        const today = new Date().toISOString().split("T")[0];
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 90);
        const futureDateStr = futureDate.toISOString().split("T")[0];

        const bookingsUrl = `${lodgifyBaseUrl}/reservations/bookings?dateType=arrival&startDate=${today}&endDate=${futureDateStr}&includeCount=false`;

        const bookingsRes = await fetch(bookingsUrl, { headers: lodgifyHeaders });

        if (bookingsRes.ok) {
          const bookingsData = await bookingsRes.json();
          const bookings = bookingsData.items || bookingsData || [];

          const { data: roomMappings } = await supabase
            .from("lodgify_room_mappings")
            .select("*, room_type:room_types(*)")
            .eq("hotel_id", hotel_id)
            .eq("is_active", true);

          const { data: hotel } = await supabase
            .from("hotels")
            .select("tax_rate")
            .eq("id", hotel_id)
            .maybeSingle();

          const taxRate = (hotel?.tax_rate || 0) / 100;

          for (const booking of bookings) {
            try {
              const guestEmail =
                booking.guest?.email ||
                booking.email ||
                `lodgify-${booking.id || booking.booking_id}@lodgify.com`;

              let { data: existingGuest } = await supabase
                .from("guests")
                .select("id")
                .eq("hotel_id", hotel_id)
                .eq("email", guestEmail)
                .maybeSingle();

              if (!existingGuest) {
                const firstName = booking.guest?.first_name || booking.first_name || "Unknown";
                const lastName = booking.guest?.last_name || booking.last_name || "Guest";
                const { data: newGuest } = await supabase
                  .from("guests")
                  .insert({
                    hotel_id,
                    first_name: firstName,
                    last_name: lastName,
                    email: guestEmail,
                    phone: booking.guest?.phone || booking.phone || "",
                  })
                  .select("id")
                  .single();
                existingGuest = newGuest;
              }

              if (!existingGuest) continue;

              const rooms = booking.rooms || [];
              for (const room of rooms.length ? rooms : [booking]) {
                const lodgifyRoomTypeId = String(room.room_type_id || room.roomTypeId || "");
                const mapping = (roomMappings || []).find(
                  (m) => m.lodgify_room_type_id === lodgifyRoomTypeId
                );

                if (!mapping?.room_type) continue;

                const checkIn =
                  room.arrival ||
                  booking.arrival ||
                  new Date().toISOString().split("T")[0];
                const checkOut =
                  room.departure ||
                  booking.departure ||
                  new Date().toISOString().split("T")[0];

                const baseRate = parseFloat(
                  room.total_amount || booking.total_amount || mapping.room_type.base_rate || 0
                );

                const nights = Math.max(1, Math.ceil(
                  (new Date(checkOut).getTime() - new Date(checkIn).getTime()) / (1000 * 60 * 60 * 24)
                ));

                const perNightRate = nights > 0 ? baseRate / nights : mapping.room_type.base_rate;
                const taxAmount = baseRate * taxRate;
                const totalAmount = baseRate + taxAmount;

                const statusMap: Record<string, string> = {
                  open: "confirmed",
                  confirmed: "confirmed",
                  "checked-in": "checked_in",
                  checked_in: "checked_in",
                  "checked-out": "checked_out",
                  checked_out: "checked_out",
                  cancelled: "cancelled",
                  canceled: "cancelled",
                  closed: "checked_out",
                };
                const reservationStatus =
                  statusMap[(booking.status || "open").toLowerCase()] || "confirmed";

                const bookingId = booking.id || booking.booking_id;
                const confirmationCode = `LDG-${bookingId}`;

                const { data: existingRes } = await supabase
                  .from("reservations")
                  .select("id")
                  .eq("hotel_id", hotel_id)
                  .eq("confirmation_code", confirmationCode)
                  .maybeSingle();

                if (existingRes) {
                  await supabase
                    .from("reservations")
                    .update({
                      status: reservationStatus,
                      updated_at: new Date().toISOString(),
                    })
                    .eq("id", existingRes.id);
                } else {
                  await supabase.from("reservations").insert({
                    hotel_id,
                    guest_id: existingGuest.id,
                    room_type_id: mapping.room_type.id,
                    check_in: checkIn,
                    check_out: checkOut,
                    adults: parseInt(booking.adults || booking.number_of_adults || "1"),
                    children: parseInt(booking.children || booking.number_of_children || "0"),
                    status: reservationStatus,
                    base_rate: perNightRate,
                    total_amount: totalAmount,
                    tax_amount: taxAmount,
                    discount_amount: 0,
                    payment_status: "pending",
                    amount_paid: 0,
                    booking_source: "lodgify",
                    confirmation_code: confirmationCode,
                    special_requests: booking.notes || booking.special_requests || "",
                  });
                }

                recordsProcessed++;
              }
            } catch (_bookingError) {
              // skip individual booking errors
            }
          }
        } else {
          throw new Error(`Lodgify API error: ${bookingsRes.status} ${await bookingsRes.text()}`);
        }
      } else if (direction === "outbound") {
        const { data: roomMappings } = await supabase
          .from("lodgify_room_mappings")
          .select("*, room_type:room_types(*)")
          .eq("hotel_id", hotel_id)
          .eq("is_active", true);

        if (!roomMappings || roomMappings.length === 0) {
          throw new Error("No active room mappings configured");
        }

        const today = new Date();
        const endDate = new Date(today);
        endDate.setDate(endDate.getDate() + (settings.max_advance_days || 365));

        for (const mapping of roomMappings) {
          if (!mapping.lodgify_room_type_id) continue;

          const baseRate = mapping.room_type?.base_rate || 0;
          const adjustedRate = baseRate * (settings.rate_multiplier || 1.0);

          const ratesPayload = {
            period_from: today.toISOString().split("T")[0],
            period_to: endDate.toISOString().split("T")[0],
            price_per_period: adjustedRate.toFixed(2),
          };

          const rateRes = await fetch(
            `${lodgifyBaseUrl}/rooms/${mapping.lodgify_room_type_id}/rates`,
            {
              method: "POST",
              headers: lodgifyHeaders,
              body: JSON.stringify(ratesPayload),
            }
          );

          if (rateRes.ok) {
            recordsProcessed++;
          }
        }
      }

      await supabase
        .from("lodgify_sync_logs")
        .update({
          status: "success",
          records_processed: recordsProcessed,
          completed_at: new Date().toISOString(),
        })
        .eq("id", logId);

      await supabase
        .from("lodgify_settings")
        .update({
          last_sync_at: new Date().toISOString(),
          last_sync_status: "success",
          updated_at: new Date().toISOString(),
        })
        .eq("hotel_id", hotel_id);
    } catch (syncError: unknown) {
      errorMessage = (syncError as Error).message || "Unknown sync error";

      await supabase
        .from("lodgify_sync_logs")
        .update({
          status: "failed",
          records_processed: recordsProcessed,
          error_message: errorMessage,
          completed_at: new Date().toISOString(),
        })
        .eq("id", logId);

      await supabase
        .from("lodgify_settings")
        .update({
          last_sync_at: new Date().toISOString(),
          last_sync_status: "failed",
          updated_at: new Date().toISOString(),
        })
        .eq("hotel_id", hotel_id);

      return new Response(
        JSON.stringify({ error: errorMessage, records_processed: recordsProcessed }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        direction,
        records_processed: recordsProcessed,
        log_id: logId,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
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
