/*
  # Fix Multiple Permissive SELECT Policies and Function Search Paths

  ## Summary

  ### Multiple Permissive Policies (hotels, tenants, user_hotel_assignments)
  Combines multiple overlapping SELECT policies into a single policy per table
  using OR logic. Multiple permissive policies are all evaluated and OR'd
  together, which has the same logical result but is cleaner and more explicit.

  ### Function Search Path Mutable
  Sets a fixed search_path on all public functions that had a mutable search
  path, preventing potential search_path injection attacks.
*/

-- ═══════════════════════════════════════════════════════════════════════════════
-- hotels - consolidate 3 SELECT policies into 1
-- ═══════════════════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "App super admins can view all hotels" ON public.hotels;
DROP POLICY IF EXISTS "Staff can view their hotels" ON public.hotels;
DROP POLICY IF EXISTS "Tenant members can view their tenant hotels" ON public.hotels;

CREATE POLICY "Authenticated users can view accessible hotels"
  ON public.hotels FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_hotel_assignments uha
      WHERE uha.user_id = (SELECT auth.uid())
        AND uha.role = 'super_admin'
        AND uha.tenant_id IS NULL
        AND uha.active = true
    )
    OR EXISTS (
      SELECT 1 FROM staff_members
      WHERE staff_members.hotel_id = hotels.id
        AND staff_members.user_id = (SELECT auth.uid())
        AND staff_members.is_active = true
    )
    OR EXISTS (
      SELECT 1 FROM user_hotel_assignments uha
      WHERE uha.user_id = (SELECT auth.uid())
        AND uha.tenant_id = hotels.tenant_id
        AND uha.active = true
    )
  );

-- ═══════════════════════════════════════════════════════════════════════════════
-- tenants - consolidate 3 SELECT policies into 1
-- ═══════════════════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "Authenticated users can read their assigned tenants" ON public.tenants;
DROP POLICY IF EXISTS "Staff members can read their tenant" ON public.tenants;
DROP POLICY IF EXISTS "Super admins can view all tenants" ON public.tenants;

CREATE POLICY "Authenticated users can view accessible tenants"
  ON public.tenants FOR SELECT TO authenticated
  USING (
    is_super_admin()
    OR (
      active = true
      AND EXISTS (
        SELECT 1 FROM user_hotel_assignments
        WHERE user_hotel_assignments.tenant_id = tenants.id
          AND user_hotel_assignments.user_id = (SELECT auth.uid())
          AND user_hotel_assignments.active = true
      )
    )
    OR (
      active = true
      AND EXISTS (
        SELECT 1 FROM staff_members sm
        JOIN hotels h ON h.id = sm.hotel_id
        WHERE h.tenant_id = tenants.id
          AND sm.user_id = (SELECT auth.uid())
          AND sm.is_active = true
      )
    )
  );

-- ═══════════════════════════════════════════════════════════════════════════════
-- user_hotel_assignments - consolidate 2 SELECT policies into 1
-- ═══════════════════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "Super admins can view all assignments" ON public.user_hotel_assignments;
DROP POLICY IF EXISTS "Users can view their own hotel assignments" ON public.user_hotel_assignments;

CREATE POLICY "Users can view accessible hotel assignments"
  ON public.user_hotel_assignments FOR SELECT TO authenticated
  USING (
    is_super_admin()
    OR user_id = (SELECT auth.uid())
  );

-- ═══════════════════════════════════════════════════════════════════════════════
-- Fix function search paths (prevents search_path injection)
-- ═══════════════════════════════════════════════════════════════════════════════
ALTER FUNCTION public.is_super_admin() SET search_path = public;
ALTER FUNCTION public.sync_room_status_on_task_update() SET search_path = public;
ALTER FUNCTION public.auto_create_guest_profile() SET search_path = public;
ALTER FUNCTION public.sync_guest_profile_stats() SET search_path = public;
ALTER FUNCTION public.sync_invoice_payment_columns() SET search_path = public;
ALTER FUNCTION public.create_transaction_on_invoice_paid() SET search_path = public;
ALTER FUNCTION public.log_invoice_change() SET search_path = public;
ALTER FUNCTION public.log_payment_change() SET search_path = public;
