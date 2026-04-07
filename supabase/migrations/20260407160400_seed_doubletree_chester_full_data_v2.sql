/*
  # Seed DoubleTree by Hilton Chester — Full Hotel Data (v2)

  ## Summary
  DoubleTree by Hilton Chester had no operational data (no rooms, guests, or reservations),
  making the CRM and all front-desk views empty for the pilot hotel.

  ## Changes
  1. Creates 4 room types and 20 rooms (Standard Double, Deluxe King, Executive King, Junior Suite).
  2. Inserts 15 UK guests — the auto_create_guest_profile trigger creates their CRM profiles.
  3. Creates 30 reservations (historical, current, upcoming).
  4. Reservation trigger syncs total_stays/total_spent/loyalty_tier into guest_profiles.
  5. Populates guest_stay_history for all checked_out reservations.
*/

DO $$
DECLARE
  v_hotel_id   uuid := '1a176f97-b4be-4a37-83de-3c23b6be58c0';
  v_tenant_id  uuid := '727eae23-8c48-473b-845f-33b38310d8b2';

  rt_std   uuid := gen_random_uuid();
  rt_dlx   uuid := gen_random_uuid();
  rt_exec  uuid := gen_random_uuid();
  rt_suite uuid := gen_random_uuid();

  r101 uuid := gen_random_uuid(); r102 uuid := gen_random_uuid();
  r103 uuid := gen_random_uuid(); r104 uuid := gen_random_uuid();
  r105 uuid := gen_random_uuid();
  r201 uuid := gen_random_uuid(); r202 uuid := gen_random_uuid();
  r203 uuid := gen_random_uuid(); r204 uuid := gen_random_uuid();
  r205 uuid := gen_random_uuid();
  r301 uuid := gen_random_uuid(); r302 uuid := gen_random_uuid();
  r303 uuid := gen_random_uuid(); r304 uuid := gen_random_uuid();
  r305 uuid := gen_random_uuid();
  r401 uuid := gen_random_uuid(); r402 uuid := gen_random_uuid();
  r403 uuid := gen_random_uuid(); r404 uuid := gen_random_uuid();
  r405 uuid := gen_random_uuid();

  g1  uuid := gen_random_uuid(); g2  uuid := gen_random_uuid();
  g3  uuid := gen_random_uuid(); g4  uuid := gen_random_uuid();
  g5  uuid := gen_random_uuid(); g6  uuid := gen_random_uuid();
  g7  uuid := gen_random_uuid(); g8  uuid := gen_random_uuid();
  g9  uuid := gen_random_uuid(); g10 uuid := gen_random_uuid();
  g11 uuid := gen_random_uuid(); g12 uuid := gen_random_uuid();
  g13 uuid := gen_random_uuid(); g14 uuid := gen_random_uuid();
  g15 uuid := gen_random_uuid();

BEGIN

  -- ROOM TYPES
  INSERT INTO room_types (id, hotel_id, name, description, base_rate, max_occupancy, amenities)
  VALUES
    (rt_std,   v_hotel_id, 'Standard Double',  'Comfortable double room with en-suite bathroom, flat-screen TV, and tea/coffee facilities.',       89,  2, ARRAY['Free WiFi','Flat-screen TV','Tea & Coffee','En-suite Bathroom','Air Conditioning']),
    (rt_dlx,   v_hotel_id, 'Deluxe King',      'Spacious king room with upgraded bedding, rainfall shower, and city or courtyard views.',          119, 2, ARRAY['Free WiFi','King Bed','Rainfall Shower','Mini Bar','Flat-screen TV','Air Conditioning']),
    (rt_exec,  v_hotel_id, 'Executive King',   'Executive floor access with lounge benefits, premium toiletries, and panoramic Chester views.',    149, 2, ARRAY['Free WiFi','Executive Lounge Access','King Bed','Nespresso Machine','Bathrobe','Premium Toiletries']),
    (rt_suite, v_hotel_id, 'Junior Suite',     'Separate living area, walk-in wardrobe, spa bath, and complimentary welcome amenities.',           189, 3, ARRAY['Free WiFi','Separate Living Area','Spa Bath','Walk-in Wardrobe','Welcome Amenities','Butler Service']);

  -- ROOMS (column is "number" not "room_number")
  INSERT INTO rooms (id, hotel_id, number, room_type_id, floor, status)
  VALUES
    (r101, v_hotel_id, '101', rt_std,   1, 'available'),
    (r102, v_hotel_id, '102', rt_std,   1, 'available'),
    (r103, v_hotel_id, '103', rt_std,   1, 'available'),
    (r104, v_hotel_id, '104', rt_std,   1, 'available'),
    (r105, v_hotel_id, '105', rt_std,   1, 'cleaning'),
    (r201, v_hotel_id, '201', rt_dlx,   2, 'available'),
    (r202, v_hotel_id, '202', rt_dlx,   2, 'available'),
    (r203, v_hotel_id, '203', rt_dlx,   2, 'occupied'),
    (r204, v_hotel_id, '204', rt_dlx,   2, 'available'),
    (r205, v_hotel_id, '205', rt_dlx,   2, 'available'),
    (r301, v_hotel_id, '301', rt_exec,  3, 'available'),
    (r302, v_hotel_id, '302', rt_exec,  3, 'occupied'),
    (r303, v_hotel_id, '303', rt_exec,  3, 'available'),
    (r304, v_hotel_id, '304', rt_exec,  3, 'available'),
    (r305, v_hotel_id, '305', rt_exec,  3, 'maintenance'),
    (r401, v_hotel_id, '401', rt_suite, 4, 'available'),
    (r402, v_hotel_id, '402', rt_suite, 4, 'occupied'),
    (r403, v_hotel_id, '403', rt_suite, 4, 'available'),
    (r404, v_hotel_id, '404', rt_suite, 4, 'available'),
    (r405, v_hotel_id, '405', rt_suite, 4, 'available');

  -- GUESTS (auto_create_guest_profile trigger fires on each insert)
  INSERT INTO guests (id, hotel_id, first_name, last_name, email, phone, mobile, nationality, country, city, address, postal_code, date_of_birth, notes, email_opt_in, sms_opt_in, total_stays, total_spent)
  VALUES
    (g1,  v_hotel_id, 'James',     'Whitfield',     'j.whitfield@email.co.uk',    '+44 1244 823401', '+44 7700 900101', 'British', 'United Kingdom', 'Chester',    '14 Bridge Street',    'CH1 1NQ', '1982-03-15', 'Prefers high floor rooms.',                             true,  true,  0, 0),
    (g2,  v_hotel_id, 'Sarah',     'Hutchinson',    's.hutchinson@gmail.com',     '+44 1244 823402', '+44 7700 900102', 'British', 'United Kingdom', 'Manchester', '7 Deansgate',         'M3 2BW',  '1990-07-22', 'Gluten-free diet required.',                            true,  false, 0, 0),
    (g3,  v_hotel_id, 'Oliver',    'Prescott',      'o.prescott@outlook.com',     '+44 1244 823403', '+44 7700 900103', 'British', 'United Kingdom', 'Liverpool',  '3 Water Street',      'L2 8TD',  '1978-11-08', 'Repeat guest — familiar with the team.',                true,  true,  0, 0),
    (g4,  v_hotel_id, 'Emma',      'Thornton',      'e.thornton@yahoo.co.uk',     '+44 1244 823404', '+44 7700 900104', 'British', 'United Kingdom', 'Leeds',      '52 Park Row',         'LS1 1HY', '1995-04-30', 'Celebrating anniversary.',                              true,  false, 0, 0),
    (g5,  v_hotel_id, 'William',   'Hargreaves',    'w.hargreaves@email.co.uk',   '+44 1244 823405', '+44 7700 900105', 'British', 'United Kingdom', 'Birmingham', '10 Colmore Row',      'B3 2QD',  '1968-09-12', 'VIP corporate account — Hargreaves & Sons Ltd.',        false, false, 0, 0),
    (g6,  v_hotel_id, 'Charlotte', 'Blackwood',     'c.blackwood@gmail.com',      '+44 1244 823406', '+44 7700 900106', 'British', 'United Kingdom', 'Chester',    '8 Eastgate Street',   'CH1 1LG', '1987-01-25', '',                                                      true,  true,  0, 0),
    (g7,  v_hotel_id, 'Thomas',    'Caldwell',      't.caldwell@hotmail.co.uk',   '+44 1244 823407', '+44 7700 900107', 'British', 'United Kingdom', 'Sheffield',  '1 Fargate',           'S1 2HE',  '1975-06-18', 'Late check-out requested when possible.',                true,  false, 0, 0),
    (g8,  v_hotel_id, 'Amelia',    'Sutton',        'a.sutton@email.co.uk',       '+44 1244 823408', '+44 7700 900108', 'British', 'United Kingdom', 'London',     '22 Baker Street',     'W1U 3BW', '1993-12-03', 'Nut allergy — flag for restaurant.',                    true,  true,  0, 0),
    (g9,  v_hotel_id, 'Benjamin',  'Fairfax',       'b.fairfax@gmail.com',        '+44 1244 823409', '+44 7700 900109', 'British', 'United Kingdom', 'Bristol',    '5 Corn Street',       'BS1 1HT', '1985-08-14', '',                                                      true,  false, 0, 0),
    (g10, v_hotel_id, 'Isabelle',  'Crompton',      'i.crompton@yahoo.co.uk',     '+44 1244 823410', '+44 7700 900110', 'British', 'United Kingdom', 'Edinburgh',  '17 Princes Street',   'EH2 2BY', '1991-02-09', 'Travelling for work — needs quiet room.',                false, false, 0, 0),
    (g11, v_hotel_id, 'Henry',     'Ashworth',      'h.ashworth@email.co.uk',     '+44 1244 823411', '+44 7700 900111', 'British', 'United Kingdom', 'Chester',    '6 Northgate Street',  'CH1 2HQ', '1960-05-27', 'Long-standing local guest.',                            true,  false, 0, 0),
    (g12, v_hotel_id, 'Grace',     'Pemberton',     'g.pemberton@outlook.com',    '+44 1244 823412', '+44 7700 900112', 'British', 'United Kingdom', 'Cardiff',    '3 St Mary Street',    'CF10 1AT','1997-10-16', '',                                                      true,  true,  0, 0),
    (g13, v_hotel_id, 'Edward',    'Davenport',     'e.davenport@gmail.com',      '+44 1244 823413', '+44 7700 900113', 'Irish',   'Ireland',        'Dublin',     '12 O''Connell Street','D01 F5P2','1983-07-04', 'Travelling from Dublin for business.',                   true,  false, 0, 0),
    (g14, v_hotel_id, 'Lucy',      'Hollingsworth', 'l.hollingsworth@email.co.uk','+44 1244 823414', '+44 7700 900114', 'British', 'United Kingdom', 'Oxford',     '4 High Street',       'OX1 4BJ', '1989-03-21', 'Dietary: vegetarian.',                                  true,  true,  0, 0),
    (g15, v_hotel_id, 'George',    'Whitmore',      'g.whitmore@hotmail.co.uk',   '+44 1244 823415', '+44 7700 900115', 'British', 'United Kingdom', 'Newcastle',  '1 Grey Street',       'NE1 6EE', '1972-11-30', 'Rewards member — acknowledge on arrival.',               true,  false, 0, 0);

  -- RESERVATIONS (reservation trigger fires to sync stats into guest_profiles)
  INSERT INTO reservations (hotel_id, guest_id, room_id, room_type_id, check_in, check_out, adults, children, status, base_rate, total_amount, tax_amount, discount_amount, payment_status, amount_paid, payment_method, booking_source, special_requests, confirmation_code)
  VALUES
    -- 2025 historical
    (v_hotel_id, g3,  r201, rt_dlx,  '2025-06-10','2025-06-12', 2, 0, 'checked_out', 119, 265.36, 23.15, 0,  'paid',    265.36, 'credit_card',   'direct',     '',                              'DTC-2025-001'),
    (v_hotel_id, g5,  r301, rt_exec, '2025-07-14','2025-07-16', 1, 0, 'checked_out', 149, 332.48, 29.09, 10, 'paid',    332.48, 'credit_card',   'corporate',  'Early check-in if possible.',   'DTC-2025-002'),
    (v_hotel_id, g11, r101, rt_std,  '2025-08-02','2025-08-04', 2, 0, 'checked_out', 89,  198.64, 17.37, 0,  'paid',    198.64, 'credit_card',   'direct',     '',                              'DTC-2025-003'),
    (v_hotel_id, g3,  r202, rt_dlx,  '2025-09-05','2025-09-07', 2, 0, 'checked_out', 119, 265.36, 23.15, 0,  'paid',    265.36, 'credit_card',   'direct',     '',                              'DTC-2025-004'),
    (v_hotel_id, g7,  r103, rt_std,  '2025-09-20','2025-09-22', 1, 0, 'checked_out', 89,  198.64, 17.37, 0,  'paid',    198.64, 'debit_card',    'booking.com','Late check-out if available.',  'DTC-2025-005'),
    (v_hotel_id, g15, r401, rt_suite,'2025-10-03','2025-10-05', 2, 0, 'checked_out', 189, 421.92, 36.88, 0,  'paid',    421.92, 'credit_card',   'direct',     'Anniversary stay — flowers.',   'DTC-2025-006'),
    (v_hotel_id, g5,  r302, rt_exec, '2025-10-28','2025-10-30', 1, 0, 'checked_out', 149, 332.48, 29.09, 10, 'paid',    332.48, 'credit_card',   'corporate',  '',                              'DTC-2025-007'),
    (v_hotel_id, g1,  r204, rt_dlx,  '2025-11-12','2025-11-14', 2, 0, 'checked_out', 119, 265.36, 23.15, 0,  'paid',    265.36, 'credit_card',   'direct',     'High floor preferred.',         'DTC-2025-008'),
    (v_hotel_id, g8,  r102, rt_std,  '2025-11-25','2025-11-27', 1, 0, 'checked_out', 89,  198.64, 17.37, 0,  'paid',    198.64, 'credit_card',   'expedia',    'Nut allergy — flag kitchen.',   'DTC-2025-009'),
    (v_hotel_id, g13, r303, rt_exec, '2025-12-08','2025-12-10', 2, 0, 'checked_out', 149, 332.48, 29.09, 0,  'paid',    332.48, 'bank_transfer', 'direct',     '',                              'DTC-2025-010'),
    -- 2026 Q1
    (v_hotel_id, g11, r104, rt_std,  '2026-01-15','2026-01-16', 1, 0, 'checked_out', 89,  99.32,  8.69,  0,  'paid',    99.32,  'credit_card',   'direct',     '',                              'DTC-2026-001'),
    (v_hotel_id, g3,  r201, rt_dlx,  '2026-01-28','2026-01-31', 2, 0, 'checked_out', 119, 397.32, 34.73, 0,  'paid',    397.32, 'credit_card',   'direct',     '',                              'DTC-2026-002'),
    (v_hotel_id, g9,  r105, rt_std,  '2026-02-14','2026-02-16', 2, 1, 'checked_out', 89,  198.64, 17.37, 0,  'paid',    198.64, 'debit_card',    'booking.com','',                              'DTC-2026-003'),
    (v_hotel_id, g4,  r402, rt_suite,'2026-02-20','2026-02-22', 2, 0, 'checked_out', 189, 421.92, 36.88, 0,  'paid',    421.92, 'credit_card',   'direct',     'Anniversary — champagne.',      'DTC-2026-004'),
    (v_hotel_id, g15, r301, rt_exec, '2026-03-03','2026-03-05', 1, 0, 'checked_out', 149, 332.48, 29.09, 0,  'paid',    332.48, 'credit_card',   'direct',     'Rewards member acknowledged.',  'DTC-2026-005'),
    (v_hotel_id, g6,  r203, rt_dlx,  '2026-03-18','2026-03-20', 2, 0, 'checked_out', 119, 265.36, 23.15, 0,  'paid',    265.36, 'credit_card',   'direct',     '',                              'DTC-2026-006'),
    (v_hotel_id, g2,  r101, rt_std,  '2026-03-28','2026-03-29', 1, 0, 'checked_out', 89,  99.32,  8.69,  0,  'paid',    99.32,  'credit_card',   'direct',     'Gluten-free breakfast.',        'DTC-2026-007'),
    -- Current in-house
    (v_hotel_id, g10, r302, rt_exec, '2026-04-06','2026-04-08', 1, 0, 'checked_in',  149, 332.48, 29.09, 0,  'partial', 166.24, 'credit_card',   'direct',     'Quiet room requested.',         'DTC-2026-008'),
    (v_hotel_id, g5,  r303, rt_exec, '2026-04-05','2026-04-09', 1, 0, 'checked_in',  149, 664.96, 58.18, 20, 'partial', 332.48, 'credit_card',   'corporate',  '',                              'DTC-2026-009'),
    (v_hotel_id, g12, r402, rt_suite,'2026-04-07','2026-04-10', 2, 0, 'checked_in',  189, 632.88, 55.32, 0,  'pending', 0,      'credit_card',   'direct',     '',                              'DTC-2026-010'),
    -- Upcoming
    (v_hotel_id, g1,  r201, rt_dlx,  '2026-04-12','2026-04-14', 2, 0, 'confirmed',   119, 265.36, 23.15, 0,  'pending', 0,      'credit_card',   'direct',     'High floor preferred.',         'DTC-2026-011'),
    (v_hotel_id, g14, r102, rt_std,  '2026-04-14','2026-04-16', 1, 0, 'confirmed',   89,  198.64, 17.37, 0,  'pending', 0,      'credit_card',   'booking.com','Vegetarian meals.',             'DTC-2026-012'),
    (v_hotel_id, g7,  r204, rt_dlx,  '2026-04-18','2026-04-21', 1, 0, 'confirmed',   119, 397.32, 34.73, 0,  'partial', 100,    'credit_card',   'direct',     'Late check-out requested.',     'DTC-2026-013'),
    (v_hotel_id, g11, r103, rt_std,  '2026-04-22','2026-04-23', 2, 0, 'confirmed',   89,  99.32,  8.69,  0,  'pending', 0,      'debit_card',    'direct',     '',                              'DTC-2026-014'),
    (v_hotel_id, g3,  r301, rt_exec, '2026-04-25','2026-04-28', 2, 0, 'confirmed',   149, 497.52, 43.53, 0,  'pending', 0,      'credit_card',   'direct',     '',                              'DTC-2026-015'),
    (v_hotel_id, g8,  r401, rt_suite,'2026-05-02','2026-05-05', 2, 0, 'confirmed',   189, 632.88, 55.32, 0,  'pending', 0,      'credit_card',   'expedia',    'Nut allergy — inform kitchen.',  'DTC-2026-016'),
    (v_hotel_id, g15, r202, rt_dlx,  '2026-05-08','2026-05-10', 1, 0, 'confirmed',   119, 265.36, 23.15, 0,  'pending', 0,      'credit_card',   'direct',     '',                              'DTC-2026-017'),
    (v_hotel_id, g13, r304, rt_exec, '2026-05-15','2026-05-17', 2, 0, 'confirmed',   149, 332.48, 29.09, 0,  'pending', 0,      'bank_transfer', 'direct',     '',                              'DTC-2026-018'),
    (v_hotel_id, g4,  r403, rt_suite,'2026-05-22','2026-05-24', 2, 0, 'confirmed',   189, 421.92, 36.88, 0,  'pending', 0,      'credit_card',   'direct',     '',                              'DTC-2026-019'),
    (v_hotel_id, g6,  r205, rt_dlx,  '2026-05-29','2026-05-31', 2, 0, 'confirmed',   119, 265.36, 23.15, 0,  'pending', 0,      'credit_card',   'direct',     '',                              'DTC-2026-020');

  -- GUEST STAY HISTORY (for checked_out reservations only)
  INSERT INTO guest_stay_history (
    hotel_id, tenant_id, guest_profile_id, booking_id,
    room_number, room_type, check_in, check_out, nights,
    total_amount, source, special_requests, rating
  )
  SELECT
    r.hotel_id,
    v_tenant_id,
    gp.id,
    r.id,
    rm.number,
    rt.name,
    r.check_in,
    r.check_out,
    (r.check_out - r.check_in),
    r.total_amount,
    r.booking_source,
    NULLIF(r.special_requests, ''),
    CASE WHEN random() > 0.3 THEN (4 + floor(random() * 2))::integer ELSE NULL END
  FROM reservations r
  JOIN guest_profiles gp  ON gp.guest_id = r.guest_id
  JOIN rooms rm            ON rm.id = r.room_id
  JOIN room_types rt       ON rt.id = r.room_type_id
  WHERE r.hotel_id = v_hotel_id
    AND r.status = 'checked_out';

END $$;
