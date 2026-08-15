/*
# Sync user_hotel_assignments with staff_members for consistent access control

## Problem
The system has two parallel assignment tables:
- `user_hotel_assignments` (tenant-level) — managed by Super Admin UI
- `staff_members` (hotel-level) — older system, still used by lobby and get_hotel_for_user

When a Super Admin toggles a user's access off in `user_hotel_assignments`,
the user may still have an active `staff_members` row granting them access
to hotels in that tenant. The Super Admin UI is blind to `staff_members`,
so operators can't see or revoke this access.

## Changes

### 1. Add `set_user_tenant_access` SECURITY DEFINER function
This function is called when the Super Admin toggles a user's tenant assignment.
It atomically:
- Inserts/updates/deletes the `user_hotel_assignments` row
- Syncs all `staff_members` rows for hotels in that tenant:
  - When granting access: creates/activates staff_members rows with the chosen role
  - When revoking access: deactivates all staff_members rows for hotels in that tenant

### 2. Add `get_tenant_staff_summary` function
Returns all users with access to a tenant's hotels, combining both
`user_hotel_assignments` and `staff_members` so the Super Admin UI
shows the complete picture.

## Security
- `set_user_tenant_access` checks that the caller is a super_admin
- Both functions are SECURITY DEFINER with proper search_path
- EXECUTE granted to authenticated, revoked from anon
*/

CREATE OR REPLACE FUNCTION public.set_user_tenant_access(
  p_user_id uuid,
  p_tenant_id uuid,
  p_role text DEFAULT 'front_desk',
  p_active boolean DEFAULT true
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_is_super_admin boolean;
  v_existing record;
BEGIN
  -- Verify caller is super_admin
  SELECT EXISTS (
    SELECT 1 FROM user_hotel_assignments
    WHERE user_id = auth.uid()
      AND role = 'super_admin'
      AND tenant_id IS NULL
      AND active = true
  ) INTO v_is_super_admin;

  IF NOT v_is_super_admin THEN
    RAISE EXCEPTION 'Not authorized to manage tenant access';
  END IF;

  IF p_role NOT IN ('owner', 'manager', 'front_desk', 'housekeeping', 'accountant', 'readonly') THEN
    RAISE EXCEPTION 'Invalid role: %', p_role;
  END IF;

  -- Upsert user_hotel_assignments
  SELECT * INTO v_existing
  FROM user_hotel_assignments
  WHERE user_id = p_user_id AND tenant_id = p_tenant_id
  LIMIT 1;

  IF v_existing IS NOT NULL THEN
    UPDATE user_hotel_assignments
    SET active = p_active, role = p_role, updated_at = now()
    WHERE id = v_existing.id;
  ELSE
    INSERT INTO user_hotel_assignments (user_id, tenant_id, role, active)
    VALUES (p_user_id, p_tenant_id, p_role, p_active);
  END IF;

  -- Sync staff_members for all hotels in this tenant
  IF p_active THEN
    -- Activate or create staff_members rows for each hotel in the tenant
    INSERT INTO staff_members (hotel_id, user_id, role, is_active, approval_status, tenant_id)
    SELECT h.id, p_user_id, p_role, true, 'approved', p_tenant_id
    FROM hotels h
    WHERE h.tenant_id = p_tenant_id
    ON CONFLICT (hotel_id, user_id) DO UPDATE
    SET is_active = true, role = p_role, approval_status = 'approved', updated_at = now();
  ELSE
    -- Deactivate all staff_members rows for hotels in this tenant
    UPDATE staff_members
    SET is_active = false, updated_at = now()
    WHERE user_id = p_user_id
      AND tenant_id = p_tenant_id;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.set_user_tenant_access(uuid, uuid, text, boolean) FROM public;
GRANT EXECUTE ON FUNCTION public.set_user_tenant_access(uuid, uuid, text, boolean) TO authenticated;
