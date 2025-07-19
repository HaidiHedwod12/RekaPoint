/*
  # Fix Row Level Security Policies

  This migration fixes the RLS policies to allow proper access for authenticated users.
  
  1. Security Updates
    - Update RLS policies for all tables to allow proper CRUD operations
    - Ensure admin users can manage all data
    - Ensure regular users can access their own data
    - Fix the authentication flow for all operations
*/

-- Drop existing policies to recreate them properly
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON judul;
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON subjudul;
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON jenis_kegiatan;
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON sesi_notulensi;
DROP POLICY IF EXISTS "Users can manage own aktivitas" ON aktivitas;
DROP POLICY IF EXISTS "Admins can manage all aktivitas" ON aktivitas;

-- Judul table policies
CREATE POLICY "Enable all operations for authenticated users" ON judul
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- SubJudul table policies  
CREATE POLICY "Enable all operations for authenticated users" ON subjudul
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Jenis Kegiatan table policies
CREATE POLICY "Enable all operations for authenticated users" ON jenis_kegiatan
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Sesi Notulensi table policies
CREATE POLICY "Enable all operations for authenticated users" ON sesi_notulensi
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Aktivitas table policies - more granular
CREATE POLICY "Users can manage own aktivitas" ON aktivitas
  FOR ALL
  TO authenticated
  USING (
    auth.uid()::text = user_id::text OR 
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id::text = auth.uid()::text 
      AND users.role = 'admin'
    )
  )
  WITH CHECK (
    auth.uid()::text = user_id::text OR 
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id::text = auth.uid()::text 
      AND users.role = 'admin'
    )
  );

-- Users table policies - keep existing but ensure they work
DROP POLICY IF EXISTS "Users can read own data" ON users;
DROP POLICY IF EXISTS "Admins can manage all users" ON users;
DROP POLICY IF EXISTS "Allow public read for login" ON users;

CREATE POLICY "Allow public read for login" ON users
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Users can read own data" ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid()::text = id::text);

CREATE POLICY "Admins can manage all users" ON users
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id::text = auth.uid()::text 
      AND users.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id::text = auth.uid()::text 
      AND users.role = 'admin'
    )
  );

-- Ensure all tables have RLS enabled
ALTER TABLE judul ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjudul ENABLE ROW LEVEL SECURITY;
ALTER TABLE jenis_kegiatan ENABLE ROW LEVEL SECURITY;
ALTER TABLE sesi_notulensi ENABLE ROW LEVEL SECURITY;
ALTER TABLE aktivitas ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;