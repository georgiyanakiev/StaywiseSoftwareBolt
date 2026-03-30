/*
  # Invoicing V2 Tables

  ## Summary
  Adds a dedicated invoicing module with full line-item support, separate from
  the existing billing invoices table.

  ## New Tables
  - `invoices_v2` — Invoice records with guest info, totals, status
  - `invoice_lines` — Individual line items for each invoice

  ## Security
  - RLS enabled on all tables
  - Authenticated staff can read/write their hotel's data
*/

CREATE TABLE IF NOT EXISTS invoices_v2 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid REFERENCES hotels(id),
  invoice_number text NOT NULL,
  guest_name text NOT NULL DEFAULT '',
  guest_email text DEFAULT '',
  guest_address text DEFAULT '',
  guest_vat_number text DEFAULT '',
  issue_date date DEFAULT CURRENT_DATE,
  due_date date,
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'cancelled')),
  currency text DEFAULT 'EUR',
  subtotal numeric(10,2) DEFAULT 0,
  tax_rate numeric(5,2) DEFAULT 20,
  tax_amount numeric(10,2) DEFAULT 0,
  discount_amount numeric(10,2) DEFAULT 0,
  total_amount numeric(10,2) DEFAULT 0,
  paid_amount numeric(10,2) DEFAULT 0,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE invoices_v2 ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view invoices_v2"
  ON invoices_v2 FOR SELECT
  TO authenticated
  USING (
    hotel_id IN (SELECT hotel_id FROM staff_members WHERE user_id = auth.uid() AND is_active = true)
  );

CREATE POLICY "Staff can insert invoices_v2"
  ON invoices_v2 FOR INSERT
  TO authenticated
  WITH CHECK (
    hotel_id IN (SELECT hotel_id FROM staff_members WHERE user_id = auth.uid() AND is_active = true)
  );

CREATE POLICY "Staff can update invoices_v2"
  ON invoices_v2 FOR UPDATE
  TO authenticated
  USING (
    hotel_id IN (SELECT hotel_id FROM staff_members WHERE user_id = auth.uid() AND is_active = true)
  )
  WITH CHECK (
    hotel_id IN (SELECT hotel_id FROM staff_members WHERE user_id = auth.uid() AND is_active = true)
  );

CREATE POLICY "Staff can delete invoices_v2"
  ON invoices_v2 FOR DELETE
  TO authenticated
  USING (
    hotel_id IN (SELECT hotel_id FROM staff_members WHERE user_id = auth.uid() AND is_active = true)
  );

CREATE TABLE IF NOT EXISTS invoice_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid REFERENCES invoices_v2(id) ON DELETE CASCADE,
  description text NOT NULL DEFAULT '',
  quantity numeric(10,2) DEFAULT 1,
  unit_price numeric(10,2) NOT NULL DEFAULT 0,
  tax_rate numeric(5,2) DEFAULT 20,
  line_total numeric(10,2) NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE invoice_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view invoice_lines"
  ON invoice_lines FOR SELECT
  TO authenticated
  USING (
    invoice_id IN (
      SELECT id FROM invoices_v2 WHERE hotel_id IN (
        SELECT hotel_id FROM staff_members WHERE user_id = auth.uid() AND is_active = true
      )
    )
  );

CREATE POLICY "Staff can insert invoice_lines"
  ON invoice_lines FOR INSERT
  TO authenticated
  WITH CHECK (
    invoice_id IN (
      SELECT id FROM invoices_v2 WHERE hotel_id IN (
        SELECT hotel_id FROM staff_members WHERE user_id = auth.uid() AND is_active = true
      )
    )
  );

CREATE POLICY "Staff can delete invoice_lines"
  ON invoice_lines FOR DELETE
  TO authenticated
  USING (
    invoice_id IN (
      SELECT id FROM invoices_v2 WHERE hotel_id IN (
        SELECT hotel_id FROM staff_members WHERE user_id = auth.uid() AND is_active = true
      )
    )
  );

CREATE INDEX IF NOT EXISTS idx_invoices_v2_hotel ON invoices_v2(hotel_id);
CREATE INDEX IF NOT EXISTS idx_invoice_lines_invoice ON invoice_lines(invoice_id);
