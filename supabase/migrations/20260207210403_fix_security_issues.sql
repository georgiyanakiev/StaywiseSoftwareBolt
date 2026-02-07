/*
  # Fix Security Issues

  1. RLS Performance Optimization
    - Update housekeeping_checklist_items policies to use (select auth.uid())
    - This prevents re-evaluation of auth.uid() for each row, improving query performance

  2. Function Security
    - Update auto_create_cleaning_task function with immutable search_path
    - Prevents potential SQL injection and search path manipulation attacks

  ## Changes Made:
    - Drop and recreate 3 RLS policies on housekeeping_checklist_items with optimized auth.uid() calls
    - Recreate auto_create_cleaning_task function with SET search_path = ''
*/

-- Fix RLS policies on housekeeping_checklist_items
DROP POLICY IF EXISTS "Staff can view checklist items" ON housekeeping_checklist_items;
DROP POLICY IF EXISTS "Staff can insert checklist items" ON housekeeping_checklist_items;
DROP POLICY IF EXISTS "Staff can update checklist items" ON housekeeping_checklist_items;

-- Recreate policies with optimized auth.uid() calls
CREATE POLICY "Staff can view checklist items"
  ON housekeeping_checklist_items FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff_members
      WHERE staff_members.hotel_id = housekeeping_checklist_items.hotel_id
      AND staff_members.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Staff can insert checklist items"
  ON housekeeping_checklist_items FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM staff_members
      WHERE staff_members.hotel_id = housekeeping_checklist_items.hotel_id
      AND staff_members.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Staff can update checklist items"
  ON housekeeping_checklist_items FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff_members
      WHERE staff_members.hotel_id = housekeeping_checklist_items.hotel_id
      AND staff_members.user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM staff_members
      WHERE staff_members.hotel_id = housekeeping_checklist_items.hotel_id
      AND staff_members.user_id = (select auth.uid())
    )
  );

-- Fix function security with immutable search_path
CREATE OR REPLACE FUNCTION auto_create_cleaning_task()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Only create task if room status changed to 'dirty' and it wasn't dirty before
  IF NEW.status = 'dirty' AND (OLD.status IS NULL OR OLD.status != 'dirty') THEN
    -- Check if there's already a pending or in_progress task for this room
    IF NOT EXISTS (
      SELECT 1 FROM public.housekeeping_tasks
      WHERE room_id = NEW.id
      AND status IN ('pending', 'in_progress')
    ) THEN
      -- Create a new cleaning task
      INSERT INTO public.housekeeping_tasks (
        hotel_id,
        room_id,
        task_type,
        priority,
        status,
        assigned_to,
        notes
      ) VALUES (
        NEW.hotel_id,
        NEW.id,
        'clean',
        'normal',
        'pending',
        '',
        'Auto-generated task for dirty room'
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;
