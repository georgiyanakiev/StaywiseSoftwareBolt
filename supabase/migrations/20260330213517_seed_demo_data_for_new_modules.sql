/*
  # Seed Demo Data for New Modules

  ## Summary
  Inserts realistic demo data for:
  - Channel Manager (3 channels + 10 channel rates + 5 sync logs)
  - Booking Engine (5 direct bookings + config)
  - Payment Automation (3 rules + 8 transactions)
  - Invoicing V2 (6 invoices + line items)

  Uses the existing hotel_id from the seeded demo hotel.
*/

DO $$
DECLARE
  v_hotel_id uuid := '358b47d2-d31b-4a90-89de-9cdb0d76f7c2';
  v_rt1 uuid := 'cfba4cb4-e0bd-460a-8d93-988f0b77352b';
  v_rt2 uuid := '46a37222-213c-4917-9e95-56e5d0b11f00';
  v_rt3 uuid := '7edfb7c2-13a9-4f25-affa-97248fcd8c0d';
  ch_bdc uuid;
  ch_airbnb uuid;
  ch_expedia uuid;
  inv1 uuid;
  inv2 uuid;
  inv3 uuid;
  inv4 uuid;
  inv5 uuid;
  inv6 uuid;
BEGIN

-- ============ CHANNELS ============

INSERT INTO channels (id, hotel_id, name, status, api_key, property_id, last_sync)
VALUES
  (gen_random_uuid(), v_hotel_id, 'Booking.com', 'connected', 'bdc_live_key_xxxx', 'PROP-12345', now() - interval '2 hours'),
  (gen_random_uuid(), v_hotel_id, 'Airbnb', 'connected', 'airbnb_token_xxxx', 'AIRBNB-98765', now() - interval '5 hours'),
  (gen_random_uuid(), v_hotel_id, 'Expedia', 'disconnected', '', '', null)
ON CONFLICT DO NOTHING;

SELECT id INTO ch_bdc FROM channels WHERE hotel_id = v_hotel_id AND name = 'Booking.com' LIMIT 1;
SELECT id INTO ch_airbnb FROM channels WHERE hotel_id = v_hotel_id AND name = 'Airbnb' LIMIT 1;
SELECT id INTO ch_expedia FROM channels WHERE hotel_id = v_hotel_id AND name = 'Expedia' LIMIT 1;

-- ============ CHANNEL RATES (10 rows) ============

INSERT INTO channel_rates (hotel_id, channel_id, room_type_id, date, rate, availability, min_stay, status, synced_at)
SELECT
  v_hotel_id,
  ch_bdc,
  v_rt1,
  CURRENT_DATE + (n || ' days')::interval,
  120 + (random() * 40)::int,
  CASE WHEN random() > 0.3 THEN 3 ELSE 1 END,
  1,
  'synced',
  now() - interval '2 hours'
FROM generate_series(0, 4) AS n
ON CONFLICT DO NOTHING;

INSERT INTO channel_rates (hotel_id, channel_id, room_type_id, date, rate, availability, min_stay, status, synced_at)
SELECT
  v_hotel_id,
  ch_airbnb,
  v_rt2,
  CURRENT_DATE + (n || ' days')::interval,
  150 + (random() * 50)::int,
  CASE WHEN random() > 0.4 THEN 2 ELSE 1 END,
  2,
  'synced',
  now() - interval '5 hours'
FROM generate_series(0, 4) AS n
ON CONFLICT DO NOTHING;

-- ============ SYNC LOGS (5 rows) ============

INSERT INTO channel_sync_logs (hotel_id, channel_id, channel_name, rooms_affected, status, error_message)
VALUES
  (v_hotel_id, ch_bdc, 'Booking.com', 12, 'success', ''),
  (v_hotel_id, ch_airbnb, 'Airbnb', 8, 'success', ''),
  (v_hotel_id, ch_bdc, 'Booking.com', 15, 'partial', 'Rate plan BDC-FLEX not found'),
  (v_hotel_id, ch_airbnb, 'Airbnb', 6, 'success', ''),
  (v_hotel_id, ch_expedia, 'Expedia', 0, 'failed', 'Channel not connected')
ON CONFLICT DO NOTHING;

-- ============ BOOKING ENGINE CONFIG ============

INSERT INTO booking_engine_config (hotel_id, primary_color, welcome_message, cancellation_policy, check_in_time, check_out_time, currency, active)
VALUES (
  v_hotel_id,
  '#1a56db',
  'Welcome! Book directly with us and get the best rates — no hidden fees, no OTA commissions.',
  'Free cancellation up to 48 hours before check-in. Cancellations within 48 hours will incur the first night charge.',
  '15:00',
  '11:00',
  'EUR',
  true
)
ON CONFLICT DO NOTHING;

-- ============ DIRECT BOOKINGS (5 rows) ============

INSERT INTO direct_bookings (hotel_id, confirmation_number, room_type_id, guest_name, guest_email, guest_phone, check_in, check_out, adults, children, rate_per_night, total_amount, deposit_amount, status)
VALUES
  (v_hotel_id, 'SW-100001', v_rt1, 'Michael Johnson', 'michael.j@example.com', '+44 20 7946 0901', CURRENT_DATE + 5, CURRENT_DATE + 8, 2, 0, 120.00, 360.00, 108.00, 'confirmed'),
  (v_hotel_id, 'SW-100002', v_rt2, 'Sophie Müller', 'sophie.m@example.com', '+49 30 123456', CURRENT_DATE + 10, CURRENT_DATE + 14, 2, 1, 150.00, 600.00, 180.00, 'confirmed'),
  (v_hotel_id, 'SW-100003', v_rt1, 'Carlos Reyes', 'carlos.r@example.com', '+34 91 234 5678', CURRENT_DATE - 3, CURRENT_DATE, 1, 0, 110.00, 330.00, 99.00, 'checked_out'),
  (v_hotel_id, 'SW-100004', v_rt3, 'Aisha Patel', 'aisha.p@example.com', '+91 98765 43210', CURRENT_DATE + 20, CURRENT_DATE + 25, 2, 2, 200.00, 1000.00, 300.00, 'confirmed'),
  (v_hotel_id, 'SW-100005', v_rt2, 'James Wilson', 'james.w@example.com', '+1 212 555 0147', CURRENT_DATE - 10, CURRENT_DATE - 7, 2, 0, 140.00, 420.00, 126.00, 'cancelled')
ON CONFLICT DO NOTHING;

-- ============ PAYMENT RULES (3 rows) ============

INSERT INTO payment_rules (hotel_id, name, trigger, days_before, amount_type, amount_value, payment_type, applies_to, active)
VALUES
  (v_hotel_id, '30% Deposit on Booking', 'on_booking', null, 'percentage', 30, 'deposit', 'all', true),
  (v_hotel_id, 'Balance Due 7 Days Before Arrival', 'days_before_arrival', 7, 'percentage', 70, 'charge', 'direct', true),
  (v_hotel_id, 'Pre-auth on Check-in', 'on_checkin', null, 'fixed', 200, 'pre_authorisation', 'all', true)
ON CONFLICT DO NOTHING;

-- ============ PAYMENT TRANSACTIONS (8 rows) ============

INSERT INTO payment_transactions (hotel_id, guest_name, amount, currency, type, status, payment_method, card_last4, notes, scheduled_date, processed_at)
VALUES
  (v_hotel_id, 'Michael Johnson', 108.00, 'EUR', 'deposit', 'captured', 'card', '4242', 'Deposit via booking engine', null, now() - interval '3 days'),
  (v_hotel_id, 'Sophie Müller', 180.00, 'EUR', 'deposit', 'captured', 'card', '1234', 'Deposit via booking engine', null, now() - interval '2 days'),
  (v_hotel_id, 'Michael Johnson', 252.00, 'EUR', 'charge', 'pending', 'card', '4242', 'Balance due', CURRENT_DATE + 2, null),
  (v_hotel_id, 'Sophie Müller', 420.00, 'EUR', 'charge', 'pending', 'card', '1234', 'Balance due', CURRENT_DATE + 3, null),
  (v_hotel_id, 'Carlos Reyes', 330.00, 'EUR', 'charge', 'captured', 'cash', '', 'Full payment at checkout', null, now() - interval '1 day'),
  (v_hotel_id, 'Aisha Patel', 300.00, 'EUR', 'deposit', 'pending', 'card', '5678', 'Deposit pending', CURRENT_DATE - 2, null),
  (v_hotel_id, 'James Wilson', 126.00, 'EUR', 'deposit', 'refunded', 'card', '9999', 'Guest cancelled — refund issued', null, now() - interval '5 days'),
  (v_hotel_id, 'Carlos Reyes', 200.00, 'EUR', 'pre_auth', 'captured', 'card', '3333', 'Pre-auth at check-in', null, now() - interval '3 days')
ON CONFLICT DO NOTHING;

-- ============ INVOICES V2 (6 rows + line items) ============

INSERT INTO invoices_v2 (id, hotel_id, invoice_number, guest_name, guest_email, guest_address, issue_date, due_date, status, currency, subtotal, tax_rate, tax_amount, discount_amount, total_amount, paid_amount, notes)
VALUES
  (gen_random_uuid(), v_hotel_id, 'SW-INV-2026-0001', 'Michael Johnson', 'michael.j@example.com', '14 Baker Street, London, UK', CURRENT_DATE - 5, CURRENT_DATE + 25, 'sent', 'EUR', 300.00, 20, 60.00, 0, 360.00, 0, 'Thank you for your stay. Payment due within 30 days.'),
  (gen_random_uuid(), v_hotel_id, 'SW-INV-2026-0002', 'Sophie Müller', 'sophie.m@example.com', 'Alexanderplatz 1, Berlin, DE', CURRENT_DATE - 10, CURRENT_DATE - 1, 'overdue', 'EUR', 500.00, 20, 100.00, 0, 600.00, 0, 'Payment is overdue. Please contact reception.'),
  (gen_random_uuid(), v_hotel_id, 'SW-INV-2026-0003', 'Carlos Reyes', 'carlos.r@example.com', 'Calle Mayor 12, Madrid, ES', CURRENT_DATE - 3, CURRENT_DATE + 27, 'paid', 'EUR', 275.00, 20, 55.00, 0, 330.00, 330.00, 'Paid in full at checkout.'),
  (gen_random_uuid(), v_hotel_id, 'SW-INV-2026-0004', 'Aisha Patel', 'aisha.p@example.com', '22 MG Road, Mumbai, IN', CURRENT_DATE, CURRENT_DATE + 30, 'draft', 'EUR', 833.33, 20, 166.67, 0, 1000.00, 0, ''),
  (gen_random_uuid(), v_hotel_id, 'SW-INV-2026-0005', 'James Wilson', 'james.w@example.com', '5th Ave, New York, US', CURRENT_DATE - 7, CURRENT_DATE + 23, 'sent', 'USD', 350.00, 10, 35.00, 35.00, 350.00, 0, 'Corporate rate applied.'),
  (gen_random_uuid(), v_hotel_id, 'SW-INV-2026-0006', 'Emma Dubois', 'emma.d@example.com', 'Rue de Rivoli, Paris, FR', CURRENT_DATE - 14, CURRENT_DATE - 14, 'paid', 'EUR', 450.00, 20, 90.00, 0, 540.00, 540.00, 'Paid in full.')
ON CONFLICT DO NOTHING;

-- Line items for each invoice
INSERT INTO invoice_lines (invoice_id, description, quantity, unit_price, tax_rate, line_total)
SELECT id, 'Room Accommodation (3 nights × €100)', 3, 100.00, 20, 300.00 FROM invoices_v2 WHERE invoice_number = 'SW-INV-2026-0001' AND hotel_id = v_hotel_id;

INSERT INTO invoice_lines (invoice_id, description, quantity, unit_price, tax_rate, line_total)
SELECT id, 'Room Accommodation (4 nights × €125)', 4, 125.00, 20, 500.00 FROM invoices_v2 WHERE invoice_number = 'SW-INV-2026-0002' AND hotel_id = v_hotel_id;

INSERT INTO invoice_lines (invoice_id, description, quantity, unit_price, tax_rate, line_total)
SELECT id, 'Room Accommodation (3 nights × €110)', 3, 110.00, 20, 330.00 FROM invoices_v2 WHERE invoice_number = 'SW-INV-2026-0003' AND hotel_id = v_hotel_id;

INSERT INTO invoice_lines (invoice_id, description, quantity, unit_price, tax_rate, line_total)
SELECT id, 'Room Accommodation (5 nights × €166.67)', 5, 166.67, 20, 833.35 FROM invoices_v2 WHERE invoice_number = 'SW-INV-2026-0004' AND hotel_id = v_hotel_id;

INSERT INTO invoice_lines (invoice_id, description, quantity, unit_price, tax_rate, line_total)
SELECT id, 'Room Accommodation (3 nights × €120)', 3, 120.00, 10, 360.00 FROM invoices_v2 WHERE invoice_number = 'SW-INV-2026-0005' AND hotel_id = v_hotel_id;
INSERT INTO invoice_lines (invoice_id, description, quantity, unit_price, tax_rate, line_total)
SELECT id, 'Airport Transfer', 1, 45.00, 10, 45.00 FROM invoices_v2 WHERE invoice_number = 'SW-INV-2026-0005' AND hotel_id = v_hotel_id;

INSERT INTO invoice_lines (invoice_id, description, quantity, unit_price, tax_rate, line_total)
SELECT id, 'Room Accommodation (4 nights × €112.50)', 4, 112.50, 20, 450.00 FROM invoices_v2 WHERE invoice_number = 'SW-INV-2026-0006' AND hotel_id = v_hotel_id;

END $$;
