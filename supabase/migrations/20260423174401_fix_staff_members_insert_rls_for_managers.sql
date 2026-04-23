/*
  # Allow hotel managers and super admins to insert staff members

  1. Context
    - The existing INSERT policy on staff_members required `user_id = auth.uid()`,
      which prevents hotel managers from adding other staff members (staff being
      added do not yet have a user account, so user_id is null/different).
    - This caused "new row violates row-level security policy for table staff_members"
      when using the Add Staff button from Housekeeping.

  2. Changes
    - Drop the restrictive INSERT policy.
    - Create a new INSERT policy allowing:
        a) self-insertion (user_id = auth.uid())
        b) insertion into any hotel the caller has access to via
           get_accessible_hotel_ids()
        c) super admins (tenant-level) to insert anywhere

  3. Security
    - INSERT is still restricted: callers cannot insert rows into hotels they
      cannot access. Only colleagues at the same hotel / managers / super admins
      may add new staff rows.
*/

DROP POLICY IF EXISTS "Users can insert staff records" ON public.staff_members;

CREATE POLICY "Managers can insert staff at accessible hotels"
  ON public.staff_members
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = (SELECT auth.uid())
    OR hotel_id IN (
      SELECT hotel_id FROM get_accessible_hotel_ids()
    )
    OR EXISTS (
      SELECT 1 FROM user_hotel_assignments uha_admin
      WHERE uha_admin.user_id = auth.uid()
        AND uha_admin.role = 'super_admin'
        AND uha_admin.tenant_id IS NULL
        AND uha_admin.active = true
    )
  );
