/*
  # Fix Duplicate and Unused Indexes

  ## Summary
  1. Removes the duplicate index on invoice_lines (keeping the newer one)
  2. Drops all unused indexes that Supabase has flagged as never accessed.
     Unused indexes waste write performance and storage without providing
     any read benefit.

  ## Duplicate Removed
  - idx_invoice_lines_invoice_id (duplicate of idx_invoice_lines_invoice)

  ## Unused Indexes Dropped
  All indexes listed as "never used" by the Supabase advisor.
*/

-- Drop duplicate
DROP INDEX IF EXISTS idx_invoice_lines_invoice_id;

-- Drop unused indexes
DROP INDEX IF EXISTS idx_invoices_status;
DROP INDEX IF EXISTS idx_guest_profiles_tenant_id;
DROP INDEX IF EXISTS idx_guest_profiles_email;
DROP INDEX IF EXISTS idx_guest_profiles_loyalty_tier;
DROP INDEX IF EXISTS idx_guest_stay_history_guest_profile_id;
DROP INDEX IF EXISTS idx_guest_communications_guest_profile_id;
DROP INDEX IF EXISTS idx_invoice_lines_invoice_id;
DROP INDEX IF EXISTS idx_payment_transactions_booking_id;
DROP INDEX IF EXISTS idx_channel_rates_room_type_id;
DROP INDEX IF EXISTS idx_direct_bookings_room_type_id;
DROP INDEX IF EXISTS idx_activity_log_hotel_id;
DROP INDEX IF EXISTS idx_channel_rates_hotel_date;
DROP INDEX IF EXISTS idx_channel_rates_channel;
DROP INDEX IF EXISTS idx_channel_sync_logs_hotel;
DROP INDEX IF EXISTS idx_maintenance_requests_tenant_id;
DROP INDEX IF EXISTS idx_staff_members_tenant_id;
DROP INDEX IF EXISTS idx_channels_tenant_id;
DROP INDEX IF EXISTS idx_channel_rates_tenant_id;
DROP INDEX IF EXISTS idx_invoices_v2_tenant_id;
DROP INDEX IF EXISTS idx_direct_bookings_tenant_id;
DROP INDEX IF EXISTS idx_payment_rules_tenant_id;
DROP INDEX IF EXISTS idx_payment_transactions_tenant_id;
DROP INDEX IF EXISTS dpa_acceptances_tenant_id_idx;
DROP INDEX IF EXISTS idx_expedia_sync_logs_hotel_id;
DROP INDEX IF EXISTS idx_property_owners_hotel_id;
DROP INDEX IF EXISTS idx_property_owners_user_id;
DROP INDEX IF EXISTS idx_owner_properties_owner_id;
DROP INDEX IF EXISTS idx_owner_properties_hotel_id;
DROP INDEX IF EXISTS idx_owner_properties_room_id;
DROP INDEX IF EXISTS idx_owner_statements_owner_id;
DROP INDEX IF EXISTS idx_owner_statements_hotel_id;
DROP INDEX IF EXISTS idx_owner_statements_period;
DROP INDEX IF EXISTS idx_pricing_rules_room_type_id;
DROP INDEX IF EXISTS idx_pricing_rules_dates;
DROP INDEX IF EXISTS idx_bdc_sync_logs_hotel_id;
DROP INDEX IF EXISTS idx_siteminder_sync_logs_started_at;
DROP INDEX IF EXISTS idx_siteminder_room_mappings_room_type_id;
DROP INDEX IF EXISTS idx_cloudbeds_sync_logs_started_at;
DROP INDEX IF EXISTS idx_cloudbeds_room_mappings_room_type_id;
DROP INDEX IF EXISTS idx_ai_suggestions_hotel_id;
DROP INDEX IF EXISTS idx_ai_suggestions_room_type_date;
DROP INDEX IF EXISTS idx_lodgify_sync_logs_started_at;
DROP INDEX IF EXISTS idx_lodgify_room_mappings_room_type_id;
DROP INDEX IF EXISTS idx_competitor_rates_hotel_id;
DROP INDEX IF EXISTS idx_maintenance_requests_scheduled;
DROP INDEX IF EXISTS idx_competitor_rates_date;
DROP INDEX IF EXISTS idx_direct_bookings_hotel;
DROP INDEX IF EXISTS idx_payment_rules_hotel;
DROP INDEX IF EXISTS idx_payment_transactions_hotel;
DROP INDEX IF EXISTS idx_payment_transactions_status;
DROP INDEX IF EXISTS idx_invoice_lines_invoice;
DROP INDEX IF EXISTS idx_guests_tenant_id;
DROP INDEX IF EXISTS idx_hotels_tenant_id;
DROP INDEX IF EXISTS idx_room_types_tenant_id;
DROP INDEX IF EXISTS idx_rooms_tenant_id;
DROP INDEX IF EXISTS idx_reservations_tenant_id;
DROP INDEX IF EXISTS idx_invoices_tenant_id;
DROP INDEX IF EXISTS idx_payments_tenant_id;
DROP INDEX IF EXISTS idx_housekeeping_tasks_tenant_id;
DROP INDEX IF EXISTS idx_user_hotel_assignments_tenant_id;
DROP INDEX IF EXISTS idx_user_hotel_assignments_active;
DROP INDEX IF EXISTS idx_user_hotel_assignments_role;
DROP INDEX IF EXISTS idx_upsell_orders_booking_id;
DROP INDEX IF EXISTS idx_upsell_orders_status;
DROP INDEX IF EXISTS idx_invoice_lines_invoice_id;
