/*
  # Enhance Guest Management Features
  
  ## Changes Made
  
  1. **Enhanced Guests Table**
     - Add title field (Mr, Mrs, Ms, Dr, etc)
     - Add mobile phone field
     - Add room preferences (floor, view, bed_type)
     - Add special requests
     - Add marketing preferences (email_opt_in, sms_opt_in, newsletter)
     - Add communication preferences
     - Add favorite room types tracking
  
  2. **New Table: guest_documents**
     - Store uploaded documents (ID, passport, etc)
     - Fields: id, guest_id, hotel_id, type, file_name, file_url, uploaded_at
     - RLS: Staff can view/manage documents for their hotel
  
  3. **New Table: guest_communications**
     - Track all communications with guests
     - Fields: id, guest_id, hotel_id, type, subject, message, sent_at, status
     - RLS: Staff can view/manage communications for their hotel
  
  4. **Security**
     - Enable RLS on all new tables
     - Add policies for authenticated staff access
*/

-- Add new columns to guests table
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'guests' AND column_name = 'title') THEN
    ALTER TABLE guests ADD COLUMN title text DEFAULT '';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'guests' AND column_name = 'mobile') THEN
    ALTER TABLE guests ADD COLUMN mobile text DEFAULT '';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'guests' AND column_name = 'room_floor_preference') THEN
    ALTER TABLE guests ADD COLUMN room_floor_preference text DEFAULT '';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'guests' AND column_name = 'room_view_preference') THEN
    ALTER TABLE guests ADD COLUMN room_view_preference text DEFAULT '';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'guests' AND column_name = 'bed_type_preference') THEN
    ALTER TABLE guests ADD COLUMN bed_type_preference text DEFAULT '';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'guests' AND column_name = 'special_requests') THEN
    ALTER TABLE guests ADD COLUMN special_requests text DEFAULT '';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'guests' AND column_name = 'email_opt_in') THEN
    ALTER TABLE guests ADD COLUMN email_opt_in boolean DEFAULT true;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'guests' AND column_name = 'sms_opt_in') THEN
    ALTER TABLE guests ADD COLUMN sms_opt_in boolean DEFAULT false;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'guests' AND column_name = 'newsletter_opt_in') THEN
    ALTER TABLE guests ADD COLUMN newsletter_opt_in boolean DEFAULT true;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'guests' AND column_name = 'communication_preference') THEN
    ALTER TABLE guests ADD COLUMN communication_preference text DEFAULT 'email';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'guests' AND column_name = 'favorite_room_types') THEN
    ALTER TABLE guests ADD COLUMN favorite_room_types text[] DEFAULT '{}';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'guests' AND column_name = 'dietary_restrictions') THEN
    ALTER TABLE guests ADD COLUMN dietary_restrictions text DEFAULT '';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'guests' AND column_name = 'allergies') THEN
    ALTER TABLE guests ADD COLUMN allergies text DEFAULT '';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'guests' AND column_name = 'complaint_history') THEN
    ALTER TABLE guests ADD COLUMN complaint_history text DEFAULT '';
  END IF;
END $$;

-- Create guest_documents table
CREATE TABLE IF NOT EXISTS guest_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guest_id uuid NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
  hotel_id uuid NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'other',
  file_name text NOT NULL DEFAULT '',
  file_url text NOT NULL DEFAULT '',
  file_size integer DEFAULT 0,
  uploaded_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on guest_documents
ALTER TABLE guest_documents ENABLE ROW LEVEL SECURITY;

-- RLS policies for guest_documents
CREATE POLICY "Staff can view documents for their hotel"
  ON guest_documents FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff_members
      WHERE staff_members.user_id = auth.uid()
      AND staff_members.hotel_id = guest_documents.hotel_id
    )
  );

CREATE POLICY "Staff can create documents for their hotel"
  ON guest_documents FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM staff_members
      WHERE staff_members.user_id = auth.uid()
      AND staff_members.hotel_id = guest_documents.hotel_id
    )
  );

CREATE POLICY "Staff can delete documents for their hotel"
  ON guest_documents FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff_members
      WHERE staff_members.user_id = auth.uid()
      AND staff_members.hotel_id = guest_documents.hotel_id
    )
  );

-- Create guest_communications table
CREATE TABLE IF NOT EXISTS guest_communications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guest_id uuid NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
  hotel_id uuid NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'email',
  subject text NOT NULL DEFAULT '',
  message text NOT NULL DEFAULT '',
  sent_by uuid REFERENCES auth.users(id),
  sent_at timestamptz DEFAULT now(),
  status text DEFAULT 'sent',
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on guest_communications
ALTER TABLE guest_communications ENABLE ROW LEVEL SECURITY;

-- RLS policies for guest_communications
CREATE POLICY "Staff can view communications for their hotel"
  ON guest_communications FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff_members
      WHERE staff_members.user_id = auth.uid()
      AND staff_members.hotel_id = guest_communications.hotel_id
    )
  );

CREATE POLICY "Staff can create communications for their hotel"
  ON guest_communications FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM staff_members
      WHERE staff_members.user_id = auth.uid()
      AND staff_members.hotel_id = guest_communications.hotel_id
    )
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_guest_documents_guest_id ON guest_documents(guest_id);
CREATE INDEX IF NOT EXISTS idx_guest_documents_hotel_id ON guest_documents(hotel_id);
CREATE INDEX IF NOT EXISTS idx_guest_communications_guest_id ON guest_communications(guest_id);
CREATE INDEX IF NOT EXISTS idx_guest_communications_hotel_id ON guest_communications(hotel_id);
CREATE INDEX IF NOT EXISTS idx_guest_communications_sent_at ON guest_communications(sent_at DESC);