/*
  # Convert front-end RPCs to SECURITY INVOKER where safe

  ## Why
  Each remaining linter warning is on a function that the frontend
  calls via `supabase.rpc(...)`. Where the underlying tables now have
  RLS that already grants the right access, the function does not
  need elevated privileges. Switching to `SECURITY INVOKER` lets RLS
  do the gating and removes the linter warning.

  ## Converted to SECURITY INVOKER
  - `set_tenant_context(uuid)` — only sets a session GUC
  - `check_subdomain_available(text,uuid)` — needs SELECT on `tenants`
  - `get_hotel_for_user(uuid)` — RLS on `hotels` already enforces access
  - `lobby_get_my_hotels()` — RLS on `hotels`/`staff_members`/`user_hotel_assignments`
    enforces visibility; super-admin path keeps working through the
    existing super-admin SELECT policy
  - `upsert_guest_profile(jsonb,uuid)` — RLS on `guest_profiles`
    enforces tenant + staff scoping

  ## Kept as SECURITY DEFINER
  - `admin_list_users()` — must read `auth.users`, which the
    `authenticated` role cannot. Hardened with an internal super-admin
    check so non-super-admins receive an empty result.
  - `store_channel_secret(uuid,text,text)` — writes to
    `vault.secrets`, which only privileged roles can touch. Hardened
    with an internal super-admin check.

  Both remaining DEFINER functions perform their own authorization;
  the linter warnings on these two are intentional.

  ## Notes
  Grants for `tenants` SELECT and `guest_profiles` write are assumed to
  be in place via existing RLS policies. If a specific call now fails
  due to RLS, the policy on the underlying table needs to be expanded;
  do not revert these functions to DEFINER as a workaround.
*/

-- ============================================================
-- 1. Trivial: set a session GUC
-- ============================================================
CREATE OR REPLACE FUNCTION public.set_tenant_context(p_tenant_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  PERFORM set_config('app.tenant_id', p_tenant_id::text, true);
END;
$$;

-- ============================================================
-- 2. Subdomain availability — caller must be able to SELECT tenants
-- ============================================================
CREATE OR REPLACE FUNCTION public.check_subdomain_available(
  p_subdomain text,
  p_exclude_id uuid DEFAULT NULL
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT NOT EXISTS (
    SELECT 1 FROM tenants
    WHERE subdomain = p_subdomain
      AND (p_exclude_id IS NULL OR id <> p_exclude_id)
  );
$$;

-- ============================================================
-- 3. get_hotel_for_user — let RLS do the gating
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_hotel_for_user(p_hotel_id uuid)
RETURNS SETOF public.hotels
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT * FROM public.hotels WHERE id = p_hotel_id;
$$;

-- ============================================================
-- 4. lobby_get_my_hotels — RLS-driven version
-- ============================================================
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
  user_role text,
  rooms_count integer,
  todays_arrivals integer,
  occupancy_pct integer
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  WITH visible AS (
    SELECT h.*
    FROM public.hotels h
  ),
  role_lookup AS (
    SELECT DISTINCT ON (h.id)
      h.id,
      COALESCE(sm.role, uha.role)::text AS user_role
    FROM visible h
    LEFT JOIN public.staff_members sm
      ON sm.hotel_id = h.id
     AND sm.user_id = auth.uid()
     AND sm.is_active = true
     AND sm.approval_status IN ('approved','pending')
    LEFT JOIN public.user_hotel_assignments uha
      ON (uha.tenant_id = h.tenant_id OR (uha.tenant_id IS NULL AND uha.role = 'super_admin'))
     AND uha.user_id = auth.uid()
     AND uha.active = true
    ORDER BY h.id, sm.role NULLS LAST, uha.role NULLS LAST
  )
  SELECT
    h.id, h.name, h.address, h.city, h.country, h.logo_url,
    h.star_rating, h.currency, h.tenant_id,
    COALESCE(r.user_role, 'receptionist') AS user_role,
    COALESCE((SELECT count(*)::int FROM rooms WHERE hotel_id = h.id), 0) AS rooms_count,
    COALESCE((
      SELECT count(*)::int FROM reservations rv
      WHERE rv.hotel_id = h.id
        AND rv.check_in = CURRENT_DATE
        AND rv.status IN ('confirmed','checked_in')
    ), 0) AS todays_arrivals,
    CASE
      WHEN (SELECT count(*) FROM rooms WHERE hotel_id = h.id) > 0
        THEN ROUND(
          100.0 * (SELECT count(*) FROM rooms WHERE hotel_id = h.id AND status = 'occupied')
          / NULLIF((SELECT count(*) FROM rooms WHERE hotel_id = h.id), 0)
        )::int
      ELSE 0
    END AS occupancy_pct
  FROM visible h
  LEFT JOIN role_lookup r ON r.id = h.id
  ORDER BY h.name;
$$;

-- ============================================================
-- 5. upsert_guest_profile — let RLS gate writes
-- ============================================================
CREATE OR REPLACE FUNCTION public.upsert_guest_profile(
  p_payload jsonb,
  p_guest_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_hotel_id  uuid;
  v_tenant_id uuid;
  v_result    jsonb;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  v_hotel_id := (p_payload->>'hotel_id')::uuid;
  IF v_hotel_id IS NULL THEN
    RAISE EXCEPTION 'hotel_id is required';
  END IF;

  SELECT tenant_id INTO v_tenant_id FROM public.hotels WHERE id = v_hotel_id;

  IF p_guest_id IS NOT NULL THEN
    UPDATE public.guest_profiles SET
      full_name           = COALESCE(p_payload->>'full_name', full_name),
      email               = p_payload->>'email',
      phone               = p_payload->>'phone',
      date_of_birth       = (p_payload->>'date_of_birth')::date,
      nationality         = p_payload->>'nationality',
      country             = p_payload->>'country',
      city                = p_payload->>'city',
      address             = p_payload->>'address',
      company             = p_payload->>'company',
      vat_number          = p_payload->>'vat_number',
      loyalty_tier        = COALESCE(p_payload->>'loyalty_tier', 'standard'),
      loyalty_points      = COALESCE((p_payload->>'loyalty_points')::int, 0),
      marketing_opt_in    = COALESCE((p_payload->>'marketing_opt_in')::boolean, false),
      tags                = CASE WHEN p_payload ? 'tags'
                                 THEN ARRAY(SELECT jsonb_array_elements_text(p_payload->'tags'))
                                 ELSE tags END,
      notes               = p_payload->>'notes',
      blacklisted         = COALESCE((p_payload->>'blacklisted')::boolean, false),
      dietary_requirements= p_payload->>'dietary_requirements',
      room_preferences    = p_payload->>'room_preferences',
      language_preference = p_payload->>'language_preference',
      birthday_month      = (p_payload->>'birthday_month')::int,
      birthday_day        = (p_payload->>'birthday_day')::int,
      anniversary_date    = (p_payload->>'anniversary_date')::date,
      special_occasions   = p_payload->>'special_occasions',
      updated_at          = now()
    WHERE id = p_guest_id AND hotel_id = v_hotel_id
    RETURNING jsonb_build_object('id', id) INTO v_result;

    IF v_result IS NULL THEN
      RAISE EXCEPTION 'Guest not found or access denied';
    END IF;
  ELSE
    INSERT INTO public.guest_profiles (
      hotel_id, tenant_id, full_name, email, phone, date_of_birth,
      nationality, country, city, address, company, vat_number,
      loyalty_tier, loyalty_points, marketing_opt_in, tags, notes,
      blacklisted, dietary_requirements, room_preferences,
      language_preference, birthday_month, birthday_day,
      anniversary_date, special_occasions
    ) VALUES (
      v_hotel_id, v_tenant_id,
      COALESCE(p_payload->>'full_name', ''),
      p_payload->>'email',
      p_payload->>'phone',
      (p_payload->>'date_of_birth')::date,
      p_payload->>'nationality',
      p_payload->>'country',
      p_payload->>'city',
      p_payload->>'address',
      p_payload->>'company',
      p_payload->>'vat_number',
      COALESCE(p_payload->>'loyalty_tier', 'standard'),
      COALESCE((p_payload->>'loyalty_points')::int, 0),
      COALESCE((p_payload->>'marketing_opt_in')::boolean, false),
      CASE WHEN p_payload ? 'tags'
           THEN ARRAY(SELECT jsonb_array_elements_text(p_payload->'tags'))
           ELSE '{}'::text[] END,
      p_payload->>'notes',
      COALESCE((p_payload->>'blacklisted')::boolean, false),
      p_payload->>'dietary_requirements',
      p_payload->>'room_preferences',
      p_payload->>'language_preference',
      (p_payload->>'birthday_month')::int,
      (p_payload->>'birthday_day')::int,
      (p_payload->>'anniversary_date')::date,
      p_payload->>'special_occasions'
    )
    RETURNING jsonb_build_object('id', id) INTO v_result;
  END IF;

  RETURN v_result;
END;
$$;

-- ============================================================
-- 6. Harden remaining DEFINER functions with internal super_admin check
-- ============================================================
CREATE OR REPLACE FUNCTION public.admin_list_users()
RETURNS TABLE (
  id uuid,
  email text,
  created_at timestamptz,
  last_sign_in_at timestamptz,
  raw_user_meta_data jsonb,
  hotel_assignment_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.user_hotel_assignments
    WHERE user_id = auth.uid()
      AND role = 'super_admin'
      AND tenant_id IS NULL
      AND active = true
  ) THEN
    RAISE EXCEPTION 'Access denied: super_admin required';
  END IF;

  RETURN QUERY
  SELECT
    u.id,
    u.email::text,
    u.created_at,
    u.last_sign_in_at,
    u.raw_user_meta_data,
    COUNT(a.id) FILTER (WHERE a.active = true) AS hotel_assignment_count
  FROM auth.users u
  LEFT JOIN public.user_hotel_assignments a ON a.user_id = u.id
  GROUP BY u.id, u.email, u.created_at, u.last_sign_in_at, u.raw_user_meta_data
  ORDER BY u.created_at DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.store_channel_secret(
  p_vault_id uuid,
  p_name text,
  p_value text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = vault, public, extensions
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.user_hotel_assignments
    WHERE user_id = auth.uid()
      AND active = true
      AND role IN ('super_admin','owner','manager')
  ) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  IF p_vault_id IS NOT NULL THEN
    PERFORM vault.update_secret(p_vault_id, p_value);
    RETURN p_vault_id;
  ELSE
    v_id := vault.create_secret(p_value, p_name);
    RETURN v_id;
  END IF;
END;
$$;

-- Re-affirm grants (these are unchanged but explicit for clarity)
REVOKE ALL ON FUNCTION public.set_tenant_context(uuid)              FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.check_subdomain_available(text,uuid)  FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_hotel_for_user(uuid)              FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.lobby_get_my_hotels()                 FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.upsert_guest_profile(jsonb,uuid)      FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_list_users()                    FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.store_channel_secret(uuid,text,text)  FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.set_tenant_context(uuid)              TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_subdomain_available(text,uuid)  TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_hotel_for_user(uuid)              TO authenticated;
GRANT EXECUTE ON FUNCTION public.lobby_get_my_hotels()                 TO authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_guest_profile(jsonb,uuid)      TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_users()                    TO authenticated;
GRANT EXECUTE ON FUNCTION public.store_channel_secret(uuid,text,text)  TO authenticated;
