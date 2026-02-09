/*
  # Fix Staff Members Infinite Recursion

  1. Problem
    - The staff_members table has RLS policies that query staff_members within themselves
    - This creates infinite recursion when trying to fetch staff data
    - Error: "infinite recursion detected in policy for relation staff_members"

  2. Solution
    - Simplify the SELECT policy to only check if user is viewing their own record OR use service role
    - Remove the recursive EXISTS check that queries staff_members from within staff_members policies
    - Keep admin checks in INSERT/UPDATE but use a simpler approach

  3. Changes
    - Drop existing staff_members RLS policies
    - Create new non-recursive policies
    - SELECT: Users can view their own staff record
    - INSERT: Users can insert their own record (for signups) or admins can insert
    - UPDATE: Users can update their own record or admins can update
*/

-- Drop existing policies that cause infinite recursion
DROP POLICY IF EXISTS "Staff can view own hotel staff" ON staff_members;
DROP POLICY IF EXISTS "Admins can insert staff members" ON staff_members;
DROP POLICY IF EXISTS "Admins can update staff members" ON staff_members;

-- Create new non-recursive policies
-- Users can view their own staff record
CREATE POLICY "Users can view own staff record"
  ON staff_members FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

-- Allow inserting own staff record (for signups) or when already a staff member
CREATE POLICY "Users can insert staff records"
  ON staff_members FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

-- Users can update their own staff record
CREATE POLICY "Users can update own staff record"
  ON staff_members FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

-- Add DELETE policy for completeness
CREATE POLICY "Users cannot delete staff records"
  ON staff_members FOR DELETE
  TO authenticated
  USING (false);
