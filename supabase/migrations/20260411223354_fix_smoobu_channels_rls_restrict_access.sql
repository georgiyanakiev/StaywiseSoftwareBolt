/*
  # Fix smoobu_channels RLS policies - remove always-true access

  1. Changes
    - Drop the 4 overly permissive policies that allow unrestricted access
    - smoobu_channels has no hotel_id/tenant_id column, but has property_id
    - Since this table stores API keys, restrict access to the user who created the record
    - Add created_by column to track ownership

  2. Security
    - INSERT: Any authenticated user can create a channel config (created_by auto-set)
    - SELECT/UPDATE/DELETE: Only the user who created the record can access it
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'smoobu_channels' AND column_name = 'created_by'
  ) THEN
    ALTER TABLE smoobu_channels ADD COLUMN created_by uuid DEFAULT auth.uid() REFERENCES auth.users(id);
  END IF;
END $$;

DROP POLICY IF EXISTS "Authenticated users can view smoobu channels" ON smoobu_channels;
DROP POLICY IF EXISTS "Authenticated users can insert smoobu channels" ON smoobu_channels;
DROP POLICY IF EXISTS "Authenticated users can update smoobu channels" ON smoobu_channels;
DROP POLICY IF EXISTS "Authenticated users can delete smoobu channels" ON smoobu_channels;

CREATE POLICY "Users can view own smoobu channels"
  ON smoobu_channels FOR SELECT
  TO authenticated
  USING (created_by = (select auth.uid()));

CREATE POLICY "Users can insert own smoobu channels"
  ON smoobu_channels FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) IS NOT NULL);

CREATE POLICY "Users can update own smoobu channels"
  ON smoobu_channels FOR UPDATE
  TO authenticated
  USING (created_by = (select auth.uid()))
  WITH CHECK (created_by = (select auth.uid()));

CREATE POLICY "Users can delete own smoobu channels"
  ON smoobu_channels FOR DELETE
  TO authenticated
  USING (created_by = (select auth.uid()));
