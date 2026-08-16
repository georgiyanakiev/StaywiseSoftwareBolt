/*
# Require a platform-wide grant for the super-admin staff management path

1. Changes
   - `private.can_manage_staff_at_hotel(uuid)` now requires `tenant_id IS NULL` on the
     super_admin branch, matching `private.is_super_admin` and
     `private.is_admin_staff_at_hotel`.

2. Security
   - Previously a tenant-scoped assignment row carrying the role name 'super_admin'
     satisfied the check for every hotel in the system, allowing staff creation and
     promotion across tenants. Only a genuine platform-wide grant qualifies now.
*/

CREATE OR REPLACE FUNCTION private.can_manage_staff_at_hotel(p_hotel_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.staff_members sm
    WHERE sm.hotel_id = p_hotel_id
      AND sm.user_id = auth.uid()
      AND sm.is_active = true
      AND sm.approval_status = 'approved'
      AND sm.role IN ('admin', 'owner', 'manager', 'general_manager')
  )
  OR EXISTS (
    SELECT 1
    FROM public.user_hotel_assignments uha
    JOIN public.hotels h ON h.tenant_id = uha.tenant_id
    WHERE h.id = p_hotel_id
      AND uha.user_id = auth.uid()
      AND uha.role IN ('owner', 'admin')
      AND uha.active = true
  )
  OR EXISTS (
    SELECT 1
    FROM public.user_hotel_assignments uha
    WHERE uha.user_id = auth.uid()
      AND uha.role = 'super_admin'
      AND uha.tenant_id IS NULL
      AND uha.active = true
  );
$function$;
