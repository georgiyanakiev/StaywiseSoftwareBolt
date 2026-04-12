/*
  # Fix overdue invoice statuses

  1. Changes
    - Updates invoices that have passed their due date and are not fully paid
      from 'sent' or 'draft' status to 'overdue'
    - Only affects invoices where due_date < CURRENT_DATE and amount_paid < total_amount

  2. Important Notes
    - This is a one-time correction for invoices that should have been marked overdue
    - No data is deleted or dropped
*/

UPDATE invoices
SET status = 'overdue',
    updated_at = now()
WHERE status IN ('sent', 'draft')
  AND due_date < CURRENT_DATE
  AND amount_paid < total_amount;
