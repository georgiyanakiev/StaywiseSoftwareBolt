/*
  # Grant execute permissions on hotel staff helper functions

  1. Changes
    - Explicitly grant EXECUTE on is_hotel_staff and is_hotel_admin
      to authenticated and anon roles.
    - This ensures the RLS policies can call these functions when
      evaluating as the authenticated user's role.
*/

GRANT EXECUTE ON FUNCTION public.is_hotel_staff(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_hotel_staff(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.is_hotel_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_hotel_admin(uuid) TO anon;
