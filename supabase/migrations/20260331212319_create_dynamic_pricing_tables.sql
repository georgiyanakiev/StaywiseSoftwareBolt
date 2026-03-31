/*
  # Create Dynamic Pricing / Revenue Management Tables

  ## Summary
  Creates three tables to support the AI-driven dynamic pricing (RMS) feature:
  pricing_rules, ai_price_suggestions, and competitor_rates.

  ## New Tables

  ### pricing_rules
  - Stores rule-based pricing logic per hotel: seasonal, event, occupancy triggers,
    last-minute discounts, early-bird rates, and day-of-week adjustments.
  - Each rule targets a room type (or all), a date range, and applies an adjustment
    (percentage up/down, fixed amount, or absolute rate).
  - Priority field controls which rule wins when multiple rules overlap.

  ### ai_price_suggestions
  - Stores AI-generated rate recommendations per room type per date.
  - Includes confidence score, reasoning text, and a structured factors JSONB blob.
  - applied/applied_at tracks whether the suggestion was accepted by a manager.

  ### competitor_rates
  - Stores manually or programmatically collected competitor rate snapshots.
  - Used as context when generating AI suggestions.

  ## Security
  - RLS enabled on all three tables.
  - Staff with hotel access can read all records.
  - Only owners/managers can insert, update, or delete.

  ## Notes
  - hotel_id added to all tables so RLS can check staff_members.hotel_id.
  - ai_price_suggestions can be inserted by the edge function via service role.
*/

-- =============================================
-- pricing_rules
-- =============================================
CREATE TABLE IF NOT EXISTS pricing_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid REFERENCES hotels(id) ON DELETE CASCADE,
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  type text CHECK (type IN ('base_rate','seasonal','event','occupancy','last_minute','early_bird','day_of_week')),
  room_type_id uuid REFERENCES room_types(id) ON DELETE SET NULL,
  date_from date,
  date_to date,
  days_of_week integer[] DEFAULT '{}',
  occupancy_threshold_pct numeric(5,2),
  days_before_arrival integer,
  adjustment_type text CHECK (adjustment_type IN ('percentage_increase','percentage_decrease','fixed_increase','fixed_decrease','set_rate')),
  adjustment_value numeric(10,2) DEFAULT 0,
  min_rate numeric(10,2),
  max_rate numeric(10,2),
  priority integer DEFAULT 0,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE pricing_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view pricing rules for their hotel"
  ON pricing_rules FOR SELECT
  TO authenticated
  USING (
    hotel_id IN (
      SELECT sm.hotel_id FROM staff_members sm
      WHERE sm.user_id = auth.uid() AND sm.is_active = true
    )
  );

CREATE POLICY "Owners and managers can insert pricing rules"
  ON pricing_rules FOR INSERT
  TO authenticated
  WITH CHECK (
    hotel_id IN (
      SELECT sm.hotel_id FROM staff_members sm
      WHERE sm.user_id = auth.uid()
        AND sm.role IN ('owner','manager')
        AND sm.is_active = true
    )
  );

CREATE POLICY "Owners and managers can update pricing rules"
  ON pricing_rules FOR UPDATE
  TO authenticated
  USING (
    hotel_id IN (
      SELECT sm.hotel_id FROM staff_members sm
      WHERE sm.user_id = auth.uid()
        AND sm.role IN ('owner','manager')
        AND sm.is_active = true
    )
  )
  WITH CHECK (
    hotel_id IN (
      SELECT sm.hotel_id FROM staff_members sm
      WHERE sm.user_id = auth.uid()
        AND sm.role IN ('owner','manager')
        AND sm.is_active = true
    )
  );

CREATE POLICY "Owners and managers can delete pricing rules"
  ON pricing_rules FOR DELETE
  TO authenticated
  USING (
    hotel_id IN (
      SELECT sm.hotel_id FROM staff_members sm
      WHERE sm.user_id = auth.uid()
        AND sm.role IN ('owner','manager')
        AND sm.is_active = true
    )
  );

CREATE INDEX IF NOT EXISTS idx_pricing_rules_hotel_id ON pricing_rules(hotel_id);
CREATE INDEX IF NOT EXISTS idx_pricing_rules_room_type_id ON pricing_rules(room_type_id);
CREATE INDEX IF NOT EXISTS idx_pricing_rules_dates ON pricing_rules(date_from, date_to);

-- =============================================
-- ai_price_suggestions
-- =============================================
CREATE TABLE IF NOT EXISTS ai_price_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid REFERENCES hotels(id) ON DELETE CASCADE,
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE,
  room_type_id uuid REFERENCES room_types(id) ON DELETE CASCADE,
  date date NOT NULL,
  current_rate numeric(10,2),
  suggested_rate numeric(10,2),
  confidence_score integer CHECK (confidence_score BETWEEN 0 AND 100),
  reasoning text DEFAULT '',
  factors jsonb DEFAULT '{}',
  applied boolean DEFAULT false,
  applied_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE ai_price_suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view AI suggestions for their hotel"
  ON ai_price_suggestions FOR SELECT
  TO authenticated
  USING (
    hotel_id IN (
      SELECT sm.hotel_id FROM staff_members sm
      WHERE sm.user_id = auth.uid() AND sm.is_active = true
    )
  );

CREATE POLICY "Owners and managers can insert AI suggestions"
  ON ai_price_suggestions FOR INSERT
  TO authenticated
  WITH CHECK (
    hotel_id IN (
      SELECT sm.hotel_id FROM staff_members sm
      WHERE sm.user_id = auth.uid()
        AND sm.role IN ('owner','manager')
        AND sm.is_active = true
    )
  );

CREATE POLICY "Owners and managers can update AI suggestions"
  ON ai_price_suggestions FOR UPDATE
  TO authenticated
  USING (
    hotel_id IN (
      SELECT sm.hotel_id FROM staff_members sm
      WHERE sm.user_id = auth.uid()
        AND sm.role IN ('owner','manager')
        AND sm.is_active = true
    )
  )
  WITH CHECK (
    hotel_id IN (
      SELECT sm.hotel_id FROM staff_members sm
      WHERE sm.user_id = auth.uid()
        AND sm.role IN ('owner','manager')
        AND sm.is_active = true
    )
  );

CREATE POLICY "Owners and managers can delete AI suggestions"
  ON ai_price_suggestions FOR DELETE
  TO authenticated
  USING (
    hotel_id IN (
      SELECT sm.hotel_id FROM staff_members sm
      WHERE sm.user_id = auth.uid()
        AND sm.role IN ('owner','manager')
        AND sm.is_active = true
    )
  );

CREATE INDEX IF NOT EXISTS idx_ai_suggestions_hotel_id ON ai_price_suggestions(hotel_id);
CREATE INDEX IF NOT EXISTS idx_ai_suggestions_room_type_date ON ai_price_suggestions(room_type_id, date);

-- =============================================
-- competitor_rates
-- =============================================
CREATE TABLE IF NOT EXISTS competitor_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid REFERENCES hotels(id) ON DELETE CASCADE,
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE,
  competitor_name text NOT NULL DEFAULT '',
  room_category text DEFAULT '',
  date date,
  rate numeric(10,2),
  source text DEFAULT '',
  fetched_at timestamptz DEFAULT now()
);

ALTER TABLE competitor_rates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view competitor rates for their hotel"
  ON competitor_rates FOR SELECT
  TO authenticated
  USING (
    hotel_id IN (
      SELECT sm.hotel_id FROM staff_members sm
      WHERE sm.user_id = auth.uid() AND sm.is_active = true
    )
  );

CREATE POLICY "Owners and managers can insert competitor rates"
  ON competitor_rates FOR INSERT
  TO authenticated
  WITH CHECK (
    hotel_id IN (
      SELECT sm.hotel_id FROM staff_members sm
      WHERE sm.user_id = auth.uid()
        AND sm.role IN ('owner','manager')
        AND sm.is_active = true
    )
  );

CREATE POLICY "Owners and managers can delete competitor rates"
  ON competitor_rates FOR DELETE
  TO authenticated
  USING (
    hotel_id IN (
      SELECT sm.hotel_id FROM staff_members sm
      WHERE sm.user_id = auth.uid()
        AND sm.role IN ('owner','manager')
        AND sm.is_active = true
    )
  );

CREATE INDEX IF NOT EXISTS idx_competitor_rates_hotel_id ON competitor_rates(hotel_id);
CREATE INDEX IF NOT EXISTS idx_competitor_rates_date ON competitor_rates(date);
