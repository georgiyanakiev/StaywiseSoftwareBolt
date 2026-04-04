
/*
  # Fix User-Hotel Assignment Cross-Access

  ## Problem
  Several users had assignments to hotels they do not own or manage, causing them
  to see multiple hotels in their lobby that don't belong to them.

  ## Intended ownership (from tenants.owner_email):
  - Demo Hotel                 → staywisesoftware@gmail.com
  - DoubleTreeByHilton Chester → georgiyanakievmotivation@gmail.com (no auth account yet)
  - Grand Hotel Sofia          → g.yanakiev@yahoo.com
  - Hilton                     → g.yanakiev@yahoo.com
  - Seaview Resort             → staywisehello@gmail.com

  ## Changes

  ### 1. admin@demo.com (ea7b89b7)
  - Remove: super_admin on Demo Hotel (cross-tenant privilege escalation)
  - Remove: front_desk on DoubleTreeByHilton Chester (not their hotel)
  - Add:    owner on Demo Hotel (they are staff in staff_members for Demo Hotel)

  ### 2. g.yanakiev@yahoo.com (7a7ac2fb)
  - Remove: owner on Demo Hotel (not their hotel)
  - Remove: owner on DoubleTreeByHilton Chester (not their hotel)
  - Remove: owner on Seaview Resort (not their hotel)
  - Update: manager → owner on Grand Hotel Sofia (their hotel)
  - Keep:   owner on Hilton (their hotel)

  ### 3. staywisehello@gmail.com (edb5b632)
  - Remove: super_admin on Demo Hotel (not their hotel)
  - Remove: super_admin on Grand Hotel Sofia (not their hotel)
  - Update: super_admin → owner on Seaview Resort (their hotel, normalise role)

  ### 4. staywisesoftware@gmail.com (27d46254)
  - Remove: super_admin on Grand Hotel Sofia (not their hotel)
  - Remove: super_admin on Seaview Resort (not their hotel)
  - Update: super_admin → owner on Demo Hotel (their hotel, normalise role)

  ### Allowed roles in user_hotel_assignments:
  super_admin | owner | manager | front_desk | housekeeping | accountant | readonly
*/

-- ─────────────────────────────────────────────────
-- 1. admin@demo.com – remove all existing, re-add as owner of Demo Hotel
-- ─────────────────────────────────────────────────
DELETE FROM user_hotel_assignments
WHERE user_id = 'ea7b89b7-53e0-44d1-89ba-f3314ffaae69';

INSERT INTO user_hotel_assignments (user_id, tenant_id, role, active)
VALUES ('ea7b89b7-53e0-44d1-89ba-f3314ffaae69', 'd25fba30-90ed-45d1-8358-682a95def23c', 'owner', true);

-- ─────────────────────────────────────────────────
-- 2. g.yanakiev@yahoo.com – remove cross-hotel access
-- ─────────────────────────────────────────────────
DELETE FROM user_hotel_assignments
WHERE user_id = '7a7ac2fb-1a0c-4d6f-99ea-79467e29634b'
  AND tenant_id IN (
    'd25fba30-90ed-45d1-8358-682a95def23c',  -- Demo Hotel
    '727eae23-8c48-473b-845f-33b38310d8b2',  -- DoubleTreeByHilton Chester
    '320f8ac0-8808-440b-912c-eb9e0eb67255'   -- Seaview Resort
  );

UPDATE user_hotel_assignments
SET role = 'owner'
WHERE user_id = '7a7ac2fb-1a0c-4d6f-99ea-79467e29634b'
  AND tenant_id = '4dbad7d0-16ba-4a21-8640-3a7bcc0fc59a';  -- Grand Hotel Sofia

-- ─────────────────────────────────────────────────
-- 3. staywisehello@gmail.com – remove cross-hotel access, normalise Seaview role
-- ─────────────────────────────────────────────────
DELETE FROM user_hotel_assignments
WHERE user_id = 'edb5b632-bbb8-4962-9b17-4ed6e2d5ea1d'
  AND tenant_id IN (
    'd25fba30-90ed-45d1-8358-682a95def23c',  -- Demo Hotel
    '4dbad7d0-16ba-4a21-8640-3a7bcc0fc59a'   -- Grand Hotel Sofia
  );

UPDATE user_hotel_assignments
SET role = 'owner'
WHERE user_id = 'edb5b632-bbb8-4962-9b17-4ed6e2d5ea1d'
  AND tenant_id = '320f8ac0-8808-440b-912c-eb9e0eb67255';  -- Seaview Resort

-- ─────────────────────────────────────────────────
-- 4. staywisesoftware@gmail.com – remove cross-hotel access, normalise Demo Hotel role
-- ─────────────────────────────────────────────────
DELETE FROM user_hotel_assignments
WHERE user_id = '27d46254-6dbd-40f2-a21e-e49fb1b166b4'
  AND tenant_id IN (
    '4dbad7d0-16ba-4a21-8640-3a7bcc0fc59a',  -- Grand Hotel Sofia
    '320f8ac0-8808-440b-912c-eb9e0eb67255'   -- Seaview Resort
  );

UPDATE user_hotel_assignments
SET role = 'owner'
WHERE user_id = '27d46254-6dbd-40f2-a21e-e49fb1b166b4'
  AND tenant_id = 'd25fba30-90ed-45d1-8358-682a95def23c';  -- Demo Hotel
