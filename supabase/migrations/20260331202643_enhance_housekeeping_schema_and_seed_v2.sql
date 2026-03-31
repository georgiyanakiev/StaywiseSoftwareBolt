/*
  # Enhance Housekeeping Schema and Seed Data (v2)

  ## Summary
  Adds columns to housekeeping_tasks, creates maintenance_issues and housekeeping_staff tables,
  and seeds demo data.
*/

-- ── Enhance housekeeping_tasks ────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='housekeeping_tasks' AND column_name='room_number') THEN
    ALTER TABLE housekeeping_tasks ADD COLUMN room_number text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='housekeeping_tasks' AND column_name='room_type') THEN
    ALTER TABLE housekeeping_tasks ADD COLUMN room_type text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='housekeeping_tasks' AND column_name='floor') THEN
    ALTER TABLE housekeeping_tasks ADD COLUMN floor integer DEFAULT 1;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='housekeeping_tasks' AND column_name='duration_minutes') THEN
    ALTER TABLE housekeeping_tasks ADD COLUMN duration_minutes integer;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='housekeeping_tasks' AND column_name='scheduled_date') THEN
    ALTER TABLE housekeeping_tasks ADD COLUMN scheduled_date date DEFAULT CURRENT_DATE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='housekeeping_tasks' AND column_name='started_at') THEN
    ALTER TABLE housekeeping_tasks ADD COLUMN started_at timestamptz;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='housekeeping_tasks' AND column_name='inspected_by') THEN
    ALTER TABLE housekeeping_tasks ADD COLUMN inspected_by text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='housekeeping_tasks' AND column_name='inspected_at') THEN
    ALTER TABLE housekeeping_tasks ADD COLUMN inspected_at timestamptz;
  END IF;
END $$;

-- Drop old constraints so we can widen them
ALTER TABLE housekeeping_tasks DROP CONSTRAINT IF EXISTS housekeeping_tasks_task_type_check;
ALTER TABLE housekeeping_tasks DROP CONSTRAINT IF EXISTS housekeeping_tasks_status_check;
ALTER TABLE housekeeping_tasks DROP CONSTRAINT IF EXISTS housekeeping_tasks_priority_check;

ALTER TABLE housekeeping_tasks
  ADD CONSTRAINT housekeeping_tasks_task_type_check
    CHECK (task_type IN ('checkout_clean','stayover_clean','turndown','deep_clean','inspection','touch_up','clean','linen_change','restock'));

ALTER TABLE housekeeping_tasks
  ADD CONSTRAINT housekeeping_tasks_status_check
    CHECK (status IN ('pending','in_progress','done','inspected','skipped','blocked','completed'));

ALTER TABLE housekeeping_tasks
  ADD CONSTRAINT housekeeping_tasks_priority_check
    CHECK (priority IN ('low','normal','high','urgent'));

-- ── Create maintenance_issues ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS maintenance_issues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid REFERENCES hotels(id),
  tenant_id uuid REFERENCES tenants(id),
  room_id uuid REFERENCES rooms(id),
  room_number text DEFAULT '',
  title text NOT NULL,
  description text DEFAULT '',
  category text CHECK (category IN ('plumbing','electrical','hvac','furniture','cleaning','it','other')),
  status text DEFAULT 'open' CHECK (status IN ('open','in_progress','waiting_parts','resolved','closed')),
  priority text DEFAULT 'normal' CHECK (priority IN ('low','normal','high','urgent')),
  reported_by text DEFAULT '',
  assigned_to text DEFAULT '',
  estimated_cost numeric(10,2),
  actual_cost numeric(10,2),
  photos text[] DEFAULT '{}',
  resolved_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE maintenance_issues ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='maintenance_issues' AND policyname='Authenticated users can view maintenance issues') THEN
    CREATE POLICY "Authenticated users can view maintenance issues"
      ON maintenance_issues FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='maintenance_issues' AND policyname='Authenticated users can insert maintenance issues') THEN
    CREATE POLICY "Authenticated users can insert maintenance issues"
      ON maintenance_issues FOR INSERT TO authenticated WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='maintenance_issues' AND policyname='Authenticated users can update maintenance issues') THEN
    CREATE POLICY "Authenticated users can update maintenance issues"
      ON maintenance_issues FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ── Create housekeeping_staff ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS housekeeping_staff (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid REFERENCES hotels(id),
  tenant_id uuid REFERENCES tenants(id),
  name text NOT NULL,
  role text DEFAULT 'housekeeper' CHECK (role IN ('housekeeper','supervisor','inspector','maintenance')),
  phone text DEFAULT '',
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE housekeeping_staff ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='housekeeping_staff' AND policyname='Authenticated users can view housekeeping staff') THEN
    CREATE POLICY "Authenticated users can view housekeeping staff"
      ON housekeeping_staff FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='housekeeping_staff' AND policyname='Authenticated users can insert housekeeping staff') THEN
    CREATE POLICY "Authenticated users can insert housekeeping staff"
      ON housekeeping_staff FOR INSERT TO authenticated WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='housekeeping_staff' AND policyname='Authenticated users can update housekeeping staff') THEN
    CREATE POLICY "Authenticated users can update housekeeping staff"
      ON housekeeping_staff FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ── Seed Data ─────────────────────────────────────────────────────────────
DO $$
DECLARE
  v_hotel_id uuid;
  v_tenant_id uuid;
  v_room1 uuid; v_room2 uuid; v_room3 uuid;
  v_room_ids uuid[];
  v_room_nums text[];
  v_room_floors integer[];
  i integer;
  task_statuses text[] := ARRAY['pending','pending','pending','in_progress','in_progress','done','done','done','inspected','done','pending','in_progress','done','inspected','pending'];
  task_types text[]   := ARRAY['checkout_clean','stayover_clean','checkout_clean','stayover_clean','deep_clean','checkout_clean','stayover_clean','turndown','checkout_clean','inspection','touch_up','stayover_clean','checkout_clean','stayover_clean','deep_clean'];
  task_priorities text[] := ARRAY['urgent','normal','high','normal','normal','low','normal','normal','high','normal','urgent','normal','normal','low','normal'];
  task_staff text[]   := ARRAY['Maria Santos','Maria Santos','','João Ferreira','Maria Santos','','Ana Lima','','João Ferreira','Ana Lima','','Maria Santos','','João Ferreira',''];
  task_notes text[]   := ARRAY['Guest checked out early','Standard clean','Urgent — new guest arriving 14:00','Full room clean','Deep clean requested by guest','','Quick tidy','Evening turndown service','','Full inspection before VIP arrival','Touch up required','','','Inspector pass',''];
BEGIN
  SELECT h.id, h.tenant_id INTO v_hotel_id, v_tenant_id
  FROM hotels h LIMIT 1;
  IF v_hotel_id IS NULL THEN RETURN; END IF;

  IF NOT EXISTS (SELECT 1 FROM housekeeping_staff WHERE hotel_id = v_hotel_id) THEN
    INSERT INTO housekeeping_staff (hotel_id, tenant_id, name, role, phone, active) VALUES
      (v_hotel_id, v_tenant_id, 'Maria Santos',  'housekeeper', '+351 912 345 678', true),
      (v_hotel_id, v_tenant_id, 'João Ferreira', 'housekeeper', '+351 934 567 890', true),
      (v_hotel_id, v_tenant_id, 'Ana Lima',      'supervisor',  '+351 965 432 100', true),
      (v_hotel_id, v_tenant_id, 'Carlos Matos',  'inspector',   '+351 987 654 321', true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM housekeeping_tasks WHERE hotel_id = v_hotel_id AND scheduled_date = CURRENT_DATE) THEN
    SELECT
      array_agg(sub.id ORDER BY sub.number),
      array_agg(sub.number ORDER BY sub.number),
      array_agg(sub.floor ORDER BY sub.number)
    INTO v_room_ids, v_room_nums, v_room_floors
    FROM (SELECT id, number, floor FROM rooms WHERE hotel_id = v_hotel_id ORDER BY number LIMIT 15) sub;

    IF v_room_ids IS NOT NULL THEN
      FOR i IN 1..LEAST(15, array_length(v_room_ids, 1)) LOOP
        INSERT INTO housekeeping_tasks
          (hotel_id, tenant_id, room_id, room_number, floor, task_type, status, priority, assigned_to, notes, scheduled_date, started_at, completed_at, duration_minutes)
        VALUES (
          v_hotel_id, v_tenant_id,
          v_room_ids[i],
          COALESCE(v_room_nums[i], i::text),
          COALESCE(v_room_floors[i], 1),
          task_types[i], task_statuses[i], task_priorities[i],
          task_staff[i], task_notes[i],
          CURRENT_DATE,
          CASE WHEN task_statuses[i] IN ('in_progress','done','inspected') THEN now() - ((floor(random()*3600))::text || ' seconds')::interval ELSE NULL END,
          CASE WHEN task_statuses[i] IN ('done','inspected') THEN now() - ((floor(random()*1800))::text || ' seconds')::interval ELSE NULL END,
          CASE WHEN task_statuses[i] IN ('done','inspected') THEN (25 + floor(random()*35))::integer ELSE NULL END
        );
      END LOOP;
    END IF;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM maintenance_issues WHERE hotel_id = v_hotel_id) THEN
    SELECT id INTO v_room1 FROM rooms WHERE hotel_id = v_hotel_id ORDER BY number LIMIT 1 OFFSET 0;
    SELECT id INTO v_room2 FROM rooms WHERE hotel_id = v_hotel_id ORDER BY number LIMIT 1 OFFSET 1;
    SELECT id INTO v_room3 FROM rooms WHERE hotel_id = v_hotel_id ORDER BY number LIMIT 1 OFFSET 2;

    INSERT INTO maintenance_issues
      (hotel_id, tenant_id, room_id, room_number, title, description, category, status, priority, reported_by, assigned_to, estimated_cost)
    SELECT
      v_hotel_id, v_tenant_id, v_room1, r.number,
      'Leaking bathroom tap',
      'The hot water tap in the bathroom is dripping continuously. Needs washer replacement.',
      'plumbing', 'open', 'high', 'Maria Santos', 'Carlos Matos', 45.00
    FROM rooms r WHERE r.id = v_room1;

    INSERT INTO maintenance_issues
      (hotel_id, tenant_id, room_id, room_number, title, description, category, status, priority, reported_by, assigned_to, estimated_cost)
    SELECT
      v_hotel_id, v_tenant_id, v_room2, r.number,
      'Air conditioning noise',
      'AC unit makes loud rattling noise when running. Possible loose fan blade.',
      'hvac', 'in_progress', 'normal', 'Guest', 'Carlos Matos', 120.00
    FROM rooms r WHERE r.id = v_room2;

    INSERT INTO maintenance_issues
      (hotel_id, tenant_id, room_id, room_number, title, description, category, status, priority, reported_by, assigned_to, estimated_cost, resolved_at, actual_cost)
    SELECT
      v_hotel_id, v_tenant_id, v_room3, r.number,
      'Broken bedside lamp',
      'Bedside lamp on left side not working. Bulb and switch checked — needs wiring.',
      'electrical', 'resolved', 'low', 'Ana Lima', 'Carlos Matos', 30.00,
      now() - interval '2 days', 28.00
    FROM rooms r WHERE r.id = v_room3;
  END IF;
END $$;
