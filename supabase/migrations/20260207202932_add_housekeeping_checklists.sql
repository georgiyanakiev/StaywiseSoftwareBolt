/*
  # Add Housekeeping Checklists

  1. New Tables
    - `housekeeping_checklist_items` - Tracks individual checklist items for each task
      - `id` (uuid, primary key)
      - `hotel_id` (uuid, references hotels)
      - `task_id` (uuid, references housekeeping_tasks)
      - `item_name` (text) - Name of the checklist item
      - `is_completed` (boolean) - Whether the item is checked
      - `completed_by` (text) - Staff member who completed the item
      - `completed_at` (timestamptz) - When the item was completed
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on `housekeeping_checklist_items` table
    - Add policies for authenticated staff to manage checklist items
*/

CREATE TABLE IF NOT EXISTS housekeeping_checklist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  task_id uuid NOT NULL REFERENCES housekeeping_tasks(id) ON DELETE CASCADE,
  item_name text NOT NULL,
  is_completed boolean NOT NULL DEFAULT false,
  completed_by text NOT NULL DEFAULT '',
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE housekeeping_checklist_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view checklist items"
  ON housekeeping_checklist_items FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff_members
      WHERE staff_members.hotel_id = housekeeping_checklist_items.hotel_id
      AND staff_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Staff can insert checklist items"
  ON housekeeping_checklist_items FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM staff_members
      WHERE staff_members.hotel_id = housekeeping_checklist_items.hotel_id
      AND staff_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Staff can update checklist items"
  ON housekeeping_checklist_items FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff_members
      WHERE staff_members.hotel_id = housekeeping_checklist_items.hotel_id
      AND staff_members.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM staff_members
      WHERE staff_members.hotel_id = housekeeping_checklist_items.hotel_id
      AND staff_members.user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_housekeeping_checklist_items_hotel_id 
  ON housekeeping_checklist_items(hotel_id);
CREATE INDEX IF NOT EXISTS idx_housekeeping_checklist_items_task_id 
  ON housekeeping_checklist_items(task_id);
