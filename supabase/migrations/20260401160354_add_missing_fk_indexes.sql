/*
  # Add Missing Foreign Key Indexes

  ## Summary
  Creates covering indexes for all foreign key columns that are currently unindexed.
  This prevents full table scans during JOIN operations and CASCADE actions,
  improving query performance across the board.

  ## Tables Affected
  - activity_log (tenant_id)
  - ai_price_suggestions (tenant_id)
  - booking_com_room_mappings (room_type_id, tenant_id)
  - booking_com_settings (tenant_id)
  - booking_com_sync_logs (tenant_id)
  - booking_engine_config (hotel_id, tenant_id)
  - channel_sync_logs (channel_id, tenant_id)
  - cloudbeds_room_mappings (tenant_id)
  - cloudbeds_settings (tenant_id)
  - cloudbeds_sync_logs (tenant_id)
  - competitor_rates (tenant_id)
  - direct_bookings (room_id)
  - expedia_room_mappings (room_type_id, tenant_id)
  - expedia_settings (tenant_id)
  - expedia_sync_logs (tenant_id)
  - guest_communications (hotel_id, tenant_id)
  - guest_documents (hotel_id, reservation_id, session_id, tenant_id)
  - guest_portal_sessions (hotel_id, reservation_id, tenant_id)
  - guest_stay_history (hotel_id, tenant_id)
  - housekeeping_staff (hotel_id, tenant_id)
  - invoice_items (tenant_id)
  - invoice_line_items (hotel_id, tenant_id)
  - invoice_lines (tenant_id)
  - invoice_settings (hotel_id)
  - lodgify_room_mappings (tenant_id)
  - lodgify_settings (tenant_id)
  - lodgify_sync_logs (tenant_id)
  - maintenance_issues (hotel_id, room_id, tenant_id)
  - owner_properties (tenant_id)
  - owner_statements (tenant_id)
  - payments (reservation_id)
  - pre_arrival_forms (hotel_id, reservation_id, session_id, tenant_id)
  - pricing_rules (tenant_id)
  - property_owners (tenant_id)
  - siteminder_room_mappings (tenant_id)
  - siteminder_settings (tenant_id)
  - siteminder_sync_logs (tenant_id)
  - upsell_items (tenant_id)
  - upsell_orders (tenant_id, upsell_item_id)
  - user_hotel_assignments (assigned_by)
*/

CREATE INDEX IF NOT EXISTS idx_activity_log_tenant_id ON public.activity_log (tenant_id);
CREATE INDEX IF NOT EXISTS idx_ai_price_suggestions_tenant_id ON public.ai_price_suggestions (tenant_id);

CREATE INDEX IF NOT EXISTS idx_booking_com_room_mappings_room_type_id ON public.booking_com_room_mappings (room_type_id);
CREATE INDEX IF NOT EXISTS idx_booking_com_room_mappings_tenant_id ON public.booking_com_room_mappings (tenant_id);
CREATE INDEX IF NOT EXISTS idx_booking_com_settings_tenant_id ON public.booking_com_settings (tenant_id);
CREATE INDEX IF NOT EXISTS idx_booking_com_sync_logs_tenant_id ON public.booking_com_sync_logs (tenant_id);

CREATE INDEX IF NOT EXISTS idx_booking_engine_config_hotel_id ON public.booking_engine_config (hotel_id);
CREATE INDEX IF NOT EXISTS idx_booking_engine_config_tenant_id ON public.booking_engine_config (tenant_id);

CREATE INDEX IF NOT EXISTS idx_channel_sync_logs_channel_id ON public.channel_sync_logs (channel_id);
CREATE INDEX IF NOT EXISTS idx_channel_sync_logs_tenant_id ON public.channel_sync_logs (tenant_id);

CREATE INDEX IF NOT EXISTS idx_cloudbeds_room_mappings_tenant_id ON public.cloudbeds_room_mappings (tenant_id);
CREATE INDEX IF NOT EXISTS idx_cloudbeds_settings_tenant_id ON public.cloudbeds_settings (tenant_id);
CREATE INDEX IF NOT EXISTS idx_cloudbeds_sync_logs_tenant_id ON public.cloudbeds_sync_logs (tenant_id);

CREATE INDEX IF NOT EXISTS idx_competitor_rates_tenant_id ON public.competitor_rates (tenant_id);

CREATE INDEX IF NOT EXISTS idx_direct_bookings_room_id ON public.direct_bookings (room_id);

CREATE INDEX IF NOT EXISTS idx_expedia_room_mappings_room_type_id ON public.expedia_room_mappings (room_type_id);
CREATE INDEX IF NOT EXISTS idx_expedia_room_mappings_tenant_id ON public.expedia_room_mappings (tenant_id);
CREATE INDEX IF NOT EXISTS idx_expedia_settings_tenant_id ON public.expedia_settings (tenant_id);
CREATE INDEX IF NOT EXISTS idx_expedia_sync_logs_tenant_id ON public.expedia_sync_logs (tenant_id);

CREATE INDEX IF NOT EXISTS idx_guest_communications_hotel_id ON public.guest_communications (hotel_id);
CREATE INDEX IF NOT EXISTS idx_guest_communications_tenant_id ON public.guest_communications (tenant_id);

CREATE INDEX IF NOT EXISTS idx_guest_documents_hotel_id ON public.guest_documents (hotel_id);
CREATE INDEX IF NOT EXISTS idx_guest_documents_reservation_id ON public.guest_documents (reservation_id);
CREATE INDEX IF NOT EXISTS idx_guest_documents_session_id ON public.guest_documents (session_id);
CREATE INDEX IF NOT EXISTS idx_guest_documents_tenant_id ON public.guest_documents (tenant_id);

CREATE INDEX IF NOT EXISTS idx_guest_portal_sessions_hotel_id ON public.guest_portal_sessions (hotel_id);
CREATE INDEX IF NOT EXISTS idx_guest_portal_sessions_reservation_id ON public.guest_portal_sessions (reservation_id);
CREATE INDEX IF NOT EXISTS idx_guest_portal_sessions_tenant_id ON public.guest_portal_sessions (tenant_id);

CREATE INDEX IF NOT EXISTS idx_guest_stay_history_hotel_id ON public.guest_stay_history (hotel_id);
CREATE INDEX IF NOT EXISTS idx_guest_stay_history_tenant_id ON public.guest_stay_history (tenant_id);

CREATE INDEX IF NOT EXISTS idx_housekeeping_staff_hotel_id ON public.housekeeping_staff (hotel_id);
CREATE INDEX IF NOT EXISTS idx_housekeeping_staff_tenant_id ON public.housekeeping_staff (tenant_id);

CREATE INDEX IF NOT EXISTS idx_invoice_items_tenant_id ON public.invoice_items (tenant_id);

CREATE INDEX IF NOT EXISTS idx_invoice_line_items_hotel_id ON public.invoice_line_items (hotel_id);
CREATE INDEX IF NOT EXISTS idx_invoice_line_items_tenant_id ON public.invoice_line_items (tenant_id);

CREATE INDEX IF NOT EXISTS idx_invoice_lines_tenant_id ON public.invoice_lines (tenant_id);

CREATE INDEX IF NOT EXISTS idx_invoice_settings_hotel_id ON public.invoice_settings (hotel_id);

CREATE INDEX IF NOT EXISTS idx_lodgify_room_mappings_tenant_id ON public.lodgify_room_mappings (tenant_id);
CREATE INDEX IF NOT EXISTS idx_lodgify_settings_tenant_id ON public.lodgify_settings (tenant_id);
CREATE INDEX IF NOT EXISTS idx_lodgify_sync_logs_tenant_id ON public.lodgify_sync_logs (tenant_id);

CREATE INDEX IF NOT EXISTS idx_maintenance_issues_hotel_id ON public.maintenance_issues (hotel_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_issues_room_id ON public.maintenance_issues (room_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_issues_tenant_id ON public.maintenance_issues (tenant_id);

CREATE INDEX IF NOT EXISTS idx_owner_properties_tenant_id ON public.owner_properties (tenant_id);
CREATE INDEX IF NOT EXISTS idx_owner_statements_tenant_id ON public.owner_statements (tenant_id);

CREATE INDEX IF NOT EXISTS idx_payments_reservation_id ON public.payments (reservation_id);

CREATE INDEX IF NOT EXISTS idx_pre_arrival_forms_hotel_id ON public.pre_arrival_forms (hotel_id);
CREATE INDEX IF NOT EXISTS idx_pre_arrival_forms_reservation_id ON public.pre_arrival_forms (reservation_id);
CREATE INDEX IF NOT EXISTS idx_pre_arrival_forms_session_id ON public.pre_arrival_forms (session_id);
CREATE INDEX IF NOT EXISTS idx_pre_arrival_forms_tenant_id ON public.pre_arrival_forms (tenant_id);

CREATE INDEX IF NOT EXISTS idx_pricing_rules_tenant_id ON public.pricing_rules (tenant_id);
CREATE INDEX IF NOT EXISTS idx_property_owners_tenant_id ON public.property_owners (tenant_id);

CREATE INDEX IF NOT EXISTS idx_siteminder_room_mappings_tenant_id ON public.siteminder_room_mappings (tenant_id);
CREATE INDEX IF NOT EXISTS idx_siteminder_settings_tenant_id ON public.siteminder_settings (tenant_id);
CREATE INDEX IF NOT EXISTS idx_siteminder_sync_logs_tenant_id ON public.siteminder_sync_logs (tenant_id);

CREATE INDEX IF NOT EXISTS idx_upsell_items_tenant_id ON public.upsell_items (tenant_id);
CREATE INDEX IF NOT EXISTS idx_upsell_orders_tenant_id ON public.upsell_orders (tenant_id);
CREATE INDEX IF NOT EXISTS idx_upsell_orders_upsell_item_id ON public.upsell_orders (upsell_item_id);

CREATE INDEX IF NOT EXISTS idx_user_hotel_assignments_assigned_by ON public.user_hotel_assignments (assigned_by);
