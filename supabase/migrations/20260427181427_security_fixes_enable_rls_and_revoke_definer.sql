/*
  # Security hardening batch

  ## Changes
  1. Enable RLS on `hotels` and `user_hotel_assignments` (policies already exist)
  2. Drop duplicate / overly-permissive / recursive policies that would
     either bypass RLS (`WITH CHECK true`) or cause infinite recursion when
     RLS is enabled on `user_hotel_assignments`
  3. Recreate owner-management policies using a SECURITY DEFINER helper
     `is_owner_of_tenant(uuid)` to break the recursion
  4. Revoke EXECUTE from `anon` on every SECURITY DEFINER function flagged
     by the linter so they cannot be called via the REST `/rpc` endpoint
  5. Revoke EXECUTE from `authenticated` (and `public`) on internal trigger
     and admin-only functions that should never be reachable from the
     client (`auto_create_*`, `log_*`, `sync_*`, `fn_auto_create_*`,
     `disable_tenants_rls`, `rls_auto_enable`, `convert_booking_to_reservation`,
     `create_transaction_on_invoice_paid`)

  ## Notes
  - Trigger functions still execute correctly because triggers run as
    table owner regardless of REST grants
  - User-facing RPCs (`lobby_get_my_hotels`, `get_user_hotels`, etc.)
    keep EXECUTE for `authenticated`
  - Leaked-password protection is an Auth setting that must be toggled
    in the Supabase dashboard; it cannot be set via SQL
*/

-- ============================================================
-- 1. Helper to break recursion on user_hotel_assignments
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_owner_of_tenant(p_tenant_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_hotel_assignments
    WHERE tenant_id = p_tenant_id
      AND user_id = auth.uid()
      AND active = true
      AND role IN ('owner','manager')
  );
$$;

REVOKE ALL ON FUNCTION public.is_owner_of_tenant(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_owner_of_tenant(uuid) TO authenticated;

-- ============================================================
-- 2. user_hotel_assignments: drop recursive/duplicate policies
-- ============================================================
DROP POLICY IF EXISTS "Owners can add assignments" ON public.user_hotel_assignments;
DROP POLICY IF EXISTS "Owners can delete assignments" ON public.user_hotel_assignments;
DROP POLICY IF EXISTS "Owners can update assignments" ON public.user_hotel_assignments;
DROP POLICY IF EXISTS "Users can view assignments for their hotels" ON public.user_hotel_assignments;

CREATE POLICY "Owners can add assignments"
  ON public.user_hotel_assignments FOR INSERT
  TO authenticated
  WITH CHECK (public.is_owner_of_tenant(tenant_id));

CREATE POLICY "Owners can update assignments"
  ON public.user_hotel_assignments FOR UPDATE
  TO authenticated
  USING (public.is_owner_of_tenant(tenant_id))
  WITH CHECK (public.is_owner_of_tenant(tenant_id));

CREATE POLICY "Owners can delete assignments"
  ON public.user_hotel_assignments FOR DELETE
  TO authenticated
  USING (public.is_owner_of_tenant(tenant_id));

CREATE POLICY "Owners can view tenant assignments"
  ON public.user_hotel_assignments FOR SELECT
  TO authenticated
  USING (public.is_owner_of_tenant(tenant_id));

-- ============================================================
-- 3. hotels: drop the WITH CHECK true insert policy
-- ============================================================
DROP POLICY IF EXISTS "Users can insert hotels" ON public.hotels;

-- ============================================================
-- 4. Enable RLS
-- ============================================================
ALTER TABLE public.hotels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_hotel_assignments ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 5. Revoke EXECUTE from anon/public on flagged definer functions
-- ============================================================
DO $$
DECLARE
  fn text;
  user_facing text[] := ARRAY[
    'check_subdomain_available(text,uuid)',
    'get_accessible_hotel_ids()',
    'get_hotel_for_user(uuid)',
    'get_hotel_invoice_prefix(uuid)',
    'get_my_hotel_ids_from_staff()',
    'get_my_tenant_ids()',
    'get_user_hotels()',
    'is_active_staff_at_hotel(uuid)',
    'is_admin_staff_at_hotel(uuid)',
    'is_hotel_admin(uuid)',
    'is_hotel_staff(uuid)',
    'is_super_admin()',
    'lobby_get_my_hotels()',
    'set_tenant_context(uuid)',
    'upsert_guest_profile(jsonb,uuid)',
    'admin_list_users()',
    'store_channel_secret(uuid,text,text)'
  ];
  internal_only text[] := ARRAY[
    'auto_create_cleaning_task()',
    'auto_create_guest_profile()',
    'convert_booking_to_reservation()',
    'create_transaction_on_invoice_paid()',
    'disable_tenants_rls()',
    'fn_auto_create_invoice_on_checkout()',
    'log_invoice_change()',
    'log_payment_change()',
    'rls_auto_enable()',
    'sync_guest_profile_stats()',
    'sync_room_status_on_task_update()'
  ];
BEGIN
  -- User-facing RPCs: revoke from anon + public, keep authenticated
  FOREACH fn IN ARRAY user_facing LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION public.%s FROM PUBLIC, anon', fn);
    EXECUTE format('GRANT EXECUTE ON FUNCTION public.%s TO authenticated', fn);
  END LOOP;

  -- Internal trigger / admin functions: revoke from everyone except postgres
  FOREACH fn IN ARRAY internal_only LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION public.%s FROM PUBLIC, anon, authenticated', fn);
  END LOOP;
END $$;
