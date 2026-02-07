/*
  # Auto-create Cleaning Tasks for Dirty Rooms

  1. Functions
    - `auto_create_cleaning_task()` - Trigger function that creates a housekeeping task when room becomes dirty

  2. Triggers
    - `trigger_auto_create_cleaning_task` - Trigger on rooms table that fires when status changes to 'dirty'

  This ensures that whenever a room's status is updated to 'dirty', a housekeeping task is automatically created.
*/

CREATE OR REPLACE FUNCTION auto_create_cleaning_task()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create task if room status changed to 'dirty' and it wasn't dirty before
  IF NEW.status = 'dirty' AND (OLD.status IS NULL OR OLD.status != 'dirty') THEN
    -- Check if there's already a pending or in_progress task for this room
    IF NOT EXISTS (
      SELECT 1 FROM housekeeping_tasks
      WHERE room_id = NEW.id
      AND status IN ('pending', 'in_progress')
    ) THEN
      -- Create a new cleaning task
      INSERT INTO housekeeping_tasks (
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_auto_create_cleaning_task ON rooms;

CREATE TRIGGER trigger_auto_create_cleaning_task
  AFTER UPDATE OF status ON rooms
  FOR EACH ROW
  EXECUTE FUNCTION auto_create_cleaning_task();
