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

    const { first_name, last_name, email, phone, department, role, is_active, password, hotel_id: bodyHotelId } = await req.json();

    if (!first_name || !last_name || !email || !password || password.length < 6) {
      return json({ error: "Missing required fields. Password must be at least 6 characters." }, 400);
    }

    let resolvedHotelId: string | null = null;
    let resolvedTenantId: string | null = null;

    const { data: callerStaff } = await supabaseAdmin
      .from("staff_members")
      .select("role, hotel_id, tenant_id")
      .eq("user_id", caller.id)
      .eq("is_active", true);

    const allowedRoles = ["admin", "owner", "manager"];
    const staffMatch = callerStaff?.find((s) => {
      if (bodyHotelId) return s.hotel_id === bodyHotelId && allowedRoles.includes(s.role);
      return allowedRoles.includes(s.role);
    });

    if (staffMatch) {
      resolvedHotelId = staffMatch.hotel_id;
      resolvedTenantId = staffMatch.tenant_id;
    }

    if (!resolvedHotelId) {
      const { data: assignments } = await supabaseAdmin
        .from("user_hotel_assignments")
        .select("role, tenant_id")
        .eq("user_id", caller.id)
        .eq("active", true);

      const isSuperAdmin = assignments?.some(
        (a) => a.role === "super_admin" && a.tenant_id === null
      );

      if (bodyHotelId) {
        const isTenantOwnerForHotel = async () => {
          const { data: hotel } = await supabaseAdmin
            .from("hotels")
            .select("id, tenant_id")
            .eq("id", bodyHotelId)
            .maybeSingle();
          if (!hotel) return false;
          resolvedTenantId = hotel.tenant_id;
          return assignments?.some(
            (a) =>
              (a.role === "owner" && a.tenant_id === hotel.tenant_id) ||
              (a.role === "super_admin" && a.tenant_id === null)
          );
        };

        if (isSuperAdmin || await isTenantOwnerForHotel()) {
          resolvedHotelId = bodyHotelId;
        }
      } else if (isSuperAdmin) {
        const { data: firstHotel } = await supabaseAdmin
          .from("hotels")
          .select("id, tenant_id")
          .limit(1)
          .maybeSingle();
        if (firstHotel) {
          resolvedHotelId = firstHotel.id;
          resolvedTenantId = firstHotel.tenant_id;
        }
      } else {
        const ownerTenantIds = assignments
          ?.filter((a) => a.role === "owner" && a.tenant_id)
          .map((a) => a.tenant_id) ?? [];

        if (ownerTenantIds.length > 0) {
          const { data: tenantHotel } = await supabaseAdmin
            .from("hotels")
            .select("id, tenant_id")
            .in("tenant_id", ownerTenantIds)
            .limit(1)
            .maybeSingle();
          if (tenantHotel) {
            resolvedHotelId = tenantHotel.id;
            resolvedTenantId = tenantHotel.tenant_id;
          }
        }
      }
    }

    if (!resolvedHotelId) {
      return json({ error: "You do not have permission to add staff members." }, 403);
    }

    // Clamp the requested role to what the caller is allowed to assign.
    // Managers can only create front_desk / housekeeping staff; admins and
    // owners can create up to manager; super admins and tenant owners can
    // assign any role.
    const requestedRole = role || "front_desk";
    const managerAssignable = ["front_desk", "housekeeping"];
    const adminAssignable = ["front_desk", "housekeeping", "manager", "general_manager"];
    const allRoles = ["front_desk", "housekeeping", "manager", "general_manager", "admin", "owner"];

    const isCallerManager = staffMatch?.role === "manager";
    const isCallerAdmin = staffMatch?.role === "admin" || staffMatch?.role === "owner" || staffMatch?.role === "general_manager";
    const { data: callerAssignments } = await supabaseAdmin
      .from("user_hotel_assignments")
      .select("role, tenant_id")
      .eq("user_id", caller.id)
      .eq("active", true);
    const isCallerSuperAdmin = (callerAssignments ?? []).some((a) => a.role === "super_admin");
    const isCallerTenantOwner = (callerAssignments ?? []).some(
      (a) => a.role === "owner" && a.tenant_id === resolvedTenantId
    );

    let allowedToAssign: string[];
    if (isCallerSuperAdmin || isCallerTenantOwner) {
      allowedToAssign = allRoles;
    } else if (isCallerAdmin) {
      allowedToAssign = adminAssignable;
    } else if (isCallerManager) {
      allowedToAssign = managerAssignable;
    } else {
      allowedToAssign = ["front_desk"];
    }

    if (!allowedToAssign.includes(requestedRole)) {
      return json({ error: "You cannot assign that role." }, 403);
    }
    const finalRole = requestedRole;

    let targetUserId: string | null = null;
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find((u) => u.email === email);

    let linkedExistingAccount = false;
    if (existingUser) {
      // Never touch an existing account's credentials here: the caller has not
      // proven they control that account. Link it to the hotel instead.
      targetUserId = existingUser.id;
      linkedExistingAccount = true;
    } else {
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });

      if (createError) {
        console.error("create-staff-member createUser error", createError);
        return json({ error: "Unable to create the account for this email address." }, 400);
      }
      targetUserId = newUser.user.id;
    }

    const { data: existingStaff } = await supabaseAdmin
      .from("staff_members")
      .select("id")
      .eq("user_id", targetUserId)
      .eq("hotel_id", resolvedHotelId)
      .maybeSingle();

    if (existingStaff) {
      return json({ error: "This user is already a staff member at this hotel." }, 409);
    }

    const insertPayload: Record<string, unknown> = {
      hotel_id: resolvedHotelId,
      user_id: targetUserId,
      first_name,
      last_name,
      email,
      phone: phone || "",
      department: department || "",
      role: finalRole,
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
      console.error("create-staff-member insert error", insertError);
      return json({ error: "Unable to create staff member" }, 500);
    }

    return json({
      success: true,
      staffId: insertedStaff?.id,
      userId: targetUserId,
      existing_account: linkedExistingAccount,
    });
  } catch (err) {
    console.error("create-staff-member error", err);
    return json({ error: "Unable to create staff member" }, 500);
  }
});
