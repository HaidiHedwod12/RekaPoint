/*
  # Create users table with dummy accounts

  1. New Tables
    - `users`
      - `id` (uuid, primary key)
      - `nama` (text, employee name)
      - `username` (text, unique login username)
      - `password_hash` (text, password for login)
      - `jabatan` (text, job position)
      - `role` (text, either 'admin' or 'karyawan')
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on `users` table
    - Add policy for authenticated users to read their own data

  3. Dummy Data
    - Admin account: username 'admin', password 'admin123'
    - Employee accounts with various positions
*/

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nama text NOT NULL,
  username text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  jabatan text NOT NULL,
  role text NOT NULL CHECK (role IN ('admin', 'karyawan')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own data"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid()::text = id::text);

CREATE POLICY "Allow public read for login"
  ON users
  FOR SELECT
  TO anon
  USING (true);

-- Insert dummy admin account
INSERT INTO users (nama, username, password_hash, jabatan, role) VALUES
('Administrator', 'admin', 'admin123', 'System Administrator', 'admin');

-- Insert dummy employee accounts
INSERT INTO users (nama, username, password_hash, jabatan, role) VALUES
('Budi Santoso', 'budi', 'budi123', 'Surveyor Senior', 'karyawan'),
('Siti Nurhaliza', 'siti', 'siti123', 'GIS Analyst', 'karyawan'),
('Ahmad Fauzi', 'ahmad', 'ahmad123', 'Field Engineer', 'karyawan'),
('Dewi Kartika', 'dewi', 'dewi123', 'Drafter', 'karyawan'),
('Rudi Hermawan', 'rudi', 'rudi123', 'Surveyor Junior', 'karyawan'),
('Maya Sari', 'maya', 'maya123', 'Data Entry', 'karyawan'),
('Eko Prasetyo', 'eko', 'eko123', 'Project Manager', 'karyawan'),
('Rina Wati', 'rina', 'rina123', 'Quality Control', 'karyawan');