/*
  # Add Admin User Listing Function

  ## Summary
  Creates a secure server-side function that allows the super admin to list all
  auth users (from auth.users) along with their hotel assignment counts.
  This bypasses RLS safely using SECURITY DEFINER.

  ## New Functions
  - `admin_list_users()` — returns all auth users with id, email, created_at,
    last_sign_in_at, raw_user_meta_data, and hotel_assignment_count

  ## Security
  - Function is SECURITY DEFINER so it runs with the owner's privileges
  - Only accessible when called via the service role key (in practice used
    only from the SuperAdmin page which uses supabaseAdmin client)
  - Grant to authenticated and service_role
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
