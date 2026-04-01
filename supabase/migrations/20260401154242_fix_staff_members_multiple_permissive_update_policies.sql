/*
  # Fix multiple permissive UPDATE policies on staff_members

  ## Problem
  staff_members has two permissive UPDATE policies for the `authenticated` role:
  - "Admins can update staff members"
  - "Staff can update own record"

  Multiple permissive policies are OR-ed together, meaning either condition
  grants access. This is the intended logic, but Postgres/Supabase warns about
  it because it can lead to surprising behaviour. The clean fix is to merge
  them into a single policy with an explicit OR condition.

  ## Solution
  Drop both UPDATE policies and replace with one policy that allows update
  when the user is either an admin for that hotel OR is updating their own record.
*/

DROP POLICY IF EXISTS "Admins can update staff members" ON public.staff_members;
DROP POLICY IF EXISTS "Staff can update own record" ON public.staff_members;

CREATE POLICY "Admins or own record can update staff members"
  ON public.staff_members FOR UPDATE TO authenticated
  USING (
    is_hotel_admin(hotel_id)
    OR (SELECT auth.uid()) = user_id
  )
  WITH CHECK (
    is_hotel_admin(hotel_id)
    OR (SELECT auth.uid()) = user_id
  );
