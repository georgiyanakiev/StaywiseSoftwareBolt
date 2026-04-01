/*
  # Fix channels RLS to allow tenant-based access

  ## Problem
  Channels seeded per-tenant have `hotel_id = null` and `tenant_id` set.
  The existing RLS policies only check `is_hotel_staff(hotel_id)`, which always
  evaluates to false when `hotel_id` is null, making those channels invisible.

  ## Fix
  Drop and recreate all four channel policies to allow access either via
  the hotel-staff path (legacy hotel_id rows) OR via the active tenant context
  (tenant_id = current_setting('app.current_tenant_id')).
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
    OR (
      tenant_id IS NOT NULL
      AND tenant_id::text = current_setting('app.current_tenant_id', true)
    )
  );

CREATE POLICY "Staff can insert hotel channels"
  ON channels FOR INSERT
  TO authenticated
  WITH CHECK (
    is_hotel_staff(hotel_id)
    OR (
      tenant_id IS NOT NULL
      AND tenant_id::text = current_setting('app.current_tenant_id', true)
    )
  );

CREATE POLICY "Staff can update hotel channels"
  ON channels FOR UPDATE
  TO authenticated
  USING (
    is_hotel_staff(hotel_id)
    OR (
      tenant_id IS NOT NULL
      AND tenant_id::text = current_setting('app.current_tenant_id', true)
    )
  )
  WITH CHECK (
    is_hotel_staff(hotel_id)
    OR (
      tenant_id IS NOT NULL
      AND tenant_id::text = current_setting('app.current_tenant_id', true)
    )
  );

CREATE POLICY "Staff can delete channels"
  ON channels FOR DELETE
  TO authenticated
  USING (
    is_hotel_staff(hotel_id)
    OR (
      tenant_id IS NOT NULL
      AND tenant_id::text = current_setting('app.current_tenant_id', true)
    )
  );
