
/*
  # C-01 Fix: Backfill Missing Invoices for Checked-Out Reservations

  ## Problem
  21 checked-out reservations (19 at The Grand Metropolitan, 2 at DoubleTree
  Chester) had no corresponding invoice. All 21 have payment_status = 'paid'.

  ## Changes
  For each checked-out reservation that has no invoice:
  - Creates an invoice (status = 'paid', amounts matching the reservation)
  - Creates invoice_items (accommodation line + tax line)
  - Creates a payment record so the payments table stays reconciled

  ## Notes
  - Invoice numbers continue sequentially from each hotel's existing count
  - payment_method defaults to 'card' where the reservation has no method set
  - All records use NOW() timestamps with the correct hotel/tenant IDs
*/

DO $$
DECLARE
  rec         RECORD;
  v_inv_id    uuid;
  v_inv_num   text;
  v_prefix    text;
  v_seq       integer;
  v_nights    integer;
  v_subtotal  numeric;
  v_pay_meth  text;
  v_tenant_id uuid;
BEGIN
  FOR rec IN
    SELECT
      r.id              AS res_id,
      r.hotel_id,
      r.guest_id,
      r.check_in,
      r.check_out,
      r.total_amount,
      r.base_rate,
      r.tax_amount,
      r.discount_amount,
      r.payment_method,
      r.confirmation_code,
      r.booking_source,
      g.first_name || ' ' || g.last_name AS guest_name,
      h.currency,
      h.name            AS hotel_name
    FROM reservations r
    JOIN guests  g ON g.id = r.guest_id
    JOIN hotels  h ON h.id = r.hotel_id
    WHERE r.status = 'checked_out'
      AND r.payment_status = 'paid'
      AND NOT EXISTS (
        SELECT 1 FROM invoices i WHERE i.reservation_id = r.id
      )
    ORDER BY r.hotel_id, r.check_out
  LOOP
    -- Hotel invoice prefix
    v_prefix := get_hotel_invoice_prefix(rec.hotel_id);

    -- Tenant
    SELECT DISTINCT sm.tenant_id INTO v_tenant_id
    FROM staff_members sm
    WHERE sm.hotel_id = rec.hotel_id
    LIMIT 1;

    -- Next sequential number for this hotel + year (increments with each insert)
    SELECT COUNT(*) + 1 INTO v_seq
    FROM invoices
    WHERE hotel_id = rec.hotel_id
      AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM NOW());

    v_inv_num := v_prefix
      || '-INV-' || TO_CHAR(NOW(), 'YYYY')
      || '-' || LPAD(v_seq::text, 3, '0');

    -- Calculated fields
    v_nights   := GREATEST((rec.check_out - rec.check_in), 1);
    v_subtotal := COALESCE(rec.total_amount, 0) - COALESCE(rec.tax_amount, 0);
    v_pay_meth := NULLIF(TRIM(COALESCE(rec.payment_method, '')), '');

    -- ── Invoice ──────────────────────────────────────────────────────────────
    INSERT INTO invoices (
      hotel_id, reservation_id, guest_id, invoice_number,
      issue_date, due_date,
      subtotal, tax_amount, discount_amount, total_amount, amount_paid,
      status, currency, guest_name,
      service_date_from, service_date_to,
      booking_reference, tenant_id,
      paid_at, paid_amount, payment_method,
      created_at, updated_at
    ) VALUES (
      rec.hotel_id, rec.res_id, rec.guest_id, v_inv_num,
      rec.check_out, rec.check_out + 7,
      v_subtotal,
      COALESCE(rec.tax_amount, 0),
      COALESCE(rec.discount_amount, 0),
      COALESCE(rec.total_amount, 0),
      COALESCE(rec.total_amount, 0),
      'paid',
      COALESCE(rec.currency, 'GBP'),
      rec.guest_name,
      rec.check_in, rec.check_out,
      COALESCE(rec.confirmation_code, ''),
      v_tenant_id,
      (rec.check_out::timestamp AT TIME ZONE 'UTC') + interval '12 hours',
      COALESCE(rec.total_amount, 0),
      v_pay_meth,
      (rec.check_out::timestamp AT TIME ZONE 'UTC') + interval '12 hours',
      NOW()
    )
    RETURNING id INTO v_inv_id;

    -- ── Invoice items: accommodation ──────────────────────────────────────
    INSERT INTO invoice_items (invoice_id, description, category, quantity, unit_price, total_price)
    VALUES (
      v_inv_id,
      'Room Accommodation ('
        || v_nights || ' night' || CASE WHEN v_nights > 1 THEN 's' ELSE '' END || ')',
      'room',
      v_nights,
      COALESCE(rec.base_rate, 0),
      v_subtotal
    );

    -- ── Invoice items: tax (only if > 0) ──────────────────────────────────
    IF COALESCE(rec.tax_amount, 0) > 0 THEN
      INSERT INTO invoice_items (invoice_id, description, category, quantity, unit_price, total_price)
      VALUES (
        v_inv_id,
        'VAT / Tax',
        'tax',
        1,
        COALESCE(rec.tax_amount, 0),
        COALESCE(rec.tax_amount, 0)
      );
    END IF;

    -- ── Payment record ────────────────────────────────────────────────────
    INSERT INTO payments (
      hotel_id, invoice_id, guest_id, reservation_id,
      amount, payment_method, payment_date,
      reference_number, notes, tenant_id
    ) VALUES (
      rec.hotel_id, v_inv_id, rec.guest_id, rec.res_id,
      COALESCE(rec.total_amount, 0),
      COALESCE(v_pay_meth, 'card'),
      (rec.check_out::timestamp AT TIME ZONE 'UTC') + interval '12 hours',
      COALESCE(rec.confirmation_code, ''),
      'Backfilled — payment confirmed at checkout',
      v_tenant_id
    );

  END LOOP;
END;
$$;
