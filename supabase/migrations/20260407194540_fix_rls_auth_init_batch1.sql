/*
  # Fix Auth RLS Initialization Plan - Batch 1
  Tables: guest_profiles, guest_stay_history, invoice_line_items, payment_rules, role_permissions
  Replaces auth.uid() with (SELECT auth.uid()) to cache value per statement.
*/

-- ═══ guest_profiles ═══
DROP POLICY IF EXISTS "Staff can view hotel guest profiles" ON public.guest_profiles;
DROP POLICY IF EXISTS "Staff can insert hotel guest profiles" ON public.guest_profiles;
DROP POLICY IF EXISTS "Staff can update hotel guest profiles" ON public.guest_profiles;
DROP POLICY IF EXISTS "Staff can delete hotel guest profiles" ON public.guest_profiles;

CREATE POLICY "Staff can view hotel guest profiles" ON public.guest_profiles FOR SELECT TO authenticated
  USING (hotel_id IN (SELECT sm.hotel_id FROM staff_members sm WHERE sm.user_id = (SELECT auth.uid()) AND sm.is_active = true));
CREATE POLICY "Staff can insert hotel guest profiles" ON public.guest_profiles FOR INSERT TO authenticated
  WITH CHECK (hotel_id IN (SELECT sm.hotel_id FROM staff_members sm WHERE sm.user_id = (SELECT auth.uid()) AND sm.is_active = true));
CREATE POLICY "Staff can update hotel guest profiles" ON public.guest_profiles FOR UPDATE TO authenticated
  USING (hotel_id IN (SELECT sm.hotel_id FROM staff_members sm WHERE sm.user_id = (SELECT auth.uid()) AND sm.is_active = true))
  WITH CHECK (hotel_id IN (SELECT sm.hotel_id FROM staff_members sm WHERE sm.user_id = (SELECT auth.uid()) AND sm.is_active = true));
CREATE POLICY "Staff can delete hotel guest profiles" ON public.guest_profiles FOR DELETE TO authenticated
  USING (hotel_id IN (SELECT sm.hotel_id FROM staff_members sm WHERE sm.user_id = (SELECT auth.uid()) AND sm.is_active = true));

-- ═══ guest_stay_history ═══
DROP POLICY IF EXISTS "Staff can view hotel guest stay history" ON public.guest_stay_history;
DROP POLICY IF EXISTS "Staff can insert hotel guest stay history" ON public.guest_stay_history;
DROP POLICY IF EXISTS "Staff can update hotel guest stay history" ON public.guest_stay_history;
DROP POLICY IF EXISTS "Staff can delete hotel guest stay history" ON public.guest_stay_history;

CREATE POLICY "Staff can view hotel guest stay history" ON public.guest_stay_history FOR SELECT TO authenticated
  USING (hotel_id IN (SELECT sm.hotel_id FROM staff_members sm WHERE sm.user_id = (SELECT auth.uid()) AND sm.is_active = true));
CREATE POLICY "Staff can insert hotel guest stay history" ON public.guest_stay_history FOR INSERT TO authenticated
  WITH CHECK (hotel_id IN (SELECT sm.hotel_id FROM staff_members sm WHERE sm.user_id = (SELECT auth.uid()) AND sm.is_active = true));
CREATE POLICY "Staff can update hotel guest stay history" ON public.guest_stay_history FOR UPDATE TO authenticated
  USING (hotel_id IN (SELECT sm.hotel_id FROM staff_members sm WHERE sm.user_id = (SELECT auth.uid()) AND sm.is_active = true))
  WITH CHECK (hotel_id IN (SELECT sm.hotel_id FROM staff_members sm WHERE sm.user_id = (SELECT auth.uid()) AND sm.is_active = true));
CREATE POLICY "Staff can delete hotel guest stay history" ON public.guest_stay_history FOR DELETE TO authenticated
  USING (hotel_id IN (SELECT sm.hotel_id FROM staff_members sm WHERE sm.user_id = (SELECT auth.uid()) AND sm.is_active = true));

-- ═══ invoice_line_items ═══
DROP POLICY IF EXISTS "Staff can view invoice line items" ON public.invoice_line_items;
DROP POLICY IF EXISTS "Staff can insert invoice line items" ON public.invoice_line_items;
DROP POLICY IF EXISTS "Staff can update invoice line items" ON public.invoice_line_items;
DROP POLICY IF EXISTS "Staff can delete invoice line items" ON public.invoice_line_items;

CREATE POLICY "Staff can view invoice line items" ON public.invoice_line_items FOR SELECT TO authenticated
  USING (hotel_id IN (SELECT sm.hotel_id FROM staff_members sm WHERE sm.user_id = (SELECT auth.uid()) AND sm.is_active = true));
CREATE POLICY "Staff can insert invoice line items" ON public.invoice_line_items FOR INSERT TO authenticated
  WITH CHECK (hotel_id IN (SELECT sm.hotel_id FROM staff_members sm WHERE sm.user_id = (SELECT auth.uid()) AND sm.is_active = true));
CREATE POLICY "Staff can update invoice line items" ON public.invoice_line_items FOR UPDATE TO authenticated
  USING (hotel_id IN (SELECT sm.hotel_id FROM staff_members sm WHERE sm.user_id = (SELECT auth.uid()) AND sm.is_active = true))
  WITH CHECK (hotel_id IN (SELECT sm.hotel_id FROM staff_members sm WHERE sm.user_id = (SELECT auth.uid()) AND sm.is_active = true));
CREATE POLICY "Staff can delete invoice line items" ON public.invoice_line_items FOR DELETE TO authenticated
  USING (hotel_id IN (SELECT sm.hotel_id FROM staff_members sm WHERE sm.user_id = (SELECT auth.uid()) AND sm.is_active = true));

-- ═══ payment_rules ═══
DROP POLICY IF EXISTS "Staff can view hotel payment rules" ON public.payment_rules;
DROP POLICY IF EXISTS "Staff can insert hotel payment rules" ON public.payment_rules;
DROP POLICY IF EXISTS "Staff can update hotel payment rules" ON public.payment_rules;
DROP POLICY IF EXISTS "Staff can delete hotel payment rules" ON public.payment_rules;

CREATE POLICY "Staff can view hotel payment rules" ON public.payment_rules FOR SELECT TO authenticated
  USING (hotel_id IN (SELECT sm.hotel_id FROM staff_members sm WHERE sm.user_id = (SELECT auth.uid()) AND sm.is_active = true));
CREATE POLICY "Staff can insert hotel payment rules" ON public.payment_rules FOR INSERT TO authenticated
  WITH CHECK (hotel_id IN (SELECT sm.hotel_id FROM staff_members sm WHERE sm.user_id = (SELECT auth.uid()) AND sm.is_active = true));
CREATE POLICY "Staff can update hotel payment rules" ON public.payment_rules FOR UPDATE TO authenticated
  USING (hotel_id IN (SELECT sm.hotel_id FROM staff_members sm WHERE sm.user_id = (SELECT auth.uid()) AND sm.is_active = true))
  WITH CHECK (hotel_id IN (SELECT sm.hotel_id FROM staff_members sm WHERE sm.user_id = (SELECT auth.uid()) AND sm.is_active = true));
CREATE POLICY "Staff can delete hotel payment rules" ON public.payment_rules FOR DELETE TO authenticated
  USING (hotel_id IN (SELECT sm.hotel_id FROM staff_members sm WHERE sm.user_id = (SELECT auth.uid()) AND sm.is_active = true));

-- ═══ role_permissions ═══
DROP POLICY IF EXISTS "Staff can view permissions for their hotel" ON public.role_permissions;
DROP POLICY IF EXISTS "Owners and managers can insert permissions" ON public.role_permissions;
DROP POLICY IF EXISTS "Owners and managers can update permissions" ON public.role_permissions;
DROP POLICY IF EXISTS "Owners can delete permissions" ON public.role_permissions;

CREATE POLICY "Staff can view permissions for their hotel" ON public.role_permissions FOR SELECT TO authenticated
  USING (hotel_id IN (SELECT sm.hotel_id FROM staff_members sm WHERE sm.user_id = (SELECT auth.uid()) AND sm.is_active = true));
CREATE POLICY "Owners and managers can insert permissions" ON public.role_permissions FOR INSERT TO authenticated
  WITH CHECK (hotel_id IN (SELECT sm.hotel_id FROM staff_members sm WHERE sm.user_id = (SELECT auth.uid()) AND sm.role = ANY(ARRAY['owner','manager']) AND sm.is_active = true));
CREATE POLICY "Owners and managers can update permissions" ON public.role_permissions FOR UPDATE TO authenticated
  USING (hotel_id IN (SELECT sm.hotel_id FROM staff_members sm WHERE sm.user_id = (SELECT auth.uid()) AND sm.role = ANY(ARRAY['owner','manager']) AND sm.is_active = true))
  WITH CHECK (hotel_id IN (SELECT sm.hotel_id FROM staff_members sm WHERE sm.user_id = (SELECT auth.uid()) AND sm.role = ANY(ARRAY['owner','manager']) AND sm.is_active = true));
CREATE POLICY "Owners can delete permissions" ON public.role_permissions FOR DELETE TO authenticated
  USING (hotel_id IN (SELECT sm.hotel_id FROM staff_members sm WHERE sm.user_id = (SELECT auth.uid()) AND sm.role = 'owner' AND sm.is_active = true));
