/*
  # Create Demo User Account

  ## Purpose
  Creates a demo user account with admin access to the seeded hotel data.

  ## Credentials
  - Email: admin@demo.com
  - Password: demo123456
  - Role: Admin
  - Hotel: The Grand Metropolitan

  ## Usage
  Users can immediately log in with these credentials to test the system.
*/

DO $$
DECLARE
  v_hotel_id uuid;
  v_user_id uuid;
BEGIN
  -- Get the demo hotel ID
  SELECT id INTO v_hotel_id FROM hotels LIMIT 1;
  
  IF v_hotel_id IS NULL THEN
    RAISE NOTICE 'No hotel found. Please run the seed data migration first.';
    RETURN;
  END IF;

  -- Check if demo user already exists
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = 'admin@demo.com') THEN
    RAISE NOTICE 'Demo user already exists. Skipping creation.';
    RETURN;
  END IF;

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
    recovery_token
  )
  VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    'admin@demo.com',
    crypt('demo123456', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"first_name":"Demo","last_name":"Admin"}',
    now(),
    now(),
    '',
    ''
  )
  RETURNING id INTO v_user_id;

  -- Create auth identity (required by GoTrue for password sign-in)
  INSERT INTO auth.identities (
    id,
    provider_id,
    user_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at
  )
  VALUES (
    gen_random_uuid(),
    v_user_id::text,
    v_user_id,
    jsonb_build_object(
      'sub', v_user_id::text,
      'email', 'admin@demo.com',
      'email_verified', true,
      'phone_verified', false
    ),
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

  RAISE NOTICE 'Demo user created successfully! Email: admin@demo.com, Password: demo123456';
END $$;
