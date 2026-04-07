/*
  # Fix Guest CRM Link — Auto-Create Profiles from Reservation Data

  ## Problem
  1. `guest_profiles` has no direct FK to `guests`, so the reservation trigger
     (`WHERE id = NEW.guest_id`) never matched any profile row — stats never updated.
  2. No trigger on the `guests` table, so new guests never got a CRM profile.

  ## Changes
  1. Add nullable `guest_id` FK column to `guest_profiles` referencing `guests.id`.
  2. Backfill `guest_id` by matching `hotel_id + email`.
  3. Replace the broken `sync_guest_profile_stats()` trigger function with a correct
     version that finds profiles via `guest_id` and performs an UPSERT so a missing
     profile is created on the spot.
  4. Add `trg_auto_create_guest_profile` on the `guests` table to create a CRM profile
     immediately whenever a new guest row is inserted.
*/

-- 1. Add guest_id FK to guest_profiles (nullable to preserve orphaned profiles)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'guest_profiles' AND column_name = 'guest_id'
  ) THEN
    ALTER TABLE guest_profiles ADD COLUMN guest_id uuid REFERENCES guests(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_guest_profiles_guest_id ON guest_profiles(guest_id);
  END IF;
END $$;

-- 2. Backfill guest_id where email + hotel_id match
UPDATE guest_profiles gp
SET guest_id = g.id
FROM guests g
WHERE g.hotel_id = gp.hotel_id
  AND LOWER(g.email) = LOWER(gp.email)
  AND gp.guest_id IS NULL;

-- 3. Drop and replace the broken trigger function
CREATE OR REPLACE FUNCTION sync_guest_profile_stats()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_guest          guests%ROWTYPE;
  v_profile_id     uuid;
  v_total_stays    integer;
  v_total_spent    numeric;
  v_last_stay      date;
  v_tier           text;
BEGIN
  -- Load the guest row
  SELECT * INTO v_guest FROM guests WHERE id = NEW.guest_id;
  IF NOT FOUND THEN RETURN NEW; END IF;

  -- Aggregate stats from all non-cancelled reservations for this guest
  SELECT
    COUNT(*),
    COALESCE(SUM(total_amount), 0),
    MAX(check_out)
  INTO v_total_stays, v_total_spent, v_last_stay
  FROM reservations
  WHERE guest_id = NEW.guest_id
    AND status NOT IN ('cancelled');

  -- Derive loyalty tier
  v_tier := CASE
    WHEN v_total_stays >= 10 THEN 'platinum'
    WHEN v_total_stays >= 5  THEN 'gold'
    WHEN v_total_stays >= 2  THEN 'silver'
    ELSE 'standard'
  END;

  -- Upsert the CRM profile, creating it if it doesn't exist yet
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
    v_guest.id, v_guest.hotel_id,
    (SELECT tenant_id FROM hotels WHERE id = v_guest.hotel_id),
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
        updated_at    = now();

  RETURN NEW;
END;
$$;

-- Unique constraint required for ON CONFLICT (guest_id) to work
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'guest_profiles_guest_id_key'
  ) THEN
    ALTER TABLE guest_profiles ADD CONSTRAINT guest_profiles_guest_id_key UNIQUE (guest_id);
  END IF;
END $$;

-- 4. Auto-create CRM profile when a new guest is inserted
CREATE OR REPLACE FUNCTION auto_create_guest_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO guest_profiles (
    guest_id, hotel_id, tenant_id,
    full_name, email, phone,
    nationality, country, city, address,
    date_of_birth, notes,
    dietary_requirements, room_preferences,
    marketing_opt_in,
    total_stays, total_spent,
    loyalty_tier
  )
  VALUES (
    NEW.id, NEW.hotel_id,
    (SELECT tenant_id FROM hotels WHERE id = NEW.hotel_id),
    TRIM(NEW.first_name || ' ' || NEW.last_name),
    NEW.email, COALESCE(NEW.mobile, NEW.phone),
    NEW.nationality, NEW.country, NEW.city, NEW.address,
    NEW.date_of_birth, NEW.notes,
    NEW.dietary_restrictions, NEW.special_requests,
    COALESCE(NEW.email_opt_in, false),
    0, 0,
    'standard'
  )
  ON CONFLICT (guest_id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_create_guest_profile ON guests;
CREATE TRIGGER trg_auto_create_guest_profile
  AFTER INSERT ON guests
  FOR EACH ROW EXECUTE FUNCTION auto_create_guest_profile();

-- Re-sync all existing guests that already have profiles (updates stats)
-- This is safe: it just refreshes total_stays/total_spent/last_stay_at/loyalty_tier
UPDATE guest_profiles gp
SET
  total_stays  = (
    SELECT COUNT(*) FROM reservations r
    WHERE r.guest_id = gp.guest_id AND r.status NOT IN ('cancelled')
  ),
  total_spent  = (
    SELECT COALESCE(SUM(r.total_amount), 0) FROM reservations r
    WHERE r.guest_id = gp.guest_id AND r.status NOT IN ('cancelled')
  ),
  last_stay_at = (
    SELECT MAX(r.check_out) FROM reservations r WHERE r.guest_id = gp.guest_id
  ),
  loyalty_tier = CASE
    WHEN (SELECT COUNT(*) FROM reservations r WHERE r.guest_id = gp.guest_id AND r.status NOT IN ('cancelled')) >= 10 THEN 'platinum'
    WHEN (SELECT COUNT(*) FROM reservations r WHERE r.guest_id = gp.guest_id AND r.status NOT IN ('cancelled')) >= 5  THEN 'gold'
    WHEN (SELECT COUNT(*) FROM reservations r WHERE r.guest_id = gp.guest_id AND r.status NOT IN ('cancelled')) >= 2  THEN 'silver'
    ELSE 'standard'
  END,
  updated_at = now()
WHERE gp.guest_id IS NOT NULL;
