/*
  # Create Upselling Engine Tables

  ## Summary
  Creates two tables to power the hotel upselling engine: upsell_items (the catalogue
  of add-ons a hotel offers) and upsell_orders (guest purchases of those items).
  Includes 8 seed upsell items and 4 sample orders against demo data.

  ## New Tables

  ### upsell_items
  - Catalogue of purchasable add-ons per hotel (early check-in, breakfast, spa, etc.)
  - Supports multiple price types: per_stay, per_night, per_person, per_night_per_person
  - availability window controlled by days_before/hours_before fields
  - soft-delete via active flag; sort_order for drag-to-reorder

  ### upsell_orders
  - Each row is a guest purchase of a upsell_item
  - Linked to booking via booking_id (uuid, no FK to allow flexibility across booking sources)
  - Tracks order lifecycle: pending → confirmed → delivered (or cancelled)
  - Stores denormalised item_name / unit_price / total_price for history integrity

  ## Security
  - RLS enabled on both tables
  - Staff can view items and orders for their hotel
  - Owners/managers can create, edit, delete items and manage orders

  ## Seed Data
  - 8 upsell items seeded for the first demo hotel
  - 4 orders seeded in various statuses
*/

-- =============================================
-- upsell_items
-- =============================================
CREATE TABLE IF NOT EXISTS upsell_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid REFERENCES hotels(id) ON DELETE CASCADE,
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text DEFAULT '',
  category text CHECK (category IN ('room_upgrade','early_checkin','late_checkout','breakfast','dinner','spa','transfer','parking','experience','other')),
  price numeric(10,2) NOT NULL DEFAULT 0,
  price_type text DEFAULT 'per_stay' CHECK (price_type IN ('per_stay','per_night','per_person','per_night_per_person')),
  max_quantity integer DEFAULT 1,
  available_from_days_before integer DEFAULT 30,
  available_until_hours_before integer DEFAULT 2,
  image_url text DEFAULT '',
  active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE upsell_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view upsell items for their hotel"
  ON upsell_items FOR SELECT
  TO authenticated
  USING (
    hotel_id IN (
      SELECT sm.hotel_id FROM staff_members sm
      WHERE sm.user_id = auth.uid() AND sm.is_active = true
    )
  );

CREATE POLICY "Owners and managers can insert upsell items"
  ON upsell_items FOR INSERT
  TO authenticated
  WITH CHECK (
    hotel_id IN (
      SELECT sm.hotel_id FROM staff_members sm
      WHERE sm.user_id = auth.uid()
        AND sm.role IN ('owner','manager')
        AND sm.is_active = true
    )
  );

CREATE POLICY "Owners and managers can update upsell items"
  ON upsell_items FOR UPDATE
  TO authenticated
  USING (
    hotel_id IN (
      SELECT sm.hotel_id FROM staff_members sm
      WHERE sm.user_id = auth.uid()
        AND sm.role IN ('owner','manager')
        AND sm.is_active = true
    )
  )
  WITH CHECK (
    hotel_id IN (
      SELECT sm.hotel_id FROM staff_members sm
      WHERE sm.user_id = auth.uid()
        AND sm.role IN ('owner','manager')
        AND sm.is_active = true
    )
  );

CREATE POLICY "Owners and managers can delete upsell items"
  ON upsell_items FOR DELETE
  TO authenticated
  USING (
    hotel_id IN (
      SELECT sm.hotel_id FROM staff_members sm
      WHERE sm.user_id = auth.uid()
        AND sm.role IN ('owner','manager')
        AND sm.is_active = true
    )
  );

CREATE INDEX IF NOT EXISTS idx_upsell_items_hotel_id ON upsell_items(hotel_id);

-- =============================================
-- upsell_orders
-- =============================================
CREATE TABLE IF NOT EXISTS upsell_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid REFERENCES hotels(id) ON DELETE CASCADE,
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE,
  booking_id uuid,
  guest_name text DEFAULT '',
  upsell_item_id uuid REFERENCES upsell_items(id) ON DELETE SET NULL,
  item_name text DEFAULT '',
  quantity integer DEFAULT 1,
  unit_price numeric(10,2) DEFAULT 0,
  total_price numeric(10,2) DEFAULT 0,
  status text DEFAULT 'pending' CHECK (status IN ('pending','confirmed','delivered','cancelled')),
  notes text DEFAULT '',
  ordered_at timestamptz DEFAULT now(),
  confirmed_at timestamptz,
  delivered_at timestamptz
);

ALTER TABLE upsell_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view upsell orders for their hotel"
  ON upsell_orders FOR SELECT
  TO authenticated
  USING (
    hotel_id IN (
      SELECT sm.hotel_id FROM staff_members sm
      WHERE sm.user_id = auth.uid() AND sm.is_active = true
    )
  );

CREATE POLICY "Staff can insert upsell orders for their hotel"
  ON upsell_orders FOR INSERT
  TO authenticated
  WITH CHECK (
    hotel_id IN (
      SELECT sm.hotel_id FROM staff_members sm
      WHERE sm.user_id = auth.uid() AND sm.is_active = true
    )
  );

CREATE POLICY "Staff can update upsell orders for their hotel"
  ON upsell_orders FOR UPDATE
  TO authenticated
  USING (
    hotel_id IN (
      SELECT sm.hotel_id FROM staff_members sm
      WHERE sm.user_id = auth.uid() AND sm.is_active = true
    )
  )
  WITH CHECK (
    hotel_id IN (
      SELECT sm.hotel_id FROM staff_members sm
      WHERE sm.user_id = auth.uid() AND sm.is_active = true
    )
  );

CREATE POLICY "Owners and managers can delete upsell orders"
  ON upsell_orders FOR DELETE
  TO authenticated
  USING (
    hotel_id IN (
      SELECT sm.hotel_id FROM staff_members sm
      WHERE sm.user_id = auth.uid()
        AND sm.role IN ('owner','manager')
        AND sm.is_active = true
    )
  );

CREATE INDEX IF NOT EXISTS idx_upsell_orders_hotel_id ON upsell_orders(hotel_id);
CREATE INDEX IF NOT EXISTS idx_upsell_orders_booking_id ON upsell_orders(booking_id);
CREATE INDEX IF NOT EXISTS idx_upsell_orders_status ON upsell_orders(status);

-- =============================================
-- Seed upsell_items for first demo hotel
-- =============================================
DO $$
DECLARE
  v_hotel_id uuid;
  v_tenant_id uuid;
BEGIN
  SELECT h.id, h.tenant_id INTO v_hotel_id, v_tenant_id
  FROM hotels h
  ORDER BY h.created_at ASC
  LIMIT 1;

  IF v_hotel_id IS NULL THEN
    RETURN;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM upsell_items WHERE hotel_id = v_hotel_id) THEN
    INSERT INTO upsell_items (hotel_id, tenant_id, name, description, category, price, price_type, max_quantity, available_from_days_before, available_until_hours_before, image_url, active, sort_order)
    VALUES
      (v_hotel_id, v_tenant_id, 'Early Check-in', 'Arrive before the standard check-in time. Subject to availability.', 'early_checkin', 25.00, 'per_stay', 1, 30, 24, 'https://images.pexels.com/photos/1267320/pexels-photo-1267320.jpeg?auto=compress&w=800', true, 1),
      (v_hotel_id, v_tenant_id, 'Late Check-out', 'Extend your stay until 14:00. Enjoy a leisurely morning.', 'late_checkout', 35.00, 'per_stay', 1, 14, 2, 'https://images.pexels.com/photos/271624/pexels-photo-271624.jpeg?auto=compress&w=800', true, 2),
      (v_hotel_id, v_tenant_id, 'Airport Transfer', 'Private transfer to/from the nearest international airport.', 'transfer', 45.00, 'per_stay', 4, 30, 48, 'https://images.pexels.com/photos/3662667/pexels-photo-3662667.jpeg?auto=compress&w=800', true, 3),
      (v_hotel_id, v_tenant_id, 'Breakfast', 'Full continental breakfast in our restaurant each morning.', 'breakfast', 18.00, 'per_night_per_person', 6, 30, 12, 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&w=800', true, 4),
      (v_hotel_id, v_tenant_id, 'Bottle of Wine', 'Chilled bottle of house wine waiting in your room on arrival.', 'other', 35.00, 'per_stay', 3, 30, 4, 'https://images.pexels.com/photos/2702805/pexels-photo-2702805.jpeg?auto=compress&w=800', true, 5),
      (v_hotel_id, v_tenant_id, 'Parking', 'Reserved parking space in our secure on-site car park.', 'parking', 15.00, 'per_night', 1, 30, 2, 'https://images.pexels.com/photos/1004409/pexels-photo-1004409.jpeg?auto=compress&w=800', true, 6),
      (v_hotel_id, v_tenant_id, 'Room Upgrade', 'Upgrade to the next room category, subject to availability.', 'room_upgrade', 50.00, 'per_night', 1, 30, 48, 'https://images.pexels.com/photos/1743231/pexels-photo-1743231.jpeg?auto=compress&w=800', true, 7),
      (v_hotel_id, v_tenant_id, 'Spa Access', 'Full-day access to our wellness centre including pool and sauna.', 'spa', 40.00, 'per_stay', 2, 30, 4, 'https://images.pexels.com/photos/3757952/pexels-photo-3757952.jpeg?auto=compress&w=800', true, 8);

    -- Seed 4 sample orders
    INSERT INTO upsell_orders (hotel_id, tenant_id, guest_name, upsell_item_id, item_name, quantity, unit_price, total_price, status, notes, ordered_at)
    SELECT
      v_hotel_id,
      v_tenant_id,
      'Sarah Mitchell',
      ui.id,
      ui.name,
      1,
      ui.price,
      ui.price,
      'confirmed',
      '',
      now() - interval '2 days'
    FROM upsell_items ui WHERE ui.hotel_id = v_hotel_id AND ui.category = 'late_checkout'
    LIMIT 1;

    INSERT INTO upsell_orders (hotel_id, tenant_id, guest_name, upsell_item_id, item_name, quantity, unit_price, total_price, status, notes, ordered_at, delivered_at)
    SELECT
      v_hotel_id,
      v_tenant_id,
      'James Hartley',
      ui.id,
      ui.name,
      2,
      ui.price,
      ui.price * 2,
      'delivered',
      'Requested for both nights',
      now() - interval '5 days',
      now() - interval '4 days'
    FROM upsell_items ui WHERE ui.hotel_id = v_hotel_id AND ui.category = 'breakfast'
    LIMIT 1;

    INSERT INTO upsell_orders (hotel_id, tenant_id, guest_name, upsell_item_id, item_name, quantity, unit_price, total_price, status, notes, ordered_at)
    SELECT
      v_hotel_id,
      v_tenant_id,
      'Emma Rosenberg',
      ui.id,
      ui.name,
      1,
      ui.price,
      ui.price,
      'pending',
      'Arriving on evening flight',
      now() - interval '1 day'
    FROM upsell_items ui WHERE ui.hotel_id = v_hotel_id AND ui.category = 'transfer'
    LIMIT 1;

    INSERT INTO upsell_orders (hotel_id, tenant_id, guest_name, upsell_item_id, item_name, quantity, unit_price, total_price, status, notes, ordered_at)
    SELECT
      v_hotel_id,
      v_tenant_id,
      'Thomas Bauer',
      ui.id,
      ui.name,
      1,
      ui.price,
      ui.price,
      'pending',
      '',
      now() - interval '3 hours'
    FROM upsell_items ui WHERE ui.hotel_id = v_hotel_id AND ui.category = 'spa'
    LIMIT 1;
  END IF;
END $$;
