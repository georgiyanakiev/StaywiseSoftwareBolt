-- The staff privilege trigger function should only run as a trigger, never as
-- a callable RPC.
REVOKE EXECUTE ON FUNCTION public.enforce_staff_member_privileges() FROM PUBLIC, anon, authenticated;
