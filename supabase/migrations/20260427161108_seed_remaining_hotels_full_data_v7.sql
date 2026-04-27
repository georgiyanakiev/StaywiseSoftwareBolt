/*
  # Seed full demo data for remaining hotels (v7)

  Additive seed: keeps any existing rows and only adds new room types,
  rooms, guests, and reservations. Uses high room numbers (800-series)
  to avoid conflicts with any existing data.
*/

DO $$
DECLARE
  v_hotel record;
  v_rt_standard uuid;
  v_rt_deluxe uuid;
  v_rt_suite uuid;
  v_rt_family uuid;
  v_room_id uuid;
  v_guest_id uuid;
  v_room_count int;
  i int;
  v_guest_ids uuid[];
  v_room_ids_std uuid[];
  v_room_ids_dlx uuid[];
  v_room_ids_ste uuid[];
  v_room_ids_fam uuid[];
  v_first text[] := ARRAY['Anna','Boris','Maria','Ivan','Elena','Dimitar','Sofia','Petar','Nadia','Georgi','Kristina','Stefan','Yana','Marko','Ralitsa','Todor','Vania','Hristo','Iliana','Nikolay'];
  v_last text[] := ARRAY['Petrov','Ivanov','Dimitrova','Stoyanov','Georgieva','Nikolov','Hristova','Todorov','Marinov','Vassileva','Smith','Johnson','Brown','Wilson','Taylor','Anderson','Martin','Thompson','Walker','Robinson'];
  v_cities text[] := ARRAY['Sofia','Plovdiv','Varna','Burgas','London','Manchester','Berlin','Paris','Madrid','Rome','Vienna','Athens'];
  v_countries text[] := ARRAY['Bulgaria','Bulgaria','Bulgaria','Bulgaria','United Kingdom','United Kingdom','Germany','France','Spain','Italy','Austria','Greece'];
  v_status text;
  v_pay_status text;
  v_check_in date;
  v_nights int;
  v_room_pick uuid;
  v_rate numeric;
  v_total numeric;
  v_today date := CURRENT_DATE;
BEGIN
  FOR v_hotel IN
    SELECT h.id, h.name FROM hotels h
    WHERE h.id IN (
      '6c4fb9bc-85be-4171-8b9e-0a04b0535499',
      '580fe5bf-3ddd-402c-baac-94eb57e0834e',
      '783741a7-2e0e-4d03-b7dd-2ae27c9682ea'
    )
  LOOP
    SELECT count(*) INTO v_room_count FROM rooms WHERE hotel_id = v_hotel.id;
    IF v_room_count > 5 THEN CONTINUE; END IF;

    INSERT INTO room_types (hotel_id, name, description, base_rate, max_occupancy, bed_type, amenities, image_url)
    VALUES (v_hotel.id, 'Standard Double', 'Comfortable room with city view', 95, 2, 'Queen',
            ARRAY['WiFi','TV','Air Conditioning','Mini Bar'], 'https://images.pexels.com/photos/271624/pexels-photo-271624.jpeg')
    RETURNING id INTO v_rt_standard;

    INSERT INTO room_types (hotel_id, name, description, base_rate, max_occupancy, bed_type, amenities, image_url)
    VALUES (v_hotel.id, 'Deluxe King', 'Spacious deluxe room', 145, 2, 'King',
            ARRAY['WiFi','TV','Air Conditioning','Mini Bar','Bathrobe'], 'https://images.pexels.com/photos/271618/pexels-photo-271618.jpeg')
    RETURNING id INTO v_rt_deluxe;

    INSERT INTO room_types (hotel_id, name, description, base_rate, max_occupancy, bed_type, amenities, image_url)
    VALUES (v_hotel.id, 'Executive Suite', 'Luxurious suite with living area', 245, 3, 'King',
            ARRAY['WiFi','TV','Air Conditioning','Mini Bar','Living Room','Bathtub'], 'https://images.pexels.com/photos/164595/pexels-photo-164595.jpeg')
    RETURNING id INTO v_rt_suite;

    INSERT INTO room_types (hotel_id, name, description, base_rate, max_occupancy, bed_type, amenities, image_url)
    VALUES (v_hotel.id, 'Family Room', 'Spacious room for families', 175, 4, 'Two Doubles',
            ARRAY['WiFi','TV','Air Conditioning','Mini Bar','Extra Bed'], 'https://images.pexels.com/photos/237371/pexels-photo-237371.jpeg')
    RETURNING id INTO v_rt_family;

    v_room_ids_std := ARRAY[]::uuid[];
    v_room_ids_dlx := ARRAY[]::uuid[];
    v_room_ids_ste := ARRAY[]::uuid[];
    v_room_ids_fam := ARRAY[]::uuid[];

    FOR i IN 1..8 LOOP
      INSERT INTO rooms (hotel_id, room_type_id, number, floor, status)
      VALUES (v_hotel.id, v_rt_standard, (800 + i)::text, 1,
              CASE WHEN i % 5 = 0 THEN 'occupied' WHEN i % 7 = 0 THEN 'dirty' ELSE 'available' END)
      RETURNING id INTO v_room_id;
      v_room_ids_std := array_append(v_room_ids_std, v_room_id);
    END LOOP;

    FOR i IN 1..6 LOOP
      INSERT INTO rooms (hotel_id, room_type_id, number, floor, status)
      VALUES (v_hotel.id, v_rt_deluxe, (820 + i)::text, 2,
              CASE WHEN i % 4 = 0 THEN 'occupied' ELSE 'available' END)
      RETURNING id INTO v_room_id;
      v_room_ids_dlx := array_append(v_room_ids_dlx, v_room_id);
    END LOOP;

    FOR i IN 1..3 LOOP
      INSERT INTO rooms (hotel_id, room_type_id, number, floor, status)
      VALUES (v_hotel.id, v_rt_suite, (840 + i)::text, 3, 'available')
      RETURNING id INTO v_room_id;
      v_room_ids_ste := array_append(v_room_ids_ste, v_room_id);
    END LOOP;

    FOR i IN 1..3 LOOP
      INSERT INTO rooms (hotel_id, room_type_id, number, floor, status)
      VALUES (v_hotel.id, v_rt_family, (850 + i)::text, 4, 'available')
      RETURNING id INTO v_room_id;
      v_room_ids_fam := array_append(v_room_ids_fam, v_room_id);
    END LOOP;

    v_guest_ids := ARRAY[]::uuid[];
    FOR i IN 1..14 LOOP
      INSERT INTO guests (hotel_id, first_name, last_name, email, phone, address, city, country, postal_code,
                          nationality, vip_status, total_stays, total_spent)
      VALUES (
        v_hotel.id,
        v_first[1 + ((i * 3) % array_length(v_first,1))],
        v_last[1 + ((i * 5) % array_length(v_last,1))],
        lower(v_first[1 + ((i * 3) % array_length(v_first,1))] || '.' || v_last[1 + ((i * 5) % array_length(v_last,1))] || i || '_' || substr(v_hotel.id::text,1,4) || '@example.com'),
        '+359' || (880000000 + i * 1234)::text,
        i || ' Main Street',
        v_cities[1 + (i % array_length(v_cities,1))],
        v_countries[1 + (i % array_length(v_countries,1))],
        (1000 + i * 7)::text,
        v_countries[1 + (i % array_length(v_countries,1))],
        CASE WHEN i % 5 = 0 THEN 'gold' WHEN i % 8 = 0 THEN 'platinum' ELSE 'regular' END,
        (i % 6),
        (i * 250)::numeric
      ) RETURNING id INTO v_guest_id;
      v_guest_ids := array_append(v_guest_ids, v_guest_id);
    END LOOP;

    FOR i IN 1..28 LOOP
      v_check_in := v_today + ((i - 14) * 2);
      v_nights := 1 + (i % 5);

      IF i % 4 = 0 THEN
        v_room_pick := v_room_ids_dlx[1 + (i % array_length(v_room_ids_dlx,1))]; v_rate := 145;
      ELSIF i % 7 = 0 THEN
        v_room_pick := v_room_ids_ste[1 + (i % array_length(v_room_ids_ste,1))]; v_rate := 245;
      ELSIF i % 9 = 0 THEN
        v_room_pick := v_room_ids_fam[1 + (i % array_length(v_room_ids_fam,1))]; v_rate := 175;
      ELSE
        v_room_pick := v_room_ids_std[1 + (i % array_length(v_room_ids_std,1))]; v_rate := 95;
      END IF;

      v_total := v_rate * v_nights * 1.20;

      IF v_check_in + v_nights < v_today THEN
        v_status := 'checked_out'; v_pay_status := 'paid';
      ELSIF v_check_in <= v_today AND v_check_in + v_nights >= v_today THEN
        v_status := 'checked_in'; v_pay_status := 'paid';
      ELSIF i % 11 = 0 THEN
        v_status := 'cancelled'; v_pay_status := 'refunded';
      ELSE
        v_status := 'confirmed';
        v_pay_status := CASE WHEN i % 3 = 0 THEN 'paid' ELSE 'pending' END;
      END IF;

      INSERT INTO reservations (
        hotel_id, guest_id, room_id, room_type_id,
        check_in, check_out, adults, children, status,
        base_rate, total_amount, tax_amount,
        payment_status, amount_paid,
        booking_source, confirmation_code, source
      ) VALUES (
        v_hotel.id,
        v_guest_ids[1 + (i % array_length(v_guest_ids,1))],
        v_room_pick,
        (SELECT room_type_id FROM rooms WHERE id = v_room_pick),
        v_check_in, v_check_in + v_nights,
        1 + (i % 3), (i % 2),
        v_status,
        v_rate, v_total, v_total * 0.20 / 1.20,
        v_pay_status,
        CASE WHEN v_pay_status = 'paid' THEN v_total ELSE 0 END,
        CASE WHEN i % 3 = 0 THEN 'booking_com' WHEN i % 4 = 0 THEN 'expedia' ELSE 'direct' END,
        'CNF-' || upper(substr(md5(v_hotel.id::text || i::text || random()::text), 1, 8)),
        CASE WHEN i % 3 = 0 THEN 'booking_com' WHEN i % 4 = 0 THEN 'expedia' ELSE 'direct' END
      );
    END LOOP;

  END LOOP;
END $$;
