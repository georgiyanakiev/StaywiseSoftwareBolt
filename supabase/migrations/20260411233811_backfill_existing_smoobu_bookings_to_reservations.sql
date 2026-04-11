/*
  # Backfill existing Smoobu bookings into native reservations

  Triggers the `convert_booking_to_reservation` function for all existing
  rows in the `bookings` table by touching `updated_at`.

  This is a one-time data migration.
*/

UPDATE public.bookings
   SET updated_at = now()
 WHERE smoobu_id IS NOT NULL;
