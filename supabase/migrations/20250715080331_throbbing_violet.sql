/*
  # Update RLS Policies with User Context

  1. RLS Policies
    - Update all policies to use new context functions
    - Ensure proper access control

  2. Security
    - Use app.current_user_id for context
    - Maintain role-based access
*/

-- Update users table policies
DROP POLICY IF EXISTS "Enable read access for all users" ON users;
DROP POLICY IF EXISTS "Enable insert for admin users" ON users;
DROP POLICY IF EXISTS "Enable update for admin users" ON users;
DROP POLICY IF EXISTS "Enable delete for admin users" ON users;

CREATE POLICY "Enable read access for all users" ON users
  FOR SELECT USING (true);

CREATE POLICY "Enable insert for admin users" ON users
  FOR INSERT WITH CHECK (
    is_admin() OR current_setting('role') = 'service_role'
  );

CREATE POLICY "Enable update for admin users" ON users
  FOR UPDATE USING (
    is_admin() OR current_setting('role') = 'service_role'
  );

CREATE POLICY "Enable delete for admin users" ON users
  FOR DELETE USING (
    is_admin() OR current_setting('role') = 'service_role'
  );

-- Update aktivitas table policies
DROP POLICY IF EXISTS "Enable read for users on own aktivitas" ON aktivitas;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON aktivitas;
DROP POLICY IF EXISTS "Enable update for users on own aktivitas" ON aktivitas;
DROP POLICY IF EXISTS "Enable delete for users on own aktivitas" ON aktivitas;

CREATE POLICY "Users can manage aktivitas" ON aktivitas
  FOR ALL USING (can_access_aktivitas(user_id))
  WITH CHECK (can_access_aktivitas(user_id));