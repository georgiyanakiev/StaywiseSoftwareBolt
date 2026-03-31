/*
  # Enhance Payment Tables and Ensure Overdue Seed Data

  ## Changes to `payment_rules`
  - `send_reminder` — whether to send a payment reminder email
  - `reminder_days_before` — how many days before scheduled date to send the reminder

  ## Changes to `payment_transactions`
  - `booking_source` — origin of the booking (direct, booking.com, expedia, etc.)
  - `card_brand` — card brand (Visa, Mastercard, etc.)
  - `gateway_reference` — external payment gateway reference
  - `refund_reason` — reason recorded when a refund is issued

  ## Seed Data
  - Ensures 2 overdue transactions exist (scheduled_date in past, status=pending)
  - Only inserts if no overdue records exist yet
*/

-- ── payment_rules additions ────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='payment_rules' AND column_name='send_reminder') THEN
    ALTER TABLE payment_rules ADD COLUMN send_reminder boolean DEFAULT true;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='payment_rules' AND column_name='reminder_days_before') THEN
    ALTER TABLE payment_rules ADD COLUMN reminder_days_before integer DEFAULT 3;
  END IF;
END $$;

-- ── payment_transactions additions ────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='payment_transactions' AND column_name='booking_source') THEN
    ALTER TABLE payment_transactions ADD COLUMN booking_source text DEFAULT 'direct';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='payment_transactions' AND column_name='card_brand') THEN
    ALTER TABLE payment_transactions ADD COLUMN card_brand text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='payment_transactions' AND column_name='gateway_reference') THEN
    ALTER TABLE payment_transactions ADD COLUMN gateway_reference text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='payment_transactions' AND column_name='refund_reason') THEN
    ALTER TABLE payment_transactions ADD COLUMN refund_reason text DEFAULT '';
  END IF;
END $$;

-- ── Ensure overdue seed data exists ───────────────────────────────────────
DO $$
DECLARE
  v_hotel_id uuid;
  v_tenant_id uuid;
  overdue_count integer;
BEGIN
  SELECT h.id, h.tenant_id INTO v_hotel_id, v_tenant_id
  FROM hotels h LIMIT 1;

  IF v_hotel_id IS NULL THEN
    RETURN;
  END IF;

  SELECT COUNT(*) INTO overdue_count
  FROM payment_transactions
  WHERE hotel_id = v_hotel_id
    AND status = 'pending'
    AND scheduled_date < CURRENT_DATE;

  IF overdue_count < 2 THEN
    INSERT INTO payment_transactions
      (hotel_id, tenant_id, guest_name, booking_source, amount, currency, type, status, payment_method, card_last4, card_brand, scheduled_date, notes)
    VALUES
      (v_hotel_id, v_tenant_id, 'James Thornton', 'booking.com', 420.00, 'EUR', 'deposit', 'pending', 'card', '4242', 'Visa',   CURRENT_DATE - INTERVAL '5 days',  'Deposit due before arrival'),
      (v_hotel_id, v_tenant_id, 'Lena Böhm',      'direct',      780.00, 'EUR', 'charge',  'pending', 'card', '1234', 'Mastercard', CURRENT_DATE - INTERVAL '2 days', 'Full balance payment');
  END IF;
END $$;
