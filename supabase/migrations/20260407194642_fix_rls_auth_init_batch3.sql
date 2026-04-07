/*
  # Fix Auth RLS Initialization Plan - Batch 3
  Tables: direct_bookings, pricing_rules, ai_price_suggestions, competitor_rates,
          upsell_items, upsell_orders, property_owners, owner_properties,
          owner_statements, invoice_settings, invoice_audit_log, payment_audit_log
*/

-- ═══ direct_bookings ═══
DROP POLICY IF EXISTS "Staff can view direct bookings" ON public.direct_bookings;
DROP POLICY IF EXISTS "Staff can update direct bookings" ON public.direct_bookings;

CREATE POLICY "Staff can view direct bookings" ON public.direct_bookings FOR SELECT TO authenticated
  USING (hotel_id IN (SELECT staff_members.hotel_id FROM staff_members WHERE staff_members.user_id = (SELECT auth.uid()) AND staff_members.is_active = true));
CREATE POLICY "Staff can update direct bookings" ON public.direct_bookings FOR UPDATE TO authenticated
  USING (hotel_id IN (SELECT staff_members.hotel_id FROM staff_members WHERE staff_members.user_id = (SELECT auth.uid()) AND staff_members.is_active = true))
  WITH CHECK (hotel_id IN (SELECT staff_members.hotel_id FROM staff_members WHERE staff_members.user_id = (SELECT auth.uid()) AND staff_members.is_active = true));

-- ═══ pricing_rules ═══
DROP POLICY IF EXISTS "Staff can view pricing rules" ON public.pricing_rules;
DROP POLICY IF EXISTS "Managers can manage pricing rules" ON public.pricing_rules;
DROP POLICY IF EXISTS "Managers can update pricing rules" ON public.pricing_rules;
DROP POLICY IF EXISTS "Managers can delete pricing rules" ON public.pricing_rules;

CREATE POLICY "Staff can view pricing rules" ON public.pricing_rules FOR SELECT TO authenticated
  USING (hotel_id IN (SELECT staff_members.hotel_id FROM staff_members WHERE staff_members.user_id = (SELECT auth.uid()) AND staff_members.is_active = true));
CREATE POLICY "Managers can manage pricing rules" ON public.pricing_rules FOR INSERT TO authenticated
  WITH CHECK (hotel_id IN (SELECT staff_members.hotel_id FROM staff_members WHERE staff_members.user_id = (SELECT auth.uid()) AND staff_members.is_active = true));
CREATE POLICY "Managers can update pricing rules" ON public.pricing_rules FOR UPDATE TO authenticated
  USING (hotel_id IN (SELECT staff_members.hotel_id FROM staff_members WHERE staff_members.user_id = (SELECT auth.uid()) AND staff_members.is_active = true))
  WITH CHECK (hotel_id IN (SELECT staff_members.hotel_id FROM staff_members WHERE staff_members.user_id = (SELECT auth.uid()) AND staff_members.is_active = true));
CREATE POLICY "Managers can delete pricing rules" ON public.pricing_rules FOR DELETE TO authenticated
  USING (hotel_id IN (SELECT staff_members.hotel_id FROM staff_members WHERE staff_members.user_id = (SELECT auth.uid()) AND staff_members.is_active = true));

-- ═══ ai_price_suggestions ═══
DROP POLICY IF EXISTS "Staff can view AI suggestions" ON public.ai_price_suggestions;
DROP POLICY IF EXISTS "Staff can manage AI suggestions" ON public.ai_price_suggestions;
DROP POLICY IF EXISTS "Staff can update AI suggestions" ON public.ai_price_suggestions;

CREATE POLICY "Staff can view AI suggestions" ON public.ai_price_suggestions FOR SELECT TO authenticated
  USING (hotel_id IN (SELECT staff_members.hotel_id FROM staff_members WHERE staff_members.user_id = (SELECT auth.uid()) AND staff_members.is_active = true));
CREATE POLICY "Staff can manage AI suggestions" ON public.ai_price_suggestions FOR INSERT TO authenticated
  WITH CHECK (hotel_id IN (SELECT staff_members.hotel_id FROM staff_members WHERE staff_members.user_id = (SELECT auth.uid()) AND staff_members.is_active = true));
CREATE POLICY "Staff can update AI suggestions" ON public.ai_price_suggestions FOR UPDATE TO authenticated
  USING (hotel_id IN (SELECT staff_members.hotel_id FROM staff_members WHERE staff_members.user_id = (SELECT auth.uid()) AND staff_members.is_active = true))
  WITH CHECK (hotel_id IN (SELECT staff_members.hotel_id FROM staff_members WHERE staff_members.user_id = (SELECT auth.uid()) AND staff_members.is_active = true));

-- ═══ competitor_rates ═══
DROP POLICY IF EXISTS "Staff can view competitor rates" ON public.competitor_rates;
DROP POLICY IF EXISTS "Staff can manage competitor rates" ON public.competitor_rates;
DROP POLICY IF EXISTS "Staff can delete competitor rates" ON public.competitor_rates;

CREATE POLICY "Staff can view competitor rates" ON public.competitor_rates FOR SELECT TO authenticated
  USING (hotel_id IN (SELECT staff_members.hotel_id FROM staff_members WHERE staff_members.user_id = (SELECT auth.uid()) AND staff_members.is_active = true));
CREATE POLICY "Staff can manage competitor rates" ON public.competitor_rates FOR INSERT TO authenticated
  WITH CHECK (hotel_id IN (SELECT staff_members.hotel_id FROM staff_members WHERE staff_members.user_id = (SELECT auth.uid()) AND staff_members.is_active = true));
CREATE POLICY "Staff can delete competitor rates" ON public.competitor_rates FOR DELETE TO authenticated
  USING (hotel_id IN (SELECT staff_members.hotel_id FROM staff_members WHERE staff_members.user_id = (SELECT auth.uid()) AND staff_members.is_active = true));

-- ═══ upsell_items ═══
DROP POLICY IF EXISTS "Staff can view upsell items" ON public.upsell_items;
DROP POLICY IF EXISTS "Managers can insert upsell items" ON public.upsell_items;
DROP POLICY IF EXISTS "Managers can update upsell items" ON public.upsell_items;
DROP POLICY IF EXISTS "Managers can delete upsell items" ON public.upsell_items;

CREATE POLICY "Staff can view upsell items" ON public.upsell_items FOR SELECT TO authenticated
  USING (hotel_id IN (SELECT staff_members.hotel_id FROM staff_members WHERE staff_members.user_id = (SELECT auth.uid()) AND staff_members.is_active = true));
CREATE POLICY "Managers can insert upsell items" ON public.upsell_items FOR INSERT TO authenticated
  WITH CHECK (hotel_id IN (SELECT staff_members.hotel_id FROM staff_members WHERE staff_members.user_id = (SELECT auth.uid()) AND staff_members.is_active = true));
CREATE POLICY "Managers can update upsell items" ON public.upsell_items FOR UPDATE TO authenticated
  USING (hotel_id IN (SELECT staff_members.hotel_id FROM staff_members WHERE staff_members.user_id = (SELECT auth.uid()) AND staff_members.is_active = true))
  WITH CHECK (hotel_id IN (SELECT staff_members.hotel_id FROM staff_members WHERE staff_members.user_id = (SELECT auth.uid()) AND staff_members.is_active = true));
CREATE POLICY "Managers can delete upsell items" ON public.upsell_items FOR DELETE TO authenticated
  USING (hotel_id IN (SELECT staff_members.hotel_id FROM staff_members WHERE staff_members.user_id = (SELECT auth.uid()) AND staff_members.is_active = true));

-- ═══ upsell_orders ═══
DROP POLICY IF EXISTS "Staff can view upsell orders" ON public.upsell_orders;
DROP POLICY IF EXISTS "Staff can insert upsell orders" ON public.upsell_orders;
DROP POLICY IF EXISTS "Staff can update upsell orders" ON public.upsell_orders;
DROP POLICY IF EXISTS "Managers can delete upsell orders" ON public.upsell_orders;

CREATE POLICY "Staff can view upsell orders" ON public.upsell_orders FOR SELECT TO authenticated
  USING (hotel_id IN (SELECT staff_members.hotel_id FROM staff_members WHERE staff_members.user_id = (SELECT auth.uid()) AND staff_members.is_active = true));
CREATE POLICY "Staff can insert upsell orders" ON public.upsell_orders FOR INSERT TO authenticated
  WITH CHECK (hotel_id IN (SELECT staff_members.hotel_id FROM staff_members WHERE staff_members.user_id = (SELECT auth.uid()) AND staff_members.is_active = true));
CREATE POLICY "Staff can update upsell orders" ON public.upsell_orders FOR UPDATE TO authenticated
  USING (hotel_id IN (SELECT staff_members.hotel_id FROM staff_members WHERE staff_members.user_id = (SELECT auth.uid()) AND staff_members.is_active = true))
  WITH CHECK (hotel_id IN (SELECT staff_members.hotel_id FROM staff_members WHERE staff_members.user_id = (SELECT auth.uid()) AND staff_members.is_active = true));
CREATE POLICY "Managers can delete upsell orders" ON public.upsell_orders FOR DELETE TO authenticated
  USING (hotel_id IN (SELECT staff_members.hotel_id FROM staff_members WHERE staff_members.user_id = (SELECT auth.uid()) AND staff_members.is_active = true));

-- ═══ property_owners ═══
DROP POLICY IF EXISTS "Staff can view property owners" ON public.property_owners;
DROP POLICY IF EXISTS "Managers can insert property owners" ON public.property_owners;
DROP POLICY IF EXISTS "Managers can update property owners" ON public.property_owners;
DROP POLICY IF EXISTS "Managers can delete property owners" ON public.property_owners;

CREATE POLICY "Staff can view property owners" ON public.property_owners FOR SELECT TO authenticated
  USING (
    hotel_id IN (SELECT staff_members.hotel_id FROM staff_members WHERE staff_members.user_id = (SELECT auth.uid()) AND staff_members.is_active = true)
    OR user_id = (SELECT auth.uid())
  );
CREATE POLICY "Managers can insert property owners" ON public.property_owners FOR INSERT TO authenticated
  WITH CHECK (hotel_id IN (SELECT staff_members.hotel_id FROM staff_members WHERE staff_members.user_id = (SELECT auth.uid()) AND staff_members.is_active = true));
CREATE POLICY "Managers can update property owners" ON public.property_owners FOR UPDATE TO authenticated
  USING (hotel_id IN (SELECT staff_members.hotel_id FROM staff_members WHERE staff_members.user_id = (SELECT auth.uid()) AND staff_members.is_active = true))
  WITH CHECK (hotel_id IN (SELECT staff_members.hotel_id FROM staff_members WHERE staff_members.user_id = (SELECT auth.uid()) AND staff_members.is_active = true));
CREATE POLICY "Managers can delete property owners" ON public.property_owners FOR DELETE TO authenticated
  USING (hotel_id IN (SELECT staff_members.hotel_id FROM staff_members WHERE staff_members.user_id = (SELECT auth.uid()) AND staff_members.is_active = true));

-- ═══ owner_properties ═══
DROP POLICY IF EXISTS "Staff can view owner properties" ON public.owner_properties;
DROP POLICY IF EXISTS "Managers can insert owner properties" ON public.owner_properties;
DROP POLICY IF EXISTS "Managers can update owner properties" ON public.owner_properties;

CREATE POLICY "Staff can view owner properties" ON public.owner_properties FOR SELECT TO authenticated
  USING (
    hotel_id IN (SELECT staff_members.hotel_id FROM staff_members WHERE staff_members.user_id = (SELECT auth.uid()) AND staff_members.is_active = true)
    OR owner_id IN (SELECT po.id FROM property_owners po WHERE po.user_id = (SELECT auth.uid()))
  );
CREATE POLICY "Managers can insert owner properties" ON public.owner_properties FOR INSERT TO authenticated
  WITH CHECK (hotel_id IN (SELECT staff_members.hotel_id FROM staff_members WHERE staff_members.user_id = (SELECT auth.uid()) AND staff_members.is_active = true));
CREATE POLICY "Managers can update owner properties" ON public.owner_properties FOR UPDATE TO authenticated
  USING (hotel_id IN (SELECT staff_members.hotel_id FROM staff_members WHERE staff_members.user_id = (SELECT auth.uid()) AND staff_members.is_active = true))
  WITH CHECK (hotel_id IN (SELECT staff_members.hotel_id FROM staff_members WHERE staff_members.user_id = (SELECT auth.uid()) AND staff_members.is_active = true));

-- ═══ owner_statements ═══
DROP POLICY IF EXISTS "Staff can view owner statements" ON public.owner_statements;
DROP POLICY IF EXISTS "Managers can insert owner statements" ON public.owner_statements;
DROP POLICY IF EXISTS "Managers can update owner statements" ON public.owner_statements;

CREATE POLICY "Staff can view owner statements" ON public.owner_statements FOR SELECT TO authenticated
  USING (
    hotel_id IN (SELECT staff_members.hotel_id FROM staff_members WHERE staff_members.user_id = (SELECT auth.uid()) AND staff_members.is_active = true)
    OR owner_id IN (SELECT po.id FROM property_owners po WHERE po.user_id = (SELECT auth.uid()))
  );
CREATE POLICY "Managers can insert owner statements" ON public.owner_statements FOR INSERT TO authenticated
  WITH CHECK (hotel_id IN (SELECT staff_members.hotel_id FROM staff_members WHERE staff_members.user_id = (SELECT auth.uid()) AND staff_members.is_active = true));
CREATE POLICY "Managers can update owner statements" ON public.owner_statements FOR UPDATE TO authenticated
  USING (hotel_id IN (SELECT staff_members.hotel_id FROM staff_members WHERE staff_members.user_id = (SELECT auth.uid()) AND staff_members.is_active = true))
  WITH CHECK (hotel_id IN (SELECT staff_members.hotel_id FROM staff_members WHERE staff_members.user_id = (SELECT auth.uid()) AND staff_members.is_active = true));

-- ═══ invoice_settings ═══
DROP POLICY IF EXISTS "Staff can view invoice settings" ON public.invoice_settings;
DROP POLICY IF EXISTS "Staff can insert invoice settings" ON public.invoice_settings;
DROP POLICY IF EXISTS "Staff can update invoice settings" ON public.invoice_settings;

CREATE POLICY "Staff can view invoice settings" ON public.invoice_settings FOR SELECT TO authenticated
  USING (hotel_id IN (SELECT staff_members.hotel_id FROM staff_members WHERE staff_members.user_id = (SELECT auth.uid()) AND staff_members.is_active = true));
CREATE POLICY "Staff can insert invoice settings" ON public.invoice_settings FOR INSERT TO authenticated
  WITH CHECK (hotel_id IN (SELECT staff_members.hotel_id FROM staff_members WHERE staff_members.user_id = (SELECT auth.uid()) AND staff_members.is_active = true));
CREATE POLICY "Staff can update invoice settings" ON public.invoice_settings FOR UPDATE TO authenticated
  USING (hotel_id IN (SELECT staff_members.hotel_id FROM staff_members WHERE staff_members.user_id = (SELECT auth.uid()) AND staff_members.is_active = true))
  WITH CHECK (hotel_id IN (SELECT staff_members.hotel_id FROM staff_members WHERE staff_members.user_id = (SELECT auth.uid()) AND staff_members.is_active = true));

-- ═══ invoice_audit_log ═══
DROP POLICY IF EXISTS "Hotel staff can view invoice audit log" ON public.invoice_audit_log;

CREATE POLICY "Hotel staff can view invoice audit log" ON public.invoice_audit_log FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM staff_members
    WHERE staff_members.hotel_id = invoice_audit_log.hotel_id
      AND staff_members.user_id = (SELECT auth.uid())
      AND staff_members.is_active = true
  ));

-- ═══ payment_audit_log ═══
DROP POLICY IF EXISTS "Hotel staff can view payment audit log" ON public.payment_audit_log;

CREATE POLICY "Hotel staff can view payment audit log" ON public.payment_audit_log FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM staff_members
    WHERE staff_members.hotel_id = payment_audit_log.hotel_id
      AND staff_members.user_id = (SELECT auth.uid())
      AND staff_members.is_active = true
  ));
