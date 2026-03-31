/*
  # Add New Roles and Role Permissions System (v2)

  ## Summary
  Extends the staff_members table to support 7 roles and adds a role_permissions table
  for granular module-level access control.

  ## Changes

  ### staff_members table
  - Replaces old role CHECK constraint with 7 new roles
  - Maps existing roles: admin→owner, receptionist→front_desk
  - Adds new columns: department, pin_code, permissions (jsonb), last_login

  ### New Table: role_permissions
  - Per-hotel, per-role, per-module access flags
  - Unique constraint on (hotel_id, role, module)
  - RLS enabled

  ## Security
  - RLS enabled on role_permissions
  - Staff can view permissions for their hotel
  - Only owners/managers can modify permissions
*/

-- Step 1: Add new columns to staff_members
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'staff_members' AND column_name = 'department'
  ) THEN
    ALTER TABLE staff_members ADD COLUMN department text DEFAULT '';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'staff_members' AND column_name = 'pin_code'
  ) THEN
    ALTER TABLE staff_members ADD COLUMN pin_code text DEFAULT NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'staff_members' AND column_name = 'permissions'
  ) THEN
    ALTER TABLE staff_members ADD COLUMN permissions jsonb DEFAULT '{}';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'staff_members' AND column_name = 'last_login'
  ) THEN
    ALTER TABLE staff_members ADD COLUMN last_login timestamptz DEFAULT NULL;
  END IF;
END $$;

-- Step 2: Migrate existing roles before changing constraint
UPDATE staff_members SET role = 'owner' WHERE role = 'admin';
UPDATE staff_members SET role = 'front_desk' WHERE role = 'receptionist';

-- Step 3: Drop old role check constraint by name pattern
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT tc.constraint_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.check_constraints cc
      ON tc.constraint_name = cc.constraint_name
      AND tc.constraint_schema = cc.constraint_schema
    WHERE tc.table_name = 'staff_members'
      AND tc.constraint_type = 'CHECK'
      AND cc.check_clause LIKE '%receptionist%'
  LOOP
    EXECUTE format('ALTER TABLE staff_members DROP CONSTRAINT IF EXISTS %I', r.constraint_name);
  END LOOP;
END $$;

-- Also try dropping by known possible names
ALTER TABLE staff_members DROP CONSTRAINT IF EXISTS staff_members_role_check;

-- Step 4: Add new role check constraint
ALTER TABLE staff_members ADD CONSTRAINT staff_members_role_check
  CHECK (role IN ('owner','manager','front_desk','housekeeping','maintenance','accountant','readonly'));

-- Step 5: Create role_permissions table
CREATE TABLE IF NOT EXISTS role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid REFERENCES hotels(id) ON DELETE CASCADE,
  role text NOT NULL,
  module text NOT NULL,
  can_view boolean DEFAULT false,
  can_create boolean DEFAULT false,
  can_edit boolean DEFAULT false,
  can_delete boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(hotel_id, role, module)
);

ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view permissions for their hotel"
  ON role_permissions FOR SELECT
  TO authenticated
  USING (
    hotel_id IN (
      SELECT sm.hotel_id FROM staff_members sm
      WHERE sm.user_id = auth.uid() AND sm.is_active = true
    )
  );

CREATE POLICY "Owners and managers can insert permissions"
  ON role_permissions FOR INSERT
  TO authenticated
  WITH CHECK (
    hotel_id IN (
      SELECT sm.hotel_id FROM staff_members sm
      WHERE sm.user_id = auth.uid()
        AND sm.role IN ('owner', 'manager')
        AND sm.is_active = true
    )
  );

CREATE POLICY "Owners and managers can update permissions"
  ON role_permissions FOR UPDATE
  TO authenticated
  USING (
    hotel_id IN (
      SELECT sm.hotel_id FROM staff_members sm
      WHERE sm.user_id = auth.uid()
        AND sm.role IN ('owner', 'manager')
        AND sm.is_active = true
    )
  )
  WITH CHECK (
    hotel_id IN (
      SELECT sm.hotel_id FROM staff_members sm
      WHERE sm.user_id = auth.uid()
        AND sm.role IN ('owner', 'manager')
        AND sm.is_active = true
    )
  );

CREATE POLICY "Owners can delete permissions"
  ON role_permissions FOR DELETE
  TO authenticated
  USING (
    hotel_id IN (
      SELECT sm.hotel_id FROM staff_members sm
      WHERE sm.user_id = auth.uid()
        AND sm.role = 'owner'
        AND sm.is_active = true
    )
  );

-- Step 6: Seed default permissions for all existing hotels
DO $$
DECLARE
  v_hotel record;
  v_role text;
  v_module text;
  v_view bool;
  v_create bool;
  v_edit bool;
  v_delete bool;
BEGIN
  FOR v_hotel IN SELECT id FROM hotels LOOP
    FOR v_role IN SELECT unnest(ARRAY['owner','manager','front_desk','housekeeping','maintenance','accountant','readonly']::text[]) LOOP
      FOR v_module IN SELECT unnest(ARRAY['dashboard','front_desk','reservations','rooms','guests','billing','housekeeping','maintenance','reports','settings','channel_manager','booking_engine','payments','invoicing','guest_portal']::text[]) LOOP
        
        v_view   := false;
        v_create := false;
        v_edit   := false;
        v_delete := false;

        IF v_role = 'owner' THEN
          v_view := true; v_create := true; v_edit := true; v_delete := true;

        ELSIF v_role = 'manager' THEN
          v_view := true; v_create := true; v_edit := true;
          v_delete := CASE WHEN v_module NOT IN ('settings','payments') THEN true ELSE false END;

        ELSIF v_role = 'front_desk' THEN
          IF v_module IN ('dashboard','front_desk','reservations','rooms','guests','billing','guest_portal') THEN
            v_view := true; v_create := true; v_edit := true;
          ELSIF v_module IN ('housekeeping','maintenance','reports','invoicing','channel_manager','booking_engine') THEN
            v_view := true;
          END IF;

        ELSIF v_role = 'housekeeping' THEN
          IF v_module IN ('housekeeping','maintenance') THEN
            v_view := true; v_create := true; v_edit := true;
          ELSIF v_module IN ('dashboard','rooms') THEN
            v_view := true;
          END IF;

        ELSIF v_role = 'maintenance' THEN
          IF v_module IN ('maintenance','housekeeping') THEN
            v_view := true; v_create := true; v_edit := true;
          ELSIF v_module = 'dashboard' THEN
            v_view := true;
          END IF;

        ELSIF v_role = 'accountant' THEN
          IF v_module IN ('payments','invoicing','billing','reports') THEN
            v_view := true; v_create := true; v_edit := true;
          ELSIF v_module IN ('dashboard','reservations','rooms','guests') THEN
            v_view := true;
          END IF;

        ELSIF v_role = 'readonly' THEN
          IF v_module NOT IN ('settings') THEN
            v_view := true;
          END IF;
        END IF;

        INSERT INTO role_permissions (hotel_id, role, module, can_view, can_create, can_edit, can_delete)
        VALUES (v_hotel.id, v_role, v_module, v_view, v_create, v_edit, v_delete)
        ON CONFLICT (hotel_id, role, module) DO NOTHING;

      END LOOP;
    END LOOP;
  END LOOP;
END $$;
