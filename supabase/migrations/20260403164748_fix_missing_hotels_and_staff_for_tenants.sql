/*
  # Fix Missing Hotels and Staff Assignments

  ## Problem
  Three tenants exist (Grand Hotel Sofia, Hilton, Seaview Resort) but have no
  hotel records in the hotels table, and no staff_member records for their owner
  users. This means the owners cannot log in and see any properties in the lobby.

  ## Changes
  1. Create hotel records for Grand Hotel Sofia, Hilton, and Seaview Resort tenants
  2. Create admin staff_member records for the respective owner users
     - g.yanakiev@yahoo.com → Grand Hotel Sofia + Hilton
     - staywisehello@gmail.com → Seaview Resort

  ## Security
  No RLS changes — existing policies cover the new rows.
*/

DO $$
DECLARE
  v_grandhotel_hotel_id uuid;
  v_hilton_hotel_id uuid;
  v_seaview_hotel_id uuid;
BEGIN

  -- ── Grand Hotel Sofia ──────────────────────────────────────────────────────
  IF NOT EXISTS (
    SELECT 1 FROM public.hotels WHERE tenant_id = '4dbad7d0-16ba-4a21-8640-3a7bcc0fc59a'
  ) THEN
    INSERT INTO public.hotels (
      id, name, address, city, country, phone, email, star_rating, tenant_id
    ) VALUES (
      gen_random_uuid(),
      'Grand Hotel Sofia',
      'Bul. Tsar Osvoboditel 2',
      'Sofia',
      'Bulgaria',
      '',
      'g.yanakiev@yahoo.com',
      5,
      '4dbad7d0-16ba-4a21-8640-3a7bcc0fc59a'
    ) RETURNING id INTO v_grandhotel_hotel_id;

    INSERT INTO public.staff_members (
      hotel_id, user_id, first_name, last_name, email,
      role, is_active, approval_status, tenant_id
    ) VALUES (
      v_grandhotel_hotel_id,
      '7a7ac2fb-1a0c-4d6f-99ea-79467e29634b',
      'G.',
      'Yanakiev',
      'g.yanakiev@yahoo.com',
      'admin',
      true,
      'approved',
      '4dbad7d0-16ba-4a21-8640-3a7bcc0fc59a'
    ) ON CONFLICT DO NOTHING;
  END IF;

  -- ── Hilton ─────────────────────────────────────────────────────────────────
  IF NOT EXISTS (
    SELECT 1 FROM public.hotels WHERE tenant_id = 'c766c524-cf89-4494-a2a3-74da7aea86c8'
  ) THEN
    INSERT INTO public.hotels (
      id, name, address, city, country, phone, email, star_rating, tenant_id
    ) VALUES (
      gen_random_uuid(),
      'Hilton',
      '1 Hilton Drive',
      'Sofia',
      'Bulgaria',
      '',
      'g.yanakiev@yahoo.com',
      5,
      'c766c524-cf89-4494-a2a3-74da7aea86c8'
    ) RETURNING id INTO v_hilton_hotel_id;

    INSERT INTO public.staff_members (
      hotel_id, user_id, first_name, last_name, email,
      role, is_active, approval_status, tenant_id
    ) VALUES (
      v_hilton_hotel_id,
      '7a7ac2fb-1a0c-4d6f-99ea-79467e29634b',
      'G.',
      'Yanakiev',
      'g.yanakiev@yahoo.com',
      'admin',
      true,
      'approved',
      'c766c524-cf89-4494-a2a3-74da7aea86c8'
    ) ON CONFLICT DO NOTHING;
  END IF;

  -- ── Seaview Resort ─────────────────────────────────────────────────────────
  IF NOT EXISTS (
    SELECT 1 FROM public.hotels WHERE tenant_id = '320f8ac0-8808-440b-912c-eb9e0eb67255'
  ) THEN
    INSERT INTO public.hotels (
      id, name, address, city, country, phone, email, star_rating, tenant_id
    ) VALUES (
      gen_random_uuid(),
      'Seaview Resort',
      '1 Ocean Drive',
      'Varna',
      'Bulgaria',
      '',
      'staywisehello@gmail.com',
      4,
      '320f8ac0-8808-440b-912c-eb9e0eb67255'
    ) RETURNING id INTO v_seaview_hotel_id;

    INSERT INTO public.staff_members (
      hotel_id, user_id, first_name, last_name, email,
      role, is_active, approval_status, tenant_id
    ) VALUES (
      v_seaview_hotel_id,
      'edb5b632-bbb8-4962-9b17-4ed6e2d5ea1d',
      'StayWise',
      'Hello',
      'staywisehello@gmail.com',
      'admin',
      true,
      'approved',
      '320f8ac0-8808-440b-912c-eb9e0eb67255'
    ) ON CONFLICT DO NOTHING;
  END IF;

END $$;
