/*
  # Seed Channels Per Tenant

  ## Summary
  The existing channels rows had tenant_id = null, causing the Channels dropdown
  to appear empty for logged-in users (who are always scoped to a tenant).
  This migration inserts a standard set of channels for each tenant so the
  dropdown shows real data.

  ## Changes
  - Inserts Booking.com, Expedia, and Airbnb channels for each of the three tenants
*/

INSERT INTO public.channels (name, type, status, tenant_id)
SELECT src.ch_name, src.ch_type, src.ch_status, t.id
FROM (
  VALUES
    ('Booking.com', 'booking_com', 'connected'),
    ('Expedia',     'expedia',     'connected'),
    ('Airbnb',      'airbnb',      'connected')
) AS src(ch_name, ch_type, ch_status)
CROSS JOIN public.tenants t
ON CONFLICT DO NOTHING;
