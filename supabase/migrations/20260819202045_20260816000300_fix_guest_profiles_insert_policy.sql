-- Restore a safe INSERT policy for CRM guest creation.
-- The predicate is SECURITY DEFINER-backed and checks active hotel staff or a
-- tenant-scoped assignment; it intentionally does not grant a global role access
-- to every hotel's guest identities.
DROP POLICY IF EXISTS "Authenticated users can insert guest profiles" ON public.guest_profiles;
DROP POLICY IF EXISTS "Staff can insert hotel guest profiles" ON public.guest_profiles;

CREATE POLICY "Staff can insert hotel guest profiles"
ON public.guest_profiles
FOR INSERT
TO authenticated
WITH CHECK (private.is_hotel_staff(hotel_id));
