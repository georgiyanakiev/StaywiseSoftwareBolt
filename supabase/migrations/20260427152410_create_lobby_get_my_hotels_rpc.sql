/*
  # Add lobby_get_my_hotels RPC

  Creates a SECURITY DEFINER function that bypasses RLS to deterministically
  return the list of hotels the calling user can access. The lobby uses this
  as a primary data source so any permissive policy gaps cannot prevent a
  user from seeing the hotels they're assigned to.

  ## Behaviour
  1. If the caller is a global super admin (active row in
     user_hotel_assignments with role = 'super_admin' and tenant_id NULL),
     return all hotels.
  2. Otherwise return:
     - Hotels where the caller has an approved/pending row in staff_members
       with is_active = true, AND
     - Hotels whose tenant_id matches an active tenant-level row in
       user_hotel_assignments for this caller.

  ## Security
  - SECURITY DEFINER so it can read assignments and hotels regardless of RLS.
  - Uses auth.uid() from the request JWT; cannot be spoofed by callers.
  - GRANT EXECUTE only to the authenticated role.
*/

CREATE OR REPLACE FUNCTION public.lobby_get_my_hotels()
RETURNS TABLE (
  id uuid,
  name text,
  address text,
  city text,
  country text,
  logo_url text,
  star_rating integer,
  currency text,
  tenant_id uuid,
  user_role text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  is_super boolean;
BEGIN
  IF uid IS NULL THEN
    RETURN;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.user_hotel_assignments uha
    WHERE uha.user_id = uid
      AND uha.role = 'super_admin'
      AND uha.tenant_id IS NULL
      AND uha.active = true
  ) INTO is_super;

  IF is_super THEN
    RETURN QUERY
      SELECT h.id, h.name, h.address, h.city, h.country, h.logo_url,
             h.star_rating, h.currency, h.tenant_id, 'super_admin'::text AS user_role
      FROM public.hotels h
      ORDER BY h.name;
    RETURN;
  END IF;

  RETURN QUERY
    SELECT DISTINCT ON (h.id)
           h.id, h.name, h.address, h.city, h.country, h.logo_url,
           h.star_rating, h.currency, h.tenant_id,
           COALESCE(sm.role, uha.role, 'receptionist')::text AS user_role
    FROM public.hotels h
    LEFT JOIN public.staff_members sm
      ON sm.hotel_id = h.id
     AND sm.user_id = uid
     AND sm.is_active = true
     AND sm.approval_status IN ('approved','pending')
    LEFT JOIN public.user_hotel_assignments uha
      ON uha.tenant_id = h.tenant_id
     AND uha.user_id = uid
     AND uha.active = true
     AND uha.role <> 'super_admin'
    WHERE sm.user_id IS NOT NULL
       OR uha.user_id IS NOT NULL
    ORDER BY h.id, h.name;
END;
$$;

REVOKE ALL ON FUNCTION public.lobby_get_my_hotels() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.lobby_get_my_hotels() TO authenticated;
