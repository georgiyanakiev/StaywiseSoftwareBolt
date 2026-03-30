/*
  # Create Role-Based Demo Users

  ## Summary
  Creates four demo user accounts in Supabase Auth and corresponding staff_members
  records — one for each available role. The existing admin@demo.com user is kept as-is.

  ## New Demo Accounts
  All accounts share the same hotel as the existing admin demo.

  | Role          | Email                      | Password     |
  |---------------|----------------------------|--------------|
  | admin         | admin@demo.com             | demo123456   |
  | manager       | manager@demo.com           | demo123456   |
  | receptionist  | receptionist@demo.com      | demo123456   |
  | housekeeping  | housekeeping@demo.com      | demo123456   |

  ## Notes
  - Uses Supabase's internal `auth.users` table via `auth.create_user` helper
  - Each user is linked to "The Grand Metropolitan" hotel
  - All users start as active (is_active = true)
  - Skips creation if the email already exists to keep migration idempotent
*/

DO $$
DECLARE
  v_hotel_id uuid;
  v_manager_user_id uuid;
  v_receptionist_user_id uuid;
  v_housekeeping_user_id uuid;
BEGIN
  SELECT id INTO v_hotel_id FROM hotels WHERE name = 'The Grand Metropolitan' LIMIT 1;

  IF v_hotel_id IS NULL THEN
    RAISE EXCEPTION 'Demo hotel not found. Run earlier seed migrations first.';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'manager@demo.com') THEN
    v_manager_user_id := gen_random_uuid();
    INSERT INTO auth.users (
      id, instance_id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, recovery_token,
      email_change_token_new, email_change
    ) VALUES (
      v_manager_user_id,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'manager@demo.com',
      crypt('demo123456', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}',
      '{"first_name":"Morgan","last_name":"Manager"}',
      now(), now(), '', '', '', ''
    );

    INSERT INTO auth.identities (
      id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
    ) VALUES (
      gen_random_uuid(),
      v_manager_user_id,
      jsonb_build_object('sub', v_manager_user_id::text, 'email', 'manager@demo.com'),
      'email',
      v_manager_user_id::text,
      now(), now(), now()
    );
  ELSE
    SELECT id INTO v_manager_user_id FROM auth.users WHERE email = 'manager@demo.com';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM staff_members WHERE email = 'manager@demo.com') THEN
    INSERT INTO staff_members (hotel_id, user_id, first_name, last_name, email, phone, role, is_active)
    VALUES (v_hotel_id, v_manager_user_id, 'Morgan', 'Manager', 'manager@demo.com', '+1-555-0102', 'manager', true);
  ELSE
    UPDATE staff_members SET user_id = v_manager_user_id WHERE email = 'manager@demo.com';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'receptionist@demo.com') THEN
    v_receptionist_user_id := gen_random_uuid();
    INSERT INTO auth.users (
      id, instance_id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, recovery_token,
      email_change_token_new, email_change
    ) VALUES (
      v_receptionist_user_id,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'receptionist@demo.com',
      crypt('demo123456', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}',
      '{"first_name":"Riley","last_name":"Reception"}',
      now(), now(), '', '', '', ''
    );

    INSERT INTO auth.identities (
      id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
    ) VALUES (
      gen_random_uuid(),
      v_receptionist_user_id,
      jsonb_build_object('sub', v_receptionist_user_id::text, 'email', 'receptionist@demo.com'),
      'email',
      v_receptionist_user_id::text,
      now(), now(), now()
    );
  ELSE
    SELECT id INTO v_receptionist_user_id FROM auth.users WHERE email = 'receptionist@demo.com';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM staff_members WHERE email = 'receptionist@demo.com') THEN
    INSERT INTO staff_members (hotel_id, user_id, first_name, last_name, email, phone, role, is_active)
    VALUES (v_hotel_id, v_receptionist_user_id, 'Riley', 'Reception', 'receptionist@demo.com', '+1-555-0103', 'receptionist', true);
  ELSE
    UPDATE staff_members SET user_id = v_receptionist_user_id WHERE email = 'receptionist@demo.com';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'housekeeping@demo.com') THEN
    v_housekeeping_user_id := gen_random_uuid();
    INSERT INTO auth.users (
      id, instance_id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, recovery_token,
      email_change_token_new, email_change
    ) VALUES (
      v_housekeeping_user_id,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'housekeeping@demo.com',
      crypt('demo123456', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}',
      '{"first_name":"Harper","last_name":"Housekeep"}',
      now(), now(), '', '', '', ''
    );

    INSERT INTO auth.identities (
      id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
    ) VALUES (
      gen_random_uuid(),
      v_housekeeping_user_id,
      jsonb_build_object('sub', v_housekeeping_user_id::text, 'email', 'housekeeping@demo.com'),
      'email',
      v_housekeeping_user_id::text,
      now(), now(), now()
    );
  ELSE
    SELECT id INTO v_housekeeping_user_id FROM auth.users WHERE email = 'housekeeping@demo.com';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM staff_members WHERE email = 'housekeeping@demo.com') THEN
    INSERT INTO staff_members (hotel_id, user_id, first_name, last_name, email, phone, role, is_active)
    VALUES (v_hotel_id, v_housekeeping_user_id, 'Harper', 'Housekeep', 'housekeeping@demo.com', '+1-555-0104', 'housekeeping', true);
  ELSE
    UPDATE staff_members SET user_id = v_housekeeping_user_id WHERE email = 'housekeeping@demo.com';
  END IF;

END $$;
