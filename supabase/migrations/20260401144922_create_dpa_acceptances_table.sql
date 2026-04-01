/*
  # Create DPA Acceptances Table

  ## Summary
  Creates the `dpa_acceptances` table to record when hotel account holders (tenants) accept
  the GDPR Article 28 Data Processing Agreement. This provides an audit trail of consent.

  ## New Tables
  - `dpa_acceptances`
    - `id` (uuid, PK) — unique acceptance record
    - `tenant_id` (uuid, FK → tenants) — which tenant accepted
    - `user_id` (uuid, FK → auth.users) — which user clicked "I accept"
    - `accepted_at` (timestamptz) — timestamp of acceptance
    - `ip_address` (text) — client IP at time of acceptance (for audit)
    - `user_agent` (text) — browser user agent at time of acceptance
    - `dpa_version` (text) — version of the DPA accepted (default '1.0')

  ## Security
  - RLS enabled: users can only insert/read their own acceptance records
  - Separate insert and select policies

  ## Notes
  - One acceptance per tenant is sufficient; the app checks if ANY acceptance exists for the tenant
  - Records are intentionally not deletable by the user (legal audit requirement)
*/

CREATE TABLE IF NOT EXISTS dpa_acceptances (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid REFERENCES tenants(id) ON DELETE SET NULL,
  user_id     uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  accepted_at timestamptz NOT NULL DEFAULT now(),
  ip_address  text,
  user_agent  text,
  dpa_version text NOT NULL DEFAULT '1.0'
);

CREATE INDEX IF NOT EXISTS dpa_acceptances_tenant_id_idx ON dpa_acceptances(tenant_id);
CREATE INDEX IF NOT EXISTS dpa_acceptances_user_id_idx   ON dpa_acceptances(user_id);

ALTER TABLE dpa_acceptances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can insert own dpa acceptance"
  ON dpa_acceptances
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Authenticated users can view own dpa acceptances"
  ON dpa_acceptances
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);
