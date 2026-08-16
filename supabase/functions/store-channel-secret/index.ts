import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface Payload {
  p_vault_id: string | null;
  p_name: string;
  p_value: string;
  p_hotel_id: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const jwt = authHeader.replace(/^Bearer\s+/i, "");
    if (!jwt) {
      return new Response(JSON.stringify({ error: "Missing Authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: userData, error: userErr } = await admin.auth.getUser(jwt);
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "Invalid session" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = (await req.json()) as Payload;
    if (!body.p_value || !body.p_name || !body.p_hotel_id) {
      return new Response(JSON.stringify({ error: "Missing fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: roleRows } = await admin
      .from("user_hotel_assignments")
      .select("role, tenant_id")
      .eq("user_id", userData.user.id)
      .eq("active", true);

    const assignments = roleRows ?? [];
    const isSuperAdmin = assignments.some(
      (r) => r.role === "super_admin" && r.tenant_id === null
    );

    const { data: hotel } = await admin
      .from("hotels")
      .select("id, tenant_id")
      .eq("id", body.p_hotel_id)
      .maybeSingle();

    if (!hotel) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let allowed = isSuperAdmin;

    if (!allowed) {
      allowed = assignments.some(
        (r) => r.tenant_id === hotel.tenant_id && ["owner", "admin", "manager"].includes(r.role)
      );
    }

    if (!allowed) {
      const { data: staff } = await admin
        .from("staff_members")
        .select("role")
        .eq("user_id", userData.user.id)
        .eq("hotel_id", hotel.id)
        .eq("is_active", true)
        .maybeSingle();
      allowed = !!staff && ["owner", "admin", "manager", "general_manager"].includes(staff.role);
    }

    if (!allowed) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // An existing vault id may only be rewritten when it already belongs to a
    // channel of this hotel, otherwise a caller could overwrite another
    // tenant's credentials by naming their vault id.
    if (body.p_vault_id) {
      const { data: owningChannel } = await admin
        .from("channels")
        .select("id")
        .eq("hotel_id", hotel.id)
        .or(
          `api_key_vault_id.eq.${body.p_vault_id},client_secret_vault_id.eq.${body.p_vault_id}`
        )
        .maybeSingle();

      if (!owningChannel) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const { data: vaultId, error: rpcErr } = await admin.rpc("store_channel_secret", {
      p_vault_id: body.p_vault_id,
      p_name: body.p_name,
      p_value: body.p_value,
    });
    if (rpcErr) throw rpcErr;

    return new Response(JSON.stringify({ vault_id: vaultId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("store-channel-secret error", e);
    return new Response(JSON.stringify({ error: "Unable to store credential" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
