/*
  # Fix Database Security and Performance Issues

  1. Add Missing Indexes
    - Add index on invoice_items.invoice_id
    - Add index on invoices.guest_id
    - Add index on maintenance_requests.hotel_id
    - Add index on maintenance_requests.room_id
    - Add index on reservations.room_type_id
    - Add index on rooms.room_type_id

  2. Optimize RLS Policies
    - Update all RLS policies to use `(select auth.uid())` instead of `auth.uid()`
    - This prevents re-evaluation of auth functions for each row, improving query performance

  Note: Auth connection strategy and leaked password protection settings must be
  configured in the Supabase dashboard and cannot be set via migrations.
*/

-- Add missing foreign key indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoices_guest_id ON invoices(guest_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_requests_hotel_id ON maintenance_requests(hotel_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_requests_room_id ON maintenance_requests(room_id);
CREATE INDEX IF NOT EXISTS idx_reservations_room_type_id ON reservations(room_type_id);
CREATE INDEX IF NOT EXISTS idx_rooms_room_type_id ON rooms(room_type_id);

-- Drop and recreate all RLS policies with optimized auth function calls
-- Hotels policies
DROP POLICY IF EXISTS "Staff can view their hotels" ON hotels;
DROP POLICY IF EXISTS "Admins can insert hotels" ON hotels;
DROP POLICY IF EXISTS "Staff admins can update their hotels" ON hotels;

CREATE POLICY "Staff can view their hotels"
  ON hotels FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff_members
      WHERE staff_members.hotel_id = hotels.id
      AND staff_members.user_id = (select auth.uid())
      AND staff_members.is_active = true
    )
  );

CREATE POLICY "Admins can insert hotels"
  ON hotels FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) IS NOT NULL);

CREATE POLICY "Staff admins can update their hotels"
  ON hotels FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff_members
      WHERE staff_members.hotel_id = hotels.id
      AND staff_members.user_id = (select auth.uid())
      AND staff_members.role IN ('admin', 'manager')
      AND staff_members.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM staff_members
      WHERE staff_members.hotel_id = hotels.id
      AND staff_members.user_id = (select auth.uid())
      AND staff_members.role IN ('admin', 'manager')
      AND staff_members.is_active = true
    )
  );

-- Room Types policies
DROP POLICY IF EXISTS "Staff can view room types" ON room_types;
DROP POLICY IF EXISTS "Admins can insert room types" ON room_types;
DROP POLICY IF EXISTS "Admins can update room types" ON room_types;
DROP POLICY IF EXISTS "Admins can delete room types" ON room_types;

CREATE POLICY "Staff can view room types"
  ON room_types FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff_members
      WHERE staff_members.hotel_id = room_types.hotel_id
      AND staff_members.user_id = (select auth.uid())
      AND staff_members.is_active = true
    )
  );

CREATE POLICY "Admins can insert room types"
  ON room_types FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM staff_members
      WHERE staff_members.hotel_id = room_types.hotel_id
      AND staff_members.user_id = (select auth.uid())
      AND staff_members.role IN ('admin', 'manager')
      AND staff_members.is_active = true
    )
  );

CREATE POLICY "Admins can update room types"
  ON room_types FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff_members
      WHERE staff_members.hotel_id = room_types.hotel_id
      AND staff_members.user_id = (select auth.uid())
      AND staff_members.role IN ('admin', 'manager')
      AND staff_members.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM staff_members
      WHERE staff_members.hotel_id = room_types.hotel_id
      AND staff_members.user_id = (select auth.uid())
      AND staff_members.role IN ('admin', 'manager')
      AND staff_members.is_active = true
    )
  );

CREATE POLICY "Admins can delete room types"
  ON room_types FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff_members
      WHERE staff_members.hotel_id = room_types.hotel_id
      AND staff_members.user_id = (select auth.uid())
      AND staff_members.role IN ('admin', 'manager')
      AND staff_members.is_active = true
    )
  );

-- Rooms policies
DROP POLICY IF EXISTS "Staff can view rooms" ON rooms;
DROP POLICY IF EXISTS "Admins can insert rooms" ON rooms;
DROP POLICY IF EXISTS "Staff can update rooms" ON rooms;
DROP POLICY IF EXISTS "Admins can delete rooms" ON rooms;

CREATE POLICY "Staff can view rooms"
  ON rooms FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff_members
      WHERE staff_members.hotel_id = rooms.hotel_id
      AND staff_members.user_id = (select auth.uid())
      AND staff_members.is_active = true
    )
  );

CREATE POLICY "Admins can insert rooms"
  ON rooms FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM staff_members
      WHERE staff_members.hotel_id = rooms.hotel_id
      AND staff_members.user_id = (select auth.uid())
      AND staff_members.role IN ('admin', 'manager')
      AND staff_members.is_active = true
    )
  );

CREATE POLICY "Staff can update rooms"
  ON rooms FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff_members
      WHERE staff_members.hotel_id = rooms.hotel_id
      AND staff_members.user_id = (select auth.uid())
      AND staff_members.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM staff_members
      WHERE staff_members.hotel_id = rooms.hotel_id
      AND staff_members.user_id = (select auth.uid())
      AND staff_members.is_active = true
    )
  );

CREATE POLICY "Admins can delete rooms"
  ON rooms FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff_members
      WHERE staff_members.hotel_id = rooms.hotel_id
      AND staff_members.user_id = (select auth.uid())
      AND staff_members.role IN ('admin', 'manager')
      AND staff_members.is_active = true
    )
  );

-- Guests policies
DROP POLICY IF EXISTS "Staff can view guests" ON guests;
DROP POLICY IF EXISTS "Staff can insert guests" ON guests;
DROP POLICY IF EXISTS "Staff can update guests" ON guests;

CREATE POLICY "Staff can view guests"
  ON guests FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff_members
      WHERE staff_members.hotel_id = guests.hotel_id
      AND staff_members.user_id = (select auth.uid())
      AND staff_members.is_active = true
    )
  );

CREATE POLICY "Staff can insert guests"
  ON guests FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM staff_members
      WHERE staff_members.hotel_id = guests.hotel_id
      AND staff_members.user_id = (select auth.uid())
      AND staff_members.is_active = true
    )
  );

CREATE POLICY "Staff can update guests"
  ON guests FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff_members
      WHERE staff_members.hotel_id = guests.hotel_id
      AND staff_members.user_id = (select auth.uid())
      AND staff_members.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM staff_members
      WHERE staff_members.hotel_id = guests.hotel_id
      AND staff_members.user_id = (select auth.uid())
      AND staff_members.is_active = true
    )
  );

-- Reservations policies
DROP POLICY IF EXISTS "Staff can view reservations" ON reservations;
DROP POLICY IF EXISTS "Staff can insert reservations" ON reservations;
DROP POLICY IF EXISTS "Staff can update reservations" ON reservations;

CREATE POLICY "Staff can view reservations"
  ON reservations FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff_members
      WHERE staff_members.hotel_id = reservations.hotel_id
      AND staff_members.user_id = (select auth.uid())
      AND staff_members.is_active = true
    )
  );

CREATE POLICY "Staff can insert reservations"
  ON reservations FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM staff_members
      WHERE staff_members.hotel_id = reservations.hotel_id
      AND staff_members.user_id = (select auth.uid())
      AND staff_members.is_active = true
    )
  );

CREATE POLICY "Staff can update reservations"
  ON reservations FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff_members
      WHERE staff_members.hotel_id = reservations.hotel_id
      AND staff_members.user_id = (select auth.uid())
      AND staff_members.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM staff_members
      WHERE staff_members.hotel_id = reservations.hotel_id
      AND staff_members.user_id = (select auth.uid())
      AND staff_members.is_active = true
    )
  );

-- Invoices policies
DROP POLICY IF EXISTS "Staff can view invoices" ON invoices;
DROP POLICY IF EXISTS "Staff can insert invoices" ON invoices;
DROP POLICY IF EXISTS "Staff can update invoices" ON invoices;

CREATE POLICY "Staff can view invoices"
  ON invoices FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff_members
      WHERE staff_members.hotel_id = invoices.hotel_id
      AND staff_members.user_id = (select auth.uid())
      AND staff_members.is_active = true
    )
  );

CREATE POLICY "Staff can insert invoices"
  ON invoices FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM staff_members
      WHERE staff_members.hotel_id = invoices.hotel_id
      AND staff_members.user_id = (select auth.uid())
      AND staff_members.is_active = true
    )
  );

CREATE POLICY "Staff can update invoices"
  ON invoices FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff_members
      WHERE staff_members.hotel_id = invoices.hotel_id
      AND staff_members.user_id = (select auth.uid())
      AND staff_members.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM staff_members
      WHERE staff_members.hotel_id = invoices.hotel_id
      AND staff_members.user_id = (select auth.uid())
      AND staff_members.is_active = true
    )
  );

-- Invoice Items policies
DROP POLICY IF EXISTS "Staff can view invoice items" ON invoice_items;
DROP POLICY IF EXISTS "Staff can insert invoice items" ON invoice_items;
DROP POLICY IF EXISTS "Staff can update invoice items" ON invoice_items;
DROP POLICY IF EXISTS "Staff can delete invoice items" ON invoice_items;

CREATE POLICY "Staff can view invoice items"
  ON invoice_items FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM invoices
      JOIN staff_members ON staff_members.hotel_id = invoices.hotel_id
      WHERE invoices.id = invoice_items.invoice_id
      AND staff_members.user_id = (select auth.uid())
      AND staff_members.is_active = true
    )
  );

CREATE POLICY "Staff can insert invoice items"
  ON invoice_items FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM invoices
      JOIN staff_members ON staff_members.hotel_id = invoices.hotel_id
      WHERE invoices.id = invoice_items.invoice_id
      AND staff_members.user_id = (select auth.uid())
      AND staff_members.is_active = true
    )
  );

CREATE POLICY "Staff can update invoice items"
  ON invoice_items FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM invoices
      JOIN staff_members ON staff_members.hotel_id = invoices.hotel_id
      WHERE invoices.id = invoice_items.invoice_id
      AND staff_members.user_id = (select auth.uid())
      AND staff_members.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM invoices
      JOIN staff_members ON staff_members.hotel_id = invoices.hotel_id
      WHERE invoices.id = invoice_items.invoice_id
      AND staff_members.user_id = (select auth.uid())
      AND staff_members.is_active = true
    )
  );

CREATE POLICY "Staff can delete invoice items"
  ON invoice_items FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM invoices
      JOIN staff_members ON staff_members.hotel_id = invoices.hotel_id
      WHERE invoices.id = invoice_items.invoice_id
      AND staff_members.user_id = (select auth.uid())
      AND staff_members.is_active = true
    )
  );

-- Housekeeping Tasks policies
DROP POLICY IF EXISTS "Staff can view housekeeping tasks" ON housekeeping_tasks;
DROP POLICY IF EXISTS "Staff can insert housekeeping tasks" ON housekeeping_tasks;
DROP POLICY IF EXISTS "Staff can update housekeeping tasks" ON housekeeping_tasks;

CREATE POLICY "Staff can view housekeeping tasks"
  ON housekeeping_tasks FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff_members
      WHERE staff_members.hotel_id = housekeeping_tasks.hotel_id
      AND staff_members.user_id = (select auth.uid())
      AND staff_members.is_active = true
    )
  );

CREATE POLICY "Staff can insert housekeeping tasks"
  ON housekeeping_tasks FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM staff_members
      WHERE staff_members.hotel_id = housekeeping_tasks.hotel_id
      AND staff_members.user_id = (select auth.uid())
      AND staff_members.is_active = true
    )
  );

CREATE POLICY "Staff can update housekeeping tasks"
  ON housekeeping_tasks FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff_members
      WHERE staff_members.hotel_id = housekeeping_tasks.hotel_id
      AND staff_members.user_id = (select auth.uid())
      AND staff_members.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM staff_members
      WHERE staff_members.hotel_id = housekeeping_tasks.hotel_id
      AND staff_members.user_id = (select auth.uid())
      AND staff_members.is_active = true
    )
  );

-- Maintenance Requests policies
DROP POLICY IF EXISTS "Staff can view maintenance requests" ON maintenance_requests;
DROP POLICY IF EXISTS "Staff can insert maintenance requests" ON maintenance_requests;
DROP POLICY IF EXISTS "Staff can update maintenance requests" ON maintenance_requests;

CREATE POLICY "Staff can view maintenance requests"
  ON maintenance_requests FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff_members
      WHERE staff_members.hotel_id = maintenance_requests.hotel_id
      AND staff_members.user_id = (select auth.uid())
      AND staff_members.is_active = true
    )
  );

CREATE POLICY "Staff can insert maintenance requests"
  ON maintenance_requests FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM staff_members
      WHERE staff_members.hotel_id = maintenance_requests.hotel_id
      AND staff_members.user_id = (select auth.uid())
      AND staff_members.is_active = true
    )
  );

CREATE POLICY "Staff can update maintenance requests"
  ON maintenance_requests FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff_members
      WHERE staff_members.hotel_id = maintenance_requests.hotel_id
      AND staff_members.user_id = (select auth.uid())
      AND staff_members.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM staff_members
      WHERE staff_members.hotel_id = maintenance_requests.hotel_id
      AND staff_members.user_id = (select auth.uid())
      AND staff_members.is_active = true
    )
  );

-- Staff Members policies
DROP POLICY IF EXISTS "Staff can view own hotel staff" ON staff_members;
DROP POLICY IF EXISTS "Admins can insert staff members" ON staff_members;
DROP POLICY IF EXISTS "Admins can update staff members" ON staff_members;

CREATE POLICY "Staff can view own hotel staff"
  ON staff_members FOR SELECT TO authenticated
  USING (
    user_id = (select auth.uid())
    OR EXISTS (
      SELECT 1 FROM staff_members AS sm
      WHERE sm.hotel_id = staff_members.hotel_id
      AND sm.user_id = (select auth.uid())
      AND sm.role IN ('admin', 'manager')
      AND sm.is_active = true
    )
  );

CREATE POLICY "Admins can insert staff members"
  ON staff_members FOR INSERT TO authenticated
  WITH CHECK (
    user_id = (select auth.uid())
    OR EXISTS (
      SELECT 1 FROM staff_members AS sm
      WHERE sm.hotel_id = staff_members.hotel_id
      AND sm.user_id = (select auth.uid())
      AND sm.role = 'admin'
      AND sm.is_active = true
    )
  );

CREATE POLICY "Admins can update staff members"
  ON staff_members FOR UPDATE TO authenticated
  USING (
    user_id = (select auth.uid())
    OR EXISTS (
      SELECT 1 FROM staff_members AS sm
      WHERE sm.hotel_id = staff_members.hotel_id
      AND sm.user_id = (select auth.uid())
      AND sm.role = 'admin'
      AND sm.is_active = true
    )
  )
  WITH CHECK (
    user_id = (select auth.uid())
    OR EXISTS (
      SELECT 1 FROM staff_members AS sm
      WHERE sm.hotel_id = staff_members.hotel_id
      AND sm.user_id = (select auth.uid())
      AND sm.role = 'admin'
      AND sm.is_active = true
    )
  );

-- Activity Log policies
DROP POLICY IF EXISTS "Staff can view activity log" ON activity_log;
DROP POLICY IF EXISTS "Staff can insert activity log" ON activity_log;

CREATE POLICY "Staff can view activity log"
  ON activity_log FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff_members
      WHERE staff_members.hotel_id = activity_log.hotel_id
      AND staff_members.user_id = (select auth.uid())
      AND staff_members.is_active = true
    )
  );

CREATE POLICY "Staff can insert activity log"
  ON activity_log FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM staff_members
      WHERE staff_members.hotel_id = activity_log.hotel_id
      AND staff_members.user_id = (select auth.uid())
      AND staff_members.is_active = true
    )
  );
