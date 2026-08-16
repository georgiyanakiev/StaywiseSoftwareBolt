/*
# Remove the platform super-admin bypass on guest personal records

1. Changes
   - `private.is_hotel_staff(uuid)` no longer treats a platform-wide super_admin
     assignment (tenant_id IS NULL) as staff at every hotel. Tenant-scoped assignments
     and hotel staff records are unchanged.

2. Security
   - This helper gates SELECT/UPDATE/DELETE on guest_profiles. Guest identity data is
     now reachable only by staff of that hotel or by users assigned within the hotel's
     own tenant.
*/

CREATE OR REPLACE FUNCTION private.is_hotel_staff(p_hotel_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.staff_members
    WHERE hotel_id = p_hotel_id
      AND user_id = auth.uid()
      AND is_active = true
  )
  OR EXISTS (
    SELECT 1 FROM public.user_hotel_assignments uha
    JOIN public.hotels h ON h.id = p_hotel_id
    WHERE uha.user_id = auth.uid()
      AND uha.active = true
      AND uha.tenant_id IS NOT NULL
      AND uha.tenant_id = h.tenant_id
  );
$function$;
