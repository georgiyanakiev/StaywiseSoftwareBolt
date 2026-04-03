/*
  # Add tenant read access for staff members

  ## Problem
  Authenticated users who are staff members of a hotel can see their hotels
  (via staff_members RLS), but cannot read tenant data for those hotels.
  The existing tenant policy only grants access via user_hotel_assignments.
  This means hotel cards in the lobby load without brand colors, subdomain, or
  plan information.

  ## Fix
  Add a SELECT policy on tenants that allows authenticated users to read a
  tenant record if they are an active staff member in any hotel belonging to
  that tenant.
*/

CREATE POLICY "Staff members can read their tenant"
  ON tenants
  FOR SELECT
  TO authenticated
  USING (
    active = true
    AND EXISTS (
      SELECT 1
      FROM staff_members sm
      JOIN hotels h ON h.id = sm.hotel_id
      WHERE h.tenant_id = tenants.id
        AND sm.user_id = ( SELECT auth.uid() AS uid)
        AND sm.is_active = true
    )
  );
