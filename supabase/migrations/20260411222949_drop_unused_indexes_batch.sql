/*
  # Drop unused indexes

  1. Changes
    - Removes 53 indexes that have never been used according to pg_stat_user_indexes
    - These indexes consume storage and slow down writes without providing read benefits

  2. Tables Affected
    - maintenance_requests, bookings, availability, ai_price_suggestions,
      booking_engine_config, channel_sync_logs, activity_log, competitor_rates,
      direct_bookings, guest_communications, guest_documents, guest_portal_sessions,
      guest_stay_history, hotels, housekeeping_checklist_items, housekeeping_tasks,
      invoice_line_items, invoices, owner_properties, owner_statements,
      payment_rules, payment_transactions, payments, pre_arrival_forms,
      pricing_rules, property_owners, staff_members, upsell_items,
      upsell_orders, promo_codes

  3. Important Notes
    - Only indexes with zero scans since last stats reset are dropped
    - Primary key and unique constraint indexes are NOT touched
    - Some of these columns now have fresh FK indexes from the previous migration
*/

DROP INDEX IF EXISTS idx_maintenance_requests_tenant_id;
DROP INDEX IF EXISTS idx_maintenance_requests_category;
DROP INDEX IF EXISTS idx_bookings_property_id;
DROP INDEX IF EXISTS idx_bookings_arrival;
DROP INDEX IF EXISTS idx_bookings_status;
DROP INDEX IF EXISTS idx_availability_property;
DROP INDEX IF EXISTS idx_ai_price_suggestions_tenant_id;
DROP INDEX IF EXISTS idx_booking_engine_config_hotel_id;
DROP INDEX IF EXISTS idx_channel_sync_logs_channel_id;
DROP INDEX IF EXISTS idx_activity_log_hotel_id;
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
DROP INDEX IF EXISTS idx_guest_stay_history_tenant_id;
DROP INDEX IF EXISTS idx_hotels_tenant_id;
DROP INDEX IF EXISTS idx_housekeeping_checklist_items_hotel_id;
DROP INDEX IF EXISTS idx_housekeeping_checklist_items_task_id;
DROP INDEX IF EXISTS idx_housekeeping_tasks_hotel_id;
DROP INDEX IF EXISTS idx_invoice_line_items_hotel_id;
DROP INDEX IF EXISTS idx_invoices_guest_id;
DROP INDEX IF EXISTS idx_invoices_tenant_id;
DROP INDEX IF EXISTS idx_maintenance_requests_room_id;
DROP INDEX IF EXISTS idx_owner_properties_room_id;
DROP INDEX IF EXISTS idx_owner_properties_tenant_id;
DROP INDEX IF EXISTS idx_owner_statements_tenant_id;
DROP INDEX IF EXISTS idx_payment_rules_tenant_id;
DROP INDEX IF EXISTS idx_payment_transactions_reservation_id;
DROP INDEX IF EXISTS idx_payment_transactions_tenant_id;
DROP INDEX IF EXISTS idx_payments_guest_id;
DROP INDEX IF EXISTS idx_pre_arrival_forms_reservation_id;
DROP INDEX IF EXISTS idx_pre_arrival_forms_session_id;
DROP INDEX IF EXISTS idx_pre_arrival_forms_tenant_id;
DROP INDEX IF EXISTS idx_pricing_rules_room_type_id;
DROP INDEX IF EXISTS idx_pricing_rules_tenant_id;
DROP INDEX IF EXISTS idx_property_owners_tenant_id;
DROP INDEX IF EXISTS idx_property_owners_user_id;
DROP INDEX IF EXISTS idx_staff_members_hotel_id;
DROP INDEX IF EXISTS idx_staff_members_tenant_id;
DROP INDEX IF EXISTS idx_staff_members_user_id;
DROP INDEX IF EXISTS idx_upsell_items_tenant_id;
DROP INDEX IF EXISTS idx_upsell_orders_tenant_id;
DROP INDEX IF EXISTS idx_upsell_orders_upsell_item_id;
DROP INDEX IF EXISTS idx_promo_codes_hotel_id;
DROP INDEX IF EXISTS idx_promo_codes_code;
