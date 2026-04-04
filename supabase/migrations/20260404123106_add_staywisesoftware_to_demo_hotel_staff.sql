
/*
  # Add staywisesoftware@gmail.com to Demo Hotel staff

  staywisesoftware@gmail.com is listed as the owner_email of the Demo Hotel tenant
  but had no staff_members record, preventing them from accessing the hotel after
  their assignment role was normalised from super_admin to owner.

  This migration inserts them as an admin staff member on The Grand Metropolitan
  (the hotel belonging to the Demo Hotel tenant).
*/

INSERT INTO staff_members (hotel_id, user_id, first_name, last_name, email, role, is_active, approval_status, tenant_id)
VALUES (
  'e83fbd69-4191-41b4-9651-cdbfd784786d',
  '27d46254-6dbd-40f2-a21e-e49fb1b166b4',
  'StayWise',
  'Software',
  'staywisesoftware@gmail.com',
  'admin',
  true,
  'approved',
  'd25fba30-90ed-45d1-8358-682a95def23c'
);
