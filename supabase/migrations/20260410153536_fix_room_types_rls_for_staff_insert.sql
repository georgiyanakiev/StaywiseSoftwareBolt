/*
  # Fix room_types RLS to allow approved staff to insert

  1. Changes
    - Allow approved staff members to insert room types
    - Update INSERT policy to check staff approval status

  2. Security
    - Only approved staff members assigned to hotel can create room types
    - Verified via staff_members table join
*/

DROP POLICY IF EXISTS "Staff can insert room types" ON public.room_types;

CREATE POLICY "Staff can insert room types" ON public.room_types FOR INSERT TO authenticated WITH CHECK (
  EXISTS (
    SELECT 1 FROM staff_members
    WHERE staff_members.hotel_id = room_types.hotel_id
    AND staff_members.user_id = auth.uid()
    AND staff_members.approval_status = 'approved'
  )
);