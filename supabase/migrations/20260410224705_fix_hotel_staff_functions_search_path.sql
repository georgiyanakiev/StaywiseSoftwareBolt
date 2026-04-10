/*
  # Fix search_path on is_hotel_staff and is_hotel_admin

  1. Problem
    - Both SECURITY DEFINER functions had search_path=public
    - auth.uid() could not resolve because the auth schema was not in the search path
    - This caused INSERT on room_types (and any table using these helpers) to fail with RLS violation

  2. Fix
    - Recreate both functions with search_path = public, auth
    - This allows auth.uid() to resolve correctly inside the SECURITY DEFINER context
*/

CREATE OR REPLACE FUNCTION public.is_hotel_staff(p_hotel_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
SELECT EXISTS (
  SELECT 1 FROM public.staff_members
  WHERE hotel_id = p_hotel_id
  AND user_id = auth.uid()
  AND is_active = true
);
$$;

CREATE OR REPLACE FUNCTION public.is_hotel_admin(p_hotel_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
SELECT EXISTS (
  SELECT 1 FROM public.staff_members
  WHERE hotel_id = p_hotel_id
  AND user_id = auth.uid()
  AND is_active = true
  AND role IN ('admin', 'owner', 'general_manager')
);
$$;

GRANT EXECUTE ON FUNCTION public.is_hotel_staff(uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_hotel_admin(uuid) TO anon, authenticated, service_role;
