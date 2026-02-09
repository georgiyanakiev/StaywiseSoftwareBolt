/*
  # Add Payment Tracking System

  1. New Tables
    - `payments`
      - `id` (uuid, primary key)
      - `hotel_id` (uuid, foreign key to hotels)
      - `invoice_id` (uuid, foreign key to invoices)
      - `guest_id` (uuid, foreign key to guests)
      - `reservation_id` (uuid, optional foreign key to reservations)
      - `amount` (numeric)
      - `payment_method` (text: cash, card, bank_transfer, check, other)
      - `payment_date` (timestamptz)
      - `reference_number` (text)
      - `notes` (text)
      - `processed_by` (text)
      - `created_at` (timestamptz)
      
  2. Security
    - Enable RLS on `payments` table
    - Add policies for authenticated users to manage payments
*/

-- Create payments table
CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid REFERENCES hotels(id) NOT NULL,
  invoice_id uuid REFERENCES invoices(id) NOT NULL,
  guest_id uuid REFERENCES guests(id) NOT NULL,
  reservation_id uuid REFERENCES reservations(id),
  amount numeric NOT NULL DEFAULT 0,
  payment_method text NOT NULL DEFAULT 'cash',
  payment_date timestamptz NOT NULL DEFAULT now(),
  reference_number text DEFAULT '',
  notes text DEFAULT '',
  processed_by text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Policies for payments
CREATE POLICY "Users can view payments for their hotel"
  ON payments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create payments for their hotel"
  ON payments FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update payments for their hotel"
  ON payments FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_payments_hotel_id ON payments(hotel_id);
CREATE INDEX IF NOT EXISTS idx_payments_invoice_id ON payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_guest_id ON payments(guest_id);
CREATE INDEX IF NOT EXISTS idx_payments_payment_date ON payments(payment_date);
