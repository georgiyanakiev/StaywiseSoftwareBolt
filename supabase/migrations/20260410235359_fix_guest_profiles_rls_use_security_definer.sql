/*
  # Fix guest_profiles RLS policies to use security definer helper

  1. Problem
    - Current policies use direct subqueries on staff_members table
    - staff_members has its own RLS which can block the subquery in certain auth contexts
    - This causes INSERT (and potentially other operations) to silently fail

  2. Fix
    - Replace all four policies (SELECT, INSERT, UPDATE, DELETE) to use
      the is_hotel_staff() security definer function which bypasses staff_members RLS
*/

DROP POLICY IF EXISTS "Staff can view hotel guest profiles" ON guest_profiles;
DROP POLICY IF EXISTS "Staff can insert hotel guest profiles" ON guest_profiles;
DROP POLICY IF EXISTS "Staff can update hotel guest profiles" ON guest_profiles;
DROP POLICY IF EXISTS "Staff can delete hotel guest profiles" ON guest_profiles;

CREATE POLICY "Staff can view hotel guest profiles"
  ON guest_profiles FOR SELECT
  TO authenticated
  USING (is_hotel_staff(hotel_id));

CREATE POLICY "Staff can insert hotel guest profiles"
  ON guest_profiles FOR INSERT
  TO authenticated
  WITH CHECK (is_hotel_staff(hotel_id));

CREATE POLICY "Staff can update hotel guest profiles"
  ON guest_profiles FOR UPDATE
  TO authenticated
  USING (is_hotel_staff(hotel_id))
  WITH CHECK (is_hotel_staff(hotel_id));

CREATE POLICY "Staff can delete hotel guest profiles"
  ON guest_profiles FOR DELETE
  TO authenticated
  USING (is_hotel_staff(hotel_id));
