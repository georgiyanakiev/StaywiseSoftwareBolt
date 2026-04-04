
/*
  # Set passwords for all users and create DoubleTree owner account

  ## Changes

  ### 1. Update passwords for existing 4 users to Matrixon_1
  - admin@demo.com
  - g.yanakiev@yahoo.com
  - staywisehello@gmail.com
  - staywisesoftware@gmail.com

  ### 2. Create auth account for georgiyanakievmotivation@gmail.com
  - Password: Matrixon_1
  - Email pre-confirmed

  ### 3. Create a hotel record for DoubleTreeByHilton Chester tenant
  - The tenant exists but has no hotel record yet

  ### 4. Add georgiyanakievmotivation@gmail.com to user_hotel_assignments
  - Role: owner for DoubleTreeByHilton Chester tenant

  ### 5. Add georgiyanakievmotivation@gmail.com to staff_members
  - Role: admin for DoubleTreeByHilton Chester hotel
*/

-- ─────────────────────────────────────────────────
-- 1. Update passwords for existing users
-- ─────────────────────────────────────────────────
UPDATE auth.users
SET
  encrypted_password = crypt('Matrixon_1', gen_salt('bf')),
  updated_at = now()
WHERE email IN (
  'admin@demo.com',
  'g.yanakiev@yahoo.com',
  'staywisehello@gmail.com',
  'staywisesoftware@gmail.com'
);

-- ─────────────────────────────────────────────────
-- 2. Create auth account for georgiyanakievmotivation@gmail.com
-- ─────────────────────────────────────────────────
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  aud,
  role,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
)
SELECT
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000',
  'georgiyanakievmotivation@gmail.com',
  crypt('Matrixon_1', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{}'::jsonb,
  'authenticated',
  'authenticated',
  now(),
  now(),
  '',
  '',
  '',
  ''
WHERE NOT EXISTS (
  SELECT 1 FROM auth.users WHERE email = 'georgiyanakievmotivation@gmail.com'
);

-- ─────────────────────────────────────────────────
-- 3. Create hotel record for DoubleTreeByHilton Chester tenant
-- ─────────────────────────────────────────────────
INSERT INTO hotels (name, tenant_id, email, currency, created_at, updated_at)
SELECT
  'DoubleTree by Hilton Chester',
  '727eae23-8c48-473b-845f-33b38310d8b2',
  'georgiyanakievmotivation@gmail.com',
  'EUR',
  now(),
  now()
WHERE NOT EXISTS (
  SELECT 1 FROM hotels WHERE tenant_id = '727eae23-8c48-473b-845f-33b38310d8b2'
);

-- ─────────────────────────────────────────────────
-- 4. Add georgiyanakievmotivation@gmail.com to user_hotel_assignments
-- ─────────────────────────────────────────────────
INSERT INTO user_hotel_assignments (user_id, tenant_id, role, active)
SELECT
  au.id,
  '727eae23-8c48-473b-845f-33b38310d8b2',
  'owner',
  true
FROM auth.users au
WHERE au.email = 'georgiyanakievmotivation@gmail.com'
ON CONFLICT DO NOTHING;

-- ─────────────────────────────────────────────────
-- 5. Add georgiyanakievmotivation@gmail.com to staff_members
-- ─────────────────────────────────────────────────
INSERT INTO staff_members (hotel_id, user_id, first_name, last_name, email, role, is_active, approval_status, tenant_id)
SELECT
  h.id,
  au.id,
  'Georgi',
  'Yanakiev',
  'georgiyanakievmotivation@gmail.com',
  'admin',
  true,
  'approved',
  '727eae23-8c48-473b-845f-33b38310d8b2'
FROM hotels h
CROSS JOIN auth.users au
WHERE h.tenant_id = '727eae23-8c48-473b-845f-33b38310d8b2'
  AND au.email = 'georgiyanakievmotivation@gmail.com'
ON CONFLICT DO NOTHING;
