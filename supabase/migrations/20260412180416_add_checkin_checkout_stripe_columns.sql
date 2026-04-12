/*
  # Add check-in/check-out Stripe tracking columns

  1. New Columns on `reservations`
    - `charged_at_checkin` (timestamptz) - when Stripe charge was initiated at check-in
    - `charged_at_checkout` (timestamptz) - when Stripe charge was initiated at check-out

  2. New Columns on `guests`
    - `stripe_customer_id` (text) - reusable Stripe customer ID

  3. Indexes
    - Partial index on guests.stripe_customer_id for fast lookup
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'reservations' AND column_name = 'charged_at_checkin'
  ) THEN
    ALTER TABLE reservations ADD COLUMN charged_at_checkin timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'reservations' AND column_name = 'charged_at_checkout'
  ) THEN
    ALTER TABLE reservations ADD COLUMN charged_at_checkout timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'guests' AND column_name = 'stripe_customer_id'
  ) THEN
    ALTER TABLE guests ADD COLUMN stripe_customer_id text;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_guests_stripe_customer_id
  ON guests (stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;
