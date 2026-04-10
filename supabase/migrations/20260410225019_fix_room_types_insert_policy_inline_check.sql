/*
  # Fix room_types INSERT policy with inline check

  1. Problem
    - INSERT on room_types fails with RLS violation
    - The is_hotel_staff() SECURITY DEFINER helper may not resolve auth.uid() correctly at evaluation time
  
  2. Fix
    - Drop the existing INSERT policy that uses the helper function
    - Replace with an inline EXISTS subquery that directly checks staff_members
    - This avoids any SECURITY DEFINER / search_path / GUC propagation issues
*/

DROP POLICY IF EXISTS "Staff can insert room types" ON public.room_types;

CREATE POLICY "Staff can insert room types"
  ON public.room_types
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.staff_members
      WHERE staff_members.hotel_id = room_types.hotel_id
      AND staff_members.user_id = auth.uid()
      AND staff_members.is_active = true
    )
  );
