/*
  # Add subdomain availability check function

  Creates a SECURITY DEFINER function that allows any authenticated user
  to check if a subdomain is available, bypassing RLS restrictions.
  This fixes the issue where the availability check always shows "Available"
  due to RLS blocking the query.
*/

CREATE OR REPLACE FUNCTION check_subdomain_available(p_subdomain text, p_exclude_id uuid DEFAULT NULL)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT NOT EXISTS (
    SELECT 1 FROM tenants
    WHERE subdomain = p_subdomain
      AND (p_exclude_id IS NULL OR id != p_exclude_id)
  );
$$;

GRANT EXECUTE ON FUNCTION check_subdomain_available(text, uuid) TO authenticated;
