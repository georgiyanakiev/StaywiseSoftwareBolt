/*
  # Fix exposed auth.users view and SECURITY DEFINER views

  ## Problems
  1. `admin_users_view` exposes `auth.users` data to authenticated role
     and is defined as SECURITY DEFINER, bypassing the caller's permissions.

  2. `user_accessible_hotels` is also SECURITY DEFINER.

  ## Solution
  1. Replace `admin_users_view` with a version that does NOT use SECURITY DEFINER
     and instead relies on the caller's own RLS context. The view itself already
     filters to superadmin callers via the WHERE clause using auth.uid(), so the
     data is safe — we just need to remove SECURITY DEFINER so that the view
     executes in the caller's security context.

  2. Recreate `user_accessible_hotels` without SECURITY DEFINER for the same reason.

  Both views already embed auth.uid() checks, making them safe to run as the
  invoker (SECURITY INVOKER, which is the default).
*/

-- Drop and recreate admin_users_view WITHOUT security definer
DROP VIEW IF EXISTS public.admin_users_view;

CREATE VIEW public.admin_users_view
  WITH (security_invoker = true)
AS
  SELECT
    au.id,
    au.email,
    au.created_at,
    au.last_sign_in_at,
    sm.role,
    sm.hotel_id,
    sm.approval_status
  FROM auth.users au
  JOIN staff_members sm ON sm.user_id = au.id
  WHERE EXISTS (
    SELECT 1 FROM staff_members s
    WHERE s.user_id = (SELECT auth.uid())
      AND s.role = 'superadmin'
  );

-- Drop and recreate user_accessible_hotels WITHOUT security definer
DROP VIEW IF EXISTS public.user_accessible_hotels;

CREATE VIEW public.user_accessible_hotels
  WITH (security_invoker = true)
AS
  SELECT
    h.id,
    h.name,
    h.address,
    h.phone,
    h.email,
    h.tenant_id,
    sm.role,
    sm.user_id
  FROM hotels h
  JOIN staff_members sm ON sm.hotel_id = h.id
  WHERE sm.user_id = (SELECT auth.uid());

-- Revoke public/anon access to admin_users_view; only authenticated should query it
REVOKE ALL ON public.admin_users_view FROM anon;
GRANT SELECT ON public.admin_users_view TO authenticated;

REVOKE ALL ON public.user_accessible_hotels FROM anon;
GRANT SELECT ON public.user_accessible_hotels TO authenticated;
