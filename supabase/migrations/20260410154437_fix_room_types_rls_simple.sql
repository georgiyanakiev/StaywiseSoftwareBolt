/*
  # Simplify room_types RLS to allow active staff to insert

  1. Changes
    - Drop the overly restrictive approval_status policy
    - Use is_active flag which already exists on staff_members
    - Keep simpler, more functional RLS policy

  2. Security
    - Active staff members can manage room types
    - Policy is simpler and uses existing column
*/

DROP POLICY IF EXISTS "Staff can insert room types" ON public.room_types;

CREATE POLICY "Staff can insert room types" ON public.room_types FOR INSERT TO authenticated WITH CHECK (
  hotel_id IN (
    SELECT hotel_id FROM public.staff_members
    WHERE user_id = auth.uid() AND is_active = true
  )
);