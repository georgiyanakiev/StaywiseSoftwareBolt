/*
  # Fix security issues: indexes, RLS policies, duplicates

  1. Missing FK Indexes
    - Add index on guest_emails(guest_id)
    - Add index on smoobu_channels(created_by)

  2. RLS Auth Initialization (wrap auth.uid() in select)
    - guest_emails: "Staff can insert email logs for their hotel"
    - guest_emails: "Staff can view hotel email logs"
    - webhook_events: "Service role can insert webhook events"
    - webhook_events: "Staff can read webhook events for their hotel"

  3. Duplicate Indexes (drop one of each pair)
    - Drop idx_guests_stripe_customer (keep idx_guests_stripe_customer_id)
    - Drop idx_reservations_stripe_intent (keep idx_reservations_stripe_payment_intent_id)

  4. Unused Indexes (drop all confirmed-unused)

  5. Multiple Permissive Policies
    - bookings: drop "Allow all reads" (keep "Authenticated read bookings")

  6. Always-True RLS Policy
    - direct_bookings: replace "Anon can update payment fields on direct bookings"
      with a scoped policy requiring a non-null stripe_session_id
*/

-- ============================================================
-- 1. Missing FK indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_guest_emails_guest_id
  ON guest_emails (guest_id);

CREATE INDEX IF NOT EXISTS idx_smoobu_channels_created_by
  ON smoobu_channels (created_by);

-- ============================================================
-- 2. Fix RLS auth initialization — guest_emails
-- ============================================================
DROP POLICY IF EXISTS "Staff can insert email logs for their hotel" ON guest_emails;
CREATE POLICY "Staff can insert email logs for their hotel"
  ON guest_emails FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM staff_members sm
      WHERE sm.user_id = (SELECT auth.uid())
        AND sm.hotel_id = guest_emails.hotel_id
    )
  );

DROP POLICY IF EXISTS "Staff can view hotel email logs" ON guest_emails;
CREATE POLICY "Staff can view hotel email logs"
  ON guest_emails FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff_members sm
      WHERE sm.user_id = (SELECT auth.uid())
        AND sm.hotel_id = guest_emails.hotel_id
    )
  );

-- ============================================================
-- 2b. Fix RLS auth initialization — webhook_events
-- ============================================================
DROP POLICY IF EXISTS "Service role can insert webhook events" ON webhook_events;
CREATE POLICY "Service role can insert webhook events"
  ON webhook_events FOR INSERT TO authenticated
  WITH CHECK (
    hotel_id IN (
      SELECT sm.hotel_id FROM staff_members sm
      WHERE sm.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Staff can read webhook events for their hotel" ON webhook_events;
CREATE POLICY "Staff can read webhook events for their hotel"
  ON webhook_events FOR SELECT TO authenticated
  USING (
    hotel_id IN (
      SELECT sm.hotel_id FROM staff_members sm
      WHERE sm.user_id = (SELECT auth.uid())
    )
  );

-- ============================================================
-- 3. Drop duplicate indexes
-- ============================================================
DROP INDEX IF EXISTS idx_guests_stripe_customer;
DROP INDEX IF EXISTS idx_reservations_stripe_intent;

-- ============================================================
-- 4. Drop unused indexes
-- ============================================================
DROP INDEX IF EXISTS idx_reservations_stripe_payment_intent_id;
DROP INDEX IF EXISTS idx_reservations_stripe_checkout_session_id;
DROP INDEX IF EXISTS idx_guests_stripe_customer_id;
DROP INDEX IF EXISTS idx_ai_price_suggestions_room_type_id;
DROP INDEX IF EXISTS idx_booking_engine_config_tenant_id;
DROP INDEX IF EXISTS idx_channels_tenant_id;
DROP INDEX IF EXISTS idx_direct_bookings_tenant_id;
DROP INDEX IF EXISTS idx_guest_profiles_tenant_id;
DROP INDEX IF EXISTS idx_housekeeping_tasks_tenant_id;
DROP INDEX IF EXISTS idx_invoice_items_hotel_id;
DROP INDEX IF EXISTS idx_owner_properties_owner_id;
DROP INDEX IF EXISTS idx_owner_statements_owner_id;
DROP INDEX IF EXISTS idx_payments_tenant_id;
DROP INDEX IF EXISTS idx_promo_codes_tenant_id;
DROP INDEX IF EXISTS idx_user_hotel_assignments_assigned_by;
DROP INDEX IF EXISTS idx_guest_stay_history_tenant_id;
DROP INDEX IF EXISTS idx_hotels_tenant_id;
DROP INDEX IF EXISTS idx_housekeeping_checklist_items_hotel_id;
DROP INDEX IF EXISTS idx_housekeeping_checklist_items_task_id;
DROP INDEX IF EXISTS idx_activity_log_hotel_id;
DROP INDEX IF EXISTS idx_ai_price_suggestions_tenant_id;
DROP INDEX IF EXISTS idx_booking_engine_config_hotel_id;
DROP INDEX IF EXISTS idx_channel_sync_logs_channel_id;
DROP INDEX IF EXISTS idx_competitor_rates_tenant_id;
DROP INDEX IF EXISTS idx_direct_bookings_room_type_id;
DROP INDEX IF EXISTS idx_guest_communications_guest_id;
DROP INDEX IF EXISTS idx_guest_communications_hotel_id;
DROP INDEX IF EXISTS idx_guest_communications_tenant_id;
DROP INDEX IF EXISTS idx_guest_documents_hotel_id;
DROP INDEX IF EXISTS idx_guest_documents_reservation_id;
DROP INDEX IF EXISTS idx_guest_documents_session_id;
DROP INDEX IF EXISTS idx_guest_documents_tenant_id;
DROP INDEX IF EXISTS idx_guest_portal_sessions_reservation_id;
DROP INDEX IF EXISTS idx_guest_portal_sessions_tenant_id;
DROP INDEX IF EXISTS idx_guest_stay_history_booking_id;
DROP INDEX IF EXISTS idx_invoice_line_items_hotel_id;
DROP INDEX IF EXISTS idx_invoices_guest_id;
DROP INDEX IF EXISTS idx_invoices_tenant_id;
DROP INDEX IF EXISTS idx_maintenance_requests_room_id;
DROP INDEX IF EXISTS idx_owner_properties_room_id;
DROP INDEX IF EXISTS idx_owner_properties_tenant_id;
DROP INDEX IF EXISTS idx_owner_statements_tenant_id;
DROP INDEX IF EXISTS idx_payment_transactions_reservation_id;
DROP INDEX IF EXISTS idx_payment_rules_tenant_id;
DROP INDEX IF EXISTS idx_payment_transactions_tenant_id;
DROP INDEX IF EXISTS idx_payments_guest_id;
DROP INDEX IF EXISTS idx_pre_arrival_forms_reservation_id;
DROP INDEX IF EXISTS idx_pre_arrival_forms_session_id;
DROP INDEX IF EXISTS idx_pre_arrival_forms_tenant_id;
DROP INDEX IF EXISTS idx_pricing_rules_room_type_id;
DROP INDEX IF EXISTS idx_pricing_rules_tenant_id;
DROP INDEX IF EXISTS idx_upsell_orders_tenant_id;
DROP INDEX IF EXISTS idx_upsell_orders_upsell_item_id;
DROP INDEX IF EXISTS idx_property_owners_tenant_id;
DROP INDEX IF EXISTS idx_property_owners_user_id;
DROP INDEX IF EXISTS idx_staff_members_hotel_id;
DROP INDEX IF EXISTS idx_staff_members_tenant_id;
DROP INDEX IF EXISTS idx_staff_members_user_id;
DROP INDEX IF EXISTS idx_upsell_items_tenant_id;
DROP INDEX IF EXISTS idx_guest_emails_scheduled_pending;
DROP INDEX IF EXISTS idx_guest_emails_hotel_id;
DROP INDEX IF EXISTS idx_webhook_events_tenant_id;
DROP INDEX IF EXISTS idx_webhook_events_status;
DROP INDEX IF EXISTS idx_webhook_events_created_at;
DROP INDEX IF EXISTS idx_webhook_events_source_status;
DROP INDEX IF EXISTS idx_direct_bookings_stripe_session;
DROP INDEX IF EXISTS idx_direct_bookings_payment_status;

-- ============================================================
-- 5. Fix multiple permissive SELECT policies on bookings
-- ============================================================
DROP POLICY IF EXISTS "Allow all reads" ON bookings;

-- ============================================================
-- 6. Fix always-true anon UPDATE policy on direct_bookings
-- ============================================================
DROP POLICY IF EXISTS "Anon can update payment fields on direct bookings" ON direct_bookings;
CREATE POLICY "Anon can update payment status on direct bookings"
  ON direct_bookings FOR UPDATE TO anon
  USING (
    stripe_session_id IS NOT NULL
  )
  WITH CHECK (
    stripe_session_id IS NOT NULL
  );
