/*
  # Add missing columns to housekeeping_tasks and unique constraint

  ## Summary
  The housekeeping_tasks table is missing several columns that the application code
  already inserts and queries. This migration adds all missing columns and adds a
  unique constraint to prevent duplicate tasks being generated for the same room,
  date and task type (e.g. from clicking "Generate Today's Tasks" multiple times).

  ## Changes
  ### New columns on housekeeping_tasks
  - `scheduled_date` (date) — the date the task is scheduled for
  - `room_number` (text) — denormalised room number for display
  - `floor` (integer) — denormalised floor number for display/filtering
  - `room_type` (text) — denormalised room type name
  - `started_at` (timestamptz) — when the task was started
  - `inspected_by` (text) — name of inspector
  - `inspected_at` (timestamptz) — when the task was inspected
  - `duration_minutes` (integer) — expected/actual duration
  - `tenant_id` (uuid, nullable FK to tenants) — multi-tenant scoping

  ### New unique constraint
  - `housekeeping_tasks_unique_room_date_type` on (hotel_id, room_id, scheduled_date, task_type)
    prevents duplicate tasks when "Generate Today's Tasks" is clicked more than once.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'housekeeping_tasks' AND column_name = 'scheduled_date'
  ) THEN
    ALTER TABLE housekeeping_tasks ADD COLUMN scheduled_date date;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'housekeeping_tasks' AND column_name = 'room_number'
  ) THEN
    ALTER TABLE housekeeping_tasks ADD COLUMN room_number text DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'housekeeping_tasks' AND column_name = 'floor'
  ) THEN
    ALTER TABLE housekeeping_tasks ADD COLUMN floor integer DEFAULT 1;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'housekeeping_tasks' AND column_name = 'room_type'
  ) THEN
    ALTER TABLE housekeeping_tasks ADD COLUMN room_type text DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'housekeeping_tasks' AND column_name = 'started_at'
  ) THEN
    ALTER TABLE housekeeping_tasks ADD COLUMN started_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'housekeeping_tasks' AND column_name = 'inspected_by'
  ) THEN
    ALTER TABLE housekeeping_tasks ADD COLUMN inspected_by text DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'housekeeping_tasks' AND column_name = 'inspected_at'
  ) THEN
    ALTER TABLE housekeeping_tasks ADD COLUMN inspected_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'housekeeping_tasks' AND column_name = 'duration_minutes'
  ) THEN
    ALTER TABLE housekeeping_tasks ADD COLUMN duration_minutes integer;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'housekeeping_tasks' AND column_name = 'tenant_id'
  ) THEN
    ALTER TABLE housekeeping_tasks ADD COLUMN tenant_id uuid REFERENCES tenants(id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'housekeeping_tasks_unique_room_date_type'
  ) THEN
    ALTER TABLE housekeeping_tasks
      ADD CONSTRAINT housekeeping_tasks_unique_room_date_type
      UNIQUE (hotel_id, room_id, scheduled_date, task_type);
  END IF;
END $$;
