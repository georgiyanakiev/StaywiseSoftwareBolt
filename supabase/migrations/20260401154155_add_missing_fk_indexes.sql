/*
  # Add missing foreign key indexes

  All foreign key columns that lack a covering index are indexed here.
  This prevents sequential scans on child tables when joining to/from parent
  tables, and also speeds up ON DELETE/UPDATE constraint enforcement.
*/

-- activity_log
CREATE INDEX IF NOT EXISTS idx_activity_log_hotel_id ON public.activity_log (hotel_id);

-- ai_price_suggestions
CREATE INDEX IF NOT EXISTS idx_ai_price_suggestions_hotel_id ON public.ai_price_suggestions (hotel_id);
CREATE INDEX IF NOT EXISTS idx_ai_price_suggestions_room_type_id ON public.ai_price_suggestions (room_type_id);

-- channel_rates
CREATE INDEX IF NOT EXISTS idx_channel_rates_channel_id ON public.channel_rates (channel_id);
CREATE INDEX IF NOT EXISTS idx_channel_rates_hotel_id ON public.channel_rates (hotel_id);
CREATE INDEX IF NOT EXISTS idx_channel_rates_room_type_id ON public.channel_rates (room_type_id);
CREATE INDEX IF NOT EXISTS idx_channel_rates_tenant_id ON public.channel_rates (tenant_id);

-- channel_sync_logs
CREATE INDEX IF NOT EXISTS idx_channel_sync_logs_hotel_id ON public.channel_sync_logs (hotel_id);

-- channels
CREATE INDEX IF NOT EXISTS idx_channels_tenant_id ON public.channels (tenant_id);

-- cloudbeds_room_mappings
CREATE INDEX IF NOT EXISTS idx_cloudbeds_room_mappings_room_type_id ON public.cloudbeds_room_mappings (room_type_id);

-- competitor_rates
CREATE INDEX IF NOT EXISTS idx_competitor_rates_hotel_id ON public.competitor_rates (hotel_id);

-- direct_bookings
CREATE INDEX IF NOT EXISTS idx_direct_bookings_hotel_id ON public.direct_bookings (hotel_id);
CREATE INDEX IF NOT EXISTS idx_direct_bookings_room_type_id ON public.direct_bookings (room_type_id);
CREATE INDEX IF NOT EXISTS idx_direct_bookings_tenant_id ON public.direct_bookings (tenant_id);

-- dpa_acceptances
CREATE INDEX IF NOT EXISTS idx_dpa_acceptances_tenant_id ON public.dpa_acceptances (tenant_id);

-- guest_communications
CREATE INDEX IF NOT EXISTS idx_guest_communications_guest_profile_id ON public.guest_communications (guest_profile_id);

-- guest_profiles
CREATE INDEX IF NOT EXISTS idx_guest_profiles_tenant_id ON public.guest_profiles (tenant_id);

-- guest_stay_history
CREATE INDEX IF NOT EXISTS idx_guest_stay_history_guest_profile_id ON public.guest_stay_history (guest_profile_id);

-- guests
CREATE INDEX IF NOT EXISTS idx_guests_tenant_id ON public.guests (tenant_id);

-- hotels
CREATE INDEX IF NOT EXISTS idx_hotels_tenant_id ON public.hotels (tenant_id);

-- housekeeping_tasks
CREATE INDEX IF NOT EXISTS idx_housekeeping_tasks_tenant_id ON public.housekeeping_tasks (tenant_id);

-- invoice_lines
CREATE INDEX IF NOT EXISTS idx_invoice_lines_invoice_id ON public.invoice_lines (invoice_id);

-- invoices
CREATE INDEX IF NOT EXISTS idx_invoices_tenant_id ON public.invoices (tenant_id);

-- invoices_v2
CREATE INDEX IF NOT EXISTS idx_invoices_v2_tenant_id ON public.invoices_v2 (tenant_id);

-- lodgify_room_mappings
CREATE INDEX IF NOT EXISTS idx_lodgify_room_mappings_room_type_id ON public.lodgify_room_mappings (room_type_id);

-- maintenance_requests
CREATE INDEX IF NOT EXISTS idx_maintenance_requests_tenant_id ON public.maintenance_requests (tenant_id);

-- owner_properties
CREATE INDEX IF NOT EXISTS idx_owner_properties_hotel_id ON public.owner_properties (hotel_id);
CREATE INDEX IF NOT EXISTS idx_owner_properties_owner_id ON public.owner_properties (owner_id);
CREATE INDEX IF NOT EXISTS idx_owner_properties_room_id ON public.owner_properties (room_id);

-- owner_statements
CREATE INDEX IF NOT EXISTS idx_owner_statements_hotel_id ON public.owner_statements (hotel_id);
CREATE INDEX IF NOT EXISTS idx_owner_statements_owner_id ON public.owner_statements (owner_id);

-- payment_rules
CREATE INDEX IF NOT EXISTS idx_payment_rules_hotel_id ON public.payment_rules (hotel_id);
CREATE INDEX IF NOT EXISTS idx_payment_rules_tenant_id ON public.payment_rules (tenant_id);

-- payment_transactions
CREATE INDEX IF NOT EXISTS idx_payment_transactions_hotel_id ON public.payment_transactions (hotel_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_tenant_id ON public.payment_transactions (tenant_id);

-- payments
CREATE INDEX IF NOT EXISTS idx_payments_tenant_id ON public.payments (tenant_id);

-- pricing_rules
CREATE INDEX IF NOT EXISTS idx_pricing_rules_room_type_id ON public.pricing_rules (room_type_id);

-- property_owners
CREATE INDEX IF NOT EXISTS idx_property_owners_hotel_id ON public.property_owners (hotel_id);
CREATE INDEX IF NOT EXISTS idx_property_owners_user_id ON public.property_owners (user_id);

-- reservations
CREATE INDEX IF NOT EXISTS idx_reservations_tenant_id ON public.reservations (tenant_id);

-- room_types
CREATE INDEX IF NOT EXISTS idx_room_types_tenant_id ON public.room_types (tenant_id);

-- rooms
CREATE INDEX IF NOT EXISTS idx_rooms_tenant_id ON public.rooms (tenant_id);

-- siteminder_room_mappings
CREATE INDEX IF NOT EXISTS idx_siteminder_room_mappings_room_type_id ON public.siteminder_room_mappings (room_type_id);

-- staff_members
CREATE INDEX IF NOT EXISTS idx_staff_members_tenant_id ON public.staff_members (tenant_id);

-- user_hotel_assignments
CREATE INDEX IF NOT EXISTS idx_user_hotel_assignments_tenant_id ON public.user_hotel_assignments (tenant_id);
