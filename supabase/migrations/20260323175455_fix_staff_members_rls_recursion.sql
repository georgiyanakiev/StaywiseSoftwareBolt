/*
  # Fix staff_members RLS infinite recursion

  The existing policies on staff_members query the staff_members table from
  within a policy on staff_members, causing infinite recursion.

  Fix: Replace recursive subqueries with a SECURITY DEFINER helper function
  that bypasses RLS when checking membership, breaking the recursion.

  Changes:
  - Create helper function `is_hotel_admin(hotel_id uuid)` with SECURITY DEFINER
  - Drop and recreate all staff_members policies using the helper function
*/

CREATE OR REPLACE FUNCTION is_hotel_admin(p_hotel_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM staff_members
    WHERE hotel_id = p_hotel_id
      AND user_id = auth.uid()
      AND role = 'admin'
      AND is_active = true
  );
$$;

CREATE OR REPLACE FUNCTION is_hotel_staff(p_hotel_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM staff_members
    WHERE hotel_id = p_hotel_id
      AND user_id = auth.uid()
      AND is_active = true
  );
$$;

DROP POLICY IF EXISTS "Staff can view own hotel staff" ON staff_members;
DROP POLICY IF EXISTS "Admins can insert staff members" ON staff_members;
DROP POLICY IF EXISTS "Admins can update staff members" ON staff_members;

CREATE POLICY "Staff can view own hotel staff"
  ON staff_members FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR is_hotel_staff(hotel_id)
  );

CREATE POLICY "Admins can insert staff members"
  ON staff_members FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    OR is_hotel_admin(hotel_id)
  );

CREATE POLICY "Admins can update staff members"
  ON staff_members FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR is_hotel_admin(hotel_id)
  )
  WITH CHECK (
    user_id = auth.uid()
    OR is_hotel_admin(hotel_id)
  );
