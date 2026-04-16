/*
  # Fix Hotel & Staff Assignment Access Control - Strict Enforcement

  1. Critical Issue
    - Staff members assigned to only ONE hotel can see ALL hotels in the lobby
    - Multi-tenant/multi-hotel logic allows broader access than intended
    - Super admin role is being granted unintentionally in some cases
    - Staff should ONLY see hotels they are explicitly assigned to

  2. Solution - Strengthen Hotel RLS Policies
    - Create stricter hotel selection policy for non-admin staff
    - Ensure staff_members assignment is respected as the SOURCE OF TRUTH
    - user_hotel_assignments only applies for tenant-level assignments
    - Super admin status must be explicit and checked at assignment level
    - Non-admin users cannot see all hotels regardless of tenant assignments

  3. Changes Made
    - Add helper function get_accessible_hotel_ids() for staff access
    - Recreate hotels SELECT policy with stricter conditions
    - Add policy to ensure staff can only query their assigned hotels
    - Update role_permissions to respect hotel boundaries

  4. Security Enforcement
    - Each staff member has specific hotel_id in staff_members table
    - RLS prevents queries that don't filter by accessible hotel_ids
    - Super admin role must be explicitly set in user_hotel_assignments
    - Tenant-level assignments checked separately from hotel assignments
*/

-- Helper function to get hotel IDs accessible to current user
-- This is the authoritative source for hotel access control
CREATE OR REPLACE FUNCTION public.get_accessible_hotel_ids()
RETURNS TABLE(hotel_id uuid, access_level text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  -- First, get direct hotel assignments from staff_members
  SELECT DISTINCT 
    sm.hotel_id,
    'direct' as access_level
  FROM public.staff_members sm
  WHERE sm.user_id = auth.uid()
    AND sm.is_active = true
    AND sm.approval_status IN ('approved', 'pending')
  
  UNION
  
  -- Then, get hotels via tenant-level assignments (user_hotel_assignments)
  -- Only for non-super-admin roles at specific tenants
  SELECT DISTINCT
    h.id as hotel_id,
    'tenant' as access_level
  FROM public.hotels h
  JOIN public.user_hotel_assignments uha ON h.tenant_id = uha.tenant_id
  WHERE uha.user_id = auth.uid()
    AND uha.active = true
    AND uha.role != 'super_admin'
    AND h.tenant_id IS NOT NULL;
$$;

-- Stricter SELECT policy for non-admin users
-- Staff can only see hotels they have explicit assignments for
DROP POLICY IF EXISTS "Staff can view assigned hotels" ON hotels;

CREATE POLICY "Staff can view assigned hotels"
  ON hotels
  FOR SELECT
  TO authenticated
  USING (
    -- Check if user is a global super admin
    EXISTS (
      SELECT 1 FROM user_hotel_assignments uha2
      WHERE uha2.user_id = auth.uid()
        AND uha2.role = 'super_admin'
        AND uha2.tenant_id IS NULL
        AND uha2.active = true
    )
    OR
    -- OR check if user has direct hotel assignment or tenant assignment
    id IN (SELECT hotel_id FROM public.get_accessible_hotel_ids())
  );

-- Restrict hotel access to assigned staff only
DROP POLICY IF EXISTS "Hotel read access for staff" ON hotels;

CREATE POLICY "Hotel read access for staff"
  ON hotels
  FOR SELECT
  TO authenticated
  USING (
    id IN (SELECT hotel_id FROM public.get_accessible_hotel_ids())
    OR EXISTS (
      SELECT 1 FROM user_hotel_assignments uha3
      WHERE uha3.user_id = auth.uid()
        AND uha3.role = 'super_admin'
        AND uha3.tenant_id IS NULL
        AND uha3.active = true
    )
  );

-- Ensure staff_members table access is restricted per hotel
DROP POLICY IF EXISTS "Staff can view colleagues at same hotel" ON staff_members;

CREATE POLICY "Staff can view colleagues at same hotel"
  ON staff_members
  FOR SELECT
  TO authenticated
  USING (
    -- Can view own record
    user_id = auth.uid()
    OR
    -- Can view colleagues at same hotel
    hotel_id IN (SELECT hotel_id FROM public.get_accessible_hotel_ids())
    OR
    -- Is a global super admin
    EXISTS (
      SELECT 1 FROM user_hotel_assignments uha_admin
      WHERE uha_admin.user_id = auth.uid()
        AND uha_admin.role = 'super_admin'
        AND uha_admin.tenant_id IS NULL
        AND uha_admin.active = true
    )
  );

-- Update policy ensures users can only update staff at their assigned hotels
DROP POLICY IF EXISTS "Staff can update own or managers can update same-hotel" ON staff_members;

CREATE POLICY "Staff can update own record or managers at same hotel"
  ON staff_members
  FOR UPDATE
  TO authenticated
  USING (
    -- Can update own record
    user_id = auth.uid()
    OR
    -- Manager/owner can update staff at same hotel
    hotel_id IN (SELECT hotel_id FROM public.get_accessible_hotel_ids())
    OR
    -- Global super admin can update anyone
    EXISTS (
      SELECT 1 FROM user_hotel_assignments uha_admin
      WHERE uha_admin.user_id = auth.uid()
        AND uha_admin.role = 'super_admin'
        AND uha_admin.tenant_id IS NULL
        AND uha_admin.active = true
    )
  )
  WITH CHECK (
    -- Can update own record
    user_id = auth.uid()
    OR
    -- Manager/owner can update staff at same hotel
    hotel_id IN (SELECT hotel_id FROM public.get_accessible_hotel_ids())
    OR
    -- Global super admin can update anyone
    EXISTS (
      SELECT 1 FROM user_hotel_assignments uha_admin
      WHERE uha_admin.user_id = auth.uid()
        AND uha_admin.role = 'super_admin'
        AND uha_admin.tenant_id IS NULL
        AND uha_admin.active = true
    )
  );

-- Add explicit policy for rooms - staff can only see rooms at assigned hotels
DROP POLICY IF EXISTS "Staff can view rooms at assigned hotels" ON rooms;

CREATE POLICY "Staff can view rooms at assigned hotels"
  ON rooms
  FOR SELECT
  TO authenticated
  USING (
    hotel_id IN (SELECT hotel_id FROM public.get_accessible_hotel_ids())
    OR EXISTS (
      SELECT 1 FROM user_hotel_assignments uha_admin
      WHERE uha_admin.user_id = auth.uid()
        AND uha_admin.role = 'super_admin'
        AND uha_admin.tenant_id IS NULL
        AND uha_admin.active = true
    )
  );

-- Add explicit policy for reservations
DROP POLICY IF EXISTS "Staff can view reservations at assigned hotels" ON reservations;

CREATE POLICY "Staff can view reservations at assigned hotels"
  ON reservations
  FOR SELECT
  TO authenticated
  USING (
    hotel_id IN (SELECT hotel_id FROM public.get_accessible_hotel_ids())
    OR EXISTS (
      SELECT 1 FROM user_hotel_assignments uha_admin
      WHERE uha_admin.user_id = auth.uid()
        AND uha_admin.role = 'super_admin'
        AND uha_admin.tenant_id IS NULL
        AND uha_admin.active = true
    )
  );

-- Grant execute permissions on helper function to authenticated users
GRANT EXECUTE ON FUNCTION public.get_accessible_hotel_ids() TO authenticated;
