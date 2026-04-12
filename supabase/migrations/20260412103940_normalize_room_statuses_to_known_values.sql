/*
  # Normalize room statuses to known values

  1. Changes
    - Updates any rooms with status 'cleaning' to 'dirty'
    - Updates any rooms with status 'inspected' to 'clean'
    - Updates any rooms with status 'blocked' to 'out_of_service'
    - Adds a CHECK constraint to prevent non-standard statuses in the future

  2. Important Notes
    - Only 6 valid statuses: available, occupied, dirty, clean, maintenance, out_of_service
    - Any unknown status is normalized to 'available' as a safe default
*/

UPDATE rooms SET status = 'dirty' WHERE status = 'cleaning';
UPDATE rooms SET status = 'clean' WHERE status = 'inspected';
UPDATE rooms SET status = 'out_of_service' WHERE status = 'blocked';
UPDATE rooms SET status = 'available' WHERE status NOT IN ('available', 'occupied', 'dirty', 'clean', 'maintenance', 'out_of_service');

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'rooms' AND constraint_name = 'rooms_status_check'
  ) THEN
    ALTER TABLE rooms ADD CONSTRAINT rooms_status_check
      CHECK (status IN ('available', 'occupied', 'dirty', 'clean', 'maintenance', 'out_of_service'));
  END IF;
END $$;
