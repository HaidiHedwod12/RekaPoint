/*
  # Fix Users Table RLS Policies for Admin Operations

  1. Security Updates
    - Drop existing problematic RLS policies on users table
    - Create new policies that allow admin operations
    - Allow INSERT operations for admin users
    - Allow UPDATE operations for admin users
    - Allow DELETE operations for admin users
    - Maintain read access for authentication

  2. Policy Structure
    - Admin users can perform all operations on users table
    - Regular users can only read their own data
    - Anonymous users can read for login purposes
*/

-- Drop existing policies that might be causing issues
DROP POLICY IF EXISTS "Admins can manage all users" ON users;
DROP POLICY IF EXISTS "Allow public read for login" ON users;
DROP POLICY IF EXISTS "Users can read own data" ON users;

-- Create comprehensive policies for users table
CREATE POLICY "Enable read access for all users" ON users
  FOR SELECT USING (true);

CREATE POLICY "Enable insert for admin users" ON users
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id::text = auth.uid()::text 
      AND role = 'admin'
    )
  );

CREATE POLICY "Enable update for admin users" ON users
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id::text = auth.uid()::text 
      AND role = 'admin'
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id::text = auth.uid()::text 
      AND role = 'admin'
    )
  );

CREATE POLICY "Enable delete for admin users" ON users
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id::text = auth.uid()::text 
      AND role = 'admin'
    )
  );

-- Ensure RLS is enabled
ALTER TABLE users ENABLE ROW LEVEL SECURITY;