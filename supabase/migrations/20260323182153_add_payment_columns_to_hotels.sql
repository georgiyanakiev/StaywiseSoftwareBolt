/*
  # Add payment settings columns to hotels table

  1. Changes
    - Adds `accepts_credit_card` (boolean, default true)
    - Adds `accepts_debit_card` (boolean, default true)
    - Adds `accepts_cash` (boolean, default true)
    - Adds `accepts_bank_transfer` (boolean, default false)
    - Adds `deposit_required` (boolean, default false)
    - Adds `deposit_percentage` (numeric, default 0)
    - Adds `stripe_enabled` (boolean, default false)

  2. Notes
    - Uses IF NOT EXISTS pattern to be safe on re-runs
    - No data is lost
*/

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'hotels' AND column_name = 'accepts_credit_card') THEN
    ALTER TABLE hotels ADD COLUMN accepts_credit_card boolean NOT NULL DEFAULT true;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'hotels' AND column_name = 'accepts_debit_card') THEN
    ALTER TABLE hotels ADD COLUMN accepts_debit_card boolean NOT NULL DEFAULT true;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'hotels' AND column_name = 'accepts_cash') THEN
    ALTER TABLE hotels ADD COLUMN accepts_cash boolean NOT NULL DEFAULT true;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'hotels' AND column_name = 'accepts_bank_transfer') THEN
    ALTER TABLE hotels ADD COLUMN accepts_bank_transfer boolean NOT NULL DEFAULT false;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'hotels' AND column_name = 'deposit_required') THEN
    ALTER TABLE hotels ADD COLUMN deposit_required boolean NOT NULL DEFAULT false;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'hotels' AND column_name = 'deposit_percentage') THEN
    ALTER TABLE hotels ADD COLUMN deposit_percentage numeric(5,2) NOT NULL DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'hotels' AND column_name = 'stripe_enabled') THEN
    ALTER TABLE hotels ADD COLUMN stripe_enabled boolean NOT NULL DEFAULT false;
  END IF;
END $$;
