/*
  # Add Approval Status to Staff Members

  ## Summary
  Adds an `approval_status` column to the `staff_members` table to support
  an admin-approval workflow for new account registrations.

  ## Changes to Existing Tables

  ### staff_members
  - New column `approval_status` (text, default 'pending')
    - 'pending'  — newly registered, awaiting admin approval
    - 'approved' — admin has granted access
    - 'rejected' — admin has denied access

  ## Notes
  - All existing staff members (seeded/demo accounts) are set to 'approved' immediately
  - New registrations via the sign-up form will default to 'pending'
  - The existing `is_active` flag is kept and is only set to true once approved
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'staff_members' AND column_name = 'approval_status'
  ) THEN
    ALTER TABLE staff_members ADD COLUMN approval_status text NOT NULL DEFAULT 'pending';
  END IF;
END $$;

UPDATE staff_members SET approval_status = 'approved' WHERE is_active = true;

ALTER TABLE staff_members
  ADD CONSTRAINT staff_members_approval_status_check
  CHECK (approval_status IN ('pending', 'approved', 'rejected'));
