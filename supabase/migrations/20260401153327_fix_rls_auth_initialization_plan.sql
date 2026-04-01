/*
  # Fix RLS Auth Initialization Plan Performance

  ## Summary
  Replaces all bare `auth.uid()` and `auth.jwt()` calls in RLS policies with
  `(select auth.uid())` and `(select auth.jwt())`. This prevents Postgres from
  re-evaluating the auth function for every row in a table scan, which is a
  significant performance improvement at scale.

  ## Tables Fixed
  - staff_members (4 policies)
  - channel_sync_logs (2 policies)
  - dpa_acceptances (2 policies)
  - role_permissions (4 policies)
  - expedia_settings, expedia_sync_logs, expedia_room_mappings (6 policies)
  - property_owners, owner_properties, owner_statements (12 policies)
  - pricing_rules, competitor_rates (7 policies)
  - cloudbeds_settings, cloudbeds_sync_logs, cloudbeds_room_mappings (9 policies)
  - ai_price_suggestions (4 policies)
  - siteminder_settings, siteminder_sync_logs, siteminder_room_mappings (9 policies)
  - lodgify_room_mappings, lodgify_settings, lodgify_sync_logs (9 policies)
  - booking_engine_config (2 policies)
  - invoices_v2, invoice_lines (7 policies)
  - booking_com_settings, booking_com_sync_logs, booking_com_room_mappings (8 policies)
  - upsell_items, upsell_orders (8 policies)
  - channels (3 policies)
  - user_hotel_assignments (4 policies)
*/

-- ============================================================
-- staff_members
-- ============================================================
DROP POLICY IF EXISTS "Admins can insert staff members" ON public.staff_members;
DROP POLICY IF EXISTS "Admins can update staff members" ON public.staff_members;
DROP POLICY IF EXISTS "Staff can update own record" ON public.staff_members;
DROP POLICY IF EXISTS "Staff can view own hotel staff" ON public.staff_members;

CREATE POLICY "Admins can insert staff members"
  ON public.staff_members FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.staff_members sm
      WHERE sm.user_id = (SELECT auth.uid())
        AND sm.hotel_id = hotel_id
        AND sm.role IN ('owner','manager','admin')
    )
  );

CREATE POLICY "Admins can update staff members"
  ON public.staff_members FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.staff_members sm
      WHERE sm.user_id = (SELECT auth.uid())
        AND sm.hotel_id = hotel_id
        AND sm.role IN ('owner','manager','admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.staff_members sm
      WHERE sm.user_id = (SELECT auth.uid())
        AND sm.hotel_id = hotel_id
        AND sm.role IN ('owner','manager','admin')
    )
  );

CREATE POLICY "Staff can update own record"
  ON public.staff_members FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Staff can view own hotel staff"
  ON public.staff_members FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.staff_members sm
      WHERE sm.user_id = (SELECT auth.uid())
        AND sm.hotel_id = hotel_id
    )
  );

-- ============================================================
-- dpa_acceptances
-- ============================================================
DROP POLICY IF EXISTS "Authenticated users can insert own dpa acceptance" ON public.dpa_acceptances;
DROP POLICY IF EXISTS "Authenticated users can view own dpa acceptances" ON public.dpa_acceptances;

CREATE POLICY "Authenticated users can insert own dpa acceptance"
  ON public.dpa_acceptances FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Authenticated users can view own dpa acceptances"
  ON public.dpa_acceptances FOR SELECT TO authenticated
  USING (
    (SELECT auth.uid()) = user_id
    OR (
      tenant_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.staff_members sm
        WHERE sm.user_id = (SELECT auth.uid())
          AND sm.hotel_id IN (
            SELECT hotel_id FROM public.user_hotel_assignments
            WHERE user_id = (SELECT auth.uid())
          )
      )
    )
  );

-- ============================================================
-- channel_sync_logs  (drop duplicates, keep one set with (select auth.uid()))
-- ============================================================
DROP POLICY IF EXISTS "Staff can insert sync logs" ON public.channel_sync_logs;
DROP POLICY IF EXISTS "Staff can view sync logs" ON public.channel_sync_logs;
DROP POLICY IF EXISTS "Staff can insert channel sync logs" ON public.channel_sync_logs;
DROP POLICY IF EXISTS "Staff can view channel sync logs" ON public.channel_sync_logs;

CREATE POLICY "Staff can view channel sync logs"
  ON public.channel_sync_logs FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.staff_members sm
      WHERE sm.user_id = (SELECT auth.uid())
        AND sm.hotel_id = hotel_id
    )
  );

CREATE POLICY "Staff can insert channel sync logs"
  ON public.channel_sync_logs FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.staff_members sm
      WHERE sm.user_id = (SELECT auth.uid())
        AND sm.hotel_id = hotel_id
    )
  );

-- ============================================================
-- role_permissions
-- ============================================================
DROP POLICY IF EXISTS "Owners and managers can insert permissions" ON public.role_permissions;
DROP POLICY IF EXISTS "Owners and managers can update permissions" ON public.role_permissions;
DROP POLICY IF EXISTS "Owners can delete permissions" ON public.role_permissions;
DROP POLICY IF EXISTS "Staff can view permissions for their hotel" ON public.role_permissions;

CREATE POLICY "Staff can view permissions for their hotel"
  ON public.role_permissions FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.staff_members sm
      WHERE sm.user_id = (SELECT auth.uid())
        AND sm.hotel_id = hotel_id
    )
  );

CREATE POLICY "Owners and managers can insert permissions"
  ON public.role_permissions FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.staff_members sm
      WHERE sm.user_id = (SELECT auth.uid())
        AND sm.hotel_id = hotel_id
        AND sm.role IN ('owner','manager','admin')
    )
  );

CREATE POLICY "Owners and managers can update permissions"
  ON public.role_permissions FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.staff_members sm
      WHERE sm.user_id = (SELECT auth.uid())
        AND sm.hotel_id = hotel_id
        AND sm.role IN ('owner','manager','admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.staff_members sm
      WHERE sm.user_id = (SELECT auth.uid())
        AND sm.hotel_id = hotel_id
        AND sm.role IN ('owner','manager','admin')
    )
  );

CREATE POLICY "Owners can delete permissions"
  ON public.role_permissions FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.staff_members sm
      WHERE sm.user_id = (SELECT auth.uid())
        AND sm.hotel_id = hotel_id
        AND sm.role IN ('owner','admin')
    )
  );

-- ============================================================
-- expedia_settings
-- ============================================================
DROP POLICY IF EXISTS "Admin staff can insert expedia settings" ON public.expedia_settings;
DROP POLICY IF EXISTS "Admin staff can update expedia settings" ON public.expedia_settings;
DROP POLICY IF EXISTS "Staff can view expedia settings" ON public.expedia_settings;

CREATE POLICY "Staff can view expedia settings"
  ON public.expedia_settings FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.staff_members sm
      WHERE sm.user_id = (SELECT auth.uid())
        AND sm.hotel_id = hotel_id
    )
  );

CREATE POLICY "Admin staff can insert expedia settings"
  ON public.expedia_settings FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.staff_members sm
      WHERE sm.user_id = (SELECT auth.uid())
        AND sm.hotel_id = hotel_id
        AND sm.role IN ('owner','manager','admin')
    )
  );

CREATE POLICY "Admin staff can update expedia settings"
  ON public.expedia_settings FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.staff_members sm
      WHERE sm.user_id = (SELECT auth.uid())
        AND sm.hotel_id = hotel_id
        AND sm.role IN ('owner','manager','admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.staff_members sm
      WHERE sm.user_id = (SELECT auth.uid())
        AND sm.hotel_id = hotel_id
        AND sm.role IN ('owner','manager','admin')
    )
  );

-- ============================================================
-- expedia_sync_logs
-- ============================================================
DROP POLICY IF EXISTS "Admin staff can insert expedia sync logs" ON public.expedia_sync_logs;
DROP POLICY IF EXISTS "Staff can view expedia sync logs" ON public.expedia_sync_logs;

CREATE POLICY "Staff can view expedia sync logs"
  ON public.expedia_sync_logs FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.staff_members sm
      WHERE sm.user_id = (SELECT auth.uid())
        AND sm.hotel_id = hotel_id
    )
  );

CREATE POLICY "Admin staff can insert expedia sync logs"
  ON public.expedia_sync_logs FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.staff_members sm
      WHERE sm.user_id = (SELECT auth.uid())
        AND sm.hotel_id = hotel_id
        AND sm.role IN ('owner','manager','admin')
    )
  );

-- ============================================================
-- expedia_room_mappings
-- ============================================================
DROP POLICY IF EXISTS "Admin staff can insert expedia room mappings" ON public.expedia_room_mappings;
DROP POLICY IF EXISTS "Admin staff can update expedia room mappings" ON public.expedia_room_mappings;
DROP POLICY IF EXISTS "Staff can view expedia room mappings" ON public.expedia_room_mappings;

CREATE POLICY "Staff can view expedia room mappings"
  ON public.expedia_room_mappings FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.staff_members sm
      WHERE sm.user_id = (SELECT auth.uid())
        AND sm.hotel_id = hotel_id
    )
  );

CREATE POLICY "Admin staff can insert expedia room mappings"
  ON public.expedia_room_mappings FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.staff_members sm
      WHERE sm.user_id = (SELECT auth.uid())
        AND sm.hotel_id = hotel_id
        AND sm.role IN ('owner','manager','admin')
    )
  );

CREATE POLICY "Admin staff can update expedia room mappings"
  ON public.expedia_room_mappings FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.staff_members sm
      WHERE sm.user_id = (SELECT auth.uid())
        AND sm.hotel_id = hotel_id
        AND sm.role IN ('owner','manager','admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.staff_members sm
      WHERE sm.user_id = (SELECT auth.uid())
        AND sm.hotel_id = hotel_id
        AND sm.role IN ('owner','manager','admin')
    )
  );

-- ============================================================
-- property_owners
-- ============================================================
DROP POLICY IF EXISTS "Hotel owners can delete property owners" ON public.property_owners;
DROP POLICY IF EXISTS "Staff can view property owners for their hotel" ON public.property_owners;
DROP POLICY IF EXISTS "Staff owners and managers can insert property owners" ON public.property_owners;
DROP POLICY IF EXISTS "Staff owners and managers can update property owners" ON public.property_owners;

CREATE POLICY "Staff can view property owners for their hotel"
  ON public.property_owners FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.staff_members sm
      WHERE sm.user_id = (SELECT auth.uid())
        AND sm.hotel_id = hotel_id
    )
  );

CREATE POLICY "Staff owners and managers can insert property owners"
  ON public.property_owners FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.staff_members sm
      WHERE sm.user_id = (SELECT auth.uid())
        AND sm.hotel_id = hotel_id
        AND sm.role IN ('owner','manager','admin')
    )
  );

CREATE POLICY "Staff owners and managers can update property owners"
  ON public.property_owners FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.staff_members sm
      WHERE sm.user_id = (SELECT auth.uid())
        AND sm.hotel_id = hotel_id
        AND sm.role IN ('owner','manager','admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.staff_members sm
      WHERE sm.user_id = (SELECT auth.uid())
        AND sm.hotel_id = hotel_id
        AND sm.role IN ('owner','manager','admin')
    )
  );

CREATE POLICY "Hotel owners can delete property owners"
  ON public.property_owners FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.staff_members sm
      WHERE sm.user_id = (SELECT auth.uid())
        AND sm.hotel_id = hotel_id
        AND sm.role IN ('owner','admin')
    )
  );

-- ============================================================
-- owner_properties
-- ============================================================
DROP POLICY IF EXISTS "Hotel owners can delete owner properties" ON public.owner_properties;
DROP POLICY IF EXISTS "Owners and managers can insert owner properties" ON public.owner_properties;
DROP POLICY IF EXISTS "Owners and managers can update owner properties" ON public.owner_properties;
DROP POLICY IF EXISTS "Staff can view owner properties for their hotel" ON public.owner_properties;

CREATE POLICY "Staff can view owner properties for their hotel"
  ON public.owner_properties FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.staff_members sm
      WHERE sm.user_id = (SELECT auth.uid())
        AND sm.hotel_id = hotel_id
    )
  );

CREATE POLICY "Owners and managers can insert owner properties"
  ON public.owner_properties FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.staff_members sm
      WHERE sm.user_id = (SELECT auth.uid())
        AND sm.hotel_id = hotel_id
        AND sm.role IN ('owner','manager','admin')
    )
  );

CREATE POLICY "Owners and managers can update owner properties"
  ON public.owner_properties FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.staff_members sm
      WHERE sm.user_id = (SELECT auth.uid())
        AND sm.hotel_id = hotel_id
        AND sm.role IN ('owner','manager','admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.staff_members sm
      WHERE sm.user_id = (SELECT auth.uid())
        AND sm.hotel_id = hotel_id
        AND sm.role IN ('owner','manager','admin')
    )
  );

CREATE POLICY "Hotel owners can delete owner properties"
  ON public.owner_properties FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.staff_members sm
      WHERE sm.user_id = (SELECT auth.uid())
        AND sm.hotel_id = hotel_id
        AND sm.role IN ('owner','admin')
    )
  );

-- ============================================================
-- owner_statements
-- ============================================================
DROP POLICY IF EXISTS "Hotel owners can delete statements" ON public.owner_statements;
DROP POLICY IF EXISTS "Owners and managers can insert statements" ON public.owner_statements;
DROP POLICY IF EXISTS "Owners and managers can update statements" ON public.owner_statements;
DROP POLICY IF EXISTS "Staff can view statements for their hotel" ON public.owner_statements;

CREATE POLICY "Staff can view statements for their hotel"
  ON public.owner_statements FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.staff_members sm
      WHERE sm.user_id = (SELECT auth.uid())
        AND sm.hotel_id = hotel_id
    )
  );

CREATE POLICY "Owners and managers can insert statements"
  ON public.owner_statements FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.staff_members sm
      WHERE sm.user_id = (SELECT auth.uid())
        AND sm.hotel_id = hotel_id
        AND sm.role IN ('owner','manager','admin')
    )
  );

CREATE POLICY "Owners and managers can update statements"
  ON public.owner_statements FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.staff_members sm
      WHERE sm.user_id = (SELECT auth.uid())
        AND sm.hotel_id = hotel_id
        AND sm.role IN ('owner','manager','admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.staff_members sm
      WHERE sm.user_id = (SELECT auth.uid())
        AND sm.hotel_id = hotel_id
        AND sm.role IN ('owner','manager','admin')
    )
  );

CREATE POLICY "Hotel owners can delete statements"
  ON public.owner_statements FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.staff_members sm
      WHERE sm.user_id = (SELECT auth.uid())
        AND sm.hotel_id = hotel_id
        AND sm.role IN ('owner','admin')
    )
  );

-- ============================================================
-- pricing_rules
-- ============================================================
DROP POLICY IF EXISTS "Owners and managers can delete pricing rules" ON public.pricing_rules;
DROP POLICY IF EXISTS "Owners and managers can insert pricing rules" ON public.pricing_rules;
DROP POLICY IF EXISTS "Owners and managers can update pricing rules" ON public.pricing_rules;
DROP POLICY IF EXISTS "Staff can view pricing rules for their hotel" ON public.pricing_rules;

CREATE POLICY "Staff can view pricing rules for their hotel"
  ON public.pricing_rules FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.staff_members sm
      WHERE sm.user_id = (SELECT auth.uid())
        AND sm.hotel_id = hotel_id
    )
  );

CREATE POLICY "Owners and managers can insert pricing rules"
  ON public.pricing_rules FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.staff_members sm
      WHERE sm.user_id = (SELECT auth.uid())
        AND sm.hotel_id = hotel_id
        AND sm.role IN ('owner','manager','admin')
    )
  );

CREATE POLICY "Owners and managers can update pricing rules"
  ON public.pricing_rules FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.staff_members sm
      WHERE sm.user_id = (SELECT auth.uid())
        AND sm.hotel_id = hotel_id
        AND sm.role IN ('owner','manager','admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.staff_members sm
      WHERE sm.user_id = (SELECT auth.uid())
        AND sm.hotel_id = hotel_id
        AND sm.role IN ('owner','manager','admin')
    )
  );

CREATE POLICY "Owners and managers can delete pricing rules"
  ON public.pricing_rules FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.staff_members sm
      WHERE sm.user_id = (SELECT auth.uid())
        AND sm.hotel_id = hotel_id
        AND sm.role IN ('owner','manager','admin')
    )
  );

-- ============================================================
-- competitor_rates
-- ============================================================
DROP POLICY IF EXISTS "Owners and managers can delete competitor rates" ON public.competitor_rates;
DROP POLICY IF EXISTS "Owners and managers can insert competitor rates" ON public.competitor_rates;
DROP POLICY IF EXISTS "Staff can view competitor rates for their hotel" ON public.competitor_rates;

CREATE POLICY "Staff can view competitor rates for their hotel"
  ON public.competitor_rates FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.staff_members sm
      WHERE sm.user_id = (SELECT auth.uid())
        AND sm.hotel_id = hotel_id
    )
  );

CREATE POLICY "Owners and managers can insert competitor rates"
  ON public.competitor_rates FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.staff_members sm
      WHERE sm.user_id = (SELECT auth.uid())
        AND sm.hotel_id = hotel_id
        AND sm.role IN ('owner','manager','admin')
    )
  );

CREATE POLICY "Owners and managers can delete competitor rates"
  ON public.competitor_rates FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.staff_members sm
      WHERE sm.user_id = (SELECT auth.uid())
        AND sm.hotel_id = hotel_id
        AND sm.role IN ('owner','manager','admin')
    )
  );

-- ============================================================
-- cloudbeds_settings
-- ============================================================
DROP POLICY IF EXISTS "Admins and managers can insert cloudbeds settings" ON public.cloudbeds_settings;
DROP POLICY IF EXISTS "Admins and managers can update cloudbeds settings" ON public.cloudbeds_settings;
DROP POLICY IF EXISTS "Staff can view cloudbeds settings for their hotel" ON public.cloudbeds_settings;

CREATE POLICY "Staff can view cloudbeds settings for their hotel"
  ON public.cloudbeds_settings FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.staff_members sm
      WHERE sm.user_id = (SELECT auth.uid())
        AND sm.hotel_id = hotel_id
    )
  );

CREATE POLICY "Admins and managers can insert cloudbeds settings"
  ON public.cloudbeds_settings FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.staff_members sm
      WHERE sm.user_id = (SELECT auth.uid())
        AND sm.hotel_id = hotel_id
        AND sm.role IN ('owner','manager','admin')
    )
  );

CREATE POLICY "Admins and managers can update cloudbeds settings"
  ON public.cloudbeds_settings FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.staff_members sm
      WHERE sm.user_id = (SELECT auth.uid())
        AND sm.hotel_id = hotel_id
        AND sm.role IN ('owner','manager','admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.staff_members sm
      WHERE sm.user_id = (SELECT auth.uid())
        AND sm.hotel_id = hotel_id
        AND sm.role IN ('owner','manager','admin')
    )
  );

-- ============================================================
-- cloudbeds_sync_logs
-- ============================================================
DROP POLICY IF EXISTS "Admins and managers can insert cloudbeds sync logs" ON public.cloudbeds_sync_logs;
DROP POLICY IF EXISTS "Admins and managers can update cloudbeds sync logs" ON public.cloudbeds_sync_logs;
DROP POLICY IF EXISTS "Staff can view cloudbeds sync logs for their hotel" ON public.cloudbeds_sync_logs;

CREATE POLICY "Staff can view cloudbeds sync logs for their hotel"
  ON public.cloudbeds_sync_logs FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.staff_members sm
      WHERE sm.user_id = (SELECT auth.uid())
        AND sm.hotel_id = hotel_id
    )
  );

CREATE POLICY "Admins and managers can insert cloudbeds sync logs"
  ON public.cloudbeds_sync_logs FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.staff_members sm
      WHERE sm.user_id = (SELECT auth.uid())
        AND sm.hotel_id = hotel_id
        AND sm.role IN ('owner','manager','admin')
    )
  );

CREATE POLICY "Admins and managers can update cloudbeds sync logs"
  ON public.cloudbeds_sync_logs FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.staff_members sm
      WHERE sm.user_id = (SELECT auth.uid())
        AND sm.hotel_id = hotel_id
        AND sm.role IN ('owner','manager','admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.staff_members sm
      WHERE sm.user_id = (SELECT auth.uid())
        AND sm.hotel_id = hotel_id
        AND sm.role IN ('owner','manager','admin')
    )
  );

-- ============================================================
-- cloudbeds_room_mappings
-- ============================================================
DROP POLICY IF EXISTS "Admins and managers can insert cloudbeds room mappings" ON public.cloudbeds_room_mappings;
DROP POLICY IF EXISTS "Admins and managers can update cloudbeds room mappings" ON public.cloudbeds_room_mappings;
DROP POLICY IF EXISTS "Staff can view cloudbeds room mappings for their hotel" ON public.cloudbeds_room_mappings;

CREATE POLICY "Staff can view cloudbeds room mappings for their hotel"
  ON public.cloudbeds_room_mappings FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.staff_members sm
      WHERE sm.user_id = (SELECT auth.uid())
        AND sm.hotel_id = hotel_id
    )
  );

CREATE POLICY "Admins and managers can insert cloudbeds room mappings"
  ON public.cloudbeds_room_mappings FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.staff_members sm
      WHERE sm.user_id = (SELECT auth.uid())
        AND sm.hotel_id = hotel_id
        AND sm.role IN ('owner','manager','admin')
    )
  );

CREATE POLICY "Admins and managers can update cloudbeds room mappings"
  ON public.cloudbeds_room_mappings FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.staff_members sm
      WHERE sm.user_id = (SELECT auth.uid())
        AND sm.hotel_id = hotel_id
        AND sm.role IN ('owner','manager','admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.staff_members sm
      WHERE sm.user_id = (SELECT auth.uid())
        AND sm.hotel_id = hotel_id
        AND sm.role IN ('owner','manager','admin')
    )
  );

-- ============================================================
-- ai_price_suggestions
-- ============================================================
DROP POLICY IF EXISTS "Owners and managers can delete AI suggestions" ON public.ai_price_suggestions;
DROP POLICY IF EXISTS "Owners and managers can insert AI suggestions" ON public.ai_price_suggestions;
DROP POLICY IF EXISTS "Owners and managers can update AI suggestions" ON public.ai_price_suggestions;
DROP POLICY IF EXISTS "Staff can view AI suggestions for their hotel" ON public.ai_price_suggestions;

CREATE POLICY "Staff can view AI suggestions for their hotel"
  ON public.ai_price_suggestions FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.staff_members sm
      WHERE sm.user_id = (SELECT auth.uid())
        AND sm.hotel_id = hotel_id
    )
  );

CREATE POLICY "Owners and managers can insert AI suggestions"
  ON public.ai_price_suggestions FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.staff_members sm
      WHERE sm.user_id = (SELECT auth.uid())
        AND sm.hotel_id = hotel_id
        AND sm.role IN ('owner','manager','admin')
    )
  );

CREATE POLICY "Owners and managers can update AI suggestions"
  ON public.ai_price_suggestions FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.staff_members sm
      WHERE sm.user_id = (SELECT auth.uid())
        AND sm.hotel_id = hotel_id
        AND sm.role IN ('owner','manager','admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.staff_members sm
      WHERE sm.user_id = (SELECT auth.uid())
        AND sm.hotel_id = hotel_id
        AND sm.role IN ('owner','manager','admin')
    )
  );

CREATE POLICY "Owners and managers can delete AI suggestions"
  ON public.ai_price_suggestions FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.staff_members sm
      WHERE sm.user_id = (SELECT auth.uid())
        AND sm.hotel_id = hotel_id
        AND sm.role IN ('owner','manager','admin')
    )
  );

-- ============================================================
-- siteminder_settings
-- ============================================================
DROP POLICY IF EXISTS "Admins and managers can insert siteminder settings" ON public.siteminder_settings;
DROP POLICY IF EXISTS "Admins and managers can update siteminder settings" ON public.siteminder_settings;
DROP POLICY IF EXISTS "Staff can view siteminder settings for their hotel" ON public.siteminder_settings;

CREATE POLICY "Staff can view siteminder settings for their hotel"
  ON public.siteminder_settings FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.staff_members sm
      WHERE sm.user_id = (SELECT auth.uid())
        AND sm.hotel_id = hotel_id
    )
  );

CREATE POLICY "Admins and managers can insert siteminder settings"
  ON public.siteminder_settings FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.staff_members sm
      WHERE sm.user_id = (SELECT auth.uid())
        AND sm.hotel_id = hotel_id
        AND sm.role IN ('owner','manager','admin')
    )
  );

CREATE POLICY "Admins and managers can update siteminder settings"
  ON public.siteminder_settings FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.staff_members sm
      WHERE sm.user_id = (SELECT auth.uid())
        AND sm.hotel_id = hotel_id
        AND sm.role IN ('owner','manager','admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.staff_members sm
      WHERE sm.user_id = (SELECT auth.uid())
        AND sm.hotel_id = hotel_id
        AND sm.role IN ('owner','manager','admin')
    )
  );

-- ============================================================
-- siteminder_sync_logs
-- ============================================================
DROP POLICY IF EXISTS "Admins and managers can insert siteminder sync logs" ON public.siteminder_sync_logs;
DROP POLICY IF EXISTS "Admins and managers can update siteminder sync logs" ON public.siteminder_sync_logs;
DROP POLICY IF EXISTS "Staff can view siteminder sync logs for their hotel" ON public.siteminder_sync_logs;

CREATE POLICY "Staff can view siteminder sync logs for their hotel"
  ON public.siteminder_sync_logs FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.staff_members sm
      WHERE sm.user_id = (SELECT auth.uid())
        AND sm.hotel_id = hotel_id
    )
  );

CREATE POLICY "Admins and managers can insert siteminder sync logs"
  ON public.siteminder_sync_logs FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.staff_members sm
      WHERE sm.user_id = (SELECT auth.uid())
        AND sm.hotel_id = hotel_id
        AND sm.role IN ('owner','manager','admin')
    )
  );

CREATE POLICY "Admins and managers can update siteminder sync logs"
  ON public.siteminder_sync_logs FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.staff_members sm
      WHERE sm.user_id = (SELECT auth.uid())
        AND sm.hotel_id = hotel_id
        AND sm.role IN ('owner','manager','admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.staff_members sm
      WHERE sm.user_id = (SELECT auth.uid())
        AND sm.hotel_id = hotel_id
        AND sm.role IN ('owner','manager','admin')
    )
  );

-- ============================================================
-- siteminder_room_mappings
-- ============================================================
DROP POLICY IF EXISTS "Admins and managers can insert siteminder room mappings" ON public.siteminder_room_mappings;
DROP POLICY IF EXISTS "Admins and managers can update siteminder room mappings" ON public.siteminder_room_mappings;
DROP POLICY IF EXISTS "Staff can view siteminder room mappings for their hotel" ON public.siteminder_room_mappings;

CREATE POLICY "Staff can view siteminder room mappings for their hotel"
  ON public.siteminder_room_mappings FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.staff_members sm
      WHERE sm.user_id = (SELECT auth.uid())
        AND sm.hotel_id = hotel_id
    )
  );

CREATE POLICY "Admins and managers can insert siteminder room mappings"
  ON public.siteminder_room_mappings FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.staff_members sm
      WHERE sm.user_id = (SELECT auth.uid())
        AND sm.hotel_id = hotel_id
        AND sm.role IN ('owner','manager','admin')
    )
  );

CREATE POLICY "Admins and managers can update siteminder room mappings"
  ON public.siteminder_room_mappings FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.staff_members sm
      WHERE sm.user_id = (SELECT auth.uid())
        AND sm.hotel_id = hotel_id
        AND sm.role IN ('owner','manager','admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.staff_members sm
      WHERE sm.user_id = (SELECT auth.uid())
        AND sm.hotel_id = hotel_id
        AND sm.role IN ('owner','manager','admin')
    )
  );

-- ============================================================
-- lodgify_settings
-- ============================================================
DROP POLICY IF EXISTS "Admins and managers can insert lodgify settings" ON public.lodgify_settings;
DROP POLICY IF EXISTS "Admins and managers can update lodgify settings" ON public.lodgify_settings;
DROP POLICY IF EXISTS "Staff can view lodgify settings for their hotel" ON public.lodgify_settings;

CREATE POLICY "Staff can view lodgify settings for their hotel"
  ON public.lodgify_settings FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.staff_members sm
      WHERE sm.user_id = (SELECT auth.uid())
        AND sm.hotel_id = hotel_id
    )
  );

CREATE POLICY "Admins and managers can insert lodgify settings"
  ON public.lodgify_settings FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.staff_members sm
      WHERE sm.user_id = (SELECT auth.uid())
        AND sm.hotel_id = hotel_id
        AND sm.role IN ('owner','manager','admin')
    )
  );

CREATE POLICY "Admins and managers can update lodgify settings"
  ON public.lodgify_settings FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.staff_members sm
      WHERE sm.user_id = (SELECT auth.uid())
        AND sm.hotel_id = hotel_id
        AND sm.role IN ('owner','manager','admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.staff_members sm
      WHERE sm.user_id = (SELECT auth.uid())
        AND sm.hotel_id = hotel_id
        AND sm.role IN ('owner','manager','admin')
    )
  );

-- ============================================================
-- lodgify_sync_logs
-- ============================================================
DROP POLICY IF EXISTS "Admins and managers can insert lodgify sync logs" ON public.lodgify_sync_logs;
DROP POLICY IF EXISTS "Admins and managers can update lodgify sync logs" ON public.lodgify_sync_logs;
DROP POLICY IF EXISTS "Staff can view lodgify sync logs for their hotel" ON public.lodgify_sync_logs;

CREATE POLICY "Staff can view lodgify sync logs for their hotel"
  ON public.lodgify_sync_logs FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.staff_members sm
      WHERE sm.user_id = (SELECT auth.uid())
        AND sm.hotel_id = hotel_id
    )
  );

CREATE POLICY "Admins and managers can insert lodgify sync logs"
  ON public.lodgify_sync_logs FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.staff_members sm
      WHERE sm.user_id = (SELECT auth.uid())
        AND sm.hotel_id = hotel_id
        AND sm.role IN ('owner','manager','admin')
    )
  );

CREATE POLICY "Admins and managers can update lodgify sync logs"
  ON public.lodgify_sync_logs FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.staff_members sm
      WHERE sm.user_id = (SELECT auth.uid())
        AND sm.hotel_id = hotel_id
        AND sm.role IN ('owner','manager','admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.staff_members sm
      WHERE sm.user_id = (SELECT auth.uid())
        AND sm.hotel_id = hotel_id
        AND sm.role IN ('owner','manager','admin')
    )
  );

-- ============================================================
-- lodgify_room_mappings
-- ============================================================
DROP POLICY IF EXISTS "Admins and managers can insert lodgify room mappings" ON public.lodgify_room_mappings;
DROP POLICY IF EXISTS "Admins and managers can update lodgify room mappings" ON public.lodgify_room_mappings;
DROP POLICY IF EXISTS "Staff can view lodgify room mappings for their hotel" ON public.lodgify_room_mappings;

CREATE POLICY "Staff can view lodgify room mappings for their hotel"
  ON public.lodgify_room_mappings FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.staff_members sm
      WHERE sm.user_id = (SELECT auth.uid())
        AND sm.hotel_id = hotel_id
    )
  );

CREATE POLICY "Admins and managers can insert lodgify room mappings"
  ON public.lodgify_room_mappings FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.staff_members sm
      WHERE sm.user_id = (SELECT auth.uid())
        AND sm.hotel_id = hotel_id
        AND sm.role IN ('owner','manager','admin')
    )
  );

CREATE POLICY "Admins and managers can update lodgify room mappings"
  ON public.lodgify_room_mappings FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.staff_members sm
      WHERE sm.user_id = (SELECT auth.uid())
        AND sm.hotel_id = hotel_id
        AND sm.role IN ('owner','manager','admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.staff_members sm
      WHERE sm.user_id = (SELECT auth.uid())
        AND sm.hotel_id = hotel_id
        AND sm.role IN ('owner','manager','admin')
    )
  );

-- ============================================================
-- booking_engine_config  (also fixes duplicate policies)
-- ============================================================
DROP POLICY IF EXISTS "Staff can insert booking engine config" ON public.booking_engine_config;
DROP POLICY IF EXISTS "Staff can update booking engine config" ON public.booking_engine_config;
DROP POLICY IF EXISTS "Admins can insert booking engine config" ON public.booking_engine_config;
DROP POLICY IF EXISTS "Admins can update booking engine config" ON public.booking_engine_config;

CREATE POLICY "Staff can insert booking engine config"
  ON public.booking_engine_config FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.staff_members sm
      WHERE sm.user_id = (SELECT auth.uid())
        AND sm.hotel_id = hotel_id
        AND sm.role IN ('owner','manager','admin')
    )
  );

CREATE POLICY "Staff can update booking engine config"
  ON public.booking_engine_config FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.staff_members sm
      WHERE sm.user_id = (SELECT auth.uid())
        AND sm.hotel_id = hotel_id
        AND sm.role IN ('owner','manager','admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.staff_members sm
      WHERE sm.user_id = (SELECT auth.uid())
        AND sm.hotel_id = hotel_id
        AND sm.role IN ('owner','manager','admin')
    )
  );

-- ============================================================
-- invoices_v2  (also fixes duplicate policies)
-- ============================================================
DROP POLICY IF EXISTS "Staff can delete invoices v2" ON public.invoices_v2;
DROP POLICY IF EXISTS "Staff can insert invoices v2" ON public.invoices_v2;
DROP POLICY IF EXISTS "Staff can view invoices v2" ON public.invoices_v2;
DROP POLICY IF EXISTS "Staff can update invoices v2" ON public.invoices_v2;
DROP POLICY IF EXISTS "Staff can delete invoices_v2" ON public.invoices_v2;
DROP POLICY IF EXISTS "Staff can insert invoices_v2" ON public.invoices_v2;
DROP POLICY IF EXISTS "Staff can view invoices_v2" ON public.invoices_v2;
DROP POLICY IF EXISTS "Staff can update invoices_v2" ON public.invoices_v2;

CREATE POLICY "Staff can view invoices_v2"
  ON public.invoices_v2 FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.staff_members sm
      WHERE sm.user_id = (SELECT auth.uid())
        AND sm.hotel_id = hotel_id
    )
  );

CREATE POLICY "Staff can insert invoices_v2"
  ON public.invoices_v2 FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.staff_members sm
      WHERE sm.user_id = (SELECT auth.uid())
        AND sm.hotel_id = hotel_id
    )
  );

CREATE POLICY "Staff can update invoices_v2"
  ON public.invoices_v2 FOR UPDATE TO authenticated
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

CREATE POLICY "Staff can delete invoices_v2"
  ON public.invoices_v2 FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.staff_members sm
      WHERE sm.user_id = (SELECT auth.uid())
        AND sm.hotel_id = hotel_id
        AND sm.role IN ('owner','manager','admin')
    )
  );

-- ============================================================
-- invoice_lines  (also fixes duplicate policies)
-- ============================================================
DROP POLICY IF EXISTS "Staff can delete invoice lines" ON public.invoice_lines;
DROP POLICY IF EXISTS "Staff can insert invoice lines" ON public.invoice_lines;
DROP POLICY IF EXISTS "Staff can view invoice lines" ON public.invoice_lines;
DROP POLICY IF EXISTS "Staff can delete invoice_lines" ON public.invoice_lines;
DROP POLICY IF EXISTS "Staff can insert invoice_lines" ON public.invoice_lines;
DROP POLICY IF EXISTS "Staff can view invoice_lines" ON public.invoice_lines;

CREATE POLICY "Staff can view invoice_lines"
  ON public.invoice_lines FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.invoice_lines il
      JOIN public.invoices_v2 inv ON inv.id = il.invoice_id
      JOIN public.staff_members sm ON sm.hotel_id = inv.hotel_id
      WHERE il.id = invoice_lines.id
        AND sm.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Staff can insert invoice_lines"
  ON public.invoice_lines FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.invoices_v2 inv
      JOIN public.staff_members sm ON sm.hotel_id = inv.hotel_id
      WHERE inv.id = invoice_id
        AND sm.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Staff can delete invoice_lines"
  ON public.invoice_lines FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.invoice_lines il
      JOIN public.invoices_v2 inv ON inv.id = il.invoice_id
      JOIN public.staff_members sm ON sm.hotel_id = inv.hotel_id
      WHERE il.id = invoice_lines.id
        AND sm.user_id = (SELECT auth.uid())
    )
  );

-- ============================================================
-- booking_com_settings  (also fixes duplicate policies)
-- ============================================================
DROP POLICY IF EXISTS "Admin staff can insert booking.com settings" ON public.booking_com_settings;
DROP POLICY IF EXISTS "Admin staff can update booking.com settings" ON public.booking_com_settings;
DROP POLICY IF EXISTS "Staff can view their hotel booking.com settings" ON public.booking_com_settings;

CREATE POLICY "Staff can view their hotel booking.com settings"
  ON public.booking_com_settings FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.staff_members sm
      WHERE sm.user_id = (SELECT auth.uid())
        AND sm.hotel_id = hotel_id
    )
  );

CREATE POLICY "Admin staff can insert booking.com settings"
  ON public.booking_com_settings FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.staff_members sm
      WHERE sm.user_id = (SELECT auth.uid())
        AND sm.hotel_id = hotel_id
        AND sm.role IN ('owner','manager','admin')
    )
  );

CREATE POLICY "Admin staff can update booking.com settings"
  ON public.booking_com_settings FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.staff_members sm
      WHERE sm.user_id = (SELECT auth.uid())
        AND sm.hotel_id = hotel_id
        AND sm.role IN ('owner','manager','admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.staff_members sm
      WHERE sm.user_id = (SELECT auth.uid())
        AND sm.hotel_id = hotel_id
        AND sm.role IN ('owner','manager','admin')
    )
  );

-- ============================================================
-- booking_com_sync_logs
-- ============================================================
DROP POLICY IF EXISTS "Admin staff can insert sync logs" ON public.booking_com_sync_logs;
DROP POLICY IF EXISTS "Staff can view their hotel sync logs" ON public.booking_com_sync_logs;

CREATE POLICY "Staff can view their hotel sync logs"
  ON public.booking_com_sync_logs FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.staff_members sm
      WHERE sm.user_id = (SELECT auth.uid())
        AND sm.hotel_id = hotel_id
    )
  );

CREATE POLICY "Admin staff can insert sync logs"
  ON public.booking_com_sync_logs FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.staff_members sm
      WHERE sm.user_id = (SELECT auth.uid())
        AND sm.hotel_id = hotel_id
        AND sm.role IN ('owner','manager','admin')
    )
  );

-- ============================================================
-- booking_com_room_mappings
-- ============================================================
DROP POLICY IF EXISTS "Admin staff can insert room mappings" ON public.booking_com_room_mappings;
DROP POLICY IF EXISTS "Admin staff can update room mappings" ON public.booking_com_room_mappings;
DROP POLICY IF EXISTS "Staff can view room mappings" ON public.booking_com_room_mappings;

CREATE POLICY "Staff can view room mappings"
  ON public.booking_com_room_mappings FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.staff_members sm
      WHERE sm.user_id = (SELECT auth.uid())
        AND sm.hotel_id = hotel_id
    )
  );

CREATE POLICY "Admin staff can insert room mappings"
  ON public.booking_com_room_mappings FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.staff_members sm
      WHERE sm.user_id = (SELECT auth.uid())
        AND sm.hotel_id = hotel_id
        AND sm.role IN ('owner','manager','admin')
    )
  );

CREATE POLICY "Admin staff can update room mappings"
  ON public.booking_com_room_mappings FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.staff_members sm
      WHERE sm.user_id = (SELECT auth.uid())
        AND sm.hotel_id = hotel_id
        AND sm.role IN ('owner','manager','admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.staff_members sm
      WHERE sm.user_id = (SELECT auth.uid())
        AND sm.hotel_id = hotel_id
        AND sm.role IN ('owner','manager','admin')
    )
  );

-- ============================================================
-- upsell_items
-- ============================================================
DROP POLICY IF EXISTS "Owners and managers can delete upsell items" ON public.upsell_items;
DROP POLICY IF EXISTS "Owners and managers can insert upsell items" ON public.upsell_items;
DROP POLICY IF EXISTS "Owners and managers can update upsell items" ON public.upsell_items;
DROP POLICY IF EXISTS "Staff can view upsell items for their hotel" ON public.upsell_items;

CREATE POLICY "Staff can view upsell items for their hotel"
  ON public.upsell_items FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.staff_members sm
      WHERE sm.user_id = (SELECT auth.uid())
        AND sm.hotel_id = hotel_id
    )
  );

CREATE POLICY "Owners and managers can insert upsell items"
  ON public.upsell_items FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.staff_members sm
      WHERE sm.user_id = (SELECT auth.uid())
        AND sm.hotel_id = hotel_id
        AND sm.role IN ('owner','manager','admin')
    )
  );

CREATE POLICY "Owners and managers can update upsell items"
  ON public.upsell_items FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.staff_members sm
      WHERE sm.user_id = (SELECT auth.uid())
        AND sm.hotel_id = hotel_id
        AND sm.role IN ('owner','manager','admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.staff_members sm
      WHERE sm.user_id = (SELECT auth.uid())
        AND sm.hotel_id = hotel_id
        AND sm.role IN ('owner','manager','admin')
    )
  );

CREATE POLICY "Owners and managers can delete upsell items"
  ON public.upsell_items FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.staff_members sm
      WHERE sm.user_id = (SELECT auth.uid())
        AND sm.hotel_id = hotel_id
        AND sm.role IN ('owner','manager','admin')
    )
  );

-- ============================================================
-- upsell_orders
-- ============================================================
DROP POLICY IF EXISTS "Owners and managers can delete upsell orders" ON public.upsell_orders;
DROP POLICY IF EXISTS "Staff can insert upsell orders for their hotel" ON public.upsell_orders;
DROP POLICY IF EXISTS "Staff can update upsell orders for their hotel" ON public.upsell_orders;
DROP POLICY IF EXISTS "Staff can view upsell orders for their hotel" ON public.upsell_orders;

CREATE POLICY "Staff can view upsell orders for their hotel"
  ON public.upsell_orders FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.staff_members sm
      WHERE sm.user_id = (SELECT auth.uid())
        AND sm.hotel_id = hotel_id
    )
  );

CREATE POLICY "Staff can insert upsell orders for their hotel"
  ON public.upsell_orders FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.staff_members sm
      WHERE sm.user_id = (SELECT auth.uid())
        AND sm.hotel_id = hotel_id
    )
  );

CREATE POLICY "Staff can update upsell orders for their hotel"
  ON public.upsell_orders FOR UPDATE TO authenticated
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

CREATE POLICY "Owners and managers can delete upsell orders"
  ON public.upsell_orders FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.staff_members sm
      WHERE sm.user_id = (SELECT auth.uid())
        AND sm.hotel_id = hotel_id
        AND sm.role IN ('owner','manager','admin')
    )
  );

-- ============================================================
-- channels  (also fixes duplicate policies)
-- ============================================================
DROP POLICY IF EXISTS "Staff can insert channels" ON public.channels;
DROP POLICY IF EXISTS "Staff can view channels" ON public.channels;
DROP POLICY IF EXISTS "Staff can update channels" ON public.channels;
DROP POLICY IF EXISTS "Staff can insert hotel channels" ON public.channels;
DROP POLICY IF EXISTS "Staff can view hotel channels" ON public.channels;
DROP POLICY IF EXISTS "Staff can update hotel channels" ON public.channels;

CREATE POLICY "Staff can view hotel channels"
  ON public.channels FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.staff_members sm
      WHERE sm.user_id = (SELECT auth.uid())
        AND sm.hotel_id = hotel_id
    )
  );

CREATE POLICY "Staff can insert hotel channels"
  ON public.channels FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.staff_members sm
      WHERE sm.user_id = (SELECT auth.uid())
        AND sm.hotel_id = hotel_id
    )
  );

CREATE POLICY "Staff can update hotel channels"
  ON public.channels FOR UPDATE TO authenticated
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
-- user_hotel_assignments
-- ============================================================
DROP POLICY IF EXISTS "Super admins can delete assignments" ON public.user_hotel_assignments;
DROP POLICY IF EXISTS "Super admins can insert assignments" ON public.user_hotel_assignments;
DROP POLICY IF EXISTS "Super admins can update assignments" ON public.user_hotel_assignments;
DROP POLICY IF EXISTS "Users can view their own assignments" ON public.user_hotel_assignments;

CREATE POLICY "Users can view their own assignments"
  ON public.user_hotel_assignments FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Super admins can insert assignments"
  ON public.user_hotel_assignments FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.staff_members sm
      WHERE sm.user_id = (SELECT auth.uid())
        AND sm.role = 'superadmin'
    )
  );

CREATE POLICY "Super admins can update assignments"
  ON public.user_hotel_assignments FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.staff_members sm
      WHERE sm.user_id = (SELECT auth.uid())
        AND sm.role = 'superadmin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.staff_members sm
      WHERE sm.user_id = (SELECT auth.uid())
        AND sm.role = 'superadmin'
    )
  );

CREATE POLICY "Super admins can delete assignments"
  ON public.user_hotel_assignments FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.staff_members sm
      WHERE sm.user_id = (SELECT auth.uid())
        AND sm.role = 'superadmin'
    )
  );
