/*
  # Fix Security Issues: Indexes, RLS Policies, and Function Search Path

  ## Summary
  Resolves all outstanding security and performance issues flagged by the Supabase advisor.

  ## 1. Missing FK Indexes (4 new)
  - `guest_communications.sent_by`
  - `payments.reservation_id`
  - `user_hotel_assignments.assigned_by`
  - `user_hotel_assignments.tenant_id`

  ## 2. Auth RLS Initialization Plan Fixes (5 policies)
  Wraps `auth.uid()` in `(SELECT auth.uid())` on guest_documents and guest_communications
  so the auth function is evaluated once per query rather than once per row.

  ## 3. Fix Always-True Payments Policies (3 policies)
  Replaces USING(true) / WITH CHECK(true) with proper hotel staff membership checks.

  ## 4. Enable RLS on tenants and user_hotel_assignments
  - `tenants`: anon can read active tenants (for login/subdomain resolution);
    authenticated users can read tenants they are assigned to.
  - `user_hotel_assignments`: users can read their own assignments.

  ## 5. Fix Function Search Path
  Updates `disable_tenants_rls` to use a fixed search_path and converts it to a
  no-op (service_role clients bypass RLS natively).

  ## 6. Drop 35 Unused Indexes
  Removes all indexes flagged as unused to reduce write overhead.
*/

-- =============================================================================
-- SECTION 1: Add missing FK indexes
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_guest_communications_sent_by
  ON public.guest_communications (sent_by);

CREATE INDEX IF NOT EXISTS idx_payments_reservation_id
  ON public.payments (reservation_id);

CREATE INDEX IF NOT EXISTS idx_user_hotel_assignments_assigned_by
  ON public.user_hotel_assignments (assigned_by);

CREATE INDEX IF NOT EXISTS idx_user_hotel_assignments_tenant_id
  ON public.user_hotel_assignments (tenant_id);

-- =============================================================================
-- SECTION 2: Fix Auth RLS initialization plan — guest_documents
-- =============================================================================
DROP POLICY IF EXISTS "Staff can view documents for their hotel" ON public.guest_documents;
DROP POLICY IF EXISTS "Staff can create documents for their hotel" ON public.guest_documents;
DROP POLICY IF EXISTS "Staff can delete documents for their hotel" ON public.guest_documents;

CREATE POLICY "Staff can view documents for their hotel"
  ON public.guest_documents
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff_members
      WHERE staff_members.user_id = (SELECT auth.uid())
        AND staff_members.hotel_id = guest_documents.hotel_id
    )
  );

CREATE POLICY "Staff can create documents for their hotel"
  ON public.guest_documents
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM staff_members
      WHERE staff_members.user_id = (SELECT auth.uid())
        AND staff_members.hotel_id = guest_documents.hotel_id
    )
  );

CREATE POLICY "Staff can delete documents for their hotel"
  ON public.guest_documents
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff_members
      WHERE staff_members.user_id = (SELECT auth.uid())
        AND staff_members.hotel_id = guest_documents.hotel_id
    )
  );

-- =============================================================================
-- SECTION 3: Fix Auth RLS initialization plan — guest_communications
-- =============================================================================
DROP POLICY IF EXISTS "Staff can view communications for their hotel" ON public.guest_communications;
DROP POLICY IF EXISTS "Staff can create communications for their hotel" ON public.guest_communications;

CREATE POLICY "Staff can view communications for their hotel"
  ON public.guest_communications
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff_members
      WHERE staff_members.user_id = (SELECT auth.uid())
        AND staff_members.hotel_id = guest_communications.hotel_id
    )
  );

CREATE POLICY "Staff can create communications for their hotel"
  ON public.guest_communications
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM staff_members
      WHERE staff_members.user_id = (SELECT auth.uid())
        AND staff_members.hotel_id = guest_communications.hotel_id
    )
  );

-- =============================================================================
-- SECTION 4: Fix always-true RLS policies on payments
-- =============================================================================
DROP POLICY IF EXISTS "Users can view payments for their hotel" ON public.payments;
DROP POLICY IF EXISTS "Users can create payments for their hotel" ON public.payments;
DROP POLICY IF EXISTS "Users can update payments for their hotel" ON public.payments;

CREATE POLICY "Users can view payments for their hotel"
  ON public.payments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff_members
      WHERE staff_members.user_id = (SELECT auth.uid())
        AND staff_members.hotel_id = payments.hotel_id
    )
  );

CREATE POLICY "Users can create payments for their hotel"
  ON public.payments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM staff_members
      WHERE staff_members.user_id = (SELECT auth.uid())
        AND staff_members.hotel_id = payments.hotel_id
    )
  );

CREATE POLICY "Users can update payments for their hotel"
  ON public.payments
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff_members
      WHERE staff_members.user_id = (SELECT auth.uid())
        AND staff_members.hotel_id = payments.hotel_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM staff_members
      WHERE staff_members.user_id = (SELECT auth.uid())
        AND staff_members.hotel_id = payments.hotel_id
    )
  );

-- =============================================================================
-- SECTION 5: Enable RLS on tenants
-- =============================================================================
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anon can read active tenants for login resolution"
  ON public.tenants
  FOR SELECT
  TO anon
  USING (active = true);

CREATE POLICY "Authenticated users can read their assigned tenants"
  ON public.tenants
  FOR SELECT
  TO authenticated
  USING (
    active = true
    AND EXISTS (
      SELECT 1 FROM user_hotel_assignments
      WHERE user_hotel_assignments.tenant_id = tenants.id
        AND user_hotel_assignments.user_id = (SELECT auth.uid())
        AND user_hotel_assignments.active = true
    )
  );

-- =============================================================================
-- SECTION 6: Enable RLS on user_hotel_assignments
-- =============================================================================
ALTER TABLE public.user_hotel_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own hotel assignments"
  ON public.user_hotel_assignments
  FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- =============================================================================
-- SECTION 7: Fix mutable search_path on disable_tenants_rls (no-op conversion)
-- =============================================================================
CREATE OR REPLACE FUNCTION public.disable_tenants_rls()
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
AS $$
BEGIN
  RETURN;
END;
$$;

-- =============================================================================
-- SECTION 8: Drop unused indexes
-- =============================================================================
DROP INDEX IF EXISTS public.idx_rooms_hotel_id;
DROP INDEX IF EXISTS public.idx_rooms_status;
DROP INDEX IF EXISTS public.idx_room_types_hotel_id;
DROP INDEX IF EXISTS public.idx_guests_hotel_id;
DROP INDEX IF EXISTS public.idx_guests_email;
DROP INDEX IF EXISTS public.idx_reservations_hotel_id;
DROP INDEX IF EXISTS public.idx_reservations_guest_id;
DROP INDEX IF EXISTS public.idx_reservations_room_id;
DROP INDEX IF EXISTS public.idx_reservations_status;
DROP INDEX IF EXISTS public.idx_reservations_check_in;
DROP INDEX IF EXISTS public.idx_reservations_check_out;
DROP INDEX IF EXISTS public.idx_invoices_hotel_id;
DROP INDEX IF EXISTS public.idx_invoices_reservation_id;
DROP INDEX IF EXISTS public.idx_housekeeping_tasks_hotel_id;
DROP INDEX IF EXISTS public.idx_housekeeping_tasks_room_id;
DROP INDEX IF EXISTS public.idx_staff_members_hotel_id;
DROP INDEX IF EXISTS public.idx_staff_members_user_id;
DROP INDEX IF EXISTS public.idx_activity_log_hotel_id;
DROP INDEX IF EXISTS public.idx_invoice_items_invoice_id;
DROP INDEX IF EXISTS public.idx_invoices_guest_id;
DROP INDEX IF EXISTS public.idx_maintenance_requests_hotel_id;
DROP INDEX IF EXISTS public.idx_maintenance_requests_room_id;
DROP INDEX IF EXISTS public.idx_reservations_room_type_id;
DROP INDEX IF EXISTS public.idx_rooms_room_type_id;
DROP INDEX IF EXISTS public.idx_housekeeping_checklist_items_hotel_id;
DROP INDEX IF EXISTS public.idx_housekeeping_checklist_items_task_id;
DROP INDEX IF EXISTS public.idx_guest_documents_guest_id;
DROP INDEX IF EXISTS public.idx_guest_documents_hotel_id;
DROP INDEX IF EXISTS public.idx_guest_communications_guest_id;
DROP INDEX IF EXISTS public.idx_guest_communications_hotel_id;
DROP INDEX IF EXISTS public.idx_guest_communications_sent_at;
DROP INDEX IF EXISTS public.idx_payments_hotel_id;
DROP INDEX IF EXISTS public.idx_payments_invoice_id;
DROP INDEX IF EXISTS public.idx_payments_guest_id;
DROP INDEX IF EXISTS public.idx_payments_payment_date;
