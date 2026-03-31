
/*
  # Create set_tenant_context RPC Function

  ## Summary
  Creates a PostgreSQL function that sets the current tenant ID into the
  Supabase session configuration. This allows RLS policies to reference
  the active tenant via `current_setting('app.tenant_id', true)`.

  ## Function
  - `set_tenant_context(p_tenant_id uuid)` — sets app.tenant_id in current session
  - Marked SECURITY DEFINER so it can be called from the anon/authenticated role
  - The setting is transaction-scoped (third arg = true means local to transaction)
*/

CREATE OR REPLACE FUNCTION public.set_tenant_context(p_tenant_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM set_config('app.tenant_id', p_tenant_id::text, true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_tenant_context(uuid) TO anon, authenticated;
