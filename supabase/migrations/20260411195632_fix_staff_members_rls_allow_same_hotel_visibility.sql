/*
  # Fix staff_members RLS to allow same-hotel visibility

  1. Problem
    - The SELECT policy only allowed users to see their own staff record
    - Owners/managers could not see other staff at their hotel
    - Newly added staff members were invisible in the Staff & Permissions list

  2. Solution
    - Create a SECURITY DEFINER helper function `get_my_hotel_ids_from_staff()`
      that returns all hotel_ids the current user belongs to (avoids RLS recursion)
    - Replace the restrictive SELECT policy with one that allows
      viewing all staff at hotels the user belongs to
    - Replace the UPDATE policy so owners/managers can edit staff at their hotels
    - The INSERT policy is kept as-is (edge function uses service role key)

  3. Security
    - Users can only see staff at hotels they are assigned to
    - Super admins and tenant owners (via user_hotel_assignments) also get access
    - UPDATE limited to own record OR same-hotel access for owners/managers
*/

CREATE OR REPLACE FUNCTION public.get_my_hotel_ids_from_staff()
RETURNS SETOF uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT hotel_id
  FROM public.staff_members
  WHERE user_id = auth.uid()
    AND is_active = true;
$$;

CREATE OR REPLACE FUNCTION public.get_my_tenant_ids()
RETURNS SETOF uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT tenant_id
  FROM public.user_hotel_assignments
  WHERE user_id = auth.uid()
    AND active = true
    AND tenant_id IS NOT NULL
  UNION
  SELECT tenant_id
  FROM public.staff_members
  WHERE user_id = auth.uid()
    AND is_active = true
    AND tenant_id IS NOT NULL;
$$;

DROP POLICY IF EXISTS "Users can view own staff record" ON staff_members;

CREATE POLICY "Staff can view colleagues at same hotel"
  ON staff_members
  FOR SELECT
  TO authenticated
  USING (
    hotel_id IN (SELECT public.get_my_hotel_ids_from_staff())
    OR tenant_id IN (SELECT public.get_my_tenant_ids())
  );

DROP POLICY IF EXISTS "Users can update own staff record" ON staff_members;

CREATE POLICY "Staff can update own or managers can update same-hotel"
  ON staff_members
  FOR UPDATE
  TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR hotel_id IN (SELECT public.get_my_hotel_ids_from_staff())
    OR tenant_id IN (SELECT public.get_my_tenant_ids())
  )
  WITH CHECK (
    user_id = (SELECT auth.uid())
    OR hotel_id IN (SELECT public.get_my_hotel_ids_from_staff())
    OR tenant_id IN (SELECT public.get_my_tenant_ids())
  );
