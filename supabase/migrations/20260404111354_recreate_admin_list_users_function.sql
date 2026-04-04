/*
  # Recreate admin_list_users function

  Recreates the secure SECURITY DEFINER function that allows super admins
  to list all auth users with their hotel assignment counts.
  The function was missing from the database.
*/

CREATE OR REPLACE FUNCTION admin_list_users()
RETURNS TABLE (
  id uuid,
  email text,
  created_at timestamptz,
  last_sign_in_at timestamptz,
  raw_user_meta_data jsonb,
  hotel_assignment_count bigint
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    u.id,
    u.email,
    u.created_at,
    u.last_sign_in_at,
    u.raw_user_meta_data,
    COUNT(a.id) FILTER (WHERE a.active = true) AS hotel_assignment_count
  FROM auth.users u
  LEFT JOIN public.user_hotel_assignments a ON a.user_id = u.id
  GROUP BY u.id, u.email, u.created_at, u.last_sign_in_at, u.raw_user_meta_data
  ORDER BY u.created_at DESC;
$$;

GRANT EXECUTE ON FUNCTION admin_list_users() TO authenticated;
GRANT EXECUTE ON FUNCTION admin_list_users() TO service_role;
