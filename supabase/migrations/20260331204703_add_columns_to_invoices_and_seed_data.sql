/*
  # Add Missing Columns to invoices and Seed Demo Data

  ## Summary
  Adds all required new columns to the existing invoices table, then seeds
  invoice_settings and 6 demo invoices with line items.
*/

-- ── Add missing columns to invoices ───────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='invoices' AND column_name='type') THEN
    ALTER TABLE invoices ADD COLUMN type text DEFAULT 'invoice';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='invoices' AND column_name='guest_name') THEN
    ALTER TABLE invoices ADD COLUMN guest_name text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='invoices' AND column_name='guest_email') THEN
    ALTER TABLE invoices ADD COLUMN guest_email text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='invoices' AND column_name='guest_address') THEN
    ALTER TABLE invoices ADD COLUMN guest_address text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='invoices' AND column_name='guest_city') THEN
    ALTER TABLE invoices ADD COLUMN guest_city text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='invoices' AND column_name='guest_country') THEN
    ALTER TABLE invoices ADD COLUMN guest_country text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='invoices' AND column_name='guest_vat_number') THEN
    ALTER TABLE invoices ADD COLUMN guest_vat_number text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='invoices' AND column_name='booking_reference') THEN
    ALTER TABLE invoices ADD COLUMN booking_reference text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='invoices' AND column_name='service_date_from') THEN
    ALTER TABLE invoices ADD COLUMN service_date_from date;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='invoices' AND column_name='service_date_to') THEN
    ALTER TABLE invoices ADD COLUMN service_date_to date;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='invoices' AND column_name='currency') THEN
    ALTER TABLE invoices ADD COLUMN currency text DEFAULT 'EUR';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='invoices' AND column_name='discount_type') THEN
    ALTER TABLE invoices ADD COLUMN discount_type text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='invoices' AND column_name='discount_value') THEN
    ALTER TABLE invoices ADD COLUMN discount_value numeric(10,2) DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='invoices' AND column_name='tax_rate') THEN
    ALTER TABLE invoices ADD COLUMN tax_rate numeric(5,2) DEFAULT 20;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='invoices' AND column_name='paid_amount') THEN
    ALTER TABLE invoices ADD COLUMN paid_amount numeric(10,2) DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='invoices' AND column_name='internal_notes') THEN
    ALTER TABLE invoices ADD COLUMN internal_notes text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='invoices' AND column_name='sent_at') THEN
    ALTER TABLE invoices ADD COLUMN sent_at timestamptz;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='invoices' AND column_name='paid_at') THEN
    ALTER TABLE invoices ADD COLUMN paid_at timestamptz;
  END IF;
END $$;

-- ── Seed invoice_settings ─────────────────────────────────────────────────
INSERT INTO invoice_settings (hotel_id, hotel_name, hotel_address, hotel_vat_number, hotel_registration_number, hotel_email, hotel_phone, hotel_website, invoice_prefix, default_tax_rate, default_currency, payment_terms_days, footer_text, bank_name, bank_iban, bank_swift)
SELECT
  h.id,
  h.name,
  COALESCE(h.address, '123 Main Street'),
  'PT123456789',
  'RC/2020/12345',
  COALESCE(h.email, 'billing@hotel.com'),
  COALESCE(h.phone, '+351 213 456 789'),
  'www.hotel.com',
  'INV',
  23,
  'EUR',
  14,
  'Thank you for choosing us. Payment is due within 14 days. Please include the invoice number as the payment reference.',
  'Banco Comercial Português',
  'PT50 0033 0000 4523 4567 3054 1',
  'BCOMPTPL'
FROM hotels h
WHERE NOT EXISTS (SELECT 1 FROM invoice_settings WHERE hotel_id = h.id)
LIMIT 1;

-- ── Seed demo invoices ─────────────────────────────────────────────────────
DO $$
DECLARE
  v_hotel_id uuid;
  v_guest_id uuid;
  v_inv1 uuid; v_inv2 uuid; v_inv3 uuid;
  v_inv4 uuid; v_inv5 uuid; v_inv6 uuid;
BEGIN
  SELECT id INTO v_hotel_id FROM hotels LIMIT 1;
  SELECT id INTO v_guest_id FROM guests WHERE hotel_id = v_hotel_id LIMIT 1;
  IF v_hotel_id IS NULL OR v_guest_id IS NULL THEN RETURN; END IF;

  IF EXISTS (SELECT 1 FROM invoices WHERE hotel_id = v_hotel_id AND guest_name <> '' AND guest_name IS NOT NULL LIMIT 1) THEN
    RETURN;
  END IF;

  INSERT INTO invoices (hotel_id, guest_id, invoice_number, type, guest_name, guest_email, guest_address, guest_city, guest_country, issue_date, due_date, service_date_from, service_date_to, status, currency, subtotal, tax_rate, tax_amount, discount_amount, total_amount, paid_amount, notes, paid_at)
  VALUES (v_hotel_id, v_guest_id, 'INV-2026-0001','invoice','Emma Johansson','emma.j@email.com','Kungsgatan 12','Stockholm','Sweden','2026-03-01','2026-03-15','2026-03-01','2026-03-05','paid','EUR',450.00,23,103.50,0,553.50,553.50,'Thank you for your stay!',now() - interval '10 days')
  RETURNING id INTO v_inv1;

  INSERT INTO invoice_line_items (hotel_id, invoice_id, description, category, quantity, unit, unit_price, tax_rate, line_total, sort_order)
  VALUES
    (v_hotel_id, v_inv1, 'Deluxe Room — 3 nights', 'accommodation', 3, 'night', 120.00, 23, 360.00, 0),
    (v_hotel_id, v_inv1, 'Breakfast (3 days)', 'food_beverage', 3, 'person', 18.00, 23, 54.00, 1),
    (v_hotel_id, v_inv1, 'Airport Transfer', 'transport', 1, 'service', 36.00, 23, 36.00, 2);

  INSERT INTO invoices (hotel_id, guest_id, invoice_number, type, guest_name, guest_email, guest_address, guest_city, guest_country, issue_date, due_date, service_date_from, service_date_to, status, currency, subtotal, tax_rate, tax_amount, discount_amount, total_amount, paid_amount, notes, sent_at)
  VALUES (v_hotel_id, v_guest_id, 'INV-2026-0002','invoice','Marco Ricci','marco.ricci@corp.it','Via Roma 45','Milan','Italy','2026-03-05','2026-03-19','2026-03-03','2026-03-08','overdue','EUR',680.00,22,149.60,0,829.60,0,'Payment due upon receipt. Bank transfer preferred.',now() - interval '25 days')
  RETURNING id INTO v_inv2;

  INSERT INTO invoice_line_items (hotel_id, invoice_id, description, category, quantity, unit, unit_price, tax_rate, line_total, sort_order)
  VALUES
    (v_hotel_id, v_inv2, 'Superior Suite — 5 nights', 'accommodation', 5, 'night', 120.00, 22, 600.00, 0),
    (v_hotel_id, v_inv2, 'Mini-bar charges', 'food_beverage', 1, 'service', 48.00, 22, 48.00, 1),
    (v_hotel_id, v_inv2, 'Spa treatment (60 min)', 'spa', 1, 'session', 32.00, 22, 32.00, 2);

  INSERT INTO invoices (hotel_id, guest_id, invoice_number, type, guest_name, guest_email, guest_address, guest_city, guest_country, issue_date, due_date, service_date_from, service_date_to, status, currency, subtotal, tax_rate, tax_amount, discount_amount, total_amount, paid_amount, notes, sent_at)
  VALUES (v_hotel_id, v_guest_id, 'INV-2026-0003','invoice','Claire Dupont','claire.dupont@email.fr','14 Rue de la Paix','Paris','France','2026-03-15','2026-03-29','2026-03-12','2026-03-16','sent','EUR',320.00,20,64.00,20,364.00,0,'Corporate rate applied. PO-2026-447.',now() - interval '5 days')
  RETURNING id INTO v_inv3;

  INSERT INTO invoice_line_items (hotel_id, invoice_id, description, category, quantity, unit, unit_price, tax_rate, line_total, sort_order)
  VALUES
    (v_hotel_id, v_inv3, 'Standard Room — 4 nights', 'accommodation', 4, 'night', 75.00, 20, 300.00, 0),
    (v_hotel_id, v_inv3, 'Parking (4 days)', 'parking', 4, 'day', 5.00, 20, 20.00, 1);

  INSERT INTO invoices (hotel_id, guest_id, invoice_number, type, guest_name, guest_email, guest_address, guest_city, guest_country, issue_date, due_date, status, currency, subtotal, tax_rate, tax_amount, discount_amount, total_amount, paid_amount, notes)
  VALUES (v_hotel_id, v_guest_id, 'INV-2026-0004','proforma','Tech Solutions GmbH','billing@techsolutions.de','Friedrichstraße 100','Berlin','Germany','2026-03-20','2026-04-03','draft','EUR',1200.00,19,228.00,0,1428.00,0,'Pro-forma invoice for conference block booking.')
  RETURNING id INTO v_inv4;

  INSERT INTO invoice_line_items (hotel_id, invoice_id, description, category, quantity, unit, unit_price, tax_rate, line_total, sort_order)
  VALUES
    (v_hotel_id, v_inv4, 'Conference Room (full day)', 'meeting', 2, 'day', 350.00, 19, 700.00, 0),
    (v_hotel_id, v_inv4, 'Deluxe Room block — 4 nights', 'accommodation', 4, 'night', 120.00, 19, 480.00, 1),
    (v_hotel_id, v_inv4, 'Catering (20 pax)', 'food_beverage', 1, 'service', 20.00, 19, 20.00, 2);

  INSERT INTO invoices (hotel_id, guest_id, invoice_number, type, guest_name, guest_email, guest_address, guest_city, guest_country, issue_date, due_date, service_date_from, service_date_to, status, currency, subtotal, tax_rate, tax_amount, discount_amount, total_amount, paid_amount, notes, paid_at)
  VALUES (v_hotel_id, v_guest_id, 'REC-2026-0001','receipt','Lena Hoffmann','lena.h@email.de','Hauptstraße 7','Munich','Germany','2026-03-22','2026-03-22','2026-03-20','2026-03-22','paid','EUR',180.00,19,34.20,0,214.20,214.20,'Payment received. Thank you!',now() - interval '2 days')
  RETURNING id INTO v_inv5;

  INSERT INTO invoice_line_items (hotel_id, invoice_id, description, category, quantity, unit, unit_price, tax_rate, line_total, sort_order)
  VALUES
    (v_hotel_id, v_inv5, 'Standard Room — 2 nights', 'accommodation', 2, 'night', 75.00, 19, 150.00, 0),
    (v_hotel_id, v_inv5, 'Late check-out fee', 'service', 1, 'service', 30.00, 19, 30.00, 1);

  INSERT INTO invoices (hotel_id, guest_id, invoice_number, type, guest_name, guest_email, issue_date, due_date, status, currency, subtotal, discount_type, discount_value, discount_amount, tax_rate, tax_amount, total_amount, paid_amount, notes)
  VALUES (v_hotel_id, v_guest_id, 'INV-2026-0006','invoice','James Wilson','j.wilson@email.com','2026-03-28','2026-04-11','draft','EUR',240.00,'fixed',24,24,20,43.20,259.20,0,'Loyalty discount applied.')
  RETURNING id INTO v_inv6;

  INSERT INTO invoice_line_items (hotel_id, invoice_id, description, category, quantity, unit, unit_price, tax_rate, discount_pct, line_total, sort_order)
  VALUES
    (v_hotel_id, v_inv6, 'Deluxe Room — 2 nights', 'accommodation', 2, 'night', 120.00, 20, 10, 216.00, 0),
    (v_hotel_id, v_inv6, 'Welcome drink', 'food_beverage', 2, 'person', 12.00, 20, 0, 24.00, 1);

END $$;
