/*
  # Seed Demo Hotel Data

  Creates a complete demo hotel with sample data for immediate testing and demonstration.

  ## Contents
  - 1 Demo Hotel: "The Grand Metropolitan" (5-star luxury hotel)
  - 5 Room Types (Standard, Deluxe, Suite, Family, Presidential)
  - 23 Rooms across 5 floors with varied statuses
  - 15 International guests with VIP statuses
  - 20+ Reservations (current, upcoming, and historical)
  - Invoices with line items for completed stays
  - Housekeeping tasks (pending and completed)
  - Maintenance requests
*/

DO $$
DECLARE
  v_hotel_id uuid;
  v_room_type_standard uuid;
  v_room_type_deluxe uuid;
  v_room_type_suite uuid;
  v_room_type_family uuid;
  v_room_type_presidential uuid;
BEGIN
  -- Only seed if database is empty
  IF EXISTS (SELECT 1 FROM hotels LIMIT 1) THEN
    RAISE NOTICE 'Database already contains hotels. Skipping seed data.';
    RETURN;
  END IF;

  -- Create demo hotel
  INSERT INTO hotels (
    name, address, city, country, phone, email, website,
    star_rating, check_in_time, check_out_time, currency, tax_rate
  ) VALUES (
    'The Grand Metropolitan',
    '500 Park Avenue',
    'New York',
    'United States',
    '+1 (212) 555-0100',
    'info@grandmetropolitan.com',
    'https://grandmetropolitan.example.com',
    5,
    '14:00'::time,
    '11:00'::time,
    'USD',
    10.0
  ) RETURNING id INTO v_hotel_id;

  -- Create room types
  INSERT INTO room_types (hotel_id, name, description, base_rate, max_occupancy, bed_type, amenities, image_url)
  VALUES 
    (v_hotel_id, 'Standard', 'Comfortable room with modern amenities', 129, 2, 'Queen', 
     ARRAY['WiFi', 'TV', 'Air Conditioning', 'Safe', 'Hair Dryer'],
     'https://images.pexels.com/photos/271624/pexels-photo-271624.jpeg?auto=compress&cs=tinysrgb&w=600')
  RETURNING id INTO v_room_type_standard;

  INSERT INTO room_types (hotel_id, name, description, base_rate, max_occupancy, bed_type, amenities, image_url)
  VALUES
    (v_hotel_id, 'Deluxe', 'Spacious room with premium furnishings and city view', 199, 2, 'King',
     ARRAY['WiFi', 'TV', 'Air Conditioning', 'Mini Bar', 'Safe', 'Coffee Maker', 'Bathtub'],
     'https://images.pexels.com/photos/164595/pexels-photo-164595.jpeg?auto=compress&cs=tinysrgb&w=600')
  RETURNING id INTO v_room_type_deluxe;

  INSERT INTO room_types (hotel_id, name, description, base_rate, max_occupancy, bed_type, amenities, image_url)
  VALUES
    (v_hotel_id, 'Suite', 'Luxurious suite with separate living area', 349, 3, 'King',
     ARRAY['WiFi', 'TV', 'Air Conditioning', 'Mini Bar', 'Balcony', 'Safe', 'Room Service'],
     'https://images.pexels.com/photos/1743229/pexels-photo-1743229.jpeg?auto=compress&cs=tinysrgb&w=600')
  RETURNING id INTO v_room_type_suite;

  INSERT INTO room_types (hotel_id, name, description, base_rate, max_occupancy, bed_type, amenities, image_url)
  VALUES
    (v_hotel_id, 'Family Room', 'Perfect for families with extra space', 249, 4, 'Twin',
     ARRAY['WiFi', 'TV', 'Air Conditioning', 'Safe', 'Coffee Maker'],
     'https://images.pexels.com/photos/237371/pexels-photo-237371.jpeg?auto=compress&cs=tinysrgb&w=600')
  RETURNING id INTO v_room_type_family;

  INSERT INTO room_types (hotel_id, name, description, base_rate, max_occupancy, bed_type, amenities, image_url)
  VALUES
    (v_hotel_id, 'Presidential Suite', 'The finest accommodation with panoramic views', 599, 4, 'King',
     ARRAY['WiFi', 'TV', 'Air Conditioning', 'Mini Bar', 'Balcony', 'Butler Service'],
     'https://images.pexels.com/photos/1579253/pexels-photo-1579253.jpeg?auto=compress&cs=tinysrgb&w=600')
  RETURNING id INTO v_room_type_presidential;

  -- Create rooms - Floor 1: Standard (8 rooms)
  INSERT INTO rooms (hotel_id, room_type_id, number, floor, status)
  VALUES
    (v_hotel_id, v_room_type_standard, '101', 1, 'occupied'),
    (v_hotel_id, v_room_type_standard, '102', 1, 'occupied'),
    (v_hotel_id, v_room_type_standard, '103', 1, 'occupied'),
    (v_hotel_id, v_room_type_standard, '104', 1, 'available'),
    (v_hotel_id, v_room_type_standard, '105', 1, 'available'),
    (v_hotel_id, v_room_type_standard, '106', 1, 'dirty'),
    (v_hotel_id, v_room_type_standard, '107', 1, 'clean'),
    (v_hotel_id, v_room_type_standard, '108', 1, 'clean');

  -- Floor 2: Deluxe (6 rooms)
  INSERT INTO rooms (hotel_id, room_type_id, number, floor, status)
  VALUES
    (v_hotel_id, v_room_type_deluxe, '201', 2, 'occupied'),
    (v_hotel_id, v_room_type_deluxe, '202', 2, 'occupied'),
    (v_hotel_id, v_room_type_deluxe, '203', 2, 'available'),
    (v_hotel_id, v_room_type_deluxe, '204', 2, 'available'),
    (v_hotel_id, v_room_type_deluxe, '205', 2, 'clean'),
    (v_hotel_id, v_room_type_deluxe, '206', 2, 'clean');

  -- Floor 3: Suites (4 rooms)
  INSERT INTO rooms (hotel_id, room_type_id, number, floor, status)
  VALUES
    (v_hotel_id, v_room_type_suite, '301', 3, 'occupied'),
    (v_hotel_id, v_room_type_suite, '302', 3, 'maintenance'),
    (v_hotel_id, v_room_type_suite, '303', 3, 'available'),
    (v_hotel_id, v_room_type_suite, '304', 3, 'available');

  -- Floor 4: Family rooms (3 rooms)
  INSERT INTO rooms (hotel_id, room_type_id, number, floor, status)
  VALUES
    (v_hotel_id, v_room_type_family, '401', 4, 'occupied'),
    (v_hotel_id, v_room_type_family, '402', 4, 'available'),
    (v_hotel_id, v_room_type_family, '403', 4, 'available');

  -- Floor 5: Presidential suites (2 rooms)
  INSERT INTO rooms (hotel_id, room_type_id, number, floor, status)
  VALUES
    (v_hotel_id, v_room_type_presidential, '501', 5, 'available'),
    (v_hotel_id, v_room_type_presidential, '502', 5, 'occupied');

  -- Create guests
  INSERT INTO guests (hotel_id, first_name, last_name, email, phone, country, city, nationality, vip_status, total_stays, total_spent)
  VALUES
    (v_hotel_id, 'James', 'Wilson', 'james.wilson@email.com', '+1 555-0101', 'United States', 'New York', 'American', 'gold', 12, 8450),
    (v_hotel_id, 'Emma', 'Thompson', 'emma.t@email.com', '+44 20-7946-0958', 'United Kingdom', 'London', 'British', 'platinum', 24, 18200),
    (v_hotel_id, 'Carlos', 'Rivera', 'carlos.r@email.com', '+34 612-345-678', 'Spain', 'Madrid', 'Spanish', 'silver', 6, 3200),
    (v_hotel_id, 'Yuki', 'Tanaka', 'yuki.tanaka@email.com', '+81 90-1234-5678', 'Japan', 'Tokyo', 'Japanese', 'gold', 15, 12800),
    (v_hotel_id, 'Sophie', 'Martin', 'sophie.m@email.com', '+33 6-12-34-56-78', 'France', 'Paris', 'French', 'regular', 2, 980),
    (v_hotel_id, 'Michael', 'Chen', 'michael.chen@email.com', '+86 138-0013-8000', 'China', 'Shanghai', 'Chinese', 'gold', 8, 6700),
    (v_hotel_id, 'Anna', 'Kowalski', 'anna.k@email.com', '+48 512-345-678', 'Poland', 'Warsaw', 'Polish', 'regular', 1, 450),
    (v_hotel_id, 'Ahmed', 'Al-Rashid', 'ahmed.ar@email.com', '+971 50-123-4567', 'UAE', 'Dubai', 'Emirati', 'platinum', 18, 22500),
    (v_hotel_id, 'Lisa', 'Anderson', 'lisa.a@email.com', '+1 555-0202', 'United States', 'Chicago', 'American', 'silver', 5, 2900),
    (v_hotel_id, 'Marco', 'Rossi', 'marco.r@email.com', '+39 333-123-4567', 'Italy', 'Rome', 'Italian', 'regular', 3, 1250),
    (v_hotel_id, 'Sarah', 'O''Brien', 'sarah.ob@email.com', '+353 87-123-4567', 'Ireland', 'Dublin', 'Irish', 'gold', 10, 7800),
    (v_hotel_id, 'Hans', 'Mueller', 'hans.m@email.com', '+49 170-1234567', 'Germany', 'Berlin', 'German', 'regular', 2, 640),
    (v_hotel_id, 'Priya', 'Sharma', 'priya.s@email.com', '+91 98765-43210', 'India', 'Mumbai', 'Indian', 'silver', 4, 2100),
    (v_hotel_id, 'David', 'Kim', 'david.kim@email.com', '+82 10-1234-5678', 'South Korea', 'Seoul', 'Korean', 'regular', 1, 349),
    (v_hotel_id, 'Olivia', 'Brown', 'olivia.b@email.com', '+61 412-345-678', 'Australia', 'Sydney', 'Australian', 'gold', 9, 5600);

  -- Create current reservations (checked-in guests in occupied rooms)
  INSERT INTO reservations (hotel_id, guest_id, room_id, room_type_id, check_in, check_out, adults, children, status, base_rate, total_amount, tax_amount, discount_amount, payment_status, amount_paid, payment_method, booking_source, confirmation_code)
  SELECT 
    v_hotel_id, 
    (SELECT id FROM guests WHERE hotel_id = v_hotel_id ORDER BY random() LIMIT 1),
    r.id, 
    r.room_type_id, 
    CURRENT_DATE - (floor(random() * 2))::int,
    CURRENT_DATE + 2 + (floor(random() * 2))::int,
    1 + (floor(random() * 2))::int,
    0,
    'checked_in',
    rt.base_rate,
    rt.base_rate * 3 + (rt.base_rate * 3 * 0.1),
    rt.base_rate * 3 * 0.1,
    0,
    CASE WHEN random() > 0.3 THEN 'paid' ELSE 'partial' END,
    CASE WHEN random() > 0.3 THEN rt.base_rate * 3 + (rt.base_rate * 3 * 0.1) ELSE (rt.base_rate * 3 + (rt.base_rate * 3 * 0.1)) * 0.5 END,
    'credit_card',
    (ARRAY['website', 'direct', 'booking.com'])[1 + floor(random() * 3)::int],
    'GRM' || upper(substring(md5(random()::text) from 1 for 6))
  FROM rooms r
  JOIN room_types rt ON rt.id = r.room_type_id
  WHERE r.hotel_id = v_hotel_id AND r.status = 'occupied'
  LIMIT 6;

  -- Create upcoming reservations
  INSERT INTO reservations (hotel_id, guest_id, room_id, room_type_id, check_in, check_out, adults, children, status, base_rate, total_amount, tax_amount, discount_amount, payment_status, amount_paid, payment_method, booking_source, confirmation_code)
  SELECT
    v_hotel_id,
    g.id,
    r.id,
    r.room_type_id,
    CURRENT_DATE + 1 + (row_number() OVER ())::int,
    CURRENT_DATE + 4 + (row_number() OVER ())::int,
    2, 0,
    CASE WHEN row_number() OVER () <= 4 THEN 'confirmed' ELSE 'pending' END,
    rt.base_rate,
    rt.base_rate * 3 + (rt.base_rate * 3 * 0.1),
    rt.base_rate * 3 * 0.1,
    0,
    CASE WHEN row_number() OVER () <= 2 THEN 'paid' ELSE 'pending' END,
    CASE WHEN row_number() OVER () <= 2 THEN rt.base_rate * 3 + (rt.base_rate * 3 * 0.1) ELSE 0 END,
    CASE WHEN row_number() OVER () <= 2 THEN 'credit_card' ELSE '' END,
    'website',
    'GRM' || upper(substring(md5(random()::text) from 1 for 6))
  FROM 
    (SELECT id, room_type_id FROM rooms WHERE hotel_id = v_hotel_id AND status = 'available' ORDER BY random() LIMIT 6) r
  JOIN room_types rt ON rt.id = r.room_type_id
  CROSS JOIN (SELECT id FROM guests WHERE hotel_id = v_hotel_id ORDER BY random() LIMIT 1) g;

  -- Create historical reservations with invoices
  WITH historical_reservations AS (
    INSERT INTO reservations (hotel_id, guest_id, room_id, room_type_id, check_in, check_out, adults, children, status, base_rate, total_amount, tax_amount, discount_amount, payment_status, amount_paid, payment_method, booking_source, confirmation_code, cancellation_reason)
    SELECT
      v_hotel_id,
      (SELECT id FROM guests WHERE hotel_id = v_hotel_id ORDER BY random() LIMIT 1),
      (SELECT id FROM rooms WHERE hotel_id = v_hotel_id ORDER BY random() LIMIT 1),
      rt.id,
      CURRENT_DATE - 45 + (row_number() OVER ())::int,
      CURRENT_DATE - 42 + (row_number() OVER ())::int,
      2, 0,
      CASE WHEN row_number() OVER () <= 8 THEN 'checked_out' ELSE 'cancelled' END,
      rt.base_rate,
      rt.base_rate * 3 + (rt.base_rate * 3 * 0.1),
      rt.base_rate * 3 * 0.1,
      0,
      CASE WHEN row_number() OVER () <= 8 THEN 'paid' ELSE 'pending' END,
      CASE WHEN row_number() OVER () <= 8 THEN rt.base_rate * 3 + (rt.base_rate * 3 * 0.1) ELSE 0 END,
      CASE WHEN row_number() OVER () <= 8 THEN 'credit_card' ELSE '' END,
      'booking.com',
      'GRM' || upper(substring(md5(random()::text) from 1 for 6)),
      CASE WHEN row_number() OVER () > 8 THEN 'Change of plans' ELSE '' END
    FROM room_types rt
    WHERE rt.hotel_id = v_hotel_id
    LIMIT 10
    RETURNING id, guest_id, room_type_id, total_amount, tax_amount, check_in
  ), invoices_insert AS (
    INSERT INTO invoices (hotel_id, reservation_id, guest_id, invoice_number, issue_date, due_date, subtotal, tax_amount, discount_amount, total_amount, amount_paid, status)
    SELECT
      v_hotel_id,
      hr.id,
      hr.guest_id,
      'INV-' || to_char(CURRENT_DATE, 'YYYY') || '-' || LPAD((1000 + row_number() OVER ())::text, 4, '0'),
      hr.check_in,
      hr.check_in + 3,
      hr.total_amount - hr.tax_amount,
      hr.tax_amount,
      0,
      hr.total_amount,
      hr.total_amount,
      'paid'
    FROM historical_reservations hr
    LIMIT 8
    RETURNING id, subtotal, (SELECT room_type_id FROM historical_reservations LIMIT 1) as room_type_id
  )
  INSERT INTO invoice_items (invoice_id, description, category, quantity, unit_price, total_price)
  SELECT 
    ii.id,
    rt.name || ' Room',
    'room',
    1,
    ii.subtotal,
    ii.subtotal
  FROM invoices_insert ii
  CROSS JOIN (SELECT name FROM room_types WHERE hotel_id = v_hotel_id LIMIT 1) rt;

  -- Create housekeeping tasks
  INSERT INTO housekeeping_tasks (hotel_id, room_id, task_type, priority, status, assigned_to, completed_at)
  SELECT
    v_hotel_id,
    r.id,
    'clean',
    'normal',
    CASE WHEN r.status = 'clean' THEN 'completed' ELSE 'pending' END,
    (ARRAY['Maria Garcia', 'John Smith', 'Ana Lopez'])[1 + (row_number() OVER () % 3)::int],
    CASE WHEN r.status = 'clean' THEN (CURRENT_DATE || ' 10:00:00')::timestamptz ELSE NULL END
  FROM rooms r
  WHERE r.hotel_id = v_hotel_id AND r.status IN ('dirty', 'clean');

  -- Create maintenance requests
  INSERT INTO maintenance_requests (hotel_id, room_id, description, priority, status, assigned_to, cost)
  VALUES
    (v_hotel_id, (SELECT id FROM rooms WHERE hotel_id = v_hotel_id AND status = 'maintenance' LIMIT 1), 
     'Air conditioning unit making unusual noise', 'high', 'in_progress', 'Mike Johnson', 150),
    (v_hotel_id, (SELECT id FROM rooms WHERE hotel_id = v_hotel_id LIMIT 1), 
     'Bathroom faucet dripping', 'medium', 'reported', '', 0);

  RAISE NOTICE 'Demo hotel data seeded successfully! Hotel ID: %', v_hotel_id;
END $$;
