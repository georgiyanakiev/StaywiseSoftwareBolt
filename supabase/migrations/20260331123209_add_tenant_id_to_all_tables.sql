
/*
  # Add tenant_id to All Data Tables

  ## Summary
  Adds a `tenant_id` foreign key column to every data table in the system.
  This is the foundation for multi-tenancy — every row in every table
  is owned by exactly one tenant.

  ## Modified Tables
  All existing tables receive: `tenant_id uuid REFERENCES tenants(id)`

  ## Important Notes
  - All columns added with IF NOT EXISTS to be idempotent
  - No existing data is modified or deleted
  - tenant_id is nullable to avoid breaking existing rows
  - Indexes added on tenant_id for query performance
*/

ALTER TABLE public.hotels ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.room_types ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.guests ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.reservations ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.invoice_items ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.housekeeping_tasks ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.maintenance_requests ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.staff_members ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.activity_log ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.booking_com_settings ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.booking_com_sync_logs ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.booking_com_room_mappings ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.expedia_settings ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.expedia_sync_logs ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.expedia_room_mappings ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.cloudbeds_settings ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.cloudbeds_sync_logs ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.cloudbeds_room_mappings ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.siteminder_settings ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.siteminder_sync_logs ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.siteminder_room_mappings ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.lodgify_settings ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.lodgify_sync_logs ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.lodgify_room_mappings ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.channels ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.channel_rates ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.channel_sync_logs ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.invoices_v2 ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.invoice_lines ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.booking_engine_config ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.direct_bookings ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.payment_rules ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.payment_transactions ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);

-- Performance indexes on tenant_id
CREATE INDEX IF NOT EXISTS idx_hotels_tenant_id ON public.hotels(tenant_id);
CREATE INDEX IF NOT EXISTS idx_room_types_tenant_id ON public.room_types(tenant_id);
CREATE INDEX IF NOT EXISTS idx_rooms_tenant_id ON public.rooms(tenant_id);
CREATE INDEX IF NOT EXISTS idx_guests_tenant_id ON public.guests(tenant_id);
CREATE INDEX IF NOT EXISTS idx_reservations_tenant_id ON public.reservations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_invoices_tenant_id ON public.invoices(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payments_tenant_id ON public.payments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_housekeeping_tasks_tenant_id ON public.housekeeping_tasks(tenant_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_requests_tenant_id ON public.maintenance_requests(tenant_id);
CREATE INDEX IF NOT EXISTS idx_staff_members_tenant_id ON public.staff_members(tenant_id);
CREATE INDEX IF NOT EXISTS idx_channels_tenant_id ON public.channels(tenant_id);
CREATE INDEX IF NOT EXISTS idx_channel_rates_tenant_id ON public.channel_rates(tenant_id);
CREATE INDEX IF NOT EXISTS idx_invoices_v2_tenant_id ON public.invoices_v2(tenant_id);
CREATE INDEX IF NOT EXISTS idx_direct_bookings_tenant_id ON public.direct_bookings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payment_rules_tenant_id ON public.payment_rules(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_tenant_id ON public.payment_transactions(tenant_id);
