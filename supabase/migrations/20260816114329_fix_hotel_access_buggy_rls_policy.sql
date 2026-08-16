/*
  # Fix hotel access control: drop buggy RLS policy and harden access checks

  ## Why
  A redundant SELECT policy on `public.hotels` ("Users can view assigned hotels")
  compares `uha.tenant_id = hotels.id` instead of `uha.tenant_id = hotels.tenant_id`.
  This is a latent bug: if a tenant_id ever collides with a hotel id, the policy
  would grant read access to the wrong hotel. The correct policy
  ("Authenticated users can view accessible hotels") already covers the same
  intent with the correct join. The buggy policy is redundant and must be removed.

  Additionally, the `lobby_get_my_hotels` RPC is SECURITY INVOKER, which means the
  `hotels` SELECT inside it is subject to RLS. If any future policy accidentally
  broadens hotel read access, the RPC would leak hotels the user is not assigned to.
  Converting the function to SECURITY DEFINER with an explicit assignment-check CTE
  makes the RPC self-contained and immune to RLS drift on the hotels table.

  ## Changes
  1. Drop the buggy "Users can view assigned hotels" SELECT policy.
  2. Recreate `lobby_get_my_hotels` as SECURITY DEFINER with the same CTE logic,
     so the function's own assignment check is the sole gatekeeper — RLS on
     hotels no longer affects the result.

  ## Security
  - The function only returns hotels where the caller has an active
    `staff_members` row (hotel-level) or an active `user_hotel_assignments`
    row matching the hotel's tenant (tenant-level).
  - No super-admin bypass: super-admins see only hotels they are explicitly
    assigned to, same as every other user.
  - GRANT EXECUTE remains restricted to `authenticated`.
  - The buggy RLS policy is removed; the remaining SELECT policy is correct.
*/

-- 1) Drop the buggy redundant SELECT policy
DROP POLICY IF EXISTS "Users can view assigned hotels" ON public.hotels;

-- 2) Recreate lobby_get_my_hotels as SECURITY DEFINER so RLS on hotels
--    cannot leak unassigned hotels into the lobby result.
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
SECURITY DEFINER
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

REVOKE ALL ON FUNCTION public.lobby_get_my_hotels() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.lobby_get_my_hotels() TO authenticated;
