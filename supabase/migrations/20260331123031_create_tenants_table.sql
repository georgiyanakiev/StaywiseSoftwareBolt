
/*
  # Create Tenants Table for Multi-Tenancy

  ## Summary
  Creates the core tenants table that drives multi-tenancy across the entire platform.
  Each tenant maps to a hotel subdomain (e.g., grandhotel.staywisesoftware.com).

  ## New Tables
  - `tenants`
    - `id` (uuid, primary key)
    - `name` (text) — display name of the hotel/tenant
    - `subdomain` (text, unique) — URL slug used for subdomain routing
    - `custom_domain` (text, unique, nullable) — optional custom domain
    - `logo_url` (text, nullable) — tenant branding logo
    - `primary_color` (text) — hex color for branding, default #1a56db
    - `secondary_color` (text) — hex color for branding, default #f8fafc
    - `plan` (text) — subscription tier: starter | pro | enterprise
    - `active` (boolean) — whether tenant account is active
    - `stripe_customer_id` (text, nullable) — Stripe billing reference
    - `owner_email` (text, nullable) — primary contact email
    - `created_at` (timestamptz)

  ## Security
  - RLS enabled on tenants table
  - Public can read tenants by subdomain (needed for unauthenticated login page branding)
  - Authenticated staff can read their own tenant record

  ## Seed Data
  - Grand Hotel Sofia (subdomain: grandhotel)
  - Seaview Resort (subdomain: seaviewresort)
  - Demo Hotel (subdomain: demo)
*/

CREATE TABLE IF NOT EXISTS tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  subdomain text UNIQUE NOT NULL,
  custom_domain text UNIQUE,
  logo_url text,
  primary_color text DEFAULT '#1a56db',
  secondary_color text DEFAULT '#f8fafc',
  plan text DEFAULT 'starter' CHECK (plan IN ('starter', 'pro', 'enterprise')),
  active boolean DEFAULT true,
  stripe_customer_id text,
  owner_email text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read tenant by subdomain"
  ON tenants FOR SELECT
  TO anon, authenticated
  USING (active = true);

INSERT INTO tenants (name, subdomain, primary_color, owner_email, plan) VALUES
  ('Grand Hotel Sofia', 'grandhotel', '#1a56db', 'admin@grandhotel.com', 'pro'),
  ('Seaview Resort', 'seaviewresort', '#0f6e56', 'admin@seaviewresort.bg', 'starter'),
  ('Demo Hotel', 'demo', '#1a56db', 'georgi@staywisesoftware.com', 'enterprise')
ON CONFLICT (subdomain) DO NOTHING;
