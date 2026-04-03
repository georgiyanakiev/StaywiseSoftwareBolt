
/*
  # Add missing columns and link hotel to demo tenant

  1. Changes
    - Add `tenant_id` column to `hotels` (FK to tenants)
    - Add `tenant_id` column to `staff_members` (FK to tenants)
    - Add `approval_status` column to `staff_members`
    - Link "The Grand Metropolitan" hotel to "Demo Hotel" tenant
    - Update admin@demo.com staff record with tenant and approval_status

  2. Notes
    - These columns are required by the application code
    - approval_status defaults to 'approved' for existing staff
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'hotels' AND column_name = 'tenant_id'
  ) THEN
    ALTER TABLE hotels ADD COLUMN tenant_id uuid REFERENCES tenants(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'staff_members' AND column_name = 'tenant_id'
  ) THEN
    ALTER TABLE staff_members ADD COLUMN tenant_id uuid REFERENCES tenants(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'staff_members' AND column_name = 'approval_status'
  ) THEN
    ALTER TABLE staff_members ADD COLUMN approval_status text NOT NULL DEFAULT 'approved';
  END IF;
END $$;

UPDATE hotels
SET tenant_id = 'd25fba30-90ed-45d1-8358-682a95def23c'
WHERE id = 'e83fbd69-4191-41b4-9651-cdbfd784786d'
  AND tenant_id IS NULL;

UPDATE staff_members
SET tenant_id = 'd25fba30-90ed-45d1-8358-682a95def23c',
    approval_status = 'approved'
WHERE hotel_id = 'e83fbd69-4191-41b4-9651-cdbfd784786d'
  AND tenant_id IS NULL;
