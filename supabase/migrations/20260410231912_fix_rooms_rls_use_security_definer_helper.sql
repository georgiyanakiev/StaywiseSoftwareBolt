/*
  # Fix rooms RLS - use SECURITY DEFINER helper functions

  1. Problem
    - rooms policies used inline subqueries against staff_members
    - Users with tenant-level access via user_hotel_assignments could not
      view or manage rooms

  2. Solution
    - Replace inline subqueries with is_active_staff_at_hotel / is_admin_staff_at_hotel
      helpers which also check user_hotel_assignments
*/

DROP POLICY IF EXISTS "Staff can view rooms" ON public.rooms;
CREATE POLICY "Staff can view rooms"
  ON public.rooms
  FOR SELECT
  TO authenticated
  USING (public.is_active_staff_at_hotel(hotel_id));

DROP POLICY IF EXISTS "Staff can insert rooms" ON public.rooms;
CREATE POLICY "Staff can insert rooms"
  ON public.rooms
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_active_staff_at_hotel(hotel_id));

DROP POLICY IF EXISTS "Staff can update rooms" ON public.rooms;
CREATE POLICY "Staff can update rooms"
  ON public.rooms
  FOR UPDATE
  TO authenticated
  USING (public.is_active_staff_at_hotel(hotel_id))
  WITH CHECK (public.is_active_staff_at_hotel(hotel_id));

DROP POLICY IF EXISTS "Admins can delete rooms" ON public.rooms;
CREATE POLICY "Admins can delete rooms"
  ON public.rooms
  FOR DELETE
  TO authenticated
  USING (public.is_admin_staff_at_hotel(hotel_id));
