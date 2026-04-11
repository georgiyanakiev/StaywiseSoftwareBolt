/*
  # Add missing foreign key indexes

  1. New Indexes
    - `idx_ai_price_suggestions_room_type_id` on ai_price_suggestions(room_type_id)
    - `idx_booking_engine_config_tenant_id` on booking_engine_config(tenant_id)
    - `idx_channel_rates_channel_id` on channel_rates(channel_id)
    - `idx_channels_tenant_id` on channels(tenant_id)
    - `idx_direct_bookings_tenant_id` on direct_bookings(tenant_id)
    - `idx_guest_profiles_tenant_id` on guest_profiles(tenant_id)
    - `idx_housekeeping_tasks_tenant_id` on housekeeping_tasks(tenant_id)
    - `idx_invoice_items_hotel_id` on invoice_items(hotel_id)
    - `idx_owner_properties_owner_id` on owner_properties(owner_id)
    - `idx_owner_statements_owner_id` on owner_statements(owner_id)
    - `idx_payments_tenant_id` on payments(tenant_id)
    - `idx_promo_codes_tenant_id` on promo_codes(tenant_id)
    - `idx_user_hotel_assignments_assigned_by` on user_hotel_assignments(assigned_by)

  2. Reason
    - Foreign keys without indexes cause slow cascading deletes and join performance
*/

CREATE INDEX IF NOT EXISTS idx_ai_price_suggestions_room_type_id ON ai_price_suggestions(room_type_id);
CREATE INDEX IF NOT EXISTS idx_booking_engine_config_tenant_id ON booking_engine_config(tenant_id);
CREATE INDEX IF NOT EXISTS idx_channel_rates_channel_id ON channel_rates(channel_id);
CREATE INDEX IF NOT EXISTS idx_channels_tenant_id ON channels(tenant_id);
CREATE INDEX IF NOT EXISTS idx_direct_bookings_tenant_id ON direct_bookings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_guest_profiles_tenant_id ON guest_profiles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_housekeeping_tasks_tenant_id ON housekeeping_tasks(tenant_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_hotel_id ON invoice_items(hotel_id);
CREATE INDEX IF NOT EXISTS idx_owner_properties_owner_id ON owner_properties(owner_id);
CREATE INDEX IF NOT EXISTS idx_owner_statements_owner_id ON owner_statements(owner_id);
CREATE INDEX IF NOT EXISTS idx_payments_tenant_id ON payments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_promo_codes_tenant_id ON promo_codes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_user_hotel_assignments_assigned_by ON user_hotel_assignments(assigned_by);
