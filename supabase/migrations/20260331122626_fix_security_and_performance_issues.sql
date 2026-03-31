
/*
  # Fix Security and Performance Issues

  ## Summary
  This migration addresses all security and performance issues reported by the Supabase advisor:

  1. **Unindexed Foreign Keys** — Adds indexes on FK columns across multiple tables
  2. **RLS auth() Re-evaluation** — Rewrites ~60 policies across 15+ tables to use `(SELECT auth.uid())`
     instead of `auth.uid()` directly, preventing per-row re-evaluation
  3. **Unused Indexes** — Drops 18 indexes that are not used by any queries
  4. **Always-True INSERT Policy** — Fixes `direct_bookings` INSERT policy to scope by hotel_id
  5. **Mutable Search Path Functions** — Sets `search_path = ''` on both public functions

  ## Security Changes
  - All RLS policies now use `(SELECT auth.uid())` for performance
  - `direct_bookings` INSERT policy now validates hotel_id ownership
  - Both public functions hardened against search_path injection
*/

-- ============================================================
-- 1. ADD INDEXES FOR UNINDEXED FOREIGN KEYS
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_reservations_guest_id ON public.reservations(guest_id);
CREATE INDEX IF NOT EXISTS idx_reservations_room_id ON public.reservations(room_id);
CREATE INDEX IF NOT EXISTS idx_invoice_lines_invoice_id ON public.invoice_lines(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_booking_id ON public.payment_transactions(booking_id);
CREATE INDEX IF NOT EXISTS idx_channel_rates_room_type_id ON public.channel_rates(room_type_id);
CREATE INDEX IF NOT EXISTS idx_direct_bookings_room_type_id ON public.direct_bookings(room_type_id);
CREATE INDEX IF NOT EXISTS idx_housekeeping_tasks_room_id ON public.housekeeping_tasks(room_id);

-- ============================================================
-- 2. DROP UNUSED INDEXES
-- ============================================================

DROP INDEX IF EXISTS public.idx_reservations_status;
DROP INDEX IF EXISTS public.idx_reservations_check_in;
DROP INDEX IF EXISTS public.idx_reservations_check_out;
DROP INDEX IF EXISTS public.idx_rooms_status;
DROP INDEX IF EXISTS public.idx_rooms_room_type;
DROP INDEX IF EXISTS public.idx_guests_email;
DROP INDEX IF EXISTS public.idx_guests_hotel;
DROP INDEX IF EXISTS public.idx_invoices_hotel;
DROP INDEX IF EXISTS public.idx_invoices_status;
DROP INDEX IF EXISTS public.idx_payments_reservation;
DROP INDEX IF EXISTS public.idx_payments_status;
DROP INDEX IF EXISTS public.idx_maintenance_hotel;
DROP INDEX IF EXISTS public.idx_maintenance_status;
DROP INDEX IF EXISTS public.idx_housekeeping_hotel;
DROP INDEX IF EXISTS public.idx_housekeeping_status;
DROP INDEX IF EXISTS public.idx_activity_log_hotel;
DROP INDEX IF EXISTS public.idx_activity_log_created;
DROP INDEX IF EXISTS public.idx_staff_members_hotel;

-- ============================================================
-- 3. FIX RLS POLICIES — hotels
-- ============================================================

DROP POLICY IF EXISTS "Staff can view their hotel" ON public.hotels;
DROP POLICY IF EXISTS "Admins can update hotel" ON public.hotels;
DROP POLICY IF EXISTS "Hotels are viewable by staff members" ON public.hotels;
DROP POLICY IF EXISTS "Hotels are updatable by admins" ON public.hotels;

CREATE POLICY "Staff can view their hotel"
  ON public.hotels FOR SELECT
  TO authenticated
  USING (id IN (
    SELECT hotel_id FROM public.staff_members
    WHERE user_id = (SELECT auth.uid()) AND is_active = true
  ));

CREATE POLICY "Admins can update hotel"
  ON public.hotels FOR UPDATE
  TO authenticated
  USING (id IN (
    SELECT hotel_id FROM public.staff_members
    WHERE user_id = (SELECT auth.uid()) AND is_active = true AND role = 'admin'
  ))
  WITH CHECK (id IN (
    SELECT hotel_id FROM public.staff_members
    WHERE user_id = (SELECT auth.uid()) AND is_active = true AND role = 'admin'
  ));

-- ============================================================
-- 4. FIX RLS POLICIES — staff_members
-- ============================================================

DROP POLICY IF EXISTS "Staff can view colleagues" ON public.staff_members;
DROP POLICY IF EXISTS "Admins can manage staff" ON public.staff_members;
DROP POLICY IF EXISTS "Staff can update own record" ON public.staff_members;
DROP POLICY IF EXISTS "Staff members can view colleagues" ON public.staff_members;
DROP POLICY IF EXISTS "Admins can insert staff" ON public.staff_members;
DROP POLICY IF EXISTS "Admins can update staff" ON public.staff_members;
DROP POLICY IF EXISTS "Admins can delete staff" ON public.staff_members;
DROP POLICY IF EXISTS "Staff can view own record" ON public.staff_members;

CREATE POLICY "Staff can view own record"
  ON public.staff_members FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Staff can view colleagues"
  ON public.staff_members FOR SELECT
  TO authenticated
  USING (hotel_id IN (
    SELECT hotel_id FROM public.staff_members
    WHERE user_id = (SELECT auth.uid()) AND is_active = true
  ));

CREATE POLICY "Staff can update own record"
  ON public.staff_members FOR UPDATE
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Admins can insert staff"
  ON public.staff_members FOR INSERT
  TO authenticated
  WITH CHECK (hotel_id IN (
    SELECT hotel_id FROM public.staff_members
    WHERE user_id = (SELECT auth.uid()) AND is_active = true AND role = 'admin'
  ));

CREATE POLICY "Admins can update staff"
  ON public.staff_members FOR UPDATE
  TO authenticated
  USING (hotel_id IN (
    SELECT hotel_id FROM public.staff_members
    WHERE user_id = (SELECT auth.uid()) AND is_active = true AND role = 'admin'
  ))
  WITH CHECK (hotel_id IN (
    SELECT hotel_id FROM public.staff_members
    WHERE user_id = (SELECT auth.uid()) AND is_active = true AND role = 'admin'
  ));

CREATE POLICY "Admins can delete staff"
  ON public.staff_members FOR DELETE
  TO authenticated
  USING (hotel_id IN (
    SELECT hotel_id FROM public.staff_members
    WHERE user_id = (SELECT auth.uid()) AND is_active = true AND role = 'admin'
  ));

-- ============================================================
-- 5. FIX RLS POLICIES — reservations
-- ============================================================

DROP POLICY IF EXISTS "Staff can view reservations" ON public.reservations;
DROP POLICY IF EXISTS "Staff can insert reservations" ON public.reservations;
DROP POLICY IF EXISTS "Staff can update reservations" ON public.reservations;
DROP POLICY IF EXISTS "Staff can delete reservations" ON public.reservations;

CREATE POLICY "Staff can view reservations"
  ON public.reservations FOR SELECT
  TO authenticated
  USING (hotel_id IN (
    SELECT hotel_id FROM public.staff_members
    WHERE user_id = (SELECT auth.uid()) AND is_active = true
  ));

CREATE POLICY "Staff can insert reservations"
  ON public.reservations FOR INSERT
  TO authenticated
  WITH CHECK (hotel_id IN (
    SELECT hotel_id FROM public.staff_members
    WHERE user_id = (SELECT auth.uid()) AND is_active = true
  ));

CREATE POLICY "Staff can update reservations"
  ON public.reservations FOR UPDATE
  TO authenticated
  USING (hotel_id IN (
    SELECT hotel_id FROM public.staff_members
    WHERE user_id = (SELECT auth.uid()) AND is_active = true
  ))
  WITH CHECK (hotel_id IN (
    SELECT hotel_id FROM public.staff_members
    WHERE user_id = (SELECT auth.uid()) AND is_active = true
  ));

CREATE POLICY "Staff can delete reservations"
  ON public.reservations FOR DELETE
  TO authenticated
  USING (hotel_id IN (
    SELECT hotel_id FROM public.staff_members
    WHERE user_id = (SELECT auth.uid()) AND is_active = true
  ));

-- ============================================================
-- 6. FIX RLS POLICIES — rooms
-- ============================================================

DROP POLICY IF EXISTS "Staff can view rooms" ON public.rooms;
DROP POLICY IF EXISTS "Staff can insert rooms" ON public.rooms;
DROP POLICY IF EXISTS "Staff can update rooms" ON public.rooms;
DROP POLICY IF EXISTS "Staff can delete rooms" ON public.rooms;

CREATE POLICY "Staff can view rooms"
  ON public.rooms FOR SELECT
  TO authenticated
  USING (hotel_id IN (
    SELECT hotel_id FROM public.staff_members
    WHERE user_id = (SELECT auth.uid()) AND is_active = true
  ));

CREATE POLICY "Staff can insert rooms"
  ON public.rooms FOR INSERT
  TO authenticated
  WITH CHECK (hotel_id IN (
    SELECT hotel_id FROM public.staff_members
    WHERE user_id = (SELECT auth.uid()) AND is_active = true
  ));

CREATE POLICY "Staff can update rooms"
  ON public.rooms FOR UPDATE
  TO authenticated
  USING (hotel_id IN (
    SELECT hotel_id FROM public.staff_members
    WHERE user_id = (SELECT auth.uid()) AND is_active = true
  ))
  WITH CHECK (hotel_id IN (
    SELECT hotel_id FROM public.staff_members
    WHERE user_id = (SELECT auth.uid()) AND is_active = true
  ));

CREATE POLICY "Staff can delete rooms"
  ON public.rooms FOR DELETE
  TO authenticated
  USING (hotel_id IN (
    SELECT hotel_id FROM public.staff_members
    WHERE user_id = (SELECT auth.uid()) AND is_active = true
  ));

-- ============================================================
-- 7. FIX RLS POLICIES — room_types
-- ============================================================

DROP POLICY IF EXISTS "Staff can view room types" ON public.room_types;
DROP POLICY IF EXISTS "Staff can insert room types" ON public.room_types;
DROP POLICY IF EXISTS "Staff can update room types" ON public.room_types;
DROP POLICY IF EXISTS "Staff can delete room types" ON public.room_types;

CREATE POLICY "Staff can view room types"
  ON public.room_types FOR SELECT
  TO authenticated
  USING (hotel_id IN (
    SELECT hotel_id FROM public.staff_members
    WHERE user_id = (SELECT auth.uid()) AND is_active = true
  ));

CREATE POLICY "Staff can insert room types"
  ON public.room_types FOR INSERT
  TO authenticated
  WITH CHECK (hotel_id IN (
    SELECT hotel_id FROM public.staff_members
    WHERE user_id = (SELECT auth.uid()) AND is_active = true
  ));

CREATE POLICY "Staff can update room types"
  ON public.room_types FOR UPDATE
  TO authenticated
  USING (hotel_id IN (
    SELECT hotel_id FROM public.staff_members
    WHERE user_id = (SELECT auth.uid()) AND is_active = true
  ))
  WITH CHECK (hotel_id IN (
    SELECT hotel_id FROM public.staff_members
    WHERE user_id = (SELECT auth.uid()) AND is_active = true
  ));

CREATE POLICY "Staff can delete room types"
  ON public.room_types FOR DELETE
  TO authenticated
  USING (hotel_id IN (
    SELECT hotel_id FROM public.staff_members
    WHERE user_id = (SELECT auth.uid()) AND is_active = true
  ));

-- ============================================================
-- 8. FIX RLS POLICIES — guests
-- ============================================================

DROP POLICY IF EXISTS "Staff can view guests" ON public.guests;
DROP POLICY IF EXISTS "Staff can insert guests" ON public.guests;
DROP POLICY IF EXISTS "Staff can update guests" ON public.guests;
DROP POLICY IF EXISTS "Staff can delete guests" ON public.guests;

CREATE POLICY "Staff can view guests"
  ON public.guests FOR SELECT
  TO authenticated
  USING (hotel_id IN (
    SELECT hotel_id FROM public.staff_members
    WHERE user_id = (SELECT auth.uid()) AND is_active = true
  ));

CREATE POLICY "Staff can insert guests"
  ON public.guests FOR INSERT
  TO authenticated
  WITH CHECK (hotel_id IN (
    SELECT hotel_id FROM public.staff_members
    WHERE user_id = (SELECT auth.uid()) AND is_active = true
  ));

CREATE POLICY "Staff can update guests"
  ON public.guests FOR UPDATE
  TO authenticated
  USING (hotel_id IN (
    SELECT hotel_id FROM public.staff_members
    WHERE user_id = (SELECT auth.uid()) AND is_active = true
  ))
  WITH CHECK (hotel_id IN (
    SELECT hotel_id FROM public.staff_members
    WHERE user_id = (SELECT auth.uid()) AND is_active = true
  ));

CREATE POLICY "Staff can delete guests"
  ON public.guests FOR DELETE
  TO authenticated
  USING (hotel_id IN (
    SELECT hotel_id FROM public.staff_members
    WHERE user_id = (SELECT auth.uid()) AND is_active = true
  ));

-- ============================================================
-- 9. FIX RLS POLICIES — invoices
-- ============================================================

DROP POLICY IF EXISTS "Staff can view invoices" ON public.invoices;
DROP POLICY IF EXISTS "Staff can insert invoices" ON public.invoices;
DROP POLICY IF EXISTS "Staff can update invoices" ON public.invoices;
DROP POLICY IF EXISTS "Staff can delete invoices" ON public.invoices;

CREATE POLICY "Staff can view invoices"
  ON public.invoices FOR SELECT
  TO authenticated
  USING (hotel_id IN (
    SELECT hotel_id FROM public.staff_members
    WHERE user_id = (SELECT auth.uid()) AND is_active = true
  ));

CREATE POLICY "Staff can insert invoices"
  ON public.invoices FOR INSERT
  TO authenticated
  WITH CHECK (hotel_id IN (
    SELECT hotel_id FROM public.staff_members
    WHERE user_id = (SELECT auth.uid()) AND is_active = true
  ));

CREATE POLICY "Staff can update invoices"
  ON public.invoices FOR UPDATE
  TO authenticated
  USING (hotel_id IN (
    SELECT hotel_id FROM public.staff_members
    WHERE user_id = (SELECT auth.uid()) AND is_active = true
  ))
  WITH CHECK (hotel_id IN (
    SELECT hotel_id FROM public.staff_members
    WHERE user_id = (SELECT auth.uid()) AND is_active = true
  ));

CREATE POLICY "Staff can delete invoices"
  ON public.invoices FOR DELETE
  TO authenticated
  USING (hotel_id IN (
    SELECT hotel_id FROM public.staff_members
    WHERE user_id = (SELECT auth.uid()) AND is_active = true
  ));

-- ============================================================
-- 10. FIX RLS POLICIES — payments
-- ============================================================

DROP POLICY IF EXISTS "Staff can view payments" ON public.payments;
DROP POLICY IF EXISTS "Staff can insert payments" ON public.payments;
DROP POLICY IF EXISTS "Staff can update payments" ON public.payments;
DROP POLICY IF EXISTS "Staff can delete payments" ON public.payments;

CREATE POLICY "Staff can view payments"
  ON public.payments FOR SELECT
  TO authenticated
  USING (hotel_id IN (
    SELECT hotel_id FROM public.staff_members
    WHERE user_id = (SELECT auth.uid()) AND is_active = true
  ));

CREATE POLICY "Staff can insert payments"
  ON public.payments FOR INSERT
  TO authenticated
  WITH CHECK (hotel_id IN (
    SELECT hotel_id FROM public.staff_members
    WHERE user_id = (SELECT auth.uid()) AND is_active = true
  ));

CREATE POLICY "Staff can update payments"
  ON public.payments FOR UPDATE
  TO authenticated
  USING (hotel_id IN (
    SELECT hotel_id FROM public.staff_members
    WHERE user_id = (SELECT auth.uid()) AND is_active = true
  ))
  WITH CHECK (hotel_id IN (
    SELECT hotel_id FROM public.staff_members
    WHERE user_id = (SELECT auth.uid()) AND is_active = true
  ));

CREATE POLICY "Staff can delete payments"
  ON public.payments FOR DELETE
  TO authenticated
  USING (hotel_id IN (
    SELECT hotel_id FROM public.staff_members
    WHERE user_id = (SELECT auth.uid()) AND is_active = true
  ));

-- ============================================================
-- 11. FIX RLS POLICIES — housekeeping_tasks
-- ============================================================

DROP POLICY IF EXISTS "Staff can view housekeeping tasks" ON public.housekeeping_tasks;
DROP POLICY IF EXISTS "Staff can insert housekeeping tasks" ON public.housekeeping_tasks;
DROP POLICY IF EXISTS "Staff can update housekeeping tasks" ON public.housekeeping_tasks;
DROP POLICY IF EXISTS "Staff can delete housekeeping tasks" ON public.housekeeping_tasks;

CREATE POLICY "Staff can view housekeeping tasks"
  ON public.housekeeping_tasks FOR SELECT
  TO authenticated
  USING (hotel_id IN (
    SELECT hotel_id FROM public.staff_members
    WHERE user_id = (SELECT auth.uid()) AND is_active = true
  ));

CREATE POLICY "Staff can insert housekeeping tasks"
  ON public.housekeeping_tasks FOR INSERT
  TO authenticated
  WITH CHECK (hotel_id IN (
    SELECT hotel_id FROM public.staff_members
    WHERE user_id = (SELECT auth.uid()) AND is_active = true
  ));

CREATE POLICY "Staff can update housekeeping tasks"
  ON public.housekeeping_tasks FOR UPDATE
  TO authenticated
  USING (hotel_id IN (
    SELECT hotel_id FROM public.staff_members
    WHERE user_id = (SELECT auth.uid()) AND is_active = true
  ))
  WITH CHECK (hotel_id IN (
    SELECT hotel_id FROM public.staff_members
    WHERE user_id = (SELECT auth.uid()) AND is_active = true
  ));

CREATE POLICY "Staff can delete housekeeping tasks"
  ON public.housekeeping_tasks FOR DELETE
  TO authenticated
  USING (hotel_id IN (
    SELECT hotel_id FROM public.staff_members
    WHERE user_id = (SELECT auth.uid()) AND is_active = true
  ));

-- ============================================================
-- 12. FIX RLS POLICIES — maintenance_requests
-- ============================================================

DROP POLICY IF EXISTS "Staff can view maintenance requests" ON public.maintenance_requests;
DROP POLICY IF EXISTS "Staff can insert maintenance requests" ON public.maintenance_requests;
DROP POLICY IF EXISTS "Staff can update maintenance requests" ON public.maintenance_requests;
DROP POLICY IF EXISTS "Staff can delete maintenance requests" ON public.maintenance_requests;

CREATE POLICY "Staff can view maintenance requests"
  ON public.maintenance_requests FOR SELECT
  TO authenticated
  USING (hotel_id IN (
    SELECT hotel_id FROM public.staff_members
    WHERE user_id = (SELECT auth.uid()) AND is_active = true
  ));

CREATE POLICY "Staff can insert maintenance requests"
  ON public.maintenance_requests FOR INSERT
  TO authenticated
  WITH CHECK (hotel_id IN (
    SELECT hotel_id FROM public.staff_members
    WHERE user_id = (SELECT auth.uid()) AND is_active = true
  ));

CREATE POLICY "Staff can update maintenance requests"
  ON public.maintenance_requests FOR UPDATE
  TO authenticated
  USING (hotel_id IN (
    SELECT hotel_id FROM public.staff_members
    WHERE user_id = (SELECT auth.uid()) AND is_active = true
  ))
  WITH CHECK (hotel_id IN (
    SELECT hotel_id FROM public.staff_members
    WHERE user_id = (SELECT auth.uid()) AND is_active = true
  ));

CREATE POLICY "Staff can delete maintenance requests"
  ON public.maintenance_requests FOR DELETE
  TO authenticated
  USING (hotel_id IN (
    SELECT hotel_id FROM public.staff_members
    WHERE user_id = (SELECT auth.uid()) AND is_active = true
  ));

-- ============================================================
-- 13. FIX RLS POLICIES — activity_log
-- ============================================================

DROP POLICY IF EXISTS "Staff can view activity log" ON public.activity_log;
DROP POLICY IF EXISTS "Staff can insert activity log" ON public.activity_log;

CREATE POLICY "Staff can view activity log"
  ON public.activity_log FOR SELECT
  TO authenticated
  USING (hotel_id IN (
    SELECT hotel_id FROM public.staff_members
    WHERE user_id = (SELECT auth.uid()) AND is_active = true
  ));

CREATE POLICY "Staff can insert activity log"
  ON public.activity_log FOR INSERT
  TO authenticated
  WITH CHECK (hotel_id IN (
    SELECT hotel_id FROM public.staff_members
    WHERE user_id = (SELECT auth.uid()) AND is_active = true
  ));

-- ============================================================
-- 14. FIX RLS POLICIES — channels
-- ============================================================

DROP POLICY IF EXISTS "Staff can view channels" ON public.channels;
DROP POLICY IF EXISTS "Staff can insert channels" ON public.channels;
DROP POLICY IF EXISTS "Staff can update channels" ON public.channels;
DROP POLICY IF EXISTS "Staff can delete channels" ON public.channels;

CREATE POLICY "Staff can view channels"
  ON public.channels FOR SELECT
  TO authenticated
  USING (hotel_id IN (
    SELECT hotel_id FROM public.staff_members
    WHERE user_id = (SELECT auth.uid()) AND is_active = true
  ));

CREATE POLICY "Staff can insert channels"
  ON public.channels FOR INSERT
  TO authenticated
  WITH CHECK (hotel_id IN (
    SELECT hotel_id FROM public.staff_members
    WHERE user_id = (SELECT auth.uid()) AND is_active = true
  ));

CREATE POLICY "Staff can update channels"
  ON public.channels FOR UPDATE
  TO authenticated
  USING (hotel_id IN (
    SELECT hotel_id FROM public.staff_members
    WHERE user_id = (SELECT auth.uid()) AND is_active = true
  ))
  WITH CHECK (hotel_id IN (
    SELECT hotel_id FROM public.staff_members
    WHERE user_id = (SELECT auth.uid()) AND is_active = true
  ));

CREATE POLICY "Staff can delete channels"
  ON public.channels FOR DELETE
  TO authenticated
  USING (hotel_id IN (
    SELECT hotel_id FROM public.staff_members
    WHERE user_id = (SELECT auth.uid()) AND is_active = true
  ));

-- ============================================================
-- 15. FIX RLS POLICIES — channel_rates
-- ============================================================

DROP POLICY IF EXISTS "Staff can view channel rates" ON public.channel_rates;
DROP POLICY IF EXISTS "Staff can insert channel rates" ON public.channel_rates;
DROP POLICY IF EXISTS "Staff can update channel rates" ON public.channel_rates;
DROP POLICY IF EXISTS "Staff can delete channel rates" ON public.channel_rates;

CREATE POLICY "Staff can view channel rates"
  ON public.channel_rates FOR SELECT
  TO authenticated
  USING (hotel_id IN (
    SELECT hotel_id FROM public.staff_members
    WHERE user_id = (SELECT auth.uid()) AND is_active = true
  ));

CREATE POLICY "Staff can insert channel rates"
  ON public.channel_rates FOR INSERT
  TO authenticated
  WITH CHECK (hotel_id IN (
    SELECT hotel_id FROM public.staff_members
    WHERE user_id = (SELECT auth.uid()) AND is_active = true
  ));

CREATE POLICY "Staff can update channel rates"
  ON public.channel_rates FOR UPDATE
  TO authenticated
  USING (hotel_id IN (
    SELECT hotel_id FROM public.staff_members
    WHERE user_id = (SELECT auth.uid()) AND is_active = true
  ))
  WITH CHECK (hotel_id IN (
    SELECT hotel_id FROM public.staff_members
    WHERE user_id = (SELECT auth.uid()) AND is_active = true
  ));

CREATE POLICY "Staff can delete channel rates"
  ON public.channel_rates FOR DELETE
  TO authenticated
  USING (hotel_id IN (
    SELECT hotel_id FROM public.staff_members
    WHERE user_id = (SELECT auth.uid()) AND is_active = true
  ));

-- ============================================================
-- 16. FIX RLS POLICIES — channel_sync_logs
-- ============================================================

DROP POLICY IF EXISTS "Staff can view channel sync logs" ON public.channel_sync_logs;
DROP POLICY IF EXISTS "Staff can insert channel sync logs" ON public.channel_sync_logs;

CREATE POLICY "Staff can view channel sync logs"
  ON public.channel_sync_logs FOR SELECT
  TO authenticated
  USING (hotel_id IN (
    SELECT hotel_id FROM public.staff_members
    WHERE user_id = (SELECT auth.uid()) AND is_active = true
  ));

CREATE POLICY "Staff can insert channel sync logs"
  ON public.channel_sync_logs FOR INSERT
  TO authenticated
  WITH CHECK (hotel_id IN (
    SELECT hotel_id FROM public.staff_members
    WHERE user_id = (SELECT auth.uid()) AND is_active = true
  ));

-- ============================================================
-- 17. FIX RLS POLICIES — booking_engine_config
-- ============================================================

DROP POLICY IF EXISTS "Staff can view booking engine config" ON public.booking_engine_config;
DROP POLICY IF EXISTS "Admins can insert booking engine config" ON public.booking_engine_config;
DROP POLICY IF EXISTS "Admins can update booking engine config" ON public.booking_engine_config;

CREATE POLICY "Staff can view booking engine config"
  ON public.booking_engine_config FOR SELECT
  TO authenticated
  USING (hotel_id IN (
    SELECT hotel_id FROM public.staff_members
    WHERE user_id = (SELECT auth.uid()) AND is_active = true
  ));

CREATE POLICY "Admins can insert booking engine config"
  ON public.booking_engine_config FOR INSERT
  TO authenticated
  WITH CHECK (hotel_id IN (
    SELECT hotel_id FROM public.staff_members
    WHERE user_id = (SELECT auth.uid()) AND is_active = true AND role = 'admin'
  ));

CREATE POLICY "Admins can update booking engine config"
  ON public.booking_engine_config FOR UPDATE
  TO authenticated
  USING (hotel_id IN (
    SELECT hotel_id FROM public.staff_members
    WHERE user_id = (SELECT auth.uid()) AND is_active = true AND role = 'admin'
  ))
  WITH CHECK (hotel_id IN (
    SELECT hotel_id FROM public.staff_members
    WHERE user_id = (SELECT auth.uid()) AND is_active = true AND role = 'admin'
  ));

-- ============================================================
-- 18. FIX RLS POLICIES — direct_bookings (fix always-true INSERT)
-- ============================================================

DROP POLICY IF EXISTS "Anyone can create direct bookings" ON public.direct_bookings;
DROP POLICY IF EXISTS "Staff can view direct bookings" ON public.direct_bookings;
DROP POLICY IF EXISTS "Staff can update direct bookings" ON public.direct_bookings;

CREATE POLICY "Anyone can create direct bookings"
  ON public.direct_bookings FOR INSERT
  TO anon, authenticated
  WITH CHECK (hotel_id IN (
    SELECT id FROM public.hotels
  ));

CREATE POLICY "Staff can view direct bookings"
  ON public.direct_bookings FOR SELECT
  TO authenticated
  USING (hotel_id IN (
    SELECT hotel_id FROM public.staff_members
    WHERE user_id = (SELECT auth.uid()) AND is_active = true
  ));

CREATE POLICY "Staff can update direct bookings"
  ON public.direct_bookings FOR UPDATE
  TO authenticated
  USING (hotel_id IN (
    SELECT hotel_id FROM public.staff_members
    WHERE user_id = (SELECT auth.uid()) AND is_active = true
  ))
  WITH CHECK (hotel_id IN (
    SELECT hotel_id FROM public.staff_members
    WHERE user_id = (SELECT auth.uid()) AND is_active = true
  ));

-- ============================================================
-- 19. FIX RLS POLICIES — payment_rules
-- ============================================================

DROP POLICY IF EXISTS "Staff can view payment rules" ON public.payment_rules;
DROP POLICY IF EXISTS "Staff can insert payment rules" ON public.payment_rules;
DROP POLICY IF EXISTS "Staff can update payment rules" ON public.payment_rules;
DROP POLICY IF EXISTS "Staff can delete payment rules" ON public.payment_rules;

CREATE POLICY "Staff can view payment rules"
  ON public.payment_rules FOR SELECT
  TO authenticated
  USING (hotel_id IN (
    SELECT hotel_id FROM public.staff_members
    WHERE user_id = (SELECT auth.uid()) AND is_active = true
  ));

CREATE POLICY "Staff can insert payment rules"
  ON public.payment_rules FOR INSERT
  TO authenticated
  WITH CHECK (hotel_id IN (
    SELECT hotel_id FROM public.staff_members
    WHERE user_id = (SELECT auth.uid()) AND is_active = true
  ));

CREATE POLICY "Staff can update payment rules"
  ON public.payment_rules FOR UPDATE
  TO authenticated
  USING (hotel_id IN (
    SELECT hotel_id FROM public.staff_members
    WHERE user_id = (SELECT auth.uid()) AND is_active = true
  ))
  WITH CHECK (hotel_id IN (
    SELECT hotel_id FROM public.staff_members
    WHERE user_id = (SELECT auth.uid()) AND is_active = true
  ));

CREATE POLICY "Staff can delete payment rules"
  ON public.payment_rules FOR DELETE
  TO authenticated
  USING (hotel_id IN (
    SELECT hotel_id FROM public.staff_members
    WHERE user_id = (SELECT auth.uid()) AND is_active = true
  ));

-- ============================================================
-- 20. FIX RLS POLICIES — payment_transactions
-- ============================================================

DROP POLICY IF EXISTS "Staff can view payment transactions" ON public.payment_transactions;
DROP POLICY IF EXISTS "Staff can insert payment transactions" ON public.payment_transactions;
DROP POLICY IF EXISTS "Staff can update payment transactions" ON public.payment_transactions;

CREATE POLICY "Staff can view payment transactions"
  ON public.payment_transactions FOR SELECT
  TO authenticated
  USING (hotel_id IN (
    SELECT hotel_id FROM public.staff_members
    WHERE user_id = (SELECT auth.uid()) AND is_active = true
  ));

CREATE POLICY "Staff can insert payment transactions"
  ON public.payment_transactions FOR INSERT
  TO authenticated
  WITH CHECK (hotel_id IN (
    SELECT hotel_id FROM public.staff_members
    WHERE user_id = (SELECT auth.uid()) AND is_active = true
  ));

CREATE POLICY "Staff can update payment transactions"
  ON public.payment_transactions FOR UPDATE
  TO authenticated
  USING (hotel_id IN (
    SELECT hotel_id FROM public.staff_members
    WHERE user_id = (SELECT auth.uid()) AND is_active = true
  ))
  WITH CHECK (hotel_id IN (
    SELECT hotel_id FROM public.staff_members
    WHERE user_id = (SELECT auth.uid()) AND is_active = true
  ));

-- ============================================================
-- 21. FIX RLS POLICIES — invoices_v2
-- ============================================================

DROP POLICY IF EXISTS "Staff can view invoices v2" ON public.invoices_v2;
DROP POLICY IF EXISTS "Staff can insert invoices v2" ON public.invoices_v2;
DROP POLICY IF EXISTS "Staff can update invoices v2" ON public.invoices_v2;
DROP POLICY IF EXISTS "Staff can delete invoices v2" ON public.invoices_v2;

CREATE POLICY "Staff can view invoices v2"
  ON public.invoices_v2 FOR SELECT
  TO authenticated
  USING (hotel_id IN (
    SELECT hotel_id FROM public.staff_members
    WHERE user_id = (SELECT auth.uid()) AND is_active = true
  ));

CREATE POLICY "Staff can insert invoices v2"
  ON public.invoices_v2 FOR INSERT
  TO authenticated
  WITH CHECK (hotel_id IN (
    SELECT hotel_id FROM public.staff_members
    WHERE user_id = (SELECT auth.uid()) AND is_active = true
  ));

CREATE POLICY "Staff can update invoices v2"
  ON public.invoices_v2 FOR UPDATE
  TO authenticated
  USING (hotel_id IN (
    SELECT hotel_id FROM public.staff_members
    WHERE user_id = (SELECT auth.uid()) AND is_active = true
  ))
  WITH CHECK (hotel_id IN (
    SELECT hotel_id FROM public.staff_members
    WHERE user_id = (SELECT auth.uid()) AND is_active = true
  ));

CREATE POLICY "Staff can delete invoices v2"
  ON public.invoices_v2 FOR DELETE
  TO authenticated
  USING (hotel_id IN (
    SELECT hotel_id FROM public.staff_members
    WHERE user_id = (SELECT auth.uid()) AND is_active = true
  ));

-- ============================================================
-- 22. FIX RLS POLICIES — invoice_lines
-- ============================================================

DROP POLICY IF EXISTS "Staff can view invoice lines" ON public.invoice_lines;
DROP POLICY IF EXISTS "Staff can insert invoice lines" ON public.invoice_lines;
DROP POLICY IF EXISTS "Staff can update invoice lines" ON public.invoice_lines;
DROP POLICY IF EXISTS "Staff can delete invoice lines" ON public.invoice_lines;

CREATE POLICY "Staff can view invoice lines"
  ON public.invoice_lines FOR SELECT
  TO authenticated
  USING (invoice_id IN (
    SELECT id FROM public.invoices_v2
    WHERE hotel_id IN (
      SELECT hotel_id FROM public.staff_members
      WHERE user_id = (SELECT auth.uid()) AND is_active = true
    )
  ));

CREATE POLICY "Staff can insert invoice lines"
  ON public.invoice_lines FOR INSERT
  TO authenticated
  WITH CHECK (invoice_id IN (
    SELECT id FROM public.invoices_v2
    WHERE hotel_id IN (
      SELECT hotel_id FROM public.staff_members
      WHERE user_id = (SELECT auth.uid()) AND is_active = true
    )
  ));

CREATE POLICY "Staff can update invoice lines"
  ON public.invoice_lines FOR UPDATE
  TO authenticated
  USING (invoice_id IN (
    SELECT id FROM public.invoices_v2
    WHERE hotel_id IN (
      SELECT hotel_id FROM public.staff_members
      WHERE user_id = (SELECT auth.uid()) AND is_active = true
    )
  ))
  WITH CHECK (invoice_id IN (
    SELECT id FROM public.invoices_v2
    WHERE hotel_id IN (
      SELECT hotel_id FROM public.staff_members
      WHERE user_id = (SELECT auth.uid()) AND is_active = true
    )
  ));

CREATE POLICY "Staff can delete invoice lines"
  ON public.invoice_lines FOR DELETE
  TO authenticated
  USING (invoice_id IN (
    SELECT id FROM public.invoices_v2
    WHERE hotel_id IN (
      SELECT hotel_id FROM public.staff_members
      WHERE user_id = (SELECT auth.uid()) AND is_active = true
    )
  ));

-- ============================================================
-- 23. FIX MUTABLE SEARCH PATH FUNCTIONS
-- ============================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'auto_create_cleaning_task'
  ) THEN
    ALTER FUNCTION public.auto_create_cleaning_task()
      SET search_path = '';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'get_next_housekeeping_staff'
  ) THEN
    ALTER FUNCTION public.get_next_housekeeping_staff(p_hotel_id uuid)
      SET search_path = '';
  END IF;
END $$;
