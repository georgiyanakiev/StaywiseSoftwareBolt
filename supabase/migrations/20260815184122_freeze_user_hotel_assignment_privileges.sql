-- Freeze privilege-bearing columns on user_hotel_assignments so a tenant owner
-- cannot escalate themselves to super_admin or change another tenant's roles.
-- Only super admins and the service role can change role/active/tenant_id.

CREATE OR REPLACE FUNCTION public.enforce_assignment_privileges()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
BEGIN
  -- Service role / trusted server code has no end-user session.
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  -- Super admins can change anything.
  IF private.is_super_admin() THEN
    RETURN NEW;
  END IF;

  -- Tenant owners can manage assignments within their own tenant, but cannot
  -- grant or hold the super_admin role.
  IF private.is_owner_of_tenant(OLD.tenant_id)
     AND (NEW.tenant_id = OLD.tenant_id)
     AND NEW.role <> 'super_admin' THEN
    RETURN NEW;
  END IF;

  -- Everyone else: freeze privilege columns.
  NEW.role := OLD.role;
  NEW.active := OLD.active;
  NEW.tenant_id := OLD.tenant_id;
  NEW.user_id := OLD.user_id;

  RETURN NEW;
END;
$$;

CREATE TRIGGER enforce_assignment_privileges_trg
  BEFORE UPDATE ON public.user_hotel_assignments
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_assignment_privileges();

-- Also prevent self-inserting a super_admin or owner assignment.
CREATE OR REPLACE FUNCTION public.enforce_assignment_insert_privileges()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  -- Super admins can insert any assignment.
  IF private.is_super_admin() THEN
    RETURN NEW;
  END IF;

  -- Tenant owners can insert assignments within their own tenant, but not
  -- super_admin.
  IF private.is_owner_of_tenant(NEW.tenant_id) AND NEW.role <> 'super_admin' THEN
    RETURN NEW;
  END IF;

  -- No one else can insert.
  RAISE EXCEPTION 'Not authorized to create assignments';
END;
$$;

CREATE TRIGGER enforce_assignment_insert_privileges_trg
  BEFORE INSERT ON public.user_hotel_assignments
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_assignment_insert_privileges();
