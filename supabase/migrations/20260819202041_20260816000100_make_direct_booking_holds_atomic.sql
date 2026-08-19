-- Serialize availability decisions for a hotel/room type and turn expired
-- payments holds into cancelled bookings before counting inventory.
ALTER TABLE public.direct_bookings
  ADD COLUMN IF NOT EXISTS checkout_request_id uuid;

CREATE UNIQUE INDEX IF NOT EXISTS direct_bookings_checkout_request_id_key
  ON public.direct_bookings (checkout_request_id)
  WHERE checkout_request_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.reserve_direct_booking_hold(
  p_hotel_id uuid, p_room_type_id uuid, p_tenant_id uuid,
  p_checkout_request_id uuid, p_confirmation_number text,
  p_guest_name text, p_guest_email text, p_guest_phone text, p_guest_country text,
  p_check_in date, p_check_out date, p_adults integer, p_children integer,
  p_rate_per_night numeric, p_subtotal numeric, p_tax_amount numeric,
  p_total_amount numeric, p_deposit_amount numeric, p_special_requests text
) RETURNS TABLE(id uuid, confirmation_number text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_inventory integer; v_committed integer;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(p_hotel_id::text || ':' || p_room_type_id::text, 0));

  SELECT b.id, b.confirmation_number INTO id, confirmation_number
  FROM direct_bookings b WHERE b.checkout_request_id = p_checkout_request_id;
  IF FOUND THEN RETURN NEXT; RETURN; END IF;

  UPDATE direct_bookings
  SET status = 'cancelled', payment_status = 'expired'
  WHERE hotel_id = p_hotel_id AND room_type_id = p_room_type_id
    AND status = 'pending_payment' AND created_at < now() - interval '30 minutes';

  SELECT count(*) INTO v_inventory FROM rooms
  WHERE hotel_id = p_hotel_id AND room_type_id = p_room_type_id AND status <> 'out_of_service';
  SELECT count(*) INTO v_committed FROM (
    SELECT id FROM reservations WHERE hotel_id = p_hotel_id AND room_type_id = p_room_type_id
      AND status <> 'cancelled' AND check_in < p_check_out AND check_out > p_check_in
    UNION ALL
    SELECT id FROM direct_bookings WHERE hotel_id = p_hotel_id AND room_type_id = p_room_type_id
      AND status IN ('confirmed','checked_in','checked_out','pending')
      AND check_in < p_check_out AND check_out > p_check_in
    UNION ALL
    SELECT id FROM direct_bookings WHERE hotel_id = p_hotel_id AND room_type_id = p_room_type_id
      AND status = 'pending_payment' AND created_at >= now() - interval '30 minutes'
      AND check_in < p_check_out AND check_out > p_check_in
  ) occupied;
  IF v_inventory <= v_committed THEN RAISE EXCEPTION 'No availability remains for the selected room type'; END IF;

  INSERT INTO direct_bookings (hotel_id, tenant_id, checkout_request_id, confirmation_number, room_type_id, guest_name, guest_email, guest_phone, guest_country, check_in, check_out, adults, children, rate_per_night, subtotal, tax_amount, total_amount, deposit_amount, special_requests, status, payment_status, source)
  VALUES (p_hotel_id, p_tenant_id, p_checkout_request_id, p_confirmation_number, p_room_type_id, p_guest_name, p_guest_email, p_guest_phone, p_guest_country, p_check_in, p_check_out, p_adults, p_children, p_rate_per_night, p_subtotal, p_tax_amount, p_total_amount, p_deposit_amount, p_special_requests, 'pending_payment', 'pending', 'direct')
  RETURNING direct_bookings.id, direct_bookings.confirmation_number INTO id, confirmation_number;
  RETURN NEXT;
END $$;

REVOKE ALL ON FUNCTION public.reserve_direct_booking_hold FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reserve_direct_booking_hold TO service_role;
