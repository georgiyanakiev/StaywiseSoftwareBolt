/*
# Add admin_get_user_assignments RPC

The Super Admin "Staff & Assignments" panel fetches a user's hotel assignments
via the regular Supabase client, which is subject to RLS. This can hide some
assignment rows from a super admin, causing the badge count (from the
admin-list-users edge function, which uses the service role) to differ from
the toggle detail view. This SECURITY DEFINER RPC lets a super admin fetch
all assignments for any user, bypassing RLS with a proper auth check.
*/

CREATE OR REPLACE FUNCTION public.admin_get_user_assignments(p_user_id uuid)
RETURNS SETOF user_hotel_assignments
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_is_super_admin boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM user_hotel_assignments
    WHERE user_id = auth.uid()
      AND role = 'super_admin'
      AND tenant_id IS NULL
      AND active = true
  ) INTO v_is_super_admin;

  IF NOT v_is_super_admin THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  RETURN QUERY
  SELECT * FROM user_hotel_assignments
  WHERE user_id = p_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_get_user_assignments(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.admin_get_user_assignments(uuid) TO authenticated;
