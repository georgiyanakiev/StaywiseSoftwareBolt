/*
# Stop managers editing the permission matrix

1. Changes
   - The INSERT and UPDATE policies on role_permissions now require an active staff
     record with the role 'owner', 'admin' or 'general_manager' at that hotel. The
     'manager' role is removed from both.

2. Security
   - role_permissions is the table that decides what each role may do, and the
     application prefers its rows over the built-in role template. Allowing managers to
     write it let a manager grant themselves full create/edit/delete rights, including
     over settings. Read access is unchanged so the app can still load permissions.
*/

DROP POLICY IF EXISTS "Owners and managers can insert permissions" ON public.role_permissions;
CREATE POLICY "Owners and managers can insert permissions"
ON public.role_permissions FOR INSERT
TO authenticated
WITH CHECK (
  hotel_id IN (
    SELECT sm.hotel_id FROM public.staff_members sm
    WHERE sm.user_id = (SELECT auth.uid())
      AND sm.role IN ('owner', 'admin', 'general_manager')
      AND sm.is_active = true
  )
);

DROP POLICY IF EXISTS "Owners and managers can update permissions" ON public.role_permissions;
CREATE POLICY "Owners and managers can update permissions"
ON public.role_permissions FOR UPDATE
TO authenticated
USING (
  hotel_id IN (
    SELECT sm.hotel_id FROM public.staff_members sm
    WHERE sm.user_id = (SELECT auth.uid())
      AND sm.role IN ('owner', 'admin', 'general_manager')
      AND sm.is_active = true
  )
)
WITH CHECK (
  hotel_id IN (
    SELECT sm.hotel_id FROM public.staff_members sm
    WHERE sm.user_id = (SELECT auth.uid())
      AND sm.role IN ('owner', 'admin', 'general_manager')
      AND sm.is_active = true
  )
);
