/*
  # Fix Auth RLS Initialization Plan - Batch 2
  Tables: payment_transactions, payments, channels, channel_rates, channel_sync_logs, booking_engine_config
*/

-- ═══ payment_transactions ═══
DROP POLICY IF EXISTS "Staff can view hotel payment transactions" ON public.payment_transactions;
DROP POLICY IF EXISTS "Staff can insert hotel payment transactions" ON public.payment_transactions;
DROP POLICY IF EXISTS "Staff can update hotel payment transactions" ON public.payment_transactions;
DROP POLICY IF EXISTS "Staff can delete hotel payment transactions" ON public.payment_transactions;

CREATE POLICY "Staff can view hotel payment transactions" ON public.payment_transactions FOR SELECT TO authenticated
  USING (hotel_id IN (SELECT sm.hotel_id FROM staff_members sm WHERE sm.user_id = (SELECT auth.uid()) AND sm.is_active = true));
CREATE POLICY "Staff can insert hotel payment transactions" ON public.payment_transactions FOR INSERT TO authenticated
  WITH CHECK (hotel_id IN (SELECT sm.hotel_id FROM staff_members sm WHERE sm.user_id = (SELECT auth.uid()) AND sm.is_active = true));
CREATE POLICY "Staff can update hotel payment transactions" ON public.payment_transactions FOR UPDATE TO authenticated
  USING (hotel_id IN (SELECT sm.hotel_id FROM staff_members sm WHERE sm.user_id = (SELECT auth.uid()) AND sm.is_active = true))
  WITH CHECK (hotel_id IN (SELECT sm.hotel_id FROM staff_members sm WHERE sm.user_id = (SELECT auth.uid()) AND sm.is_active = true));
CREATE POLICY "Staff can delete hotel payment transactions" ON public.payment_transactions FOR DELETE TO authenticated
  USING (hotel_id IN (SELECT sm.hotel_id FROM staff_members sm WHERE sm.user_id = (SELECT auth.uid()) AND sm.is_active = true));

-- ═══ payments (INSERT only) ═══
DROP POLICY IF EXISTS "Staff can insert payments for their hotel" ON public.payments;

CREATE POLICY "Staff can insert payments for their hotel" ON public.payments FOR INSERT TO authenticated
  WITH CHECK (hotel_id IN (SELECT sm.hotel_id FROM staff_members sm WHERE sm.user_id = (SELECT auth.uid()) AND sm.is_active = true));

-- ═══ channels ═══
DROP POLICY IF EXISTS "Staff can view hotel channels" ON public.channels;
DROP POLICY IF EXISTS "Staff can insert hotel channels" ON public.channels;
DROP POLICY IF EXISTS "Staff can update hotel channels" ON public.channels;
DROP POLICY IF EXISTS "Staff can delete hotel channels" ON public.channels;

CREATE POLICY "Staff can view hotel channels" ON public.channels FOR SELECT TO authenticated
  USING (hotel_id IN (SELECT staff_members.hotel_id FROM staff_members WHERE staff_members.user_id = (SELECT auth.uid()) AND staff_members.is_active = true));
CREATE POLICY "Staff can insert hotel channels" ON public.channels FOR INSERT TO authenticated
  WITH CHECK (hotel_id IN (SELECT staff_members.hotel_id FROM staff_members WHERE staff_members.user_id = (SELECT auth.uid()) AND staff_members.is_active = true));
CREATE POLICY "Staff can update hotel channels" ON public.channels FOR UPDATE TO authenticated
  USING (hotel_id IN (SELECT staff_members.hotel_id FROM staff_members WHERE staff_members.user_id = (SELECT auth.uid()) AND staff_members.is_active = true))
  WITH CHECK (hotel_id IN (SELECT staff_members.hotel_id FROM staff_members WHERE staff_members.user_id = (SELECT auth.uid()) AND staff_members.is_active = true));
CREATE POLICY "Staff can delete hotel channels" ON public.channels FOR DELETE TO authenticated
  USING (hotel_id IN (SELECT staff_members.hotel_id FROM staff_members WHERE staff_members.user_id = (SELECT auth.uid()) AND staff_members.is_active = true));

-- ═══ channel_rates ═══
DROP POLICY IF EXISTS "Staff can view channel rates" ON public.channel_rates;
DROP POLICY IF EXISTS "Staff can insert channel rates" ON public.channel_rates;
DROP POLICY IF EXISTS "Staff can update channel rates" ON public.channel_rates;

CREATE POLICY "Staff can view channel rates" ON public.channel_rates FOR SELECT TO authenticated
  USING (hotel_id IN (SELECT staff_members.hotel_id FROM staff_members WHERE staff_members.user_id = (SELECT auth.uid()) AND staff_members.is_active = true));
CREATE POLICY "Staff can insert channel rates" ON public.channel_rates FOR INSERT TO authenticated
  WITH CHECK (hotel_id IN (SELECT staff_members.hotel_id FROM staff_members WHERE staff_members.user_id = (SELECT auth.uid()) AND staff_members.is_active = true));
CREATE POLICY "Staff can update channel rates" ON public.channel_rates FOR UPDATE TO authenticated
  USING (hotel_id IN (SELECT staff_members.hotel_id FROM staff_members WHERE staff_members.user_id = (SELECT auth.uid()) AND staff_members.is_active = true))
  WITH CHECK (hotel_id IN (SELECT staff_members.hotel_id FROM staff_members WHERE staff_members.user_id = (SELECT auth.uid()) AND staff_members.is_active = true));

-- ═══ channel_sync_logs ═══
DROP POLICY IF EXISTS "Staff can view sync logs" ON public.channel_sync_logs;
DROP POLICY IF EXISTS "Staff can insert sync logs" ON public.channel_sync_logs;

CREATE POLICY "Staff can view sync logs" ON public.channel_sync_logs FOR SELECT TO authenticated
  USING (hotel_id IN (SELECT staff_members.hotel_id FROM staff_members WHERE staff_members.user_id = (SELECT auth.uid()) AND staff_members.is_active = true));
CREATE POLICY "Staff can insert sync logs" ON public.channel_sync_logs FOR INSERT TO authenticated
  WITH CHECK (hotel_id IN (SELECT staff_members.hotel_id FROM staff_members WHERE staff_members.user_id = (SELECT auth.uid()) AND staff_members.is_active = true));

-- ═══ booking_engine_config ═══
DROP POLICY IF EXISTS "Staff can view booking engine config" ON public.booking_engine_config;
DROP POLICY IF EXISTS "Staff can insert booking engine config" ON public.booking_engine_config;
DROP POLICY IF EXISTS "Staff can update booking engine config" ON public.booking_engine_config;

CREATE POLICY "Staff can view booking engine config" ON public.booking_engine_config FOR SELECT TO authenticated
  USING (hotel_id IN (SELECT staff_members.hotel_id FROM staff_members WHERE staff_members.user_id = (SELECT auth.uid()) AND staff_members.is_active = true));
CREATE POLICY "Staff can insert booking engine config" ON public.booking_engine_config FOR INSERT TO authenticated
  WITH CHECK (hotel_id IN (SELECT staff_members.hotel_id FROM staff_members WHERE staff_members.user_id = (SELECT auth.uid()) AND staff_members.is_active = true));
CREATE POLICY "Staff can update booking engine config" ON public.booking_engine_config FOR UPDATE TO authenticated
  USING (hotel_id IN (SELECT staff_members.hotel_id FROM staff_members WHERE staff_members.user_id = (SELECT auth.uid()) AND staff_members.is_active = true))
  WITH CHECK (hotel_id IN (SELECT staff_members.hotel_id FROM staff_members WHERE staff_members.user_id = (SELECT auth.uid()) AND staff_members.is_active = true));
