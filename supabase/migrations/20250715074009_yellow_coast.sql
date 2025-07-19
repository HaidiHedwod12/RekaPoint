/*
  # Create Demo Users

  1. New Users
    - `admin` user with admin role
    - `budi` user with karyawan role
  
  2. Security
    - Users will be created with proper roles and permissions
    - Default minimal_poin set to 150
    - Passwords are stored as plain text for demo purposes
*/

-- Insert demo admin user
INSERT INTO users (nama, username, password_hash, jabatan, role, minimal_poin) 
VALUES (
  'Administrator',
  'admin', 
  'admin123',
  'System Administrator',
  'admin',
  150
) ON CONFLICT (username) DO NOTHING;

-- Insert demo karyawan user
INSERT INTO users (nama, username, password_hash, jabatan, role, minimal_poin) 
VALUES (
  'Budi Santoso',
  'budi',
  'budi123', 
  'GIS Surveyor',
  'karyawan',
  150
) ON CONFLICT (username) DO NOTHING;

-- Insert additional demo karyawan users for testing
INSERT INTO users (nama, username, password_hash, jabatan, role, minimal_poin) 
VALUES (
  'Siti Nurhaliza',
  'siti',
  'siti123',
  'CAD Drafter', 
  'karyawan',
  150
) ON CONFLICT (username) DO NOTHING;

INSERT INTO users (nama, username, password_hash, jabatan, role, minimal_poin) 
VALUES (
  'Ahmad Wijaya',
  'ahmad',
  'ahmad123',
  'Project Manager',
  'karyawan', 
  150
) ON CONFLICT (username) DO NOTHING;