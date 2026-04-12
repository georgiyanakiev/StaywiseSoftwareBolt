/*
  # Seed digital check-in arrivals and portal sessions for DoubleTree Chester

  1. New Data
    - Creates 12 guests with today/tomorrow arrivals
    - Creates portal sessions with varied completion states
    - Preserves existing sessions that have form dependencies

  2. Important Notes
    - Does NOT delete existing sessions (FK constraint with pre_arrival_forms)
    - Uses DTC-2026-1xx codes to avoid conflicts
*/

-- Only delete sessions that don't have pre_arrival_forms referencing them
DELETE FROM guest_portal_sessions 
WHERE token LIKE 'dtc_tok_%'
  AND id NOT IN (SELECT session_id FROM pre_arrival_forms WHERE session_id IS NOT NULL);

DELETE FROM reservations WHERE confirmation_code LIKE 'DTC-2026-1__'
  AND hotel_id = '1a176f97-b4be-4a37-83de-3c23b6be58c0';

DO $$
DECLARE
  h_id uuid := '1a176f97-b4be-4a37-83de-3c23b6be58c0';
  t_id uuid := '727eae23-8c48-473b-845f-33b38310d8b2';
  today date := CURRENT_DATE;
  tomorrow date := CURRENT_DATE + 1;
  g_id uuid;
  r_id uuid;
BEGIN
  -- 1: Today - completed
  INSERT INTO guests (hotel_id, first_name, last_name, email, phone) VALUES (h_id, 'Emma', 'Richardson', 'emma.richardson@gmail.com', '+44 7700 100201') ON CONFLICT DO NOTHING RETURNING id INTO g_id;
  IF g_id IS NULL THEN SELECT id INTO g_id FROM guests WHERE email = 'emma.richardson@gmail.com' AND hotel_id = h_id; END IF;
  INSERT INTO reservations (id, hotel_id, guest_id, room_id, room_type_id, check_in, check_out, status, confirmation_code, source, adults, children, total_amount)
  VALUES (gen_random_uuid(), h_id, g_id, 'dddf117d-41f6-4310-a815-d51f0e0a4513', 'e0e83702-41ee-4738-859c-8e66d0f69955', today, today+3, 'confirmed', 'DTC-2026-120', 'direct', 2, 0, 327.00) RETURNING id INTO r_id;
  INSERT INTO guest_portal_sessions (hotel_id, tenant_id, reservation_id, guest_email, guest_name, token, expires_at, completed_at, step_completed, created_at)
  VALUES (h_id, t_id, r_id, 'emma.richardson@gmail.com', 'Emma Richardson', 'dtc_tok_er_120', today+3, now()-interval '2 hours', 5, now()-interval '1 day');

  -- 2: Today - partial step 3
  INSERT INTO guests (hotel_id, first_name, last_name, email, phone) VALUES (h_id, 'David', 'Thornton', 'd.thornton@outlook.com', '+44 7700 100202') ON CONFLICT DO NOTHING RETURNING id INTO g_id;
  IF g_id IS NULL THEN SELECT id INTO g_id FROM guests WHERE email = 'd.thornton@outlook.com' AND hotel_id = h_id; END IF;
  INSERT INTO reservations (id, hotel_id, guest_id, room_id, room_type_id, check_in, check_out, status, confirmation_code, source, adults, children, total_amount)
  VALUES (gen_random_uuid(), h_id, g_id, '328d5435-1112-40fb-9d28-c3ead58808fc', 'e0e83702-41ee-4738-859c-8e66d0f69955', today, today+2, 'confirmed', 'DTC-2026-121', 'booking.com', 1, 0, 218.00) RETURNING id INTO r_id;
  INSERT INTO guest_portal_sessions (hotel_id, tenant_id, reservation_id, guest_email, guest_name, token, expires_at, completed_at, step_completed, created_at)
  VALUES (h_id, t_id, r_id, 'd.thornton@outlook.com', 'David Thornton', 'dtc_tok_dt_121', today+2, NULL, 3, now()-interval '6 hours');

  -- 3: Today - link sent
  INSERT INTO guests (hotel_id, first_name, last_name, email, phone) VALUES (h_id, 'Sophie', 'Clarke', 'sophie.clarke@yahoo.co.uk', '+44 7700 100203') ON CONFLICT DO NOTHING RETURNING id INTO g_id;
  IF g_id IS NULL THEN SELECT id INTO g_id FROM guests WHERE email = 'sophie.clarke@yahoo.co.uk' AND hotel_id = h_id; END IF;
  INSERT INTO reservations (id, hotel_id, guest_id, room_id, room_type_id, check_in, check_out, status, confirmation_code, source, adults, children, total_amount)
  VALUES (gen_random_uuid(), h_id, g_id, '43c7dec4-34b0-414d-b246-8709c13369b9', '28df7212-29da-48fe-85fd-0c024595dc7a', today, today+4, 'confirmed', 'DTC-2026-122', 'expedia', 2, 1, 436.00) RETURNING id INTO r_id;
  INSERT INTO guest_portal_sessions (hotel_id, tenant_id, reservation_id, guest_email, guest_name, token, expires_at, completed_at, step_completed, created_at)
  VALUES (h_id, t_id, r_id, 'sophie.clarke@yahoo.co.uk', 'Sophie Clarke', 'dtc_tok_sc_122', today+4, NULL, 0, now()-interval '12 hours');

  -- 4: Today - completed
  INSERT INTO guests (hotel_id, first_name, last_name, email, phone) VALUES (h_id, 'Robert', 'Ainsworth', 'r.ainsworth@btinternet.com', '+44 7700 100204') ON CONFLICT DO NOTHING RETURNING id INTO g_id;
  IF g_id IS NULL THEN SELECT id INTO g_id FROM guests WHERE email = 'r.ainsworth@btinternet.com' AND hotel_id = h_id; END IF;
  INSERT INTO reservations (id, hotel_id, guest_id, room_id, room_type_id, check_in, check_out, status, confirmation_code, source, adults, children, total_amount)
  VALUES (gen_random_uuid(), h_id, g_id, 'a7fe1db2-baf7-4e7a-af6e-942dbc8ae8ff', 'd04a2a12-53e6-4af3-a8aa-57478904099b', today, today+2, 'confirmed', 'DTC-2026-123', 'direct', 2, 0, 278.00) RETURNING id INTO r_id;
  INSERT INTO guest_portal_sessions (hotel_id, tenant_id, reservation_id, guest_email, guest_name, token, expires_at, completed_at, step_completed, created_at)
  VALUES (h_id, t_id, r_id, 'r.ainsworth@btinternet.com', 'Robert Ainsworth', 'dtc_tok_ra_123', today+2, now()-interval '30 minutes', 5, now()-interval '8 hours');

  -- 5: Today - no link sent
  INSERT INTO guests (hotel_id, first_name, last_name, email, phone) VALUES (h_id, 'Hannah', 'Mercer', 'hannah.mercer@gmail.com', '+44 7700 100205') ON CONFLICT DO NOTHING RETURNING id INTO g_id;
  IF g_id IS NULL THEN SELECT id INTO g_id FROM guests WHERE email = 'hannah.mercer@gmail.com' AND hotel_id = h_id; END IF;
  INSERT INTO reservations (hotel_id, guest_id, room_id, room_type_id, check_in, check_out, status, confirmation_code, source, adults, children, total_amount)
  VALUES (h_id, g_id, '8cd7434b-e251-4eb2-8afa-2886caa1d304', '77523a7b-80c7-49b1-8da6-282e8749d863', today, today+1, 'confirmed', 'DTC-2026-124', 'direct', 1, 0, 175.00);

  -- 6: Today - partial step 2
  INSERT INTO guests (hotel_id, first_name, last_name, email, phone) VALUES (h_id, 'Michael', 'Brennan', 'm.brennan@protonmail.com', '+44 7700 100206') ON CONFLICT DO NOTHING RETURNING id INTO g_id;
  IF g_id IS NULL THEN SELECT id INTO g_id FROM guests WHERE email = 'm.brennan@protonmail.com' AND hotel_id = h_id; END IF;
  INSERT INTO reservations (id, hotel_id, guest_id, room_id, room_type_id, check_in, check_out, status, confirmation_code, source, adults, children, total_amount)
  VALUES (gen_random_uuid(), h_id, g_id, '4558dd13-4455-48db-88d6-20dac47c813f', '77523a7b-80c7-49b1-8da6-282e8749d863', today, today+3, 'confirmed', 'DTC-2026-125', 'booking.com', 2, 0, 525.00) RETURNING id INTO r_id;
  INSERT INTO guest_portal_sessions (hotel_id, tenant_id, reservation_id, guest_email, guest_name, token, expires_at, completed_at, step_completed, created_at)
  VALUES (h_id, t_id, r_id, 'm.brennan@protonmail.com', 'Michael Brennan', 'dtc_tok_mb_125', today+3, NULL, 2, now()-interval '4 hours');

  -- 7: Today - link sent
  INSERT INTO guests (hotel_id, first_name, last_name, email, phone) VALUES (h_id, 'Charlotte', 'Henley', 'c.henley@icloud.com', '+44 7700 100207') ON CONFLICT DO NOTHING RETURNING id INTO g_id;
  IF g_id IS NULL THEN SELECT id INTO g_id FROM guests WHERE email = 'c.henley@icloud.com' AND hotel_id = h_id; END IF;
  INSERT INTO reservations (id, hotel_id, guest_id, room_id, room_type_id, check_in, check_out, status, confirmation_code, source, adults, children, total_amount)
  VALUES (gen_random_uuid(), h_id, g_id, '62bb47ca-f942-415e-9d21-7d327bb1e502', '28df7212-29da-48fe-85fd-0c024595dc7a', today, today+2, 'confirmed', 'DTC-2026-126', 'direct', 2, 0, 218.00) RETURNING id INTO r_id;
  INSERT INTO guest_portal_sessions (hotel_id, tenant_id, reservation_id, guest_email, guest_name, token, expires_at, completed_at, step_completed, created_at)
  VALUES (h_id, t_id, r_id, 'c.henley@icloud.com', 'Charlotte Henley', 'dtc_tok_ch_126', today+2, NULL, 0, now()-interval '10 hours');

  -- 8: Today - completed
  INSERT INTO guests (hotel_id, first_name, last_name, email, phone) VALUES (h_id, 'Oliver', 'Farnsworth', 'oliver.farnsworth@gmail.com', '+44 7700 100208') ON CONFLICT DO NOTHING RETURNING id INTO g_id;
  IF g_id IS NULL THEN SELECT id INTO g_id FROM guests WHERE email = 'oliver.farnsworth@gmail.com' AND hotel_id = h_id; END IF;
  INSERT INTO reservations (id, hotel_id, guest_id, room_id, room_type_id, check_in, check_out, status, confirmation_code, source, adults, children, total_amount)
  VALUES (gen_random_uuid(), h_id, g_id, '08cb2305-610c-47df-b147-195334b44e42', 'd04a2a12-53e6-4af3-a8aa-57478904099b', today, today+5, 'confirmed', 'DTC-2026-127', 'direct', 2, 2, 695.00) RETURNING id INTO r_id;
  INSERT INTO guest_portal_sessions (hotel_id, tenant_id, reservation_id, guest_email, guest_name, token, expires_at, completed_at, step_completed, created_at)
  VALUES (h_id, t_id, r_id, 'oliver.farnsworth@gmail.com', 'Oliver Farnsworth', 'dtc_tok_of_127', today+5, now()-interval '3 hours', 5, now()-interval '1 day');

  -- 9: Tomorrow - link sent
  INSERT INTO guests (hotel_id, first_name, last_name, email, phone) VALUES (h_id, 'Grace', 'Pemberton', 'grace.pemberton@outlook.com', '+44 7700 100209') ON CONFLICT DO NOTHING RETURNING id INTO g_id;
  IF g_id IS NULL THEN SELECT id INTO g_id FROM guests WHERE email = 'grace.pemberton@outlook.com' AND hotel_id = h_id; END IF;
  INSERT INTO reservations (id, hotel_id, guest_id, room_id, room_type_id, check_in, check_out, status, confirmation_code, source, adults, children, total_amount)
  VALUES (gen_random_uuid(), h_id, g_id, '32aa5634-7902-4593-9f5f-2042993c382d', 'e0e83702-41ee-4738-859c-8e66d0f69955', tomorrow, tomorrow+2, 'confirmed', 'DTC-2026-128', 'direct', 1, 0, 218.00) RETURNING id INTO r_id;
  INSERT INTO guest_portal_sessions (hotel_id, tenant_id, reservation_id, guest_email, guest_name, token, expires_at, completed_at, step_completed, created_at)
  VALUES (h_id, t_id, r_id, 'grace.pemberton@outlook.com', 'Grace Pemberton', 'dtc_tok_gp_128', tomorrow+2, NULL, 0, now()-interval '2 hours');

  -- 10: Tomorrow - partial step 1
  INSERT INTO guests (hotel_id, first_name, last_name, email, phone) VALUES (h_id, 'William', 'Bancroft', 'w.bancroft@gmail.com', '+44 7700 100210') ON CONFLICT DO NOTHING RETURNING id INTO g_id;
  IF g_id IS NULL THEN SELECT id INTO g_id FROM guests WHERE email = 'w.bancroft@gmail.com' AND hotel_id = h_id; END IF;
  INSERT INTO reservations (id, hotel_id, guest_id, room_id, room_type_id, check_in, check_out, status, confirmation_code, source, adults, children, total_amount)
  VALUES (gen_random_uuid(), h_id, g_id, '4d725ca3-1127-49cf-8f1a-0ab4d72342eb', '28df7212-29da-48fe-85fd-0c024595dc7a', tomorrow, tomorrow+3, 'confirmed', 'DTC-2026-129', 'expedia', 2, 0, 327.00) RETURNING id INTO r_id;
  INSERT INTO guest_portal_sessions (hotel_id, tenant_id, reservation_id, guest_email, guest_name, token, expires_at, completed_at, step_completed, created_at)
  VALUES (h_id, t_id, r_id, 'w.bancroft@gmail.com', 'William Bancroft', 'dtc_tok_wb_129', tomorrow+3, NULL, 1, now()-interval '1 hour');

  -- 11: Tomorrow - no link sent
  INSERT INTO guests (hotel_id, first_name, last_name, email, phone) VALUES (h_id, 'Isabelle', 'Greyson', 'isabelle.greyson@live.co.uk', '+44 7700 100211') ON CONFLICT DO NOTHING RETURNING id INTO g_id;
  IF g_id IS NULL THEN SELECT id INTO g_id FROM guests WHERE email = 'isabelle.greyson@live.co.uk' AND hotel_id = h_id; END IF;
  INSERT INTO reservations (hotel_id, guest_id, room_id, room_type_id, check_in, check_out, status, confirmation_code, source, adults, children, total_amount)
  VALUES (h_id, g_id, 'a0a490df-970a-46db-b45e-bf030fea5746', '77523a7b-80c7-49b1-8da6-282e8749d863', tomorrow, tomorrow+2, 'confirmed', 'DTC-2026-130', 'direct', 2, 0, 350.00);

  -- 12: Tomorrow - link sent
  INSERT INTO guests (hotel_id, first_name, last_name, email, phone) VALUES (h_id, 'Edward', 'Kirby', 'ed.kirby@gmail.com', '+44 7700 100212') ON CONFLICT DO NOTHING RETURNING id INTO g_id;
  IF g_id IS NULL THEN SELECT id INTO g_id FROM guests WHERE email = 'ed.kirby@gmail.com' AND hotel_id = h_id; END IF;
  INSERT INTO reservations (id, hotel_id, guest_id, room_id, room_type_id, check_in, check_out, status, confirmation_code, source, adults, children, total_amount)
  VALUES (gen_random_uuid(), h_id, g_id, '21b032ed-295b-429e-9d97-982d1dd6870a', '28df7212-29da-48fe-85fd-0c024595dc7a', tomorrow, tomorrow+1, 'confirmed', 'DTC-2026-131', 'booking.com', 1, 0, 109.00) RETURNING id INTO r_id;
  INSERT INTO guest_portal_sessions (hotel_id, tenant_id, reservation_id, guest_email, guest_name, token, expires_at, completed_at, step_completed, created_at)
  VALUES (h_id, t_id, r_id, 'ed.kirby@gmail.com', 'Edward Kirby', 'dtc_tok_ek_131', tomorrow+1, NULL, 0, now()-interval '30 minutes');
END $$;
