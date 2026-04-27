/*
  # Enrich lobby_get_my_hotels with counts (v2)

  Drops the old function first, then re-creates with extra count columns.
*/

DROP FUNCTION IF EXISTS public.lobby_get_my_hotels();

CREATE OR REPLACE FUNCTION public.lobby_get_my_hotels()
RETURNS TABLE(
  id uuid,
  name text,
  address text,
  city text,
  country text,
  logo_url text,
  star_rating integer,
  currency text,
  tenant_id uuid,
  user_role text,
  rooms_count integer,
  todays_arrivals integer,
  occupancy_pct integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  is_super boolean;
  v_today date := CURRENT_DATE;
BEGIN
  IF uid IS NULL THEN RETURN; END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.user_hotel_assignments uha
    WHERE uha.user_id = uid AND uha.role = 'super_admin'
      AND uha.tenant_id IS NULL AND uha.active = true
  ) INTO is_super;

  IF is_super THEN
    RETURN QUERY
    SELECT h.id, h.name, h.address, h.city, h.country, h.logo_url,
           h.star_rating, h.currency, h.tenant_id,
           'super_admin'::text,
           COALESCE((SELECT count(*)::int FROM rooms r WHERE r.hotel_id = h.id), 0),
           COALESCE((SELECT count(*)::int FROM reservations rv
             WHERE rv.hotel_id = h.id AND rv.check_in = v_today
               AND rv.status IN ('confirmed','checked_in')), 0),
           CASE
             WHEN (SELECT count(*) FROM rooms r WHERE r.hotel_id = h.id) > 0 THEN
               ROUND(
                 100.0 * (SELECT count(*) FROM rooms r WHERE r.hotel_id = h.id AND r.status = 'occupied')
                 / NULLIF((SELECT count(*) FROM rooms r WHERE r.hotel_id = h.id), 0)
               )::int
             ELSE 0
           END
    FROM public.hotels h
    ORDER BY h.name;
    RETURN;
  END IF;

  RETURN QUERY
  SELECT DISTINCT ON (h.id)
    h.id, h.name, h.address, h.city, h.country, h.logo_url,
    h.star_rating, h.currency, h.tenant_id,
    COALESCE(sm.role, uha.role, 'receptionist')::text,
    COALESCE((SELECT count(*)::int FROM rooms r WHERE r.hotel_id = h.id), 0),
    COALESCE((SELECT count(*)::int FROM reservations rv
      WHERE rv.hotel_id = h.id AND rv.check_in = v_today
        AND rv.status IN ('confirmed','checked_in')), 0),
    CASE
      WHEN (SELECT count(*) FROM rooms r WHERE r.hotel_id = h.id) > 0 THEN
        ROUND(
          100.0 * (SELECT count(*) FROM rooms r WHERE r.hotel_id = h.id AND r.status = 'occupied')
          / NULLIF((SELECT count(*) FROM rooms r WHERE r.hotel_id = h.id), 0)
        )::int
      ELSE 0
    END
  FROM public.hotels h
  LEFT JOIN public.staff_members sm
    ON sm.hotel_id = h.id AND sm.user_id = uid
   AND sm.is_active = true AND sm.approval_status IN ('approved','pending')
  LEFT JOIN public.user_hotel_assignments uha
    ON uha.tenant_id = h.tenant_id AND uha.user_id = uid
   AND uha.active = true AND uha.role <> 'super_admin'
  WHERE sm.user_id IS NOT NULL OR uha.user_id IS NOT NULL
  ORDER BY h.id, h.name;
END;
$$;

GRANT EXECUTE ON FUNCTION public.lobby_get_my_hotels() TO authenticated;
