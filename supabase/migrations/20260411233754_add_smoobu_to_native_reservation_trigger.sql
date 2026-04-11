/*
  # Auto-convert Smoobu bookings into native reservations

  1. Schema Changes
    - `reservations.smoobu_id` (text, nullable, unique) — links back to the source booking
  2. New Functions
    - `convert_booking_to_reservation()` — trigger function that:
      a. Looks up the hotel via `channels.property_id`
      b. Creates or finds a guest in the `guests` table
      c. Picks the first room_type for the hotel (Standard fallback)
      d. Inserts or updates a native reservation with proper financial fields
  3. New Trigger
    - `trg_booking_to_reservation` on `bookings` AFTER INSERT OR UPDATE
  4. Important Notes
    - Uses the `channels` table to map Smoobu property_id → hotel_id
    - Confirmation codes are prefixed SB- for Smoobu origin
    - Room is left unassigned (NULL) so front-desk staff can assign manually
    - Payment status derived from booking.price_paid boolean
    - Cancellations in Smoobu propagate as status='cancelled' in reservations
*/

-- 1. Add smoobu_id column to reservations
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'reservations' AND column_name = 'smoobu_id' AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.reservations ADD COLUMN smoobu_id text;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_reservations_smoobu_id
  ON public.reservations (smoobu_id)
  WHERE smoobu_id IS NOT NULL;

-- 2. Create the conversion function
CREATE OR REPLACE FUNCTION public.convert_booking_to_reservation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_hotel_id     uuid;
  v_tenant_id    uuid;
  v_guest_id     uuid;
  v_room_type_id uuid;
  v_tax_rate     numeric;
  v_nights       integer;
  v_base_rate    numeric;
  v_tax_amount   numeric;
  v_total        numeric;
  v_status       text;
  v_pay_status   text;
  v_amount_paid  numeric;
  v_conf_code    text;
BEGIN
  -- a. Resolve hotel from channels table using property_id
  SELECT c.hotel_id, h.tenant_id, h.tax_rate
    INTO v_hotel_id, v_tenant_id, v_tax_rate
    FROM channels c
    JOIN hotels h ON h.id = c.hotel_id
   WHERE c.property_id = NEW.property_id
     AND c.name ILIKE '%smoobu%'
   LIMIT 1;

  -- If no Smoobu channel found, try any channel with matching property_id
  IF v_hotel_id IS NULL THEN
    SELECT c.hotel_id, h.tenant_id, h.tax_rate
      INTO v_hotel_id, v_tenant_id, v_tax_rate
      FROM channels c
      JOIN hotels h ON h.id = c.hotel_id
     WHERE c.property_id = NEW.property_id
     LIMIT 1;
  END IF;

  -- Still nothing — cannot map, skip silently
  IF v_hotel_id IS NULL THEN
    RAISE WARNING 'convert_booking_to_reservation: no hotel found for property_id=%', NEW.property_id;
    RETURN NEW;
  END IF;

  -- b. Find or create guest
  IF NEW.guest_email IS NOT NULL AND NEW.guest_email <> '' THEN
    SELECT id INTO v_guest_id
      FROM guests
     WHERE hotel_id = v_hotel_id
       AND email = NEW.guest_email
     LIMIT 1;
  END IF;

  IF v_guest_id IS NULL AND NEW.guest_name IS NOT NULL AND NEW.guest_name <> '' THEN
    SELECT id INTO v_guest_id
      FROM guests
     WHERE hotel_id = v_hotel_id
       AND (first_name || ' ' || last_name) = NEW.guest_name
     LIMIT 1;
  END IF;

  IF v_guest_id IS NULL THEN
    INSERT INTO guests (
      hotel_id, first_name, last_name, email, phone,
      address, city, country, postal_code, id_number, nationality, notes, preferences
    ) VALUES (
      v_hotel_id,
      split_part(COALESCE(NEW.guest_name, 'Smoobu Guest'), ' ', 1),
      CASE
        WHEN position(' ' in COALESCE(NEW.guest_name, '')) > 0
        THEN substring(NEW.guest_name from position(' ' in NEW.guest_name) + 1)
        ELSE ''
      END,
      COALESCE(NEW.guest_email, ''),
      COALESCE(NEW.guest_phone, ''),
      '', '', '', '', '', '', '', '{}'::jsonb
    )
    RETURNING id INTO v_guest_id;
  END IF;

  -- c. Pick the first (cheapest) room type for the hotel as default
  SELECT id, base_rate INTO v_room_type_id, v_base_rate
    FROM room_types
   WHERE hotel_id = v_hotel_id
   ORDER BY base_rate ASC
   LIMIT 1;

  IF v_room_type_id IS NULL THEN
    RAISE WARNING 'convert_booking_to_reservation: no room_types for hotel=%', v_hotel_id;
    RETURN NEW;
  END IF;

  -- d. Calculate financials
  v_nights := GREATEST((NEW.departure - NEW.arrival), 1);

  -- If Smoobu provides total_price, use it; otherwise estimate from base_rate
  IF NEW.total_price IS NOT NULL AND NEW.total_price > 0 THEN
    v_total := NEW.total_price;
    v_tax_amount := ROUND(v_total * (COALESCE(v_tax_rate, 0) / (100 + COALESCE(v_tax_rate, 0))), 2);
    v_base_rate := ROUND((v_total - v_tax_amount) / v_nights, 2);
  ELSE
    v_tax_amount := ROUND(v_base_rate * v_nights * (COALESCE(v_tax_rate, 0) / 100), 2);
    v_total := v_base_rate * v_nights + v_tax_amount;
  END IF;

  -- e. Map statuses
  IF NEW.status = 'cancelled' THEN
    v_status := 'cancelled';
    v_pay_status := 'pending';
    v_amount_paid := 0;
  ELSE
    v_status := 'confirmed';
    IF NEW.price_paid = true THEN
      v_pay_status := 'paid';
      v_amount_paid := v_total;
    ELSE
      v_pay_status := 'pending';
      v_amount_paid := 0;
    END IF;
  END IF;

  v_conf_code := 'SB-' || NEW.smoobu_id;

  -- f. Upsert reservation
  INSERT INTO reservations (
    hotel_id, guest_id, room_id, room_type_id,
    check_in, check_out, adults, children,
    status, base_rate, total_amount, tax_amount, discount_amount,
    payment_status, amount_paid, payment_method,
    booking_source, special_requests, cancellation_reason,
    confirmation_code, smoobu_id, source
  ) VALUES (
    v_hotel_id, v_guest_id, NULL, v_room_type_id,
    NEW.arrival, NEW.departure, COALESCE(NEW.adults, 1), COALESCE(NEW.children, 0),
    v_status, v_base_rate, v_total, v_tax_amount, 0,
    v_pay_status, v_amount_paid, '',
    COALESCE(NEW.channel_name, 'Smoobu'), COALESCE(NEW.notice, ''), '',
    v_conf_code, NEW.smoobu_id, 'smoobu'
  )
  ON CONFLICT (smoobu_id) WHERE smoobu_id IS NOT NULL
  DO UPDATE SET
    check_in       = EXCLUDED.check_in,
    check_out      = EXCLUDED.check_out,
    adults         = EXCLUDED.adults,
    children       = EXCLUDED.children,
    status         = EXCLUDED.status,
    base_rate      = EXCLUDED.base_rate,
    total_amount   = EXCLUDED.total_amount,
    tax_amount     = EXCLUDED.tax_amount,
    payment_status = EXCLUDED.payment_status,
    amount_paid    = EXCLUDED.amount_paid,
    booking_source = EXCLUDED.booking_source,
    special_requests = EXCLUDED.special_requests,
    updated_at     = now();

  RETURN NEW;
END;
$$;

-- 3. Create the trigger
DROP TRIGGER IF EXISTS trg_booking_to_reservation ON public.bookings;

CREATE TRIGGER trg_booking_to_reservation
  AFTER INSERT OR UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.convert_booking_to_reservation();
