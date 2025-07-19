/*
  # Update Demo Accounts to Use Lowercase Usernames

  1. Updates
    - Convert all usernames to lowercase for consistency
    - Ensures login system works properly
    
  2. Demo Accounts (Updated)
    - Admin: admin / admin123
    - Employee: budi / budi123  
    - Employee: sari / sari123
    - Employee: ahmad / ahmad123
*/

-- Update existing usernames to lowercase
UPDATE users SET username = LOWER(username);

-- Ensure demo accounts exist with lowercase usernames
INSERT INTO users (
  nama,
  username,
  password_hash,
  jabatan,
  role,
  minimal_poin
) VALUES 
(
  'Super Administrator',
  'admin',
  'admin123',
  'System Administrator',
  'admin',
  150
),
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