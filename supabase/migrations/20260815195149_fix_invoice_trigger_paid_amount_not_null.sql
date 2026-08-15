-- Fix: paid_amount is NOT NULL but the trigger inserts NULL when payment_status != 'paid'
CREATE OR REPLACE FUNCTION public.fn_auto_create_invoice_on_checkout()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'private'
AS $function$
DECLARE
  v_invoice_id     uuid;
  v_invoice_number text;
  v_seq            integer;
  v_prefix         text;
  v_guest_name     text;
  v_nights         integer;
  v_subtotal       numeric;
  v_currency       text;
  v_tenant_id      uuid;
  v_pay_method     text;
BEGIN
  IF NEW.status <> 'checked_out' OR OLD.status = 'checked_out' THEN
    RETURN NEW;
  END IF;

  IF EXISTS (SELECT 1 FROM invoices WHERE reservation_id = NEW.id) THEN
    RETURN NEW;
  END IF;

  SELECT h.currency INTO v_currency FROM hotels h WHERE h.id = NEW.hotel_id;
  v_prefix := private.get_hotel_invoice_prefix(NEW.hotel_id);

  SELECT DISTINCT sm.tenant_id INTO v_tenant_id
  FROM staff_members sm
  WHERE sm.hotel_id = NEW.hotel_id
  LIMIT 1;

  SELECT COUNT(*) + 1 INTO v_seq
  FROM invoices
  WHERE hotel_id = NEW.hotel_id
    AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM NOW());

  v_invoice_number := v_prefix
    || '-INV-' || TO_CHAR(NOW(), 'YYYY')
    || '-' || LPAD(v_seq::text, 3, '0');

  SELECT first_name || ' ' || last_name INTO v_guest_name
  FROM guests WHERE id = NEW.guest_id;

  v_nights   := GREATEST((NEW.check_out - NEW.check_in), 1);
  v_subtotal := COALESCE(NEW.total_amount, 0) - COALESCE(NEW.tax_amount, 0);
  v_pay_method := NULLIF(TRIM(COALESCE(NEW.payment_method, '')), '');

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
    NEW.hotel_id, NEW.id, NEW.guest_id, v_invoice_number,
    CURRENT_DATE, CURRENT_DATE + 30,
    v_subtotal,
    COALESCE(NEW.tax_amount, 0),
    COALESCE(NEW.discount_amount, 0),
    COALESCE(NEW.total_amount, 0),
    CASE WHEN NEW.payment_status = 'paid' THEN COALESCE(NEW.total_amount, 0) ELSE 0 END,
    CASE WHEN NEW.payment_status = 'paid' THEN 'paid' ELSE 'sent' END,
    COALESCE(v_currency, 'GBP'),
    v_guest_name,
    NEW.check_in, NEW.check_out,
    COALESCE(NEW.confirmation_code, ''),
    v_tenant_id,
    CASE WHEN NEW.payment_status = 'paid' THEN NOW() ELSE NULL END,
    CASE WHEN NEW.payment_status = 'paid' THEN COALESCE(NEW.total_amount, 0) ELSE 0 END,
    v_pay_method,
    NOW(), NOW()
  )
  RETURNING id INTO v_invoice_id;

  INSERT INTO invoice_items (invoice_id, description, category, quantity, unit_price, total_price)
  VALUES (
    v_invoice_id,
    'Room Accommodation (' || v_nights || ' night' || CASE WHEN v_nights > 1 THEN 's' ELSE '' END || ')',
    'room',
    v_nights,
    COALESCE(NEW.base_rate, 0),
    v_subtotal
  );

  IF COALESCE(NEW.tax_amount, 0) > 0 THEN
    INSERT INTO invoice_items (invoice_id, description, category, quantity, unit_price, total_price)
    VALUES (
      v_invoice_id,
      'VAT / Tax',
      'tax',
      1,
      COALESCE(NEW.tax_amount, 0),
      COALESCE(NEW.tax_amount, 0)
    );
  END IF;

  IF NEW.payment_status = 'paid' THEN
    INSERT INTO payments (
      hotel_id, invoice_id, guest_id, reservation_id,
      amount, payment_method, payment_date,
      reference_number, notes, tenant_id
    ) VALUES (
      NEW.hotel_id, v_invoice_id, NEW.guest_id, NEW.id,
      COALESCE(NEW.total_amount, 0),
      COALESCE(v_pay_method, 'card'),
      NOW(),
      COALESCE(NEW.confirmation_code, ''),
      'Auto-recorded on checkout',
      v_tenant_id
    );
  END IF;

  RETURN NEW;
END;
$function$;
