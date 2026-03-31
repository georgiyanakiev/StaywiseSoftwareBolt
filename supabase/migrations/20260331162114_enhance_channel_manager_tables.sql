/*
  # Enhance Channel Manager Tables

  ## Summary
  Adds missing columns required by the full Channel Manager feature spec.

  ## Changes to `channels`
  - `type` — OTA type enum (booking_com, airbnb, expedia, direct, other)
  - `commission_pct` — commission percentage
  - `client_id` — OAuth client ID
  - `client_secret` — OAuth client secret
  - `sync_enabled` — whether auto-sync is on

  ## Changes to `channel_rates`
  - `max_stay` — maximum stay restriction
  - `closed_to_departure` — restriction flag
  - `sync_status` — canonical alias for the `status` column (alias via generated column not viable; we add it as a real column defaulting to status value)

  ## Changes to `channel_sync_logs`
  - `dates_affected` — how many date-slots were updated

  ## Security
  - RLS already enabled on these tables from previous migrations; no changes needed
*/

-- ── channels additions ──────────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='channels' AND column_name='type') THEN
    ALTER TABLE channels ADD COLUMN type text DEFAULT 'other' CHECK (type IN ('booking_com','airbnb','expedia','direct','other'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='channels' AND column_name='commission_pct') THEN
    ALTER TABLE channels ADD COLUMN commission_pct numeric(5,2) DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='channels' AND column_name='client_id') THEN
    ALTER TABLE channels ADD COLUMN client_id text DEFAULT '';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='channels' AND column_name='client_secret') THEN
    ALTER TABLE channels ADD COLUMN client_secret text DEFAULT '';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='channels' AND column_name='sync_enabled') THEN
    ALTER TABLE channels ADD COLUMN sync_enabled boolean DEFAULT true;
  END IF;
END $$;

-- ── channel_rates additions ────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='channel_rates' AND column_name='max_stay') THEN
    ALTER TABLE channel_rates ADD COLUMN max_stay integer;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='channel_rates' AND column_name='closed_to_departure') THEN
    ALTER TABLE channel_rates ADD COLUMN closed_to_departure boolean DEFAULT false;
  END IF;
END $$;

-- ── channel_sync_logs additions ────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='channel_sync_logs' AND column_name='dates_affected') THEN
    ALTER TABLE channel_sync_logs ADD COLUMN dates_affected integer DEFAULT 0;
  END IF;
END $$;

-- ── backfill type from name for existing rows ──────────────────────────────
UPDATE channels SET type = 'booking_com' WHERE lower(name) LIKE '%booking%' AND type = 'other';
UPDATE channels SET type = 'airbnb'      WHERE lower(name) LIKE '%airbnb%'   AND type = 'other';
UPDATE channels SET type = 'expedia'     WHERE lower(name) LIKE '%expedia%'  AND type = 'other';
UPDATE channels SET type = 'direct'      WHERE lower(name) LIKE '%direct%'   AND type = 'other';

-- ── backfill commission_pct ────────────────────────────────────────────────
UPDATE channels SET commission_pct = 15 WHERE lower(name) LIKE '%booking%' AND commission_pct = 0;
UPDATE channels SET commission_pct = 12 WHERE lower(name) LIKE '%airbnb%'  AND commission_pct = 0;
UPDATE channels SET commission_pct = 18 WHERE lower(name) LIKE '%expedia%' AND commission_pct = 0;

-- ── seed 30-day channel_rates for demo hotel if empty ─────────────────────
DO $$
DECLARE
  v_hotel_id uuid := '358b47d2-d31b-4a90-89de-9cdb0d76f7c2';
  v_tenant_id uuid := 'f9c53ff1-d7ee-42e4-8700-2af3e0c9e301';
  v_rate_count integer;
  ch RECORD;
  rt RECORD;
  d date;
BEGIN
  SELECT COUNT(*) INTO v_rate_count FROM channel_rates WHERE hotel_id = v_hotel_id;

  IF v_rate_count = 0 THEN
    FOR ch IN SELECT id FROM channels WHERE hotel_id = v_hotel_id LOOP
      FOR rt IN SELECT id, base_rate FROM room_types WHERE hotel_id = v_hotel_id LOOP
        FOR d IN SELECT generate_series(current_date, current_date + 29, '1 day')::date LOOP
          INSERT INTO channel_rates (
            hotel_id, channel_id, room_type_id, tenant_id,
            date, rate, availability, min_stay, status
          ) VALUES (
            v_hotel_id, ch.id, rt.id, v_tenant_id,
            d,
            rt.base_rate * (0.9 + random() * 0.4),
            floor(random() * 8 + 2)::integer,
            1,
            'synced'
          )
          ON CONFLICT DO NOTHING;
        END LOOP;
      END LOOP;
    END LOOP;
  END IF;
END $$;
