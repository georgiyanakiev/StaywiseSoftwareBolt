/*
  # Add missing columns to dpa_acceptances

  ## Changes
  - Adds `dpa_version` (text) column with default '1.0'
  - Adds `user_agent` (text) column, nullable
  These columns are required by the useDpaAcceptance hook when inserting records.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'dpa_acceptances' AND column_name = 'dpa_version'
  ) THEN
    ALTER TABLE public.dpa_acceptances ADD COLUMN dpa_version text NOT NULL DEFAULT '1.0';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'dpa_acceptances' AND column_name = 'user_agent'
  ) THEN
    ALTER TABLE public.dpa_acceptances ADD COLUMN user_agent text;
  END IF;
END $$;
