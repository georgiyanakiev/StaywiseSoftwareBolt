/*
  # StayWise Software - Core Database Schema

  1. New Tables
    - `hotels` - Property information for multi-hotel support
      - `id` (uuid, primary key)
      - `name` (text) - Hotel name
      - `address`, `city`, `country` - Location
      - `phone`, `email`, `website` - Contact info
      - `star_rating` (int) - Star classification
      - `check_in_time`, `check_out_time` (time)
      - `logo_url`, `cover_image_url` - Branding
      - `currency`, `timezone` - Regional settings
      - `tax_rate` (numeric) - Default tax rate
      - `created_at`, `updated_at` (timestamptz)
    
    - `room_types` - Room category definitions
      - `id` (uuid, primary key)
      - `hotel_id` (uuid, FK → hotels)
      - `name` (text) - Type name (Standard, Deluxe, etc.)
      - `description` (text)
      - `base_rate` (numeric) - Price per night
      - `max_occupancy` (int)
      - `bed_type` (text)
      - `amenities` (text[])
      - `image_url` (text)

    - `rooms` - Individual room records
      - `id` (uuid, primary key)
      - `hotel_id` (uuid, FK → hotels)
      - `room_type_id` (uuid, FK → room_types)
      - `number` (text) - Room number
      - `floor` (int)
      - `status` (text) - available/occupied/dirty/clean/maintenance/out_of_service
      - `rate_override` (numeric) - Optional rate override
      - `notes` (text)

    - `guests` - Guest profiles
      - `id` (uuid, primary key)
      - `hotel_id` (uuid, FK → hotels)
      - `first_name`, `last_name` (text)
      - `email`, `phone` (text)
      - `address`, `city`, `country`, `postal_code` (text)
      - `id_number` (text) - ID/Passport
      - `nationality` (text)
      - `date_of_birth` (date)
      - `vip_status` (text)
      - `notes` (text)
      - `preferences` (jsonb)
      - `total_stays` (int)
      - `total_spent` (numeric)

    - `reservations` - Booking records
      - `id` (uuid, primary key)
      - `hotel_id` (uuid, FK → hotels)
      - `guest_id` (uuid, FK → guests)
      - `room_id` (uuid, FK → rooms)
      - `room_type_id` (uuid, FK → room_types)
      - `check_in`, `check_out` (date)
      - `adults`, `children` (int)
      - `status` (text) - pending/confirmed/checked_in/checked_out/cancelled
      - `base_rate`, `total_amount`, `tax_amount`, `discount_amount` (numeric)
      - `payment_status` (text) - paid/partial/pending
      - `amount_paid` (numeric)
      - `payment_method` (text)
      - `booking_source` (text)
      - `special_requests` (text)
      - `cancellation_reason` (text)
      - `confirmation_code` (text)

    - `invoices` - Billing records
      - `id` (uuid, primary key)
      - `hotel_id` (uuid, FK → hotels)
      - `reservation_id` (uuid, FK → reservations)
      - `guest_id` (uuid, FK → guests)
      - `invoice_number` (text)
      - `issue_date`, `due_date` (date)
      - `subtotal`, `tax_amount`, `discount_amount`, `total_amount` (numeric)
      - `amount_paid` (numeric)
      - `status` (text) - draft/sent/paid/overdue/cancelled
      - `notes` (text)

    - `invoice_items` - Individual line items on invoices
      - `id` (uuid, primary key)
      - `invoice_id` (uuid, FK → invoices)
      - `description` (text)
      - `category` (text)
      - `quantity` (int)
      - `unit_price`, `total_price` (numeric)

    - `housekeeping_tasks` - Cleaning and room tasks
      - `id` (uuid, primary key)
      - `hotel_id` (uuid, FK → hotels)
      - `room_id` (uuid, FK → rooms)
      - `task_type` (text) - clean/deep_clean/linen_change/restock/inspection
      - `priority` (text) - low/normal/high/urgent
      - `status` (text) - pending/in_progress/completed
      - `assigned_to` (text)
      - `notes` (text)
      - `completed_at` (timestamptz)

    - `maintenance_requests` - Repair/maintenance tracking
      - `id` (uuid, primary key)
      - `hotel_id` (uuid, FK → hotels)
      - `room_id` (uuid, FK → rooms)
      - `description` (text)
      - `priority` (text)
      - `status` (text) - reported/in_progress/completed
      - `assigned_to` (text)
      - `cost` (numeric)
      - `resolved_at` (timestamptz)

    - `staff_members` - Hotel staff profiles
      - `id` (uuid, primary key)
      - `hotel_id` (uuid, FK → hotels)
      - `user_id` (uuid, FK → auth.users) - Links to Supabase auth
      - `first_name`, `last_name` (text)
      - `email`, `phone` (text)
      - `role` (text) - admin/manager/receptionist/housekeeping
      - `is_active` (boolean)
      - `avatar_url` (text)

    - `activity_log` - Audit trail
      - `id` (uuid, primary key)
      - `hotel_id` (uuid, FK → hotels)
      - `user_id` (uuid)
      - `action` (text)
      - `entity_type` (text)
      - `entity_id` (uuid)
      - `details` (jsonb)

  2. Security
    - Enable RLS on all tables
    - Policies: authenticated users can access data for hotels they belong to
*/

-- Hotels table
CREATE TABLE IF NOT EXISTS hotels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  address text NOT NULL DEFAULT '',
  city text NOT NULL DEFAULT '',
  country text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  website text NOT NULL DEFAULT '',
  star_rating int NOT NULL DEFAULT 3,
  check_in_time time NOT NULL DEFAULT '14:00',
  check_out_time time NOT NULL DEFAULT '11:00',
  logo_url text NOT NULL DEFAULT '',
  cover_image_url text NOT NULL DEFAULT '',
  currency text NOT NULL DEFAULT 'USD',
  timezone text NOT NULL DEFAULT 'UTC',
  tax_rate numeric NOT NULL DEFAULT 10.0,
  cancellation_policy text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE hotels ENABLE ROW LEVEL SECURITY;

-- Room Types table
CREATE TABLE IF NOT EXISTS room_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid NOT NULL REFERENCES hotels(id),
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  base_rate numeric NOT NULL DEFAULT 0,
  max_occupancy int NOT NULL DEFAULT 2,
  bed_type text NOT NULL DEFAULT 'Queen',
  amenities text[] NOT NULL DEFAULT '{}',
  image_url text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE room_types ENABLE ROW LEVEL SECURITY;

-- Rooms table
CREATE TABLE IF NOT EXISTS rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid NOT NULL REFERENCES hotels(id),
  room_type_id uuid NOT NULL REFERENCES room_types(id),
  number text NOT NULL,
  floor int NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'available',
  rate_override numeric,
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;

-- Guests table
CREATE TABLE IF NOT EXISTS guests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid NOT NULL REFERENCES hotels(id),
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  address text NOT NULL DEFAULT '',
  city text NOT NULL DEFAULT '',
  country text NOT NULL DEFAULT '',
  postal_code text NOT NULL DEFAULT '',
  id_number text NOT NULL DEFAULT '',
  nationality text NOT NULL DEFAULT '',
  date_of_birth date,
  vip_status text NOT NULL DEFAULT 'regular',
  notes text NOT NULL DEFAULT '',
  preferences jsonb NOT NULL DEFAULT '{}',
  total_stays int NOT NULL DEFAULT 0,
  total_spent numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE guests ENABLE ROW LEVEL SECURITY;

-- Reservations table
CREATE TABLE IF NOT EXISTS reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid NOT NULL REFERENCES hotels(id),
  guest_id uuid NOT NULL REFERENCES guests(id),
  room_id uuid REFERENCES rooms(id),
  room_type_id uuid NOT NULL REFERENCES room_types(id),
  check_in date NOT NULL,
  check_out date NOT NULL,
  adults int NOT NULL DEFAULT 1,
  children int NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  base_rate numeric NOT NULL DEFAULT 0,
  total_amount numeric NOT NULL DEFAULT 0,
  tax_amount numeric NOT NULL DEFAULT 0,
  discount_amount numeric NOT NULL DEFAULT 0,
  payment_status text NOT NULL DEFAULT 'pending',
  amount_paid numeric NOT NULL DEFAULT 0,
  payment_method text NOT NULL DEFAULT '',
  booking_source text NOT NULL DEFAULT 'direct',
  special_requests text NOT NULL DEFAULT '',
  cancellation_reason text NOT NULL DEFAULT '',
  confirmation_code text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;

-- Invoices table
CREATE TABLE IF NOT EXISTS invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid NOT NULL REFERENCES hotels(id),
  reservation_id uuid REFERENCES reservations(id),
  guest_id uuid NOT NULL REFERENCES guests(id),
  invoice_number text NOT NULL,
  issue_date date NOT NULL DEFAULT CURRENT_DATE,
  due_date date NOT NULL DEFAULT CURRENT_DATE,
  subtotal numeric NOT NULL DEFAULT 0,
  tax_amount numeric NOT NULL DEFAULT 0,
  discount_amount numeric NOT NULL DEFAULT 0,
  total_amount numeric NOT NULL DEFAULT 0,
  amount_paid numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft',
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- Invoice Items table
CREATE TABLE IF NOT EXISTS invoice_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  description text NOT NULL,
  category text NOT NULL DEFAULT 'room',
  quantity int NOT NULL DEFAULT 1,
  unit_price numeric NOT NULL DEFAULT 0,
  total_price numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;

-- Housekeeping Tasks table
CREATE TABLE IF NOT EXISTS housekeeping_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid NOT NULL REFERENCES hotels(id),
  room_id uuid NOT NULL REFERENCES rooms(id),
  task_type text NOT NULL DEFAULT 'clean',
  priority text NOT NULL DEFAULT 'normal',
  status text NOT NULL DEFAULT 'pending',
  assigned_to text NOT NULL DEFAULT '',
  notes text NOT NULL DEFAULT '',
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE housekeeping_tasks ENABLE ROW LEVEL SECURITY;

-- Maintenance Requests table
CREATE TABLE IF NOT EXISTS maintenance_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid NOT NULL REFERENCES hotels(id),
  room_id uuid NOT NULL REFERENCES rooms(id),
  description text NOT NULL,
  priority text NOT NULL DEFAULT 'medium',
  status text NOT NULL DEFAULT 'reported',
  assigned_to text NOT NULL DEFAULT '',
  cost numeric NOT NULL DEFAULT 0,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE maintenance_requests ENABLE ROW LEVEL SECURITY;

-- Staff Members table
CREATE TABLE IF NOT EXISTS staff_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid NOT NULL REFERENCES hotels(id),
  user_id uuid REFERENCES auth.users(id),
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL DEFAULT '',
  role text NOT NULL DEFAULT 'receptionist',
  is_active boolean NOT NULL DEFAULT true,
  avatar_url text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE staff_members ENABLE ROW LEVEL SECURITY;

-- Activity Log table
CREATE TABLE IF NOT EXISTS activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid NOT NULL REFERENCES hotels(id),
  user_id uuid,
  action text NOT NULL,
  entity_type text NOT NULL DEFAULT '',
  entity_id uuid,
  details jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Hotels: authenticated users can read hotels they're staff of
CREATE POLICY "Staff can view their hotels"
  ON hotels FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff_members
      WHERE staff_members.hotel_id = hotels.id
      AND staff_members.user_id = auth.uid()
      AND staff_members.is_active = true
    )
  );

CREATE POLICY "Admins can insert hotels"
  ON hotels FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Staff admins can update their hotels"
  ON hotels FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff_members
      WHERE staff_members.hotel_id = hotels.id
      AND staff_members.user_id = auth.uid()
      AND staff_members.role IN ('admin', 'manager')
      AND staff_members.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM staff_members
      WHERE staff_members.hotel_id = hotels.id
      AND staff_members.user_id = auth.uid()
      AND staff_members.role IN ('admin', 'manager')
      AND staff_members.is_active = true
    )
  );

-- Room Types policies
CREATE POLICY "Staff can view room types"
  ON room_types FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff_members
      WHERE staff_members.hotel_id = room_types.hotel_id
      AND staff_members.user_id = auth.uid()
      AND staff_members.is_active = true
    )
  );

CREATE POLICY "Admins can insert room types"
  ON room_types FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM staff_members
      WHERE staff_members.hotel_id = room_types.hotel_id
      AND staff_members.user_id = auth.uid()
      AND staff_members.role IN ('admin', 'manager')
      AND staff_members.is_active = true
    )
  );

CREATE POLICY "Admins can update room types"
  ON room_types FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff_members
      WHERE staff_members.hotel_id = room_types.hotel_id
      AND staff_members.user_id = auth.uid()
      AND staff_members.role IN ('admin', 'manager')
      AND staff_members.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM staff_members
      WHERE staff_members.hotel_id = room_types.hotel_id
      AND staff_members.user_id = auth.uid()
      AND staff_members.role IN ('admin', 'manager')
      AND staff_members.is_active = true
    )
  );

CREATE POLICY "Admins can delete room types"
  ON room_types FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff_members
      WHERE staff_members.hotel_id = room_types.hotel_id
      AND staff_members.user_id = auth.uid()
      AND staff_members.role IN ('admin', 'manager')
      AND staff_members.is_active = true
    )
  );

-- Rooms policies
CREATE POLICY "Staff can view rooms"
  ON rooms FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff_members
      WHERE staff_members.hotel_id = rooms.hotel_id
      AND staff_members.user_id = auth.uid()
      AND staff_members.is_active = true
    )
  );

CREATE POLICY "Admins can insert rooms"
  ON rooms FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM staff_members
      WHERE staff_members.hotel_id = rooms.hotel_id
      AND staff_members.user_id = auth.uid()
      AND staff_members.role IN ('admin', 'manager')
      AND staff_members.is_active = true
    )
  );

CREATE POLICY "Staff can update rooms"
  ON rooms FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff_members
      WHERE staff_members.hotel_id = rooms.hotel_id
      AND staff_members.user_id = auth.uid()
      AND staff_members.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM staff_members
      WHERE staff_members.hotel_id = rooms.hotel_id
      AND staff_members.user_id = auth.uid()
      AND staff_members.is_active = true
    )
  );

CREATE POLICY "Admins can delete rooms"
  ON rooms FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff_members
      WHERE staff_members.hotel_id = rooms.hotel_id
      AND staff_members.user_id = auth.uid()
      AND staff_members.role IN ('admin', 'manager')
      AND staff_members.is_active = true
    )
  );

-- Guests policies
CREATE POLICY "Staff can view guests"
  ON guests FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff_members
      WHERE staff_members.hotel_id = guests.hotel_id
      AND staff_members.user_id = auth.uid()
      AND staff_members.is_active = true
    )
  );

CREATE POLICY "Staff can insert guests"
  ON guests FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM staff_members
      WHERE staff_members.hotel_id = guests.hotel_id
      AND staff_members.user_id = auth.uid()
      AND staff_members.is_active = true
    )
  );

CREATE POLICY "Staff can update guests"
  ON guests FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff_members
      WHERE staff_members.hotel_id = guests.hotel_id
      AND staff_members.user_id = auth.uid()
      AND staff_members.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM staff_members
      WHERE staff_members.hotel_id = guests.hotel_id
      AND staff_members.user_id = auth.uid()
      AND staff_members.is_active = true
    )
  );

-- Reservations policies
CREATE POLICY "Staff can view reservations"
  ON reservations FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff_members
      WHERE staff_members.hotel_id = reservations.hotel_id
      AND staff_members.user_id = auth.uid()
      AND staff_members.is_active = true
    )
  );

CREATE POLICY "Staff can insert reservations"
  ON reservations FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM staff_members
      WHERE staff_members.hotel_id = reservations.hotel_id
      AND staff_members.user_id = auth.uid()
      AND staff_members.is_active = true
    )
  );

CREATE POLICY "Staff can update reservations"
  ON reservations FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff_members
      WHERE staff_members.hotel_id = reservations.hotel_id
      AND staff_members.user_id = auth.uid()
      AND staff_members.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM staff_members
      WHERE staff_members.hotel_id = reservations.hotel_id
      AND staff_members.user_id = auth.uid()
      AND staff_members.is_active = true
    )
  );

-- Invoices policies
CREATE POLICY "Staff can view invoices"
  ON invoices FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff_members
      WHERE staff_members.hotel_id = invoices.hotel_id
      AND staff_members.user_id = auth.uid()
      AND staff_members.is_active = true
    )
  );

CREATE POLICY "Staff can insert invoices"
  ON invoices FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM staff_members
      WHERE staff_members.hotel_id = invoices.hotel_id
      AND staff_members.user_id = auth.uid()
      AND staff_members.is_active = true
    )
  );

CREATE POLICY "Staff can update invoices"
  ON invoices FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff_members
      WHERE staff_members.hotel_id = invoices.hotel_id
      AND staff_members.user_id = auth.uid()
      AND staff_members.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM staff_members
      WHERE staff_members.hotel_id = invoices.hotel_id
      AND staff_members.user_id = auth.uid()
      AND staff_members.is_active = true
    )
  );

-- Invoice Items policies
CREATE POLICY "Staff can view invoice items"
  ON invoice_items FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM invoices
      JOIN staff_members ON staff_members.hotel_id = invoices.hotel_id
      WHERE invoices.id = invoice_items.invoice_id
      AND staff_members.user_id = auth.uid()
      AND staff_members.is_active = true
    )
  );

CREATE POLICY "Staff can insert invoice items"
  ON invoice_items FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM invoices
      JOIN staff_members ON staff_members.hotel_id = invoices.hotel_id
      WHERE invoices.id = invoice_items.invoice_id
      AND staff_members.user_id = auth.uid()
      AND staff_members.is_active = true
    )
  );

CREATE POLICY "Staff can update invoice items"
  ON invoice_items FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM invoices
      JOIN staff_members ON staff_members.hotel_id = invoices.hotel_id
      WHERE invoices.id = invoice_items.invoice_id
      AND staff_members.user_id = auth.uid()
      AND staff_members.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM invoices
      JOIN staff_members ON staff_members.hotel_id = invoices.hotel_id
      WHERE invoices.id = invoice_items.invoice_id
      AND staff_members.user_id = auth.uid()
      AND staff_members.is_active = true
    )
  );

CREATE POLICY "Staff can delete invoice items"
  ON invoice_items FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM invoices
      JOIN staff_members ON staff_members.hotel_id = invoices.hotel_id
      WHERE invoices.id = invoice_items.invoice_id
      AND staff_members.user_id = auth.uid()
      AND staff_members.is_active = true
    )
  );

-- Housekeeping Tasks policies
CREATE POLICY "Staff can view housekeeping tasks"
  ON housekeeping_tasks FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff_members
      WHERE staff_members.hotel_id = housekeeping_tasks.hotel_id
      AND staff_members.user_id = auth.uid()
      AND staff_members.is_active = true
    )
  );

CREATE POLICY "Staff can insert housekeeping tasks"
  ON housekeeping_tasks FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM staff_members
      WHERE staff_members.hotel_id = housekeeping_tasks.hotel_id
      AND staff_members.user_id = auth.uid()
      AND staff_members.is_active = true
    )
  );

CREATE POLICY "Staff can update housekeeping tasks"
  ON housekeeping_tasks FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff_members
      WHERE staff_members.hotel_id = housekeeping_tasks.hotel_id
      AND staff_members.user_id = auth.uid()
      AND staff_members.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM staff_members
      WHERE staff_members.hotel_id = housekeeping_tasks.hotel_id
      AND staff_members.user_id = auth.uid()
      AND staff_members.is_active = true
    )
  );

-- Maintenance Requests policies
CREATE POLICY "Staff can view maintenance requests"
  ON maintenance_requests FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff_members
      WHERE staff_members.hotel_id = maintenance_requests.hotel_id
      AND staff_members.user_id = auth.uid()
      AND staff_members.is_active = true
    )
  );

CREATE POLICY "Staff can insert maintenance requests"
  ON maintenance_requests FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM staff_members
      WHERE staff_members.hotel_id = maintenance_requests.hotel_id
      AND staff_members.user_id = auth.uid()
      AND staff_members.is_active = true
    )
  );

CREATE POLICY "Staff can update maintenance requests"
  ON maintenance_requests FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff_members
      WHERE staff_members.hotel_id = maintenance_requests.hotel_id
      AND staff_members.user_id = auth.uid()
      AND staff_members.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM staff_members
      WHERE staff_members.hotel_id = maintenance_requests.hotel_id
      AND staff_members.user_id = auth.uid()
      AND staff_members.is_active = true
    )
  );

-- Staff Members policies
CREATE POLICY "Staff can view own hotel staff"
  ON staff_members FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM staff_members AS sm
      WHERE sm.hotel_id = staff_members.hotel_id
      AND sm.user_id = auth.uid()
      AND sm.role IN ('admin', 'manager')
      AND sm.is_active = true
    )
  );

CREATE POLICY "Admins can insert staff members"
  ON staff_members FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM staff_members AS sm
      WHERE sm.hotel_id = staff_members.hotel_id
      AND sm.user_id = auth.uid()
      AND sm.role = 'admin'
      AND sm.is_active = true
    )
  );

CREATE POLICY "Admins can update staff members"
  ON staff_members FOR UPDATE TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM staff_members AS sm
      WHERE sm.hotel_id = staff_members.hotel_id
      AND sm.user_id = auth.uid()
      AND sm.role = 'admin'
      AND sm.is_active = true
    )
  )
  WITH CHECK (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM staff_members AS sm
      WHERE sm.hotel_id = staff_members.hotel_id
      AND sm.user_id = auth.uid()
      AND sm.role = 'admin'
      AND sm.is_active = true
    )
  );

-- Activity Log policies
CREATE POLICY "Staff can view activity log"
  ON activity_log FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff_members
      WHERE staff_members.hotel_id = activity_log.hotel_id
      AND staff_members.user_id = auth.uid()
      AND staff_members.is_active = true
    )
  );

CREATE POLICY "Staff can insert activity log"
  ON activity_log FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM staff_members
      WHERE staff_members.hotel_id = activity_log.hotel_id
      AND staff_members.user_id = auth.uid()
      AND staff_members.is_active = true
    )
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_rooms_hotel_id ON rooms(hotel_id);
CREATE INDEX IF NOT EXISTS idx_rooms_status ON rooms(status);
CREATE INDEX IF NOT EXISTS idx_room_types_hotel_id ON room_types(hotel_id);
CREATE INDEX IF NOT EXISTS idx_guests_hotel_id ON guests(hotel_id);
CREATE INDEX IF NOT EXISTS idx_guests_email ON guests(email);
CREATE INDEX IF NOT EXISTS idx_reservations_hotel_id ON reservations(hotel_id);
CREATE INDEX IF NOT EXISTS idx_reservations_guest_id ON reservations(guest_id);
CREATE INDEX IF NOT EXISTS idx_reservations_room_id ON reservations(room_id);
CREATE INDEX IF NOT EXISTS idx_reservations_status ON reservations(status);
CREATE INDEX IF NOT EXISTS idx_reservations_check_in ON reservations(check_in);
CREATE INDEX IF NOT EXISTS idx_reservations_check_out ON reservations(check_out);
CREATE INDEX IF NOT EXISTS idx_invoices_hotel_id ON invoices(hotel_id);
CREATE INDEX IF NOT EXISTS idx_invoices_reservation_id ON invoices(reservation_id);
CREATE INDEX IF NOT EXISTS idx_housekeeping_tasks_hotel_id ON housekeeping_tasks(hotel_id);
CREATE INDEX IF NOT EXISTS idx_housekeeping_tasks_room_id ON housekeeping_tasks(room_id);
CREATE INDEX IF NOT EXISTS idx_staff_members_hotel_id ON staff_members(hotel_id);
CREATE INDEX IF NOT EXISTS idx_staff_members_user_id ON staff_members(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_hotel_id ON activity_log(hotel_id);
