/*
  # Create monthly_settings table for per-month user settings

  1. New Tables
    - `monthly_settings`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to users)
      - `month` (integer, 1-12)
      - `year` (integer)
      - `minimal_poin` (integer, default 150)
      - `can_view_poin` (boolean, default false)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `monthly_settings` table
    - Add policies for authenticated users to manage settings
    - Add unique constraint for user_id + month + year

  3. Functions
    - Add trigger for updated_at column
*/

-- Create monthly_settings table
CREATE TABLE IF NOT EXISTS monthly_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  month integer NOT NULL CHECK (month >= 1 AND month <= 12),
  year integer NOT NULL CHECK (year >= 2020 AND year <= 2030),
  minimal_poin integer NOT NULL DEFAULT 150,
  can_view_poin boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Ensure one setting per user per month/year
  UNIQUE(user_id, month, year)
);

-- Enable RLS
ALTER TABLE monthly_settings ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Enable all operations for authenticated users"
  ON monthly_settings
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create policy for service role (admin operations)
CREATE POLICY "Enable all operations for service role"
  ON monthly_settings
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Add updated_at trigger
CREATE TRIGGER update_monthly_settings_updated_at
  BEFORE UPDATE ON monthly_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_monthly_settings_user_id ON monthly_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_monthly_settings_month_year ON monthly_settings(month, year);
CREATE INDEX IF NOT EXISTS idx_monthly_settings_user_month_year ON monthly_settings(user_id, month, year);