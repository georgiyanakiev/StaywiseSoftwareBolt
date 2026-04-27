/*
  # Add get_hotel_for_user RPC

  Provides a SECURITY DEFINER function that returns a single hotel row
  for the authenticated user when they have access via any of:
    - super_admin assignment (tenant_id IS NULL, active)
    - active staff_members row at the hotel
    - active user_hotel_assignments row at the hotel's tenant

  This avoids race conditions where the regular hotels SELECT RLS might
  fail before tenant context is set, leaving the dashboard with a null
  current hotel even though the user picked the hotel in the lobby.
*/

CREATE OR REPLACE FUNCTION public.get_hotel_for_user(p_hotel_id uuid)
RETURNS SETOF hotels
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_is_super boolean;
  v_has_access boolean;
BEGIN
  IF v_uid IS NULL THEN RETURN; END IF;

  SELECT EXISTS (
    SELECT 1 FROM user_hotel_assignments
    WHERE user_id = v_uid AND role = 'super_admin' AND tenant_id IS NULL AND active = true
  ) INTO v_is_super;

  IF v_is_super THEN
    RETURN QUERY SELECT * FROM hotels WHERE id = p_hotel_id;
    RETURN;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM staff_members
    WHERE hotel_id = p_hotel_id AND user_id = v_uid
      AND is_active = true AND approval_status IN ('approved','pending')
  ) OR EXISTS (
    SELECT 1
    FROM hotels h
    JOIN user_hotel_assignments uha ON uha.tenant_id = h.tenant_id
    WHERE h.id = p_hotel_id AND uha.user_id = v_uid AND uha.active = true
  ) INTO v_has_access;

  IF v_has_access THEN
    RETURN QUERY SELECT * FROM hotels WHERE id = p_hotel_id;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_hotel_for_user(uuid) TO authenticated;
