/*
  # Create admin_list_all_tenants RPC for Super Admin page

  ## Why
  The Super Admin panel fetches tenants via a normal `SELECT *` which goes
  through multiple permissive RLS policies. In some auth-initialization
  edge cases, the `is_super_admin()` helper may not resolve immediately,
  causing only the "anon can read active tenants" policy to apply on the
  first request — returning only active rows or stale data for the stats.

  ## Change
  Create a SECURITY DEFINER function that:
  1. Verifies the caller is a super admin (via private.is_super_admin())
  2. Returns ALL tenants (active and inactive) with staff counts
  3. Bypasses RLS to ensure consistent, complete data

  ## Security
  - Only callable by authenticated users who pass is_super_admin() check
  - SECURITY DEFINER so it can read all tenant rows regardless of RLS
  - search_path locked to 'public'
*/

CREATE OR REPLACE FUNCTION public.admin_list_all_tenants()
RETURNS TABLE(
  id uuid,
  name text,
  subdomain text,
  custom_domain text,
  logo_url text,
  primary_color text,
  secondary_color text,
  plan text,
  active boolean,
  owner_email text,
  stripe_customer_id text,
  created_at timestamptz,
  staff_count bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT private.is_super_admin() THEN
    RAISE EXCEPTION 'Access denied: super admin role required';
  END IF;

  RETURN QUERY
  SELECT
    t.id,
    t.name,
    t.subdomain,
    t.custom_domain,
    t.logo_url,
    t.primary_color,
    t.secondary_color,
    t.plan,
    t.active,
    t.owner_email,
    t.stripe_customer_id,
    t.created_at,
    COALESCE(sc.cnt, 0) AS staff_count
  FROM public.tenants t
  LEFT JOIN (
    SELECT sm.tenant_id, count(*) AS cnt
    FROM public.staff_members sm
    WHERE sm.is_active = true
    GROUP BY sm.tenant_id
  ) sc ON sc.tenant_id = t.id
  ORDER BY t.created_at DESC;
END;
$function$;
