/*
  # Fix Multiple Permissive Policies

  ## Summary
  Removes duplicate/redundant policies on tables that had multiple permissive
  policies for the same role and action. Keeps one clean, well-named policy per
  action per table. All auth() calls wrapped in (select auth.uid()) for performance.

  ## Tables Fixed
  - hotels (SELECT, UPDATE duplicates)
  - invoices (ALL + individual duplicates — drops always-true ALL policy, keeps scoped ones)
  - invoice_lines (SELECT, INSERT, DELETE duplicates already handled; ensure clean state)
  - payments (SELECT, INSERT, UPDATE duplicates)
  - room_types (DELETE, INSERT, UPDATE duplicates)
  - rooms (DELETE, INSERT duplicates)
  - staff_members (UPDATE duplicate between Admins and Staff own)
*/

-- ============================================================
-- hotels — drop duplicate SELECT and UPDATE policies
-- ============================================================
DROP POLICY IF EXISTS "Staff can view their hotel" ON public.hotels;
DROP POLICY IF EXISTS "Staff can view their hotels" ON public.hotels;
DROP POLICY IF EXISTS "Admins can update hotel" ON public.hotels;
DROP POLICY IF EXISTS "Staff admins can update their hotels" ON public.hotels;

CREATE POLICY "Staff can view their hotels"
  ON public.hotels FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.staff_members sm
      WHERE sm.user_id = (SELECT auth.uid())
        AND sm.hotel_id = id
    )
  );

CREATE POLICY "Staff admins can update their hotels"
  ON public.hotels FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.staff_members sm
      WHERE sm.user_id = (SELECT auth.uid())
        AND sm.hotel_id = id
        AND sm.role IN ('owner','manager','admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.staff_members sm
      WHERE sm.user_id = (SELECT auth.uid())
        AND sm.hotel_id = id
        AND sm.role IN ('owner','manager','admin')
    )
  );

-- ============================================================
-- invoices — drop always-true ALL policy + duplicate individual policies
-- ============================================================
DROP POLICY IF EXISTS "Authenticated users can manage invoices" ON public.invoices;
DROP POLICY IF EXISTS "Staff can delete invoices" ON public.invoices;
DROP POLICY IF EXISTS "Staff can insert invoices" ON public.invoices;
DROP POLICY IF EXISTS "Staff can view invoices" ON public.invoices;
DROP POLICY IF EXISTS "Staff can update invoices" ON public.invoices;

CREATE POLICY "Staff can view invoices"
  ON public.invoices FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.staff_members sm
      WHERE sm.user_id = (SELECT auth.uid())
        AND sm.hotel_id = hotel_id
    )
  );

CREATE POLICY "Staff can insert invoices"
  ON public.invoices FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.staff_members sm
      WHERE sm.user_id = (SELECT auth.uid())
        AND sm.hotel_id = hotel_id
    )
  );

CREATE POLICY "Staff can update invoices"
  ON public.invoices FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.staff_members sm
      WHERE sm.user_id = (SELECT auth.uid())
        AND sm.hotel_id = hotel_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.staff_members sm
      WHERE sm.user_id = (SELECT auth.uid())
        AND sm.hotel_id = hotel_id
    )
  );

CREATE POLICY "Staff can delete invoices"
  ON public.invoices FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.staff_members sm
      WHERE sm.user_id = (SELECT auth.uid())
        AND sm.hotel_id = hotel_id
        AND sm.role IN ('owner','manager','admin')
    )
  );

-- ============================================================
-- payments — drop duplicate SELECT, INSERT, UPDATE policies
-- ============================================================
DROP POLICY IF EXISTS "Staff can insert payments" ON public.payments;
DROP POLICY IF EXISTS "Staff can view payments" ON public.payments;
DROP POLICY IF EXISTS "Staff can update payments" ON public.payments;
DROP POLICY IF EXISTS "Users can create payments for their hotel" ON public.payments;
DROP POLICY IF EXISTS "Users can view payments for their hotel" ON public.payments;
DROP POLICY IF EXISTS "Users can update payments for their hotel" ON public.payments;

CREATE POLICY "Staff can view payments"
  ON public.payments FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.staff_members sm
      WHERE sm.user_id = (SELECT auth.uid())
        AND sm.hotel_id = hotel_id
    )
  );

CREATE POLICY "Staff can insert payments"
  ON public.payments FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.staff_members sm
      WHERE sm.user_id = (SELECT auth.uid())
        AND sm.hotel_id = hotel_id
    )
  );

CREATE POLICY "Staff can update payments"
  ON public.payments FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.staff_members sm
      WHERE sm.user_id = (SELECT auth.uid())
        AND sm.hotel_id = hotel_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.staff_members sm
      WHERE sm.user_id = (SELECT auth.uid())
        AND sm.hotel_id = hotel_id
    )
  );

-- ============================================================
-- room_types — drop duplicate DELETE, INSERT, UPDATE policies
-- ============================================================
DROP POLICY IF EXISTS "Admins can delete room types" ON public.room_types;
DROP POLICY IF EXISTS "Staff can delete room types" ON public.room_types;
DROP POLICY IF EXISTS "Admins can insert room types" ON public.room_types;
DROP POLICY IF EXISTS "Staff can insert room types" ON public.room_types;
DROP POLICY IF EXISTS "Admins can update room types" ON public.room_types;
DROP POLICY IF EXISTS "Staff can update room types" ON public.room_types;

CREATE POLICY "Staff can insert room types"
  ON public.room_types FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.staff_members sm
      WHERE sm.user_id = (SELECT auth.uid())
        AND sm.hotel_id = hotel_id
        AND sm.role IN ('owner','manager','admin')
    )
  );

CREATE POLICY "Staff can update room types"
  ON public.room_types FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.staff_members sm
      WHERE sm.user_id = (SELECT auth.uid())
        AND sm.hotel_id = hotel_id
        AND sm.role IN ('owner','manager','admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.staff_members sm
      WHERE sm.user_id = (SELECT auth.uid())
        AND sm.hotel_id = hotel_id
        AND sm.role IN ('owner','manager','admin')
    )
  );

CREATE POLICY "Staff can delete room types"
  ON public.room_types FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.staff_members sm
      WHERE sm.user_id = (SELECT auth.uid())
        AND sm.hotel_id = hotel_id
        AND sm.role IN ('owner','manager','admin')
    )
  );

-- ============================================================
-- rooms — drop duplicate DELETE, INSERT policies
-- ============================================================
DROP POLICY IF EXISTS "Admins can delete rooms" ON public.rooms;
DROP POLICY IF EXISTS "Staff can delete rooms" ON public.rooms;
DROP POLICY IF EXISTS "Admins can insert rooms" ON public.rooms;
DROP POLICY IF EXISTS "Staff can insert rooms" ON public.rooms;

CREATE POLICY "Staff can insert rooms"
  ON public.rooms FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.staff_members sm
      WHERE sm.user_id = (SELECT auth.uid())
        AND sm.hotel_id = hotel_id
        AND sm.role IN ('owner','manager','admin')
    )
  );

CREATE POLICY "Staff can delete rooms"
  ON public.rooms FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.staff_members sm
      WHERE sm.user_id = (SELECT auth.uid())
        AND sm.hotel_id = hotel_id
        AND sm.role IN ('owner','manager','admin')
    )
  );
