/*
  # Create Owner Portal Tables

  ## Summary
  Creates three new tables to support the property owner portal feature:
  property_owners, owner_properties, and owner_statements.

  ## New Tables

  ### property_owners
  - Stores individual property owner accounts linked to auth users and tenants
  - Tracks commission rate, bank IBAN, company info
  - `user_id` allows owners to log in and view their own portal

  ### owner_properties
  - Maps rooms to owners with ownership percentage
  - Tracks per-room monthly expenses
  - A room can have multiple partial owners (ownership_pct sums to 100)

  ### owner_statements
  - Monthly/periodic financial statements for each owner
  - Tracks gross revenue, management fee, expenses, net payout
  - Status: draft → sent → paid

  ## Security
  - RLS enabled on all three tables
  - Staff (hotel employees) can view/manage all records for their hotel
  - Owners can only view their own records (via user_id match)

  ## Notes
  - owner_properties references rooms(id) for room-level tracking
  - Statements are calculated from reservations for rooms assigned to that owner
*/

-- =============================================
-- property_owners
-- =============================================
CREATE TABLE IF NOT EXISTS property_owners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid REFERENCES hotels(id) ON DELETE CASCADE,
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  full_name text NOT NULL,
  email text NOT NULL,
  phone text DEFAULT '',
  company_name text DEFAULT '',
  bank_iban text DEFAULT '',
  commission_rate numeric(5,2) DEFAULT 20,
  active boolean DEFAULT true,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE property_owners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view property owners for their hotel"
  ON property_owners FOR SELECT
  TO authenticated
  USING (
    hotel_id IN (
      SELECT sm.hotel_id FROM staff_members sm
      WHERE sm.user_id = auth.uid() AND sm.is_active = true
    )
    OR user_id = auth.uid()
  );

CREATE POLICY "Staff owners and managers can insert property owners"
  ON property_owners FOR INSERT
  TO authenticated
  WITH CHECK (
    hotel_id IN (
      SELECT sm.hotel_id FROM staff_members sm
      WHERE sm.user_id = auth.uid()
        AND sm.role IN ('owner', 'manager')
        AND sm.is_active = true
    )
  );

CREATE POLICY "Staff owners and managers can update property owners"
  ON property_owners FOR UPDATE
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

CREATE POLICY "Hotel owners can delete property owners"
  ON property_owners FOR DELETE
  TO authenticated
  USING (
    hotel_id IN (
      SELECT sm.hotel_id FROM staff_members sm
      WHERE sm.user_id = auth.uid()
        AND sm.role = 'owner'
        AND sm.is_active = true
    )
  );

CREATE INDEX IF NOT EXISTS idx_property_owners_hotel_id ON property_owners(hotel_id);
CREATE INDEX IF NOT EXISTS idx_property_owners_user_id ON property_owners(user_id);

-- =============================================
-- owner_properties
-- =============================================
CREATE TABLE IF NOT EXISTS owner_properties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid REFERENCES hotels(id) ON DELETE CASCADE,
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL REFERENCES property_owners(id) ON DELETE CASCADE,
  room_id uuid REFERENCES rooms(id) ON DELETE SET NULL,
  room_number text DEFAULT '',
  ownership_pct numeric(5,2) DEFAULT 100,
  monthly_expenses numeric(10,2) DEFAULT 0,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE owner_properties ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view owner properties for their hotel"
  ON owner_properties FOR SELECT
  TO authenticated
  USING (
    hotel_id IN (
      SELECT sm.hotel_id FROM staff_members sm
      WHERE sm.user_id = auth.uid() AND sm.is_active = true
    )
    OR owner_id IN (
      SELECT po.id FROM property_owners po
      WHERE po.user_id = auth.uid()
    )
  );

CREATE POLICY "Owners and managers can insert owner properties"
  ON owner_properties FOR INSERT
  TO authenticated
  WITH CHECK (
    hotel_id IN (
      SELECT sm.hotel_id FROM staff_members sm
      WHERE sm.user_id = auth.uid()
        AND sm.role IN ('owner', 'manager')
        AND sm.is_active = true
    )
  );

CREATE POLICY "Owners and managers can update owner properties"
  ON owner_properties FOR UPDATE
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

CREATE POLICY "Hotel owners can delete owner properties"
  ON owner_properties FOR DELETE
  TO authenticated
  USING (
    hotel_id IN (
      SELECT sm.hotel_id FROM staff_members sm
      WHERE sm.user_id = auth.uid()
        AND sm.role = 'owner'
        AND sm.is_active = true
    )
  );

CREATE INDEX IF NOT EXISTS idx_owner_properties_owner_id ON owner_properties(owner_id);
CREATE INDEX IF NOT EXISTS idx_owner_properties_hotel_id ON owner_properties(hotel_id);
CREATE INDEX IF NOT EXISTS idx_owner_properties_room_id ON owner_properties(room_id);

-- =============================================
-- owner_statements
-- =============================================
CREATE TABLE IF NOT EXISTS owner_statements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid REFERENCES hotels(id) ON DELETE CASCADE,
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL REFERENCES property_owners(id) ON DELETE CASCADE,
  period_start date NOT NULL,
  period_end date NOT NULL,
  gross_revenue numeric(10,2) DEFAULT 0,
  management_fee numeric(10,2) DEFAULT 0,
  expenses numeric(10,2) DEFAULT 0,
  net_payout numeric(10,2) DEFAULT 0,
  booking_count integer DEFAULT 0,
  occupancy_rate numeric(5,2) DEFAULT 0,
  avg_daily_rate numeric(10,2) DEFAULT 0,
  status text DEFAULT 'draft' CHECK (status IN ('draft','sent','paid')),
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE owner_statements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view statements for their hotel"
  ON owner_statements FOR SELECT
  TO authenticated
  USING (
    hotel_id IN (
      SELECT sm.hotel_id FROM staff_members sm
      WHERE sm.user_id = auth.uid() AND sm.is_active = true
    )
    OR owner_id IN (
      SELECT po.id FROM property_owners po
      WHERE po.user_id = auth.uid()
    )
  );

CREATE POLICY "Owners and managers can insert statements"
  ON owner_statements FOR INSERT
  TO authenticated
  WITH CHECK (
    hotel_id IN (
      SELECT sm.hotel_id FROM staff_members sm
      WHERE sm.user_id = auth.uid()
        AND sm.role IN ('owner', 'manager')
        AND sm.is_active = true
    )
  );

CREATE POLICY "Owners and managers can update statements"
  ON owner_statements FOR UPDATE
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

CREATE POLICY "Hotel owners can delete statements"
  ON owner_statements FOR DELETE
  TO authenticated
  USING (
    hotel_id IN (
      SELECT sm.hotel_id FROM staff_members sm
      WHERE sm.user_id = auth.uid()
        AND sm.role = 'owner'
        AND sm.is_active = true
    )
  );

CREATE INDEX IF NOT EXISTS idx_owner_statements_owner_id ON owner_statements(owner_id);
CREATE INDEX IF NOT EXISTS idx_owner_statements_hotel_id ON owner_statements(hotel_id);
CREATE INDEX IF NOT EXISTS idx_owner_statements_period ON owner_statements(period_start, period_end);
