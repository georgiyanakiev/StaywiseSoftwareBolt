
/*
  # Super Admin RLS Policies

  1. Changes
    - Add SELECT, INSERT, UPDATE, DELETE policies on `tenants` for super admins
    - Add SELECT, INSERT, UPDATE, DELETE policies on `user_hotel_assignments` for super admins
    - Super admin is determined by having role = 'super_admin' in user_hotel_assignments

  2. Notes
    - This allows super admins to manage all tenants without needing the service_role key
    - Uses a helper subquery to identify super admins to avoid recursion
*/

CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_hotel_assignments
    WHERE user_id = (SELECT auth.uid())
      AND role = 'super_admin'
      AND active = true
  );
$$;

CREATE POLICY "Super admins can view all tenants"
  ON tenants FOR SELECT
  TO authenticated
  USING (is_super_admin());

CREATE POLICY "Super admins can insert tenants"
  ON tenants FOR INSERT
  TO authenticated
  WITH CHECK (is_super_admin());

CREATE POLICY "Super admins can update tenants"
  ON tenants FOR UPDATE
  TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

CREATE POLICY "Super admins can delete tenants"
  ON tenants FOR DELETE
  TO authenticated
  USING (is_super_admin());

CREATE POLICY "Super admins can view all assignments"
  ON user_hotel_assignments FOR SELECT
  TO authenticated
  USING (is_super_admin());

CREATE POLICY "Super admins can insert assignments"
  ON user_hotel_assignments FOR INSERT
  TO authenticated
  WITH CHECK (is_super_admin());

CREATE POLICY "Super admins can update assignments"
  ON user_hotel_assignments FOR UPDATE
  TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

CREATE POLICY "Super admins can delete assignments"
  ON user_hotel_assignments FOR DELETE
  TO authenticated
  USING (is_super_admin());
