/*
  # Create webhook_events table for tracking webhook delivery and failures

  1. New Tables
    - `webhook_events`
      - `id` (uuid, primary key)
      - `hotel_id` (uuid, FK to hotels, nullable - resolved from payload)
      - `source` (text) - e.g. 'smoobu', 'booking_com', etc.
      - `event_type` (text) - e.g. 'newReservation', 'modifiedReservation'
      - `status` (text) - 'success', 'failed', 'retrying'
      - `attempt` (int) - current attempt number (1-3)
      - `max_attempts` (int, default 3)
      - `error_message` (text, nullable)
      - `payload` (jsonb) - raw webhook payload for debugging
      - `response_code` (int, nullable) - HTTP status code returned
      - `alerted` (boolean, default false) - whether alert was sent
      - `created_at` (timestamptz)
      - `resolved_at` (timestamptz, nullable) - when it was retried successfully or dismissed

  2. Security
    - Enable RLS on `webhook_events` table
    - Policy for authenticated staff to read events for their hotel
*/

CREATE TABLE IF NOT EXISTS webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid REFERENCES hotels(id) ON DELETE SET NULL,
  tenant_id uuid REFERENCES tenants(id) ON DELETE SET NULL,
  source text NOT NULL DEFAULT 'smoobu',
  event_type text NOT NULL DEFAULT 'unknown',
  status text NOT NULL DEFAULT 'success' CHECK (status IN ('success', 'failed', 'retrying')),
  attempt int NOT NULL DEFAULT 1,
  max_attempts int NOT NULL DEFAULT 3,
  error_message text,
  payload jsonb,
  response_code int,
  alerted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);

ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_webhook_events_hotel_id ON webhook_events(hotel_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_tenant_id ON webhook_events(tenant_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_status ON webhook_events(status);
CREATE INDEX IF NOT EXISTS idx_webhook_events_created_at ON webhook_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_webhook_events_source_status ON webhook_events(source, status);

CREATE POLICY "Staff can read webhook events for their hotel"
  ON webhook_events FOR SELECT
  TO authenticated
  USING (
    hotel_id IN (
      SELECT sm.hotel_id FROM staff_members sm
      WHERE sm.user_id = auth.uid()
    )
  );

CREATE POLICY "Service role can insert webhook events"
  ON webhook_events FOR INSERT
  TO authenticated
  WITH CHECK (
    hotel_id IN (
      SELECT sm.hotel_id FROM staff_members sm
      WHERE sm.user_id = auth.uid()
    )
  );
