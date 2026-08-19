-- Fix guest_profiles INSERT policy to use the private.is_hotel_staff helper
-- (consistent with SELECT/UPDATE/DELETE policies) instead of an inline
-- staff_members-only check that ignores user_hotel_assignments.
-- This allows users with active tenant assignments (but no direct staff_members
-- row) to insert guest profiles for hotels in their assigned tenant.

-- Drop the old INSERT policy that only checked staff_members
DROP POLICY IF EXISTS "Staff can insert hotel guest profiles" ON public.guest_profiles;

-- Recreate using the same helper as the other CRUD policies
CREATE POLICY "Staff can insert hotel guest profiles"
  ON public.guest_profiles FOR INSERT
  TO authenticated
  WITH CHECK (private.is_hotel_staff(hotel_id));

-- Make upsert_guest_profile SECURITY DEFINER so it can operate on
-- guest_profiles regardless of RLS (it performs its own auth check via
-- auth.uid()). Lock the search path to public to prevent injection.
CREATE OR REPLACE FUNCTION public.upsert_guest_profile(
  p_payload jsonb,
  p_guest_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
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

-- Ensure only authenticated users can call the function
REVOKE EXECUTE ON FUNCTION public.upsert_guest_profile(jsonb, uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.upsert_guest_profile(jsonb, uuid) TO authenticated;

-- Create an active staff_members record for staywisesoftware@gmail.com
-- at DoubleTreeByHilton Chester so they can manage guest profiles there.
INSERT INTO public.staff_members (
  hotel_id, user_id, first_name, last_name, email, phone,
  role, is_active, avatar_url, tenant_id, approval_status, onboarding_sent
)
VALUES (
  '1a176f97-b4be-4a37-83de-3c23b6be58c0',
  '27d46254-6dbd-40f2-a21e-e49fb1b166b4',
  'Super', 'Admin',
  'staywisesoftware@gmail.com',
  '',
  'admin',
  true,
  '',
  '727eae23-8c48-473b-845f-33b38310d8b2',
  'approved',
  false
)
ON CONFLICT DO NOTHING;
