/*
  # Fix channels RLS — use staff_members join instead of session variable

  ## Problem
  The previous fix relied on current_setting('app.current_tenant_id'), but
  Supabase PostgREST opens a fresh DB connection per HTTP request, so any
  set_config() value is gone by the time the channels query executes.

  ## Fix
  Replace the session-variable check with a direct EXISTS join on
  staff_members, matching the authenticated user to the channel's tenant_id.
  This is stateless and works reliably across connections.
*/

DROP POLICY IF EXISTS "Staff can view hotel channels"    ON channels;
DROP POLICY IF EXISTS "Staff can insert hotel channels"  ON channels;
DROP POLICY IF EXISTS "Staff can update hotel channels"  ON channels;
DROP POLICY IF EXISTS "Staff can delete channels"        ON channels;

CREATE POLICY "Staff can view hotel channels"
  ON channels FOR SELECT
  TO authenticated
  USING (
    is_hotel_staff(hotel_id)
    OR EXISTS (
      SELECT 1 FROM staff_members sm
      WHERE sm.user_id = (SELECT auth.uid())
        AND sm.tenant_id = channels.tenant_id
        AND sm.is_active = true
    )
  );

CREATE POLICY "Staff can insert hotel channels"
  ON channels FOR INSERT
  TO authenticated
  WITH CHECK (
    is_hotel_staff(hotel_id)
    OR EXISTS (
      SELECT 1 FROM staff_members sm
      WHERE sm.user_id = (SELECT auth.uid())
        AND sm.tenant_id = channels.tenant_id
        AND sm.is_active = true
    )
  );

CREATE POLICY "Staff can update hotel channels"
  ON channels FOR UPDATE
  TO authenticated
  USING (
    is_hotel_staff(hotel_id)
    OR EXISTS (
      SELECT 1 FROM staff_members sm
      WHERE sm.user_id = (SELECT auth.uid())
        AND sm.tenant_id = channels.tenant_id
        AND sm.is_active = true
    )
  )
  WITH CHECK (
    is_hotel_staff(hotel_id)
    OR EXISTS (
      SELECT 1 FROM staff_members sm
      WHERE sm.user_id = (SELECT auth.uid())
        AND sm.tenant_id = channels.tenant_id
        AND sm.is_active = true
    )
  );

CREATE POLICY "Staff can delete channels"
  ON channels FOR DELETE
  TO authenticated
  USING (
    is_hotel_staff(hotel_id)
    OR EXISTS (
      SELECT 1 FROM staff_members sm
      WHERE sm.user_id = (SELECT auth.uid())
        AND sm.tenant_id = channels.tenant_id
        AND sm.is_active = true
    )
  );
