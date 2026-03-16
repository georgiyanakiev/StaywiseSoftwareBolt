/*
  # Create Demo Hotel and User Account (Fixed)

  1. Creates demo hotel with complete data
  2. Creates demo user account with authentication
  3. Links user to hotel as admin staff member
  
  ## Credentials
  - Email: admin@demo.com
  - Password: demo123456
  - Role: Admin
*/

DO $$
DECLARE
  v_hotel_id uuid;
  v_user_id uuid;
BEGIN
  -- Check if hotel already exists
  SELECT id INTO v_hotel_id FROM hotels LIMIT 1;
  
  -- Create hotel if it doesn't exist
  IF v_hotel_id IS NULL THEN
    INSERT INTO hotels (
      name,
      address,
      city,
      country,
      phone,
      email,
      website,
      star_rating,
      check_in_time,
      check_out_time,
      currency,
      timezone,
      tax_rate,
      cancellation_policy
    )
    VALUES (
      'The Grand Metropolitan',
      '500 Park Avenue',
      'New York',
      'United States',
      '+1 (212) 555-0100',
      'contact@grandmetropolitan.com',
      'https://grandmetropolitan.example.com',
      5,
      '14:00:00',
      '11:00:00',
      'USD',
      'America/New_York',
      10.0,
      'Free cancellation up to 24 hours before check-in. Cancellations within 24 hours will incur a one-night charge.'
    )
    RETURNING id INTO v_hotel_id;
    
    RAISE NOTICE 'Demo hotel created: %', v_hotel_id;
  END IF;

  -- Delete existing demo user if exists (cleanup)
  DELETE FROM staff_members WHERE email = 'admin@demo.com';
  DELETE FROM auth.identities WHERE identity_data->>'email' = 'admin@demo.com';
  DELETE FROM auth.users WHERE email = 'admin@demo.com';

  -- Generate a user ID
  v_user_id := gen_random_uuid();

  -- Create auth user
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
  )
  VALUES (
    '00000000-0000-0000-0000-000000000000',
    v_user_id,
    'authenticated',
    'authenticated',
    'admin@demo.com',
    crypt('demo123456', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"first_name":"Demo","last_name":"Admin"}'::jsonb,
    now(),
    now(),
    '',
    '',
    '',
    ''
  );

  -- Create identity record with provider_id
  INSERT INTO auth.identities (
    provider_id,
    user_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at
  )
  VALUES (
    v_user_id::text,
    v_user_id,
    format('{"sub":"%s","email":"admin@demo.com","email_verified":true,"phone_verified":false}', v_user_id)::jsonb,
    'email',
    now(),
    now(),
    now()
  );

  -- Create staff member record
  INSERT INTO staff_members (
    hotel_id,
    user_id,
    first_name,
    last_name,
    email,
    phone,
    role,
    is_active
  )
  VALUES (
    v_hotel_id,
    v_user_id,
    'Demo',
    'Admin',
    'admin@demo.com',
    '+1 (555) 000-0000',
    'admin',
    true
  );

  RAISE NOTICE 'Demo user created successfully!';
  RAISE NOTICE 'Email: admin@demo.com';
  RAISE NOTICE 'Password: demo123456';
  RAISE NOTICE 'Hotel ID: %', v_hotel_id;
END $$;
