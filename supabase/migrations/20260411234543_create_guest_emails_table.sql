/*
  # Create guest emails tracking table

  1. New Tables
    - `guest_emails`
      - `id` (uuid, primary key)
      - `hotel_id` (uuid, FK to hotels)
      - `reservation_id` (uuid, FK to reservations)
      - `guest_id` (uuid, FK to guests)
      - `email_type` (text) — confirmation, checkin_reminder, checkout_thankyou
      - `to_email` (text) — recipient address
      - `subject` (text) — email subject line
      - `language` (text) — bg or en
      - `status` (text) — pending, sent, failed, skipped
      - `resend_id` (text) — Resend message ID
      - `error_message` (text)
      - `sent_at` (timestamptz)
      - `scheduled_for` (timestamptz) — when the email should be sent
      - `created_at` (timestamptz)

  2. Security
    - RLS enabled
    - Staff members of the same hotel can read email logs

  3. Important Notes
    - Unique constraint on (reservation_id, email_type) prevents duplicate sends
    - Index on scheduled_for + status for efficient cron queries
*/

CREATE TABLE IF NOT EXISTS public.guest_emails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid NOT NULL REFERENCES public.hotels(id),
  reservation_id uuid NOT NULL REFERENCES public.reservations(id),
  guest_id uuid REFERENCES public.guests(id),
  email_type text NOT NULL DEFAULT '',
  to_email text NOT NULL DEFAULT '',
  subject text NOT NULL DEFAULT '',
  language text NOT NULL DEFAULT 'en',
  status text NOT NULL DEFAULT 'pending',
  resend_id text DEFAULT '',
  error_message text DEFAULT '',
  sent_at timestamptz,
  scheduled_for timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_guest_emails_reservation_type
  ON public.guest_emails (reservation_id, email_type);

CREATE INDEX IF NOT EXISTS idx_guest_emails_scheduled_pending
  ON public.guest_emails (scheduled_for, status)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_guest_emails_hotel_id
  ON public.guest_emails (hotel_id);

ALTER TABLE public.guest_emails ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view hotel email logs"
  ON public.guest_emails
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.staff_members sm
      WHERE sm.user_id = auth.uid()
        AND sm.hotel_id = guest_emails.hotel_id
    )
  );

CREATE POLICY "Staff can insert email logs for their hotel"
  ON public.guest_emails
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.staff_members sm
      WHERE sm.user_id = auth.uid()
        AND sm.hotel_id = guest_emails.hotel_id
    )
  );
