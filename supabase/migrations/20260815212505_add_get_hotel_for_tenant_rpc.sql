/*
# Add get_hotel_for_tenant RPC for Super Admin "Enter" button

The Super Admin Hotels tab has an "Enter" button that opens a new tab to /h/{subdomain},
but sessionStorage carries the last-active hotel's session, so RequireHotel redirects
to the wrong hotel. The fix navigates in the same tab using enter() from
ActiveHotelContext, but we need the hotel_id for the tenant. This RPC lets a super
admin look up the hotel for any tenant.
*/

CREATE OR REPLACE FUNCTION public.get_hotel_for_tenant(p_tenant_id uuid)
RETURNS TABLE (
  id uuid,
  name text,
  tenant_id uuid,
  logo_url text,
  subdomain text
)
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
  SELECT h.id, h.name, h.tenant_id, h.logo_url, t.subdomain
  FROM hotels h
  JOIN tenants t ON t.id = h.tenant_id
  WHERE h.tenant_id = p_tenant_id
  LIMIT 1;
END;
$$;

REVOKE ALL ON FUNCTION public.get_hotel_for_tenant(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.get_hotel_for_tenant(uuid) TO authenticated;
