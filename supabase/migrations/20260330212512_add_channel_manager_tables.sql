/*
  # Channel Manager Tables

  ## Summary
  Adds tables for managing OTA channel connections, rate calendars, and sync logs.

  ## New Tables
  - `channels` — OTA channel connections (Booking.com, Airbnb, Expedia, Direct)
  - `channel_rates` — Rate and availability grid per channel per room type per date
  - `channel_sync_logs` — Audit log of all sync events

  ## Security
  - RLS enabled on all tables
  - Authenticated users can read/write their hotel's data
*/

CREATE TABLE IF NOT EXISTS channels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid REFERENCES hotels(id),
  name text NOT NULL,
  status text DEFAULT 'disconnected' CHECK (status IN ('connected', 'disconnected', 'error')),
  api_key text DEFAULT '',
  property_id text DEFAULT '',
  last_sync timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE channels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view hotel channels"
  ON channels FOR SELECT
  TO authenticated
  USING (
    hotel_id IN (SELECT hotel_id FROM staff_members WHERE user_id = auth.uid() AND is_active = true)
  );

CREATE POLICY "Staff can insert hotel channels"
  ON channels FOR INSERT
  TO authenticated
  WITH CHECK (
    hotel_id IN (SELECT hotel_id FROM staff_members WHERE user_id = auth.uid() AND is_active = true)
  );

CREATE POLICY "Staff can update hotel channels"
  ON channels FOR UPDATE
  TO authenticated
  USING (
    hotel_id IN (SELECT hotel_id FROM staff_members WHERE user_id = auth.uid() AND is_active = true)
  )
  WITH CHECK (
    hotel_id IN (SELECT hotel_id FROM staff_members WHERE user_id = auth.uid() AND is_active = true)
  );

CREATE TABLE IF NOT EXISTS channel_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid REFERENCES hotels(id),
  channel_id uuid REFERENCES channels(id) ON DELETE CASCADE,
  room_type_id uuid REFERENCES room_types(id) ON DELETE CASCADE,
  date date NOT NULL,
  rate numeric(10,2) NOT NULL DEFAULT 0,
  availability integer NOT NULL DEFAULT 0,
  min_stay integer DEFAULT 1,
  stop_sell boolean DEFAULT false,
  closed_to_arrival boolean DEFAULT false,
  synced_at timestamptz,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'synced', 'error')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE channel_rates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view channel rates"
  ON channel_rates FOR SELECT
  TO authenticated
  USING (
    hotel_id IN (SELECT hotel_id FROM staff_members WHERE user_id = auth.uid() AND is_active = true)
  );

CREATE POLICY "Staff can insert channel rates"
  ON channel_rates FOR INSERT
  TO authenticated
  WITH CHECK (
    hotel_id IN (SELECT hotel_id FROM staff_members WHERE user_id = auth.uid() AND is_active = true)
  );

CREATE POLICY "Staff can update channel rates"
  ON channel_rates FOR UPDATE
  TO authenticated
  USING (
    hotel_id IN (SELECT hotel_id FROM staff_members WHERE user_id = auth.uid() AND is_active = true)
  )
  WITH CHECK (
    hotel_id IN (SELECT hotel_id FROM staff_members WHERE user_id = auth.uid() AND is_active = true)
  );

CREATE TABLE IF NOT EXISTS channel_sync_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid REFERENCES hotels(id),
  channel_id uuid REFERENCES channels(id) ON DELETE CASCADE,
  channel_name text DEFAULT '',
  rooms_affected integer DEFAULT 0,
  status text DEFAULT 'success' CHECK (status IN ('success', 'failed', 'partial')),
  error_message text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE channel_sync_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view sync logs"
  ON channel_sync_logs FOR SELECT
  TO authenticated
  USING (
    hotel_id IN (SELECT hotel_id FROM staff_members WHERE user_id = auth.uid() AND is_active = true)
  );

CREATE POLICY "Staff can insert sync logs"
  ON channel_sync_logs FOR INSERT
  TO authenticated
  WITH CHECK (
    hotel_id IN (SELECT hotel_id FROM staff_members WHERE user_id = auth.uid() AND is_active = true)
  );

CREATE INDEX IF NOT EXISTS idx_channel_rates_hotel_date ON channel_rates(hotel_id, date);
CREATE INDEX IF NOT EXISTS idx_channel_rates_channel ON channel_rates(channel_id);
CREATE INDEX IF NOT EXISTS idx_channels_hotel ON channels(hotel_id);
CREATE INDEX IF NOT EXISTS idx_channel_sync_logs_hotel ON channel_sync_logs(hotel_id);
