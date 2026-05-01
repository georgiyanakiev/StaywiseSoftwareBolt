/*
  # Lock down remaining SECURITY DEFINER functions

  ## Why
  The linter flags `admin_list_users` and `store_channel_secret` because
  the `authenticated` role can call them via PostgREST. Both must stay
  SECURITY DEFINER to reach `auth.users` and `vault.secrets`
  respectively, so the only way to clear the warnings is to revoke
  EXECUTE from `authenticated` and `anon`.

  ## Changes
  1. Revoke EXECUTE from PUBLIC, anon, authenticated on both functions.
  2. Callers now go through dedicated edge functions
     (`admin-list-users`, `store-channel-secret`) that run as
     `service_role`, authenticate the caller, and enforce role checks.

  ## Notes
  - `service_role` has EXECUTE by default and is unaffected.
  - No data is lost; this is a pure privilege change.
*/

REVOKE EXECUTE ON FUNCTION public.admin_list_users() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.store_channel_secret(uuid, text, text) FROM PUBLIC, anon, authenticated;
