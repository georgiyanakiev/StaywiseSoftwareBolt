/*
  # Seed All Demo Data (Clean)

  Creates comprehensive demo data:
  - 5 room types
  - 20 rooms with various statuses
  - 12 guests from different countries
  - 10 reservations across all statuses
  - 8 invoices with payment tracking
  - Payment history records
  - 10 housekeeping tasks
  - 5 maintenance requests
*/

DO $$
DECLARE
  v_hotel_id uuid;
  v_room_type_ids uuid[];
  v_room_ids uuid[];
  v_guest_ids uuid[];
  v_reservation_ids uuid[];
  v_invoice_ids uuid[];
  v_temp_id uuid;
BEGIN
  SELECT id INTO v_hotel_id FROM hotels LIMIT 1;
  
  IF v_hotel_id IS NULL THEN
    RAISE EXCEPTION 'No hotel found';
  END IF;

  DELETE FROM invoice_items WHERE invoice_id IN (SELECT id FROM invoices WHERE hotel_id = v_hotel_id);
  DELETE FROM payments WHERE hotel_id = v_hotel_id;
  DELETE FROM invoices WHERE hotel_id = v_hotel_id;
  DELETE FROM housekeeping_tasks WHERE hotel_id = v_hotel_id;
  DELETE FROM maintenance_requests WHERE hotel_id = v_hotel_id;
  DELETE FROM reservations WHERE hotel_id = v_hotel_id;
  DELETE FROM rooms WHERE hotel_id = v_hotel_id;
  DELETE FROM room_types WHERE hotel_id = v_hotel_id;
  DELETE FROM guests WHERE hotel_id = v_hotel_id;

  v_room_type_ids := ARRAY[]::uuid[];
  v_room_ids := ARRAY[]::uuid[];
  v_guest_ids := ARRAY[]::uuid[];
  v_reservation_ids := ARRAY[]::uuid[];
  v_invoice_ids := ARRAY[]::uuid[];

  INSERT INTO room_types (hotel_id, name, description, base_rate, max_occupancy, bed_type, amenities, image_url)
  VALUES 
    (v_hotel_id, 'Standard Room', 'Comfortable room with modern amenities', 150, 2, 'Queen', 
     ARRAY['Wi-Fi', 'TV', 'Air Conditioning', 'Mini Bar'], 'https://images.pexels.com/photos/271624/pexels-photo-271624.jpeg')
  RETURNING id INTO v_temp_id;
  v_room_type_ids := array_append(v_room_type_ids, v_temp_id);

  INSERT INTO room_types (hotel_id, name, description, base_rate, max_occupancy, bed_type, amenities, image_url)
  VALUES 
    (v_hotel_id, 'Deluxe Room', 'Spacious room with city views', 250, 3, 'King', 
     ARRAY['Wi-Fi', 'TV', 'Air Conditioning', 'Mini Bar', 'Safe', 'Coffee Maker'], 'https://images.pexels.com/photos/271618/pexels-photo-271618.jpeg')
  RETURNING id INTO v_temp_id;
  v_room_type_ids := array_append(v_room_type_ids, v_temp_id);

  INSERT INTO room_types (hotel_id, name, description, base_rate, max_occupancy, bed_type, amenities, image_url)
  VALUES 
    (v_hotel_id, 'Executive Suite', 'Luxurious suite with separate living area', 450, 4, 'King', 
     ARRAY['Wi-Fi', 'TV', 'Air Conditioning', 'Mini Bar', 'Safe', 'Coffee Maker', 'Bathtub', 'Work Desk'], 'https://images.pexels.com/photos/271619/pexels-photo-271619.jpeg')
  RETURNING id INTO v_temp_id;
  v_room_type_ids := array_append(v_room_type_ids, v_temp_id);

  INSERT INTO room_types (hotel_id, name, description, base_rate, max_occupancy, bed_type, amenities, image_url)
  VALUES 
    (v_hotel_id, 'Family Room', 'Spacious room perfect for families', 320, 5, 'Two Queens', 
     ARRAY['Wi-Fi', 'TV', 'Air Conditioning', 'Mini Bar', 'Microwave', 'Refrigerator'], 'https://images.pexels.com/photos/164595/pexels-photo-164595.jpeg')
  RETURNING id INTO v_temp_id;
  v_room_type_ids := array_append(v_room_type_ids, v_temp_id);

  INSERT INTO room_types (hotel_id, name, description, base_rate, max_occupancy, bed_type, amenities, image_url)
  VALUES 
    (v_hotel_id, 'Presidential Suite', 'Ultimate luxury with panoramic views', 850, 6, 'King + Queen', 
     ARRAY['Wi-Fi', 'TV', 'Air Conditioning', 'Mini Bar', 'Safe', 'Coffee Maker', 'Bathtub', 'Work Desk', 'Kitchen', 'Living Room'], 'https://images.pexels.com/photos/262048/pexels-photo-262048.jpeg')
  RETURNING id INTO v_temp_id;
  v_room_type_ids := array_append(v_room_type_ids, v_temp_id);

  FOR i IN 1..20 LOOP
    INSERT INTO rooms (hotel_id, room_type_id, number, floor, status, notes)
    VALUES (
      v_hotel_id,
      v_room_type_ids[(i % 5) + 1],
      LPAD(((i / 4) + 1)::text, 1, '0') || LPAD(((i % 4) + 1)::text, 2, '0'),
      (i / 4) + 1,
      CASE (i % 6)
        WHEN 0 THEN 'available'
        WHEN 1 THEN 'occupied'
        WHEN 2 THEN 'clean'
        WHEN 3 THEN 'dirty'
        WHEN 4 THEN 'maintenance'
        ELSE 'available'
      END,
      CASE WHEN i % 7 = 0 THEN 'Recently renovated' ELSE '' END
    )
    RETURNING id INTO v_temp_id;
    v_room_ids := array_append(v_room_ids, v_temp_id);
  END LOOP;

  INSERT INTO guests (hotel_id, first_name, last_name, email, phone, country, nationality, vip_status, total_stays, total_spent, address, city, postal_code)
  VALUES 
    (v_hotel_id, 'John', 'Smith', 'john.smith@email.com', '+1-555-0101', 'United States', 'American', 'gold', 12, 8500, '123 Main St', 'New York', '10001')
  RETURNING id INTO v_temp_id;
  v_guest_ids := array_append(v_guest_ids, v_temp_id);

  INSERT INTO guests (hotel_id, first_name, last_name, email, phone, country, nationality, vip_status, total_stays, total_spent, address, city, postal_code)
  VALUES 
    (v_hotel_id, 'Sarah', 'Johnson', 'sarah.j@email.com', '+1-555-0102', 'United States', 'American', 'silver', 7, 4200, '456 Oak Ave', 'Los Angeles', '90001')
  RETURNING id INTO v_temp_id;
  v_guest_ids := array_append(v_guest_ids, v_temp_id);

  INSERT INTO guests (hotel_id, first_name, last_name, email, phone, country, nationality, vip_status, total_stays, total_spent, address, city, postal_code)
  VALUES 
    (v_hotel_id, 'Michael', 'Chen', 'michael.chen@email.com', '+1-555-0103', 'Canada', 'Canadian', 'platinum', 25, 18500, '789 Maple Dr', 'Toronto', 'M5H 2N2')
  RETURNING id INTO v_temp_id;
  v_guest_ids := array_append(v_guest_ids, v_temp_id);

  INSERT INTO guests (hotel_id, first_name, last_name, email, phone, country, nationality, vip_status, total_stays, total_spent, address, city, postal_code)
  VALUES 
    (v_hotel_id, 'Emma', 'Wilson', 'emma.w@email.com', '+44-20-7123-4567', 'United Kingdom', 'British', 'regular', 2, 950, '10 Downing St', 'London', 'SW1A 2AA')
  RETURNING id INTO v_temp_id;
  v_guest_ids := array_append(v_guest_ids, v_temp_id);

  INSERT INTO guests (hotel_id, first_name, last_name, email, phone, country, nationality, vip_status, total_stays, total_spent, address, city, postal_code)
  VALUES 
    (v_hotel_id, 'Carlos', 'Rodriguez', 'carlos.r@email.com', '+34-91-123-4567', 'Spain', 'Spanish', 'silver', 5, 2800, 'Calle Mayor 1', 'Madrid', '28013')
  RETURNING id INTO v_temp_id;
  v_guest_ids := array_append(v_guest_ids, v_temp_id);

  INSERT INTO guests (hotel_id, first_name, last_name, email, phone, country, nationality, vip_status, total_stays, total_spent, address, city, postal_code)
  VALUES 
    (v_hotel_id, 'Yuki', 'Tanaka', 'yuki.t@email.com', '+81-3-1234-5678', 'Japan', 'Japanese', 'gold', 8, 5600, '1-1-1 Shibuya', 'Tokyo', '150-0002')
  RETURNING id INTO v_temp_id;
  v_guest_ids := array_append(v_guest_ids, v_temp_id);

  INSERT INTO guests (hotel_id, first_name, last_name, email, phone, country, nationality, vip_status, total_stays, total_spent, address, city, postal_code)
  VALUES 
    (v_hotel_id, 'Sophie', 'Martin', 'sophie.m@email.com', '+33-1-23-45-67-89', 'France', 'French', 'regular', 3, 1650, '5 Rue de Rivoli', 'Paris', '75001')
  RETURNING id INTO v_temp_id;
  v_guest_ids := array_append(v_guest_ids, v_temp_id);

  INSERT INTO guests (hotel_id, first_name, last_name, email, phone, country, nationality, vip_status, total_stays, total_spent, address, city, postal_code)
  VALUES 
    (v_hotel_id, 'Hans', 'Mueller', 'hans.m@email.com', '+49-30-12345678', 'Germany', 'German', 'silver', 6, 3900, 'Unter den Linden 1', 'Berlin', '10117')
  RETURNING id INTO v_temp_id;
  v_guest_ids := array_append(v_guest_ids, v_temp_id);

  INSERT INTO guests (hotel_id, first_name, last_name, email, phone, country, nationality, vip_status, total_stays, total_spent, address, city, postal_code)
  VALUES 
    (v_hotel_id, 'Priya', 'Patel', 'priya.p@email.com', '+91-11-1234-5678', 'India', 'Indian', 'regular', 1, 450, 'MG Road 100', 'Mumbai', '400001')
  RETURNING id INTO v_temp_id;
  v_guest_ids := array_append(v_guest_ids, v_temp_id);

  INSERT INTO guests (hotel_id, first_name, last_name, email, phone, country, nationality, vip_status, total_stays, total_spent, address, city, postal_code)
  VALUES 
    (v_hotel_id, 'Lucas', 'Silva', 'lucas.s@email.com', '+55-11-1234-5678', 'Brazil', 'Brazilian', 'regular', 2, 780, 'Av Paulista 1000', 'Sao Paulo', '01310-100')
  RETURNING id INTO v_temp_id;
  v_guest_ids := array_append(v_guest_ids, v_temp_id);

  INSERT INTO guests (hotel_id, first_name, last_name, email, phone, country, nationality, vip_status, total_stays, total_spent, address, city, postal_code)
  VALUES 
    (v_hotel_id, 'Olivia', 'Brown', 'olivia.b@email.com', '+61-2-1234-5678', 'Australia', 'Australian', 'gold', 9, 6300, '100 George St', 'Sydney', '2000')
  RETURNING id INTO v_temp_id;
  v_guest_ids := array_append(v_guest_ids, v_temp_id);

  INSERT INTO guests (hotel_id, first_name, last_name, email, phone, country, nationality, vip_status, total_stays, total_spent, address, city, postal_code)
  VALUES 
    (v_hotel_id, 'Ahmed', 'Al-Farsi', 'ahmed.a@email.com', '+971-4-123-4567', 'UAE', 'Emirati', 'platinum', 15, 12000, 'Sheikh Zayed Road 1', 'Dubai', '00000')
  RETURNING id INTO v_temp_id;
  v_guest_ids := array_append(v_guest_ids, v_temp_id);

  FOR i IN 1..10 LOOP
    INSERT INTO reservations (
      hotel_id, guest_id, room_id, room_type_id,
      check_in, check_out, adults, children,
      status, base_rate, total_amount, tax_amount, discount_amount,
      payment_status, amount_paid, confirmation_code, special_requests
    )
    VALUES (
      v_hotel_id,
      v_guest_ids[(i % array_length(v_guest_ids, 1)) + 1],
      v_room_ids[i],
      v_room_type_ids[(i % 5) + 1],
      CURRENT_DATE + (i - 3),
      CURRENT_DATE + (i - 1),
      (i % 3) + 1,
      CASE WHEN i % 4 = 0 THEN (i % 3) ELSE 0 END,
      CASE (i % 5)
        WHEN 0 THEN 'pending'
        WHEN 1 THEN 'confirmed'
        WHEN 2 THEN 'checked_in'
        WHEN 3 THEN 'checked_out'
        ELSE 'confirmed'
      END,
      150 + (i * 50),
      (150 + (i * 50)) * 2 * 1.1,
      (150 + (i * 50)) * 2 * 0.1,
      CASE WHEN i % 7 = 0 THEN 50 ELSE 0 END,
      CASE (i % 4)
        WHEN 0 THEN 'paid'
        WHEN 1 THEN 'partial'
        ELSE 'pending'
      END,
      CASE WHEN i % 4 = 1 THEN ((150 + (i * 50)) * 2 * 1.1) / 2 WHEN i % 4 = 0 THEN (150 + (i * 50)) * 2 * 1.1 ELSE 0 END,
      'GRM' || LPAD(floor(random() * 10000)::text, 4, '0'),
      CASE WHEN i % 3 = 0 THEN 'Late check-in requested' ELSE '' END
    )
    RETURNING id INTO v_temp_id;
    v_reservation_ids := array_append(v_reservation_ids, v_temp_id);
  END LOOP;

  FOR i IN 1..8 LOOP
    INSERT INTO invoices (
      hotel_id, reservation_id, guest_id, invoice_number,
      issue_date, due_date, subtotal, tax_amount, discount_amount, total_amount, amount_paid, status, notes
    )
    VALUES (
      v_hotel_id,
      CASE WHEN i <= array_length(v_reservation_ids, 1) THEN v_reservation_ids[i] ELSE NULL END,
      v_guest_ids[(i % array_length(v_guest_ids, 1)) + 1],
      'INV-' || TO_CHAR(CURRENT_DATE - (8 - i), 'YYYYMMDD') || '-' || LPAD(i::text, 3, '0'),
      CURRENT_DATE - (8 - i),
      CURRENT_DATE - (8 - i) + 7,
      300 + (i * 150),
      (300 + (i * 150)) * 0.1,
      CASE WHEN i % 5 = 0 THEN 50 ELSE 0 END,
      (300 + (i * 150)) * 1.1 - CASE WHEN i % 5 = 0 THEN 50 ELSE 0 END,
      CASE 
        WHEN i % 4 = 0 THEN (300 + (i * 150)) * 1.1
        WHEN i % 4 = 1 THEN ((300 + (i * 150)) * 1.1) / 2
        ELSE 0 
      END,
      CASE (i % 5)
        WHEN 0 THEN 'paid'
        WHEN 1 THEN 'sent'
        WHEN 2 THEN 'overdue'
        WHEN 3 THEN 'draft'
        ELSE 'sent'
      END,
      CASE WHEN i % 3 = 0 THEN 'VIP guest discount applied' ELSE '' END
    )
    RETURNING id INTO v_temp_id;
    v_invoice_ids := array_append(v_invoice_ids, v_temp_id);
  END LOOP;

  FOR i IN 1..8 LOOP
    INSERT INTO invoice_items (invoice_id, description, category, quantity, unit_price, total_price)
    VALUES 
      (v_invoice_ids[i], 'Room Charges - ' || (i + 1) || ' nights', 'room', i + 1, 150 + (i * 50), (150 + (i * 50)) * (i + 1));
    
    IF i % 3 = 0 THEN
      INSERT INTO invoice_items (invoice_id, description, category, quantity, unit_price, total_price)
      VALUES 
        (v_invoice_ids[i], 'Room Service - Breakfast', 'food', 2, 25, 50);
    END IF;
    
    IF i % 4 = 0 THEN
      INSERT INTO invoice_items (invoice_id, description, category, quantity, unit_price, total_price)
      VALUES 
        (v_invoice_ids[i], 'Spa Treatment', 'spa', 1, 120, 120),
        (v_invoice_ids[i], 'Parking Fee', 'parking', 3, 15, 45);
    END IF;

    IF i % 2 = 0 THEN
      INSERT INTO invoice_items (invoice_id, description, category, quantity, unit_price, total_price)
      VALUES 
        (v_invoice_ids[i], 'Mini Bar', 'minibar', 1, 35, 35);
    END IF;
  END LOOP;

  FOR i IN 1..6 LOOP
    IF v_invoice_ids[i] IS NOT NULL THEN
      INSERT INTO payments (hotel_id, invoice_id, guest_id, reservation_id, amount, payment_method, payment_date, reference_number, notes, processed_by)
      VALUES (
        v_hotel_id,
        v_invoice_ids[i],
        v_guest_ids[(i % array_length(v_guest_ids, 1)) + 1],
        CASE WHEN i <= array_length(v_reservation_ids, 1) THEN v_reservation_ids[i] ELSE NULL END,
        200 + (i * 100),
        CASE (i % 5)
          WHEN 0 THEN 'card'
          WHEN 1 THEN 'cash'
          WHEN 2 THEN 'bank_transfer'
          WHEN 3 THEN 'card'
          ELSE 'cash'
        END,
        CURRENT_DATE - (6 - i),
        'REF-' || LPAD(floor(random() * 100000)::text, 5, '0'),
        CASE WHEN i % 2 = 0 THEN 'Partial payment - deposit' ELSE 'Full payment received' END,
        'Demo Admin'
      );
    END IF;
  END LOOP;

  FOR i IN 1..10 LOOP
    INSERT INTO housekeeping_tasks (hotel_id, room_id, task_type, priority, status, assigned_to, notes, completed_at)
    VALUES (
      v_hotel_id,
      v_room_ids[(i % array_length(v_room_ids, 1)) + 1],
      CASE (i % 5)
        WHEN 0 THEN 'clean'
        WHEN 1 THEN 'deep_clean'
        WHEN 2 THEN 'linen_change'
        WHEN 3 THEN 'restock'
        ELSE 'inspection'
      END,
      CASE (i % 4)
        WHEN 0 THEN 'low'
        WHEN 1 THEN 'normal'
        WHEN 2 THEN 'high'
        ELSE 'urgent'
      END,
      CASE (i % 3)
        WHEN 0 THEN 'pending'
        WHEN 1 THEN 'in_progress'
        ELSE 'completed'
      END,
      CASE (i % 3)
        WHEN 0 THEN 'Maria Garcia'
        WHEN 1 THEN 'James Wilson'
        ELSE 'Anna Lee'
      END,
      'Task #' || i,
      CASE WHEN i % 3 = 2 THEN now() - interval '2 hours' ELSE NULL END
    );
  END LOOP;

  FOR i IN 1..5 LOOP
    INSERT INTO maintenance_requests (hotel_id, room_id, description, priority, status, assigned_to, cost, resolved_at)
    VALUES (
      v_hotel_id,
      v_room_ids[(i * 3)],
      CASE i
        WHEN 1 THEN 'Air conditioning not cooling properly'
        WHEN 2 THEN 'Leaking faucet in bathroom'
        WHEN 3 THEN 'TV remote not working'
        WHEN 4 THEN 'Light bulb replacement needed'
        ELSE 'Door lock needs adjustment'
      END,
      CASE (i % 4)
        WHEN 0 THEN 'low'
        WHEN 1 THEN 'medium'
        WHEN 2 THEN 'high'
        ELSE 'urgent'
      END,
      CASE (i % 3)
        WHEN 0 THEN 'reported'
        WHEN 1 THEN 'in_progress'
        ELSE 'completed'
      END,
      'Maintenance Team',
      CASE WHEN i % 3 = 2 THEN (i * 75) ELSE 0 END,
      CASE WHEN i % 3 = 2 THEN now() - interval '1 day' ELSE NULL END
    );
  END LOOP;

  RAISE NOTICE 'Comprehensive demo data seeded!';
  RAISE NOTICE 'Created: 5 room types, 20 rooms, 12 guests, 10 reservations, 8 invoices, 6 payments, 10 housekeeping tasks, 5 maintenance requests';
END $$;
