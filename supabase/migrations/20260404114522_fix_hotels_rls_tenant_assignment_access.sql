/*
  # Fix hotels RLS to allow access via tenant assignments

  ## Problem
  The hotels table only had an RLS SELECT policy checking staff_members.
  Users assigned at the tenant level via user_hotel_assignments (owners, super admins)
  could not read hotels, causing "Failed to load hotels" on the lobby page.

  ## Changes
  1. Add SELECT policy on hotels allowing access when user has an active
     user_hotel_assignments row matching the hotel's tenant_id.
  2. Add SELECT policy for super admins to see all hotels.
*/

CREATE POLICY "Tenant members can view their tenant hotels"
  ON hotels
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM user_hotel_assignments uha
      WHERE uha.user_id = (SELECT auth.uid())
        AND uha.tenant_id = hotels.tenant_id
        AND uha.active = true
    )
  );

CREATE POLICY "Super admins can view all hotels"
  ON hotels
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM user_hotel_assignments uha
      WHERE uha.user_id = (SELECT auth.uid())
        AND uha.role = 'super_admin'
        AND uha.active = true
    )
  );
