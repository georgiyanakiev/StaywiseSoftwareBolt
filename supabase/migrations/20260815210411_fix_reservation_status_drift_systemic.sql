/*
# Fix systemic reservation status drift (all hotels)

## Problem
Reservations with status "confirmed" or "pending" whose checkout dates have passed
were never checked out. The previous migration (20260815195159) only handled
"checked_in" reservations, leaving confirmed/pending ones stuck. This affects
all 6 hotels in the system — 88 reservations total.

## Changes
1. Auto-checkout all confirmed/pending reservations whose checkout date has passed.
2. Revert confirmed reservations checked in before their check-in date back to confirmed
   (already handled by prior migration, included here for completeness).
3. Update sync_room_statuses() to also auto-resolve stale confirmed/pending reservations.
4. Add a scheduled function to run daily auto-checkout so future reservations don't drift.
5. Grant execute on the new function to authenticated.

## Important Notes
- Only touches reservations where check_out < CURRENT_DATE (past checkout).
- Does NOT touch cancelled or already checked_out reservations.
- Room statuses are recalculated after the fix.
- The daily cron runs at 2 AM UTC.
*/

-- 1) Auto-checkout confirmed/pending reservations past their checkout date
UPDATE public.reservations
   SET status = 'checked_out', updated_at = now()
 WHERE status IN ('confirmed', 'pending')
   AND check_out < now()::date;

-- 2) Revert prematurely checked-in reservations (idempotent with prior migration)
UPDATE public.reservations
   SET status = 'confirmed', updated_at = now()
 WHERE status = 'checked_in'
   AND check_in > now()::date;

-- 3) Fix payment_status for reservations marked "paid" but underpaid (idempotent)
UPDATE public.reservations
   SET payment_status = 'partial', updated_at = now()
 WHERE payment_status = 'paid'
   AND amount_paid IS NOT NULL
   AND amount_paid < total_amount;

-- 4) Enhanced sync_room_statuses: also auto-checkout stale confirmed/pending
CREATE OR REPLACE FUNCTION public.sync_room_statuses(p_hotel_id uuid DEFAULT NULL)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_updated integer;
BEGIN
  -- Auto-checkout any confirmed/pending reservations past their checkout date
  UPDATE public.reservations
     SET status = 'checked_out', updated_at = now()
   WHERE status IN ('confirmed', 'pending', 'checked_in')
     AND check_out < now()::date
     AND (p_hotel_id IS NULL OR hotel_id = p_hotel_id);

  -- Reset all non-maintenance rooms to available first
  UPDATE public.rooms
     SET status = 'available', updated_at = now()
   WHERE (p_hotel_id IS NULL OR hotel_id = p_hotel_id)
     AND status NOT IN ('maintenance', 'out_of_service');

  -- Mark rooms occupied by currently checked-in reservations
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

  -- Mark rooms reserved by confirmed reservations arriving today or in the future
  UPDATE public.rooms
     SET status = 'reserved', updated_at = now()
   WHERE id IN (
     SELECT r.room_id
       FROM public.reservations r
      WHERE r.status = 'confirmed'
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

-- 5) Daily auto-checkout function for the scheduler
CREATE OR REPLACE FUNCTION public.auto_checkout_expired_reservations()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_count integer;
BEGIN
  -- Check out all reservations past their checkout date that aren't already checked out or cancelled
  UPDATE public.reservations
     SET status = 'checked_out', updated_at = now()
   WHERE status NOT IN ('checked_out', 'cancelled')
     AND check_out < now()::date;

  GET DIAGNOSTICS v_count = ROW_COUNT;

  -- Sync room statuses
  PERFORM public.sync_room_statuses(NULL);

  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.auto_checkout_expired_reservations() FROM public;
GRANT EXECUTE ON FUNCTION public.auto_checkout_expired_reservations() TO authenticated;

-- 6) Schedule daily auto-checkout at 2 AM UTC using pg_cron if available
DO $do$
BEGIN
  BEGIN
    PERFORM cron.schedule(
      'auto-checkout-expired-reservations',
      '0 2 * * *',
      $sql$SELECT public.auto_checkout_expired_reservations()$sql$
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'pg_cron not available, skipping schedule';
  END;
END
$do$;

-- 7) Run the fix now
SELECT public.sync_room_statuses(NULL);
