/*
  # Fix room_types RLS - add tenant-level access

  1. Problem
    - room_types policies only checked staff_members table
    - Users with tenant-level access via user_hotel_assignments could not
      view or manage room types even though they could see the hotel
    - The hotels SELECT policy grants access via 3 paths: super_admin,
      staff_members, or tenant assignment. Room types only checked one path.

  2. Solution
    - Update SECURITY DEFINER helpers to also check user_hotel_assignments
    - This matches the access pattern used by the hotels table

  3. Modified Functions
    - `is_active_staff_at_hotel` now also checks tenant-level assignments
    - `is_admin_staff_at_hotel` now also checks tenant-level owner/admin assignments
*/

CREATE OR REPLACE FUNCTION public.is_active_staff_at_hotel(p_hotel_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM staff_members
    WHERE staff_members.hotel_id = p_hotel_id
      AND staff_members.user_id = auth.uid()
      AND staff_members.is_active = true
  )
  OR EXISTS (
    SELECT 1
    FROM user_hotel_assignments uha
    JOIN hotels h ON h.tenant_id = uha.tenant_id
    WHERE h.id = p_hotel_id
      AND uha.user_id = auth.uid()
      AND uha.active = true
  )
  OR EXISTS (
    SELECT 1
    FROM user_hotel_assignments uha
    WHERE uha.user_id = auth.uid()
      AND uha.role = 'super_admin'
      AND uha.tenant_id IS NULL
      AND uha.active = true
  );
$$;

CREATE OR REPLACE FUNCTION public.is_admin_staff_at_hotel(p_hotel_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM staff_members
    WHERE staff_members.hotel_id = p_hotel_id
      AND staff_members.user_id = auth.uid()
      AND staff_members.is_active = true
      AND staff_members.role IN ('admin', 'owner', 'general_manager')
  )
  OR EXISTS (
    SELECT 1
    FROM user_hotel_assignments uha
    JOIN hotels h ON h.tenant_id = uha.tenant_id
    WHERE h.id = p_hotel_id
      AND uha.user_id = auth.uid()
      AND uha.role IN ('owner', 'admin')
      AND uha.active = true
  )
  OR EXISTS (
    SELECT 1
    FROM user_hotel_assignments uha
    WHERE uha.user_id = auth.uid()
      AND uha.role = 'super_admin'
      AND uha.tenant_id IS NULL
      AND uha.active = true
  );
$$;
