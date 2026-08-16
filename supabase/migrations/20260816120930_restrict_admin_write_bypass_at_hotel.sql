/*
# Remove the platform super-admin write bypass on hotel operational data

1. Changes
   - `private.is_admin_staff_at_hotel(uuid)` no longer returns true purely because the
     caller holds a platform-wide super_admin assignment. Access now requires either an
     admin-level staff record at that hotel, or an owner/admin assignment in the hotel's
     own tenant.

2. Security
   - Closes a cross-tenant write path: this helper gates UPDATE/DELETE on hotels, rooms,
     room_types, pricing_rules, property_owners, upsell_items, upsell_orders,
     owner_properties and owner_statements. The read-side equivalent
     (`is_active_staff_at_hotel`) was already tightened; this restores symmetry.

3. Notes
   - Platform administrators retain platform management capability; to touch a hotel's
     operational data they must be explicitly assigned to it, which is the product's
     stated access model.
*/

CREATE OR REPLACE FUNCTION private.is_admin_staff_at_hotel(p_hotel_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM staff_members
    WHERE staff_members.hotel_id = p_hotel_id
      AND staff_members.user_id = auth.uid()
      AND staff_members.is_active = true
      AND staff_members.role IN ('admin', 'owner', 'general_manager')
  )
  OR EXISTS (
    SELECT 1
    FROM user_hotel_assignments uha
    JOIN hotels h ON h.tenant_id = uha.tenant_id
    WHERE h.id = p_hotel_id
      AND uha.user_id = auth.uid()
      AND uha.role IN ('owner', 'admin')
      AND uha.active = true
  );
$function$;
