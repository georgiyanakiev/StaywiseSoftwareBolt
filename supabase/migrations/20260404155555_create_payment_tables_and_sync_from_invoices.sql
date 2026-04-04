
/*
  # Create payment_rules and payment_transactions tables; sync from invoices

  ## Summary
  The Payments module queries `payment_rules` and `payment_transactions` tables that
  did not exist. Additionally the `invoices` table was missing several columns
  that both the Billing and Payments pages expected (guest_name, type, currency,
  paid_at, payment_method, etc.).

  ## Changes

  ### Modified Table: invoices
  - Add guest_name, guest_email, guest_address, guest_city, guest_country,
    guest_vat_number, type, currency, paid_at, paid_amount, payment_method,
    booking_reference, discount_type, discount_value, tax_rate, sent_at,
    internal_notes, service_date_from, service_date_to, tenant_id columns.
  - Back-fills guest details and payment info from linked guests/reservations.

  ### New Table: payment_rules
  - Configurable payment automation rules per hotel with RLS.

  ### New Table: payment_transactions
  - Individual payment transaction records linked to invoices with RLS.
  - Back-filled from all invoices with status = 'paid'.

  ### New Table: invoice_line_items
  - Line items for invoices (used by InvoiceEditorModal).

  ### Trigger: trg_invoice_paid_create_transaction
  - Fires AFTER UPDATE on invoices when status changes to 'paid'.
  - Auto-inserts a 'captured' transaction into payment_transactions.
*/

-- ============================================================
-- 1. Add missing columns to invoices
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='invoices' AND column_name='guest_name') THEN
    ALTER TABLE invoices ADD COLUMN guest_name text NOT NULL DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='invoices' AND column_name='guest_email') THEN
    ALTER TABLE invoices ADD COLUMN guest_email text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='invoices' AND column_name='guest_address') THEN
    ALTER TABLE invoices ADD COLUMN guest_address text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='invoices' AND column_name='guest_city') THEN
    ALTER TABLE invoices ADD COLUMN guest_city text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='invoices' AND column_name='guest_country') THEN
    ALTER TABLE invoices ADD COLUMN guest_country text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='invoices' AND column_name='guest_vat_number') THEN
    ALTER TABLE invoices ADD COLUMN guest_vat_number text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='invoices' AND column_name='type') THEN
    ALTER TABLE invoices ADD COLUMN type text NOT NULL DEFAULT 'invoice';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='invoices' AND column_name='currency') THEN
    ALTER TABLE invoices ADD COLUMN currency text NOT NULL DEFAULT 'EUR';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='invoices' AND column_name='paid_at') THEN
    ALTER TABLE invoices ADD COLUMN paid_at timestamptz;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='invoices' AND column_name='paid_amount') THEN
    ALTER TABLE invoices ADD COLUMN paid_amount numeric(12,2) NOT NULL DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='invoices' AND column_name='payment_method') THEN
    ALTER TABLE invoices ADD COLUMN payment_method text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='invoices' AND column_name='booking_reference') THEN
    ALTER TABLE invoices ADD COLUMN booking_reference text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='invoices' AND column_name='discount_type') THEN
    ALTER TABLE invoices ADD COLUMN discount_type text NOT NULL DEFAULT 'none';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='invoices' AND column_name='discount_value') THEN
    ALTER TABLE invoices ADD COLUMN discount_value numeric(12,2) NOT NULL DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='invoices' AND column_name='tax_rate') THEN
    ALTER TABLE invoices ADD COLUMN tax_rate numeric(5,2) NOT NULL DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='invoices' AND column_name='sent_at') THEN
    ALTER TABLE invoices ADD COLUMN sent_at timestamptz;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='invoices' AND column_name='internal_notes') THEN
    ALTER TABLE invoices ADD COLUMN internal_notes text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='invoices' AND column_name='service_date_from') THEN
    ALTER TABLE invoices ADD COLUMN service_date_from date;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='invoices' AND column_name='service_date_to') THEN
    ALTER TABLE invoices ADD COLUMN service_date_to date;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='invoices' AND column_name='tenant_id') THEN
    ALTER TABLE invoices ADD COLUMN tenant_id uuid REFERENCES tenants(id);
  END IF;
END $$;

-- Back-fill guest_name and guest_email from guests table
UPDATE invoices
SET
  guest_name = trim(g.first_name || ' ' || g.last_name),
  guest_email = g.email
FROM guests g
WHERE invoices.guest_id = g.id
  AND (invoices.guest_name = '' OR invoices.guest_name IS NULL);

-- Back-fill payment_method, booking_reference, service dates from reservations
UPDATE invoices
SET
  payment_method = r.payment_method,
  booking_reference = r.confirmation_code,
  service_date_from = r.check_in,
  service_date_to = r.check_out
FROM reservations r
WHERE invoices.reservation_id = r.id
  AND invoices.payment_method IS NULL;

-- Back-fill tenant_id via hotel
UPDATE invoices
SET tenant_id = h.tenant_id
FROM hotels h
WHERE invoices.hotel_id = h.id AND invoices.tenant_id IS NULL;

-- Back-fill paid_amount from amount_paid
UPDATE invoices SET paid_amount = amount_paid WHERE paid_amount = 0 AND amount_paid > 0;

-- Back-fill paid_at for already-paid invoices
UPDATE invoices SET paid_at = updated_at WHERE status = 'paid' AND paid_at IS NULL;

-- ============================================================
-- 2. Create invoice_line_items table (used by InvoicingPage)
-- ============================================================
CREATE TABLE IF NOT EXISTS invoice_line_items (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id     uuid REFERENCES hotels(id),
  invoice_id   uuid NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  description  text NOT NULL DEFAULT '',
  category     text NOT NULL DEFAULT 'accommodation',
  quantity     numeric(10,3) NOT NULL DEFAULT 1,
  unit         text NOT NULL DEFAULT 'night',
  unit_price   numeric(12,2) NOT NULL DEFAULT 0,
  tax_rate     numeric(5,2) NOT NULL DEFAULT 0,
  discount_pct numeric(5,2) NOT NULL DEFAULT 0,
  line_total   numeric(12,2) NOT NULL DEFAULT 0,
  sort_order   integer NOT NULL DEFAULT 0,
  created_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE invoice_line_items ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_invoice_line_items_invoice_id ON invoice_line_items(invoice_id);

CREATE POLICY "Staff can view invoice line items"
  ON invoice_line_items FOR SELECT
  TO authenticated
  USING (
    hotel_id IN (
      SELECT sm.hotel_id FROM staff_members sm
      WHERE sm.user_id = auth.uid() AND sm.is_active = true
    )
  );

CREATE POLICY "Staff can insert invoice line items"
  ON invoice_line_items FOR INSERT
  TO authenticated
  WITH CHECK (
    hotel_id IN (
      SELECT sm.hotel_id FROM staff_members sm
      WHERE sm.user_id = auth.uid() AND sm.is_active = true
    )
  );

CREATE POLICY "Staff can update invoice line items"
  ON invoice_line_items FOR UPDATE
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

CREATE POLICY "Staff can delete invoice line items"
  ON invoice_line_items FOR DELETE
  TO authenticated
  USING (
    hotel_id IN (
      SELECT sm.hotel_id FROM staff_members sm
      WHERE sm.user_id = auth.uid() AND sm.is_active = true
    )
  );

-- ============================================================
-- 3. Create payment_rules table
-- ============================================================
CREATE TABLE IF NOT EXISTS payment_rules (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id              uuid NOT NULL REFERENCES hotels(id),
  tenant_id             uuid REFERENCES tenants(id),
  name                  text NOT NULL DEFAULT '',
  trigger               text NOT NULL DEFAULT 'on_booking',
  days_before           integer,
  amount_type           text NOT NULL DEFAULT 'percentage',
  amount_value          numeric(12,2) NOT NULL DEFAULT 0,
  payment_type          text NOT NULL DEFAULT 'deposit',
  applies_to            text NOT NULL DEFAULT 'all',
  send_reminder         boolean NOT NULL DEFAULT true,
  reminder_days_before  integer NOT NULL DEFAULT 3,
  active                boolean NOT NULL DEFAULT true,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE payment_rules ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_payment_rules_hotel_id ON payment_rules(hotel_id);

CREATE POLICY "Staff can view hotel payment rules"
  ON payment_rules FOR SELECT
  TO authenticated
  USING (
    hotel_id IN (
      SELECT sm.hotel_id FROM staff_members sm
      WHERE sm.user_id = auth.uid() AND sm.is_active = true
    )
  );

CREATE POLICY "Staff can insert hotel payment rules"
  ON payment_rules FOR INSERT
  TO authenticated
  WITH CHECK (
    hotel_id IN (
      SELECT sm.hotel_id FROM staff_members sm
      WHERE sm.user_id = auth.uid() AND sm.is_active = true
    )
  );

CREATE POLICY "Staff can update hotel payment rules"
  ON payment_rules FOR UPDATE
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

CREATE POLICY "Staff can delete hotel payment rules"
  ON payment_rules FOR DELETE
  TO authenticated
  USING (
    hotel_id IN (
      SELECT sm.hotel_id FROM staff_members sm
      WHERE sm.user_id = auth.uid() AND sm.is_active = true
    )
  );

-- ============================================================
-- 4. Create payment_transactions table
-- ============================================================
CREATE TABLE IF NOT EXISTS payment_transactions (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id         uuid NOT NULL REFERENCES hotels(id),
  tenant_id        uuid REFERENCES tenants(id),
  invoice_id       uuid REFERENCES invoices(id),
  reservation_id   uuid REFERENCES reservations(id),
  guest_name       text NOT NULL DEFAULT '',
  booking_source   text NOT NULL DEFAULT 'direct',
  amount           numeric(12,2) NOT NULL DEFAULT 0,
  currency         text NOT NULL DEFAULT 'EUR',
  type             text NOT NULL DEFAULT 'charge',
  status           text NOT NULL DEFAULT 'pending',
  payment_method   text,
  card_last4       text,
  card_brand       text,
  notes            text,
  refund_reason    text,
  scheduled_date   date,
  processed_at     timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_payment_transactions_hotel_id    ON payment_transactions(hotel_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_invoice_id  ON payment_transactions(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_status      ON payment_transactions(status);

CREATE POLICY "Staff can view hotel payment transactions"
  ON payment_transactions FOR SELECT
  TO authenticated
  USING (
    hotel_id IN (
      SELECT sm.hotel_id FROM staff_members sm
      WHERE sm.user_id = auth.uid() AND sm.is_active = true
    )
  );

CREATE POLICY "Staff can insert hotel payment transactions"
  ON payment_transactions FOR INSERT
  TO authenticated
  WITH CHECK (
    hotel_id IN (
      SELECT sm.hotel_id FROM staff_members sm
      WHERE sm.user_id = auth.uid() AND sm.is_active = true
    )
  );

CREATE POLICY "Staff can update hotel payment transactions"
  ON payment_transactions FOR UPDATE
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

CREATE POLICY "Staff can delete hotel payment transactions"
  ON payment_transactions FOR DELETE
  TO authenticated
  USING (
    hotel_id IN (
      SELECT sm.hotel_id FROM staff_members sm
      WHERE sm.user_id = auth.uid() AND sm.is_active = true
    )
  );

-- ============================================================
-- 5. Backfill payment_transactions from all paid invoices
-- ============================================================
INSERT INTO payment_transactions (
  hotel_id, tenant_id, invoice_id, reservation_id,
  guest_name, booking_source,
  amount, currency, type, status,
  payment_method, notes,
  processed_at, created_at, updated_at
)
SELECT
  i.hotel_id,
  h.tenant_id,
  i.id,
  i.reservation_id,
  COALESCE(NULLIF(trim(i.guest_name), ''), 'Guest'),
  COALESCE(NULLIF(i.booking_reference, ''), 'direct'),
  i.amount_paid,
  COALESCE(NULLIF(i.currency, ''), 'EUR'),
  'charge',
  'captured',
  COALESCE(i.payment_method, 'card'),
  'Invoice ' || i.invoice_number,
  COALESCE(i.paid_at, i.updated_at),
  i.created_at,
  i.updated_at
FROM invoices i
JOIN hotels h ON h.id = i.hotel_id
WHERE i.status = 'paid';

-- ============================================================
-- 6. Trigger: auto-create transaction when invoice is paid
-- ============================================================
CREATE OR REPLACE FUNCTION create_transaction_on_invoice_paid()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_guest_name  text;
  v_booking_src text;
  v_pay_method  text;
  v_tenant_id   uuid;
BEGIN
  IF NEW.status = 'paid' AND (OLD.status IS DISTINCT FROM 'paid') THEN
    SELECT h.tenant_id INTO v_tenant_id FROM hotels h WHERE h.id = NEW.hotel_id;

    SELECT trim(g.first_name || ' ' || g.last_name) INTO v_guest_name
    FROM guests g WHERE g.id = NEW.guest_id;

    SELECT r.booking_source, r.payment_method INTO v_booking_src, v_pay_method
    FROM reservations r WHERE r.id = NEW.reservation_id;

    INSERT INTO payment_transactions (
      hotel_id, tenant_id, invoice_id, reservation_id,
      guest_name, booking_source,
      amount, currency, type, status,
      payment_method, notes,
      processed_at, created_at
    ) VALUES (
      NEW.hotel_id,
      v_tenant_id,
      NEW.id,
      NEW.reservation_id,
      COALESCE(NULLIF(NEW.guest_name, ''), v_guest_name, 'Guest'),
      COALESCE(v_booking_src, 'direct'),
      NEW.amount_paid,
      COALESCE(NULLIF(NEW.currency, ''), 'EUR'),
      'charge',
      'captured',
      COALESCE(NEW.payment_method, v_pay_method, 'card'),
      'Invoice ' || NEW.invoice_number,
      COALESCE(NEW.paid_at, now()),
      now()
    );

    UPDATE invoices SET paid_at = now() WHERE id = NEW.id AND paid_at IS NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_invoice_paid_create_transaction ON invoices;
CREATE TRIGGER trg_invoice_paid_create_transaction
  AFTER UPDATE OF status ON invoices
  FOR EACH ROW EXECUTE FUNCTION create_transaction_on_invoice_paid();
