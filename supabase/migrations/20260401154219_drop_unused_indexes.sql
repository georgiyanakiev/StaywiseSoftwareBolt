/*
  # Drop unused indexes

  These indexes have never been used since creation. Removing them reduces
  write overhead (INSERT/UPDATE/DELETE must maintain every index) and saves
  storage without impacting query performance.
*/

DROP INDEX IF EXISTS public.idx_pre_arrival_forms_hotel_id;
DROP INDEX IF EXISTS public.idx_pre_arrival_forms_reservation_id;
DROP INDEX IF EXISTS public.idx_pre_arrival_forms_session_id;
DROP INDEX IF EXISTS public.idx_pre_arrival_forms_tenant_id;
DROP INDEX IF EXISTS public.idx_pricing_rules_tenant_id;
DROP INDEX IF EXISTS public.idx_property_owners_tenant_id;
DROP INDEX IF EXISTS public.idx_siteminder_room_mappings_tenant_id;
DROP INDEX IF EXISTS public.idx_siteminder_settings_tenant_id;
DROP INDEX IF EXISTS public.idx_siteminder_sync_logs_tenant_id;
DROP INDEX IF EXISTS public.idx_upsell_items_tenant_id;
DROP INDEX IF EXISTS public.idx_upsell_orders_tenant_id;
DROP INDEX IF EXISTS public.idx_upsell_orders_upsell_item_id;
DROP INDEX IF EXISTS public.idx_user_hotel_assignments_assigned_by;
DROP INDEX IF EXISTS public.idx_booking_com_sync_logs_tenant_id;
DROP INDEX IF EXISTS public.idx_booking_engine_config_hotel_id;
DROP INDEX IF EXISTS public.idx_booking_engine_config_tenant_id;
DROP INDEX IF EXISTS public.idx_channel_sync_logs_channel_id;
DROP INDEX IF EXISTS public.idx_channel_sync_logs_tenant_id;
DROP INDEX IF EXISTS public.idx_cloudbeds_room_mappings_tenant_id;
DROP INDEX IF EXISTS public.idx_cloudbeds_settings_tenant_id;
DROP INDEX IF EXISTS public.idx_activity_log_tenant_id;
DROP INDEX IF EXISTS public.idx_ai_price_suggestions_tenant_id;
DROP INDEX IF EXISTS public.idx_booking_com_room_mappings_room_type_id;
DROP INDEX IF EXISTS public.idx_booking_com_room_mappings_tenant_id;
DROP INDEX IF EXISTS public.idx_booking_com_settings_tenant_id;
DROP INDEX IF EXISTS public.idx_cloudbeds_sync_logs_tenant_id;
DROP INDEX IF EXISTS public.idx_competitor_rates_tenant_id;
DROP INDEX IF EXISTS public.idx_direct_bookings_room_id;
DROP INDEX IF EXISTS public.idx_expedia_room_mappings_room_type_id;
DROP INDEX IF EXISTS public.idx_expedia_room_mappings_tenant_id;
DROP INDEX IF EXISTS public.idx_expedia_settings_tenant_id;
DROP INDEX IF EXISTS public.idx_expedia_sync_logs_tenant_id;
DROP INDEX IF EXISTS public.idx_guest_communications_hotel_id;
DROP INDEX IF EXISTS public.idx_guest_communications_tenant_id;
DROP INDEX IF EXISTS public.idx_guest_documents_hotel_id;
DROP INDEX IF EXISTS public.idx_guest_documents_reservation_id;
DROP INDEX IF EXISTS public.idx_guest_portal_sessions_reservation_id;
DROP INDEX IF EXISTS public.idx_guest_portal_sessions_tenant_id;
DROP INDEX IF EXISTS public.idx_guest_documents_session_id;
DROP INDEX IF EXISTS public.idx_guest_documents_tenant_id;
DROP INDEX IF EXISTS public.idx_guest_portal_sessions_hotel_id;
DROP INDEX IF EXISTS public.idx_guest_stay_history_hotel_id;
DROP INDEX IF EXISTS public.idx_guest_stay_history_tenant_id;
DROP INDEX IF EXISTS public.idx_housekeeping_staff_hotel_id;
DROP INDEX IF EXISTS public.idx_housekeeping_staff_tenant_id;
DROP INDEX IF EXISTS public.idx_invoice_items_tenant_id;
DROP INDEX IF EXISTS public.idx_invoice_line_items_hotel_id;
DROP INDEX IF EXISTS public.idx_lodgify_room_mappings_tenant_id;
DROP INDEX IF EXISTS public.idx_lodgify_settings_tenant_id;
DROP INDEX IF EXISTS public.idx_lodgify_sync_logs_tenant_id;
DROP INDEX IF EXISTS public.idx_invoice_line_items_tenant_id;
DROP INDEX IF EXISTS public.idx_invoice_lines_tenant_id;
DROP INDEX IF EXISTS public.idx_invoice_settings_hotel_id;
DROP INDEX IF EXISTS public.idx_maintenance_issues_hotel_id;
DROP INDEX IF EXISTS public.idx_maintenance_issues_room_id;
DROP INDEX IF EXISTS public.idx_maintenance_issues_tenant_id;
DROP INDEX IF EXISTS public.idx_owner_properties_tenant_id;
DROP INDEX IF EXISTS public.idx_owner_statements_tenant_id;
DROP INDEX IF EXISTS public.idx_payments_reservation_id;
