/*
  # Expedia Integration Tables

  ## Summary
  Adds the infrastructure needed to connect StayWise with the Expedia Connectivity API
  (Expedia Group Partner Central / EQC - Expedia QuickConnect).

  ## New Tables

  ### `expedia_settings`
  Stores per-hotel Expedia API credentials and configuration:
  - `hotel_id` - references the hotel this config belongs to
  - `hotel_code` - the Expedia hotel/property ID assigned after onboarding
  - `api_key` - Expedia EQC API key
  - `api_secret` - Expedia EQC API secret
  - `pos_id` - Point of Sale ID for rate/availability pushes
  - `is_enabled` - whether the integration is active
  - `sync_reservations` - whether to pull new/updated reservations from Expedia
  - `sync_availability` - whether to push availability/rates back to Expedia
  - `last_sync_at` - timestamp of last successful sync
  - `last_sync_status` - result of last sync (never/success/partial/failed)
  - `sync_interval_minutes` - how often to auto-sync (default 15)
  - `rate_multiplier` - multiply local base rates by this factor before pushing
  - `min_advance_days` - minimum days advance booking required
  - `max_advance_days` - maximum days in advance guests can book

  ### `expedia_sync_logs`
  Audit trail of every sync attempt:
  - `hotel_id` - the hotel being synced
  - `direction` - 'inbound' (pulling reservations) or 'outbound' (pushing availability)
  - `status` - 'success', 'partial', 'failed', 'running'
  - `records_processed` - how many records were processed
  - `error_message` - description if sync failed
  - `raw_payload` - JSON blob for debugging

  ### `expedia_room_mappings`
  Maps local room types to Expedia room type codes:
  - `hotel_id` - the hotel
  - `room_type_id` - local RoomType UUID
  - `expedia_room_type_id` - Expedia room type ID
  - `expedia_rate_plan_id` - Expedia rate plan ID

  ## Security
  - RLS enabled on all three tables
  - Only authenticated staff members of the hotel can access their hotel's data
  - Write access restricted to admin and manager roles
*/

CREATE TABLE IF NOT EXISTS expedia_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  hotel_code text NOT NULL DEFAULT '',
  api_key text NOT NULL DEFAULT '',
  api_secret text NOT NULL DEFAULT '',
  pos_id text NOT NULL DEFAULT '',
  is_enabled boolean NOT NULL DEFAULT false,
  sync_reservations boolean NOT NULL DEFAULT true,
  sync_availability boolean NOT NULL DEFAULT true,
  last_sync_at timestamptz,
  last_sync_status text NOT NULL DEFAULT 'never',
  sync_interval_minutes int NOT NULL DEFAULT 15,
  rate_multiplier numeric(5,4) NOT NULL DEFAULT 1.0000,
  min_advance_days int NOT NULL DEFAULT 0,
  max_advance_days int NOT NULL DEFAULT 365,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (hotel_id)
);

CREATE TABLE IF NOT EXISTS expedia_sync_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  direction text NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  status text NOT NULL CHECK (status IN ('success', 'partial', 'failed', 'running')),
  records_processed int NOT NULL DEFAULT 0,
  error_message text,
  raw_payload jsonb,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS expedia_room_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  room_type_id uuid NOT NULL REFERENCES room_types(id) ON DELETE CASCADE,
  expedia_room_type_id text NOT NULL DEFAULT '',
  expedia_rate_plan_id text NOT NULL DEFAULT '',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (hotel_id, room_type_id)
);

ALTER TABLE expedia_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE expedia_sync_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE expedia_room_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view expedia settings"
  ON expedia_settings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff_members
      WHERE staff_members.hotel_id = expedia_settings.hotel_id
        AND staff_members.user_id = auth.uid()
        AND staff_members.is_active = true
    )
  );

CREATE POLICY "Admin staff can insert expedia settings"
  ON expedia_settings FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM staff_members
      WHERE staff_members.hotel_id = expedia_settings.hotel_id
        AND staff_members.user_id = auth.uid()
        AND staff_members.is_active = true
        AND staff_members.role IN ('admin', 'manager')
    )
  );

CREATE POLICY "Admin staff can update expedia settings"
  ON expedia_settings FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff_members
      WHERE staff_members.hotel_id = expedia_settings.hotel_id
        AND staff_members.user_id = auth.uid()
        AND staff_members.is_active = true
        AND staff_members.role IN ('admin', 'manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM staff_members
      WHERE staff_members.hotel_id = expedia_settings.hotel_id
        AND staff_members.user_id = auth.uid()
        AND staff_members.is_active = true
        AND staff_members.role IN ('admin', 'manager')
    )
  );

CREATE POLICY "Staff can view expedia sync logs"
  ON expedia_sync_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff_members
      WHERE staff_members.hotel_id = expedia_sync_logs.hotel_id
        AND staff_members.user_id = auth.uid()
        AND staff_members.is_active = true
    )
  );

CREATE POLICY "Admin staff can insert expedia sync logs"
  ON expedia_sync_logs FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM staff_members
      WHERE staff_members.hotel_id = expedia_sync_logs.hotel_id
        AND staff_members.user_id = auth.uid()
        AND staff_members.is_active = true
        AND staff_members.role IN ('admin', 'manager')
    )
  );

CREATE POLICY "Staff can view expedia room mappings"
  ON expedia_room_mappings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff_members
      WHERE staff_members.hotel_id = expedia_room_mappings.hotel_id
        AND staff_members.user_id = auth.uid()
        AND staff_members.is_active = true
    )
  );

CREATE POLICY "Admin staff can insert expedia room mappings"
  ON expedia_room_mappings FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM staff_members
      WHERE staff_members.hotel_id = expedia_room_mappings.hotel_id
        AND staff_members.user_id = auth.uid()
        AND staff_members.is_active = true
        AND staff_members.role IN ('admin', 'manager')
    )
  );

CREATE POLICY "Admin staff can update expedia room mappings"
  ON expedia_room_mappings FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff_members
      WHERE staff_members.hotel_id = expedia_room_mappings.hotel_id
        AND staff_members.user_id = auth.uid()
        AND staff_members.is_active = true
        AND staff_members.role IN ('admin', 'manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM staff_members
      WHERE staff_members.hotel_id = expedia_room_mappings.hotel_id
        AND staff_members.user_id = auth.uid()
        AND staff_members.is_active = true
        AND staff_members.role IN ('admin', 'manager')
    )
  );

CREATE INDEX IF NOT EXISTS idx_expedia_settings_hotel_id ON expedia_settings(hotel_id);
CREATE INDEX IF NOT EXISTS idx_expedia_sync_logs_hotel_id ON expedia_sync_logs(hotel_id);
CREATE INDEX IF NOT EXISTS idx_expedia_sync_logs_created_at ON expedia_sync_logs(hotel_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_expedia_room_mappings_hotel_id ON expedia_room_mappings(hotel_id);
