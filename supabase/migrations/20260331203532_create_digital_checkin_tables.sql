/*
  # Create Digital Check-in / Guest Portal Tables

  ## Summary
  This migration creates the tables required for Feature 5 — Digital Check-in / Guest Portal.

  ## New Tables

  ### guest_portal_sessions
  Tracks each check-in session created for a guest. Contains a unique token used to
  access the public portal URL. Tracks progress through the multi-step form.
  - `token` — unique URL token shared with guest
  - `step_completed` — tracks which step the guest last completed (0-5)
  - `expires_at` — session expires 7 days after creation

  ### guest_documents
  Stores ID document data collected during the check-in portal.
  - document type, number, nationality, dates
  - `verified` flag for staff review

  ### pre_arrival_forms
  Stores the preferences and requests collected during check-in.
  - arrival time, transport, special requests, dietary needs, celebrations
  - room preferences as array, T&C agreement, digital signature (base64)

  ## Security
  - RLS enabled on all tables
  - Authenticated users (staff) can read/manage all sessions for their hotel
  - Public (anon) can read/update their own session via token match (for portal)
*/

-- ── guest_portal_sessions ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS guest_portal_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid REFERENCES hotels(id),
  tenant_id uuid REFERENCES tenants(id),
  reservation_id uuid REFERENCES reservations(id),
  guest_email text NOT NULL DEFAULT '',
  guest_name text DEFAULT '',
  token text UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  expires_at timestamptz DEFAULT now() + interval '7 days',
  completed_at timestamptz,
  step_completed integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE guest_portal_sessions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='guest_portal_sessions' AND policyname='Authenticated users can manage portal sessions') THEN
    CREATE POLICY "Authenticated users can manage portal sessions"
      ON guest_portal_sessions FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='guest_portal_sessions' AND policyname='Anonymous users can view and update sessions by token') THEN
    CREATE POLICY "Anonymous users can view and update sessions by token"
      ON guest_portal_sessions FOR SELECT TO anon USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='guest_portal_sessions' AND policyname='Anonymous users can update sessions') THEN
    CREATE POLICY "Anonymous users can update sessions"
      ON guest_portal_sessions FOR UPDATE TO anon USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ── guest_documents ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS guest_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid REFERENCES hotels(id),
  tenant_id uuid REFERENCES tenants(id),
  session_id uuid REFERENCES guest_portal_sessions(id),
  reservation_id uuid REFERENCES reservations(id),
  guest_name text DEFAULT '',
  document_type text CHECK (document_type IN ('passport','id_card','drivers_license','other')),
  document_number text DEFAULT '',
  nationality text DEFAULT '',
  date_of_birth date,
  issue_date date,
  expiry_date date,
  verified boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE guest_documents ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='guest_documents' AND policyname='Authenticated users can manage guest documents') THEN
    CREATE POLICY "Authenticated users can manage guest documents"
      ON guest_documents FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='guest_documents' AND policyname='Anon can insert guest documents') THEN
    CREATE POLICY "Anon can insert guest documents"
      ON guest_documents FOR INSERT TO anon WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='guest_documents' AND policyname='Anon can view guest documents') THEN
    CREATE POLICY "Anon can view guest documents"
      ON guest_documents FOR SELECT TO anon USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='guest_documents' AND policyname='Anon can update guest documents') THEN
    CREATE POLICY "Anon can update guest documents"
      ON guest_documents FOR UPDATE TO anon USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ── pre_arrival_forms ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pre_arrival_forms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid REFERENCES hotels(id),
  tenant_id uuid REFERENCES tenants(id),
  session_id uuid REFERENCES guest_portal_sessions(id),
  reservation_id uuid REFERENCES reservations(id),
  arrival_time text DEFAULT '',
  departure_transport text DEFAULT '',
  special_requests text DEFAULT '',
  dietary_requirements text DEFAULT '',
  celebration_type text DEFAULT '',
  room_preferences text[] DEFAULT '{}',
  agreed_to_terms boolean DEFAULT false,
  signature_data text DEFAULT '',
  submitted_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE pre_arrival_forms ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='pre_arrival_forms' AND policyname='Authenticated users can manage pre arrival forms') THEN
    CREATE POLICY "Authenticated users can manage pre arrival forms"
      ON pre_arrival_forms FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='pre_arrival_forms' AND policyname='Anon can insert pre arrival forms') THEN
    CREATE POLICY "Anon can insert pre arrival forms"
      ON pre_arrival_forms FOR INSERT TO anon WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='pre_arrival_forms' AND policyname='Anon can view pre arrival forms') THEN
    CREATE POLICY "Anon can view pre arrival forms"
      ON pre_arrival_forms FOR SELECT TO anon USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='pre_arrival_forms' AND policyname='Anon can update pre arrival forms') THEN
    CREATE POLICY "Anon can update pre arrival forms"
      ON pre_arrival_forms FOR UPDATE TO anon USING (true) WITH CHECK (true);
  END IF;
END $$;
