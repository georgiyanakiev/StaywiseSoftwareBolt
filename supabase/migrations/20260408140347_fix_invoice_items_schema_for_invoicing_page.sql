/*
  # Fix invoice_items schema to support InvoicingPage

  ## Summary
  The InvoicingPage and InvoiceEditorModal query and write to `invoice_line_items`,
  but all real line-item data lives in `invoice_items`. This migration adds the
  missing columns to `invoice_items` so the code can be redirected to the correct
  table without data loss.

  ## Changes
  - `invoice_items`: Add hotel_id, tenant_id, unit, tax_rate, discount_pct,
    line_total, sort_order columns (all with safe defaults)
  - Backfill `line_total` from `total_price` for all existing rows

  ## Notes
  - All new columns use IF NOT EXISTS guards — safe to run multiple times
  - `line_total` is kept as a writable column (not generated) so inserts work
  - Existing rows get line_total = total_price as a one-time backfill
*/

ALTER TABLE invoice_items
  ADD COLUMN IF NOT EXISTS hotel_id uuid REFERENCES hotels(id),
  ADD COLUMN IF NOT EXISTS tenant_id uuid,
  ADD COLUMN IF NOT EXISTS unit text NOT NULL DEFAULT 'night',
  ADD COLUMN IF NOT EXISTS tax_rate numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discount_pct numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS line_total numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;

UPDATE invoice_items SET line_total = total_price WHERE line_total = 0 AND total_price > 0;
