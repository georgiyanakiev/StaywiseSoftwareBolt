/*
  # Fix Unindexed Foreign Key and Unused Index

  1. Changes
    - Add covering index on `activity_log.hotel_id` (unindexed foreign key)
    - Drop unused index `idx_payments_reservation_id` on `payments` table
*/

CREATE INDEX IF NOT EXISTS idx_activity_log_hotel_id ON public.activity_log (hotel_id);

DROP INDEX IF EXISTS public.idx_payments_reservation_id;
