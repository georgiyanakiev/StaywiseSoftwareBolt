/*
  # Enhance Booking Engine Tables

  ## Summary
  Adds missing columns required by the full Booking Engine feature spec.

  ## Changes to `booking_engine_config`
  - `min_advance_days` — minimum days in advance a booking can be made
  - `max_advance_days` — maximum days in advance a booking can be made
  - `show_room_photos` — whether to display room photos in the widget
  - `require_deposit` — whether a deposit is required at booking time
  - `deposit_percentage` — percentage of total required as deposit

  ## Changes to `direct_bookings`
  - `room_id` — optional specific room assignment
  - `guest_country` — guest's country of origin
  - `subtotal` — pre-tax amount
  - `tax_amount` — tax amount
  - `promo_code` — promotional code used during booking

  ## Notes
  - The `nights` computed column is not added via migration since it requires
    Postgres 12+ generated columns with the exact expression; it is computed in-app.
  - All new columns have safe defaults to avoid breaking existing rows.
*/

-- ── booking_engine_config additions ────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='booking_engine_config' AND column_name='min_advance_days') THEN
    ALTER TABLE booking_engine_config ADD COLUMN min_advance_days integer DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='booking_engine_config' AND column_name='max_advance_days') THEN
    ALTER TABLE booking_engine_config ADD COLUMN max_advance_days integer DEFAULT 365;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='booking_engine_config' AND column_name='show_room_photos') THEN
    ALTER TABLE booking_engine_config ADD COLUMN show_room_photos boolean DEFAULT true;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='booking_engine_config' AND column_name='require_deposit') THEN
    ALTER TABLE booking_engine_config ADD COLUMN require_deposit boolean DEFAULT true;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='booking_engine_config' AND column_name='deposit_percentage') THEN
    ALTER TABLE booking_engine_config ADD COLUMN deposit_percentage numeric(5,2) DEFAULT 30;
  END IF;
END $$;

-- ── direct_bookings additions ───────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='direct_bookings' AND column_name='room_id') THEN
    ALTER TABLE direct_bookings ADD COLUMN room_id uuid REFERENCES rooms(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='direct_bookings' AND column_name='guest_country') THEN
    ALTER TABLE direct_bookings ADD COLUMN guest_country text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='direct_bookings' AND column_name='subtotal') THEN
    ALTER TABLE direct_bookings ADD COLUMN subtotal numeric(10,2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='direct_bookings' AND column_name='tax_amount') THEN
    ALTER TABLE direct_bookings ADD COLUMN tax_amount numeric(10,2) DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='direct_bookings' AND column_name='promo_code') THEN
    ALTER TABLE direct_bookings ADD COLUMN promo_code text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='direct_bookings' AND column_name='no_show') THEN
    NULL;
  END IF;
END $$;
