/*
  # Fix Payments Table and Backfill from Invoices

  ## Problem
  BillingPage inserts `tenant_id` into the `payments` table but the column does not
  exist, causing every payment insert to fail silently with a schema error.
  Additionally, invoices that already have `amount_paid > 0` (seeded via migrations)
  have no corresponding `payments` ledger rows, so payment history always shows empty.

  ## Changes
  1. Add nullable `tenant_id` column to `payments` (unblocks the insert).
  2. Drop the overly-strict INSERT policy that had no WITH CHECK; replace with a
     proper staff-scoped policy.
  3. Backfill one `payments` record for every invoice where `amount_paid > 0` and
     no payment record exists yet.
  4. Add a DB trigger that keeps `paid_amount` ↔ `amount_paid` in sync on `invoices`
     so BillingPage writes and InvoicingPage reads stay consistent.
*/

-- 1. Add tenant_id to payments
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'payments' AND column_name = 'tenant_id'
  ) THEN
    ALTER TABLE payments ADD COLUMN tenant_id uuid REFERENCES tenants(id);
    CREATE INDEX IF NOT EXISTS idx_payments_tenant_id ON payments(tenant_id);
  END IF;
END $$;

-- 2. Recreate INSERT policy with proper WITH CHECK
DROP POLICY IF EXISTS "Users can create payments for their hotel" ON payments;

CREATE POLICY "Staff can insert payments for their hotel"
  ON payments FOR INSERT
  TO authenticated
  WITH CHECK (
    hotel_id IN (
      SELECT sm.hotel_id FROM staff_members sm
      WHERE sm.user_id = auth.uid() AND sm.is_active = true
    )
  );

-- 3. Backfill payments from invoices (one record per paid invoice)
INSERT INTO payments (
  hotel_id, tenant_id, invoice_id, guest_id, reservation_id,
  amount, payment_method, payment_date, notes, processed_by
)
SELECT
  i.hotel_id,
  i.tenant_id,
  i.id,
  i.guest_id,
  i.reservation_id,
  i.amount_paid,
  COALESCE(i.payment_method, 'card'),
  COALESCE(i.updated_at, i.created_at),
  'Backfilled from invoice record',
  'System'
FROM invoices i
WHERE i.amount_paid > 0
  AND NOT EXISTS (
    SELECT 1 FROM payments p WHERE p.invoice_id = i.id
  );

-- 4. Trigger: keep amount_paid ↔ paid_amount in sync on invoices
CREATE OR REPLACE FUNCTION sync_invoice_payment_columns()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NEW.amount_paid IS DISTINCT FROM OLD.amount_paid AND NEW.paid_amount = OLD.paid_amount THEN
      NEW.paid_amount := NEW.amount_paid;
    ELSIF NEW.paid_amount IS DISTINCT FROM OLD.paid_amount AND NEW.amount_paid = OLD.amount_paid THEN
      NEW.amount_paid := NEW.paid_amount;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_invoice_payment_columns ON invoices;
CREATE TRIGGER trg_sync_invoice_payment_columns
  BEFORE UPDATE ON invoices
  FOR EACH ROW EXECUTE FUNCTION sync_invoice_payment_columns();
