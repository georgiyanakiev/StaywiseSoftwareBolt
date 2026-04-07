/*
  # Seed DoubleTree Chester Invoices, Line Items & Payments

  ## Summary
  DoubleTree by Hilton Chester had no invoices, so the accountant's Billing page
  showed €0 across all stats. This migration creates:
  1. One invoice per checked-out reservation (status: paid) 
  2. Line items for each invoice (room accommodation + VAT)
  3. In-house invoices (status: sent, partial payment) for current guests
  4. A few upcoming invoices (status: draft) for confirmed bookings
  5. Payment ledger records for all paid invoices

  ## Notes
  - Currency is GBP (£) for this UK hotel
  - VAT rate used matches existing reservation tax data
*/

DO $$
DECLARE
  v_hotel_id  uuid := '1a176f97-b4be-4a37-83de-3c23b6be58c0';
  v_tenant_id uuid := '727eae23-8c48-473b-845f-33b38310d8b2';

  -- Guest IDs (from previous seed)
  g_sarah     uuid := '84758075-3bb1-4789-a78e-c38196a96bbc';
  g_charlotte uuid := '0f7e2901-b0fa-44df-b013-ffccc79da9d0';
  g_george    uuid := 'c171b742-6320-4105-81c2-8d56f9c1ce4b';
  g_emma      uuid := '08fa679a-e359-4f92-abe8-8b6d18c5b394';
  g_benjamin  uuid := '51e7ae15-3e28-43c8-a323-e07e36b0fb63';
  g_oliver    uuid := '853f39f7-5416-4ac9-b686-43ff4b150a7c';
  g_henry     uuid := '61e9e38e-ccae-43e7-8cb6-d3949e7549c6';
  g_edward    uuid := 'b7d26145-6831-4b4d-89e8-7f0a68dc36d8';
  g_amelia    uuid := '12c88fc5-aba3-4fb1-b0a7-1acac916f0fa';
  g_james     uuid := '6c63e792-8276-4212-a9a5-c4150794a7ca';
  g_william   uuid := 'bb28ac85-65f9-411b-b89b-6477866a6416';
  g_thomas    uuid := '9fbeca4d-6ac9-430c-b580-7846c19a3ab4';
  g_isabelle  uuid;
  g_grace     uuid;

  -- Reservation IDs (checked_out)
  r_dtc_2026_007 uuid := '7f5b08ac-24db-4432-8a43-2264453b5460';
  r_dtc_2026_006 uuid := 'c7842010-5f68-4c5d-aef8-85d3ac11f409';
  r_dtc_2026_005 uuid := '1054aa08-6f63-4ff8-a92b-ce57a8c26487';
  r_dtc_2026_004 uuid := 'c635cd9b-49be-42a2-8f26-09db510b7dfd';
  r_dtc_2026_003 uuid := '105e1bf0-84d5-431e-9e15-5bb117de9c4a';
  r_dtc_2026_002 uuid := 'e8d2e367-c64b-45bb-ad35-0b04acf4a438';
  r_dtc_2026_001 uuid := 'e9567df3-eb85-4ebe-ae03-424e0c4be1ae';
  r_dtc_2025_010 uuid := '4527c071-d61e-4f14-a394-9da491ca75bf';
  r_dtc_2025_009 uuid := 'b2b3d05b-b2b7-4887-ae3d-e67356787288';
  r_dtc_2025_008 uuid := 'c4f26437-87a3-45d5-86c3-5d63c00f0442';
  r_dtc_2025_007 uuid := 'ad7a6dbb-9fad-43c8-a4bb-95dbebd05b7c';
  r_dtc_2025_006 uuid := '0aa1d31a-8844-4cc5-a338-09ee8587d173';
  r_dtc_2025_005 uuid := 'cef143e8-2b65-4b5a-8cba-662ea7ee2758';
  r_dtc_2025_004 uuid := '91d489d4-d63e-4fc7-83ed-ac21430f4645';
  r_dtc_2025_003 uuid := '46bc2f6c-5fab-4b8d-808e-547b0d8b1d2d';

  -- Current in-house reservation IDs
  r_inhouse_isabelle uuid;
  r_inhouse_william  uuid;
  r_inhouse_grace    uuid;

  -- Invoice IDs (for cross-referencing line items + payments)
  inv RECORD;
  inv_id uuid;

BEGIN

  -- Resolve current in-house guests & reservations
  SELECT g.id INTO g_isabelle FROM guests g WHERE g.email = 'i.crompton@yahoo.co.uk' AND g.hotel_id = v_hotel_id;
  SELECT g.id INTO g_grace    FROM guests g WHERE g.email = 'g.pemberton@outlook.com' AND g.hotel_id = v_hotel_id;
  SELECT r.id INTO r_inhouse_isabelle FROM reservations r WHERE r.confirmation_code = 'DTC-2026-008';
  SELECT r.id INTO r_inhouse_william  FROM reservations r WHERE r.confirmation_code = 'DTC-2026-009';
  SELECT r.id INTO r_inhouse_grace    FROM reservations r WHERE r.confirmation_code = 'DTC-2026-010';

  -- ============================================================
  -- INVOICES
  -- ============================================================
  INSERT INTO invoices (
    hotel_id, tenant_id, guest_id, reservation_id,
    invoice_number, type, currency,
    guest_name, guest_email, guest_address, guest_city, guest_country,
    issue_date, due_date,
    subtotal, tax_amount, discount_amount, total_amount,
    amount_paid, paid_amount,
    status, paid_at, notes
  )
  VALUES
    -- PAID — Checked-out stays 2025
    (v_hotel_id, v_tenant_id, g_henry,     r_dtc_2025_003, 'DTC-INV-2025-001', 'invoice', 'GBP', 'Henry Ashworth',      'h.ashworth@email.co.uk',     '6 Northgate Street, Chester', 'Chester',    'United Kingdom', '2025-08-04','2025-08-18', 181.27, 17.37, 0, 198.64, 198.64, 198.64, 'paid', '2025-08-04 14:00:00+00', 'Standard Double, 2 nights'),
    (v_hotel_id, v_tenant_id, g_oliver,    r_dtc_2025_004, 'DTC-INV-2025-002', 'invoice', 'GBP', 'Oliver Prescott',     'o.prescott@outlook.com',      '3 Water Street, Liverpool',   'Liverpool',  'United Kingdom', '2025-09-07','2025-09-21', 242.21, 23.15, 0, 265.36, 265.36, 265.36, 'paid', '2025-09-07 11:30:00+00', 'Deluxe King, 2 nights'),
    (v_hotel_id, v_tenant_id, g_thomas,    r_dtc_2025_005, 'DTC-INV-2025-003', 'invoice', 'GBP', 'Thomas Caldwell',     't.caldwell@hotmail.co.uk',    '1 Fargate, Sheffield',        'Sheffield',  'United Kingdom', '2025-09-22','2025-10-06', 181.27, 17.37, 0, 198.64, 198.64, 198.64, 'paid', '2025-09-22 12:00:00+00', 'Standard Double, 2 nights'),
    (v_hotel_id, v_tenant_id, g_george,    r_dtc_2025_006, 'DTC-INV-2025-004', 'invoice', 'GBP', 'George Whitmore',     'g.whitmore@hotmail.co.uk',    '1 Grey Street, Newcastle',    'Newcastle',  'United Kingdom', '2025-10-05','2025-10-19', 385.04, 36.88, 0, 421.92, 421.92, 421.92, 'paid', '2025-10-05 10:45:00+00', 'Junior Suite, 2 nights. Anniversary stay.'),
    (v_hotel_id, v_tenant_id, g_william,   r_dtc_2025_007, 'DTC-INV-2025-005', 'invoice', 'GBP', 'William Hargreaves',  'w.hargreaves@email.co.uk',    '10 Colmore Row, Birmingham',  'Birmingham', 'United Kingdom', '2025-10-30','2025-11-13', 303.39, 29.09, 0, 332.48, 332.48, 332.48, 'paid', '2025-10-30 09:00:00+00', 'Executive King, 2 nights. Corporate — Hargreaves & Sons Ltd.'),
    (v_hotel_id, v_tenant_id, g_james,     r_dtc_2025_008, 'DTC-INV-2025-006', 'invoice', 'GBP', 'James Whitfield',     'j.whitfield@email.co.uk',     '14 Bridge Street, Chester',   'Chester',    'United Kingdom', '2025-11-14','2025-11-28', 242.21, 23.15, 0, 265.36, 265.36, 265.36, 'paid', '2025-11-14 15:00:00+00', 'Deluxe King, 2 nights'),
    (v_hotel_id, v_tenant_id, g_amelia,    r_dtc_2025_009, 'DTC-INV-2025-007', 'invoice', 'GBP', 'Amelia Sutton',       'a.sutton@email.co.uk',        '22 Baker Street, London',     'London',     'United Kingdom', '2025-11-27','2025-12-11', 181.27, 17.37, 0, 198.64, 198.64, 198.64, 'paid', '2025-11-27 11:00:00+00', 'Standard Double, 2 nights. Nut allergy noted.'),
    (v_hotel_id, v_tenant_id, g_edward,    r_dtc_2025_010, 'DTC-INV-2025-008', 'invoice', 'GBP', 'Edward Davenport',    'e.davenport@gmail.com',       '12 O''Connell Street, Dublin','Dublin',     'Ireland',        '2025-12-10','2025-12-24', 303.39, 29.09, 0, 332.48, 332.48, 332.48, 'paid', '2025-12-10 14:00:00+00', 'Executive King, 2 nights. Corporate travel.'),
    -- PAID — 2026 Q1
    (v_hotel_id, v_tenant_id, g_henry,     r_dtc_2026_001, 'DTC-INV-2026-001', 'invoice', 'GBP', 'Henry Ashworth',      'h.ashworth@email.co.uk',     '6 Northgate Street, Chester', 'Chester',    'United Kingdom', '2026-01-16','2026-01-30', 90.63,  8.69,  0, 99.32,  99.32,  99.32,  'paid', '2026-01-16 10:00:00+00', 'Standard Double, 1 night'),
    (v_hotel_id, v_tenant_id, g_oliver,    r_dtc_2026_002, 'DTC-INV-2026-002', 'invoice', 'GBP', 'Oliver Prescott',     'o.prescott@outlook.com',      '3 Water Street, Liverpool',   'Liverpool',  'United Kingdom', '2026-01-31','2026-02-14', 362.59, 34.73, 0, 397.32, 397.32, 397.32, 'paid', '2026-01-31 12:00:00+00', 'Deluxe King, 3 nights'),
    (v_hotel_id, v_tenant_id, g_benjamin,  r_dtc_2026_003, 'DTC-INV-2026-003', 'invoice', 'GBP', 'Benjamin Fairfax',    'b.fairfax@gmail.com',         '5 Corn Street, Bristol',      'Bristol',    'United Kingdom', '2026-02-16','2026-03-02', 181.27, 17.37, 0, 198.64, 198.64, 198.64, 'paid', '2026-02-16 14:00:00+00', 'Standard Double, 2 nights'),
    (v_hotel_id, v_tenant_id, g_emma,      r_dtc_2026_004, 'DTC-INV-2026-004', 'invoice', 'GBP', 'Emma Thornton',       'e.thornton@yahoo.co.uk',      '52 Park Row, Leeds',          'Leeds',      'United Kingdom', '2026-02-22','2026-03-08', 385.04, 36.88, 0, 421.92, 421.92, 421.92, 'paid', '2026-02-22 11:30:00+00', 'Junior Suite, 2 nights. Anniversary.'),
    (v_hotel_id, v_tenant_id, g_george,    r_dtc_2026_005, 'DTC-INV-2026-005', 'invoice', 'GBP', 'George Whitmore',     'g.whitmore@hotmail.co.uk',    '1 Grey Street, Newcastle',    'Newcastle',  'United Kingdom', '2026-03-05','2026-03-19', 303.39, 29.09, 0, 332.48, 332.48, 332.48, 'paid', '2026-03-05 12:00:00+00', 'Executive King, 2 nights. Rewards member — acknowledged.'),
    (v_hotel_id, v_tenant_id, g_charlotte, r_dtc_2026_006, 'DTC-INV-2026-006', 'invoice', 'GBP', 'Charlotte Blackwood', 'c.blackwood@gmail.com',       '8 Eastgate Street, Chester',  'Chester',    'United Kingdom', '2026-03-20','2026-04-03', 242.21, 23.15, 0, 265.36, 265.36, 265.36, 'paid', '2026-03-20 14:00:00+00', 'Deluxe King, 2 nights'),
    (v_hotel_id, v_tenant_id, g_sarah,     r_dtc_2026_007, 'DTC-INV-2026-007', 'receipt', 'GBP', 'Sarah Hutchinson',    's.hutchinson@gmail.com',      '7 Deansgate, Manchester',     'Manchester', 'United Kingdom', '2026-03-29','2026-04-12', 90.63,  8.69,  0, 99.32,  99.32,  99.32,  'paid', '2026-03-29 11:00:00+00', 'Standard Double, 1 night. Gluten-free breakfast arranged.'),
    -- IN-HOUSE (sent / partial)
    (v_hotel_id, v_tenant_id, g_isabelle,  r_inhouse_isabelle, 'DTC-INV-2026-008', 'invoice', 'GBP', 'Isabelle Crompton', 'i.crompton@yahoo.co.uk',    '17 Princes Street, Edinburgh','Edinburgh',  'United Kingdom', '2026-04-06','2026-04-20', 303.39, 29.09, 0, 332.48, 166.24, 166.24, 'sent', NULL, 'Executive King, 2 nights. Partial payment at check-in.'),
    (v_hotel_id, v_tenant_id, g_william,   r_inhouse_william,  'DTC-INV-2026-009', 'invoice', 'GBP', 'William Hargreaves', 'w.hargreaves@email.co.uk',  '10 Colmore Row, Birmingham',  'Birmingham', 'United Kingdom', '2026-04-05','2026-04-19', 606.78, 58.18, 20, 644.96, 322.48, 322.48, 'sent', NULL, 'Executive King, 4 nights. Corporate — Hargreaves & Sons Ltd. 20% discount applied.'),
    (v_hotel_id, v_tenant_id, g_grace,     r_inhouse_grace,    'DTC-INV-2026-010', 'invoice', 'GBP', 'Grace Pemberton',   'g.pemberton@outlook.com',   '3 St Mary Street, Cardiff',   'Cardiff',    'United Kingdom', '2026-04-07','2026-04-21', 577.56, 55.32, 0, 632.88, 0,      0,      'draft', NULL, 'Junior Suite, 3 nights. Payment pending.');

  -- ============================================================
  -- INVOICE LINE ITEMS (invoice_items — used by BillingPage)
  -- ============================================================
  FOR inv IN
    SELECT id, guest_id, reservation_id, subtotal, tax_amount, discount_amount, total_amount,
           invoice_number, notes
    FROM invoices
    WHERE hotel_id = v_hotel_id
      AND NOT EXISTS (SELECT 1 FROM invoice_items ii WHERE ii.invoice_id = invoices.id)
  LOOP
    INSERT INTO invoice_items (invoice_id, description, category, quantity, unit_price, total_price)
    SELECT
      inv.id,
      'Accommodation — ' || rt.name || ' (' || (r.check_out - r.check_in) || ' night' ||
        CASE WHEN (r.check_out - r.check_in) > 1 THEN 's' ELSE '' END || ')',
      'room',
      (r.check_out - r.check_in),
      rt.base_rate,
      rt.base_rate * (r.check_out - r.check_in)
    FROM reservations r
    JOIN room_types rt ON rt.id = r.room_type_id
    WHERE r.id = inv.reservation_id;

    -- Add VAT line item
    INSERT INTO invoice_items (invoice_id, description, category, quantity, unit_price, total_price)
    VALUES (inv.id, 'VAT (20%)', 'other', 1, inv.tax_amount, inv.tax_amount);

    -- Add discount line if applicable
    IF inv.discount_amount > 0 THEN
      INSERT INTO invoice_items (invoice_id, description, category, quantity, unit_price, total_price)
      VALUES (inv.id, 'Corporate discount', 'other', 1, -inv.discount_amount, -inv.discount_amount);
    END IF;
  END LOOP;

  -- ============================================================
  -- PAYMENT LEDGER — one record per paid invoice
  -- ============================================================
  INSERT INTO payments (
    hotel_id, tenant_id, invoice_id, guest_id, reservation_id,
    amount, payment_method, payment_date, notes, processed_by
  )
  SELECT
    i.hotel_id,
    i.tenant_id,
    i.id,
    i.guest_id,
    i.reservation_id,
    i.amount_paid,
    CASE WHEN i.notes ILIKE '%corporate%' THEN 'bank_transfer' ELSE 'credit_card' END,
    i.paid_at,
    'Settled at check-out',
    'Front Desk'
  FROM invoices i
  WHERE i.hotel_id = v_hotel_id
    AND i.status = 'paid'
    AND i.amount_paid > 0
    AND NOT EXISTS (SELECT 1 FROM payments p WHERE p.invoice_id = i.id);

  -- Partial payment for in-house guests
  INSERT INTO payments (
    hotel_id, tenant_id, invoice_id, guest_id, reservation_id,
    amount, payment_method, payment_date, notes, processed_by
  )
  SELECT
    i.hotel_id,
    i.tenant_id,
    i.id,
    i.guest_id,
    i.reservation_id,
    i.amount_paid,
    'credit_card',
    now() - interval '1 day',
    'Pre-authorisation at check-in',
    'Front Desk'
  FROM invoices i
  WHERE i.hotel_id = v_hotel_id
    AND i.status = 'sent'
    AND i.amount_paid > 0
    AND NOT EXISTS (SELECT 1 FROM payments p WHERE p.invoice_id = i.id);

END $$;
