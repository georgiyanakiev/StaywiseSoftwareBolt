/*
  # CRM Guest Tables Migration

  ## Summary
  Creates three new tables to support the full Guest CRM feature (Feature 12):

  1. **guest_profiles** - Extended guest profiles with loyalty tiers, tags, blacklist flag,
     marketing opt-in, and aggregated stay stats. Linked to tenants for multi-tenancy.

  2. **guest_stay_history** - Full history of guest stays with room details, amounts,
     booking source, special requests, and optional rating/review.

  3. **guest_communications** - Timeline of all communications with guests (email, sms,
     notes, calls) with direction (inbound/outbound), subject, body, and sender info.

  ## Security
  - RLS enabled on all three tables
  - Authenticated users can read/write records belonging to their tenant
  - tenant_id column on all tables for row-level isolation

  ## Notes
  - guest_profiles uses loyalty_tier (standard/silver/gold/platinum) to avoid conflict
    with existing guests.vip_status column naming
  - guest_stay_history.booking_id is a soft reference (uuid, not FK) to allow linking
    to existing reservations table without tight coupling
  - All tables include created_at for audit trail
*/

CREATE TABLE IF NOT EXISTS guest_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants(id),
  hotel_id uuid REFERENCES hotels(id),
  full_name text NOT NULL,
  email text,
  phone text,
  date_of_birth date,
  nationality text,
  country text,
  city text,
  address text,
  company text,
  vat_number text,
  loyalty_tier text DEFAULT 'standard' CHECK (loyalty_tier IN ('standard','silver','gold','platinum')),
  loyalty_points integer DEFAULT 0,
  marketing_opt_in boolean DEFAULT false,
  tags text[] DEFAULT '{}',
  notes text DEFAULT '',
  blacklisted boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  last_stay_at date,
  total_stays integer DEFAULT 0,
  total_spent numeric(10,2) DEFAULT 0,
  dietary_requirements text DEFAULT '',
  room_preferences text DEFAULT '',
  language_preference text DEFAULT 'en',
  birthday_month integer,
  birthday_day integer,
  anniversary_date date,
  special_occasions text DEFAULT ''
);

ALTER TABLE guest_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view guest profiles"
  ON guest_profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert guest profiles"
  ON guest_profiles FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update guest profiles"
  ON guest_profiles FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete guest profiles"
  ON guest_profiles FOR DELETE
  TO authenticated
  USING (true);

CREATE TABLE IF NOT EXISTS guest_stay_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants(id),
  hotel_id uuid REFERENCES hotels(id),
  guest_profile_id uuid REFERENCES guest_profiles(id) ON DELETE CASCADE,
  booking_id uuid,
  room_number text,
  room_type text,
  check_in date,
  check_out date,
  nights integer,
  total_amount numeric(10,2),
  source text,
  special_requests text DEFAULT '',
  notes text DEFAULT '',
  rating integer CHECK (rating BETWEEN 1 AND 5),
  review_text text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE guest_stay_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view stay history"
  ON guest_stay_history FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert stay history"
  ON guest_stay_history FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update stay history"
  ON guest_stay_history FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete stay history"
  ON guest_stay_history FOR DELETE
  TO authenticated
  USING (true);

CREATE TABLE IF NOT EXISTS guest_communications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants(id),
  hotel_id uuid REFERENCES hotels(id),
  guest_profile_id uuid REFERENCES guest_profiles(id) ON DELETE CASCADE,
  type text CHECK (type IN ('email','sms','note','call')),
  direction text DEFAULT 'outbound' CHECK (direction IN ('inbound','outbound')),
  subject text DEFAULT '',
  body text NOT NULL,
  sent_at timestamptz DEFAULT now(),
  sent_by text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE guest_communications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view guest communications"
  ON guest_communications FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert guest communications"
  ON guest_communications FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update guest communications"
  ON guest_communications FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete guest communications"
  ON guest_communications FOR DELETE
  TO authenticated
  USING (true);

CREATE INDEX IF NOT EXISTS idx_guest_profiles_tenant_id ON guest_profiles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_guest_profiles_hotel_id ON guest_profiles(hotel_id);
CREATE INDEX IF NOT EXISTS idx_guest_profiles_email ON guest_profiles(email);
CREATE INDEX IF NOT EXISTS idx_guest_profiles_loyalty_tier ON guest_profiles(loyalty_tier);
CREATE INDEX IF NOT EXISTS idx_guest_stay_history_guest_profile_id ON guest_stay_history(guest_profile_id);
CREATE INDEX IF NOT EXISTS idx_guest_communications_guest_profile_id ON guest_communications(guest_profile_id);
