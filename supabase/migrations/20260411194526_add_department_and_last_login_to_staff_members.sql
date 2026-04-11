/*
  # Add missing columns to staff_members table

  1. New Columns on `staff_members`
    - `department` (text, default '') - staff member's department (e.g. Front Office)
    - `last_login` (timestamptz, nullable) - timestamp of last login

  2. Important Notes
    - These columns are required by the create-staff-member edge function and the Staff Settings UI
    - Uses IF NOT EXISTS checks to be safe for re-runs
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'staff_members' AND column_name = 'department'
  ) THEN
    ALTER TABLE staff_members ADD COLUMN department text DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'staff_members' AND column_name = 'last_login'
  ) THEN
    ALTER TABLE staff_members ADD COLUMN last_login timestamptz;
  END IF;
END $$;
