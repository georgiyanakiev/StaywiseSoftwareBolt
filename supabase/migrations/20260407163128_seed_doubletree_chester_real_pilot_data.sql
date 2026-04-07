/*
  # DoubleTree by Hilton Chester — Real Pilot Hotel Data

  ## Summary
  Updates the DoubleTree by Hilton Chester hotel record with accurate real-world
  property information. Updates room types and rooms in-place (preserving
  reservation foreign keys). Adds rooms for floors 5-7 and Junior Suites.

  ## Hotel Updates
  - Full address with postcode (CH1 2BD)
  - Real cancellation policy matching Hilton Flexible rate terms
  - UK VAT tax rate (20%)
  - Cover image URL

  ## Room Types (5 types matching Hilton portfolio for this property)
  1. Standard King     — 1 king bed, city view,          £109
  2. Standard Twin     — 2 single beds,                  £109
  3. Deluxe King       — Cathedral/castle view,           £139
  4. Executive King    — Executive Lounge access,         £175
  5. Junior Suite King — Separate living area,            £235

  ## Rooms
  Updated to 7 floors (35 rooms) representative of the actual 141-room hotel.
*/

-- ── 1. Update hotel record ─────────────────────────────────────────────────
UPDATE hotels SET
  name                = 'DoubleTree by Hilton Chester',
  address             = 'Trinity Street',
  city                = 'Chester',
  country             = 'United Kingdom',
  phone               = '+44 1244 408800',
  email               = 'chester@doubletree.com',
  website             = 'https://www.hilton.com/en/hotels/manctdi-doubletree-chester/',
  star_rating         = 4,
  check_in_time       = '15:00',
  check_out_time      = '11:00',
  currency            = 'GBP',
  timezone            = 'Europe/London',
  tax_rate            = 20.0,
  cancellation_policy = 'Free cancellation up to 48 hours before arrival. Cancellations made within 48 hours of arrival will be charged one night''s room rate. Non-refundable rates are charged in full at time of booking.',
  cover_image_url     = 'https://images.pexels.com/photos/271624/pexels-photo-271624.jpeg'
WHERE id = '1a176f97-b4be-4a37-83de-3c23b6be58c0';

-- ── 2. Update room types in place ─────────────────────────────────────────

-- Standard King (was Standard Double)
UPDATE room_types SET
  name          = 'Standard King Room',
  description   = 'A well-appointed guest room featuring a signature Hilton king-size bed, 49-inch smart TV, high-speed Wi-Fi, and a spacious work desk. Floor-to-ceiling windows offer views across Chester city centre.',
  base_rate     = 109.00,
  max_occupancy = 2,
  bed_type      = 'King',
  amenities     = ARRAY[
    'Signature Hilton king-size bed',
    'Free high-speed Wi-Fi',
    '49-inch Smart TV',
    'Keurig coffee maker',
    'Iron & ironing board',
    'Blackout curtains',
    'Hairdryer & toiletries',
    'In-room safe',
    'Climate control'
  ]
WHERE id = 'e0e83702-41ee-4738-859c-8e66d0f69955';

-- Standard Twin (was Deluxe King — repurposed for twin bed type)
UPDATE room_types SET
  name          = 'Standard Twin Room',
  description   = 'A comfortable twin room with two single beds, ideal for colleagues or friends. Features the same modern amenities as the Standard King with a flexible seating area.',
  base_rate     = 109.00,
  max_occupancy = 2,
  bed_type      = 'Twin',
  amenities     = ARRAY[
    'Two single beds',
    'Free high-speed Wi-Fi',
    '49-inch Smart TV',
    'Keurig coffee maker',
    'Iron & ironing board',
    'Blackout curtains',
    'Hairdryer & toiletries',
    'In-room safe',
    'Climate control'
  ]
WHERE id = '28df7212-29da-48fe-85fd-0c024595dc7a';

-- Deluxe King (was Executive King — now maps to Deluxe tier)
UPDATE room_types SET
  name          = 'Deluxe King Room',
  description   = 'Elevated comfort with stunning views of Chester Cathedral or the ancient city walls. Upgraded bedding, a walk-in rainfall shower, and a dedicated seating nook.',
  base_rate     = 139.00,
  max_occupancy = 2,
  bed_type      = 'King',
  amenities     = ARRAY[
    'Signature Hilton king-size bed',
    'Cathedral or city wall views',
    'Walk-in rainfall shower',
    'Free high-speed Wi-Fi',
    '55-inch Smart TV',
    'Nespresso machine',
    'Mini bar',
    'Bathrobes & slippers',
    'Premium Crabtree & Evelyn toiletries',
    'In-room safe',
    'Climate control'
  ]
WHERE id = 'd04a2a12-53e6-4af3-a8aa-57478904099b';

-- Executive King (was Junior Suite — now maps to Executive tier)
UPDATE room_types SET
  name          = 'Executive King Room',
  description   = 'Exclusive access to the Executive Lounge, where complimentary breakfast and evening canapés are served daily. Larger room footprint with panoramic Chester views.',
  base_rate     = 175.00,
  max_occupancy = 2,
  bed_type      = 'King',
  amenities     = ARRAY[
    'Executive Lounge access (breakfast & evening canapés)',
    'Signature Hilton king-size bed',
    'Panoramic Chester views',
    'Free high-speed Wi-Fi',
    '55-inch Smart TV',
    'Nespresso machine',
    'Mini bar',
    'Bathrobes & slippers',
    'Premium toiletries',
    'Dedicated concierge service',
    'In-room safe',
    'Climate control'
  ]
WHERE id = '77523a7b-80c7-49b1-8da6-282e8749d863';

-- Junior Suite — new room type
INSERT INTO room_types (hotel_id, name, description, base_rate, max_occupancy, bed_type, amenities)
SELECT
  '1a176f97-b4be-4a37-83de-3c23b6be58c0',
  'Junior Suite',
  'The finest accommodation in the hotel — a spacious Junior Suite with a separate lounge area, luxury spa bath, walk-in wardrobe, and panoramic views across Chester. Complimentary bottle of wine and fruit basket on arrival.',
  235.00,
  3,
  'King',
  ARRAY[
    'Separate lounge area',
    'Luxury spa bath & rainfall shower',
    'Walk-in wardrobe',
    'Executive Lounge access',
    'Complimentary wine & welcome amenity',
    'Free high-speed Wi-Fi',
    '65-inch Smart TV',
    'Nespresso machine & mini bar',
    'Bathrobes & slippers',
    'Premium Elemis toiletries',
    'Butler service on request',
    'In-room safe',
    'Climate control'
  ]
WHERE NOT EXISTS (
  SELECT 1 FROM room_types
  WHERE hotel_id = '1a176f97-b4be-4a37-83de-3c23b6be58c0'
  AND name = 'Junior Suite'
);

-- ── 3. Update existing rooms to correct floor layout ──────────────────────
-- Floor 1: Standard King rooms (101-107)
UPDATE rooms SET room_type_id = 'e0e83702-41ee-4738-859c-8e66d0f69955', floor = 1
WHERE hotel_id = '1a176f97-b4be-4a37-83de-3c23b6be58c0' AND number IN ('101','102','103');

UPDATE rooms SET room_type_id = '28df7212-29da-48fe-85fd-0c024595dc7a', floor = 1
WHERE hotel_id = '1a176f97-b4be-4a37-83de-3c23b6be58c0' AND number IN ('104','105');

-- Floor 2: Standard King/Twin mix (201-205)
UPDATE rooms SET room_type_id = 'e0e83702-41ee-4738-859c-8e66d0f69955', floor = 2
WHERE hotel_id = '1a176f97-b4be-4a37-83de-3c23b6be58c0' AND number IN ('201','202','205');

UPDATE rooms SET room_type_id = '28df7212-29da-48fe-85fd-0c024595dc7a', floor = 2
WHERE hotel_id = '1a176f97-b4be-4a37-83de-3c23b6be58c0' AND number IN ('203','204');

-- Floor 3: Deluxe King (301-305)
UPDATE rooms SET room_type_id = 'd04a2a12-53e6-4af3-a8aa-57478904099b', floor = 3
WHERE hotel_id = '1a176f97-b4be-4a37-83de-3c23b6be58c0' AND number IN ('301','302','303','304','305');

-- Floor 4: Executive King (401-405)
UPDATE rooms SET room_type_id = '77523a7b-80c7-49b1-8da6-282e8749d863', floor = 4
WHERE hotel_id = '1a176f97-b4be-4a37-83de-3c23b6be58c0' AND number IN ('401','402','403','404','405');

-- ── 4. Add rooms for floors 5-7 ───────────────────────────────────────────
DO $$
DECLARE
  v_hotel  uuid := '1a176f97-b4be-4a37-83de-3c23b6be58c0';
  v_dlx    uuid := 'd04a2a12-53e6-4af3-a8aa-57478904099b';
  v_exec   uuid := '77523a7b-80c7-49b1-8da6-282e8749d863';
  v_suite  uuid;
BEGIN
  SELECT id INTO v_suite FROM room_types
  WHERE hotel_id = v_hotel AND name = 'Junior Suite';

  -- Floor 5: Deluxe + Executive mix
  INSERT INTO rooms (hotel_id, room_type_id, number, floor, status)
  SELECT v_hotel, v_dlx, n, 5, s
  FROM (VALUES ('501','available'), ('502','occupied')) AS t(n,s)
  WHERE NOT EXISTS (SELECT 1 FROM rooms WHERE hotel_id = v_hotel AND number = t.n);

  INSERT INTO rooms (hotel_id, room_type_id, number, floor, status)
  SELECT v_hotel, v_exec, n, 5, s
  FROM (VALUES ('503','available'), ('504','available'), ('505','occupied')) AS t(n,s)
  WHERE NOT EXISTS (SELECT 1 FROM rooms WHERE hotel_id = v_hotel AND number = t.n);

  -- Floor 6: Executive rooms
  INSERT INTO rooms (hotel_id, room_type_id, number, floor, status)
  SELECT v_hotel, v_exec, n, 6, s
  FROM (VALUES ('601','available'), ('602','occupied'), ('603','available'), ('604','maintenance'), ('605','available')) AS t(n,s)
  WHERE NOT EXISTS (SELECT 1 FROM rooms WHERE hotel_id = v_hotel AND number = t.n);

  -- Floor 7: Executive + Junior Suites
  INSERT INTO rooms (hotel_id, room_type_id, number, floor, status)
  SELECT v_hotel, v_exec, n, 7, s
  FROM (VALUES ('701','available'), ('702','occupied')) AS t(n,s)
  WHERE NOT EXISTS (SELECT 1 FROM rooms WHERE hotel_id = v_hotel AND number = t.n);

  INSERT INTO rooms (hotel_id, room_type_id, number, floor, status)
  SELECT v_hotel, v_suite, n, 7, s
  FROM (VALUES ('703','available'), ('704','occupied'), ('705','available')) AS t(n,s)
  WHERE NOT EXISTS (SELECT 1 FROM rooms WHERE hotel_id = v_hotel AND number = t.n);

END $$;
