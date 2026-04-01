/*
  # Fix infinite recursion in all RLS policies

  ## Problem
  All policies written in the previous migration used a subquery alias `sm` that
  shadowed the outer table's `hotel_id` column, resulting in `sm.hotel_id = sm.hotel_id`
  (always true, causes infinite recursion on staff_members).

  ## Solution
  Replace every affected policy with calls to the SECURITY DEFINER helper functions
  `is_hotel_staff(hotel_id)` and `is_hotel_admin(hotel_id)`, which query staff_members
  directly without going through RLS, breaking the recursion.
*/

-- ============================================================
-- ai_price_suggestions
-- ============================================================
DROP POLICY IF EXISTS "Staff can view AI suggestions for their hotel" ON public.ai_price_suggestions;
DROP POLICY IF EXISTS "Owners and managers can insert AI suggestions" ON public.ai_price_suggestions;
DROP POLICY IF EXISTS "Owners and managers can update AI suggestions" ON public.ai_price_suggestions;
DROP POLICY IF EXISTS "Owners and managers can delete AI suggestions" ON public.ai_price_suggestions;

CREATE POLICY "Staff can view AI suggestions for their hotel" ON public.ai_price_suggestions FOR SELECT TO authenticated USING (is_hotel_staff(hotel_id));
CREATE POLICY "Owners and managers can insert AI suggestions" ON public.ai_price_suggestions FOR INSERT TO authenticated WITH CHECK (is_hotel_admin(hotel_id));
CREATE POLICY "Owners and managers can update AI suggestions" ON public.ai_price_suggestions FOR UPDATE TO authenticated USING (is_hotel_admin(hotel_id)) WITH CHECK (is_hotel_admin(hotel_id));
CREATE POLICY "Owners and managers can delete AI suggestions" ON public.ai_price_suggestions FOR DELETE TO authenticated USING (is_hotel_admin(hotel_id));

-- ============================================================
-- booking_com_room_mappings
-- ============================================================
DROP POLICY IF EXISTS "Staff can view room mappings" ON public.booking_com_room_mappings;
DROP POLICY IF EXISTS "Admin staff can insert room mappings" ON public.booking_com_room_mappings;
DROP POLICY IF EXISTS "Admin staff can update room mappings" ON public.booking_com_room_mappings;

CREATE POLICY "Staff can view room mappings" ON public.booking_com_room_mappings FOR SELECT TO authenticated USING (is_hotel_staff(hotel_id));
CREATE POLICY "Admin staff can insert room mappings" ON public.booking_com_room_mappings FOR INSERT TO authenticated WITH CHECK (is_hotel_admin(hotel_id));
CREATE POLICY "Admin staff can update room mappings" ON public.booking_com_room_mappings FOR UPDATE TO authenticated USING (is_hotel_admin(hotel_id)) WITH CHECK (is_hotel_admin(hotel_id));

-- ============================================================
-- booking_com_settings
-- ============================================================
DROP POLICY IF EXISTS "Staff can view their hotel booking.com settings" ON public.booking_com_settings;
DROP POLICY IF EXISTS "Admin staff can insert booking.com settings" ON public.booking_com_settings;
DROP POLICY IF EXISTS "Admin staff can update booking.com settings" ON public.booking_com_settings;

CREATE POLICY "Staff can view their hotel booking.com settings" ON public.booking_com_settings FOR SELECT TO authenticated USING (is_hotel_staff(hotel_id));
CREATE POLICY "Admin staff can insert booking.com settings" ON public.booking_com_settings FOR INSERT TO authenticated WITH CHECK (is_hotel_admin(hotel_id));
CREATE POLICY "Admin staff can update booking.com settings" ON public.booking_com_settings FOR UPDATE TO authenticated USING (is_hotel_admin(hotel_id)) WITH CHECK (is_hotel_admin(hotel_id));

-- ============================================================
-- booking_com_sync_logs
-- ============================================================
DROP POLICY IF EXISTS "Staff can view their hotel sync logs" ON public.booking_com_sync_logs;
DROP POLICY IF EXISTS "Admin staff can insert sync logs" ON public.booking_com_sync_logs;

CREATE POLICY "Staff can view their hotel sync logs" ON public.booking_com_sync_logs FOR SELECT TO authenticated USING (is_hotel_staff(hotel_id));
CREATE POLICY "Admin staff can insert sync logs" ON public.booking_com_sync_logs FOR INSERT TO authenticated WITH CHECK (is_hotel_admin(hotel_id));

-- ============================================================
-- booking_engine_config
-- ============================================================
DROP POLICY IF EXISTS "Staff can insert booking engine config" ON public.booking_engine_config;
DROP POLICY IF EXISTS "Staff can update booking engine config" ON public.booking_engine_config;

CREATE POLICY "Staff can insert booking engine config" ON public.booking_engine_config FOR INSERT TO authenticated WITH CHECK (is_hotel_admin(hotel_id));
CREATE POLICY "Staff can update booking engine config" ON public.booking_engine_config FOR UPDATE TO authenticated USING (is_hotel_admin(hotel_id)) WITH CHECK (is_hotel_admin(hotel_id));

-- ============================================================
-- channel_sync_logs
-- ============================================================
DROP POLICY IF EXISTS "Staff can view channel sync logs" ON public.channel_sync_logs;
DROP POLICY IF EXISTS "Staff can insert channel sync logs" ON public.channel_sync_logs;

CREATE POLICY "Staff can view channel sync logs" ON public.channel_sync_logs FOR SELECT TO authenticated USING (is_hotel_staff(hotel_id));
CREATE POLICY "Staff can insert channel sync logs" ON public.channel_sync_logs FOR INSERT TO authenticated WITH CHECK (is_hotel_staff(hotel_id));

-- ============================================================
-- channels
-- ============================================================
DROP POLICY IF EXISTS "Staff can view hotel channels" ON public.channels;
DROP POLICY IF EXISTS "Staff can insert hotel channels" ON public.channels;
DROP POLICY IF EXISTS "Staff can update hotel channels" ON public.channels;

CREATE POLICY "Staff can view hotel channels" ON public.channels FOR SELECT TO authenticated USING (is_hotel_staff(hotel_id));
CREATE POLICY "Staff can insert hotel channels" ON public.channels FOR INSERT TO authenticated WITH CHECK (is_hotel_staff(hotel_id));
CREATE POLICY "Staff can update hotel channels" ON public.channels FOR UPDATE TO authenticated USING (is_hotel_staff(hotel_id)) WITH CHECK (is_hotel_staff(hotel_id));

-- ============================================================
-- cloudbeds_room_mappings
-- ============================================================
DROP POLICY IF EXISTS "Staff can view cloudbeds room mappings for their hotel" ON public.cloudbeds_room_mappings;
DROP POLICY IF EXISTS "Admins and managers can insert cloudbeds room mappings" ON public.cloudbeds_room_mappings;
DROP POLICY IF EXISTS "Admins and managers can update cloudbeds room mappings" ON public.cloudbeds_room_mappings;

CREATE POLICY "Staff can view cloudbeds room mappings for their hotel" ON public.cloudbeds_room_mappings FOR SELECT TO authenticated USING (is_hotel_staff(hotel_id));
CREATE POLICY "Admins and managers can insert cloudbeds room mappings" ON public.cloudbeds_room_mappings FOR INSERT TO authenticated WITH CHECK (is_hotel_admin(hotel_id));
CREATE POLICY "Admins and managers can update cloudbeds room mappings" ON public.cloudbeds_room_mappings FOR UPDATE TO authenticated USING (is_hotel_admin(hotel_id)) WITH CHECK (is_hotel_admin(hotel_id));

-- ============================================================
-- cloudbeds_settings
-- ============================================================
DROP POLICY IF EXISTS "Staff can view cloudbeds settings for their hotel" ON public.cloudbeds_settings;
DROP POLICY IF EXISTS "Admins and managers can insert cloudbeds settings" ON public.cloudbeds_settings;
DROP POLICY IF EXISTS "Admins and managers can update cloudbeds settings" ON public.cloudbeds_settings;

CREATE POLICY "Staff can view cloudbeds settings for their hotel" ON public.cloudbeds_settings FOR SELECT TO authenticated USING (is_hotel_staff(hotel_id));
CREATE POLICY "Admins and managers can insert cloudbeds settings" ON public.cloudbeds_settings FOR INSERT TO authenticated WITH CHECK (is_hotel_admin(hotel_id));
CREATE POLICY "Admins and managers can update cloudbeds settings" ON public.cloudbeds_settings FOR UPDATE TO authenticated USING (is_hotel_admin(hotel_id)) WITH CHECK (is_hotel_admin(hotel_id));

-- ============================================================
-- cloudbeds_sync_logs
-- ============================================================
DROP POLICY IF EXISTS "Staff can view cloudbeds sync logs for their hotel" ON public.cloudbeds_sync_logs;
DROP POLICY IF EXISTS "Admins and managers can insert cloudbeds sync logs" ON public.cloudbeds_sync_logs;
DROP POLICY IF EXISTS "Admins and managers can update cloudbeds sync logs" ON public.cloudbeds_sync_logs;

CREATE POLICY "Staff can view cloudbeds sync logs for their hotel" ON public.cloudbeds_sync_logs FOR SELECT TO authenticated USING (is_hotel_staff(hotel_id));
CREATE POLICY "Admins and managers can insert cloudbeds sync logs" ON public.cloudbeds_sync_logs FOR INSERT TO authenticated WITH CHECK (is_hotel_admin(hotel_id));
CREATE POLICY "Admins and managers can update cloudbeds sync logs" ON public.cloudbeds_sync_logs FOR UPDATE TO authenticated USING (is_hotel_admin(hotel_id)) WITH CHECK (is_hotel_admin(hotel_id));

-- ============================================================
-- competitor_rates
-- ============================================================
DROP POLICY IF EXISTS "Staff can view competitor rates for their hotel" ON public.competitor_rates;
DROP POLICY IF EXISTS "Owners and managers can insert competitor rates" ON public.competitor_rates;
DROP POLICY IF EXISTS "Owners and managers can delete competitor rates" ON public.competitor_rates;

CREATE POLICY "Staff can view competitor rates for their hotel" ON public.competitor_rates FOR SELECT TO authenticated USING (is_hotel_staff(hotel_id));
CREATE POLICY "Owners and managers can insert competitor rates" ON public.competitor_rates FOR INSERT TO authenticated WITH CHECK (is_hotel_admin(hotel_id));
CREATE POLICY "Owners and managers can delete competitor rates" ON public.competitor_rates FOR DELETE TO authenticated USING (is_hotel_admin(hotel_id));

-- ============================================================
-- expedia_room_mappings
-- ============================================================
DROP POLICY IF EXISTS "Staff can view expedia room mappings" ON public.expedia_room_mappings;
DROP POLICY IF EXISTS "Admin staff can insert expedia room mappings" ON public.expedia_room_mappings;
DROP POLICY IF EXISTS "Admin staff can update expedia room mappings" ON public.expedia_room_mappings;

CREATE POLICY "Staff can view expedia room mappings" ON public.expedia_room_mappings FOR SELECT TO authenticated USING (is_hotel_staff(hotel_id));
CREATE POLICY "Admin staff can insert expedia room mappings" ON public.expedia_room_mappings FOR INSERT TO authenticated WITH CHECK (is_hotel_admin(hotel_id));
CREATE POLICY "Admin staff can update expedia room mappings" ON public.expedia_room_mappings FOR UPDATE TO authenticated USING (is_hotel_admin(hotel_id)) WITH CHECK (is_hotel_admin(hotel_id));

-- ============================================================
-- expedia_settings
-- ============================================================
DROP POLICY IF EXISTS "Staff can view expedia settings" ON public.expedia_settings;
DROP POLICY IF EXISTS "Admin staff can insert expedia settings" ON public.expedia_settings;
DROP POLICY IF EXISTS "Admin staff can update expedia settings" ON public.expedia_settings;

CREATE POLICY "Staff can view expedia settings" ON public.expedia_settings FOR SELECT TO authenticated USING (is_hotel_staff(hotel_id));
CREATE POLICY "Admin staff can insert expedia settings" ON public.expedia_settings FOR INSERT TO authenticated WITH CHECK (is_hotel_admin(hotel_id));
CREATE POLICY "Admin staff can update expedia settings" ON public.expedia_settings FOR UPDATE TO authenticated USING (is_hotel_admin(hotel_id)) WITH CHECK (is_hotel_admin(hotel_id));

-- ============================================================
-- expedia_sync_logs
-- ============================================================
DROP POLICY IF EXISTS "Staff can view expedia sync logs" ON public.expedia_sync_logs;
DROP POLICY IF EXISTS "Admin staff can insert expedia sync logs" ON public.expedia_sync_logs;

CREATE POLICY "Staff can view expedia sync logs" ON public.expedia_sync_logs FOR SELECT TO authenticated USING (is_hotel_staff(hotel_id));
CREATE POLICY "Admin staff can insert expedia sync logs" ON public.expedia_sync_logs FOR INSERT TO authenticated WITH CHECK (is_hotel_admin(hotel_id));

-- ============================================================
-- guest_communications
-- ============================================================
DROP POLICY IF EXISTS "Authenticated users can insert guest communications" ON public.guest_communications;
DROP POLICY IF EXISTS "Authenticated users can update guest communications" ON public.guest_communications;
DROP POLICY IF EXISTS "Authenticated users can delete guest communications" ON public.guest_communications;

CREATE POLICY "Authenticated users can insert guest communications" ON public.guest_communications FOR INSERT TO authenticated WITH CHECK (is_hotel_staff(hotel_id));
CREATE POLICY "Authenticated users can update guest communications" ON public.guest_communications FOR UPDATE TO authenticated USING (is_hotel_staff(hotel_id)) WITH CHECK (is_hotel_staff(hotel_id));
CREATE POLICY "Authenticated users can delete guest communications" ON public.guest_communications FOR DELETE TO authenticated USING (is_hotel_admin(hotel_id));

-- ============================================================
-- guest_documents
-- ============================================================
DROP POLICY IF EXISTS "Authenticated users can manage guest documents" ON public.guest_documents;

CREATE POLICY "Authenticated users can manage guest documents" ON public.guest_documents FOR ALL TO authenticated USING (is_hotel_staff(hotel_id)) WITH CHECK (is_hotel_staff(hotel_id));

-- ============================================================
-- guest_portal_sessions
-- ============================================================
DROP POLICY IF EXISTS "Authenticated users can manage portal sessions" ON public.guest_portal_sessions;

CREATE POLICY "Authenticated users can manage portal sessions" ON public.guest_portal_sessions FOR ALL TO authenticated USING (is_hotel_staff(hotel_id)) WITH CHECK (is_hotel_staff(hotel_id));

-- ============================================================
-- guest_profiles
-- ============================================================
DROP POLICY IF EXISTS "Authenticated users can insert guest profiles" ON public.guest_profiles;
DROP POLICY IF EXISTS "Authenticated users can update guest profiles" ON public.guest_profiles;
DROP POLICY IF EXISTS "Authenticated users can delete guest profiles" ON public.guest_profiles;

CREATE POLICY "Authenticated users can insert guest profiles" ON public.guest_profiles FOR INSERT TO authenticated WITH CHECK (is_hotel_staff(hotel_id));
CREATE POLICY "Authenticated users can update guest profiles" ON public.guest_profiles FOR UPDATE TO authenticated USING (is_hotel_staff(hotel_id)) WITH CHECK (is_hotel_staff(hotel_id));
CREATE POLICY "Authenticated users can delete guest profiles" ON public.guest_profiles FOR DELETE TO authenticated USING (is_hotel_admin(hotel_id));

-- ============================================================
-- guest_stay_history
-- ============================================================
DROP POLICY IF EXISTS "Authenticated users can insert stay history" ON public.guest_stay_history;
DROP POLICY IF EXISTS "Authenticated users can update stay history" ON public.guest_stay_history;
DROP POLICY IF EXISTS "Authenticated users can delete stay history" ON public.guest_stay_history;

CREATE POLICY "Authenticated users can insert stay history" ON public.guest_stay_history FOR INSERT TO authenticated WITH CHECK (is_hotel_staff(hotel_id));
CREATE POLICY "Authenticated users can update stay history" ON public.guest_stay_history FOR UPDATE TO authenticated USING (is_hotel_staff(hotel_id)) WITH CHECK (is_hotel_staff(hotel_id));
CREATE POLICY "Authenticated users can delete stay history" ON public.guest_stay_history FOR DELETE TO authenticated USING (is_hotel_admin(hotel_id));

-- ============================================================
-- housekeeping_staff
-- ============================================================
DROP POLICY IF EXISTS "Authenticated users can insert housekeeping staff" ON public.housekeeping_staff;
DROP POLICY IF EXISTS "Authenticated users can update housekeeping staff" ON public.housekeeping_staff;

CREATE POLICY "Authenticated users can insert housekeeping staff" ON public.housekeeping_staff FOR INSERT TO authenticated WITH CHECK (is_hotel_admin(hotel_id));
CREATE POLICY "Authenticated users can update housekeeping staff" ON public.housekeeping_staff FOR UPDATE TO authenticated USING (is_hotel_admin(hotel_id)) WITH CHECK (is_hotel_admin(hotel_id));

-- ============================================================
-- invoice_line_items
-- ============================================================
DROP POLICY IF EXISTS "Authenticated users can manage invoice line items" ON public.invoice_line_items;

CREATE POLICY "Authenticated users can manage invoice line items" ON public.invoice_line_items FOR ALL TO authenticated USING (is_hotel_staff(hotel_id)) WITH CHECK (is_hotel_staff(hotel_id));

-- ============================================================
-- invoice_settings
-- ============================================================
DROP POLICY IF EXISTS "Authenticated users can manage invoice settings" ON public.invoice_settings;

CREATE POLICY "Authenticated users can manage invoice settings" ON public.invoice_settings FOR ALL TO authenticated USING (is_hotel_staff(hotel_id)) WITH CHECK (is_hotel_staff(hotel_id));

-- ============================================================
-- invoices
-- ============================================================
DROP POLICY IF EXISTS "Staff can view invoices" ON public.invoices;
DROP POLICY IF EXISTS "Staff can insert invoices" ON public.invoices;
DROP POLICY IF EXISTS "Staff can update invoices" ON public.invoices;
DROP POLICY IF EXISTS "Staff can delete invoices" ON public.invoices;

CREATE POLICY "Staff can view invoices" ON public.invoices FOR SELECT TO authenticated USING (is_hotel_staff(hotel_id));
CREATE POLICY "Staff can insert invoices" ON public.invoices FOR INSERT TO authenticated WITH CHECK (is_hotel_staff(hotel_id));
CREATE POLICY "Staff can update invoices" ON public.invoices FOR UPDATE TO authenticated USING (is_hotel_staff(hotel_id)) WITH CHECK (is_hotel_staff(hotel_id));
CREATE POLICY "Staff can delete invoices" ON public.invoices FOR DELETE TO authenticated USING (is_hotel_admin(hotel_id));

-- ============================================================
-- invoices_v2
-- ============================================================
DROP POLICY IF EXISTS "Staff can view invoices_v2" ON public.invoices_v2;
DROP POLICY IF EXISTS "Staff can insert invoices_v2" ON public.invoices_v2;
DROP POLICY IF EXISTS "Staff can update invoices_v2" ON public.invoices_v2;
DROP POLICY IF EXISTS "Staff can delete invoices_v2" ON public.invoices_v2;

CREATE POLICY "Staff can view invoices_v2" ON public.invoices_v2 FOR SELECT TO authenticated USING (is_hotel_staff(hotel_id));
CREATE POLICY "Staff can insert invoices_v2" ON public.invoices_v2 FOR INSERT TO authenticated WITH CHECK (is_hotel_staff(hotel_id));
CREATE POLICY "Staff can update invoices_v2" ON public.invoices_v2 FOR UPDATE TO authenticated USING (is_hotel_staff(hotel_id)) WITH CHECK (is_hotel_staff(hotel_id));
CREATE POLICY "Staff can delete invoices_v2" ON public.invoices_v2 FOR DELETE TO authenticated USING (is_hotel_admin(hotel_id));

-- ============================================================
-- lodgify_room_mappings
-- ============================================================
DROP POLICY IF EXISTS "Staff can view lodgify room mappings for their hotel" ON public.lodgify_room_mappings;
DROP POLICY IF EXISTS "Admins and managers can insert lodgify room mappings" ON public.lodgify_room_mappings;
DROP POLICY IF EXISTS "Admins and managers can update lodgify room mappings" ON public.lodgify_room_mappings;

CREATE POLICY "Staff can view lodgify room mappings for their hotel" ON public.lodgify_room_mappings FOR SELECT TO authenticated USING (is_hotel_staff(hotel_id));
CREATE POLICY "Admins and managers can insert lodgify room mappings" ON public.lodgify_room_mappings FOR INSERT TO authenticated WITH CHECK (is_hotel_admin(hotel_id));
CREATE POLICY "Admins and managers can update lodgify room mappings" ON public.lodgify_room_mappings FOR UPDATE TO authenticated USING (is_hotel_admin(hotel_id)) WITH CHECK (is_hotel_admin(hotel_id));

-- ============================================================
-- lodgify_settings
-- ============================================================
DROP POLICY IF EXISTS "Staff can view lodgify settings for their hotel" ON public.lodgify_settings;
DROP POLICY IF EXISTS "Admins and managers can insert lodgify settings" ON public.lodgify_settings;
DROP POLICY IF EXISTS "Admins and managers can update lodgify settings" ON public.lodgify_settings;

CREATE POLICY "Staff can view lodgify settings for their hotel" ON public.lodgify_settings FOR SELECT TO authenticated USING (is_hotel_staff(hotel_id));
CREATE POLICY "Admins and managers can insert lodgify settings" ON public.lodgify_settings FOR INSERT TO authenticated WITH CHECK (is_hotel_admin(hotel_id));
CREATE POLICY "Admins and managers can update lodgify settings" ON public.lodgify_settings FOR UPDATE TO authenticated USING (is_hotel_admin(hotel_id)) WITH CHECK (is_hotel_admin(hotel_id));

-- ============================================================
-- lodgify_sync_logs
-- ============================================================
DROP POLICY IF EXISTS "Staff can view lodgify sync logs for their hotel" ON public.lodgify_sync_logs;
DROP POLICY IF EXISTS "Admins and managers can insert lodgify sync logs" ON public.lodgify_sync_logs;
DROP POLICY IF EXISTS "Admins and managers can update lodgify sync logs" ON public.lodgify_sync_logs;

CREATE POLICY "Staff can view lodgify sync logs for their hotel" ON public.lodgify_sync_logs FOR SELECT TO authenticated USING (is_hotel_staff(hotel_id));
CREATE POLICY "Admins and managers can insert lodgify sync logs" ON public.lodgify_sync_logs FOR INSERT TO authenticated WITH CHECK (is_hotel_admin(hotel_id));
CREATE POLICY "Admins and managers can update lodgify sync logs" ON public.lodgify_sync_logs FOR UPDATE TO authenticated USING (is_hotel_admin(hotel_id)) WITH CHECK (is_hotel_admin(hotel_id));

-- ============================================================
-- maintenance_issues
-- ============================================================
DROP POLICY IF EXISTS "Authenticated users can insert maintenance issues" ON public.maintenance_issues;
DROP POLICY IF EXISTS "Authenticated users can update maintenance issues" ON public.maintenance_issues;

CREATE POLICY "Authenticated users can insert maintenance issues" ON public.maintenance_issues FOR INSERT TO authenticated WITH CHECK (is_hotel_staff(hotel_id));
CREATE POLICY "Authenticated users can update maintenance issues" ON public.maintenance_issues FOR UPDATE TO authenticated USING (is_hotel_staff(hotel_id)) WITH CHECK (is_hotel_staff(hotel_id));

-- ============================================================
-- owner_properties
-- ============================================================
DROP POLICY IF EXISTS "Staff can view owner properties for their hotel" ON public.owner_properties;
DROP POLICY IF EXISTS "Owners and managers can insert owner properties" ON public.owner_properties;
DROP POLICY IF EXISTS "Owners and managers can update owner properties" ON public.owner_properties;
DROP POLICY IF EXISTS "Hotel owners can delete owner properties" ON public.owner_properties;

CREATE POLICY "Staff can view owner properties for their hotel" ON public.owner_properties FOR SELECT TO authenticated USING (is_hotel_staff(hotel_id));
CREATE POLICY "Owners and managers can insert owner properties" ON public.owner_properties FOR INSERT TO authenticated WITH CHECK (is_hotel_admin(hotel_id));
CREATE POLICY "Owners and managers can update owner properties" ON public.owner_properties FOR UPDATE TO authenticated USING (is_hotel_admin(hotel_id)) WITH CHECK (is_hotel_admin(hotel_id));
CREATE POLICY "Hotel owners can delete owner properties" ON public.owner_properties FOR DELETE TO authenticated USING (is_hotel_admin(hotel_id));

-- ============================================================
-- owner_statements
-- ============================================================
DROP POLICY IF EXISTS "Staff can view statements for their hotel" ON public.owner_statements;
DROP POLICY IF EXISTS "Owners and managers can insert statements" ON public.owner_statements;
DROP POLICY IF EXISTS "Owners and managers can update statements" ON public.owner_statements;
DROP POLICY IF EXISTS "Hotel owners can delete statements" ON public.owner_statements;

CREATE POLICY "Staff can view statements for their hotel" ON public.owner_statements FOR SELECT TO authenticated USING (is_hotel_staff(hotel_id));
CREATE POLICY "Owners and managers can insert statements" ON public.owner_statements FOR INSERT TO authenticated WITH CHECK (is_hotel_admin(hotel_id));
CREATE POLICY "Owners and managers can update statements" ON public.owner_statements FOR UPDATE TO authenticated USING (is_hotel_admin(hotel_id)) WITH CHECK (is_hotel_admin(hotel_id));
CREATE POLICY "Hotel owners can delete statements" ON public.owner_statements FOR DELETE TO authenticated USING (is_hotel_admin(hotel_id));

-- ============================================================
-- payments
-- ============================================================
DROP POLICY IF EXISTS "Staff can view payments" ON public.payments;
DROP POLICY IF EXISTS "Staff can insert payments" ON public.payments;
DROP POLICY IF EXISTS "Staff can update payments" ON public.payments;

CREATE POLICY "Staff can view payments" ON public.payments FOR SELECT TO authenticated USING (is_hotel_staff(hotel_id));
CREATE POLICY "Staff can insert payments" ON public.payments FOR INSERT TO authenticated WITH CHECK (is_hotel_staff(hotel_id));
CREATE POLICY "Staff can update payments" ON public.payments FOR UPDATE TO authenticated USING (is_hotel_staff(hotel_id)) WITH CHECK (is_hotel_staff(hotel_id));

-- ============================================================
-- pre_arrival_forms
-- ============================================================
DROP POLICY IF EXISTS "Authenticated users can manage pre arrival forms" ON public.pre_arrival_forms;

CREATE POLICY "Authenticated users can manage pre arrival forms" ON public.pre_arrival_forms FOR ALL TO authenticated USING (is_hotel_staff(hotel_id)) WITH CHECK (is_hotel_staff(hotel_id));

-- ============================================================
-- pricing_rules
-- ============================================================
DROP POLICY IF EXISTS "Staff can view pricing rules for their hotel" ON public.pricing_rules;
DROP POLICY IF EXISTS "Owners and managers can insert pricing rules" ON public.pricing_rules;
DROP POLICY IF EXISTS "Owners and managers can update pricing rules" ON public.pricing_rules;
DROP POLICY IF EXISTS "Owners and managers can delete pricing rules" ON public.pricing_rules;

CREATE POLICY "Staff can view pricing rules for their hotel" ON public.pricing_rules FOR SELECT TO authenticated USING (is_hotel_staff(hotel_id));
CREATE POLICY "Owners and managers can insert pricing rules" ON public.pricing_rules FOR INSERT TO authenticated WITH CHECK (is_hotel_admin(hotel_id));
CREATE POLICY "Owners and managers can update pricing rules" ON public.pricing_rules FOR UPDATE TO authenticated USING (is_hotel_admin(hotel_id)) WITH CHECK (is_hotel_admin(hotel_id));
CREATE POLICY "Owners and managers can delete pricing rules" ON public.pricing_rules FOR DELETE TO authenticated USING (is_hotel_admin(hotel_id));

-- ============================================================
-- property_owners
-- ============================================================
DROP POLICY IF EXISTS "Staff can view property owners for their hotel" ON public.property_owners;
DROP POLICY IF EXISTS "Staff owners and managers can insert property owners" ON public.property_owners;
DROP POLICY IF EXISTS "Staff owners and managers can update property owners" ON public.property_owners;
DROP POLICY IF EXISTS "Hotel owners can delete property owners" ON public.property_owners;

CREATE POLICY "Staff can view property owners for their hotel" ON public.property_owners FOR SELECT TO authenticated USING (is_hotel_staff(hotel_id));
CREATE POLICY "Staff owners and managers can insert property owners" ON public.property_owners FOR INSERT TO authenticated WITH CHECK (is_hotel_admin(hotel_id));
CREATE POLICY "Staff owners and managers can update property owners" ON public.property_owners FOR UPDATE TO authenticated USING (is_hotel_admin(hotel_id)) WITH CHECK (is_hotel_admin(hotel_id));
CREATE POLICY "Hotel owners can delete property owners" ON public.property_owners FOR DELETE TO authenticated USING (is_hotel_admin(hotel_id));

-- ============================================================
-- role_permissions
-- ============================================================
DROP POLICY IF EXISTS "Staff can view permissions for their hotel" ON public.role_permissions;
DROP POLICY IF EXISTS "Owners and managers can insert permissions" ON public.role_permissions;
DROP POLICY IF EXISTS "Owners and managers can update permissions" ON public.role_permissions;
DROP POLICY IF EXISTS "Owners can delete permissions" ON public.role_permissions;

CREATE POLICY "Staff can view permissions for their hotel" ON public.role_permissions FOR SELECT TO authenticated USING (is_hotel_staff(hotel_id));
CREATE POLICY "Owners and managers can insert permissions" ON public.role_permissions FOR INSERT TO authenticated WITH CHECK (is_hotel_admin(hotel_id));
CREATE POLICY "Owners and managers can update permissions" ON public.role_permissions FOR UPDATE TO authenticated USING (is_hotel_admin(hotel_id)) WITH CHECK (is_hotel_admin(hotel_id));
CREATE POLICY "Owners can delete permissions" ON public.role_permissions FOR DELETE TO authenticated USING (is_hotel_admin(hotel_id));

-- ============================================================
-- room_types
-- ============================================================
DROP POLICY IF EXISTS "Staff can insert room types" ON public.room_types;
DROP POLICY IF EXISTS "Staff can update room types" ON public.room_types;
DROP POLICY IF EXISTS "Staff can delete room types" ON public.room_types;

CREATE POLICY "Staff can insert room types" ON public.room_types FOR INSERT TO authenticated WITH CHECK (is_hotel_admin(hotel_id));
CREATE POLICY "Staff can update room types" ON public.room_types FOR UPDATE TO authenticated USING (is_hotel_admin(hotel_id)) WITH CHECK (is_hotel_admin(hotel_id));
CREATE POLICY "Staff can delete room types" ON public.room_types FOR DELETE TO authenticated USING (is_hotel_admin(hotel_id));

-- ============================================================
-- rooms
-- ============================================================
DROP POLICY IF EXISTS "Staff can insert rooms" ON public.rooms;
DROP POLICY IF EXISTS "Staff can delete rooms" ON public.rooms;

CREATE POLICY "Staff can insert rooms" ON public.rooms FOR INSERT TO authenticated WITH CHECK (is_hotel_admin(hotel_id));
CREATE POLICY "Staff can delete rooms" ON public.rooms FOR DELETE TO authenticated USING (is_hotel_admin(hotel_id));

-- ============================================================
-- siteminder_room_mappings
-- ============================================================
DROP POLICY IF EXISTS "Staff can view siteminder room mappings for their hotel" ON public.siteminder_room_mappings;
DROP POLICY IF EXISTS "Admins and managers can insert siteminder room mappings" ON public.siteminder_room_mappings;
DROP POLICY IF EXISTS "Admins and managers can update siteminder room mappings" ON public.siteminder_room_mappings;

CREATE POLICY "Staff can view siteminder room mappings for their hotel" ON public.siteminder_room_mappings FOR SELECT TO authenticated USING (is_hotel_staff(hotel_id));
CREATE POLICY "Admins and managers can insert siteminder room mappings" ON public.siteminder_room_mappings FOR INSERT TO authenticated WITH CHECK (is_hotel_admin(hotel_id));
CREATE POLICY "Admins and managers can update siteminder room mappings" ON public.siteminder_room_mappings FOR UPDATE TO authenticated USING (is_hotel_admin(hotel_id)) WITH CHECK (is_hotel_admin(hotel_id));

-- ============================================================
-- siteminder_settings
-- ============================================================
DROP POLICY IF EXISTS "Staff can view siteminder settings for their hotel" ON public.siteminder_settings;
DROP POLICY IF EXISTS "Admins and managers can insert siteminder settings" ON public.siteminder_settings;
DROP POLICY IF EXISTS "Admins and managers can update siteminder settings" ON public.siteminder_settings;

CREATE POLICY "Staff can view siteminder settings for their hotel" ON public.siteminder_settings FOR SELECT TO authenticated USING (is_hotel_staff(hotel_id));
CREATE POLICY "Admins and managers can insert siteminder settings" ON public.siteminder_settings FOR INSERT TO authenticated WITH CHECK (is_hotel_admin(hotel_id));
CREATE POLICY "Admins and managers can update siteminder settings" ON public.siteminder_settings FOR UPDATE TO authenticated USING (is_hotel_admin(hotel_id)) WITH CHECK (is_hotel_admin(hotel_id));

-- ============================================================
-- siteminder_sync_logs
-- ============================================================
DROP POLICY IF EXISTS "Staff can view siteminder sync logs for their hotel" ON public.siteminder_sync_logs;
DROP POLICY IF EXISTS "Admins and managers can insert siteminder sync logs" ON public.siteminder_sync_logs;
DROP POLICY IF EXISTS "Admins and managers can update siteminder sync logs" ON public.siteminder_sync_logs;

CREATE POLICY "Staff can view siteminder sync logs for their hotel" ON public.siteminder_sync_logs FOR SELECT TO authenticated USING (is_hotel_staff(hotel_id));
CREATE POLICY "Admins and managers can insert siteminder sync logs" ON public.siteminder_sync_logs FOR INSERT TO authenticated WITH CHECK (is_hotel_admin(hotel_id));
CREATE POLICY "Admins and managers can update siteminder sync logs" ON public.siteminder_sync_logs FOR UPDATE TO authenticated USING (is_hotel_admin(hotel_id)) WITH CHECK (is_hotel_admin(hotel_id));

-- ============================================================
-- upsell_items
-- ============================================================
DROP POLICY IF EXISTS "Staff can view upsell items for their hotel" ON public.upsell_items;
DROP POLICY IF EXISTS "Owners and managers can insert upsell items" ON public.upsell_items;
DROP POLICY IF EXISTS "Owners and managers can update upsell items" ON public.upsell_items;
DROP POLICY IF EXISTS "Owners and managers can delete upsell items" ON public.upsell_items;

CREATE POLICY "Staff can view upsell items for their hotel" ON public.upsell_items FOR SELECT TO authenticated USING (is_hotel_staff(hotel_id));
CREATE POLICY "Owners and managers can insert upsell items" ON public.upsell_items FOR INSERT TO authenticated WITH CHECK (is_hotel_admin(hotel_id));
CREATE POLICY "Owners and managers can update upsell items" ON public.upsell_items FOR UPDATE TO authenticated USING (is_hotel_admin(hotel_id)) WITH CHECK (is_hotel_admin(hotel_id));
CREATE POLICY "Owners and managers can delete upsell items" ON public.upsell_items FOR DELETE TO authenticated USING (is_hotel_admin(hotel_id));

-- ============================================================
-- upsell_orders
-- ============================================================
DROP POLICY IF EXISTS "Staff can view upsell orders for their hotel" ON public.upsell_orders;
DROP POLICY IF EXISTS "Staff can insert upsell orders for their hotel" ON public.upsell_orders;
DROP POLICY IF EXISTS "Staff can update upsell orders for their hotel" ON public.upsell_orders;
DROP POLICY IF EXISTS "Owners and managers can delete upsell orders" ON public.upsell_orders;

CREATE POLICY "Staff can view upsell orders for their hotel" ON public.upsell_orders FOR SELECT TO authenticated USING (is_hotel_staff(hotel_id));
CREATE POLICY "Staff can insert upsell orders for their hotel" ON public.upsell_orders FOR INSERT TO authenticated WITH CHECK (is_hotel_staff(hotel_id));
CREATE POLICY "Staff can update upsell orders for their hotel" ON public.upsell_orders FOR UPDATE TO authenticated USING (is_hotel_staff(hotel_id)) WITH CHECK (is_hotel_staff(hotel_id));
CREATE POLICY "Owners and managers can delete upsell orders" ON public.upsell_orders FOR DELETE TO authenticated USING (is_hotel_admin(hotel_id));

-- ============================================================
-- Also fix hotels table (same pattern)
-- ============================================================
DROP POLICY IF EXISTS "Staff can view their hotels" ON public.hotels;
DROP POLICY IF EXISTS "Staff admins can update their hotels" ON public.hotels;

CREATE POLICY "Staff can view their hotels" ON public.hotels FOR SELECT TO authenticated USING (is_hotel_staff(id));
CREATE POLICY "Staff admins can update their hotels" ON public.hotels FOR UPDATE TO authenticated USING (is_hotel_admin(id)) WITH CHECK (is_hotel_admin(id));
