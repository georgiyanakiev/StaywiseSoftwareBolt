/*
  # Fix super_admin hotels RLS to only apply to null-tenant (app-level) super admins

  ## Problem
  The "Super admins can view all hotels" policy was matching ANY user with
  a super_admin role in user_hotel_assignments, including tenant-scoped
  super_admin rows. This caused users like g.yanakiev@yahoo.com (who had
  a stray null-tenant super_admin row) to see all hotels.

  ## Changes
  1. Drop the overly-broad super_admin policy.
  2. Recreate it scoped to null tenant_id rows only (true app-level super admins).
  3. Delete the stray null-tenant super_admin row for g.yanakiev@yahoo.com.
*/

DROP POLICY IF EXISTS "Super admins can view all hotels" ON hotels;

CREATE POLICY "App super admins can view all hotels"
  ON hotels
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM user_hotel_assignments uha
      WHERE uha.user_id = (SELECT auth.uid())
        AND uha.role = 'super_admin'
        AND uha.tenant_id IS NULL
        AND uha.active = true
    )
  );

DELETE FROM user_hotel_assignments
WHERE user_id = '7a7ac2fb-1a0c-4d6f-99ea-79467e29634b'
  AND role = 'super_admin'
  AND tenant_id IS NULL;
