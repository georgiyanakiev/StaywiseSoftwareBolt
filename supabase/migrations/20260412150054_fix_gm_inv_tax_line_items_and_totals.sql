/*
  # Fix GM-INV invoices: remove tax line items and recalculate

  1. Changes
    - Removes "VAT / Tax" line items from GM-INV invoices (tax was modeled
      as a separate line item, but the invoice editor expects per-line tax_rate)
    - Sets per-line tax_rate = 10 on the accommodation line items
    - Recalculates invoice header subtotal, tax_amount, and total_amount
      from the corrected line items
    - Re-reconciles invoice payment statuses

  2. Important Notes
    - Only affects GM-INV-* invoices that have a "VAT / Tax" line item
    - The accommodation line items remain unchanged
    - Payment amounts (amount_paid, paid_amount) are NOT changed
*/

-- Step 1: Set tax_rate = 10 on GM-INV accommodation lines (non-tax lines)
UPDATE invoice_items ii
SET tax_rate = 10
FROM invoices i
WHERE ii.invoice_id = i.id
  AND i.invoice_number LIKE 'GM-INV%'
  AND ii.description NOT LIKE 'VAT%'
  AND ii.tax_rate = 0;

-- Step 2: Delete the "VAT / Tax" line items from GM-INV invoices
DELETE FROM invoice_items ii
USING invoices i
WHERE ii.invoice_id = i.id
  AND i.invoice_number LIKE 'GM-INV%'
  AND ii.description LIKE 'VAT%';

-- Step 3: Recalculate GM-INV invoice headers from remaining line items
UPDATE invoices inv
SET subtotal = li.lines_subtotal,
    tax_amount = ROUND(li.lines_subtotal * 10 / 100, 2),
    total_amount = li.lines_subtotal + ROUND(li.lines_subtotal * 10 / 100, 2) - inv.discount_amount,
    tax_rate = 10,
    updated_at = now()
FROM (
  SELECT invoice_id, SUM(line_total) as lines_subtotal
  FROM invoice_items
  GROUP BY invoice_id
) li
WHERE li.invoice_id = inv.id
  AND inv.invoice_number LIKE 'GM-INV%';

-- Step 4: Re-reconcile statuses
-- Fully paid invoices
UPDATE invoices
SET status = 'paid'
WHERE invoice_number LIKE 'GM-INV%'
  AND amount_paid >= total_amount - 0.01
  AND total_amount > 0
  AND status NOT IN ('paid', 'cancelled', 'void');

-- Partially or unpaid invoices
UPDATE invoices
SET status = CASE
    WHEN amount_paid <= 0.01 AND due_date < CURRENT_DATE THEN 'overdue'
    WHEN amount_paid <= 0.01 THEN 'sent'
    WHEN due_date < CURRENT_DATE THEN 'overdue'
    ELSE 'sent'
  END
WHERE invoice_number LIKE 'GM-INV%'
  AND amount_paid < total_amount - 0.01
  AND status NOT IN ('cancelled', 'void', 'draft');
