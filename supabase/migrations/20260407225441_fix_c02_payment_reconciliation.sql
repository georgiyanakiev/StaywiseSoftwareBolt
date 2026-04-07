
/*
  # C-02 Fix: Payment Reconciliation

  ## Problem
  A duplicate payment was recorded against invoice INV-2026-2786 (two identical
  £1,232 card payments 17 seconds apart — a double-click bug). This caused the
  payments table total to exceed paid invoice totals by £3,822.27.

  ## Changes
  1. Delete the duplicate payment record (second of the two identical entries)
  2. Sync every invoice's amount_paid to match the actual sum of payments linked to it
  3. Set invoice status to 'paid' where amount_paid >= total_amount (and not draft)
  4. Set paid_at timestamp for invoices newly marked paid
*/

-- Step 1: Delete the duplicate payment (later of the two identical records on INV-2026-2786)
DELETE FROM payments
WHERE id = '7644683d-4388-4c26-b81f-a478bb4def8f';

-- Step 2: Sync invoice.amount_paid to equal the actual sum of linked payments
UPDATE invoices i
SET amount_paid = COALESCE(p.total_paid, 0),
    updated_at  = NOW()
FROM (
  SELECT invoice_id, SUM(amount) AS total_paid
  FROM payments
  GROUP BY invoice_id
) p
WHERE p.invoice_id = i.id
  AND p.total_paid IS DISTINCT FROM i.amount_paid;

-- Step 3: Mark invoices as 'paid' where full balance is covered and not draft
UPDATE invoices
SET status    = 'paid',
    paid_at   = COALESCE(paid_at, NOW()),
    paid_amount = total_amount,
    updated_at  = NOW()
WHERE amount_paid >= total_amount
  AND status NOT IN ('paid', 'draft', 'cancelled')
  AND total_amount > 0;
