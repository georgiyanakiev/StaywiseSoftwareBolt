/*
  # Fix RLS auth initialization and multiple permissive policies

  1. RLS Auth Initialization Fixes
    - guest_profiles: "Staff can insert hotel guest profiles" - wrap auth.uid() in (select ...)
    - bookings: "Service role full access - bookings" - wrap auth.role() in (select ...)
    - availability: "Service role full access - availability" - wrap auth.role() in (select ...)

  2. Multiple Permissive Policy Fixes
    - availability: Drop "Service role full access - availability" (redundant with service_role bypass)
    - bookings: Drop "Service role full access - bookings" (redundant with service_role bypass)
    - guest_portal_sessions: Restrict "Anon can update portal sessions" to anon role only
    - pre_arrival_forms: Restrict "Anon can update pre arrival forms" to anon role only

  3. Reason
    - Policies using auth.uid()/auth.role() without (select ...) re-evaluate per row, causing poor performance
    - Service role already bypasses RLS, so explicit "service role full access" policies are redundant
      and create multiple-permissive-policy warnings when combined with authenticated SELECT policies
    - Anon update policies scoped to public role overlap with authenticated update policies
*/

-- Fix guest_profiles insert policy: wrap auth.uid() in (select ...)
DROP POLICY IF EXISTS "Staff can insert hotel guest profiles" ON guest_profiles;
CREATE POLICY "Staff can insert hotel guest profiles"
  ON guest_profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM staff_members
      WHERE staff_members.hotel_id = guest_profiles.hotel_id
        AND staff_members.user_id = (select auth.uid())
        AND staff_members.is_active = true
    )
  );

-- Drop redundant service role policies on bookings and availability
-- (service_role bypasses RLS entirely, these policies are unnecessary)
DROP POLICY IF EXISTS "Service role full access - bookings" ON bookings;
DROP POLICY IF EXISTS "Service role full access - availability" ON availability;

-- Fix guest_portal_sessions: restrict anon update to anon role only (not public)
DROP POLICY IF EXISTS "Anon can update portal sessions" ON guest_portal_sessions;
CREATE POLICY "Anon can update portal sessions"
  ON guest_portal_sessions FOR UPDATE
  TO anon
  USING ((token IS NOT NULL) AND (expires_at > now()))
  WITH CHECK (token IS NOT NULL);

-- Fix pre_arrival_forms: restrict anon update to anon role only (not public)
DROP POLICY IF EXISTS "Anon can update pre arrival forms" ON pre_arrival_forms;
CREATE POLICY "Anon can update pre arrival forms"
  ON pre_arrival_forms FOR UPDATE
  TO anon
  USING (session_id IS NOT NULL)
  WITH CHECK (session_id IS NOT NULL);
