/*
  # Add poin visibility permission column

  1. Changes
    - Add `can_view_poin` column to users table
    - Set default value to false (karyawan tidak bisa melihat poin secara default)
    - Admin dapat mengatur izin per karyawan

  2. Security
    - Column accessible by admin and service role
*/

-- Add poin visibility column to users table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'can_view_poin'
  ) THEN
    ALTER TABLE users ADD COLUMN can_view_poin boolean DEFAULT false;
  END IF;
END $$;