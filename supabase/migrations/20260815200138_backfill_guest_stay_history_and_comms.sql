-- Backfill stay history from reservations and communications from guest_emails,
-- then update the sync trigger to maintain stay history going forward.

-- 1) Backfill stay history from reservations
INSERT INTO guest_stay_history (
  guest_profile_id, hotel_id, tenant_id, booking_id, room_number, room_type,
  check_in, check_out, nights, total_amount, source, special_requests, created_at
)
SELECT
  gp.id,
  r.hotel_id,
  gp.tenant_id,
  r.id,
  rm.number,
  rt.name,
  r.check_in,
  r.check_out,
  GREATEST((r.check_out - r.check_in), 1),
  r.total_amount,
  COALESCE(r.source, r.booking_source, 'direct'),
  COALESCE(r.special_requests, ''),
  now()
FROM reservations r
JOIN guest_profiles gp ON gp.guest_id = r.guest_id
LEFT JOIN rooms rm ON rm.id = r.room_id
LEFT JOIN room_types rt ON rt.id = r.room_type_id
WHERE r.status NOT IN ('cancelled')
  AND NOT EXISTS (
    SELECT 1 FROM guest_stay_history h
    WHERE h.guest_profile_id = gp.id AND h.booking_id = r.id
  );

-- 2) Backfill guest_communications from guest_emails
INSERT INTO guest_communications (
  guest_id, hotel_id, guest_profile_id, type, subject, body,
  sent_by, sent_at, status, direction, tenant_id, created_at
)
SELECT
  ge.guest_id,
  ge.hotel_id,
  gp.id,
  'email',
  ge.subject,
  COALESCE(ge.subject, ''),
  NULL,
  ge.sent_at,
  ge.status,
  'outbound',
  gp.tenant_id,
  COALESCE(ge.created_at, now())
FROM guest_emails ge
JOIN guest_profiles gp ON gp.guest_id = ge.guest_id
WHERE NOT EXISTS (
  SELECT 1 FROM guest_communications gc
  WHERE gc.guest_profile_id = gp.id
    AND gc.subject = ge.subject
    AND gc.sent_at IS NOT DISTINCT FROM ge.sent_at
);

-- 3) Update the sync trigger to also upsert stay history on reservation create/update
CREATE OR REPLACE FUNCTION public.sync_guest_profile_stats()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  v_guest          guests%ROWTYPE;
  v_profile_id     uuid;
  v_total_stays    integer;
  v_total_spent    numeric;
  v_last_stay      date;
  v_tier           text;
  v_tenant_id      uuid;
  v_room_number    text;
  v_room_type      text;
  v_nights         integer;
BEGIN
  SELECT * INTO v_guest FROM guests WHERE id = NEW.guest_id;
  IF NOT FOUND THEN RETURN NEW; END IF;

  SELECT COUNT(*), COALESCE(SUM(total_amount), 0), MAX(check_out)
  INTO v_total_stays, v_total_spent, v_last_stay
  FROM reservations
  WHERE guest_id = NEW.guest_id AND status NOT IN ('cancelled');

  v_tier := CASE
    WHEN v_total_stays >= 10 THEN 'platinum'
    WHEN v_total_stays >= 5  THEN 'gold'
    WHEN v_total_stays >= 2  THEN 'silver'
    ELSE 'standard'
  END;

  SELECT tenant_id INTO v_tenant_id FROM hotels WHERE id = v_guest.hotel_id;

  INSERT INTO guest_profiles (
    guest_id, hotel_id, tenant_id,
    full_name, email, phone,
    nationality, country, city, address,
    date_of_birth, notes,
    dietary_requirements, room_preferences,
    marketing_opt_in,
    total_stays, total_spent, last_stay_at,
    loyalty_tier, updated_at
  )
  VALUES (
    v_guest.id, v_guest.hotel_id, v_tenant_id,
    TRIM(v_guest.first_name || ' ' || v_guest.last_name),
    v_guest.email, COALESCE(v_guest.mobile, v_guest.phone),
    v_guest.nationality, v_guest.country, v_guest.city, v_guest.address,
    v_guest.date_of_birth, v_guest.notes,
    v_guest.dietary_restrictions, v_guest.special_requests,
    COALESCE(v_guest.email_opt_in, false),
    v_total_stays, v_total_spent, v_last_stay,
    v_tier, now()
  )
  ON CONFLICT (guest_id) DO UPDATE
  SET total_stays   = EXCLUDED.total_stays,
      total_spent   = EXCLUDED.total_spent,
      last_stay_at  = EXCLUDED.last_stay_at,
      loyalty_tier  = EXCLUDED.loyalty_tier,
      updated_at    = now()
  RETURNING id INTO v_profile_id;

  IF NEW.status NOT IN ('cancelled') THEN
    SELECT number INTO v_room_number FROM rooms WHERE id = NEW.room_id;
    SELECT name INTO v_room_type FROM room_types WHERE id = NEW.room_type_id;
    v_nights := GREATEST((NEW.check_out - NEW.check_in), 1);

    INSERT INTO guest_stay_history (
      guest_profile_id, hotel_id, tenant_id, booking_id,
      room_number, room_type, check_in, check_out,
      nights, total_amount, source, special_requests, created_at
    )
    VALUES (
      v_profile_id, NEW.hotel_id, v_tenant_id, NEW.id,
      v_room_number, v_room_type, NEW.check_in, NEW.check_out,
      v_nights, NEW.total_amount,
      COALESCE(NEW.source, NEW.booking_source, 'direct'),
      COALESCE(NEW.special_requests, ''), now()
    )
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$function$;
