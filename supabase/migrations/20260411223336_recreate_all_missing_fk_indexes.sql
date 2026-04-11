/*
  # Recreate all missing foreign key indexes

  1. New Indexes (44 total)
    - Covers all foreign key columns that were previously dropped as "unused"
    - These indexes are required for efficient FK constraint checks, cascading deletes, and joins
    - Uses IF NOT EXISTS to skip any that already exist from the prior migration

  2. Tables Affected
    - activity_log, ai_price_suggestions, booking_engine_config, channel_sync_logs,
      competitor_rates, direct_bookings, guest_communications, guest_documents,
      guest_portal_sessions, guest_stay_history, hotels, housekeeping_checklist_items,
      housekeeping_tasks, invoice_line_items, invoices, maintenance_requests,
      owner_properties, owner_statements, payment_rules, payment_transactions,
      payments, pre_arrival_forms, pricing_rules, property_owners,
      staff_members, upsell_items, upsell_orders

  3. Important Notes
    - FK indexes must exist even if query patterns don't directly use them,
      because PostgreSQL needs them for cascading operations and join planning
*/

CREATE INDEX IF NOT EXISTS idx_activity_log_hotel_id ON activity_log(hotel_id);
CREATE INDEX IF NOT EXISTS idx_ai_price_suggestions_tenant_id ON ai_price_suggestions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_booking_engine_config_hotel_id ON booking_engine_config(hotel_id);
CREATE INDEX IF NOT EXISTS idx_channel_sync_logs_channel_id ON channel_sync_logs(channel_id);
CREATE INDEX IF NOT EXISTS idx_competitor_rates_tenant_id ON competitor_rates(tenant_id);
CREATE INDEX IF NOT EXISTS idx_direct_bookings_room_type_id ON direct_bookings(room_type_id);
CREATE INDEX IF NOT EXISTS idx_guest_communications_guest_id ON guest_communications(guest_id);
CREATE INDEX IF NOT EXISTS idx_guest_communications_hotel_id ON guest_communications(hotel_id);
CREATE INDEX IF NOT EXISTS idx_guest_communications_tenant_id ON guest_communications(tenant_id);
CREATE INDEX IF NOT EXISTS idx_guest_documents_hotel_id ON guest_documents(hotel_id);
CREATE INDEX IF NOT EXISTS idx_guest_documents_reservation_id ON guest_documents(reservation_id);
CREATE INDEX IF NOT EXISTS idx_guest_documents_session_id ON guest_documents(session_id);
CREATE INDEX IF NOT EXISTS idx_guest_documents_tenant_id ON guest_documents(tenant_id);
CREATE INDEX IF NOT EXISTS idx_guest_portal_sessions_reservation_id ON guest_portal_sessions(reservation_id);
CREATE INDEX IF NOT EXISTS idx_guest_portal_sessions_tenant_id ON guest_portal_sessions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_guest_stay_history_booking_id ON guest_stay_history(booking_id);
CREATE INDEX IF NOT EXISTS idx_guest_stay_history_tenant_id ON guest_stay_history(tenant_id);
CREATE INDEX IF NOT EXISTS idx_hotels_tenant_id ON hotels(tenant_id);
CREATE INDEX IF NOT EXISTS idx_housekeeping_checklist_items_hotel_id ON housekeeping_checklist_items(hotel_id);
CREATE INDEX IF NOT EXISTS idx_housekeeping_checklist_items_task_id ON housekeeping_checklist_items(task_id);
CREATE INDEX IF NOT EXISTS idx_housekeeping_tasks_hotel_id ON housekeeping_tasks(hotel_id);
CREATE INDEX IF NOT EXISTS idx_invoice_line_items_hotel_id ON invoice_line_items(hotel_id);
CREATE INDEX IF NOT EXISTS idx_invoices_guest_id ON invoices(guest_id);
CREATE INDEX IF NOT EXISTS idx_invoices_tenant_id ON invoices(tenant_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_requests_room_id ON maintenance_requests(room_id);
CREATE INDEX IF NOT EXISTS idx_owner_properties_room_id ON owner_properties(room_id);
CREATE INDEX IF NOT EXISTS idx_owner_properties_tenant_id ON owner_properties(tenant_id);
CREATE INDEX IF NOT EXISTS idx_owner_statements_tenant_id ON owner_statements(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payment_rules_tenant_id ON payment_rules(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_reservation_id ON payment_transactions(reservation_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_tenant_id ON payment_transactions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payments_guest_id ON payments(guest_id);
CREATE INDEX IF NOT EXISTS idx_pre_arrival_forms_reservation_id ON pre_arrival_forms(reservation_id);
CREATE INDEX IF NOT EXISTS idx_pre_arrival_forms_session_id ON pre_arrival_forms(session_id);
CREATE INDEX IF NOT EXISTS idx_pre_arrival_forms_tenant_id ON pre_arrival_forms(tenant_id);
CREATE INDEX IF NOT EXISTS idx_pricing_rules_room_type_id ON pricing_rules(room_type_id);
CREATE INDEX IF NOT EXISTS idx_pricing_rules_tenant_id ON pricing_rules(tenant_id);
CREATE INDEX IF NOT EXISTS idx_property_owners_tenant_id ON property_owners(tenant_id);
CREATE INDEX IF NOT EXISTS idx_property_owners_user_id ON property_owners(user_id);
CREATE INDEX IF NOT EXISTS idx_staff_members_hotel_id ON staff_members(hotel_id);
CREATE INDEX IF NOT EXISTS idx_staff_members_tenant_id ON staff_members(tenant_id);
CREATE INDEX IF NOT EXISTS idx_staff_members_user_id ON staff_members(user_id);
CREATE INDEX IF NOT EXISTS idx_upsell_items_tenant_id ON upsell_items(tenant_id);
CREATE INDEX IF NOT EXISTS idx_upsell_orders_tenant_id ON upsell_orders(tenant_id);
CREATE INDEX IF NOT EXISTS idx_upsell_orders_upsell_item_id ON upsell_orders(upsell_item_id);
