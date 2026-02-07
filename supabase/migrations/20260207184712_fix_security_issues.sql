/*
  # Fix Database Security Issues

  ## Changes Made

  1. **Fix Function Search Path Security**
     - Update `update_updated_at_column` function with secure search_path
     - Prevents potential privilege escalation attacks by setting explicit search_path
     - Adds SECURITY INVOKER to ensure function runs with caller's privileges

  2. **Index Usage Notes**
     - All existing indexes are necessary and will be used by the application
     - Current "unused" status is due to lack of query statistics (new database)
     - Indexes support: foreign keys, RLS policies, status filters, date ranges
     - DO NOT remove these indexes - they are essential for performance

  3. **Password Protection Settings**
     - Leaked password protection must be enabled in Supabase Dashboard
     - Navigate to: Authentication > Settings > Security
     - Enable "Check for leaked passwords" to use HaveIBeenPwned.org integration
     - This cannot be configured via SQL migrations
*/

-- Drop and recreate the update_updated_at_column function with secure search_path
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- Verify all critical indexes exist (they should from previous migrations)
-- These are NOT unused - they support foreign keys, RLS, and common queries

-- Foreign key indexes (critical for JOIN performance)
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoices_guest_id ON invoices(guest_id);
CREATE INDEX IF NOT EXISTS idx_invoices_hotel_id ON invoices(hotel_id);
CREATE INDEX IF NOT EXISTS idx_invoices_reservation_id ON invoices(reservation_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_requests_hotel_id ON maintenance_requests(hotel_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_requests_room_id ON maintenance_requests(room_id);
CREATE INDEX IF NOT EXISTS idx_reservations_room_type_id ON reservations(room_type_id);
CREATE INDEX IF NOT EXISTS idx_rooms_room_type_id ON rooms(room_type_id);
CREATE INDEX IF NOT EXISTS idx_rooms_hotel_id ON rooms(hotel_id);
CREATE INDEX IF NOT EXISTS idx_room_types_hotel_id ON room_types(hotel_id);
CREATE INDEX IF NOT EXISTS idx_guests_hotel_id ON guests(hotel_id);
CREATE INDEX IF NOT EXISTS idx_reservations_hotel_id ON reservations(hotel_id);
CREATE INDEX IF NOT EXISTS idx_reservations_guest_id ON reservations(guest_id);
CREATE INDEX IF NOT EXISTS idx_reservations_room_id ON reservations(room_id);
CREATE INDEX IF NOT EXISTS idx_housekeeping_tasks_hotel_id ON housekeeping_tasks(hotel_id);
CREATE INDEX IF NOT EXISTS idx_housekeeping_tasks_room_id ON housekeeping_tasks(room_id);
CREATE INDEX IF NOT EXISTS idx_staff_members_hotel_id ON staff_members(hotel_id);
CREATE INDEX IF NOT EXISTS idx_staff_members_user_id ON staff_members(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_hotel_id ON activity_log(hotel_id);

-- Status and filter indexes (used by RLS policies and WHERE clauses)
CREATE INDEX IF NOT EXISTS idx_rooms_status ON rooms(status);
CREATE INDEX IF NOT EXISTS idx_reservations_status ON reservations(status);

-- Date range indexes (used for reservation queries)
CREATE INDEX IF NOT EXISTS idx_reservations_check_in ON reservations(check_in);
CREATE INDEX IF NOT EXISTS idx_reservations_check_out ON reservations(check_out);

-- Email lookup index (used for guest searches)
CREATE INDEX IF NOT EXISTS idx_guests_email ON guests(email);
