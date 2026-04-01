/*
  # Create Onboarding Emails Tracking Table

  ## Purpose
  Tracks the three-email onboarding sequence sent to new users:
  1. Welcome email — sent immediately on signup
  2. Setup guide — sent ~24 hours after signup
  3. Day-3 check-in — sent ~72 hours after signup

  ## New Tables
  - `onboarding_emails`
    - `id` (uuid, primary key)
    - `user_id` (uuid, references auth.users)
    - `email` (text) — recipient address
    - `first_name` (text)
    - `email_type` (text) — 'welcome' | 'setup_guide' | 'day3_checkin'
    - `scheduled_at` (timestamptz) — when this email is due to send
    - `sent_at` (timestamptz, nullable) — when it was actually sent
    - `status` (text) — 'pending' | 'sent' | 'failed'
    - `error_message` (text, nullable) — error details if failed
    - `created_at` (timestamptz)

  ## Security
  - RLS enabled; only the service role (edge functions) can insert/update
  - Authenticated users can view their own onboarding email records
*/

CREATE TABLE IF NOT EXISTS onboarding_emails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  first_name text NOT NULL DEFAULT '',
  email_type text NOT NULL CHECK (email_type IN ('welcome', 'setup_guide', 'day3_checkin')),
  scheduled_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_onboarding_emails_user_id ON onboarding_emails(user_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_emails_status_scheduled ON onboarding_emails(status, scheduled_at) WHERE status = 'pending';

ALTER TABLE onboarding_emails ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own onboarding emails"
  ON onboarding_emails FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);
