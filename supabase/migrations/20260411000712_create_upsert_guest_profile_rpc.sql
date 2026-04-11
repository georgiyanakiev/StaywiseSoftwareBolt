/*
  # Create RPC function for guest profile upsert

  1. New Functions
    - `upsert_guest_profile`: SECURITY DEFINER function that inserts or updates
      a guest profile after verifying the caller is active staff of the hotel.
      Bypasses RLS on guest_profiles but performs its own auth check.

  2. Security
    - Checks auth.uid() is an active staff member of the target hotel
    - Runs as SECURITY DEFINER to bypass RLS
    - Restricted search_path
*/

CREATE OR REPLACE FUNCTION public.upsert_guest_profile(p_payload jsonb, p_guest_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_hotel_id uuid;
  v_uid uuid;
  v_result jsonb;
  v_id uuid;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  v_hotel_id := (p_payload->>'hotel_id')::uuid;
  IF v_hotel_id IS NULL THEN
    RAISE EXCEPTION 'hotel_id is required';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM staff_members
    WHERE hotel_id = v_hotel_id
    AND user_id = v_uid
    AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Access denied: not staff of this hotel';
  END IF;

  IF p_guest_id IS NOT NULL THEN
    UPDATE guest_profiles SET
      full_name = COALESCE(p_payload->>'full_name', full_name),
      email = p_payload->>'email',
      phone = p_payload->>'phone',
      date_of_birth = (p_payload->>'date_of_birth')::date,
      nationality = p_payload->>'nationality',
      country = p_payload->>'country',
      city = p_payload->>'city',
      address = p_payload->>'address',
      company = p_payload->>'company',
      vat_number = p_payload->>'vat_number',
      loyalty_tier = COALESCE(p_payload->>'loyalty_tier', 'standard'),
      loyalty_points = COALESCE((p_payload->>'loyalty_points')::int, 0),
      marketing_opt_in = COALESCE((p_payload->>'marketing_opt_in')::boolean, false),
      tags = CASE WHEN p_payload ? 'tags' THEN ARRAY(SELECT jsonb_array_elements_text(p_payload->'tags')) ELSE tags END,
      notes = p_payload->>'notes',
      blacklisted = COALESCE((p_payload->>'blacklisted')::boolean, false),
      dietary_requirements = p_payload->>'dietary_requirements',
      room_preferences = p_payload->>'room_preferences',
      language_preference = p_payload->>'language_preference',
      birthday_month = (p_payload->>'birthday_month')::int,
      birthday_day = (p_payload->>'birthday_day')::int,
      anniversary_date = (p_payload->>'anniversary_date')::date,
      special_occasions = p_payload->>'special_occasions',
      updated_at = now()
    WHERE id = p_guest_id AND hotel_id = v_hotel_id
    RETURNING jsonb_build_object('id', id) INTO v_result;

    IF v_result IS NULL THEN
      RAISE EXCEPTION 'Guest not found or access denied';
    END IF;
  ELSE
    INSERT INTO guest_profiles (
      hotel_id, tenant_id, full_name, email, phone, date_of_birth,
      nationality, country, city, address, company, vat_number,
      loyalty_tier, loyalty_points, marketing_opt_in, tags, notes,
      blacklisted, dietary_requirements, room_preferences,
      language_preference, birthday_month, birthday_day,
      anniversary_date, special_occasions
    ) VALUES (
      v_hotel_id,
      (SELECT tenant_id FROM hotels WHERE id = v_hotel_id),
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
      CASE WHEN p_payload ? 'tags' THEN ARRAY(SELECT jsonb_array_elements_text(p_payload->'tags')) ELSE '{}'::text[] END,
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

GRANT EXECUTE ON FUNCTION public.upsert_guest_profile(jsonb, uuid) TO authenticated;
