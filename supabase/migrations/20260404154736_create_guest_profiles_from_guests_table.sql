
/*
  # Create guest_profiles table and populate from guests

  ## Summary
  The Guest CRM module queries a `guest_profiles` table that did not exist.
  The actual guest data lives in the `guests` table with a different schema
  (split first_name/last_name, vip_status instead of loyalty_tier, etc.).

  ## Changes

  ### New Tables
  - `guest_profiles` — CRM-oriented guest view with loyalty_tier, tags, blacklisted,
    marketing_opt_in, last_stay_at, etc. Uses the same primary key IDs as `guests`
    so existing FK references continue to work.
  - `guest_stay_history` — Per-reservation stay records linked to guest_profiles.

  ### Data Population
  - All existing `guests` rows are mapped into `guest_profiles`.
  - `loyalty_tier` is derived from `total_stays`.
  - `last_stay_at` is derived from MAX(check_out) across reservations.
  - `tenant_id` is resolved via hotels.tenant_id.

  ### Triggers
  - `trg_sync_guest_profile_on_reservation` — Keeps total_stays, total_spent,
    last_stay_at, loyalty_tier current on every reservation insert/update.

  ### Security
  - RLS enabled on both new tables with hotel-scoped staff policies.
*/

-- ============================================================
-- 1. guest_profiles
-- ============================================================
CREATE TABLE IF NOT EXISTS guest_profiles (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id            uuid REFERENCES tenants(id),
  hotel_id             uuid NOT NULL REFERENCES hotels(id),
  full_name            text NOT NULL DEFAULT '',
  email                text,
  phone                text,
  date_of_birth        date,
  nationality          text,
  country              text,
  city                 text,
  address              text,
  company              text,
  vat_number           text,
  loyalty_tier         text NOT NULL DEFAULT 'standard' CHECK (loyalty_tier IN ('standard','silver','gold','platinum')),
  loyalty_points       integer NOT NULL DEFAULT 0,
  marketing_opt_in     boolean NOT NULL DEFAULT false,
  tags                 text[] NOT NULL DEFAULT '{}',
  notes                text,
  blacklisted          boolean NOT NULL DEFAULT false,
  last_stay_at         date,
  total_stays          integer NOT NULL DEFAULT 0,
  total_spent          numeric(12,2) NOT NULL DEFAULT 0,
  dietary_requirements text,
  room_preferences     text,
  language_preference  text,
  birthday_month       integer,
  birthday_day         integer,
  anniversary_date     date,
  special_occasions    text,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE guest_profiles ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_guest_profiles_hotel_id   ON guest_profiles(hotel_id);
CREATE INDEX IF NOT EXISTS idx_guest_profiles_tenant_id  ON guest_profiles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_guest_profiles_email      ON guest_profiles(email);

CREATE POLICY "Staff can view hotel guest profiles"
  ON guest_profiles FOR SELECT
  TO authenticated
  USING (
    hotel_id IN (
      SELECT sm.hotel_id FROM staff_members sm
      WHERE sm.user_id = auth.uid() AND sm.is_active = true
    )
  );

CREATE POLICY "Staff can insert hotel guest profiles"
  ON guest_profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    hotel_id IN (
      SELECT sm.hotel_id FROM staff_members sm
      WHERE sm.user_id = auth.uid() AND sm.is_active = true
    )
  );

CREATE POLICY "Staff can update hotel guest profiles"
  ON guest_profiles FOR UPDATE
  TO authenticated
  USING (
    hotel_id IN (
      SELECT sm.hotel_id FROM staff_members sm
      WHERE sm.user_id = auth.uid() AND sm.is_active = true
    )
  )
  WITH CHECK (
    hotel_id IN (
      SELECT sm.hotel_id FROM staff_members sm
      WHERE sm.user_id = auth.uid() AND sm.is_active = true
    )
  );

CREATE POLICY "Staff can delete hotel guest profiles"
  ON guest_profiles FOR DELETE
  TO authenticated
  USING (
    hotel_id IN (
      SELECT sm.hotel_id FROM staff_members sm
      WHERE sm.user_id = auth.uid() AND sm.is_active = true
    )
  );

-- ============================================================
-- 2. guest_stay_history
-- ============================================================
CREATE TABLE IF NOT EXISTS guest_stay_history (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        uuid REFERENCES tenants(id),
  hotel_id         uuid REFERENCES hotels(id),
  guest_profile_id uuid NOT NULL REFERENCES guest_profiles(id) ON DELETE CASCADE,
  booking_id       uuid REFERENCES reservations(id),
  room_number      text,
  room_type        text,
  check_in         date,
  check_out        date,
  nights           integer,
  total_amount     numeric(12,2),
  source           text,
  special_requests text,
  notes            text,
  rating           integer,
  review_text      text,
  created_at       timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE guest_stay_history ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_guest_stay_history_guest_profile_id ON guest_stay_history(guest_profile_id);
CREATE INDEX IF NOT EXISTS idx_guest_stay_history_hotel_id         ON guest_stay_history(hotel_id);

CREATE POLICY "Staff can view hotel guest stay history"
  ON guest_stay_history FOR SELECT
  TO authenticated
  USING (
    hotel_id IN (
      SELECT sm.hotel_id FROM staff_members sm
      WHERE sm.user_id = auth.uid() AND sm.is_active = true
    )
  );

CREATE POLICY "Staff can insert hotel guest stay history"
  ON guest_stay_history FOR INSERT
  TO authenticated
  WITH CHECK (
    hotel_id IN (
      SELECT sm.hotel_id FROM staff_members sm
      WHERE sm.user_id = auth.uid() AND sm.is_active = true
    )
  );

CREATE POLICY "Staff can update hotel guest stay history"
  ON guest_stay_history FOR UPDATE
  TO authenticated
  USING (
    hotel_id IN (
      SELECT sm.hotel_id FROM staff_members sm
      WHERE sm.user_id = auth.uid() AND sm.is_active = true
    )
  )
  WITH CHECK (
    hotel_id IN (
      SELECT sm.hotel_id FROM staff_members sm
      WHERE sm.user_id = auth.uid() AND sm.is_active = true
    )
  );

CREATE POLICY "Staff can delete hotel guest stay history"
  ON guest_stay_history FOR DELETE
  TO authenticated
  USING (
    hotel_id IN (
      SELECT sm.hotel_id FROM staff_members sm
      WHERE sm.user_id = auth.uid() AND sm.is_active = true
    )
  );

-- ============================================================
-- 3. Populate guest_profiles from existing guests table
-- ============================================================
INSERT INTO guest_profiles (
  id, tenant_id, hotel_id, full_name, email, phone,
  date_of_birth, nationality, country, city, address,
  loyalty_tier, marketing_opt_in, notes,
  total_stays, total_spent, last_stay_at, created_at, updated_at
)
SELECT
  g.id,
  h.tenant_id,
  g.hotel_id,
  trim(g.first_name || ' ' || g.last_name),
  NULLIF(trim(g.email), ''),
  NULLIF(trim(COALESCE(g.mobile, g.phone)), ''),
  g.date_of_birth,
  NULLIF(trim(g.nationality), ''),
  NULLIF(trim(g.country), ''),
  NULLIF(trim(g.city), ''),
  NULLIF(trim(g.address), ''),
  CASE
    WHEN g.total_stays >= 10 THEN 'platinum'
    WHEN g.total_stays >= 5  THEN 'gold'
    WHEN g.total_stays >= 2  THEN 'silver'
    ELSE 'standard'
  END,
  COALESCE(g.email_opt_in, false),
  NULLIF(trim(g.notes), ''),
  g.total_stays,
  g.total_spent,
  (SELECT MAX(r.check_out) FROM reservations r WHERE r.guest_id = g.id),
  g.created_at,
  g.updated_at
FROM guests g
JOIN hotels h ON h.id = g.hotel_id
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 4. Populate guest_stay_history from existing reservations
-- ============================================================
INSERT INTO guest_stay_history (
  id, tenant_id, hotel_id, guest_profile_id, booking_id,
  check_in, check_out, nights, total_amount, source, special_requests, created_at
)
SELECT
  gen_random_uuid(),
  h.tenant_id,
  r.hotel_id,
  r.guest_id,
  r.id,
  r.check_in,
  r.check_out,
  (r.check_out - r.check_in),
  r.total_amount,
  r.booking_source,
  NULLIF(trim(r.special_requests), ''),
  r.created_at
FROM reservations r
JOIN hotels h ON h.id = r.hotel_id
WHERE r.guest_id IN (SELECT id FROM guest_profiles);

-- ============================================================
-- 5. Trigger: keep guest_profiles stats in sync with reservations
-- ============================================================
CREATE OR REPLACE FUNCTION sync_guest_profile_stats()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE guest_profiles
  SET
    total_stays = (
      SELECT COUNT(*) FROM reservations
      WHERE guest_id = NEW.guest_id AND status NOT IN ('cancelled')
    ),
    total_spent = (
      SELECT COALESCE(SUM(total_amount), 0) FROM reservations
      WHERE guest_id = NEW.guest_id AND status NOT IN ('cancelled')
    ),
    last_stay_at = (
      SELECT MAX(check_out) FROM reservations WHERE guest_id = NEW.guest_id
    ),
    loyalty_tier = CASE
      WHEN (SELECT COUNT(*) FROM reservations WHERE guest_id = NEW.guest_id AND status NOT IN ('cancelled')) >= 10 THEN 'platinum'
      WHEN (SELECT COUNT(*) FROM reservations WHERE guest_id = NEW.guest_id AND status NOT IN ('cancelled')) >= 5  THEN 'gold'
      WHEN (SELECT COUNT(*) FROM reservations WHERE guest_id = NEW.guest_id AND status NOT IN ('cancelled')) >= 2  THEN 'silver'
      ELSE 'standard'
    END,
    updated_at = now()
  WHERE id = NEW.guest_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_guest_profile_on_reservation ON reservations;
CREATE TRIGGER trg_sync_guest_profile_on_reservation
  AFTER INSERT OR UPDATE ON reservations
  FOR EACH ROW EXECUTE FUNCTION sync_guest_profile_stats();
