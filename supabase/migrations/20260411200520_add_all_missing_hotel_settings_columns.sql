/*
  # Add all missing hotel settings columns

  1. New Columns on `hotels` table
    - `payment_policy` (text) - Hotel payment policy text
    - `accepts_credit_card` (boolean, default true) - Accept credit card payments
    - `accepts_debit_card` (boolean, default true) - Accept debit card payments
    - `accepts_cash` (boolean, default true) - Accept cash payments
    - `accepts_bank_transfer` (boolean, default false) - Accept bank transfers
    - `deposit_required` (boolean, default false) - Require deposit at booking
    - `deposit_percentage` (numeric, default 0) - Deposit percentage
    - `stripe_enabled` (boolean, default false) - Enable Stripe payments
    - `booking_confirmation_template` (text) - Email template for booking confirmation
    - `checkin_reminder_template` (text) - Email template for check-in reminder
    - `thankyou_template` (text) - Email template for thank-you
    - `email_booking_confirmation` (boolean, default true)
    - `email_checkin_reminder` (boolean, default true)
    - `email_checkout_reminder` (boolean, default true)
    - `email_payment_received` (boolean, default true)
    - `sms_booking_confirmation` (boolean, default false)
    - `sms_checkin_reminder` (boolean, default false)
    - `inapp_new_booking` (boolean, default true)
    - `inapp_payment_received` (boolean, default true)
    - `inapp_task_assigned` (boolean, default true)
    - `language` (text, default 'en')
    - `date_format` (text, default 'DD/MM/YYYY')
    - `time_format` (text, default '24h')
    - `first_day_of_week` (integer, default 1)
    - `theme` (text, default 'light')
    - `vat_rate` (numeric, default 0)
    - `city_tax` (numeric, default 0)
    - `service_charge` (numeric, default 0)
    - `tax_inclusive` (boolean, default false)

  2. Notes
    - Uses IF NOT EXISTS pattern so it is safe to re-run
    - No existing data is modified or deleted
*/

DO $$
BEGIN
  -- Payment policy
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'hotels' AND column_name = 'payment_policy') THEN
    ALTER TABLE public.hotels ADD COLUMN payment_policy text NOT NULL DEFAULT '';
  END IF;

  -- Payment method columns
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'hotels' AND column_name = 'accepts_credit_card') THEN
    ALTER TABLE public.hotels ADD COLUMN accepts_credit_card boolean NOT NULL DEFAULT true;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'hotels' AND column_name = 'accepts_debit_card') THEN
    ALTER TABLE public.hotels ADD COLUMN accepts_debit_card boolean NOT NULL DEFAULT true;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'hotels' AND column_name = 'accepts_cash') THEN
    ALTER TABLE public.hotels ADD COLUMN accepts_cash boolean NOT NULL DEFAULT true;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'hotels' AND column_name = 'accepts_bank_transfer') THEN
    ALTER TABLE public.hotels ADD COLUMN accepts_bank_transfer boolean NOT NULL DEFAULT false;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'hotels' AND column_name = 'deposit_required') THEN
    ALTER TABLE public.hotels ADD COLUMN deposit_required boolean NOT NULL DEFAULT false;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'hotels' AND column_name = 'deposit_percentage') THEN
    ALTER TABLE public.hotels ADD COLUMN deposit_percentage numeric(5,2) NOT NULL DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'hotels' AND column_name = 'stripe_enabled') THEN
    ALTER TABLE public.hotels ADD COLUMN stripe_enabled boolean NOT NULL DEFAULT false;
  END IF;

  -- Email template columns
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'hotels' AND column_name = 'booking_confirmation_template') THEN
    ALTER TABLE public.hotels ADD COLUMN booking_confirmation_template text NOT NULL DEFAULT '';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'hotels' AND column_name = 'checkin_reminder_template') THEN
    ALTER TABLE public.hotels ADD COLUMN checkin_reminder_template text NOT NULL DEFAULT '';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'hotels' AND column_name = 'thankyou_template') THEN
    ALTER TABLE public.hotels ADD COLUMN thankyou_template text NOT NULL DEFAULT '';
  END IF;

  -- Notification settings
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'hotels' AND column_name = 'email_booking_confirmation') THEN
    ALTER TABLE public.hotels ADD COLUMN email_booking_confirmation boolean NOT NULL DEFAULT true;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'hotels' AND column_name = 'email_checkin_reminder') THEN
    ALTER TABLE public.hotels ADD COLUMN email_checkin_reminder boolean NOT NULL DEFAULT true;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'hotels' AND column_name = 'email_checkout_reminder') THEN
    ALTER TABLE public.hotels ADD COLUMN email_checkout_reminder boolean NOT NULL DEFAULT true;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'hotels' AND column_name = 'email_payment_received') THEN
    ALTER TABLE public.hotels ADD COLUMN email_payment_received boolean NOT NULL DEFAULT true;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'hotels' AND column_name = 'sms_booking_confirmation') THEN
    ALTER TABLE public.hotels ADD COLUMN sms_booking_confirmation boolean NOT NULL DEFAULT false;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'hotels' AND column_name = 'sms_checkin_reminder') THEN
    ALTER TABLE public.hotels ADD COLUMN sms_checkin_reminder boolean NOT NULL DEFAULT false;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'hotels' AND column_name = 'inapp_new_booking') THEN
    ALTER TABLE public.hotels ADD COLUMN inapp_new_booking boolean NOT NULL DEFAULT true;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'hotels' AND column_name = 'inapp_payment_received') THEN
    ALTER TABLE public.hotels ADD COLUMN inapp_payment_received boolean NOT NULL DEFAULT true;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'hotels' AND column_name = 'inapp_task_assigned') THEN
    ALTER TABLE public.hotels ADD COLUMN inapp_task_assigned boolean NOT NULL DEFAULT true;
  END IF;

  -- System preferences
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'hotels' AND column_name = 'language') THEN
    ALTER TABLE public.hotels ADD COLUMN language text NOT NULL DEFAULT 'en';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'hotels' AND column_name = 'date_format') THEN
    ALTER TABLE public.hotels ADD COLUMN date_format text NOT NULL DEFAULT 'DD/MM/YYYY';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'hotels' AND column_name = 'time_format') THEN
    ALTER TABLE public.hotels ADD COLUMN time_format text NOT NULL DEFAULT '24h';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'hotels' AND column_name = 'first_day_of_week') THEN
    ALTER TABLE public.hotels ADD COLUMN first_day_of_week integer NOT NULL DEFAULT 1;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'hotels' AND column_name = 'theme') THEN
    ALTER TABLE public.hotels ADD COLUMN theme text NOT NULL DEFAULT 'light';
  END IF;

  -- Tax columns
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'hotels' AND column_name = 'vat_rate') THEN
    ALTER TABLE public.hotels ADD COLUMN vat_rate numeric(5,2) NOT NULL DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'hotels' AND column_name = 'city_tax') THEN
    ALTER TABLE public.hotels ADD COLUMN city_tax numeric(5,2) NOT NULL DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'hotels' AND column_name = 'service_charge') THEN
    ALTER TABLE public.hotels ADD COLUMN service_charge numeric(5,2) NOT NULL DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'hotels' AND column_name = 'tax_inclusive') THEN
    ALTER TABLE public.hotels ADD COLUMN tax_inclusive boolean NOT NULL DEFAULT false;
  END IF;
END $$;