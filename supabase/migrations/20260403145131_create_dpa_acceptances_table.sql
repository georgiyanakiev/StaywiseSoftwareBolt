/*
  # Create DPA Acceptances Table

  ## Summary
  Creates the dpa_acceptances table to track which users/tenants have accepted
  the Data Processing Agreement (required for GDPR Art. 28 compliance).

  ## New Tables
  - `dpa_acceptances`
    - `id` (uuid, primary key)
    - `user_id` (uuid, FK to auth.users)
    - `tenant_id` (uuid, FK to tenants, nullable)
    - `accepted_at` (timestamptz)
    - `ip_address` (text, nullable)
    - `created_at` (timestamptz)

  ## Security
  - RLS enabled
  - Users can insert and read their own acceptances
*/

CREATE TABLE IF NOT EXISTS public.dpa_acceptances (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id   uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  accepted_at timestamptz NOT NULL DEFAULT now(),
  ip_address  text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dpa_acceptances_user_id   ON public.dpa_acceptances (user_id);
CREATE INDEX IF NOT EXISTS idx_dpa_acceptances_tenant_id ON public.dpa_acceptances (tenant_id);

ALTER TABLE public.dpa_acceptances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own DPA acceptance"
  ON public.dpa_acceptances
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can read their own DPA acceptance"
  ON public.dpa_acceptances
  FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));
