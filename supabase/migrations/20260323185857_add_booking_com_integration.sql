/*
  # Booking.com Integration Tables

  ## Summary
  Adds the infrastructure needed to connect StayWise with Booking.com's Connectivity API.

  ## New Tables

  ### `booking_com_settings`
  Stores per-hotel Booking.com API credentials and configuration:
  - `hotel_id` - references the hotel this config belongs to
  - `property_id` - the Booking.com property/hotel ID assigned after partnership approval
  - `client_id` - OAuth client ID from Booking.com Developer Portal
  - `client_secret` - OAuth client secret (store securely)
  - `is_enabled` - whether the integration is active
  - `sync_reservations` - whether to pull new/updated reservations from Booking.com
  - `sync_availability` - whether to push availability/rates back to Booking.com
  - `last_sync_at` - timestamp of last successful sync
  - `sync_interval_minutes` - how often to auto-sync (default 15)
  - `rate_multiplier` - multiply local base rates by this factor before pushing to Booking.com
  - `min_advance_days` - minimum days advance booking required
  - `max_advance_days` - maximum days in advance guests can book

  ### `booking_com_sync_logs`
  Audit trail of every sync attempt:
  - `hotel_id` - the hotel being synced
  - `direction` - 'inbound' (pulling reservations) or 'outbound' (pushing availability)
  - `status` - 'success', 'partial', 'failed'
  - `records_processed` - how many reservations/rates were processed
  - `error_message` - description if sync failed
  - `raw_payload` - JSON blob of what was sent/received (for debugging)

  ### `booking_com_room_mappings`
  Maps local room types to Booking.com room type codes:
  - `hotel_id` - the hotel
  - `room_type_id` - local RoomType UUID
  - `bdc_room_type_id` - Booking.com room type code (e.g., "DBL", "SGL", "STE")
  - `bdc_rate_plan_id` - Booking.com rate plan code

  ## Security
  - RLS enabled on all three tables
  - Only authenticated users who are staff members of the hotel can read/write their hotel's settings
*/

CREATE TABLE IF NOT EXISTS booking_com_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  property_id text NOT NULL DEFAULT '',
  client_id text NOT NULL DEFAULT '',
  client_secret text NOT NULL DEFAULT '',
  is_enabled boolean NOT NULL DEFAULT false,
  sync_reservations boolean NOT NULL DEFAULT true,
  sync_availability boolean NOT NULL DEFAULT true,
  last_sync_at timestamptz,
  last_sync_status text DEFAULT 'never',
  sync_interval_minutes int NOT NULL DEFAULT 15,
  rate_multiplier numeric(5,4) NOT NULL DEFAULT 1.0000,
  min_advance_days int NOT NULL DEFAULT 0,
  max_advance_days int NOT NULL DEFAULT 365,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (hotel_id)
);

CREATE TABLE IF NOT EXISTS booking_com_sync_logs (
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

CREATE TABLE IF NOT EXISTS booking_com_room_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  room_type_id uuid NOT NULL REFERENCES room_types(id) ON DELETE CASCADE,
  bdc_room_type_id text NOT NULL DEFAULT '',
  bdc_rate_plan_id text NOT NULL DEFAULT '',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (hotel_id, room_type_id)
);

ALTER TABLE booking_com_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_com_sync_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_com_room_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view their hotel booking.com settings"
  ON booking_com_settings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff_members
      WHERE staff_members.hotel_id = booking_com_settings.hotel_id
        AND staff_members.user_id = auth.uid()
        AND staff_members.is_active = true
    )
  );

CREATE POLICY "Admin staff can insert booking.com settings"
  ON booking_com_settings FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM staff_members
      WHERE staff_members.hotel_id = booking_com_settings.hotel_id
        AND staff_members.user_id = auth.uid()
        AND staff_members.is_active = true
        AND staff_members.role IN ('admin', 'manager')
    )
  );

CREATE POLICY "Admin staff can update booking.com settings"
  ON booking_com_settings FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff_members
      WHERE staff_members.hotel_id = booking_com_settings.hotel_id
        AND staff_members.user_id = auth.uid()
        AND staff_members.is_active = true
        AND staff_members.role IN ('admin', 'manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM staff_members
      WHERE staff_members.hotel_id = booking_com_settings.hotel_id
        AND staff_members.user_id = auth.uid()
        AND staff_members.is_active = true
        AND staff_members.role IN ('admin', 'manager')
    )
  );

CREATE POLICY "Staff can view their hotel sync logs"
  ON booking_com_sync_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff_members
      WHERE staff_members.hotel_id = booking_com_sync_logs.hotel_id
        AND staff_members.user_id = auth.uid()
        AND staff_members.is_active = true
    )
  );

CREATE POLICY "Admin staff can insert sync logs"
  ON booking_com_sync_logs FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM staff_members
      WHERE staff_members.hotel_id = booking_com_sync_logs.hotel_id
        AND staff_members.user_id = auth.uid()
        AND staff_members.is_active = true
        AND staff_members.role IN ('admin', 'manager')
    )
  );

CREATE POLICY "Staff can view room mappings"
  ON booking_com_room_mappings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff_members
      WHERE staff_members.hotel_id = booking_com_room_mappings.hotel_id
        AND staff_members.user_id = auth.uid()
        AND staff_members.is_active = true
    )
  );

CREATE POLICY "Admin staff can insert room mappings"
  ON booking_com_room_mappings FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM staff_members
      WHERE staff_members.hotel_id = booking_com_room_mappings.hotel_id
        AND staff_members.user_id = auth.uid()
        AND staff_members.is_active = true
        AND staff_members.role IN ('admin', 'manager')
    )
  );

CREATE POLICY "Admin staff can update room mappings"
  ON booking_com_room_mappings FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff_members
      WHERE staff_members.hotel_id = booking_com_room_mappings.hotel_id
        AND staff_members.user_id = auth.uid()
        AND staff_members.is_active = true
        AND staff_members.role IN ('admin', 'manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM staff_members
      WHERE staff_members.hotel_id = booking_com_room_mappings.hotel_id
        AND staff_members.user_id = auth.uid()
        AND staff_members.is_active = true
        AND staff_members.role IN ('admin', 'manager')
    )
  );

CREATE INDEX IF NOT EXISTS idx_bdc_settings_hotel_id ON booking_com_settings(hotel_id);
CREATE INDEX IF NOT EXISTS idx_bdc_sync_logs_hotel_id ON booking_com_sync_logs(hotel_id);
CREATE INDEX IF NOT EXISTS idx_bdc_sync_logs_created_at ON booking_com_sync_logs(hotel_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bdc_room_mappings_hotel_id ON booking_com_room_mappings(hotel_id);
