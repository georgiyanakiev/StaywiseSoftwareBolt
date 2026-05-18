/*
  # Revoke public execute on admin_list_all_tenants SECURITY DEFINER function

  ## Why
  The function `public.admin_list_all_tenants()` is SECURITY DEFINER and was
  callable by `anon` and `authenticated` roles via PostgREST. Although it
  internally checks `private.is_super_admin()` and raises an exception for
  non-admins, best practice is to revoke execute from broad roles and grant
  only to `authenticated` explicitly.

  ## Changes
  1. Revoke EXECUTE from `public` (covers anon and all roles)
  2. Grant EXECUTE only to `authenticated` (the internal guard still applies)
*/

REVOKE EXECUTE ON FUNCTION public.admin_list_all_tenants() FROM public;
REVOKE EXECUTE ON FUNCTION public.admin_list_all_tenants() FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_list_all_tenants() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_all_tenants() TO authenticated;
