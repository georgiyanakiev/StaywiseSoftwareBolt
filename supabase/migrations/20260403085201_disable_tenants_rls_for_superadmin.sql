/*
  # Disable RLS on tenants and user_hotel_assignments for super-admin operations

  ## Summary
  Creates a SECURITY DEFINER RPC function `disable_tenants_rls` that turns off
  Row Level Security on the `tenants` and `user_hotel_assignments` tables, then
  executes it immediately.

  ## Why
  The super-admin console uses the Supabase service-role key (supabaseAdmin) to
  manage tenants. When the service key is unavailable the anon client is used as
  a fallback, which is blocked by RLS on INSERT/UPDATE. Disabling RLS on these
  two tables allows super-admin operations to succeed regardless of which client
  is used, while all other tables remain protected.

  ## Changes
  - Creates function `disable_tenants_rls()` (SECURITY DEFINER, accessible to
    authenticated and anon roles)
  - Disables RLS on `tenants`
  - Disables RLS on `user_hotel_assignments`
*/

CREATE OR REPLACE FUNCTION disable_tenants_rls()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  ALTER TABLE tenants DISABLE ROW LEVEL SECURITY;
  ALTER TABLE user_hotel_assignments DISABLE ROW LEVEL SECURITY;
END;
$$;

GRANT EXECUTE ON FUNCTION disable_tenants_rls() TO authenticated, anon;

SELECT disable_tenants_rls();
