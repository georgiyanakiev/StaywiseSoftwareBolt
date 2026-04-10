/*
  # Fix room_types RLS using SECURITY DEFINER helper

  1. New Functions
    - `is_active_staff_at_hotel(p_hotel_id uuid)` - Returns true if the current
      user is an active staff member at the given hotel. Uses SECURITY DEFINER
      to bypass RLS on staff_members, avoiding nested-RLS evaluation issues.

  2. Modified Policies
    - Replaced inline subquery in room_types INSERT policy with helper function
    - Replaced inline subquery in room_types SELECT policy with helper function
    - Replaced inline subquery in room_types UPDATE policy with helper function
    - Replaced inline subquery in room_types DELETE policy with helper function

  3. Notes
    - The previous inline EXISTS subquery against staff_members could fail
      because staff_members also has RLS, causing nested policy evaluation issues
    - The helper function runs as SECURITY DEFINER, bypassing RLS on staff_members
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
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_active_staff_at_hotel(uuid) TO authenticated;

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
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_admin_staff_at_hotel(uuid) TO authenticated;

DROP POLICY IF EXISTS "Staff can insert room types" ON public.room_types;
CREATE POLICY "Staff can insert room types"
  ON public.room_types
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_active_staff_at_hotel(hotel_id));

DROP POLICY IF EXISTS "Staff can view room types" ON public.room_types;
CREATE POLICY "Staff can view room types"
  ON public.room_types
  FOR SELECT
  TO authenticated
  USING (public.is_active_staff_at_hotel(hotel_id));

DROP POLICY IF EXISTS "Admins can update room types" ON public.room_types;
CREATE POLICY "Admins can update room types"
  ON public.room_types
  FOR UPDATE
  TO authenticated
  USING (public.is_admin_staff_at_hotel(hotel_id))
  WITH CHECK (public.is_admin_staff_at_hotel(hotel_id));

DROP POLICY IF EXISTS "Admins can delete room types" ON public.room_types;
CREATE POLICY "Admins can delete room types"
  ON public.room_types
  FOR DELETE
  TO authenticated
  USING (public.is_admin_staff_at_hotel(hotel_id));
