/*
  # Fix channel_catalog RLS, Security Definer Views, and Function Search Path

  ## Summary
  1. Enables RLS on `channel_catalog` and adds a policy allowing any authenticated
     user to read the catalog (it contains public channel metadata, not tenant data).
  2. Recreates `user_accessible_hotels` without SECURITY DEFINER — it only references
     the current user's own staff_members rows so it's safe as SECURITY INVOKER.
  3. Recreates `admin_users_view` without SECURITY DEFINER — restricts it to
     superadmin-role callers via the view's own WHERE clause.
  4. Fixes `set_tenant_context` function to pin the search_path so it cannot be
     hijacked by a mutable search_path.
*/

-- ============================================================
-- 1. Enable RLS on channel_catalog (public read-only catalog data)
-- ============================================================
ALTER TABLE public.channel_catalog ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view channel catalog"
  ON public.channel_catalog FOR SELECT TO authenticated
  USING (true);

-- ============================================================
-- 2. Fix user_accessible_hotels — drop SECURITY DEFINER
-- ============================================================
DROP VIEW IF EXISTS public.user_accessible_hotels;

CREATE VIEW public.user_accessible_hotels AS
SELECT
  h.id,
  h.name,
  h.address,
  h.phone,
  h.email,
  h.tenant_id,
  sm.role,
  sm.user_id
FROM public.hotels h
JOIN public.staff_members sm ON sm.hotel_id = h.id
WHERE sm.user_id = (SELECT auth.uid());

-- ============================================================
-- 3. Fix admin_users_view — drop SECURITY DEFINER
--    Only accessible to superadmin (checked in the view itself)
-- ============================================================
DROP VIEW IF EXISTS public.admin_users_view;

CREATE VIEW public.admin_users_view AS
SELECT
  au.id,
  au.email,
  au.created_at,
  au.last_sign_in_at,
  sm.role,
  sm.hotel_id,
  sm.approval_status
FROM auth.users au
JOIN public.staff_members sm ON sm.user_id = au.id
WHERE EXISTS (
  SELECT 1 FROM public.staff_members s
  WHERE s.user_id = (SELECT auth.uid())
    AND s.role = 'superadmin'
);

-- ============================================================
-- 4. Fix set_tenant_context — lock down search_path
-- ============================================================
CREATE OR REPLACE FUNCTION public.set_tenant_context(p_tenant_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  PERFORM set_config('app.current_tenant_id', p_tenant_id::text, true);
END;
$$;
