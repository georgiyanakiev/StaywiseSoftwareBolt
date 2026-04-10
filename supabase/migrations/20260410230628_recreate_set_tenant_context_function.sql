/*
  # Recreate set_tenant_context function

  1. New Functions
    - `set_tenant_context(p_tenant_id uuid)` - Sets the current tenant context
      for row-level security policies using a session-level config variable

  2. Security
    - SECURITY DEFINER to allow setting config
    - Granted to anon and authenticated roles
    - Uses `SET search_path = public` for safety
*/

CREATE OR REPLACE FUNCTION public.set_tenant_context(p_tenant_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM set_config('app.tenant_id', p_tenant_id::text, true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_tenant_context(uuid) TO anon, authenticated;
