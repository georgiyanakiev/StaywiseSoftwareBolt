/*
  # Fix staff_members infinite recursion

  ## Problem
  The INSERT, UPDATE, and SELECT policies on staff_members were using a self-referencing
  subquery where `sm.hotel_id = sm.hotel_id` (always true, and causes infinite recursion).
  The fix is to use a security-definer helper function that bypasses RLS when checking
  whether the current user is an admin for a given hotel — the same pattern used by the
  existing `is_hotel_admin` function already on this table.

  ## Solution
  1. Create (or replace) a helper function `get_user_hotel_role` that returns the role
     of the current user for a given hotel, bypassing RLS via SECURITY DEFINER.
  2. Recreate all staff_members policies to use this helper instead of a recursive
     self-join.
*/

-- Helper: returns the role of auth.uid() in the given hotel, or NULL if none
CREATE OR REPLACE FUNCTION public.get_user_hotel_role(p_hotel_id uuid)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT role FROM public.staff_members
  WHERE user_id = auth.uid()
    AND hotel_id = p_hotel_id
  LIMIT 1;
$$;

-- Helper: returns true if auth.uid() has ANY staff record for the hotel
CREATE OR REPLACE FUNCTION public.is_hotel_staff(p_hotel_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.staff_members
    WHERE user_id = auth.uid()
      AND hotel_id = p_hotel_id
  );
$$;

-- Recreate is_hotel_admin to ensure it is also correct and pinned
CREATE OR REPLACE FUNCTION public.is_hotel_admin(p_hotel_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.staff_members
    WHERE user_id = auth.uid()
      AND hotel_id = p_hotel_id
      AND role IN ('owner', 'manager', 'admin')
  );
$$;

-- ============================================================
-- Drop and recreate all staff_members policies
-- ============================================================
DROP POLICY IF EXISTS "Admins can insert staff members" ON public.staff_members;
DROP POLICY IF EXISTS "Admins can update staff members" ON public.staff_members;
DROP POLICY IF EXISTS "Admins can delete staff members" ON public.staff_members;
DROP POLICY IF EXISTS "Staff can update own record" ON public.staff_members;
DROP POLICY IF EXISTS "Staff can view own hotel staff" ON public.staff_members;

CREATE POLICY "Staff can view own hotel staff"
  ON public.staff_members FOR SELECT TO authenticated
  USING (is_hotel_staff(hotel_id));

CREATE POLICY "Admins can insert staff members"
  ON public.staff_members FOR INSERT TO authenticated
  WITH CHECK (is_hotel_admin(hotel_id));

CREATE POLICY "Admins can update staff members"
  ON public.staff_members FOR UPDATE TO authenticated
  USING (is_hotel_admin(hotel_id))
  WITH CHECK (is_hotel_admin(hotel_id));

CREATE POLICY "Admins can delete staff members"
  ON public.staff_members FOR DELETE TO authenticated
  USING (is_hotel_admin(hotel_id));

CREATE POLICY "Staff can update own record"
  ON public.staff_members FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);
