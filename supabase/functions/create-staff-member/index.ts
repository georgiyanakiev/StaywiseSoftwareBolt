import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user: caller }, error: callerError } = await supabaseUser.auth.getUser();
    if (callerError || !caller) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { first_name, last_name, email, phone, department, role, is_active, password, hotel_id: bodyHotelId } = await req.json();

    if (!first_name || !last_name || !email || !password || password.length < 6) {
      return new Response(JSON.stringify({ error: "Missing required fields. Password must be at least 6 characters." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: callerStaff } = await supabaseAdmin
      .from("staff_members")
      .select("role, hotel_id, tenant_id")
      .eq("user_id", caller.id)
      .maybeSingle();

    const allowedRoles = ["admin", "owner", "manager"];
    let resolvedHotelId: string | null = null;
    let resolvedTenantId: string | null = null;

    if (callerStaff && allowedRoles.includes(callerStaff.role)) {
      resolvedHotelId = callerStaff.hotel_id;
      resolvedTenantId = callerStaff.tenant_id;
    } else {
      const { data: ownedTenant } = await supabaseAdmin
        .from("tenants")
        .select("id")
        .eq("owner_email", caller.email)
        .maybeSingle();

      if (ownedTenant) {
        resolvedTenantId = ownedTenant.id;
        if (bodyHotelId) {
          resolvedHotelId = bodyHotelId;
        } else {
          const { data: tenantHotel } = await supabaseAdmin
            .from("hotels")
            .select("id")
            .eq("tenant_id", ownedTenant.id)
            .maybeSingle();
          resolvedHotelId = tenantHotel?.id ?? null;
        }
      }
    }

    if (!resolvedHotelId) {
      return new Response(JSON.stringify({ error: "You do not have permission to add staff members." }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Try to find an existing auth user with this email first
    let targetUserId: string | null = null;
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find((u) => u.email === email);

    if (existingUser) {
      // User already exists in auth — use their ID and optionally update password
      targetUserId = existingUser.id;
      await supabaseAdmin.auth.admin.updateUserById(existingUser.id, { password });
    } else {
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });

      if (createError) {
        return new Response(JSON.stringify({ error: createError.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      targetUserId = newUser.user.id;
    }

    // Check if a staff_member record already exists for this user+hotel combination
    const { data: existingStaff } = await supabaseAdmin
      .from("staff_members")
      .select("id")
      .eq("user_id", targetUserId)
      .eq("hotel_id", resolvedHotelId)
      .maybeSingle();

    if (existingStaff) {
      return new Response(JSON.stringify({ error: "This user is already a staff member at this hotel." }), {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const insertPayload: Record<string, unknown> = {
      hotel_id: resolvedHotelId,
      user_id: targetUserId,
      first_name,
      last_name,
      email,
      phone: phone || "",
      department: department || "",
      role,
      is_active: is_active !== undefined ? is_active : true,
      approval_status: "approved",
      onboarding_sent: false,
    };
    if (resolvedTenantId) insertPayload.tenant_id = resolvedTenantId;

    const { data: insertedStaff, error: insertError } = await supabaseAdmin
      .from("staff_members")
      .insert(insertPayload)
      .select("id")
      .single();

    if (insertError) {
      return new Response(JSON.stringify({ error: insertError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, staffId: insertedStaff?.id, userId: targetUserId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
