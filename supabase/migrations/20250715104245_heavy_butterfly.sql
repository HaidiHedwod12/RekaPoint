/*
  # Fix User Deletion Policies

  1. Security Updates
    - Add proper DELETE policy for admin users
    - Add service role access for admin operations
    - Fix RLS policies for user management

  2. Changes
    - Enable DELETE for admin users
    - Add service role bypass for admin operations
    - Update existing policies
*/

-- First, let's check and fix the is_admin function
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean AS $$
BEGIN
  -- Check if current user is admin from users table
  RETURN EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND role = 'admin'
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing policies to recreate them
DROP POLICY IF EXISTS "Enable delete for admin users" ON users;
DROP POLICY IF EXISTS "Enable insert for admin users" ON users;
DROP POLICY IF EXISTS "Enable update for admin users" ON users;
DROP POLICY IF EXISTS "Enable read access for all users" ON users;

-- Create comprehensive policies for users table
CREATE POLICY "Enable read access for all users"
  ON users
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Enable insert for admin users"
  ON users
  FOR INSERT
  TO public
  WITH CHECK (
    is_admin() OR 
    current_setting('role') = 'service_role' OR
    auth.jwt() ->> 'role' = 'service_role'
  );

CREATE POLICY "Enable update for admin users"
  ON users
  FOR UPDATE
  TO public
  USING (
    is_admin() OR 
    current_setting('role') = 'service_role' OR
    auth.jwt() ->> 'role' = 'service_role'
  )
  WITH CHECK (
    is_admin() OR 
    current_setting('role') = 'service_role' OR
    auth.jwt() ->> 'role' = 'service_role'
  );

CREATE POLICY "Enable delete for admin users"
  ON users
  FOR DELETE
  TO public
  USING (
    is_admin() OR 
    current_setting('role') = 'service_role' OR
    auth.jwt() ->> 'role' = 'service_role'
  );

-- Create a function to set current user context
CREATE OR REPLACE FUNCTION set_current_user(user_id uuid)
RETURNS void AS $$
BEGIN
  PERFORM set_config('app.current_user_id', user_id::text, true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to get current user context
CREATE OR REPLACE FUNCTION get_current_user()
RETURNS uuid AS $$
BEGIN
  RETURN current_setting('app.current_user_id', true)::uuid;
EXCEPTION
  WHEN OTHERS THEN
    RETURN auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update is_admin function to use context
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean AS $$
DECLARE
  user_id uuid;
BEGIN
  -- Try to get user from context first, then from auth
  user_id := get_current_user();
  
  IF user_id IS NULL THEN
    user_id := auth.uid();
  END IF;
  
  -- Check if user is admin
  RETURN EXISTS (
    SELECT 1 FROM users 
    WHERE id = user_id 
    AND role = 'admin'
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;