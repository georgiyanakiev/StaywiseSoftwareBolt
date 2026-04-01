/*
  # Fix RLS Auth Initialization Plan for onboarding_emails

  ## Summary
  Replaces direct auth.uid() calls in RLS policies with (select auth.uid()) subquery form.
  This allows Postgres to evaluate the auth function once per query rather than once per row,
  significantly improving performance at scale.

  ## Changes
  - Drops and recreates the "Users can view own onboarding emails" policy on onboarding_emails
    using the recommended (select auth.uid()) pattern
*/

DROP POLICY IF EXISTS "Users can view own onboarding emails" ON public.onboarding_emails;

CREATE POLICY "Users can view own onboarding emails"
  ON public.onboarding_emails
  FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));
