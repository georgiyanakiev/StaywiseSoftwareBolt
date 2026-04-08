/*
  # Add onboarding_sent column to staff_members

  1. Changes
    - `staff_members`: add `onboarding_sent` boolean column (DEFAULT false)
      - Tracks whether the staff member has been sent their login credentials
      - Used to show "Pending Onboarding" badge in the Staff Settings page

  2. Notes
    - Existing rows default to false so they appear as needing onboarding
    - Set to true after credentials are copied/sent via the invite modal
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'staff_members' AND column_name = 'onboarding_sent'
  ) THEN
    ALTER TABLE staff_members ADD COLUMN onboarding_sent boolean NOT NULL DEFAULT false;
  END IF;
END $$;
