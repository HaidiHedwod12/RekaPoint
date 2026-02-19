/*
  # Fix User Passwords for Demo Accounts

  1. Updates
    - Update admin user password to 'admin123'
    - Update budi user password to 'budi123'
    - Ensure passwords match the demo credentials shown on login page

  2. Security
    - Uses plain text passwords for demo purposes
    - In production, these should be properly hashed
*/

-- Update admin password
UPDATE users 
SET password_hash = 'admin123'
WHERE username = 'admin';

-- Update budi password  
UPDATE users
SET password_hash = 'budi123'
WHERE username = 'budi';

-- If users don't exist, create them
INSERT INTO users (nama, username, password_hash, jabatan, role, minimal_poin)
SELECT 'Administrator', 'admin', 'admin123', 'System Administrator', 'admin', 150
WHERE NOT EXISTS (SELECT 1 FROM users WHERE username = 'admin');

INSERT INTO users (nama, username, password_hash, jabatan, role, minimal_poin)
SELECT 'Budi Santoso', 'budi', 'budi123', 'Surveyor GIS', 'karyawan', 150
WHERE NOT EXISTS (SELECT 1 FROM users WHERE username = 'budi');