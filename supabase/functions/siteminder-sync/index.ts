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
      .from("siteminder_settings")
      .select("*")
      .eq("hotel_id", hotel_id)
      .maybeSingle();

    if (settingsError || !settings) {
      return new Response(JSON.stringify({ error: "SiteMinder settings not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!settings.is_enabled) {
      return new Response(JSON.stringify({ error: "SiteMinder integration is not enabled" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!settings.api_key || !settings.hotel_code) {
      return new Response(JSON.stringify({ error: "SiteMinder API key and hotel code are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: logEntry } = await supabase
      .from("siteminder_sync_logs")
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

    const smAuthHeader = `Bearer ${settings.api_key}`;
    const smBaseUrl = "https://api.siteminder.com/v1";

    try {
      if (direction === "inbound") {
        const today = new Date().toISOString().split("T")[0];
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 90);
        const futureDateStr = futureDate.toISOString().split("T")[0];

        const reservationsUrl = `${smBaseUrl}/hotels/${settings.hotel_code}/reservations?startDate=${today}&endDate=${futureDateStr}&pageSize=100`;

        const reservationsRes = await fetch(reservationsUrl, {
          headers: {
            Authorization: smAuthHeader,
            "Content-Type": "application/json",
          },
        });

        if (reservationsRes.ok) {
          const reservationsData = await reservationsRes.json();
          const reservations = reservationsData.reservations || reservationsData.data || [];

          const { data: roomMappings } = await supabase
            .from("siteminder_room_mappings")
            .select("*, room_type:room_types(*)")
            .eq("hotel_id", hotel_id)
            .eq("is_active", true);

          const { data: hotel } = await supabase
            .from("hotels")
            .select("tax_rate")
            .eq("id", hotel_id)
            .maybeSingle();

          const taxRate = (hotel?.tax_rate || 0) / 100;

          for (const res of reservations) {
            try {
              const guestEmail =
                res.guest?.email ||
                res.guestEmail ||
                `siteminder-${res.reservationId || res.id}@siteminder.com`;

              let { data: existingGuest } = await supabase
                .from("guests")
                .select("id")
                .eq("hotel_id", hotel_id)
                .eq("email", guestEmail)
                .maybeSingle();

              if (!existingGuest) {
                const guestName = res.guest?.name || res.guestName || "Unknown Guest";
                const nameParts = guestName.split(" ");
                const { data: newGuest } = await supabase
                  .from("guests")
                  .insert({
                    hotel_id,
                    first_name: nameParts[0] || "Unknown",
                    last_name: nameParts.slice(1).join(" ") || "Guest",
                    email: guestEmail,
                    phone: res.guest?.phone || res.guestPhone || "",
                  })
                  .select("id")
                  .single();
                existingGuest = newGuest;
              }

              if (!existingGuest) continue;

              const smRoomTypeId =
                res.roomTypeId || res.rooms?.[0]?.roomTypeId || "";
              const mapping = (roomMappings || []).find(
                (m) => m.siteminder_room_type_id === smRoomTypeId
              );

              if (!mapping?.room_type) continue;

              const checkIn = res.arrivalDate || res.checkIn || new Date().toISOString().split("T")[0];
              const checkOut = res.departureDate || res.checkOut || new Date().toISOString().split("T")[0];
              const baseRate = parseFloat(res.roomRate || res.rate || mapping.room_type.base_rate || 0);

              const nights = Math.max(1, Math.ceil(
                (new Date(checkOut).getTime() - new Date(checkIn).getTime()) / (1000 * 60 * 60 * 24)
              ));
              const totalBase = baseRate * nights;
              const taxAmount = totalBase * taxRate;
              const totalAmount = totalBase + taxAmount;

              const statusMap: Record<string, string> = {
                confirmed: "confirmed",
                pending: "pending",
                checkedin: "checked_in",
                checked_in: "checked_in",
                checkedout: "checked_out",
                checked_out: "checked_out",
                cancelled: "cancelled",
                canceled: "cancelled",
                no_show: "cancelled",
              };
              const reservationStatus =
                statusMap[(res.status || "confirmed").toLowerCase()] || "confirmed";

              const resId = res.reservationId || res.id || res.reservationNumber;
              const confirmationCode = `SM-${resId}`;

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
                  adults: parseInt(res.adults || res.numberOfAdults || "1"),
                  children: parseInt(res.children || res.numberOfChildren || "0"),
                  status: reservationStatus,
                  base_rate: baseRate,
                  total_amount: totalAmount,
                  tax_amount: taxAmount,
                  discount_amount: 0,
                  payment_status: "pending",
                  amount_paid: 0,
                  booking_source: "siteminder",
                  confirmation_code: confirmationCode,
                  special_requests: res.specialRequests || res.comments || "",
                });
              }

              recordsProcessed++;
            } catch (_resError) {
              // skip individual reservation errors
            }
          }
        } else {
          throw new Error(`SiteMinder API error: ${reservationsRes.status} ${await reservationsRes.text()}`);
        }
      } else if (direction === "outbound") {
        const { data: roomMappings } = await supabase
          .from("siteminder_room_mappings")
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
          if (!mapping.siteminder_room_type_id) continue;

          const baseRate = mapping.room_type?.base_rate || 0;
          const adjustedRate = baseRate * (settings.rate_multiplier || 1.0);

          const payload = {
            hotelCode: settings.hotel_code,
            roomTypeId: mapping.siteminder_room_type_id,
            ratePlanId: mapping.siteminder_rate_plan_id || "BAR",
            startDate: today.toISOString().split("T")[0],
            endDate: endDate.toISOString().split("T")[0],
            rate: adjustedRate.toFixed(2),
          };

          const rateRes = await fetch(
            `${smBaseUrl}/hotels/${settings.hotel_code}/rates`,
            {
              method: "POST",
              headers: {
                Authorization: smAuthHeader,
                "Content-Type": "application/json",
              },
              body: JSON.stringify(payload),
            }
          );

          if (rateRes.ok) {
            recordsProcessed++;
          }
        }
      }

      await supabase
        .from("siteminder_sync_logs")
        .update({
          status: "success",
          records_processed: recordsProcessed,
          completed_at: new Date().toISOString(),
        })
        .eq("id", logId);

      await supabase
        .from("siteminder_settings")
        .update({
          last_sync_at: new Date().toISOString(),
          last_sync_status: "success",
          updated_at: new Date().toISOString(),
        })
        .eq("hotel_id", hotel_id);
    } catch (syncError: unknown) {
      errorMessage = (syncError as Error).message || "Unknown sync error";

      await supabase
        .from("siteminder_sync_logs")
        .update({
          status: "failed",
          records_processed: recordsProcessed,
          error_message: errorMessage,
          completed_at: new Date().toISOString(),
        })
        .eq("id", logId);

      await supabase
        .from("siteminder_settings")
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
