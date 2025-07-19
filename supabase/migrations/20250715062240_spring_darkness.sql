/*
  # Fix RLS Policies with Service Role Access

  This migration fixes RLS policies to work with both authenticated users and service role access.
  It creates policies that allow operations based on user roles stored in the users table.
*/

-- Drop all existing policies
DROP POLICY IF EXISTS "Enable all operations for authenticated users" ON users;
DROP POLICY IF EXISTS "Enable read access for all users" ON users;
DROP POLICY IF EXISTS "Enable insert for admin users" ON users;
DROP POLICY IF EXISTS "Enable update for admin users" ON users;
DROP POLICY IF EXISTS "Enable delete for admin users" ON users;

DROP POLICY IF EXISTS "Enable all operations for authenticated users" ON judul;
DROP POLICY IF EXISTS "Enable all operations for authenticated users" ON subjudul;
DROP POLICY IF EXISTS "Enable all operations for authenticated users" ON aktivitas;
DROP POLICY IF EXISTS "Users can manage own aktivitas" ON aktivitas;

-- Disable RLS temporarily to allow service role access
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE judul DISABLE ROW LEVEL SECURITY;
ALTER TABLE subjudul DISABLE ROW LEVEL SECURITY;
ALTER TABLE aktivitas DISABLE ROW LEVEL SECURITY;

-- Create a function to check if current user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  -- For service role, allow all operations
  IF current_setting('role') = 'service_role' THEN
    RETURN TRUE;
  END IF;
  
  -- For authenticated users, check role in users table
  RETURN EXISTS (
    SELECT 1 FROM users 
    WHERE id::text = auth.uid()::text 
    AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to check if user can access aktivitas
CREATE OR REPLACE FUNCTION can_access_aktivitas(aktivitas_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- For service role, allow all operations
  IF current_setting('role') = 'service_role' THEN
    RETURN TRUE;
  END IF;
  
  -- Users can access their own aktivitas or if they are admin
  RETURN (
    aktivitas_user_id::text = auth.uid()::text OR
    is_admin()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-enable RLS with new policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE judul ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjudul ENABLE ROW LEVEL SECURITY;
ALTER TABLE aktivitas ENABLE ROW LEVEL SECURITY;

-- Users table policies
CREATE POLICY "Allow read access for all authenticated users" ON users
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Allow insert for service role and admin users" ON users
  FOR INSERT TO authenticated, service_role
  WITH CHECK (
    current_setting('role') = 'service_role' OR
    is_admin()
  );

CREATE POLICY "Allow update for service role and admin users" ON users
  FOR UPDATE TO authenticated, service_role
  USING (
    current_setting('role') = 'service_role' OR
    is_admin()
  )
  WITH CHECK (
    current_setting('role') = 'service_role' OR
    is_admin()
  );

CREATE POLICY "Allow delete for service role and admin users" ON users
  FOR DELETE TO authenticated, service_role
  USING (
    current_setting('role') = 'service_role' OR
    is_admin()
  );

-- Judul table policies
CREATE POLICY "Allow all operations for authenticated users" ON judul
  FOR ALL TO authenticated, service_role
  USING (true)
  WITH CHECK (true);

-- Subjudul table policies
CREATE POLICY "Allow all operations for authenticated users" ON subjudul
  FOR ALL TO authenticated, service_role
  USING (true)
  WITH CHECK (true);

-- Aktivitas table policies
CREATE POLICY "Users can manage aktivitas" ON aktivitas
  FOR ALL TO authenticated, service_role
  USING (can_access_aktivitas(user_id))
  WITH CHECK (can_access_aktivitas(user_id));

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated, service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated, service_role;