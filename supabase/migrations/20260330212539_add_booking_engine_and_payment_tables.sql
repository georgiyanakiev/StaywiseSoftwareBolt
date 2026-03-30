/*
  # Booking Engine and Payment Automation Tables

  ## Summary
  Adds tables for the direct booking widget and payment automation rules/transactions.

  ## New Tables
  - `booking_engine_config` — Branding and settings for the public booking widget
  - `direct_bookings` — Bookings made via the hotel's own website widget
  - `payment_rules` — Automated payment trigger rules (deposit, pre-auth, balance)
  - `payment_transactions` — Full ledger of all payment events

  ## Security
  - RLS enabled on all tables
  - direct_bookings allows anonymous insert (public widget) but only staff can read
*/

CREATE TABLE IF NOT EXISTS booking_engine_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid REFERENCES hotels(id),
  primary_color text DEFAULT '#1a56db',
  logo_url text DEFAULT '',
  welcome_message text DEFAULT 'Welcome! Book your stay directly with us.',
  cancellation_policy text DEFAULT 'Free cancellation up to 24 hours before check-in.',
  check_in_time text DEFAULT '15:00',
  check_out_time text DEFAULT '11:00',
  currency text DEFAULT 'EUR',
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE booking_engine_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view booking engine config"
  ON booking_engine_config FOR SELECT
  TO authenticated
  USING (
    hotel_id IN (SELECT hotel_id FROM staff_members WHERE user_id = auth.uid() AND is_active = true)
  );

CREATE POLICY "Staff can insert booking engine config"
  ON booking_engine_config FOR INSERT
  TO authenticated
  WITH CHECK (
    hotel_id IN (SELECT hotel_id FROM staff_members WHERE user_id = auth.uid() AND is_active = true)
  );

CREATE POLICY "Staff can update booking engine config"
  ON booking_engine_config FOR UPDATE
  TO authenticated
  USING (
    hotel_id IN (SELECT hotel_id FROM staff_members WHERE user_id = auth.uid() AND is_active = true)
  )
  WITH CHECK (
    hotel_id IN (SELECT hotel_id FROM staff_members WHERE user_id = auth.uid() AND is_active = true)
  );

CREATE TABLE IF NOT EXISTS direct_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid REFERENCES hotels(id),
  confirmation_number text UNIQUE NOT NULL,
  room_type_id uuid REFERENCES room_types(id),
  guest_name text NOT NULL,
  guest_email text NOT NULL,
  guest_phone text DEFAULT '',
  check_in date NOT NULL,
  check_out date NOT NULL,
  adults integer DEFAULT 1,
  children integer DEFAULT 0,
  rate_per_night numeric(10,2) DEFAULT 0,
  total_amount numeric(10,2) DEFAULT 0,
  deposit_amount numeric(10,2) DEFAULT 0,
  special_requests text DEFAULT '',
  status text DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled', 'checked_in', 'checked_out')),
  source text DEFAULT 'direct',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE direct_bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view direct bookings"
  ON direct_bookings FOR SELECT
  TO authenticated
  USING (
    hotel_id IN (SELECT hotel_id FROM staff_members WHERE user_id = auth.uid() AND is_active = true)
  );

CREATE POLICY "Anyone can create direct bookings"
  ON direct_bookings FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);

CREATE POLICY "Staff can update direct bookings"
  ON direct_bookings FOR UPDATE
  TO authenticated
  USING (
    hotel_id IN (SELECT hotel_id FROM staff_members WHERE user_id = auth.uid() AND is_active = true)
  )
  WITH CHECK (
    hotel_id IN (SELECT hotel_id FROM staff_members WHERE user_id = auth.uid() AND is_active = true)
  );

CREATE TABLE IF NOT EXISTS payment_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid REFERENCES hotels(id),
  name text NOT NULL,
  trigger text NOT NULL CHECK (trigger IN ('on_booking', 'days_before_arrival', 'on_checkin', 'on_checkout')),
  days_before integer,
  amount_type text NOT NULL CHECK (amount_type IN ('percentage', 'fixed', 'first_night', 'full_amount')),
  amount_value numeric(10,2) DEFAULT 0,
  payment_type text NOT NULL CHECK (payment_type IN ('charge', 'pre_authorisation', 'deposit')),
  applies_to text DEFAULT 'all' CHECK (applies_to IN ('all', 'ota', 'direct')),
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE payment_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view payment rules"
  ON payment_rules FOR SELECT
  TO authenticated
  USING (
    hotel_id IN (SELECT hotel_id FROM staff_members WHERE user_id = auth.uid() AND is_active = true)
  );

CREATE POLICY "Staff can insert payment rules"
  ON payment_rules FOR INSERT
  TO authenticated
  WITH CHECK (
    hotel_id IN (SELECT hotel_id FROM staff_members WHERE user_id = auth.uid() AND is_active = true)
  );

CREATE POLICY "Staff can update payment rules"
  ON payment_rules FOR UPDATE
  TO authenticated
  USING (
    hotel_id IN (SELECT hotel_id FROM staff_members WHERE user_id = auth.uid() AND is_active = true)
  )
  WITH CHECK (
    hotel_id IN (SELECT hotel_id FROM staff_members WHERE user_id = auth.uid() AND is_active = true)
  );

CREATE POLICY "Staff can delete payment rules"
  ON payment_rules FOR DELETE
  TO authenticated
  USING (
    hotel_id IN (SELECT hotel_id FROM staff_members WHERE user_id = auth.uid() AND is_active = true)
  );

CREATE TABLE IF NOT EXISTS payment_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid REFERENCES hotels(id),
  booking_id uuid,
  guest_name text DEFAULT '',
  amount numeric(10,2) NOT NULL,
  currency text DEFAULT 'EUR',
  type text NOT NULL CHECK (type IN ('deposit', 'pre_auth', 'charge', 'refund')),
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'captured', 'failed', 'refunded')),
  payment_method text DEFAULT 'card' CHECK (payment_method IN ('card', 'bank_transfer', 'cash')),
  card_last4 text DEFAULT '',
  notes text DEFAULT '',
  scheduled_date date,
  processed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view payment transactions"
  ON payment_transactions FOR SELECT
  TO authenticated
  USING (
    hotel_id IN (SELECT hotel_id FROM staff_members WHERE user_id = auth.uid() AND is_active = true)
  );

CREATE POLICY "Staff can insert payment transactions"
  ON payment_transactions FOR INSERT
  TO authenticated
  WITH CHECK (
    hotel_id IN (SELECT hotel_id FROM staff_members WHERE user_id = auth.uid() AND is_active = true)
  );

CREATE POLICY "Staff can update payment transactions"
  ON payment_transactions FOR UPDATE
  TO authenticated
  USING (
    hotel_id IN (SELECT hotel_id FROM staff_members WHERE user_id = auth.uid() AND is_active = true)
  )
  WITH CHECK (
    hotel_id IN (SELECT hotel_id FROM staff_members WHERE user_id = auth.uid() AND is_active = true)
  );

CREATE INDEX IF NOT EXISTS idx_direct_bookings_hotel ON direct_bookings(hotel_id);
CREATE INDEX IF NOT EXISTS idx_payment_rules_hotel ON payment_rules(hotel_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_hotel ON payment_transactions(hotel_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_status ON payment_transactions(status);
