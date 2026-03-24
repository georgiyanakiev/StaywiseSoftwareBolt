/*
  # Add Housekeeping Staff Role and Auto-Assignment Support

  ## Summary
  Adds a 'housekeeping' role to staff_members to enable filtering housekeeping staff
  for auto task assignment. Also adds a helper function to get the next available
  housekeeping staff member for round-robin task assignment.

  ## Changes
  - No schema change needed: role column already exists as text (open constraint)
  - Adds `get_next_housekeeping_staff(p_hotel_id uuid)` function that returns
    the full name of the housekeeping staff member with the fewest pending/in_progress
    tasks (round-robin by workload), or NULL if none exist.
  - Updates `auto_create_cleaning_task()` trigger function to auto-assign staff
    using the new helper function.

  ## Notes
  - Staff with role = 'housekeeping' are eligible for auto-assignment
  - Falls back gracefully to NULL assigned_to if no housekeeping staff exists
*/

CREATE OR REPLACE FUNCTION get_next_housekeeping_staff(p_hotel_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_staff_name text;
BEGIN
  SELECT (sm.first_name || ' ' || sm.last_name)
  INTO v_staff_name
  FROM staff_members sm
  WHERE sm.hotel_id = p_hotel_id
    AND sm.role = 'housekeeping'
    AND sm.is_active = true
  ORDER BY (
    SELECT COUNT(*)
    FROM housekeeping_tasks ht
    WHERE ht.hotel_id = p_hotel_id
      AND ht.assigned_to = (sm.first_name || ' ' || sm.last_name)
      AND ht.status IN ('pending', 'in_progress')
  ) ASC,
  sm.first_name ASC
  LIMIT 1;

  RETURN v_staff_name;
END;
$$;

CREATE OR REPLACE FUNCTION auto_create_cleaning_task()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_assigned_to text;
BEGIN
  IF NEW.status = 'dirty' AND (OLD.status IS NULL OR OLD.status <> 'dirty') THEN
    IF NOT EXISTS (
      SELECT 1 FROM housekeeping_tasks
      WHERE room_id = NEW.id
        AND status IN ('pending', 'in_progress')
    ) THEN
      v_assigned_to := get_next_housekeeping_staff(NEW.hotel_id);

      INSERT INTO housekeeping_tasks (
        hotel_id, room_id, task_type, priority, status, assigned_to, notes
      ) VALUES (
        NEW.hotel_id,
        NEW.id,
        'clean',
        'normal',
        'pending',
        v_assigned_to,
        'Auto-generated task for dirty room'
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_auto_create_cleaning_task ON rooms;

CREATE TRIGGER trigger_auto_create_cleaning_task
  AFTER UPDATE ON rooms
  FOR EACH ROW
  EXECUTE FUNCTION auto_create_cleaning_task();
