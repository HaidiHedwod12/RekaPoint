/*
  # Fix RLS Policies for Admin Management and Employee Activities

  1. RLS Policies
    - Update users table policies to allow admin operations
    - Update aktivitas table policies for proper employee access
    - Ensure proper permissions for CRUD operations

  2. Security
    - Maintain security while allowing necessary operations
    - Proper role-based access control
*/

-- Drop existing policies to recreate them properly
DROP POLICY IF EXISTS "Allow delete for service role and admin users" ON users;
DROP POLICY IF EXISTS "Allow insert for service role and admin users" ON users;
DROP POLICY IF EXISTS "Allow update for service role and admin users" ON users;
DROP POLICY IF EXISTS "Allow read access for all authenticated users" ON users;
DROP POLICY IF EXISTS "Allow login access" ON users;

-- Create comprehensive user policies
CREATE POLICY "Enable read access for all users" ON users
  FOR SELECT USING (true);

CREATE POLICY "Enable insert for admin users" ON users
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    ) OR current_setting('role') = 'service_role'
  );

CREATE POLICY "Enable update for admin users" ON users
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    ) OR current_setting('role') = 'service_role'
  );

CREATE POLICY "Enable delete for admin users" ON users
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    ) OR current_setting('role') = 'service_role'
  );

-- Drop existing aktivitas policies
DROP POLICY IF EXISTS "Users can manage aktivitas" ON aktivitas;

-- Create proper aktivitas policies
CREATE POLICY "Enable read for users on own aktivitas" ON aktivitas
  FOR SELECT USING (
    user_id = (SELECT id FROM users WHERE username = current_user) OR
    EXISTS (SELECT 1 FROM users WHERE id = (SELECT id FROM users WHERE username = current_user) AND role = 'admin')
  );

CREATE POLICY "Enable insert for authenticated users" ON aktivitas
  FOR INSERT WITH CHECK (
    user_id = (SELECT id FROM users WHERE username = current_user) OR
    EXISTS (SELECT 1 FROM users WHERE id = (SELECT id FROM users WHERE username = current_user) AND role = 'admin')
  );

CREATE POLICY "Enable update for users on own aktivitas" ON aktivitas
  FOR UPDATE USING (
    user_id = (SELECT id FROM users WHERE username = current_user) OR
    EXISTS (SELECT 1 FROM users WHERE id = (SELECT id FROM users WHERE username = current_user) AND role = 'admin')
  );

CREATE POLICY "Enable delete for users on own aktivitas" ON aktivitas
  FOR DELETE USING (
    user_id = (SELECT id FROM users WHERE username = current_user) OR
    EXISTS (SELECT 1 FROM users WHERE id = (SELECT id FROM users WHERE username = current_user) AND role = 'admin')
  );

-- Ensure all tables have proper RLS enabled
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE aktivitas ENABLE ROW LEVEL SECURITY;
ALTER TABLE judul ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjudul ENABLE ROW LEVEL SECURITY;