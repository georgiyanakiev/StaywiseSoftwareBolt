/*
  # Add Stripe payment columns to reservations table

  1. New Columns
    - `stripe_payment_intent_id` (text) - Stripe PaymentIntent ID for webhook lookups
    - `stripe_checkout_session_id` (text) - Stripe Checkout Session ID

  2. Indexes
    - Index on `stripe_payment_intent_id` for fast webhook event lookups
    - Index on `stripe_checkout_session_id` for session-based lookups

  3. Important Notes
    - Both columns are nullable (not all reservations use Stripe)
    - Indexes enable fast lookups when Stripe webhooks arrive
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'reservations' AND column_name = 'stripe_payment_intent_id'
  ) THEN
    ALTER TABLE reservations ADD COLUMN stripe_payment_intent_id text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'reservations' AND column_name = 'stripe_checkout_session_id'
  ) THEN
    ALTER TABLE reservations ADD COLUMN stripe_checkout_session_id text;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_reservations_stripe_payment_intent_id
  ON reservations (stripe_payment_intent_id)
  WHERE stripe_payment_intent_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_reservations_stripe_checkout_session_id
  ON reservations (stripe_checkout_session_id)
  WHERE stripe_checkout_session_id IS NOT NULL;
