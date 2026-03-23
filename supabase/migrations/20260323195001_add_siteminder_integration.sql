/*
  # Add SiteMinder Integration

  ## Summary
  Adds full SiteMinder channel manager integration support including settings storage,
  sync audit logs, and room type mappings.

  ## New Tables

  ### siteminder_settings
  Stores SiteMinder API credentials and sync configuration per hotel.
  - `property_id` - SiteMinder Property ID
  - `api_key` - SiteMinder API Key
  - `api_secret` - SiteMinder API Secret
  - `hotel_code` - Hotel Code used in SiteMinder
  - `is_enabled` - Whether the integration is active
  - `sync_reservations` - Pull inbound reservations
  - `sync_availability` - Push availability/rates outbound
  - `sync_interval_minutes` - How often to auto-sync
  - `rate_multiplier` - Rate adjustment factor
  - `min_advance_days` / `max_advance_days` - Booking window to publish
  - `last_sync_at` / `last_sync_status` - Last sync result tracking

  ### siteminder_sync_logs
  Audit trail of every sync attempt (inbound or outbound).
  - `direction` - 'inbound' (pull reservations) or 'outbound' (push availability)
  - `status` - success, partial, failed, running
  - `records_processed` - Count of records handled
  - `error_message` - Details if sync failed
  - `raw_payload` - Raw API response for debugging

  ### siteminder_room_mappings
  Maps local room types to SiteMinder room type IDs and rate plans.
  - `siteminder_room_type_id` - SiteMinder room type identifier
  - `siteminder_rate_plan_id` - SiteMinder rate plan identifier
  - `is_active` - Whether mapping is active

  ## Security
  - RLS enabled on all three tables
  - Staff members can view their hotel's settings
  - Only admins/managers can modify settings
*/

CREATE TABLE IF NOT EXISTS siteminder_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  property_id text NOT NULL DEFAULT '',
  api_key text NOT NULL DEFAULT '',
  api_secret text NOT NULL DEFAULT '',
  hotel_code text NOT NULL DEFAULT '',
  is_enabled boolean NOT NULL DEFAULT false,
  sync_reservations boolean NOT NULL DEFAULT true,
  sync_availability boolean NOT NULL DEFAULT true,
  last_sync_at timestamptz,
  last_sync_status text NOT NULL DEFAULT 'never',
  sync_interval_minutes integer NOT NULL DEFAULT 15,
  rate_multiplier numeric(5,2) NOT NULL DEFAULT 1.00,
  min_advance_days integer NOT NULL DEFAULT 0,
  max_advance_days integer NOT NULL DEFAULT 365,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(hotel_id)
);

ALTER TABLE siteminder_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view siteminder settings for their hotel"
  ON siteminder_settings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff_members
      WHERE staff_members.hotel_id = siteminder_settings.hotel_id
        AND staff_members.user_id = auth.uid()
        AND staff_members.is_active = true
    )
  );

CREATE POLICY "Admins and managers can insert siteminder settings"
  ON siteminder_settings FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM staff_members
      WHERE staff_members.hotel_id = siteminder_settings.hotel_id
        AND staff_members.user_id = auth.uid()
        AND staff_members.role IN ('admin', 'manager')
        AND staff_members.is_active = true
    )
  );

CREATE POLICY "Admins and managers can update siteminder settings"
  ON siteminder_settings FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff_members
      WHERE staff_members.hotel_id = siteminder_settings.hotel_id
        AND staff_members.user_id = auth.uid()
        AND staff_members.role IN ('admin', 'manager')
        AND staff_members.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM staff_members
      WHERE staff_members.hotel_id = siteminder_settings.hotel_id
        AND staff_members.user_id = auth.uid()
        AND staff_members.role IN ('admin', 'manager')
        AND staff_members.is_active = true
    )
  );

CREATE TABLE IF NOT EXISTS siteminder_sync_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  direction text NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  status text NOT NULL CHECK (status IN ('success', 'partial', 'failed', 'running')),
  records_processed integer NOT NULL DEFAULT 0,
  error_message text,
  raw_payload jsonb,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE siteminder_sync_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view siteminder sync logs for their hotel"
  ON siteminder_sync_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff_members
      WHERE staff_members.hotel_id = siteminder_sync_logs.hotel_id
        AND staff_members.user_id = auth.uid()
        AND staff_members.is_active = true
    )
  );

CREATE POLICY "Admins and managers can insert siteminder sync logs"
  ON siteminder_sync_logs FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM staff_members
      WHERE staff_members.hotel_id = siteminder_sync_logs.hotel_id
        AND staff_members.user_id = auth.uid()
        AND staff_members.role IN ('admin', 'manager')
        AND staff_members.is_active = true
    )
  );

CREATE POLICY "Admins and managers can update siteminder sync logs"
  ON siteminder_sync_logs FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff_members
      WHERE staff_members.hotel_id = siteminder_sync_logs.hotel_id
        AND staff_members.user_id = auth.uid()
        AND staff_members.role IN ('admin', 'manager')
        AND staff_members.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM staff_members
      WHERE staff_members.hotel_id = siteminder_sync_logs.hotel_id
        AND staff_members.user_id = auth.uid()
        AND staff_members.role IN ('admin', 'manager')
        AND staff_members.is_active = true
    )
  );

CREATE TABLE IF NOT EXISTS siteminder_room_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  room_type_id uuid NOT NULL REFERENCES room_types(id) ON DELETE CASCADE,
  siteminder_room_type_id text NOT NULL DEFAULT '',
  siteminder_rate_plan_id text NOT NULL DEFAULT '',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(hotel_id, room_type_id)
);

ALTER TABLE siteminder_room_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view siteminder room mappings for their hotel"
  ON siteminder_room_mappings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff_members
      WHERE staff_members.hotel_id = siteminder_room_mappings.hotel_id
        AND staff_members.user_id = auth.uid()
        AND staff_members.is_active = true
    )
  );

CREATE POLICY "Admins and managers can insert siteminder room mappings"
  ON siteminder_room_mappings FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM staff_members
      WHERE staff_members.hotel_id = siteminder_room_mappings.hotel_id
        AND staff_members.user_id = auth.uid()
        AND staff_members.role IN ('admin', 'manager')
        AND staff_members.is_active = true
    )
  );

CREATE POLICY "Admins and managers can update siteminder room mappings"
  ON siteminder_room_mappings FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff_members
      WHERE staff_members.hotel_id = siteminder_room_mappings.hotel_id
        AND staff_members.user_id = auth.uid()
        AND staff_members.role IN ('admin', 'manager')
        AND staff_members.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM staff_members
      WHERE staff_members.hotel_id = siteminder_room_mappings.hotel_id
        AND staff_members.user_id = auth.uid()
        AND staff_members.role IN ('admin', 'manager')
        AND staff_members.is_active = true
    )
  );

CREATE INDEX IF NOT EXISTS idx_siteminder_settings_hotel_id ON siteminder_settings(hotel_id);
CREATE INDEX IF NOT EXISTS idx_siteminder_sync_logs_hotel_id ON siteminder_sync_logs(hotel_id);
CREATE INDEX IF NOT EXISTS idx_siteminder_sync_logs_started_at ON siteminder_sync_logs(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_siteminder_room_mappings_hotel_id ON siteminder_room_mappings(hotel_id);
CREATE INDEX IF NOT EXISTS idx_siteminder_room_mappings_room_type_id ON siteminder_room_mappings(room_type_id);
