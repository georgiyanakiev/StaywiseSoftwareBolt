/*
  # Add missing columns to maintenance_requests table

  1. New Columns on `maintenance_requests`
    - `actual_cost` (numeric, default 0) - actual repair cost after completion
    - `estimated_cost` (numeric, default 0) - estimated cost before work begins
    - `reported_by` (text, default '') - person who reported the issue
    - `category` (text, default 'other') - issue category (plumbing, electrical, etc.)
    - `vendor` (text, default '') - external vendor or contractor
    - `scheduled_for` (timestamptz, nullable) - scheduled repair date/time
    - `resolution_notes` (text, default '') - notes on how issue was resolved
    - `tenant_id` (uuid, nullable) - tenant reference for multi-tenancy

  2. Important Notes
    - Uses IF NOT EXISTS checks to be safe for re-runs
    - No destructive operations
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'maintenance_requests' AND column_name = 'actual_cost'
  ) THEN
    ALTER TABLE maintenance_requests ADD COLUMN actual_cost numeric DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'maintenance_requests' AND column_name = 'estimated_cost'
  ) THEN
    ALTER TABLE maintenance_requests ADD COLUMN estimated_cost numeric DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'maintenance_requests' AND column_name = 'reported_by'
  ) THEN
    ALTER TABLE maintenance_requests ADD COLUMN reported_by text DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'maintenance_requests' AND column_name = 'category'
  ) THEN
    ALTER TABLE maintenance_requests ADD COLUMN category text DEFAULT 'other';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'maintenance_requests' AND column_name = 'vendor'
  ) THEN
    ALTER TABLE maintenance_requests ADD COLUMN vendor text DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'maintenance_requests' AND column_name = 'scheduled_for'
  ) THEN
    ALTER TABLE maintenance_requests ADD COLUMN scheduled_for timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'maintenance_requests' AND column_name = 'resolution_notes'
  ) THEN
    ALTER TABLE maintenance_requests ADD COLUMN resolution_notes text DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'maintenance_requests' AND column_name = 'tenant_id'
  ) THEN
    ALTER TABLE maintenance_requests ADD COLUMN tenant_id uuid;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_maintenance_requests_tenant_id ON maintenance_requests(tenant_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_requests_category ON maintenance_requests(category);
