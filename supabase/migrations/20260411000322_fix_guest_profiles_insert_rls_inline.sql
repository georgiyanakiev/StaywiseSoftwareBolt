/*
  # Fix guest_profiles INSERT RLS policy

  1. Changes
    - Replace function-based INSERT policy with inline subquery
    - The is_hotel_staff() function may not resolve auth.uid() correctly
      in INSERT WITH CHECK context for some Supabase configurations
    - Inline subquery directly checks staff_members table

  2. Security
    - Same security level: checks user is active staff of the hotel
    - Only authenticated users can insert
*/

DROP POLICY IF EXISTS "Staff can insert hotel guest profiles" ON guest_profiles;

CREATE POLICY "Staff can insert hotel guest profiles"
  ON guest_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM staff_members
      WHERE staff_members.hotel_id = guest_profiles.hotel_id
      AND staff_members.user_id = auth.uid()
      AND staff_members.is_active = true
    )
  );
