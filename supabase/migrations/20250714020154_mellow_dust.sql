/*
  # Fix Complete Database Schema

  1. New Tables
    - `users` - User management with authentication
    - `judul` - Activity categories/titles  
    - `subjudul` - Activity subcategories
    - `aktivitas` - User activities with points

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
    - Public read access for login

  3. Foreign Keys
    - subjudul.judul_id → judul.id
    - aktivitas.user_id → users.id
    - aktivitas.judul_id → judul.id
    - aktivitas.subjudul_id → subjudul.id

  4. Sample Data
    - Demo admin and employee accounts
    - Sample activity categories
*/

-- Drop existing tables if they exist (in correct order to handle dependencies)
DROP TABLE IF EXISTS aktivitas CASCADE;
DROP TABLE IF EXISTS subjudul CASCADE;
DROP TABLE IF EXISTS judul CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Create users table
CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nama text NOT NULL,
  username text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  jabatan text NOT NULL,
  role text NOT NULL CHECK (role IN ('admin', 'karyawan')),
  minimal_poin integer DEFAULT 150,
  created_at timestamptz DEFAULT now()
);

-- Create judul table
CREATE TABLE judul (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nama text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create subjudul table
CREATE TABLE subjudul (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  judul_id uuid NOT NULL REFERENCES judul(id) ON DELETE CASCADE,
  nama text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create aktivitas table
CREATE TABLE aktivitas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tanggal date NOT NULL,
  judul_id uuid NOT NULL REFERENCES judul(id) ON DELETE CASCADE,
  subjudul_id uuid NOT NULL REFERENCES subjudul(id) ON DELETE CASCADE,
  aktivitas text NOT NULL,
  deskripsi text,
  poin integer,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for aktivitas updated_at
CREATE TRIGGER update_aktivitas_updated_at
  BEFORE UPDATE ON aktivitas
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE judul ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjudul ENABLE ROW LEVEL SECURITY;
ALTER TABLE aktivitas ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for users table
CREATE POLICY "Allow public read for login" ON users
  FOR SELECT TO anon
  USING (true);

CREATE POLICY "Users can read own data" ON users
  FOR SELECT TO authenticated
  USING (auth.uid()::text = id::text);

CREATE POLICY "Admins can manage all users" ON users
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id::text = auth.uid()::text 
      AND role = 'admin'
    )
  );

-- Create RLS policies for judul table
CREATE POLICY "Allow all operations for authenticated users" ON judul
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create RLS policies for subjudul table
CREATE POLICY "Allow all operations for authenticated users" ON subjudul
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create RLS policies for aktivitas table
CREATE POLICY "Users can manage own aktivitas" ON aktivitas
  FOR ALL TO authenticated
  USING (auth.uid()::text = user_id::text)
  WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Admins can manage all aktivitas" ON aktivitas
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id::text = auth.uid()::text 
      AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id::text = auth.uid()::text 
      AND role = 'admin'
    )
  );

-- Insert sample data
INSERT INTO users (nama, username, password_hash, jabatan, role, minimal_poin) VALUES
('Administrator', 'admin', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'System Administrator', 'admin', 0),
('Budi Santoso', 'budi', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Surveyor GIS', 'karyawan', 150),
('Siti Nurhaliza', 'siti', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Kartografer', 'karyawan', 120),
('Ahmad Wijaya', 'ahmad', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Analis Spasial', 'karyawan', 180);

INSERT INTO judul (nama) VALUES
('Survei Lapangan'),
('Pemetaan Digital'),
('Analisis Data Spasial'),
('Administrasi Proyek'),
('Pelatihan & Pengembangan');

-- Get judul IDs for subjudul insertion
DO $$
DECLARE
    survei_id uuid;
    pemetaan_id uuid;
    analisis_id uuid;
    admin_id uuid;
    pelatihan_id uuid;
BEGIN
    SELECT id INTO survei_id FROM judul WHERE nama = 'Survei Lapangan';
    SELECT id INTO pemetaan_id FROM judul WHERE nama = 'Pemetaan Digital';
    SELECT id INTO analisis_id FROM judul WHERE nama = 'Analisis Data Spasial';
    SELECT id INTO admin_id FROM judul WHERE nama = 'Administrasi Proyek';
    SELECT id INTO pelatihan_id FROM judul WHERE nama = 'Pelatihan & Pengembangan';

    INSERT INTO subjudul (judul_id, nama) VALUES
    (survei_id, 'Survei Topografi'),
    (survei_id, 'Survei Kadastral'),
    (survei_id, 'Survei Batimetri'),
    (survei_id, 'Ground Control Point'),
    (pemetaan_id, 'Digitasi Peta'),
    (pemetaan_id, 'Editing Geometri'),
    (pemetaan_id, 'Quality Control'),
    (pemetaan_id, 'Layout Peta'),
    (analisis_id, 'Analisis Buffer'),
    (analisis_id, 'Overlay Analysis'),
    (analisis_id, 'Network Analysis'),
    (analisis_id, 'Spatial Statistics'),
    (admin_id, 'Laporan Harian'),
    (admin_id, 'Koordinasi Tim'),
    (admin_id, 'Dokumentasi Proyek'),
    (pelatihan_id, 'Workshop GIS'),
    (pelatihan_id, 'Sertifikasi'),
    (pelatihan_id, 'Knowledge Sharing');
END $$;