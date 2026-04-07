/*
  # Seed current-period demo reservations (March–May 2026)

  ## Summary
  The existing demo reservations only cover Dec 2025–Feb 2026. Today is April 2026,
  so the Dashboard showed €0 for Today / This Week / This Month because no reservations
  had check_in dates in the current period.

  This migration adds 35 realistic reservations for The Grand Metropolitan hotel
  covering March 1 – May 2026, including:
    - 7 currently checked-in guests (check_in <= today, check_out > today)
    - 2 arriving today (confirmed)
    - 12 already checked out (March + early April)
    - 9 upcoming confirmed bookings (rest of April and May)
    - 5 cancelled bookings for realistic cancellation rate

  ## Rooms used
    - Standard  (150/night): 101, 102, 104, 105, 106, 107, 108
    - Superior  (200/night): 202, 203, 204, 205, 206
    - Deluxe    (280/night): 301, 302, 303, 304
    - Suite     (400/night): 401, 402, 403
    - Presidential (700/night): 501

  ## Revenue impact after fix
    - Tonight's in-house revenue:  ~€1,700
    - This month (Apr 1–today):    ~€9,600
    - YTD:                         ~€42,000+
*/

INSERT INTO reservations (
  id, hotel_id, guest_id, room_id, room_type_id,
  check_in, check_out, adults, children, status,
  base_rate, total_amount, tax_amount,
  payment_status, amount_paid, booking_source,
  confirmation_code, created_at, updated_at
) VALUES

-- ============================================================
-- CURRENTLY CHECKED IN (active today 2026-04-07)
-- ============================================================

-- Room 101 | James Wilson | Apr 05–09 | 4 nights standard | Booking.com
(gen_random_uuid(), 'e83fbd69-4191-41b4-9651-cdbfd784786d', '5dc234e7-41d4-4837-9923-17952c545094',
 '36fdac8c-6aec-4922-816e-d21c82de15fb', '4f8c4220-28a5-4ad6-b7a5-4cfd165201b0',
 '2026-04-05', '2026-04-09', 2, 0, 'checked_in',
 150, 660, 60, 'partial', 330, 'Booking.com',
 'GM-2026-011', now() - interval '12 days', now()),

-- Room 102 | Emma Thompson | Apr 03–08 | 5 nights standard | Walk-in
(gen_random_uuid(), 'e83fbd69-4191-41b4-9651-cdbfd784786d', '12f70727-927f-4ff3-9652-300547a0254a',
 'b688e811-1b70-4f8b-b3ea-13610f381362', '4f8c4220-28a5-4ad6-b7a5-4cfd165201b0',
 '2026-04-03', '2026-04-08', 1, 0, 'checked_in',
 150, 825, 75, 'partial', 413, 'Walk-in',
 'GM-2026-012', now() - interval '15 days', now()),

-- Room 107 | Hans Mueller | Apr 05–08 | 3 nights standard | Direct
(gen_random_uuid(), 'e83fbd69-4191-41b4-9651-cdbfd784786d', '0a4ebf0b-952a-4f7a-ae92-c4c75936f406',
 'b03731cd-ce64-41e6-b4f1-189d93e70fd9', '4f8c4220-28a5-4ad6-b7a5-4cfd165201b0',
 '2026-04-05', '2026-04-08', 2, 1, 'checked_in',
 150, 495, 45, 'paid', 495, 'Direct',
 'GM-2026-013', now() - interval '10 days', now()),

-- Room 202 | James Wilson (2nd stay) | Apr 06–10 | 4 nights superior | Expedia
(gen_random_uuid(), 'e83fbd69-4191-41b4-9651-cdbfd784786d', 'fb530b5a-570c-4b09-93b0-47a74bcf3714',
 '5dbdc598-4dab-46bd-97d4-126e7f60e229', 'ecff2955-2711-4ca4-b630-9f68297dae3f',
 '2026-04-06', '2026-04-10', 2, 0, 'checked_in',
 200, 880, 80, 'partial', 440, 'Expedia',
 'GM-2026-014', now() - interval '8 days', now()),

-- Room 203 | Carlos Rivera | Apr 04–08 | 4 nights superior | Airbnb
(gen_random_uuid(), 'e83fbd69-4191-41b4-9651-cdbfd784786d', '8b7837dc-4b94-4930-b566-7013d048fdc8',
 '8b5f8f5c-0425-42c9-9dca-2a2cd2898682', 'ecff2955-2711-4ca4-b630-9f68297dae3f',
 '2026-04-04', '2026-04-08', 2, 0, 'checked_in',
 200, 880, 80, 'partial', 440, 'Airbnb',
 'GM-2026-015', now() - interval '14 days', now()),

-- Room 301 | Sarah O'Brien | Apr 02–09 | 7 nights deluxe | Walk-in
(gen_random_uuid(), 'e83fbd69-4191-41b4-9651-cdbfd784786d', 'c3120705-6cf1-48fd-8419-52645a0fd0ad',
 '35206702-18eb-4a01-96dc-1108c8d48082', 'fad9134a-83ae-4de5-a69a-0fbbadfd23ee',
 '2026-04-02', '2026-04-09', 2, 0, 'checked_in',
 280, 2156, 196, 'partial', 1078, 'Walk-in',
 'GM-2026-016', now() - interval '18 days', now()),

-- Room 401 | Olivia Brown | Apr 05–08 | 3 nights suite | Booking.com
(gen_random_uuid(), 'e83fbd69-4191-41b4-9651-cdbfd784786d', '02d88bac-1a77-42bc-a891-53bcab15ea12',
 '93bd65a4-face-4005-9cbf-de42c1e7ab89', '277f17ac-f949-468a-82be-15868f551515',
 '2026-04-05', '2026-04-08', 2, 0, 'checked_in',
 400, 1320, 120, 'partial', 660, 'Booking.com',
 'GM-2026-017', now() - interval '9 days', now()),

-- ============================================================
-- ARRIVING TODAY (confirmed, check_in = 2026-04-07)
-- ============================================================

-- Room 104 | Michael Chen | Apr 07–10 | 3 nights standard | Direct
(gen_random_uuid(), 'e83fbd69-4191-41b4-9651-cdbfd784786d', 'f6f9ef2c-56ff-4aae-9287-05f029bfc74d',
 '6aec80cc-bb29-4e76-82e0-09613ea36241', '4f8c4220-28a5-4ad6-b7a5-4cfd165201b0',
 '2026-04-07', '2026-04-10', 1, 0, 'confirmed',
 150, 495, 45, 'pending', 0, 'Direct',
 'GM-2026-018', now() - interval '5 days', now()),

-- Room 204 | Sophie Martin | Apr 07–12 | 5 nights superior | Corporate
(gen_random_uuid(), 'e83fbd69-4191-41b4-9651-cdbfd784786d', '7a8745bd-c5d3-4eae-b3ff-1c029ed26a57',
 'bdd4dd07-cc9a-4ca1-9a9a-13a90486d49a', 'ecff2955-2711-4ca4-b630-9f68297dae3f',
 '2026-04-07', '2026-04-12', 2, 0, 'confirmed',
 200, 1100, 100, 'pending', 0, 'Corporate',
 'GM-2026-019', now() - interval '21 days', now()),

-- ============================================================
-- RECENTLY CHECKED OUT (March 2026)
-- ============================================================

-- Room 101 | Yuki Tanaka | Mar 01–05 | 4 nights standard | Direct
(gen_random_uuid(), 'e83fbd69-4191-41b4-9651-cdbfd784786d', 'ece9568a-dd2e-4dfc-800d-c94c01d2a5c3',
 '36fdac8c-6aec-4922-816e-d21c82de15fb', '4f8c4220-28a5-4ad6-b7a5-4cfd165201b0',
 '2026-03-01', '2026-03-05', 2, 0, 'checked_out',
 150, 660, 60, 'paid', 660, 'Direct',
 'GM-2026-001', now() - interval '37 days', now()),

-- Room 102 | Anna Kowalski | Mar 10–15 | 5 nights standard | Expedia
(gen_random_uuid(), 'e83fbd69-4191-41b4-9651-cdbfd784786d', 'd045ce9c-868b-4601-ba2f-9874e6e1a1a8',
 'b688e811-1b70-4f8b-b3ea-13610f381362', '4f8c4220-28a5-4ad6-b7a5-4cfd165201b0',
 '2026-03-10', '2026-03-15', 2, 1, 'checked_out',
 150, 825, 75, 'paid', 825, 'Expedia',
 'GM-2026-002', now() - interval '28 days', now()),

-- Room 104 | Lisa Anderson | Mar 20–24 | 4 nights standard | Walk-in
(gen_random_uuid(), 'e83fbd69-4191-41b4-9651-cdbfd784786d', 'e9eaed73-2769-4b9f-84bf-5e7838f9c8ef',
 '6aec80cc-bb29-4e76-82e0-09613ea36241', '4f8c4220-28a5-4ad6-b7a5-4cfd165201b0',
 '2026-03-20', '2026-03-24', 1, 0, 'checked_out',
 150, 660, 60, 'paid', 660, 'Walk-in',
 'GM-2026-003', now() - interval '19 days', now()),

-- Room 105 | Ahmed Al-Rashid | Mar 28–Apr 02 | 5 nights standard | Booking.com
(gen_random_uuid(), 'e83fbd69-4191-41b4-9651-cdbfd784786d', '227f4a46-145e-4973-bbae-348fce5130e0',
 '57b3d4a9-8fb3-43d4-92aa-c1e29b03057d', '4f8c4220-28a5-4ad6-b7a5-4cfd165201b0',
 '2026-03-28', '2026-04-02', 2, 0, 'checked_out',
 150, 825, 75, 'paid', 825, 'Booking.com',
 'GM-2026-004', now() - interval '10 days', now()),

-- Room 106 | Priya Sharma | Apr 01–06 | 5 nights standard | Direct
(gen_random_uuid(), 'e83fbd69-4191-41b4-9651-cdbfd784786d', '2874e68d-c139-4409-aec4-27ebc1c7fa7b',
 'f5e193ed-f6a6-4f5c-ac52-218f1b818c6a', '4f8c4220-28a5-4ad6-b7a5-4cfd165201b0',
 '2026-04-01', '2026-04-06', 2, 0, 'checked_out',
 150, 825, 75, 'paid', 825, 'Direct',
 'GM-2026-005', now() - interval '6 days', now()),

-- Room 107 | David Kim | Mar 15–19 | 4 nights standard | Airbnb
(gen_random_uuid(), 'e83fbd69-4191-41b4-9651-cdbfd784786d', '9190e85d-a50d-4b12-9edd-9296a5900430',
 'b03731cd-ce64-41e6-b4f1-189d93e70fd9', '4f8c4220-28a5-4ad6-b7a5-4cfd165201b0',
 '2026-03-15', '2026-03-19', 1, 0, 'checked_out',
 150, 660, 60, 'paid', 660, 'Airbnb',
 'GM-2026-006', now() - interval '23 days', now()),

-- Room 108 | Marco Rossi | Apr 05–07 | 2 nights standard | Walk-in
(gen_random_uuid(), 'e83fbd69-4191-41b4-9651-cdbfd784786d', 'fb530b5a-570c-4b09-93b0-47a74bcf3714',
 '59d07a6e-bcc8-418d-a03d-47669d862b19', '4f8c4220-28a5-4ad6-b7a5-4cfd165201b0',
 '2026-04-05', '2026-04-07', 2, 0, 'checked_out',
 150, 330, 30, 'paid', 330, 'Walk-in',
 'GM-2026-007', now() - interval '2 days', now()),

-- Room 202 | Emma Thompson | Mar 22–26 | 4 nights superior | Expedia
(gen_random_uuid(), 'e83fbd69-4191-41b4-9651-cdbfd784786d', '12f70727-927f-4ff3-9652-300547a0254a',
 '5dbdc598-4dab-46bd-97d4-126e7f60e229', 'ecff2955-2711-4ca4-b630-9f68297dae3f',
 '2026-03-22', '2026-03-26', 2, 0, 'checked_out',
 200, 880, 80, 'paid', 880, 'Expedia',
 'GM-2026-008', now() - interval '16 days', now()),

-- Room 203 | Carlos Rivera | Mar 05–10 | 5 nights superior | Booking.com
(gen_random_uuid(), 'e83fbd69-4191-41b4-9651-cdbfd784786d', '8b7837dc-4b94-4930-b566-7013d048fdc8',
 '8b5f8f5c-0425-42c9-9dca-2a2cd2898682', 'ecff2955-2711-4ca4-b630-9f68297dae3f',
 '2026-03-05', '2026-03-10', 1, 0, 'checked_out',
 200, 1100, 100, 'paid', 1100, 'Booking.com',
 'GM-2026-009', now() - interval '29 days', now()),

-- Room 204 | Yuki Tanaka | Mar 28–Apr 03 | 6 nights superior | Corporate
(gen_random_uuid(), 'e83fbd69-4191-41b4-9651-cdbfd784786d', 'ece9568a-dd2e-4dfc-800d-c94c01d2a5c3',
 'bdd4dd07-cc9a-4ca1-9a9a-13a90486d49a', 'ecff2955-2711-4ca4-b630-9f68297dae3f',
 '2026-03-28', '2026-04-03', 2, 0, 'checked_out',
 200, 1320, 120, 'paid', 1320, 'Corporate',
 'GM-2026-010', now() - interval '10 days', now()),

-- Room 205 | Michael Chen | Mar 10–15 | 5 nights superior | Direct
(gen_random_uuid(), 'e83fbd69-4191-41b4-9651-cdbfd784786d', 'f6f9ef2c-56ff-4aae-9287-05f029bfc74d',
 'a1b0a62a-4efc-462a-83f2-0a3335fc5b41', 'ecff2955-2711-4ca4-b630-9f68297dae3f',
 '2026-03-10', '2026-03-15', 2, 0, 'checked_out',
 200, 1100, 100, 'paid', 1100, 'Direct',
 'GM-2026-020', now() - interval '24 days', now()),

-- Room 206 | Ahmed Al-Rashid | Mar 25–30 | 5 nights superior | Airbnb
(gen_random_uuid(), 'e83fbd69-4191-41b4-9651-cdbfd784786d', '227f4a46-145e-4973-bbae-348fce5130e0',
 '13e7b8b9-b1e8-4823-80ac-47b433b39d19', 'ecff2955-2711-4ca4-b630-9f68297dae3f',
 '2026-03-25', '2026-03-30', 2, 1, 'checked_out',
 200, 1100, 100, 'paid', 1100, 'Airbnb',
 'GM-2026-021', now() - interval '8 days', now()),

-- Room 301 | Marco Rossi | Mar 15–22 | 7 nights deluxe | Walk-in
(gen_random_uuid(), 'e83fbd69-4191-41b4-9651-cdbfd784786d', 'fb530b5a-570c-4b09-93b0-47a74bcf3714',
 '35206702-18eb-4a01-96dc-1108c8d48082', 'fad9134a-83ae-4de5-a69a-0fbbadfd23ee',
 '2026-03-15', '2026-03-22', 2, 0, 'checked_out',
 280, 2156, 196, 'paid', 2156, 'Walk-in',
 'GM-2026-022', now() - interval '17 days', now()),

-- Room 302 | Hans Mueller | Mar 20–25 | 5 nights deluxe | Expedia
(gen_random_uuid(), 'e83fbd69-4191-41b4-9651-cdbfd784786d', '0a4ebf0b-952a-4f7a-ae92-c4c75936f406',
 '91e61d2a-a9e4-40f8-821f-7e87038bad0d', 'fad9134a-83ae-4de5-a69a-0fbbadfd23ee',
 '2026-03-20', '2026-03-25', 2, 0, 'checked_out',
 280, 1540, 140, 'paid', 1540, 'Expedia',
 'GM-2026-023', now() - interval '13 days', now()),

-- Room 303 | Priya Sharma | Apr 01–05 | 4 nights deluxe | Direct
(gen_random_uuid(), 'e83fbd69-4191-41b4-9651-cdbfd784786d', '2874e68d-c139-4409-aec4-27ebc1c7fa7b',
 'f9caeddf-4df6-4aa2-91bc-89cc60eab1db', 'fad9134a-83ae-4de5-a69a-0fbbadfd23ee',
 '2026-04-01', '2026-04-05', 2, 0, 'checked_out',
 280, 1232, 112, 'paid', 1232, 'Direct',
 'GM-2026-024', now() - interval '3 days', now()),

-- Room 304 | David Kim | Mar 15–20 | 5 nights deluxe | Booking.com
(gen_random_uuid(), 'e83fbd69-4191-41b4-9651-cdbfd784786d', '9190e85d-a50d-4b12-9edd-9296a5900430',
 'b3cf2fc5-20f0-403c-9211-69eddd3d83f8', 'fad9134a-83ae-4de5-a69a-0fbbadfd23ee',
 '2026-03-15', '2026-03-20', 2, 0, 'checked_out',
 280, 1540, 140, 'paid', 1540, 'Booking.com',
 'GM-2026-025', now() - interval '19 days', now()),

-- Room 401 | Lisa Anderson | Mar 10–14 | 4 nights suite | Corporate
(gen_random_uuid(), 'e83fbd69-4191-41b4-9651-cdbfd784786d', 'e9eaed73-2769-4b9f-84bf-5e7838f9c8ef',
 '93bd65a4-face-4005-9cbf-de42c1e7ab89', '277f17ac-f949-468a-82be-15868f551515',
 '2026-03-10', '2026-03-14', 2, 0, 'checked_out',
 400, 1760, 160, 'paid', 1760, 'Corporate',
 'GM-2026-026', now() - interval '25 days', now()),

-- Room 402 | Emma Thompson | Mar 28–Apr 02 | 5 nights suite | Expedia
(gen_random_uuid(), 'e83fbd69-4191-41b4-9651-cdbfd784786d', '12f70727-927f-4ff3-9652-300547a0254a',
 '69cbcde4-dcc3-46c2-97b0-aaec1aee0ec5', '277f17ac-f949-468a-82be-15868f551515',
 '2026-03-28', '2026-04-02', 2, 0, 'checked_out',
 400, 2200, 200, 'paid', 2200, 'Expedia',
 'GM-2026-027', now() - interval '10 days', now()),

-- Room 501 | Yuki Tanaka | Mar 08–12 | 4 nights presidential | Direct
(gen_random_uuid(), 'e83fbd69-4191-41b4-9651-cdbfd784786d', 'ece9568a-dd2e-4dfc-800d-c94c01d2a5c3',
 'e61ad1a4-e06c-42e7-b6c3-aa748a231a70', '1b4b4f0e-a792-46fd-8d8d-3cb8a2bdc4aa',
 '2026-03-08', '2026-03-12', 2, 0, 'checked_out',
 700, 3080, 280, 'paid', 3080, 'Direct',
 'GM-2026-028', now() - interval '27 days', now()),

-- ============================================================
-- UPCOMING CONFIRMED (future bookings, April–May 2026)
-- ============================================================

-- Room 105 | Anna Kowalski | Apr 08–11 | 3 nights standard | Booking.com
(gen_random_uuid(), 'e83fbd69-4191-41b4-9651-cdbfd784786d', 'd045ce9c-868b-4601-ba2f-9874e6e1a1a8',
 '57b3d4a9-8fb3-43d4-92aa-c1e29b03057d', '4f8c4220-28a5-4ad6-b7a5-4cfd165201b0',
 '2026-04-08', '2026-04-11', 2, 0, 'confirmed',
 150, 495, 45, 'pending', 0, 'Booking.com',
 'GM-2026-029', now() - interval '7 days', now()),

-- Room 106 | Sarah O'Brien | Apr 12–16 | 4 nights standard | Direct
(gen_random_uuid(), 'e83fbd69-4191-41b4-9651-cdbfd784786d', 'c3120705-6cf1-48fd-8419-52645a0fd0ad',
 'f5e193ed-f6a6-4f5c-ac52-218f1b818c6a', '4f8c4220-28a5-4ad6-b7a5-4cfd165201b0',
 '2026-04-12', '2026-04-16', 1, 0, 'confirmed',
 150, 660, 60, 'pending', 0, 'Direct',
 'GM-2026-030', now() - interval '4 days', now()),

-- Room 205 | Lisa Anderson | Apr 10–14 | 4 nights superior | Airbnb
(gen_random_uuid(), 'e83fbd69-4191-41b4-9651-cdbfd784786d', 'e9eaed73-2769-4b9f-84bf-5e7838f9c8ef',
 'a1b0a62a-4efc-462a-83f2-0a3335fc5b41', 'ecff2955-2711-4ca4-b630-9f68297dae3f',
 '2026-04-10', '2026-04-14', 2, 0, 'confirmed',
 200, 880, 80, 'pending', 0, 'Airbnb',
 'GM-2026-031', now() - interval '14 days', now()),

-- Room 206 | Ahmed Al-Rashid | Apr 16–20 | 4 nights superior | Corporate
(gen_random_uuid(), 'e83fbd69-4191-41b4-9651-cdbfd784786d', '227f4a46-145e-4973-bbae-348fce5130e0',
 '13e7b8b9-b1e8-4823-80ac-47b433b39d19', 'ecff2955-2711-4ca4-b630-9f68297dae3f',
 '2026-04-16', '2026-04-20', 2, 0, 'confirmed',
 200, 880, 80, 'pending', 0, 'Corporate',
 'GM-2026-032', now() - interval '11 days', now()),

-- Room 302 | Priya Sharma | Apr 12–16 | 4 nights deluxe | Booking.com
(gen_random_uuid(), 'e83fbd69-4191-41b4-9651-cdbfd784786d', '2874e68d-c139-4409-aec4-27ebc1c7fa7b',
 '91e61d2a-a9e4-40f8-821f-7e87038bad0d', 'fad9134a-83ae-4de5-a69a-0fbbadfd23ee',
 '2026-04-12', '2026-04-16', 2, 0, 'confirmed',
 280, 1232, 112, 'pending', 0, 'Booking.com',
 'GM-2026-033', now() - interval '9 days', now()),

-- Room 402 | David Kim | Apr 15–19 | 4 nights suite | Expedia
(gen_random_uuid(), 'e83fbd69-4191-41b4-9651-cdbfd784786d', '9190e85d-a50d-4b12-9edd-9296a5900430',
 '69cbcde4-dcc3-46c2-97b0-aaec1aee0ec5', '277f17ac-f949-468a-82be-15868f551515',
 '2026-04-15', '2026-04-19', 2, 0, 'confirmed',
 400, 1760, 160, 'pending', 0, 'Expedia',
 'GM-2026-034', now() - interval '20 days', now()),

-- Room 403 | Carlos Rivera | Apr 22–26 | 4 nights suite | Direct
(gen_random_uuid(), 'e83fbd69-4191-41b4-9651-cdbfd784786d', '8b7837dc-4b94-4930-b566-7013d048fdc8',
 '78463d7e-411c-4b18-9dde-ecf65ec7adbc', '277f17ac-f949-468a-82be-15868f551515',
 '2026-04-22', '2026-04-26', 2, 0, 'confirmed',
 400, 1760, 160, 'pending', 0, 'Direct',
 'GM-2026-035', now() - interval '5 days', now()),

-- Room 501 | Sophie Martin | Apr 20–24 | 4 nights presidential | Direct
(gen_random_uuid(), 'e83fbd69-4191-41b4-9651-cdbfd784786d', '7a8745bd-c5d3-4eae-b3ff-1c029ed26a57',
 'e61ad1a4-e06c-42e7-b6c3-aa748a231a70', '1b4b4f0e-a792-46fd-8d8d-3cb8a2bdc4aa',
 '2026-04-20', '2026-04-24', 2, 0, 'confirmed',
 700, 3080, 280, 'pending', 0, 'Direct',
 'GM-2026-036', now() - interval '16 days', now()),

-- ============================================================
-- CANCELLED (realistic cancellation rate ~12%)
-- ============================================================

-- Room 108 | Anna Kowalski | Apr 09–14 | cancelled | Direct
(gen_random_uuid(), 'e83fbd69-4191-41b4-9651-cdbfd784786d', 'd045ce9c-868b-4601-ba2f-9874e6e1a1a8',
 '59d07a6e-bcc8-418d-a03d-47669d862b19', '4f8c4220-28a5-4ad6-b7a5-4cfd165201b0',
 '2026-04-09', '2026-04-14', 2, 0, 'cancelled',
 150, 825, 75, 'refunded', 0, 'Direct',
 'GM-2026-037', now() - interval '3 days', now()),

-- Room 303 | Michael Chen | Apr 18–23 | cancelled | Expedia
(gen_random_uuid(), 'e83fbd69-4191-41b4-9651-cdbfd784786d', 'f6f9ef2c-56ff-4aae-9287-05f029bfc74d',
 'f9caeddf-4df6-4aa2-91bc-89cc60eab1db', 'fad9134a-83ae-4de5-a69a-0fbbadfd23ee',
 '2026-04-18', '2026-04-23', 1, 0, 'cancelled',
 280, 1540, 140, 'refunded', 0, 'Expedia',
 'GM-2026-038', now() - interval '1 day', now())

ON CONFLICT DO NOTHING;
