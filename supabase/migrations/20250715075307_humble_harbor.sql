/*
  # Create Demo Accounts for RekaKarya System

  1. New Tables
    - Creates demo admin and employee accounts
    
  2. Security
    - Ensures RLS policies allow login functionality
    - Creates accounts with proper roles and permissions
    
  3. Demo Accounts
    - Admin: admin / admin123 (Super Admin)
    - Employee: budi / budi123 (Staff GIS)
    - Employee: sari / sari123 (Staff Survey)
*/

-- Insert demo admin account
INSERT INTO users (
  nama,
  username,
  password_hash,
  jabatan,
  role,
  minimal_poin
) VALUES (
  'Super Administrator',
  'admin',
  'admin123',
  'System Administrator',
  'admin',
  150
) ON CONFLICT (username) DO UPDATE SET
  nama = EXCLUDED.nama,
  password_hash = EXCLUDED.password_hash,
  jabatan = EXCLUDED.jabatan,
  role = EXCLUDED.role,
  minimal_poin = EXCLUDED.minimal_poin;

-- Insert demo employee accounts
INSERT INTO users (
  nama,
  username,
  password_hash,
  jabatan,
  role,
  minimal_poin
) VALUES 
(
  'Budi Santoso',
  'budi',
  'budi123',
  'Staff GIS',
  'karyawan',
  150
),
(
  'Sari Dewi',
  'sari',
  'sari123',
  'Staff Survey',
  'karyawan',
  150
),
(
  'Ahmad Rahman',
  'ahmad',
  'ahmad123',
  'Staff Mapping',
  'karyawan',
  150
) ON CONFLICT (username) DO UPDATE SET
  nama = EXCLUDED.nama,
  password_hash = EXCLUDED.password_hash,
  jabatan = EXCLUDED.jabatan,
  role = EXCLUDED.role,
  minimal_poin = EXCLUDED.minimal_poin;

-- Ensure RLS policies allow login (reading user data)
DROP POLICY IF EXISTS "Allow login access" ON users;
CREATE POLICY "Allow login access"
  ON users
  FOR SELECT
  TO anon, authenticated
  USING (true);