
/*
  # Grant superAdmin permissions to specified users

  ## Summary
  Inserts super_admin role assignments into user_hotel_assignments for three specified accounts.
  tenant_id is NULL to indicate a global (cross-tenant) superAdmin assignment.

  ## Accounts
  - staywisesoftware@gmail.com
  - staywisehello@gmail.com
  - g.yanakiev@yahoo.com
*/

INSERT INTO user_hotel_assignments (id, user_id, tenant_id, role, assigned_at, active)
VALUES
  (gen_random_uuid(), 'edb5b632-bbb8-4962-9b17-4ed6e2d5ea1d', NULL, 'super_admin', now(), true),
  (gen_random_uuid(), '27d46254-6dbd-40f2-a21e-e49fb1b166b4', NULL, 'super_admin', now(), true),
  (gen_random_uuid(), '7a7ac2fb-1a0c-4d6f-99ea-79467e29634b', NULL, 'super_admin', now(), true)
ON CONFLICT DO NOTHING;
