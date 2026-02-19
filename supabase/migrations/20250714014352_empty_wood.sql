/*
  # Update schema with minimal poin field

  1. Changes
    - Add minimalPoin column to users table
    - Update sample data with minimal poin values
    - Add default minimal poin for existing users

  2. Security
    - Maintain existing RLS policies
*/

-- Add minimalPoin column to users table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'minimal_poin'
  ) THEN
    ALTER TABLE users ADD COLUMN minimal_poin integer DEFAULT 150;
  END IF;
END $$;

-- Update existing users with default minimal poin
UPDATE users SET minimal_poin = 150 WHERE minimal_poin IS NULL;

-- Update sample users with specific minimal poin values
UPDATE users SET minimal_poin = 200 WHERE username = 'admin';
UPDATE users SET minimal_poin = 150 WHERE username = 'budi';
UPDATE users SET minimal_poin = 180 WHERE username = 'sari';
UPDATE users SET minimal_poin = 160 WHERE username = 'andi';