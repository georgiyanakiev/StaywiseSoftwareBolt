
/*
  # Fix guest_communications schema to match CRM code expectations

  ## Summary
  The Guest CRM code (GuestProfilePage, useGuestProfiles) inserts and reads
  `guest_profile_id`, `body`, and `direction` columns from `guest_communications`,
  but the table only had `guest_id`, `message`, and no direction column.

  ## Changes

  ### Modified Table: guest_communications
  - Add `guest_profile_id` (uuid) — mirrors `guest_id`; populated from existing rows.
  - Add `body` (text) — mirrors `message`; populated from existing rows.
  - Add `direction` (text) — defaults to 'outbound'.
  - Add `tenant_id` (uuid) — for multi-tenant consistency.

  ### Notes
  - Existing rows have guest_profile_id set equal to guest_id and body copied from message.
  - Both `guest_id` and `guest_profile_id` are kept so legacy queries continue to work.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'guest_communications' AND column_name = 'guest_profile_id'
  ) THEN
    ALTER TABLE guest_communications ADD COLUMN guest_profile_id uuid REFERENCES guests(id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'guest_communications' AND column_name = 'body'
  ) THEN
    ALTER TABLE guest_communications ADD COLUMN body text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'guest_communications' AND column_name = 'direction'
  ) THEN
    ALTER TABLE guest_communications ADD COLUMN direction text NOT NULL DEFAULT 'outbound';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'guest_communications' AND column_name = 'tenant_id'
  ) THEN
    ALTER TABLE guest_communications ADD COLUMN tenant_id uuid REFERENCES tenants(id);
  END IF;
END $$;

-- Back-fill guest_profile_id from guest_id
UPDATE guest_communications
SET guest_profile_id = guest_id
WHERE guest_profile_id IS NULL AND guest_id IS NOT NULL;

-- Back-fill body from message
UPDATE guest_communications
SET body = message
WHERE body IS NULL AND message IS NOT NULL;

-- Back-fill tenant_id via hotel
UPDATE guest_communications gc
SET tenant_id = h.tenant_id
FROM hotels h
WHERE h.id = gc.hotel_id AND gc.tenant_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_guest_communications_guest_profile_id ON guest_communications(guest_profile_id);
