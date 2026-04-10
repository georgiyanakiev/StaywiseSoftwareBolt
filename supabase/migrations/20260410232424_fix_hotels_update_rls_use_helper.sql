/*
  # Fix hotels UPDATE policy to use helper

  The hotels UPDATE policy only checked staff_members for admin/manager roles.
  Tenant-level owners could not update hotel settings.
  Now uses is_admin_staff_at_hotel helper which checks both paths.
*/

DROP POLICY IF EXISTS "Staff admins can update their hotels" ON public.hotels;
CREATE POLICY "Staff admins can update their hotels"
  ON public.hotels FOR UPDATE TO authenticated
  USING (public.is_admin_staff_at_hotel(id))
  WITH CHECK (public.is_admin_staff_at_hotel(id));
