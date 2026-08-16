/*
  # Fix super_admin data bypass and Manager role over-permissioning

  ## Bug 1: Super_admin can read any hotel's operational data
  Two RLS mechanisms had super_admin bypasses that let a platform-level
  super_admin (tenant_id IS NULL) read every hotel's reservations, rooms,
  staff members, invoices, and other operational data — without being
  assigned to that hotel.

  - `private.is_active_staff_at_hotel()` had a third `EXISTS` clause:
      `OR EXISTS (SELECT 1 FROM user_hotel_assignments uha
       WHERE uha.role = 'super_admin' AND uha.tenant_id IS NULL AND active)`
    This made the function return TRUE for ANY hotel_id when called by
    a super_admin, bypassing the assignment check entirely.

  - `reservations`, `rooms`, and `staff_members` each had a SECOND
    SELECT policy ("Staff can view ... at assigned hotels") with an
    explicit `OR EXISTS (super_admin)` clause, duplicating the bypass.

  ## Fix 1
  - Recreate `is_active_staff_at_hotel()` WITHOUT the super_admin clause.
    Super_admins must now have an active staff_members row or an active
    user_hotel_assignments row for the hotel's tenant — same as everyone else.
  - Drop the three redundant second SELECT policies on reservations, rooms,
    and staff_members. The first policy on each (using is_active_staff_at_hotel)
    remains and is now correct.

  ## Bug 2: Manager role has owner-level permissions in the database
  The `role_permissions` table has manager rows with `can_delete=true` on
  most modules and full CRUD on `settings`. The frontend defaults
  (DEFAULT_PERMISSIONS in permissions.ts) have `can_delete=false` for all
  manager modules and `settings` as view-only. Since the AuthContext loads
  DB permissions when available and only falls back to defaults when no
  DB rows exist, the DB values override the safer frontend defaults.

  ## Fix 2
  - UPDATE all manager role_permissions rows to match the frontend defaults:
    - `can_delete = false` for ALL modules
    - `settings`: `can_create = false, can_edit = false` (view-only)
  - This brings the DB in sync with the intended permission template.
*/

-- ============================================================
-- Fix 1a: Remove super_admin bypass from is_active_staff_at_hotel
-- ============================================================
CREATE OR REPLACE FUNCTION private.is_active_staff_at_hotel(p_hotel_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
SELECT EXISTS (
  SELECT 1 FROM staff_members
  WHERE staff_members.hotel_id = p_hotel_id
  AND staff_members.user_id = auth.uid()
  AND staff_members.is_active = true
)
OR EXISTS (
  SELECT 1
  FROM user_hotel_assignments uha
  JOIN hotels h ON h.tenant_id = uha.tenant_id
  WHERE h.id = p_hotel_id
  AND uha.user_id = auth.uid()
  AND uha.active = true
);
$function$;

-- ============================================================
-- Fix 1b: Drop redundant second SELECT policies with super_admin bypass
-- ============================================================
DROP POLICY IF EXISTS "Staff can view reservations at assigned hotels" ON public.reservations;
DROP POLICY IF EXISTS "Staff can view rooms at assigned hotels" ON public.rooms;
DROP POLICY IF EXISTS "Staff can view colleagues at same hotel" ON public.staff_members;

-- ============================================================
-- Fix 2: Correct Manager role permissions to match frontend defaults
-- ============================================================

-- Manager should never have can_delete on any module
UPDATE role_permissions
SET can_delete = false
WHERE role = 'manager';

-- Manager should have view-only access to settings (no create/edit)
UPDATE role_permissions
SET can_create = false, can_edit = false
WHERE role = 'manager' AND module = 'settings';
