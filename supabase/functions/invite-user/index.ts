import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function generateTempPassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  const bytes = new Uint32Array(16);
  crypto.getRandomValues(bytes);
  let pass = "";
  for (let i = 0; i < bytes.length; i++) {
    pass += chars[bytes[i] % chars.length];
  }
  return pass + "!1";
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ error: "Missing authorization" }, 401);
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
      return json({ error: "Unauthorized" }, 401);
    }

    const { email, tenant_id } = await req.json();
    if (!email) {
      return json({ error: "Email is required." }, 400);
    }

    const { data: assignments } = await supabaseAdmin
      .from("user_hotel_assignments")
      .select("role, tenant_id")
      .eq("user_id", caller.id)
      .eq("active", true);

    const isSuperAdmin = assignments?.some(
      (a) => a.role === "super_admin" && a.tenant_id === null
    );
    const isTenantOwner = assignments?.some(
      (a) => a.role === "owner" && a.tenant_id === tenant_id
    );

    if (!isSuperAdmin && !isTenantOwner) {
      return json({ error: "You do not have permission to invite users." }, 403);
    }

    const { data: existingUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    if (!listError && existingUsers) {
      const alreadyExists = existingUsers.users.some(
        (u) => u.email?.toLowerCase() === email.toLowerCase()
      );
      if (alreadyExists) {
        return json({ success: true, already_exists: true });
      }
    }

    const tempPassword = generateTempPassword();

    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { invited_to_tenant: tenant_id ?? null },
    });

    if (createError) {
      const alreadyExists =
        createError.message.toLowerCase().includes("already registered") ||
        createError.message.toLowerCase().includes("already been invited") ||
        createError.message.toLowerCase().includes("user already exists");

      if (alreadyExists) {
        return json({ success: true, already_exists: true });
      }

      return json({ error: createError.message }, 400);
    }

    return json({
      success: true,
      already_exists: false,
      temp_password: tempPassword,
      user_id: newUser.user?.id,
    });
  } catch (err) {
    return json({ error: String(err) }, 500);
  }
});
