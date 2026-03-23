/*
  # Fix Security and Performance Issues

  1. Performance Fixes
    - Add covering index on `payments.reservation_id` (unindexed foreign key)
    - Drop unused indexes: idx_rooms_status, idx_guests_email, idx_reservations_status,
      idx_activity_log_hotel_id, idx_payments_payment_date

  2. RLS Optimization (Auth Initialization Plan)
    - Rewrite `staff_members` policies to use `(select auth.uid())` instead of `auth.uid()`
      so the value is computed once per query, not once per row

  3. Function Security
    - Add `SET search_path = public` to `is_hotel_admin` and `is_hotel_staff` to prevent
      search_path injection attacks

  4. RLS Policy Correctness
    - Fix `payments` INSERT policy: was always-true (WITH CHECK = true), now requires
      the payment's hotel_id to be a hotel the user belongs to
    - Fix `payments` UPDATE policy: was always-true (USING/WITH CHECK = true), now requires
      hotel membership
    - Fix `payments` SELECT policy: was always-true (USING = true), now requires
      hotel membership
*/

-- 1. Add missing index on payments.reservation_id
CREATE INDEX IF NOT EXISTS idx_payments_reservation_id ON public.payments (reservation_id);

-- 2. Drop unused indexes
DROP INDEX IF EXISTS public.idx_rooms_status;
DROP INDEX IF EXISTS public.idx_guests_email;
DROP INDEX IF EXISTS public.idx_reservations_status;
DROP INDEX IF EXISTS public.idx_activity_log_hotel_id;
DROP INDEX IF EXISTS public.idx_payments_payment_date;

-- 3. Fix function search_path mutable vulnerabilities
CREATE OR REPLACE FUNCTION public.is_hotel_admin(p_hotel_id uuid)
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path = public
AS $$
SELECT EXISTS (
  SELECT 1 FROM staff_members
  WHERE hotel_id = p_hotel_id
  AND user_id = (SELECT auth.uid())
  AND role = 'admin'
  AND is_active = true
);
$$;

CREATE OR REPLACE FUNCTION public.is_hotel_staff(p_hotel_id uuid)
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path = public
AS $$
SELECT EXISTS (
  SELECT 1 FROM staff_members
  WHERE hotel_id = p_hotel_id
  AND user_id = (SELECT auth.uid())
  AND is_active = true
);
$$;

-- 4. Fix staff_members RLS policies: replace auth.uid() with (select auth.uid())
DROP POLICY IF EXISTS "Staff can view own hotel staff" ON public.staff_members;
DROP POLICY IF EXISTS "Admins can insert staff members" ON public.staff_members;
DROP POLICY IF EXISTS "Admins can update staff members" ON public.staff_members;

CREATE POLICY "Staff can view own hotel staff"
  ON public.staff_members
  FOR SELECT
  TO authenticated
  USING (
    (user_id = (SELECT auth.uid())) OR is_hotel_staff(hotel_id)
  );

CREATE POLICY "Admins can insert staff members"
  ON public.staff_members
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (user_id = (SELECT auth.uid())) OR is_hotel_admin(hotel_id)
  );

CREATE POLICY "Admins can update staff members"
  ON public.staff_members
  FOR UPDATE
  TO authenticated
  USING (
    (user_id = (SELECT auth.uid())) OR is_hotel_admin(hotel_id)
  )
  WITH CHECK (
    (user_id = (SELECT auth.uid())) OR is_hotel_admin(hotel_id)
  );

-- 5. Fix payments RLS policies (always-true bypasses)
DROP POLICY IF EXISTS "Users can view payments for their hotel" ON public.payments;
DROP POLICY IF EXISTS "Users can create payments for their hotel" ON public.payments;
DROP POLICY IF EXISTS "Users can update payments for their hotel" ON public.payments;

CREATE POLICY "Users can view payments for their hotel"
  ON public.payments
  FOR SELECT
  TO authenticated
  USING (
    is_hotel_staff(hotel_id)
  );

CREATE POLICY "Users can create payments for their hotel"
  ON public.payments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    is_hotel_staff(hotel_id)
  );

CREATE POLICY "Users can update payments for their hotel"
  ON public.payments
  FOR UPDATE
  TO authenticated
  USING (
    is_hotel_staff(hotel_id)
  )
  WITH CHECK (
    is_hotel_staff(hotel_id)
  );
