/*
  # Add notes column to reservations

  1. Modified Tables
    - `reservations`
      - Added `notes` (text, default '') - general notes for the reservation
  
  2. Notes
    - The frontend references this column in the front desk view
    - Distinct from `special_requests` which captures guest-specific requests
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'reservations' AND column_name = 'notes'
  ) THEN
    ALTER TABLE public.reservations ADD COLUMN notes text NOT NULL DEFAULT '';
  END IF;
END $$;
