/*
  # Hide RLS helper functions from PostgREST

  ## Why
  The Supabase linter flags every `SECURITY DEFINER` function in the
  `public` schema that `authenticated` can execute, because PostgREST
  exposes them all under `/rest/v1/rpc/...`. Pure RLS helpers should
  never be reachable from the REST API even though `authenticated`
  needs `EXECUTE` on them so RLS policies can evaluate.

  ## Fix
  Move the helpers (and one trigger-only utility) into a `private`
  schema. PostgREST is configured to expose only `public` and
  `graphql_public`, so functions in `private` are no longer callable
  via REST. Policies that reference these functions continue to work
  because Postgres tracks dependencies by OID, which `ALTER FUNCTION
  ... SET SCHEMA` preserves.

  ## Functions moved
  - `is_super_admin()`
  - `is_active_staff_at_hotel(uuid)`
  - `is_admin_staff_at_hotel(uuid)`
  - `is_hotel_admin(uuid)`
  - `is_hotel_staff(uuid)`
  - `is_owner_of_tenant(uuid)`
  - `get_accessible_hotel_ids()`
  - `get_my_hotel_ids_from_staff()`
  - `get_my_tenant_ids()`
  - `get_user_hotels()`            (not called from frontend)
  - `get_hotel_invoice_prefix(uuid)` (called only by trigger)

  ## Trigger update
  `fn_auto_create_invoice_on_checkout()` previously resolved
  `get_hotel_invoice_prefix(...)` via the unqualified name. After the
  move it must call `private.get_hotel_invoice_prefix(...)`.

  ## Notes
  - Frontend-called RPCs (`lobby_get_my_hotels`, `get_hotel_for_user`,
    `set_tenant_context`, `upsert_guest_profile`, `store_channel_secret`,
    `admin_list_users`, `check_subdomain_available`) intentionally
    remain in `public` so the app keeps working; the linter warnings on
    those are intentional.
  - `authenticated` still has `EXECUTE` on the moved functions because
    RLS evaluation requires it, but they are not in a PostgREST-exposed
    schema.
*/

CREATE SCHEMA IF NOT EXISTS private;

GRANT USAGE ON SCHEMA private TO authenticated;

ALTER FUNCTION public.is_super_admin()                      SET SCHEMA private;
ALTER FUNCTION public.is_active_staff_at_hotel(uuid)        SET SCHEMA private;
ALTER FUNCTION public.is_admin_staff_at_hotel(uuid)         SET SCHEMA private;
ALTER FUNCTION public.is_hotel_admin(uuid)                  SET SCHEMA private;
ALTER FUNCTION public.is_hotel_staff(uuid)                  SET SCHEMA private;
ALTER FUNCTION public.is_owner_of_tenant(uuid)              SET SCHEMA private;
ALTER FUNCTION public.get_accessible_hotel_ids()            SET SCHEMA private;
ALTER FUNCTION public.get_my_hotel_ids_from_staff()         SET SCHEMA private;
ALTER FUNCTION public.get_my_tenant_ids()                   SET SCHEMA private;
ALTER FUNCTION public.get_user_hotels()                     SET SCHEMA private;
ALTER FUNCTION public.get_hotel_invoice_prefix(uuid)        SET SCHEMA private;

REVOKE ALL ON FUNCTION
  private.is_super_admin(),
  private.is_active_staff_at_hotel(uuid),
  private.is_admin_staff_at_hotel(uuid),
  private.is_hotel_admin(uuid),
  private.is_hotel_staff(uuid),
  private.is_owner_of_tenant(uuid),
  private.get_accessible_hotel_ids(),
  private.get_my_hotel_ids_from_staff(),
  private.get_my_tenant_ids(),
  private.get_user_hotels(),
  private.get_hotel_invoice_prefix(uuid)
FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION
  private.is_super_admin(),
  private.is_active_staff_at_hotel(uuid),
  private.is_admin_staff_at_hotel(uuid),
  private.is_hotel_admin(uuid),
  private.is_hotel_staff(uuid),
  private.is_owner_of_tenant(uuid),
  private.get_accessible_hotel_ids(),
  private.get_my_hotel_ids_from_staff(),
  private.get_my_tenant_ids(),
  private.get_user_hotels()
TO authenticated;

-- Trigger-only function: revoke from clients entirely (still callable
-- by triggers because they run as the table owner)
REVOKE ALL ON FUNCTION private.get_hotel_invoice_prefix(uuid) FROM authenticated;

-- Update the trigger function to call the helper via its new schema
CREATE OR REPLACE FUNCTION public.fn_auto_create_invoice_on_checkout()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
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
    CASE WHEN NEW.payment_status = 'paid' THEN COALESCE(NEW.total_amount, 0) ELSE NULL END,
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
