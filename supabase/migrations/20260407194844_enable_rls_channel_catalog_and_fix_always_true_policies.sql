/*
  # Enable RLS on channel_catalog and Fix Always-True RLS Policies

  ## Summary

  ### channel_catalog
  Enables RLS and adds appropriate policies:
  - Public read access for active channels (catalog is reference data)
  - Super admin write access only

  ### guest_portal_sessions
  - Fixes "Anon can update portal sessions" to require non-expired session
  - Replaces always-true "Authenticated users can manage portal sessions" with
    scoped staff hotel policies

  ### pre_arrival_forms
  - Fixes "Anon can insert pre arrival forms" to require a valid session reference
  - Fixes "Anon can update pre arrival forms" to require session_id not null
  - Replaces always-true "Authenticated users can manage pre arrival forms" with
    scoped staff hotel policies

  ### direct_bookings
  - Fixes "Anyone can create direct bookings" to require a valid hotel reference
*/

-- ═══════════════════════════════════════════════════════════════════════════════
-- channel_catalog - enable RLS and add policies
-- ═══════════════════════════════════════════════════════════════════════════════
ALTER TABLE public.channel_catalog ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active channels"
  ON public.channel_catalog FOR SELECT
  USING (active = true);

CREATE POLICY "Super admins can manage channel catalog"
  ON public.channel_catalog FOR INSERT TO authenticated
  WITH CHECK (is_super_admin());

CREATE POLICY "Super admins can update channel catalog"
  ON public.channel_catalog FOR UPDATE TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

CREATE POLICY "Super admins can delete from channel catalog"
  ON public.channel_catalog FOR DELETE TO authenticated
  USING (is_super_admin());

-- ═══════════════════════════════════════════════════════════════════════════════
-- guest_portal_sessions - fix always-true policies
-- ═══════════════════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "Anon can update portal sessions" ON public.guest_portal_sessions;
DROP POLICY IF EXISTS "Authenticated users can manage portal sessions" ON public.guest_portal_sessions;

CREATE POLICY "Anon can update portal sessions"
  ON public.guest_portal_sessions FOR UPDATE
  USING (token IS NOT NULL AND expires_at > now())
  WITH CHECK (token IS NOT NULL);

CREATE POLICY "Staff can view hotel portal sessions"
  ON public.guest_portal_sessions FOR SELECT TO authenticated
  USING (hotel_id IN (
    SELECT staff_members.hotel_id FROM staff_members
    WHERE staff_members.user_id = (SELECT auth.uid()) AND staff_members.is_active = true
  ));

CREATE POLICY "Staff can insert hotel portal sessions"
  ON public.guest_portal_sessions FOR INSERT TO authenticated
  WITH CHECK (hotel_id IN (
    SELECT staff_members.hotel_id FROM staff_members
    WHERE staff_members.user_id = (SELECT auth.uid()) AND staff_members.is_active = true
  ));

CREATE POLICY "Staff can update hotel portal sessions"
  ON public.guest_portal_sessions FOR UPDATE TO authenticated
  USING (hotel_id IN (
    SELECT staff_members.hotel_id FROM staff_members
    WHERE staff_members.user_id = (SELECT auth.uid()) AND staff_members.is_active = true
  ))
  WITH CHECK (hotel_id IN (
    SELECT staff_members.hotel_id FROM staff_members
    WHERE staff_members.user_id = (SELECT auth.uid()) AND staff_members.is_active = true
  ));

CREATE POLICY "Staff can delete hotel portal sessions"
  ON public.guest_portal_sessions FOR DELETE TO authenticated
  USING (hotel_id IN (
    SELECT staff_members.hotel_id FROM staff_members
    WHERE staff_members.user_id = (SELECT auth.uid()) AND staff_members.is_active = true
  ));

-- ═══════════════════════════════════════════════════════════════════════════════
-- pre_arrival_forms - fix always-true policies
-- ═══════════════════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "Anon can insert pre arrival forms" ON public.pre_arrival_forms;
DROP POLICY IF EXISTS "Anon can update pre arrival forms" ON public.pre_arrival_forms;
DROP POLICY IF EXISTS "Authenticated users can manage pre arrival forms" ON public.pre_arrival_forms;

CREATE POLICY "Anon can insert pre arrival forms"
  ON public.pre_arrival_forms FOR INSERT
  WITH CHECK (
    session_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM guest_portal_sessions gps
      WHERE gps.id = session_id AND gps.expires_at > now()
    )
  );

CREATE POLICY "Anon can update pre arrival forms"
  ON public.pre_arrival_forms FOR UPDATE
  USING (session_id IS NOT NULL)
  WITH CHECK (session_id IS NOT NULL);

CREATE POLICY "Staff can view hotel pre arrival forms"
  ON public.pre_arrival_forms FOR SELECT TO authenticated
  USING (hotel_id IN (
    SELECT staff_members.hotel_id FROM staff_members
    WHERE staff_members.user_id = (SELECT auth.uid()) AND staff_members.is_active = true
  ));

CREATE POLICY "Staff can update hotel pre arrival forms"
  ON public.pre_arrival_forms FOR UPDATE TO authenticated
  USING (hotel_id IN (
    SELECT staff_members.hotel_id FROM staff_members
    WHERE staff_members.user_id = (SELECT auth.uid()) AND staff_members.is_active = true
  ))
  WITH CHECK (hotel_id IN (
    SELECT staff_members.hotel_id FROM staff_members
    WHERE staff_members.user_id = (SELECT auth.uid()) AND staff_members.is_active = true
  ));

CREATE POLICY "Staff can delete hotel pre arrival forms"
  ON public.pre_arrival_forms FOR DELETE TO authenticated
  USING (hotel_id IN (
    SELECT staff_members.hotel_id FROM staff_members
    WHERE staff_members.user_id = (SELECT auth.uid()) AND staff_members.is_active = true
  ));

-- ═══════════════════════════════════════════════════════════════════════════════
-- direct_bookings - fix always-true INSERT policy
-- ═══════════════════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "Anyone can create direct bookings" ON public.direct_bookings;

CREATE POLICY "Anyone can create direct bookings"
  ON public.direct_bookings FOR INSERT
  WITH CHECK (
    hotel_id IS NOT NULL
    AND EXISTS (SELECT 1 FROM hotels WHERE id = hotel_id)
  );
