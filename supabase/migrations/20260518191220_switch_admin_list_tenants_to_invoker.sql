/*
  # Switch admin_list_all_tenants to SECURITY INVOKER

  ## Why
  The security scanner flags any SECURITY DEFINER function callable by
  `authenticated` via PostgREST. Since the `tenants` table RLS already
  grants full SELECT to super admins via `private.is_super_admin()`,
  the function can safely run as SECURITY INVOKER — it will rely on
  the caller's own RLS policies to determine access.

  ## Changes
  1. Drop the existing SECURITY DEFINER version
  2. Recreate as SECURITY INVOKER with the same return shape
  3. Internal super-admin check retained as a guard
  4. Revoke from anon, grant only to authenticated
*/

DROP FUNCTION IF EXISTS public.admin_list_all_tenants();

CREATE FUNCTION public.admin_list_all_tenants()
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
SECURITY INVOKER
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

REVOKE EXECUTE ON FUNCTION public.admin_list_all_tenants() FROM public;
REVOKE EXECUTE ON FUNCTION public.admin_list_all_tenants() FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_list_all_tenants() TO authenticated;
