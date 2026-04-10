/*
  # Add source column to reservations

  1. Modified Tables
    - `reservations`
      - Added `source` (text, default 'direct') - booking source/channel
  
  2. Notes
    - Tracks where the reservation originated (direct, booking_com, expedia, etc.)
    - Referenced by the front desk view for walk-in detection
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'reservations' AND column_name = 'source'
  ) THEN
    ALTER TABLE public.reservations ADD COLUMN source text NOT NULL DEFAULT 'direct';
  END IF;
END $$;
