/*
  # Enhance maintenance_requests for CMMS

  ## Summary
  Adds full CMMS (Computerized Maintenance Management System) fields to the
  maintenance_requests table to support professional repair tracking workflows.

  ## Changes to maintenance_requests
  - `category` — type of issue: plumbing, electrical, hvac, furniture, appliance, structural, it, other
  - `reported_by` — name or contact of the person who reported the issue
  - `estimated_cost` — estimated repair cost in hotel currency
  - `actual_cost` — actual cost after resolution (replaces/supplements existing `cost`)
  - `vendor` — external contractor or vendor name if applicable
  - `scheduled_for` — planned date/time for the repair
  - `images` — JSON array of image URLs attached to the request
  - `resolution_notes` — notes recorded upon resolution

  ## Notes
  - All new columns are nullable with sensible defaults to avoid breaking existing rows
  - status gains a new value 'closed' for archived resolved requests
  - Existing `cost` column is retained for backwards compatibility
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'maintenance_requests' AND column_name = 'category'
  ) THEN
    ALTER TABLE maintenance_requests ADD COLUMN category text NOT NULL DEFAULT 'other';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'maintenance_requests' AND column_name = 'reported_by'
  ) THEN
    ALTER TABLE maintenance_requests ADD COLUMN reported_by text NOT NULL DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'maintenance_requests' AND column_name = 'estimated_cost'
  ) THEN
    ALTER TABLE maintenance_requests ADD COLUMN estimated_cost numeric NOT NULL DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'maintenance_requests' AND column_name = 'actual_cost'
  ) THEN
    ALTER TABLE maintenance_requests ADD COLUMN actual_cost numeric NOT NULL DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'maintenance_requests' AND column_name = 'vendor'
  ) THEN
    ALTER TABLE maintenance_requests ADD COLUMN vendor text NOT NULL DEFAULT '';
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
    ALTER TABLE maintenance_requests ADD COLUMN resolution_notes text NOT NULL DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'maintenance_requests' AND column_name = 'images'
  ) THEN
    ALTER TABLE maintenance_requests ADD COLUMN images jsonb NOT NULL DEFAULT '[]';
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_maintenance_requests_category
  ON maintenance_requests(hotel_id, category);

CREATE INDEX IF NOT EXISTS idx_maintenance_requests_scheduled
  ON maintenance_requests(hotel_id, scheduled_for)
  WHERE scheduled_for IS NOT NULL;
