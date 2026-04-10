/*
  # Fix ALL RLS policies to use SECURITY DEFINER helpers

  1. Problem
    - Dozens of tables had inline subqueries against staff_members
    - Users with tenant-level access via user_hotel_assignments were blocked
    - Only room_types and rooms were fixed previously

  2. Solution
    - Replace all inline staff_members checks with is_active_staff_at_hotel()
    - Replace admin-level checks with is_admin_staff_at_hotel()
    - These helpers check staff_members, user_hotel_assignments, and super_admin

  3. Affected Tables (28 tables, ~80 policies)
    - activity_log, ai_price_suggestions, booking_engine_config
    - channel_rates, channel_sync_logs, channels
    - competitor_rates, direct_bookings
    - guest_communications, guest_documents, guest_portal_sessions, guests
    - housekeeping_checklist_items, housekeeping_tasks
    - invoice_audit_log, invoice_items, invoice_settings, invoices
    - maintenance_requests
    - owner_properties, owner_statements
    - payment_audit_log, payments
    - pre_arrival_forms, pricing_rules, promo_codes
    - property_owners, reservations
    - upsell_items, upsell_orders
*/

-- ============================================================
-- activity_log
-- ============================================================
DROP POLICY IF EXISTS "Staff can view activity log" ON public.activity_log;
CREATE POLICY "Staff can view activity log"
  ON public.activity_log FOR SELECT TO authenticated
  USING (public.is_active_staff_at_hotel(hotel_id));

DROP POLICY IF EXISTS "Staff can insert activity log" ON public.activity_log;
CREATE POLICY "Staff can insert activity log"
  ON public.activity_log FOR INSERT TO authenticated
  WITH CHECK (public.is_active_staff_at_hotel(hotel_id));

-- ============================================================
-- ai_price_suggestions
-- ============================================================
DROP POLICY IF EXISTS "Staff can view AI suggestions" ON public.ai_price_suggestions;
CREATE POLICY "Staff can view AI suggestions"
  ON public.ai_price_suggestions FOR SELECT TO authenticated
  USING (public.is_active_staff_at_hotel(hotel_id));

DROP POLICY IF EXISTS "Staff can manage AI suggestions" ON public.ai_price_suggestions;
CREATE POLICY "Staff can manage AI suggestions"
  ON public.ai_price_suggestions FOR INSERT TO authenticated
  WITH CHECK (public.is_active_staff_at_hotel(hotel_id));

DROP POLICY IF EXISTS "Staff can update AI suggestions" ON public.ai_price_suggestions;
CREATE POLICY "Staff can update AI suggestions"
  ON public.ai_price_suggestions FOR UPDATE TO authenticated
  USING (public.is_active_staff_at_hotel(hotel_id))
  WITH CHECK (public.is_active_staff_at_hotel(hotel_id));

-- ============================================================
-- booking_engine_config
-- ============================================================
DROP POLICY IF EXISTS "Staff can view booking engine config" ON public.booking_engine_config;
CREATE POLICY "Staff can view booking engine config"
  ON public.booking_engine_config FOR SELECT TO authenticated
  USING (public.is_active_staff_at_hotel(hotel_id));

DROP POLICY IF EXISTS "Staff can insert booking engine config" ON public.booking_engine_config;
CREATE POLICY "Staff can insert booking engine config"
  ON public.booking_engine_config FOR INSERT TO authenticated
  WITH CHECK (public.is_active_staff_at_hotel(hotel_id));

DROP POLICY IF EXISTS "Staff can update booking engine config" ON public.booking_engine_config;
CREATE POLICY "Staff can update booking engine config"
  ON public.booking_engine_config FOR UPDATE TO authenticated
  USING (public.is_active_staff_at_hotel(hotel_id))
  WITH CHECK (public.is_active_staff_at_hotel(hotel_id));

-- ============================================================
-- channel_rates
-- ============================================================
DROP POLICY IF EXISTS "Staff can view channel rates" ON public.channel_rates;
CREATE POLICY "Staff can view channel rates"
  ON public.channel_rates FOR SELECT TO authenticated
  USING (public.is_active_staff_at_hotel(hotel_id));

DROP POLICY IF EXISTS "Staff can insert channel rates" ON public.channel_rates;
CREATE POLICY "Staff can insert channel rates"
  ON public.channel_rates FOR INSERT TO authenticated
  WITH CHECK (public.is_active_staff_at_hotel(hotel_id));

DROP POLICY IF EXISTS "Staff can update channel rates" ON public.channel_rates;
CREATE POLICY "Staff can update channel rates"
  ON public.channel_rates FOR UPDATE TO authenticated
  USING (public.is_active_staff_at_hotel(hotel_id))
  WITH CHECK (public.is_active_staff_at_hotel(hotel_id));

-- ============================================================
-- channel_sync_logs
-- ============================================================
DROP POLICY IF EXISTS "Staff can view sync logs" ON public.channel_sync_logs;
CREATE POLICY "Staff can view sync logs"
  ON public.channel_sync_logs FOR SELECT TO authenticated
  USING (public.is_active_staff_at_hotel(hotel_id));

DROP POLICY IF EXISTS "Staff can insert sync logs" ON public.channel_sync_logs;
CREATE POLICY "Staff can insert sync logs"
  ON public.channel_sync_logs FOR INSERT TO authenticated
  WITH CHECK (public.is_active_staff_at_hotel(hotel_id));

-- ============================================================
-- channels
-- ============================================================
DROP POLICY IF EXISTS "Staff can view hotel channels" ON public.channels;
CREATE POLICY "Staff can view hotel channels"
  ON public.channels FOR SELECT TO authenticated
  USING (public.is_active_staff_at_hotel(hotel_id));

DROP POLICY IF EXISTS "Staff can insert hotel channels" ON public.channels;
CREATE POLICY "Staff can insert hotel channels"
  ON public.channels FOR INSERT TO authenticated
  WITH CHECK (public.is_active_staff_at_hotel(hotel_id));

DROP POLICY IF EXISTS "Staff can update hotel channels" ON public.channels;
CREATE POLICY "Staff can update hotel channels"
  ON public.channels FOR UPDATE TO authenticated
  USING (public.is_active_staff_at_hotel(hotel_id))
  WITH CHECK (public.is_active_staff_at_hotel(hotel_id));

DROP POLICY IF EXISTS "Staff can delete hotel channels" ON public.channels;
CREATE POLICY "Staff can delete hotel channels"
  ON public.channels FOR DELETE TO authenticated
  USING (public.is_active_staff_at_hotel(hotel_id));

-- ============================================================
-- competitor_rates
-- ============================================================
DROP POLICY IF EXISTS "Staff can view competitor rates" ON public.competitor_rates;
CREATE POLICY "Staff can view competitor rates"
  ON public.competitor_rates FOR SELECT TO authenticated
  USING (public.is_active_staff_at_hotel(hotel_id));

DROP POLICY IF EXISTS "Staff can manage competitor rates" ON public.competitor_rates;
CREATE POLICY "Staff can manage competitor rates"
  ON public.competitor_rates FOR INSERT TO authenticated
  WITH CHECK (public.is_active_staff_at_hotel(hotel_id));

DROP POLICY IF EXISTS "Staff can delete competitor rates" ON public.competitor_rates;
CREATE POLICY "Staff can delete competitor rates"
  ON public.competitor_rates FOR DELETE TO authenticated
  USING (public.is_active_staff_at_hotel(hotel_id));

-- ============================================================
-- direct_bookings
-- ============================================================
DROP POLICY IF EXISTS "Staff can view direct bookings" ON public.direct_bookings;
CREATE POLICY "Staff can view direct bookings"
  ON public.direct_bookings FOR SELECT TO authenticated
  USING (public.is_active_staff_at_hotel(hotel_id));

DROP POLICY IF EXISTS "Staff can update direct bookings" ON public.direct_bookings;
CREATE POLICY "Staff can update direct bookings"
  ON public.direct_bookings FOR UPDATE TO authenticated
  USING (public.is_active_staff_at_hotel(hotel_id))
  WITH CHECK (public.is_active_staff_at_hotel(hotel_id));

-- ============================================================
-- guest_communications
-- ============================================================
DROP POLICY IF EXISTS "Staff can view communications for their hotel" ON public.guest_communications;
CREATE POLICY "Staff can view communications for their hotel"
  ON public.guest_communications FOR SELECT TO authenticated
  USING (public.is_active_staff_at_hotel(hotel_id));

DROP POLICY IF EXISTS "Staff can create communications for their hotel" ON public.guest_communications;
CREATE POLICY "Staff can create communications for their hotel"
  ON public.guest_communications FOR INSERT TO authenticated
  WITH CHECK (public.is_active_staff_at_hotel(hotel_id));

-- ============================================================
-- guest_documents
-- ============================================================
DROP POLICY IF EXISTS "Staff can view documents for their hotel" ON public.guest_documents;
CREATE POLICY "Staff can view documents for their hotel"
  ON public.guest_documents FOR SELECT TO authenticated
  USING (public.is_active_staff_at_hotel(hotel_id));

DROP POLICY IF EXISTS "Staff can create documents for their hotel" ON public.guest_documents;
CREATE POLICY "Staff can create documents for their hotel"
  ON public.guest_documents FOR INSERT TO authenticated
  WITH CHECK (public.is_active_staff_at_hotel(hotel_id));

DROP POLICY IF EXISTS "Staff can delete documents for their hotel" ON public.guest_documents;
CREATE POLICY "Staff can delete documents for their hotel"
  ON public.guest_documents FOR DELETE TO authenticated
  USING (public.is_active_staff_at_hotel(hotel_id));

-- ============================================================
-- guest_portal_sessions
-- ============================================================
DROP POLICY IF EXISTS "Staff can view hotel portal sessions" ON public.guest_portal_sessions;
CREATE POLICY "Staff can view hotel portal sessions"
  ON public.guest_portal_sessions FOR SELECT TO authenticated
  USING (public.is_active_staff_at_hotel(hotel_id));

DROP POLICY IF EXISTS "Staff can insert hotel portal sessions" ON public.guest_portal_sessions;
CREATE POLICY "Staff can insert hotel portal sessions"
  ON public.guest_portal_sessions FOR INSERT TO authenticated
  WITH CHECK (public.is_active_staff_at_hotel(hotel_id));

DROP POLICY IF EXISTS "Staff can update hotel portal sessions" ON public.guest_portal_sessions;
CREATE POLICY "Staff can update hotel portal sessions"
  ON public.guest_portal_sessions FOR UPDATE TO authenticated
  USING (public.is_active_staff_at_hotel(hotel_id))
  WITH CHECK (public.is_active_staff_at_hotel(hotel_id));

DROP POLICY IF EXISTS "Staff can delete hotel portal sessions" ON public.guest_portal_sessions;
CREATE POLICY "Staff can delete hotel portal sessions"
  ON public.guest_portal_sessions FOR DELETE TO authenticated
  USING (public.is_active_staff_at_hotel(hotel_id));

-- ============================================================
-- guests
-- ============================================================
DROP POLICY IF EXISTS "Staff can view guests" ON public.guests;
CREATE POLICY "Staff can view guests"
  ON public.guests FOR SELECT TO authenticated
  USING (public.is_active_staff_at_hotel(hotel_id));

DROP POLICY IF EXISTS "Staff can insert guests" ON public.guests;
CREATE POLICY "Staff can insert guests"
  ON public.guests FOR INSERT TO authenticated
  WITH CHECK (public.is_active_staff_at_hotel(hotel_id));

DROP POLICY IF EXISTS "Staff can update guests" ON public.guests;
CREATE POLICY "Staff can update guests"
  ON public.guests FOR UPDATE TO authenticated
  USING (public.is_active_staff_at_hotel(hotel_id))
  WITH CHECK (public.is_active_staff_at_hotel(hotel_id));

-- ============================================================
-- housekeeping_checklist_items
-- ============================================================
DROP POLICY IF EXISTS "Staff can view checklist items" ON public.housekeeping_checklist_items;
CREATE POLICY "Staff can view checklist items"
  ON public.housekeeping_checklist_items FOR SELECT TO authenticated
  USING (public.is_active_staff_at_hotel(hotel_id));

DROP POLICY IF EXISTS "Staff can insert checklist items" ON public.housekeeping_checklist_items;
CREATE POLICY "Staff can insert checklist items"
  ON public.housekeeping_checklist_items FOR INSERT TO authenticated
  WITH CHECK (public.is_active_staff_at_hotel(hotel_id));

DROP POLICY IF EXISTS "Staff can update checklist items" ON public.housekeeping_checklist_items;
CREATE POLICY "Staff can update checklist items"
  ON public.housekeeping_checklist_items FOR UPDATE TO authenticated
  USING (public.is_active_staff_at_hotel(hotel_id))
  WITH CHECK (public.is_active_staff_at_hotel(hotel_id));

-- ============================================================
-- housekeeping_tasks
-- ============================================================
DROP POLICY IF EXISTS "Staff can view housekeeping tasks" ON public.housekeeping_tasks;
CREATE POLICY "Staff can view housekeeping tasks"
  ON public.housekeeping_tasks FOR SELECT TO authenticated
  USING (public.is_active_staff_at_hotel(hotel_id));

DROP POLICY IF EXISTS "Staff can insert housekeeping tasks" ON public.housekeeping_tasks;
CREATE POLICY "Staff can insert housekeeping tasks"
  ON public.housekeeping_tasks FOR INSERT TO authenticated
  WITH CHECK (public.is_active_staff_at_hotel(hotel_id));

DROP POLICY IF EXISTS "Staff can update housekeeping tasks" ON public.housekeeping_tasks;
CREATE POLICY "Staff can update housekeeping tasks"
  ON public.housekeeping_tasks FOR UPDATE TO authenticated
  USING (public.is_active_staff_at_hotel(hotel_id))
  WITH CHECK (public.is_active_staff_at_hotel(hotel_id));

-- ============================================================
-- invoice_audit_log
-- ============================================================
DROP POLICY IF EXISTS "Hotel staff can view invoice audit log" ON public.invoice_audit_log;
CREATE POLICY "Hotel staff can view invoice audit log"
  ON public.invoice_audit_log FOR SELECT TO authenticated
  USING (public.is_active_staff_at_hotel(hotel_id));

-- ============================================================
-- invoice_items (joins through invoices to get hotel_id)
-- ============================================================
DROP POLICY IF EXISTS "Staff can view invoice items" ON public.invoice_items;
CREATE POLICY "Staff can view invoice items"
  ON public.invoice_items FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM invoices
    WHERE invoices.id = invoice_items.invoice_id
      AND public.is_active_staff_at_hotel(invoices.hotel_id)
  ));

DROP POLICY IF EXISTS "Staff can insert invoice items" ON public.invoice_items;
CREATE POLICY "Staff can insert invoice items"
  ON public.invoice_items FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM invoices
    WHERE invoices.id = invoice_items.invoice_id
      AND public.is_active_staff_at_hotel(invoices.hotel_id)
  ));

DROP POLICY IF EXISTS "Staff can update invoice items" ON public.invoice_items;
CREATE POLICY "Staff can update invoice items"
  ON public.invoice_items FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM invoices
    WHERE invoices.id = invoice_items.invoice_id
      AND public.is_active_staff_at_hotel(invoices.hotel_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM invoices
    WHERE invoices.id = invoice_items.invoice_id
      AND public.is_active_staff_at_hotel(invoices.hotel_id)
  ));

DROP POLICY IF EXISTS "Staff can delete invoice items" ON public.invoice_items;
CREATE POLICY "Staff can delete invoice items"
  ON public.invoice_items FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM invoices
    WHERE invoices.id = invoice_items.invoice_id
      AND public.is_active_staff_at_hotel(invoices.hotel_id)
  ));

-- ============================================================
-- invoice_settings
-- ============================================================
DROP POLICY IF EXISTS "Staff can view invoice settings" ON public.invoice_settings;
CREATE POLICY "Staff can view invoice settings"
  ON public.invoice_settings FOR SELECT TO authenticated
  USING (public.is_active_staff_at_hotel(hotel_id));

DROP POLICY IF EXISTS "Staff can insert invoice settings" ON public.invoice_settings;
CREATE POLICY "Staff can insert invoice settings"
  ON public.invoice_settings FOR INSERT TO authenticated
  WITH CHECK (public.is_active_staff_at_hotel(hotel_id));

DROP POLICY IF EXISTS "Staff can update invoice settings" ON public.invoice_settings;
CREATE POLICY "Staff can update invoice settings"
  ON public.invoice_settings FOR UPDATE TO authenticated
  USING (public.is_active_staff_at_hotel(hotel_id))
  WITH CHECK (public.is_active_staff_at_hotel(hotel_id));

-- ============================================================
-- invoices
-- ============================================================
DROP POLICY IF EXISTS "Staff can view invoices" ON public.invoices;
CREATE POLICY "Staff can view invoices"
  ON public.invoices FOR SELECT TO authenticated
  USING (public.is_active_staff_at_hotel(hotel_id));

DROP POLICY IF EXISTS "Staff can insert invoices" ON public.invoices;
CREATE POLICY "Staff can insert invoices"
  ON public.invoices FOR INSERT TO authenticated
  WITH CHECK (public.is_active_staff_at_hotel(hotel_id));

DROP POLICY IF EXISTS "Staff can update invoices" ON public.invoices;
CREATE POLICY "Staff can update invoices"
  ON public.invoices FOR UPDATE TO authenticated
  USING (public.is_active_staff_at_hotel(hotel_id))
  WITH CHECK (public.is_active_staff_at_hotel(hotel_id));

-- ============================================================
-- maintenance_requests
-- ============================================================
DROP POLICY IF EXISTS "Staff can view maintenance requests" ON public.maintenance_requests;
CREATE POLICY "Staff can view maintenance requests"
  ON public.maintenance_requests FOR SELECT TO authenticated
  USING (public.is_active_staff_at_hotel(hotel_id));

DROP POLICY IF EXISTS "Staff can insert maintenance requests" ON public.maintenance_requests;
CREATE POLICY "Staff can insert maintenance requests"
  ON public.maintenance_requests FOR INSERT TO authenticated
  WITH CHECK (public.is_active_staff_at_hotel(hotel_id));

DROP POLICY IF EXISTS "Staff can update maintenance requests" ON public.maintenance_requests;
CREATE POLICY "Staff can update maintenance requests"
  ON public.maintenance_requests FOR UPDATE TO authenticated
  USING (public.is_active_staff_at_hotel(hotel_id))
  WITH CHECK (public.is_active_staff_at_hotel(hotel_id));

-- ============================================================
-- owner_properties
-- ============================================================
DROP POLICY IF EXISTS "Staff can view owner properties" ON public.owner_properties;
CREATE POLICY "Staff can view owner properties"
  ON public.owner_properties FOR SELECT TO authenticated
  USING (public.is_active_staff_at_hotel(hotel_id));

DROP POLICY IF EXISTS "Managers can insert owner properties" ON public.owner_properties;
CREATE POLICY "Managers can insert owner properties"
  ON public.owner_properties FOR INSERT TO authenticated
  WITH CHECK (public.is_admin_staff_at_hotel(hotel_id));

DROP POLICY IF EXISTS "Managers can update owner properties" ON public.owner_properties;
CREATE POLICY "Managers can update owner properties"
  ON public.owner_properties FOR UPDATE TO authenticated
  USING (public.is_admin_staff_at_hotel(hotel_id))
  WITH CHECK (public.is_admin_staff_at_hotel(hotel_id));

-- ============================================================
-- owner_statements
-- ============================================================
DROP POLICY IF EXISTS "Staff can view owner statements" ON public.owner_statements;
CREATE POLICY "Staff can view owner statements"
  ON public.owner_statements FOR SELECT TO authenticated
  USING (public.is_active_staff_at_hotel(hotel_id));

DROP POLICY IF EXISTS "Managers can insert owner statements" ON public.owner_statements;
CREATE POLICY "Managers can insert owner statements"
  ON public.owner_statements FOR INSERT TO authenticated
  WITH CHECK (public.is_admin_staff_at_hotel(hotel_id));

DROP POLICY IF EXISTS "Managers can update owner statements" ON public.owner_statements;
CREATE POLICY "Managers can update owner statements"
  ON public.owner_statements FOR UPDATE TO authenticated
  USING (public.is_admin_staff_at_hotel(hotel_id))
  WITH CHECK (public.is_admin_staff_at_hotel(hotel_id));

-- ============================================================
-- payment_audit_log
-- ============================================================
DROP POLICY IF EXISTS "Hotel staff can view payment audit log" ON public.payment_audit_log;
CREATE POLICY "Hotel staff can view payment audit log"
  ON public.payment_audit_log FOR SELECT TO authenticated
  USING (public.is_active_staff_at_hotel(hotel_id));

-- ============================================================
-- payments
-- ============================================================
DROP POLICY IF EXISTS "Users can view payments for their hotel" ON public.payments;
CREATE POLICY "Users can view payments for their hotel"
  ON public.payments FOR SELECT TO authenticated
  USING (public.is_active_staff_at_hotel(hotel_id));

DROP POLICY IF EXISTS "Staff can insert payments for their hotel" ON public.payments;
CREATE POLICY "Staff can insert payments for their hotel"
  ON public.payments FOR INSERT TO authenticated
  WITH CHECK (public.is_active_staff_at_hotel(hotel_id));

DROP POLICY IF EXISTS "Users can update payments for their hotel" ON public.payments;
CREATE POLICY "Users can update payments for their hotel"
  ON public.payments FOR UPDATE TO authenticated
  USING (public.is_active_staff_at_hotel(hotel_id))
  WITH CHECK (public.is_active_staff_at_hotel(hotel_id));

-- ============================================================
-- pre_arrival_forms
-- ============================================================
DROP POLICY IF EXISTS "Staff can view hotel pre arrival forms" ON public.pre_arrival_forms;
CREATE POLICY "Staff can view hotel pre arrival forms"
  ON public.pre_arrival_forms FOR SELECT TO authenticated
  USING (public.is_active_staff_at_hotel(hotel_id));

DROP POLICY IF EXISTS "Staff can update hotel pre arrival forms" ON public.pre_arrival_forms;
CREATE POLICY "Staff can update hotel pre arrival forms"
  ON public.pre_arrival_forms FOR UPDATE TO authenticated
  USING (public.is_active_staff_at_hotel(hotel_id))
  WITH CHECK (public.is_active_staff_at_hotel(hotel_id));

DROP POLICY IF EXISTS "Staff can delete hotel pre arrival forms" ON public.pre_arrival_forms;
CREATE POLICY "Staff can delete hotel pre arrival forms"
  ON public.pre_arrival_forms FOR DELETE TO authenticated
  USING (public.is_active_staff_at_hotel(hotel_id));

-- ============================================================
-- pricing_rules
-- ============================================================
DROP POLICY IF EXISTS "Staff can view pricing rules" ON public.pricing_rules;
CREATE POLICY "Staff can view pricing rules"
  ON public.pricing_rules FOR SELECT TO authenticated
  USING (public.is_active_staff_at_hotel(hotel_id));

DROP POLICY IF EXISTS "Managers can manage pricing rules" ON public.pricing_rules;
CREATE POLICY "Managers can manage pricing rules"
  ON public.pricing_rules FOR INSERT TO authenticated
  WITH CHECK (public.is_admin_staff_at_hotel(hotel_id));

DROP POLICY IF EXISTS "Managers can update pricing rules" ON public.pricing_rules;
CREATE POLICY "Managers can update pricing rules"
  ON public.pricing_rules FOR UPDATE TO authenticated
  USING (public.is_admin_staff_at_hotel(hotel_id))
  WITH CHECK (public.is_admin_staff_at_hotel(hotel_id));

DROP POLICY IF EXISTS "Managers can delete pricing rules" ON public.pricing_rules;
CREATE POLICY "Managers can delete pricing rules"
  ON public.pricing_rules FOR DELETE TO authenticated
  USING (public.is_admin_staff_at_hotel(hotel_id));

-- ============================================================
-- promo_codes
-- ============================================================
DROP POLICY IF EXISTS "Staff can manage hotel promo codes" ON public.promo_codes;
CREATE POLICY "Staff can manage hotel promo codes"
  ON public.promo_codes FOR SELECT TO authenticated
  USING (public.is_active_staff_at_hotel(hotel_id));

DROP POLICY IF EXISTS "Staff can insert promo codes" ON public.promo_codes;
CREATE POLICY "Staff can insert promo codes"
  ON public.promo_codes FOR INSERT TO authenticated
  WITH CHECK (public.is_active_staff_at_hotel(hotel_id));

DROP POLICY IF EXISTS "Staff can update promo codes" ON public.promo_codes;
CREATE POLICY "Staff can update promo codes"
  ON public.promo_codes FOR UPDATE TO authenticated
  USING (public.is_active_staff_at_hotel(hotel_id))
  WITH CHECK (public.is_active_staff_at_hotel(hotel_id));

-- ============================================================
-- property_owners
-- ============================================================
DROP POLICY IF EXISTS "Staff can view property owners" ON public.property_owners;
CREATE POLICY "Staff can view property owners"
  ON public.property_owners FOR SELECT TO authenticated
  USING (public.is_active_staff_at_hotel(hotel_id));

DROP POLICY IF EXISTS "Managers can insert property owners" ON public.property_owners;
CREATE POLICY "Managers can insert property owners"
  ON public.property_owners FOR INSERT TO authenticated
  WITH CHECK (public.is_admin_staff_at_hotel(hotel_id));

DROP POLICY IF EXISTS "Managers can update property owners" ON public.property_owners;
CREATE POLICY "Managers can update property owners"
  ON public.property_owners FOR UPDATE TO authenticated
  USING (public.is_admin_staff_at_hotel(hotel_id))
  WITH CHECK (public.is_admin_staff_at_hotel(hotel_id));

DROP POLICY IF EXISTS "Managers can delete property owners" ON public.property_owners;
CREATE POLICY "Managers can delete property owners"
  ON public.property_owners FOR DELETE TO authenticated
  USING (public.is_admin_staff_at_hotel(hotel_id));

-- ============================================================
-- reservations
-- ============================================================
DROP POLICY IF EXISTS "Staff can view reservations" ON public.reservations;
CREATE POLICY "Staff can view reservations"
  ON public.reservations FOR SELECT TO authenticated
  USING (public.is_active_staff_at_hotel(hotel_id));

DROP POLICY IF EXISTS "Staff can insert reservations" ON public.reservations;
CREATE POLICY "Staff can insert reservations"
  ON public.reservations FOR INSERT TO authenticated
  WITH CHECK (public.is_active_staff_at_hotel(hotel_id));

DROP POLICY IF EXISTS "Staff can update reservations" ON public.reservations;
CREATE POLICY "Staff can update reservations"
  ON public.reservations FOR UPDATE TO authenticated
  USING (public.is_active_staff_at_hotel(hotel_id))
  WITH CHECK (public.is_active_staff_at_hotel(hotel_id));

-- ============================================================
-- upsell_items
-- ============================================================
DROP POLICY IF EXISTS "Staff can view upsell items" ON public.upsell_items;
CREATE POLICY "Staff can view upsell items"
  ON public.upsell_items FOR SELECT TO authenticated
  USING (public.is_active_staff_at_hotel(hotel_id));

DROP POLICY IF EXISTS "Managers can insert upsell items" ON public.upsell_items;
CREATE POLICY "Managers can insert upsell items"
  ON public.upsell_items FOR INSERT TO authenticated
  WITH CHECK (public.is_admin_staff_at_hotel(hotel_id));

DROP POLICY IF EXISTS "Managers can update upsell items" ON public.upsell_items;
CREATE POLICY "Managers can update upsell items"
  ON public.upsell_items FOR UPDATE TO authenticated
  USING (public.is_admin_staff_at_hotel(hotel_id))
  WITH CHECK (public.is_admin_staff_at_hotel(hotel_id));

DROP POLICY IF EXISTS "Managers can delete upsell items" ON public.upsell_items;
CREATE POLICY "Managers can delete upsell items"
  ON public.upsell_items FOR DELETE TO authenticated
  USING (public.is_admin_staff_at_hotel(hotel_id));

-- ============================================================
-- upsell_orders
-- ============================================================
DROP POLICY IF EXISTS "Staff can view upsell orders" ON public.upsell_orders;
CREATE POLICY "Staff can view upsell orders"
  ON public.upsell_orders FOR SELECT TO authenticated
  USING (public.is_active_staff_at_hotel(hotel_id));

DROP POLICY IF EXISTS "Staff can insert upsell orders" ON public.upsell_orders;
CREATE POLICY "Staff can insert upsell orders"
  ON public.upsell_orders FOR INSERT TO authenticated
  WITH CHECK (public.is_active_staff_at_hotel(hotel_id));

DROP POLICY IF EXISTS "Staff can update upsell orders" ON public.upsell_orders;
CREATE POLICY "Staff can update upsell orders"
  ON public.upsell_orders FOR UPDATE TO authenticated
  USING (public.is_active_staff_at_hotel(hotel_id))
  WITH CHECK (public.is_active_staff_at_hotel(hotel_id));

DROP POLICY IF EXISTS "Managers can delete upsell orders" ON public.upsell_orders;
CREATE POLICY "Managers can delete upsell orders"
  ON public.upsell_orders FOR DELETE TO authenticated
  USING (public.is_admin_staff_at_hotel(hotel_id));
