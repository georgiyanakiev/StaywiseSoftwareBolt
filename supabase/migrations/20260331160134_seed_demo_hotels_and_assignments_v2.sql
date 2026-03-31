/*
  # Seed Demo Hotels and User Assignments for Testing (v2)

  ## Summary
  Links the existing hotel to the `demo` tenant, creates two additional demo hotels
  for the `grandhotel` and `seaviewresort` tenants, and populates `user_hotel_assignments`
  so all demo/test users are assigned across all three tenants.

  Role mapping (user_hotel_assignments uses): super_admin, owner, manager, front_desk, housekeeping, accountant, readonly

  ## New Hotels
  - Grand Hotel Sofia → grandhotel tenant
  - Sea View Resort → seaviewresort tenant

  ## Assignments
  - staywisesoftware@gmail.com → super_admin on all 3 tenants
  - admin@demo.com             → super_admin on all 3 tenants
  - manager@demo.com           → manager on demo tenant
  - receptionist@demo.com      → front_desk on demo tenant
  - housekeeping@demo.com      → housekeeping on demo tenant

  ## Notes
  - Idempotent via ON CONFLICT DO NOTHING
*/

-- ── Step 1: Link existing hotel to demo tenant ────────────────────────────
UPDATE hotels
SET tenant_id = 'f9c53ff1-d7ee-42e4-8700-2af3e0c9e301'
WHERE id = '358b47d2-d31b-4a90-89de-9cdb0d76f7c2'
  AND tenant_id IS NULL;

-- ── Step 2: Create Grand Hotel Sofia for grandhotel tenant ────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM hotels WHERE tenant_id = 'd9ed4970-b95a-40fe-8878-4290526a0fca'
  ) THEN
    INSERT INTO hotels (
      name, address, city, country, phone, email, website,
      star_rating, currency, timezone, tax_rate, tenant_id,
      check_in_time, check_out_time, cancellation_policy
    ) VALUES (
      'Grand Hotel Sofia',
      '1 Patriarch Evtimiy Blvd',
      'Sofia',
      'Bulgaria',
      '+359 2 933 1000',
      'info@grandhotelsofia.bg',
      'https://grandhotelsofia.bg',
      5, 'BGN', 'Europe/Sofia', 20,
      'd9ed4970-b95a-40fe-8878-4290526a0fca',
      '14:00', '12:00',
      'Free cancellation up to 48 hours before check-in.'
    );
  END IF;
END $$;

-- ── Step 3: Create Sea View Resort for seaviewresort tenant ───────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM hotels WHERE tenant_id = 'ea09a82c-179b-4edc-88a1-85c64ac9e11e'
  ) THEN
    INSERT INTO hotels (
      name, address, city, country, phone, email, website,
      star_rating, currency, timezone, tax_rate, tenant_id,
      check_in_time, check_out_time, cancellation_policy
    ) VALUES (
      'Sea View Resort',
      '12 Primorska Street',
      'Varna',
      'Bulgaria',
      '+359 52 600 100',
      'info@seaviewresort.bg',
      'https://seaviewresort.bg',
      4, 'BGN', 'Europe/Sofia', 20,
      'ea09a82c-179b-4edc-88a1-85c64ac9e11e',
      '15:00', '11:00',
      'Non-refundable rate.'
    );
  END IF;
END $$;

-- ── Step 4: Seed user_hotel_assignments ───────────────────────────────────

-- staywisesoftware@gmail.com → super_admin on all 3 tenants
INSERT INTO user_hotel_assignments (user_id, tenant_id, role, active)
VALUES
  ('45019e52-23a8-411c-a8d1-94c3795f0675', 'd9ed4970-b95a-40fe-8878-4290526a0fca', 'super_admin', true),
  ('45019e52-23a8-411c-a8d1-94c3795f0675', 'ea09a82c-179b-4edc-88a1-85c64ac9e11e', 'super_admin', true),
  ('45019e52-23a8-411c-a8d1-94c3795f0675', 'f9c53ff1-d7ee-42e4-8700-2af3e0c9e301', 'super_admin', true)
ON CONFLICT DO NOTHING;

-- admin@demo.com → super_admin on all 3 tenants
INSERT INTO user_hotel_assignments (user_id, tenant_id, role, active)
VALUES
  ('2a1d79a0-65b6-4d34-ae9c-face00098650', 'd9ed4970-b95a-40fe-8878-4290526a0fca', 'super_admin', true),
  ('2a1d79a0-65b6-4d34-ae9c-face00098650', 'ea09a82c-179b-4edc-88a1-85c64ac9e11e', 'super_admin', true),
  ('2a1d79a0-65b6-4d34-ae9c-face00098650', 'f9c53ff1-d7ee-42e4-8700-2af3e0c9e301', 'super_admin', true)
ON CONFLICT DO NOTHING;

-- manager@demo.com → manager on demo tenant
INSERT INTO user_hotel_assignments (user_id, tenant_id, role, active)
VALUES
  ('0dd158a4-e408-4dc6-b349-4bf7d1ee528c', 'f9c53ff1-d7ee-42e4-8700-2af3e0c9e301', 'manager', true)
ON CONFLICT DO NOTHING;

-- receptionist@demo.com → front_desk on demo tenant
INSERT INTO user_hotel_assignments (user_id, tenant_id, role, active)
VALUES
  ('7859caf0-0047-4bb2-9ace-4a64784950c1', 'f9c53ff1-d7ee-42e4-8700-2af3e0c9e301', 'front_desk', true)
ON CONFLICT DO NOTHING;

-- housekeeping@demo.com → housekeeping on demo tenant
INSERT INTO user_hotel_assignments (user_id, tenant_id, role, active)
VALUES
  ('757786c5-de60-4dcf-ac89-235c0a629347', 'f9c53ff1-d7ee-42e4-8700-2af3e0c9e301', 'housekeeping', true)
ON CONFLICT DO NOTHING;

-- ── Step 5: Update tenants with proper branding ────────────────────────────
UPDATE tenants
SET primary_color = '#1a56db', secondary_color = '#1e3a8a', plan = 'pro'
WHERE subdomain = 'grandhotel';

UPDATE tenants
SET primary_color = '#0891b2', secondary_color = '#0e7490', plan = 'starter'
WHERE subdomain = 'seaviewresort';

UPDATE tenants
SET primary_color = '#2563eb', secondary_color = '#1e40af', plan = 'enterprise'
WHERE subdomain = 'demo';
