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
      .from("cloudbeds_settings")
      .select("*")
      .eq("hotel_id", hotel_id)
      .maybeSingle();

    if (settingsError || !settings) {
      return new Response(JSON.stringify({ error: "Cloudbeds settings not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!settings.is_enabled) {
      return new Response(JSON.stringify({ error: "Cloudbeds integration is not enabled" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const hasOAuth = settings.property_id && settings.client_id && settings.client_secret;
    const hasApiKey = !!settings.api_key;
    if (!hasOAuth && !hasApiKey) {
      return new Response(JSON.stringify({ error: "Cloudbeds API credentials not configured" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: logEntry } = await supabase
      .from("cloudbeds_sync_logs")
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

    try {
      let accessToken: string | null = null;

      if (hasApiKey) {
        accessToken = settings.api_key;
      } else {
        const tokenRes = await fetch("https://hotels.cloudbeds.com/api/v1.1/access_token", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            grant_type: "client_credentials",
            client_id: settings.client_id,
            client_secret: settings.client_secret,
          }),
        });
        if (tokenRes.ok) {
          const tokenData = await tokenRes.json();
          accessToken = tokenData.access_token;
        }
      }

      if (!accessToken) {
        throw new Error("Failed to obtain Cloudbeds access token");
      }

      const authValue = hasApiKey
        ? `apikey ${accessToken}`
        : `Bearer ${accessToken}`;

      if (direction === "inbound") {
        const reservationsUrl = new URL(`https://hotels.cloudbeds.com/api/v1.1/getReservations`);
        if (settings.property_id) reservationsUrl.searchParams.set("propertyID", settings.property_id);
        reservationsUrl.searchParams.set("pageSize", "100");
        reservationsUrl.searchParams.set("pageNumber", "1");

        const reservationsRes = await fetch(reservationsUrl.toString(), {
          headers: { Authorization: authValue },
        });

        if (reservationsRes.ok) {
          const reservationsData = await reservationsRes.json();
          const reservations = reservationsData.data || [];

          const { data: roomMappings } = await supabase
            .from("cloudbeds_room_mappings")
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
              const guestData = res.guestList?.[0] || {};
              const guestEmail = guestData.guestEmail || `cloudbeds-${res.reservationID}@cloudbeds.com`;

              let { data: existingGuest } = await supabase
                .from("guests")
                .select("id")
                .eq("hotel_id", hotel_id)
                .eq("email", guestEmail)
                .maybeSingle();

              if (!existingGuest) {
                const nameParts = (guestData.guestName || "Unknown Guest").split(" ");
                const { data: newGuest } = await supabase
                  .from("guests")
                  .insert({
                    hotel_id,
                    first_name: nameParts[0] || "Unknown",
                    last_name: nameParts.slice(1).join(" ") || "Guest",
                    email: guestEmail,
                    phone: guestData.guestPhone || "",
                  })
                  .select("id")
                  .single();
                existingGuest = newGuest;
              }

              if (!existingGuest) continue;

              const cloudbedsRoomTypeId = res.rooms?.[0]?.roomTypeName || "";
              const mapping = (roomMappings || []).find(
                (m) => m.cloudbeds_room_type_id === cloudbedsRoomTypeId
              );

              if (!mapping?.room_type) continue;

              const checkIn = res.startDate || new Date().toISOString().split("T")[0];
              const checkOut = res.endDate || new Date().toISOString().split("T")[0];
              const baseRate = parseFloat(res.rooms?.[0]?.roomRate || mapping.room_type.base_rate || 0);

              const nights = Math.max(1, Math.ceil(
                (new Date(checkOut).getTime() - new Date(checkIn).getTime()) / (1000 * 60 * 60 * 24)
              ));
              const totalBase = baseRate * nights;
              const taxAmount = totalBase * taxRate;
              const totalAmount = totalBase + taxAmount;

              const statusMap: Record<string, string> = {
                confirmed: "confirmed",
                checked_in: "checked_in",
                checked_out: "checked_out",
                canceled: "cancelled",
                no_show: "cancelled",
              };
              const reservationStatus = statusMap[res.status] || "confirmed";

              const confirmationCode = `CB-${res.reservationID}`;

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
                  adults: parseInt(res.adults || "1"),
                  children: parseInt(res.children || "0"),
                  status: reservationStatus,
                  base_rate: baseRate,
                  total_amount: totalAmount,
                  tax_amount: taxAmount,
                  discount_amount: 0,
                  payment_status: "pending",
                  amount_paid: 0,
                  booking_source: "cloudbeds",
                  confirmation_code: confirmationCode,
                  special_requests: res.specialRequests || "",
                });
              }

              recordsProcessed++;
            } catch (_resError) {
              // skip individual reservation errors
            }
          }
        } else {
          throw new Error(`Cloudbeds API error: ${reservationsRes.status} ${await reservationsRes.text()}`);
        }
      } else if (direction === "outbound") {
        const { data: roomMappings } = await supabase
          .from("cloudbeds_room_mappings")
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
          if (!mapping.cloudbeds_room_type_id) continue;

          const baseRate = mapping.room_type?.base_rate || 0;
          const adjustedRate = baseRate * (settings.rate_multiplier || 1.0);

          const payload = {
            propertyID: settings.property_id,
            roomTypeID: mapping.cloudbeds_room_type_id,
            ratePlanID: mapping.cloudbeds_rate_plan_id || "BAR",
            startDate: today.toISOString().split("T")[0],
            endDate: endDate.toISOString().split("T")[0],
            rate: adjustedRate.toFixed(2),
          };

          const rateRes = await fetch("https://hotels.cloudbeds.com/api/v1.1/updateRoomRate", {
            method: "POST",
            headers: {
              Authorization: authValue,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
          });

          if (rateRes.ok) {
            recordsProcessed++;
          }
        }
      }

      await supabase
        .from("cloudbeds_sync_logs")
        .update({
          status: "success",
          records_processed: recordsProcessed,
          completed_at: new Date().toISOString(),
        })
        .eq("id", logId);

      await supabase
        .from("cloudbeds_settings")
        .update({
          last_sync_at: new Date().toISOString(),
          last_sync_status: "success",
          updated_at: new Date().toISOString(),
        })
        .eq("hotel_id", hotel_id);
    } catch (syncError: unknown) {
      errorMessage = (syncError as Error).message || "Unknown sync error";

      await supabase
        .from("cloudbeds_sync_logs")
        .update({
          status: "failed",
          records_processed: recordsProcessed,
          error_message: errorMessage,
          completed_at: new Date().toISOString(),
        })
        .eq("id", logId);

      await supabase
        .from("cloudbeds_settings")
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
