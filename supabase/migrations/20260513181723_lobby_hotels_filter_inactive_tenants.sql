/*
  # Hide hotels with inactive tenants from the lobby

  ## Why
  The lobby was listing hotels whose tenant has been marked inactive in
  the Super Admin panel. Users should only see properties tied to an
  active tenant subscription.

  ## Change
  In `public.lobby_get_my_hotels()`, join through `tenants` and require
  `tenants.active = true`. Hotels without a `tenant_id` are still
  returned (they predate multi-tenancy and have no active flag to
  evaluate).
*/

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
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $function$
WITH my_assignments AS (
  SELECT sm.hotel_id, sm.role::text AS role, 1 AS priority
  FROM public.staff_members sm
  WHERE sm.user_id = auth.uid()
    AND sm.is_active = true
    AND sm.approval_status IN ('approved','pending')

  UNION ALL

  SELECT h.id AS hotel_id, uha.role::text AS role, 2 AS priority
  FROM public.hotels h
  JOIN public.user_hotel_assignments uha
    ON uha.tenant_id = h.tenant_id
  WHERE uha.user_id = auth.uid()
    AND uha.active = true
    AND uha.tenant_id IS NOT NULL
),
visible AS (
  SELECT DISTINCT ON (ma.hotel_id)
    ma.hotel_id,
    ma.role
  FROM my_assignments ma
  ORDER BY ma.hotel_id, ma.priority, ma.role
)
SELECT
  h.id, h.name, h.address, h.city, h.country, h.logo_url,
  h.star_rating, h.currency, h.tenant_id,
  COALESCE(v.role, 'receptionist') AS user_role,
  COALESCE((SELECT count(*)::int FROM public.rooms WHERE hotel_id = h.id), 0) AS rooms_count,
  COALESCE((
    SELECT count(*)::int FROM public.reservations rv
    WHERE rv.hotel_id = h.id
      AND rv.check_in = CURRENT_DATE
      AND rv.status IN ('confirmed','checked_in')
  ), 0) AS todays_arrivals,
  CASE
    WHEN (SELECT count(*) FROM public.rooms WHERE hotel_id = h.id) > 0
    THEN ROUND(
      100.0 * (SELECT count(*) FROM public.rooms WHERE hotel_id = h.id AND status = 'occupied')
      / NULLIF((SELECT count(*) FROM public.rooms WHERE hotel_id = h.id), 0)
    )::int
    ELSE 0
  END AS occupancy_pct
FROM visible v
JOIN public.hotels h ON h.id = v.hotel_id
LEFT JOIN public.tenants t ON t.id = h.tenant_id
WHERE h.tenant_id IS NULL OR t.active = true
ORDER BY h.name;
$function$;
