/*
  # Seed Pricing Rules and Upsell Items v2

  ## Summary
  Inserts demo pricing rules and upsell items using correct constraint values.

  ## Data
  - 5 pricing rules using valid type and adjustment_type values
  - 8 upsell items
*/

DO $$
DECLARE
  v_hotel_id uuid := '358b47d2-d31b-4a90-89de-9cdb0d76f7c2';
  v_tenant_id uuid := 'd9ed4970-b95a-40fe-8878-4290526a0fca';
BEGIN
  IF (SELECT COUNT(*) FROM pricing_rules WHERE hotel_id = v_hotel_id) = 0 THEN
    INSERT INTO pricing_rules (hotel_id, tenant_id, name, type, days_of_week, adjustment_type, adjustment_value, priority, active) VALUES
    (v_hotel_id, v_tenant_id, 'Weekend Premium', 'day_of_week', ARRAY[5,6], 'percentage_increase', 20, 1, true),
    (v_hotel_id, v_tenant_id, 'Summer Peak Season', 'seasonal', NULL, 'percentage_increase', 35, 2, true),
    (v_hotel_id, v_tenant_id, 'Last Minute Discount', 'last_minute', NULL, 'percentage_decrease', 15, 3, true),
    (v_hotel_id, v_tenant_id, 'Early Bird Discount', 'early_bird', NULL, 'percentage_decrease', 10, 4, true),
    (v_hotel_id, v_tenant_id, 'High Occupancy Surge', 'occupancy', NULL, 'percentage_increase', 25, 5, true);
  END IF;
END $$;

DO $$
DECLARE
  v_hotel_id uuid := '358b47d2-d31b-4a90-89de-9cdb0d76f7c2';
  v_tenant_id uuid := 'd9ed4970-b95a-40fe-8878-4290526a0fca';
BEGIN
  IF (SELECT COUNT(*) FROM upsell_items WHERE hotel_id = v_hotel_id) < 8 THEN
    INSERT INTO upsell_items (hotel_id, tenant_id, name, description, price, price_type, category, active, sort_order) VALUES
    (v_hotel_id, v_tenant_id, 'Early Check-in (from 10am)', 'Guarantee your room is ready from 10am', 35.00, 'fixed', 'room_enhancement', true, 1),
    (v_hotel_id, v_tenant_id, 'Late Check-out (until 3pm)', 'Extend your stay until 3pm without extra night charge', 35.00, 'fixed', 'room_enhancement', true, 2),
    (v_hotel_id, v_tenant_id, 'Daily Breakfast for Two', 'Enjoy our award-winning full buffet breakfast', 28.00, 'per_night', 'food_beverage', true, 3),
    (v_hotel_id, v_tenant_id, 'Airport Transfer', 'Private luxury car transfer from/to airport', 65.00, 'fixed', 'transport', true, 4),
    (v_hotel_id, v_tenant_id, 'Spa Day Pass', 'Full access to spa, sauna and pool for the day', 85.00, 'fixed', 'wellness', true, 5),
    (v_hotel_id, v_tenant_id, 'Romance Package', 'Champagne, roses, chocolates and late check-out', 120.00, 'fixed', 'experience', true, 6),
    (v_hotel_id, v_tenant_id, 'In-Room Dinner for Two', '3-course gourmet dinner served in your room', 95.00, 'fixed', 'food_beverage', true, 7),
    (v_hotel_id, v_tenant_id, 'City Tour Half Day', 'Guided sightseeing tour with private driver', 75.00, 'fixed', 'experience', true, 8)
    ON CONFLICT DO NOTHING;
  END IF;
END $$;
