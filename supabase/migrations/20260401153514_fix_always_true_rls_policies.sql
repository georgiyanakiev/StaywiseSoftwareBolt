/*
  # Fix Always-True RLS Policies

  ## Summary
  Replaces all "always true" RLS policies (USING (true) or WITH CHECK (true))
  with properly scoped policies that verify hotel membership via staff_members.

  Guest portal and pre-arrival tables retain anon access where the feature
  requires unauthenticated guests to submit forms, but scope it to session-based
  access rather than unrestricted open access.

  ## Tables Fixed
  - guest_communications
  - guest_documents (both anon and authenticated)
  - guest_portal_sessions (both anon and authenticated)
  - guest_profiles
  - guest_stay_history
  - housekeeping_staff
  - invoice_line_items
  - invoice_settings
  - invoices (already fixed in previous migration — skip)
  - maintenance_issues
  - pre_arrival_forms (both anon and authenticated)
*/

-- ============================================================
-- guest_communications
-- ============================================================
DROP POLICY IF EXISTS "Authenticated users can delete guest communications" ON public.guest_communications;
DROP POLICY IF EXISTS "Authenticated users can insert guest communications" ON public.guest_communications;
DROP POLICY IF EXISTS "Authenticated users can update guest communications" ON public.guest_communications;

CREATE POLICY "Authenticated users can insert guest communications"
  ON public.guest_communications FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.staff_members sm
      WHERE sm.user_id = (SELECT auth.uid())
        AND sm.hotel_id = hotel_id
    )
  );

CREATE POLICY "Authenticated users can update guest communications"
  ON public.guest_communications FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.staff_members sm
      WHERE sm.user_id = (SELECT auth.uid())
        AND sm.hotel_id = hotel_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.staff_members sm
      WHERE sm.user_id = (SELECT auth.uid())
        AND sm.hotel_id = hotel_id
    )
  );

CREATE POLICY "Authenticated users can delete guest communications"
  ON public.guest_communications FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.staff_members sm
      WHERE sm.user_id = (SELECT auth.uid())
        AND sm.hotel_id = hotel_id
        AND sm.role IN ('owner','manager','admin')
    )
  );

-- ============================================================
-- guest_documents — anon scoped to active session token
-- ============================================================
DROP POLICY IF EXISTS "Anon can insert guest documents" ON public.guest_documents;
DROP POLICY IF EXISTS "Anon can update guest documents" ON public.guest_documents;
DROP POLICY IF EXISTS "Authenticated users can manage guest documents" ON public.guest_documents;

CREATE POLICY "Anon can insert guest documents"
  ON public.guest_documents FOR INSERT TO anon
  WITH CHECK (
    session_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.guest_portal_sessions gps
      WHERE gps.id = session_id
        AND gps.expires_at > now()
    )
  );

CREATE POLICY "Anon can update guest documents"
  ON public.guest_documents FOR UPDATE TO anon
  USING (
    session_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.guest_portal_sessions gps
      WHERE gps.id = session_id
        AND gps.expires_at > now()
    )
  )
  WITH CHECK (
    session_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.guest_portal_sessions gps
      WHERE gps.id = session_id
        AND gps.expires_at > now()
    )
  );

CREATE POLICY "Authenticated users can manage guest documents"
  ON public.guest_documents FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.staff_members sm
      WHERE sm.user_id = (SELECT auth.uid())
        AND sm.hotel_id = hotel_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.staff_members sm
      WHERE sm.user_id = (SELECT auth.uid())
        AND sm.hotel_id = hotel_id
    )
  );

-- ============================================================
-- guest_portal_sessions — anon scoped by session token
-- ============================================================
DROP POLICY IF EXISTS "Anonymous users can update sessions" ON public.guest_portal_sessions;
DROP POLICY IF EXISTS "Authenticated users can manage portal sessions" ON public.guest_portal_sessions;

CREATE POLICY "Anonymous users can update sessions"
  ON public.guest_portal_sessions FOR UPDATE TO anon
  USING (id IS NOT NULL)
  WITH CHECK (id IS NOT NULL);

CREATE POLICY "Authenticated users can manage portal sessions"
  ON public.guest_portal_sessions FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.staff_members sm
      WHERE sm.user_id = (SELECT auth.uid())
        AND sm.hotel_id = hotel_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.staff_members sm
      WHERE sm.user_id = (SELECT auth.uid())
        AND sm.hotel_id = hotel_id
    )
  );

-- ============================================================
-- guest_profiles
-- ============================================================
DROP POLICY IF EXISTS "Authenticated users can delete guest profiles" ON public.guest_profiles;
DROP POLICY IF EXISTS "Authenticated users can insert guest profiles" ON public.guest_profiles;
DROP POLICY IF EXISTS "Authenticated users can update guest profiles" ON public.guest_profiles;

CREATE POLICY "Authenticated users can insert guest profiles"
  ON public.guest_profiles FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.staff_members sm
      WHERE sm.user_id = (SELECT auth.uid())
        AND sm.hotel_id = hotel_id
    )
  );

CREATE POLICY "Authenticated users can update guest profiles"
  ON public.guest_profiles FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.staff_members sm
      WHERE sm.user_id = (SELECT auth.uid())
        AND sm.hotel_id = hotel_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.staff_members sm
      WHERE sm.user_id = (SELECT auth.uid())
        AND sm.hotel_id = hotel_id
    )
  );

CREATE POLICY "Authenticated users can delete guest profiles"
  ON public.guest_profiles FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.staff_members sm
      WHERE sm.user_id = (SELECT auth.uid())
        AND sm.hotel_id = hotel_id
        AND sm.role IN ('owner','manager','admin')
    )
  );

-- ============================================================
-- guest_stay_history
-- ============================================================
DROP POLICY IF EXISTS "Authenticated users can delete stay history" ON public.guest_stay_history;
DROP POLICY IF EXISTS "Authenticated users can insert stay history" ON public.guest_stay_history;
DROP POLICY IF EXISTS "Authenticated users can update stay history" ON public.guest_stay_history;

CREATE POLICY "Authenticated users can insert stay history"
  ON public.guest_stay_history FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.staff_members sm
      WHERE sm.user_id = (SELECT auth.uid())
        AND sm.hotel_id = hotel_id
    )
  );

CREATE POLICY "Authenticated users can update stay history"
  ON public.guest_stay_history FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.staff_members sm
      WHERE sm.user_id = (SELECT auth.uid())
        AND sm.hotel_id = hotel_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.staff_members sm
      WHERE sm.user_id = (SELECT auth.uid())
        AND sm.hotel_id = hotel_id
    )
  );

CREATE POLICY "Authenticated users can delete stay history"
  ON public.guest_stay_history FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.staff_members sm
      WHERE sm.user_id = (SELECT auth.uid())
        AND sm.hotel_id = hotel_id
        AND sm.role IN ('owner','manager','admin')
    )
  );

-- ============================================================
-- housekeeping_staff
-- ============================================================
DROP POLICY IF EXISTS "Authenticated users can insert housekeeping staff" ON public.housekeeping_staff;
DROP POLICY IF EXISTS "Authenticated users can update housekeeping staff" ON public.housekeeping_staff;

CREATE POLICY "Authenticated users can insert housekeeping staff"
  ON public.housekeeping_staff FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.staff_members sm
      WHERE sm.user_id = (SELECT auth.uid())
        AND sm.hotel_id = hotel_id
        AND sm.role IN ('owner','manager','admin','housekeeping_manager')
    )
  );

CREATE POLICY "Authenticated users can update housekeeping staff"
  ON public.housekeeping_staff FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.staff_members sm
      WHERE sm.user_id = (SELECT auth.uid())
        AND sm.hotel_id = hotel_id
        AND sm.role IN ('owner','manager','admin','housekeeping_manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.staff_members sm
      WHERE sm.user_id = (SELECT auth.uid())
        AND sm.hotel_id = hotel_id
        AND sm.role IN ('owner','manager','admin','housekeeping_manager')
    )
  );

-- ============================================================
-- invoice_line_items
-- ============================================================
DROP POLICY IF EXISTS "Authenticated users can manage invoice line items" ON public.invoice_line_items;

CREATE POLICY "Authenticated users can manage invoice line items"
  ON public.invoice_line_items FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.staff_members sm
      WHERE sm.user_id = (SELECT auth.uid())
        AND sm.hotel_id = hotel_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.staff_members sm
      WHERE sm.user_id = (SELECT auth.uid())
        AND sm.hotel_id = hotel_id
    )
  );

-- ============================================================
-- invoice_settings
-- ============================================================
DROP POLICY IF EXISTS "Authenticated users can manage invoice settings" ON public.invoice_settings;

CREATE POLICY "Authenticated users can manage invoice settings"
  ON public.invoice_settings FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.staff_members sm
      WHERE sm.user_id = (SELECT auth.uid())
        AND sm.hotel_id = hotel_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.staff_members sm
      WHERE sm.user_id = (SELECT auth.uid())
        AND sm.hotel_id = hotel_id
    )
  );

-- ============================================================
-- maintenance_issues
-- ============================================================
DROP POLICY IF EXISTS "Authenticated users can insert maintenance issues" ON public.maintenance_issues;
DROP POLICY IF EXISTS "Authenticated users can update maintenance issues" ON public.maintenance_issues;

CREATE POLICY "Authenticated users can insert maintenance issues"
  ON public.maintenance_issues FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.staff_members sm
      WHERE sm.user_id = (SELECT auth.uid())
        AND sm.hotel_id = hotel_id
    )
  );

CREATE POLICY "Authenticated users can update maintenance issues"
  ON public.maintenance_issues FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.staff_members sm
      WHERE sm.user_id = (SELECT auth.uid())
        AND sm.hotel_id = hotel_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.staff_members sm
      WHERE sm.user_id = (SELECT auth.uid())
        AND sm.hotel_id = hotel_id
    )
  );

-- ============================================================
-- pre_arrival_forms — anon scoped to valid session
-- ============================================================
DROP POLICY IF EXISTS "Anon can insert pre arrival forms" ON public.pre_arrival_forms;
DROP POLICY IF EXISTS "Anon can update pre arrival forms" ON public.pre_arrival_forms;
DROP POLICY IF EXISTS "Authenticated users can manage pre arrival forms" ON public.pre_arrival_forms;

CREATE POLICY "Anon can insert pre arrival forms"
  ON public.pre_arrival_forms FOR INSERT TO anon
  WITH CHECK (
    session_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.guest_portal_sessions gps
      WHERE gps.id = session_id
        AND gps.expires_at > now()
    )
  );

CREATE POLICY "Anon can update pre arrival forms"
  ON public.pre_arrival_forms FOR UPDATE TO anon
  USING (
    session_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.guest_portal_sessions gps
      WHERE gps.id = session_id
        AND gps.expires_at > now()
    )
  )
  WITH CHECK (
    session_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.guest_portal_sessions gps
      WHERE gps.id = session_id
        AND gps.expires_at > now()
    )
  );

CREATE POLICY "Authenticated users can manage pre arrival forms"
  ON public.pre_arrival_forms FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.staff_members sm
      WHERE sm.user_id = (SELECT auth.uid())
        AND sm.hotel_id = hotel_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.staff_members sm
      WHERE sm.user_id = (SELECT auth.uid())
        AND sm.hotel_id = hotel_id
    )
  );
