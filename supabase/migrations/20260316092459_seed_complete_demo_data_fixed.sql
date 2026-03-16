/*
  # Seed Complete Demo Data (Fixed)

  1. Room Types
  2. Rooms
  3. Guests
  4. Reservations
  5. Invoices
  6. Housekeeping Tasks
  
  Provides complete demo data for testing all features
*/

DO $$
DECLARE
  v_hotel_id uuid;
  v_standard_type_id uuid;
  v_deluxe_type_id uuid;
  v_suite_type_id uuid;
  v_guest1_id uuid;
  v_guest2_id uuid;
  v_guest3_id uuid;
  v_room1_id uuid;
  v_room2_id uuid;
  v_room3_id uuid;
  v_reservation1_id uuid;
  v_invoice1_id uuid;
BEGIN
  -- Get hotel ID
  SELECT id INTO v_hotel_id FROM hotels LIMIT 1;
  
  IF v_hotel_id IS NULL THEN
    RAISE EXCEPTION 'No hotel found';
  END IF;

  -- Check if data already exists
  IF EXISTS (SELECT 1 FROM room_types WHERE hotel_id = v_hotel_id LIMIT 1) THEN
    RAISE NOTICE 'Demo data already exists. Skipping seed.';
    RETURN;
  END IF;

  -- Create Room Types
  INSERT INTO room_types (hotel_id, name, description, base_rate, max_occupancy, bed_type, amenities)
  VALUES 
    (v_hotel_id, 'Standard Room', 'Comfortable room with modern amenities', 150, 2, 'Queen', 
     ARRAY['Wi-Fi', 'TV', 'Air Conditioning', 'Mini Bar'])
  RETURNING id INTO v_standard_type_id;

  INSERT INTO room_types (hotel_id, name, description, base_rate, max_occupancy, bed_type, amenities)
  VALUES 
    (v_hotel_id, 'Deluxe Room', 'Spacious room with city views', 250, 3, 'King', 
     ARRAY['Wi-Fi', 'TV', 'Air Conditioning', 'Mini Bar', 'Safe', 'Coffee Maker'])
  RETURNING id INTO v_deluxe_type_id;

  INSERT INTO room_types (hotel_id, name, description, base_rate, max_occupancy, bed_type, amenities)
  VALUES 
    (v_hotel_id, 'Executive Suite', 'Luxurious suite with separate living area', 450, 4, 'King', 
     ARRAY['Wi-Fi', 'TV', 'Air Conditioning', 'Mini Bar', 'Safe', 'Coffee Maker', 'Bathtub', 'Work Desk'])
  RETURNING id INTO v_suite_type_id;

  -- Create Rooms
  INSERT INTO rooms (hotel_id, room_type_id, number, floor, status)
  VALUES 
    (v_hotel_id, v_standard_type_id, '101', 1, 'available')
  RETURNING id INTO v_room1_id;

  INSERT INTO rooms (hotel_id, room_type_id, number, floor, status)
  VALUES 
    (v_hotel_id, v_deluxe_type_id, '201', 2, 'occupied')
  RETURNING id INTO v_room2_id;

  INSERT INTO rooms (hotel_id, room_type_id, number, floor, status)
  VALUES 
    (v_hotel_id, v_suite_type_id, '301', 3, 'available')
  RETURNING id INTO v_room3_id;

  INSERT INTO rooms (hotel_id, room_type_id, number, floor, status)
  VALUES 
    (v_hotel_id, v_standard_type_id, '102', 1, 'clean'),
    (v_hotel_id, v_standard_type_id, '103', 1, 'available'),
    (v_hotel_id, v_deluxe_type_id, '202', 2, 'available');

  -- Create Guests
  INSERT INTO guests (hotel_id, first_name, last_name, email, phone, country, vip_status, total_stays, total_spent)
  VALUES 
    (v_hotel_id, 'John', 'Smith', 'john.smith@email.com', '+1-555-0101', 'United States', 'gold', 5, 2500)
  RETURNING id INTO v_guest1_id;

  INSERT INTO guests (hotel_id, first_name, last_name, email, phone, country, vip_status, total_stays, total_spent)
  VALUES 
    (v_hotel_id, 'Sarah', 'Johnson', 'sarah.j@email.com', '+1-555-0102', 'United States', 'silver', 3, 1200)
  RETURNING id INTO v_guest2_id;

  INSERT INTO guests (hotel_id, first_name, last_name, email, phone, country, vip_status, total_stays, total_spent)
  VALUES 
    (v_hotel_id, 'Michael', 'Chen', 'michael.chen@email.com', '+1-555-0103', 'Canada', 'regular', 1, 300)
  RETURNING id INTO v_guest3_id;

  -- Create Reservations
  INSERT INTO reservations (
    hotel_id, guest_id, room_id, room_type_id, 
    check_in, check_out, adults, children,
    status, base_rate, total_amount, tax_amount, 
    payment_status, confirmation_code
  )
  VALUES 
    (v_hotel_id, v_guest1_id, v_room2_id, v_deluxe_type_id,
     CURRENT_DATE, CURRENT_DATE + 3, 2, 0,
     'checked_in', 250, 825, 75, 'partial', 'GRM' || LPAD(floor(random() * 10000)::text, 4, '0'))
  RETURNING id INTO v_reservation1_id;

  INSERT INTO reservations (
    hotel_id, guest_id, room_id, room_type_id,
    check_in, check_out, adults, children,
    status, base_rate, total_amount, tax_amount,
    payment_status, confirmation_code
  )
  VALUES 
    (v_hotel_id, v_guest2_id, v_room1_id, v_standard_type_id,
     CURRENT_DATE + 2, CURRENT_DATE + 5, 2, 1,
     'confirmed', 150, 495, 45, 'pending', 'GRM' || LPAD(floor(random() * 10000)::text, 4, '0'));

  -- Create Invoice
  INSERT INTO invoices (
    hotel_id, reservation_id, guest_id, invoice_number,
    issue_date, due_date, subtotal, tax_amount, total_amount, amount_paid, status
  )
  VALUES (
    v_hotel_id, v_reservation1_id, v_guest1_id,
    'INV-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-001',
    CURRENT_DATE, CURRENT_DATE, 750, 75, 825, 500, 'sent'
  )
  RETURNING id INTO v_invoice1_id;

  -- Create Invoice Items
  INSERT INTO invoice_items (invoice_id, description, category, quantity, unit_price, total_price)
  VALUES 
    (v_invoice1_id, 'Deluxe Room - 3 nights', 'room', 3, 250, 750);

  -- Create Housekeeping Tasks
  INSERT INTO housekeeping_tasks (hotel_id, room_id, task_type, priority, status, assigned_to)
  VALUES 
    (v_hotel_id, v_room1_id, 'clean', 'normal', 'pending', 'Maria Garcia'),
    (v_hotel_id, v_room3_id, 'inspection', 'low', 'completed', 'John Smith');

  RAISE NOTICE 'Demo data seeded successfully!';
END $$;
