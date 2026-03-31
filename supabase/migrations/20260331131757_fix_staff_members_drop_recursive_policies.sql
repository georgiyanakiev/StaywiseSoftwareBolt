/*
  # Fix staff_members infinite recursion - drop all recursive policies

  ## Problem
  There are duplicate INSERT, UPDATE, DELETE policies on staff_members:
  - Old policies ("Admins can insert staff", "Admins can update staff", "Admins can delete staff",
    "Staff can view colleagues") use recursive subqueries directly on staff_members → infinite recursion
  - New policies using is_hotel_admin() / is_hotel_staff() SECURITY DEFINER helpers are correct
    but co-exist with the old ones

  When creating a new hotel the first staff member insert triggers the recursive policies.

  ## Fix
  1. Drop all old recursive policies
  2. Add a policy that allows inserting yourself as the first staff member for a hotel
     (needed when a hotel admin creates a new hotel and seeds their own record)
  3. Keep only the helper-function-based policies

  ## Security
  - All policies still require authentication
  - SECURITY DEFINER helpers bypass RLS internally to break the recursion loop
*/

-- Drop the old recursive policies
DROP POLICY IF EXISTS "Admins can insert staff" ON staff_members;
DROP POLICY IF EXISTS "Admins can update staff" ON staff_members;
DROP POLICY IF EXISTS "Admins can delete staff" ON staff_members;
DROP POLICY IF EXISTS "Staff can view colleagues" ON staff_members;
DROP POLICY IF EXISTS "Staff can view own record" ON staff_members;

-- Drop the helper-based policies so we can recreate them cleanly
DROP POLICY IF EXISTS "Staff can view own hotel staff" ON staff_members;
DROP POLICY IF EXISTS "Admins can insert staff members" ON staff_members;
DROP POLICY IF EXISTS "Admins can update staff members" ON staff_members;
DROP POLICY IF EXISTS "Staff can update own record" ON staff_members;

-- Recreate all policies using only the SECURITY DEFINER helpers (no recursion)

CREATE POLICY "Staff can view own hotel staff"
  ON staff_members FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR is_hotel_staff(hotel_id)
  );

-- Allow inserting own staff record OR if already an admin of that hotel
-- Also allows inserting when user_id matches (first-time hotel setup)
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

CREATE POLICY "Staff can update own record"
  ON staff_members FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can delete staff members"
  ON staff_members FOR DELETE
  TO authenticated
  USING (is_hotel_admin(hotel_id));
