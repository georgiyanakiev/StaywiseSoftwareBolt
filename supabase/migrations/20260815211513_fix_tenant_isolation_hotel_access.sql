/*
# Fix tenant isolation: enforce hotel assignment for access

## Problem
Three security gaps allowed users to access hotels they are not assigned to:

1. **`get_hotel_for_user`** had a super-admin bypass (lines 29-37) that returned
   ANY hotel to users with a `user_hotel_assignments` row where
   `role = 'super_admin' AND tenant_id IS NULL`. This bypassed all assignment
   checks, giving full data access to every hotel in the system.

2. **Hotels RLS SELECT policies** had three separate super-admin bypass
   clauses (`uha.role = 'super_admin' AND uha.tenant_id IS NULL`) that let
   super-admins read every hotel row. Combined with the HotelContext
   fallback query (`supabase.from('hotels').select('*')`), a super-admin
   could load any hotel's data even without an assignment.

3. **`HotelContext.refreshHotels()`** had a fallback at line 48 that did
   `supabase.from('hotels').select('*')` when the RPC returned nothing,
   loading ALL hotels visible via RLS — which for super-admins was all of them.

## Changes

### 1. `get_hotel_for_user` — remove super-admin bypass
The function now checks assignment for ALL users, including super-admins.
A super-admin must have an active `staff_members` row or an active
`user_hotel_assignments` row for the hotel's tenant to access it.

### 2. Hotels RLS — remove super-admin SELECT bypasses
Three SELECT policies had super-admin bypass clauses. These are removed.
Super-admins now need the same assignment checks as everyone else to read
hotel rows. The `private.get_accessible_hotel_ids()` helper already
checks `staff_members` and `user_hotel_assignments` — no special bypass needed.

### 3. `lobby_get_my_hotels` — already correct (no change needed)
This function was already fixed in migration 20260512191944 to restrict
to assignments only. No super-admin bypass exists here.

## Important Notes
- Super-admins can still access the Super Admin panel and manage all tenants.
- Super-admins must be explicitly assigned to a hotel (via staff_members or
  user_hotel_assignments) to enter it in the lobby and view its data.
- The Super Admin > Staff & Assignments UI is the single source of truth for
  tenant-level assignments (user_hotel_assignments).
- The `staff_members` table provides hotel-level assignments (used by the
  lobby RPC and the get_hotel_for_user RPC).
*/

-- 1) Fix get_hotel_for_user: remove super-admin bypass
CREATE OR REPLACE FUNCTION public.get_hotel_for_user(p_hotel_id uuid)
RETURNS SETOF hotels
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_has_access boolean;
BEGIN
  IF v_uid IS NULL THEN RETURN; END IF;

  -- Check assignment via staff_members (hotel-level) or user_hotel_assignments (tenant-level)
  -- No super-admin bypass — all users must be explicitly assigned
  SELECT EXISTS (
    SELECT 1 FROM staff_members
    WHERE hotel_id = p_hotel_id AND user_id = v_uid
      AND is_active = true AND approval_status IN ('approved','pending')
  ) OR EXISTS (
    SELECT 1
    FROM hotels h
    JOIN user_hotel_assignments uha ON uha.tenant_id = h.tenant_id
    WHERE h.id = p_hotel_id AND uha.user_id = v_uid AND uha.active = true
  ) INTO v_has_access;

  IF v_has_access THEN
    RETURN QUERY SELECT * FROM hotels WHERE id = p_hotel_id;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.get_hotel_for_user(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.get_hotel_for_user(uuid) TO authenticated;

-- 2) Fix hotels RLS: remove super-admin SELECT bypasses
-- Drop the three policies that had super-admin bypasses
DROP POLICY IF EXISTS "Authenticated users can view accessible hotels" ON public.hotels;
DROP POLICY IF EXISTS "Hotel read access for staff" ON public.hotels;
DROP POLICY IF EXISTS "Staff can view assigned hotels" ON public.hotels;

-- Recreate without super-admin bypass — assignment check only
CREATE POLICY "Authenticated users can view accessible hotels"
ON public.hotels FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM staff_members
    WHERE staff_members.hotel_id = hotels.id
      AND staff_members.user_id = auth.uid()
      AND staff_members.is_active = true
  )
  OR EXISTS (
    SELECT 1 FROM user_hotel_assignments uha
    WHERE uha.user_id = auth.uid()
      AND uha.tenant_id = hotels.tenant_id
      AND uha.active = true
  )
);
