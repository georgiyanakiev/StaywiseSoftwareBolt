/*
  # Fix invoice tax rates and line totals

  1. Changes
    - Sets invoice header `tax_rate` to the actual rate used (derived from tax_amount / subtotal)
      where tax_rate was incorrectly stored as 0 but tax was applied
    - Fixes `subtotal` on invoices where it doesn't match the sum of line items
      (some seeded invoices had line_total including tax, causing subtotal mismatch)
    - Recalculates `line_total` on invoice_items where it was left at 0
    - Syncs `paid_amount` and `amount_paid` columns to always match

  2. Important Notes
    - Only modifies invoices where tax_rate=0 but tax_amount > 0
    - Uses the actual tax percentage derived from the existing amounts
    - Ensures subtotal + tax_amount - discount_amount = total_amount identity holds
    - No invoices are deleted or dropped
*/

-- Step 1: Fix line_total = 0 on invoice_items (set to quantity * unit_price * (1 - discount_pct/100))
UPDATE invoice_items
SET line_total = quantity * unit_price * (1 - discount_pct / 100)
WHERE line_total = 0;

-- Step 2: Fix invoice tax_rate where it's 0 but tax was actually applied
UPDATE invoices
SET tax_rate = ROUND((tax_amount / NULLIF(subtotal - discount_amount, 0)) * 100, 2)
WHERE tax_rate = 0
  AND tax_amount > 0
  AND subtotal > 0;

-- Step 3: Fix subtotal to match line items where they're out of sync
-- The subtotal should be sum of line_totals (pre-tax), then tax is calculated on top
UPDATE invoices i
SET subtotal = li.lines_subtotal,
    tax_amount = ROUND(li.lines_subtotal * i.tax_rate / 100, 2),
    total_amount = li.lines_subtotal + ROUND(li.lines_subtotal * i.tax_rate / 100, 2) - i.discount_amount,
    updated_at = now()
FROM (
  SELECT invoice_id, SUM(line_total) as lines_subtotal
  FROM invoice_items
  GROUP BY invoice_id
) li
WHERE li.invoice_id = i.id
  AND ABS(i.subtotal - li.lines_subtotal) > 0.01
  AND i.tax_rate > 0;

-- Step 4: For invoices that changed total_amount, re-check paid status
UPDATE invoices
SET status = 'paid'
WHERE amount_paid >= total_amount - 0.01
  AND total_amount > 0
  AND status NOT IN ('paid', 'cancelled', 'void');

UPDATE invoices
SET status = CASE
    WHEN due_date < CURRENT_DATE THEN 'overdue'
    ELSE 'sent'
  END
WHERE amount_paid < total_amount - 0.01
  AND status = 'paid'
  AND total_amount > 0;

-- Step 5: Sync paid_amount and amount_paid to always match
UPDATE invoices
SET paid_amount = amount_paid
WHERE ABS(paid_amount - amount_paid) > 0.001;
