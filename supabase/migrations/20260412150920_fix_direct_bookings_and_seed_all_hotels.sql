/*
  # Fix direct bookings data and seed for all hotels

  1. Fixes
    - Expands status check constraint to include pending, pending_payment, no_show
    - Backfills subtotal and tax_amount on existing direct_bookings where they are 0
    - Sets tenant_id from the parent hotel on all direct_bookings and booking_engine_config
    - Creates booking_engine_config for hotels that don't have one

  2. Seed data
    - Adds realistic direct bookings for The Grand Metropolitan hotel
    - Creates booking engine config for Grand Metropolitan

  3. Important Notes
    - subtotal = rate_per_night * nights
    - tax_amount = subtotal * hotel.tax_rate / 100
    - total_amount = subtotal + tax_amount
*/

-- Step 0: Expand status constraint to support full booking lifecycle
ALTER TABLE direct_bookings DROP CONSTRAINT IF EXISTS direct_bookings_status_check;
ALTER TABLE direct_bookings ADD CONSTRAINT direct_bookings_status_check 
  CHECK (status IN ('confirmed','cancelled','checked_in','checked_out','pending','pending_payment','no_show'));

-- Step 1: Fix existing direct_bookings subtotal and tax_amount
UPDATE direct_bookings db
SET 
  subtotal = db.rate_per_night * (db.check_out - db.check_in),
  tax_amount = ROUND(db.rate_per_night * (db.check_out - db.check_in) * COALESCE(h.tax_rate, 0) / 100, 2)
FROM hotels h
WHERE h.id = db.hotel_id
  AND (db.subtotal = 0 OR db.subtotal IS NULL);

-- Step 2: Fix tenant_id on direct_bookings
UPDATE direct_bookings db
SET tenant_id = h.tenant_id
FROM hotels h
WHERE h.id = db.hotel_id
  AND db.tenant_id IS NULL
  AND h.tenant_id IS NOT NULL;

-- Step 3: Fix tenant_id on booking_engine_config
UPDATE booking_engine_config bec
SET tenant_id = h.tenant_id
FROM hotels h
WHERE h.id = bec.hotel_id
  AND bec.tenant_id IS NULL
  AND h.tenant_id IS NOT NULL;

-- Step 4: Create booking_engine_config for Grand Metropolitan if missing
INSERT INTO booking_engine_config (hotel_id, tenant_id, primary_color, welcome_message, cancellation_policy, check_in_time, check_out_time, currency, active, min_advance_days, max_advance_days, show_room_photos, require_deposit, deposit_percentage, stripe_enabled, payment_mode)
SELECT 
  'e83fbd69-4191-41b4-9651-cdbfd784786d',
  'd25fba30-90ed-45d1-8358-682a95def23c',
  '#1e3a5f',
  'Book directly for the best rates — no booking fees',
  'Free cancellation up to 48 hours before check-in. Late cancellations are charged one night.',
  '14:00',
  '11:00',
  'EUR',
  true,
  0,
  365,
  true,
  true,
  30,
  false,
  'deposit'
WHERE NOT EXISTS (
  SELECT 1 FROM booking_engine_config WHERE hotel_id = 'e83fbd69-4191-41b4-9651-cdbfd784786d'
);

-- Step 5: Seed direct bookings for The Grand Metropolitan
DO $$
DECLARE
  h_id uuid := 'e83fbd69-4191-41b4-9651-cdbfd784786d';
  t_id uuid := 'd25fba30-90ed-45d1-8358-682a95def23c';
  rt_standard uuid := '4f8c4220-28a5-4ad6-b7a5-4cfd165201b0';
  rt_deluxe uuid := 'ecff2955-2711-4ca4-b630-9f68297dae3f';
  rt_family uuid := '277f17ac-f949-468a-82be-15868f551515';
  rt_suite uuid := 'fad9134a-83ae-4de5-a69a-0fbbadfd23ee';
  rt_pres uuid := '1b4b4f0e-a792-46fd-8d8d-3cb8a2bdc4aa';
  tax numeric := 10;
BEGIN
  -- Only seed if no bookings exist for this hotel
  IF EXISTS (SELECT 1 FROM direct_bookings WHERE hotel_id = h_id) THEN
    RETURN;
  END IF;

  INSERT INTO direct_bookings (hotel_id, tenant_id, confirmation_number, room_type_id, guest_name, guest_email, guest_phone, guest_country, check_in, check_out, adults, children, rate_per_night, subtotal, tax_amount, total_amount, deposit_amount, special_requests, status, payment_status, source, created_at)
  VALUES
    (h_id, t_id, 'SW-100201', rt_standard, 'Anna Mueller', 'anna.mueller@web.de', '+49 170 123 4567', 'Germany',
     '2026-04-08', '2026-04-11', 2, 0, 129, 387, 38.70, 425.70, 127.71,
     'Non-smoking room please', 'confirmed', 'paid', 'website', '2026-04-02 09:15:00+00'),

    (h_id, t_id, 'SW-100202', rt_deluxe, 'James Patterson', 'j.patterson@outlook.com', '+44 7700 900123', 'United Kingdom',
     '2026-04-10', '2026-04-13', 2, 0, 199, 597, 59.70, 656.70, 197.01,
     'Late check-in around 22:00', 'confirmed', 'paid', 'website', '2026-04-03 14:22:00+00'),

    (h_id, t_id, 'SW-100203', rt_family, 'Sophie Durand', 'sophie.durand@gmail.com', '+33 6 12 34 56 78', 'France',
     '2026-04-12', '2026-04-16', 2, 2, 249, 996, 99.60, 1095.60, 328.68,
     'Travelling with young children', 'confirmed', 'paid', 'website', '2026-04-04 11:08:00+00'),

    (h_id, t_id, 'SW-100204', rt_suite, 'Marco Rossi', 'marco.rossi@libero.it', '+39 348 123 4567', 'Italy',
     '2026-04-14', '2026-04-17', 2, 0, 349, 1047, 104.70, 1151.70, 345.51,
     'Anniversary — champagne on arrival', 'confirmed', 'pending', 'website', '2026-04-05 16:45:00+00'),

    (h_id, t_id, 'SW-100205', rt_standard, 'Elena Petrov', 'elena.petrov@yandex.ru', '+359 88 123 4567', 'Bulgaria',
     '2026-04-15', '2026-04-17', 1, 0, 129, 258, 25.80, 283.80, 85.14,
     NULL, 'confirmed', 'paid', 'website', '2026-04-06 08:30:00+00'),

    (h_id, t_id, 'SW-100206', rt_pres, 'Henrik Johansson', 'henrik.j@telia.se', '+46 70 123 4567', 'Sweden',
     '2026-04-18', '2026-04-22', 2, 1, 599, 2396, 239.60, 2635.60, 790.68,
     'Airport transfer requested', 'confirmed', 'paid', 'website', '2026-04-07 10:15:00+00'),

    (h_id, t_id, 'SW-100207', rt_deluxe, 'Laura Chen', 'laura.chen@gmail.com', '+1 415 555 0123', 'United States',
     '2026-04-20', '2026-04-24', 2, 0, 199, 796, 79.60, 875.60, 262.68,
     'Quiet room away from elevator', 'confirmed', 'pending', 'website', '2026-04-08 19:40:00+00'),

    -- March (historical)
    (h_id, t_id, 'SW-100108', rt_standard, 'Thomas Weber', 'thomas.weber@gmx.de', '+49 151 234 5678', 'Germany',
     '2026-03-10', '2026-03-13', 2, 0, 129, 387, 38.70, 425.70, 127.71,
     NULL, 'checked_out', 'paid', 'website', '2026-03-02 12:00:00+00'),

    (h_id, t_id, 'SW-100109', rt_suite, 'Charlotte Brown', 'c.brown@email.co.uk', '+44 7911 234 567', 'United Kingdom',
     '2026-03-15', '2026-03-18', 2, 0, 349, 1047, 104.70, 1151.70, 345.51,
     'Early check-in if possible', 'checked_out', 'paid', 'website', '2026-03-05 09:30:00+00'),

    (h_id, t_id, 'SW-100110', rt_deluxe, 'Pierre Leclerc', 'p.leclerc@orange.fr', '+33 7 12 34 56 78', 'France',
     '2026-03-22', '2026-03-25', 2, 0, 199, 597, 59.70, 656.70, 197.01,
     NULL, 'checked_out', 'paid', 'website', '2026-03-12 15:00:00+00'),

    -- May (upcoming)
    (h_id, t_id, 'SW-100301', rt_family, 'Katarina Novak', 'k.novak@seznam.cz', '+420 777 123 456', 'Czech Republic',
     '2026-05-01', '2026-05-05', 2, 2, 249, 996, 99.60, 1095.60, 328.68,
     'Need a crib for infant', 'confirmed', 'pending', 'website', '2026-04-10 14:20:00+00'),

    (h_id, t_id, 'SW-100302', rt_pres, 'William Harris', 'w.harris@gmail.com', '+1 212 555 0456', 'United States',
     '2026-05-10', '2026-05-15', 2, 0, 599, 2995, 299.50, 3294.50, 988.35,
     'Business travel — need good desk and WiFi', 'confirmed', 'pending', 'website', '2026-04-11 22:05:00+00');
END $$;
