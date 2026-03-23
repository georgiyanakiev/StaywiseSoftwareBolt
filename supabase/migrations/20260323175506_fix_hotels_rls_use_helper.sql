/*
  # Fix hotels RLS to use security definer helper

  The hotels UPDATE policy queries staff_members directly, which triggers
  the same recursion chain. Replace with the is_hotel_staff helper function.

  Also fix hotels SELECT policy to use the helper.
*/

DROP POLICY IF EXISTS "Staff admins can update their hotels" ON hotels;
DROP POLICY IF EXISTS "Staff can view their hotels" ON hotels;

CREATE POLICY "Staff can view their hotels"
  ON hotels FOR SELECT
  TO authenticated
  USING (is_hotel_staff(id));

CREATE POLICY "Staff admins can update their hotels"
  ON hotels FOR UPDATE
  TO authenticated
  USING (is_hotel_admin(id))
  WITH CHECK (is_hotel_admin(id));
