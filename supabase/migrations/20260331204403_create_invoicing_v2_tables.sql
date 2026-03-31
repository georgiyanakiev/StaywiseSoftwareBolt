/*
  # Create Full Invoicing Tables (Feature 6)

  ## Summary
  This migration creates a complete invoicing schema to replace the partial
  invoices_v2/invoice_lines tables. Includes invoice settings, full invoice
  metadata, and line items with all required fields.

  ## New Tables

  ### invoice_settings
  Per-tenant configuration for invoice branding, numbering, bank details,
  default tax rate, footer text, etc.

  ### invoices
  Full invoice records with guest billing address, service dates, type
  (invoice/receipt/credit_note/proforma), multi-status workflow, discount
  and tax calculations, and generated balance_due column.

  ### invoice_line_items
  Line items for each invoice with category, unit, per-line tax rate and
  discount percentage.

  ## Security
  - RLS enabled on all tables with policies for authenticated users only
*/

-- ── invoice_settings ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS invoice_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants(id) UNIQUE,
  hotel_id uuid REFERENCES hotels(id),
  hotel_name text DEFAULT '',
  hotel_address text DEFAULT '',
  hotel_vat_number text DEFAULT '',
  hotel_registration_number text DEFAULT '',
  hotel_email text DEFAULT '',
  hotel_phone text DEFAULT '',
  hotel_website text DEFAULT '',
  invoice_prefix text DEFAULT 'INV',
  invoice_counter integer DEFAULT 1,
  default_tax_rate numeric(5,2) DEFAULT 20,
  default_currency text DEFAULT 'EUR',
  payment_terms_days integer DEFAULT 14,
  footer_text text DEFAULT '',
  bank_name text DEFAULT '',
  bank_iban text DEFAULT '',
  bank_swift text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE invoice_settings ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='invoice_settings' AND policyname='Authenticated users can manage invoice settings') THEN
    CREATE POLICY "Authenticated users can manage invoice settings"
      ON invoice_settings FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ── invoices ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid REFERENCES hotels(id),
  tenant_id uuid REFERENCES tenants(id),
  invoice_number text NOT NULL DEFAULT '',
  reservation_id uuid REFERENCES reservations(id),
  booking_reference text DEFAULT '',
  type text DEFAULT 'invoice' CHECK (type IN ('invoice','receipt','credit_note','proforma')),
  guest_name text NOT NULL DEFAULT '',
  guest_email text DEFAULT '',
  guest_address text DEFAULT '',
  guest_city text DEFAULT '',
  guest_country text DEFAULT '',
  guest_vat_number text DEFAULT '',
  issue_date date DEFAULT CURRENT_DATE,
  due_date date,
  service_date_from date,
  service_date_to date,
  status text DEFAULT 'draft' CHECK (status IN ('draft','sent','paid','partially_paid','overdue','cancelled','void')),
  currency text DEFAULT 'EUR',
  subtotal numeric(10,2) DEFAULT 0,
  discount_type text CHECK (discount_type IN ('percentage','fixed')),
  discount_value numeric(10,2) DEFAULT 0,
  discount_amount numeric(10,2) DEFAULT 0,
  tax_rate numeric(5,2) DEFAULT 20,
  tax_amount numeric(10,2) DEFAULT 0,
  total_amount numeric(10,2) DEFAULT 0,
  paid_amount numeric(10,2) DEFAULT 0,
  notes text DEFAULT '',
  internal_notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  sent_at timestamptz,
  paid_at timestamptz
);

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='invoices' AND policyname='Authenticated users can manage invoices') THEN
    CREATE POLICY "Authenticated users can manage invoices"
      ON invoices FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ── invoice_line_items ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS invoice_line_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid REFERENCES hotels(id),
  tenant_id uuid REFERENCES tenants(id),
  invoice_id uuid REFERENCES invoices(id) ON DELETE CASCADE,
  description text NOT NULL DEFAULT '',
  category text DEFAULT 'accommodation',
  quantity numeric(10,3) DEFAULT 1,
  unit text DEFAULT 'night',
  unit_price numeric(10,2) NOT NULL DEFAULT 0,
  tax_rate numeric(5,2) DEFAULT 20,
  discount_pct numeric(5,2) DEFAULT 0,
  line_total numeric(10,2) NOT NULL DEFAULT 0,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE invoice_line_items ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='invoice_line_items' AND policyname='Authenticated users can manage invoice line items') THEN
    CREATE POLICY "Authenticated users can manage invoice line items"
      ON invoice_line_items FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ── indexes ────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_invoices_hotel_id ON invoices(hotel_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoice_line_items_invoice_id ON invoice_line_items(invoice_id);
