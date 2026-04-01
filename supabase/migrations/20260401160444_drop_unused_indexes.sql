/*
  # Drop Unused Indexes

  ## Summary
  Removes indexes that have never been used by the query planner.
  Unused indexes waste storage space and add overhead to every INSERT/UPDATE/DELETE
  operation without providing any query performance benefit.

  ## Indexes Dropped
  - onboarding_emails: idx_onboarding_emails_status_scheduled, idx_onboarding_emails_user_id
  - channel_rates: idx_channel_rates_hotel_id, idx_channel_rates_room_type_id, idx_channel_rates_tenant_id, idx_channel_rates_channel_id
  - channel_sync_logs: idx_channel_sync_logs_hotel_id
  - channels: idx_channels_tenant_id
  - cloudbeds_room_mappings: idx_cloudbeds_room_mappings_room_type_id
  - competitor_rates: idx_competitor_rates_hotel_id
  - direct_bookings: idx_direct_bookings_hotel_id, idx_direct_bookings_room_type_id, idx_direct_bookings_tenant_id
  - activity_log: idx_activity_log_hotel_id
  - ai_price_suggestions: idx_ai_price_suggestions_hotel_id, idx_ai_price_suggestions_room_type_id
  - dpa_acceptances: idx_dpa_acceptances_tenant_id
  - guest_communications: idx_guest_communications_guest_profile_id
  - guest_profiles: idx_guest_profiles_tenant_id
  - guest_stay_history: idx_guest_stay_history_guest_profile_id
  - guests: idx_guests_tenant_id
  - hotels: idx_hotels_tenant_id
  - housekeeping_tasks: idx_housekeeping_tasks_tenant_id
  - invoice_lines: idx_invoice_lines_invoice_id
  - invoices: idx_invoices_tenant_id
  - invoices_v2: idx_invoices_v2_tenant_id
  - lodgify_room_mappings: idx_lodgify_room_mappings_room_type_id
  - maintenance_requests: idx_maintenance_requests_tenant_id
  - owner_properties: idx_owner_properties_hotel_id, idx_owner_properties_owner_id, idx_owner_properties_room_id
  - owner_statements: idx_owner_statements_hotel_id, idx_owner_statements_owner_id
  - payment_rules: idx_payment_rules_hotel_id, idx_payment_rules_tenant_id
  - payment_transactions: idx_payment_transactions_hotel_id, idx_payment_transactions_tenant_id
  - payments: idx_payments_tenant_id
  - pricing_rules: idx_pricing_rules_room_type_id
  - property_owners: idx_property_owners_hotel_id, idx_property_owners_user_id
  - rooms: idx_rooms_tenant_id
  - siteminder_room_mappings: idx_siteminder_room_mappings_room_type_id
  - reservations: idx_reservations_tenant_id
  - room_types: idx_room_types_tenant_id
  - staff_members: idx_staff_members_tenant_id
  - user_hotel_assignments: idx_user_hotel_assignments_tenant_id
*/

DROP INDEX IF EXISTS public.idx_onboarding_emails_status_scheduled;
DROP INDEX IF EXISTS public.idx_onboarding_emails_user_id;

DROP INDEX IF EXISTS public.idx_channel_rates_hotel_id;
DROP INDEX IF EXISTS public.idx_channel_rates_room_type_id;
DROP INDEX IF EXISTS public.idx_channel_rates_tenant_id;
DROP INDEX IF EXISTS public.idx_channel_rates_channel_id;

DROP INDEX IF EXISTS public.idx_channel_sync_logs_hotel_id;
DROP INDEX IF EXISTS public.idx_channels_tenant_id;

DROP INDEX IF EXISTS public.idx_cloudbeds_room_mappings_room_type_id;
DROP INDEX IF EXISTS public.idx_competitor_rates_hotel_id;

DROP INDEX IF EXISTS public.idx_direct_bookings_hotel_id;
DROP INDEX IF EXISTS public.idx_direct_bookings_room_type_id;
DROP INDEX IF EXISTS public.idx_direct_bookings_tenant_id;

DROP INDEX IF EXISTS public.idx_activity_log_hotel_id;

DROP INDEX IF EXISTS public.idx_ai_price_suggestions_hotel_id;
DROP INDEX IF EXISTS public.idx_ai_price_suggestions_room_type_id;

DROP INDEX IF EXISTS public.idx_dpa_acceptances_tenant_id;

DROP INDEX IF EXISTS public.idx_guest_communications_guest_profile_id;
DROP INDEX IF EXISTS public.idx_guest_profiles_tenant_id;
DROP INDEX IF EXISTS public.idx_guest_stay_history_guest_profile_id;
DROP INDEX IF EXISTS public.idx_guests_tenant_id;

DROP INDEX IF EXISTS public.idx_hotels_tenant_id;
DROP INDEX IF EXISTS public.idx_housekeeping_tasks_tenant_id;

DROP INDEX IF EXISTS public.idx_invoice_lines_invoice_id;
DROP INDEX IF EXISTS public.idx_invoices_tenant_id;
DROP INDEX IF EXISTS public.idx_invoices_v2_tenant_id;

DROP INDEX IF EXISTS public.idx_lodgify_room_mappings_room_type_id;
DROP INDEX IF EXISTS public.idx_maintenance_requests_tenant_id;

DROP INDEX IF EXISTS public.idx_owner_properties_hotel_id;
DROP INDEX IF EXISTS public.idx_owner_properties_owner_id;
DROP INDEX IF EXISTS public.idx_owner_properties_room_id;

DROP INDEX IF EXISTS public.idx_owner_statements_hotel_id;
DROP INDEX IF EXISTS public.idx_owner_statements_owner_id;

DROP INDEX IF EXISTS public.idx_payment_rules_hotel_id;
DROP INDEX IF EXISTS public.idx_payment_rules_tenant_id;
DROP INDEX IF EXISTS public.idx_payment_transactions_hotel_id;
DROP INDEX IF EXISTS public.idx_payment_transactions_tenant_id;
DROP INDEX IF EXISTS public.idx_payments_tenant_id;

DROP INDEX IF EXISTS public.idx_pricing_rules_room_type_id;

DROP INDEX IF EXISTS public.idx_property_owners_hotel_id;
DROP INDEX IF EXISTS public.idx_property_owners_user_id;

DROP INDEX IF EXISTS public.idx_rooms_tenant_id;
DROP INDEX IF EXISTS public.idx_siteminder_room_mappings_room_type_id;

DROP INDEX IF EXISTS public.idx_reservations_tenant_id;
DROP INDEX IF EXISTS public.idx_room_types_tenant_id;
DROP INDEX IF EXISTS public.idx_staff_members_tenant_id;
DROP INDEX IF EXISTS public.idx_user_hotel_assignments_tenant_id;
