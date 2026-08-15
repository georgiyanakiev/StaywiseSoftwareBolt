-- Fix reservation/room status drift.
-- 1) Auto-check-out reservations whose checkout date has passed but are still "checked_in".
-- 2) Revert future reservations that were prematurely checked in back to "confirmed".
-- 3) Fix payment_status for reservations marked "paid" but with amount_paid < total_amount.

UPDATE public.reservations
   SET status = 'checked_out', updated_at = now()
 WHERE status = 'checked_in'
   AND check_out < now()::date;

UPDATE public.reservations
   SET status = 'confirmed', updated_at = now()
 WHERE status = 'checked_in'
   AND check_in > now()::date;

UPDATE public.reservations
   SET payment_status = 'partial', updated_at = now()
 WHERE payment_status = 'paid'
   AND amount_paid IS NOT NULL
   AND amount_paid < total_amount;

-- 4) Recalculate room statuses from active reservations
CREATE OR REPLACE FUNCTION public.sync_room_statuses(p_hotel_id uuid DEFAULT NULL)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_updated integer;
BEGIN
  UPDATE public.rooms
     SET status = 'available', updated_at = now()
   WHERE (p_hotel_id IS NULL OR hotel_id = p_hotel_id)
     AND status NOT IN ('maintenance', 'out_of_service');

  UPDATE public.rooms
     SET status = 'occupied', updated_at = now()
   WHERE id IN (
     SELECT r.room_id
       FROM public.reservations r
      WHERE r.status = 'checked_in'
        AND r.room_id IS NOT NULL
        AND r.check_in <= now()::date
        AND r.check_out > now()::date
        AND (p_hotel_id IS NULL OR r.hotel_id = p_hotel_id)
   );

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated;
END;
$$;

REVOKE ALL ON FUNCTION public.sync_room_statuses(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.sync_room_statuses(uuid) TO authenticated;

SELECT public.sync_room_statuses(NULL);
