/*
# Correct the hotel delete rule to match on tenant, not hotel id

1. Changes
   - The DELETE policy "Users can delete owned hotels" on public.hotels compared the
     assignment's tenant_id against the hotel's id. It now compares tenant_id against
     the hotel's tenant_id.

2. Security
   - The old predicate expressed no meaningful ownership relationship: it granted or
     denied deletes based on an accidental match between two unrelated identifiers. The
     corrected rule allows deletion only by an active owner of the hotel's own tenant.
*/

DROP POLICY IF EXISTS "Users can delete owned hotels" ON public.hotels;
CREATE POLICY "Users can delete owned hotels"
ON public.hotels FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_hotel_assignments uha
    WHERE uha.tenant_id = hotels.tenant_id
      AND uha.user_id = auth.uid()
      AND uha.active = true
      AND uha.role = 'owner'
  )
);
