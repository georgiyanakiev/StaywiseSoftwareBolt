/*
  # Financial Audit Trail and Data Integrity Constraints

  1. New Tables
    - `invoice_audit_log` — records every create/update/delete on invoices with user, timestamp, old/new values
    - `payment_audit_log` — records every payment transaction with user, timestamp, amounts

  2. Constraints
    - Unique constraint on `reservations.confirmation_code` (per hotel) to prevent duplicate codes

  3. Database Functions & Triggers
    - `log_invoice_change()` — trigger function that inserts a row into invoice_audit_log on any change
    - `log_payment_change()` — trigger function that inserts a row into payment_audit_log on any change

  4. Security
    - RLS enabled on both audit tables
    - Only hotel staff can read their own hotel's audit logs
    - No user can delete audit records (append-only)
*/

CREATE TABLE IF NOT EXISTS invoice_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid,
  invoice_id uuid,
  invoice_number text,
  action text NOT NULL,
  changed_by uuid,
  old_data jsonb,
  new_data jsonb,
  changed_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE invoice_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Hotel staff can view invoice audit log"
  ON invoice_audit_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff_members
      WHERE staff_members.hotel_id = invoice_audit_log.hotel_id
        AND staff_members.user_id = auth.uid()
        AND staff_members.is_active = true
    )
  );

CREATE INDEX IF NOT EXISTS idx_invoice_audit_log_hotel ON invoice_audit_log(hotel_id);
CREATE INDEX IF NOT EXISTS idx_invoice_audit_log_invoice ON invoice_audit_log(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_audit_log_changed_at ON invoice_audit_log(changed_at DESC);

CREATE TABLE IF NOT EXISTS payment_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid,
  payment_id uuid,
  reservation_id uuid,
  invoice_id uuid,
  action text NOT NULL,
  amount numeric,
  payment_method text,
  changed_by uuid,
  old_data jsonb,
  new_data jsonb,
  changed_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE payment_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Hotel staff can view payment audit log"
  ON payment_audit_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff_members
      WHERE staff_members.hotel_id = payment_audit_log.hotel_id
        AND staff_members.user_id = auth.uid()
        AND staff_members.is_active = true
    )
  );

CREATE INDEX IF NOT EXISTS idx_payment_audit_log_hotel ON payment_audit_log(hotel_id);
CREATE INDEX IF NOT EXISTS idx_payment_audit_log_payment ON payment_audit_log(payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_audit_log_changed_at ON payment_audit_log(changed_at DESC);

CREATE OR REPLACE FUNCTION log_invoice_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO invoice_audit_log(hotel_id, invoice_id, invoice_number, action, changed_by, new_data)
    VALUES (NEW.hotel_id, NEW.id, NEW.invoice_number, 'created', auth.uid(), to_jsonb(NEW));
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO invoice_audit_log(hotel_id, invoice_id, invoice_number, action, changed_by, old_data, new_data)
    VALUES (NEW.hotel_id, NEW.id, NEW.invoice_number, 'updated', auth.uid(), to_jsonb(OLD), to_jsonb(NEW));
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO invoice_audit_log(hotel_id, invoice_id, invoice_number, action, changed_by, old_data)
    VALUES (OLD.hotel_id, OLD.id, OLD.invoice_number, 'deleted', auth.uid(), to_jsonb(OLD));
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_invoice_audit ON invoices;
CREATE TRIGGER trg_invoice_audit
  AFTER INSERT OR UPDATE OR DELETE ON invoices
  FOR EACH ROW EXECUTE FUNCTION log_invoice_change();

CREATE OR REPLACE FUNCTION log_payment_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO payment_audit_log(hotel_id, payment_id, reservation_id, invoice_id, action, amount, payment_method, changed_by, new_data)
    VALUES (NEW.hotel_id, NEW.id, NEW.reservation_id, NEW.invoice_id, 'created', NEW.amount, NEW.payment_method, auth.uid(), to_jsonb(NEW));
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO payment_audit_log(hotel_id, payment_id, reservation_id, invoice_id, action, amount, payment_method, changed_by, old_data, new_data)
    VALUES (NEW.hotel_id, NEW.id, NEW.reservation_id, NEW.invoice_id, 'updated', NEW.amount, NEW.payment_method, auth.uid(), to_jsonb(OLD), to_jsonb(NEW));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_payment_audit ON payments;
CREATE TRIGGER trg_payment_audit
  AFTER INSERT OR UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION log_payment_change();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'reservations_confirmation_code_hotel_unique'
      AND table_name = 'reservations'
  ) THEN
    ALTER TABLE reservations
      ADD CONSTRAINT reservations_confirmation_code_hotel_unique
      UNIQUE (hotel_id, confirmation_code);
  END IF;
END $$;
