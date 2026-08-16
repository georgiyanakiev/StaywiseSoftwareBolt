/*
# Stop treating the manager role as tenant ownership

1. Changes
   - `private.is_owner_of_tenant(uuid)` now matches only assignments with role 'owner'.
     The 'manager' role no longer satisfies it.

2. Security
   - This helper gates every policy on user_hotel_assignments (select, insert, update,
     delete) and the assignment privilege triggers. Previously a manager could create or
     modify assignments across the whole tenant, including granting themselves owner
     access at other properties.

3. Notes
   - Managers keep their hotel-level staff access; only tenant-wide assignment
     administration is now owner-only.
*/

CREATE OR REPLACE FUNCTION private.is_owner_of_tenant(p_tenant_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.user_hotel_assignments
    WHERE tenant_id = p_tenant_id
      AND user_id = auth.uid()
      AND active = true
      AND role = 'owner'
  );
$function$;
