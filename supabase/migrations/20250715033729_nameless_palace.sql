/*
  # Fix minimal_poin column in users table

  1. Changes
    - Ensure minimal_poin column exists with proper default value
    - Update existing users to have default minimal_poin if null
*/

-- Add minimal_poin column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'minimal_poin'
  ) THEN
    ALTER TABLE users ADD COLUMN minimal_poin integer DEFAULT 150;
  END IF;
END $$;

-- Update existing users to have default minimal_poin if null
UPDATE users 
SET minimal_poin = 150 
WHERE minimal_poin IS NULL;

-- Make minimal_poin NOT NULL with default
ALTER TABLE users ALTER COLUMN minimal_poin SET DEFAULT 150;
ALTER TABLE users ALTER COLUMN minimal_poin SET NOT NULL;