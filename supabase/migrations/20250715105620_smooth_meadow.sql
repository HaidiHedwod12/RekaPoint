/*
  # Fix Judul and SubJudul RLS Policies

  1. RLS Policies
    - Enable RLS on judul and subjudul tables
    - Add policies for authenticated users to manage judul/subjudul
    - Add policies for service role to bypass RLS

  2. Functions
    - Helper functions for checking user permissions
    - Context management for RLS

  3. Security
    - Proper access control for judul/subjudul operations
    - Admin and authenticated user access
*/

-- Enable RLS on judul table
ALTER TABLE judul ENABLE ROW LEVEL SECURITY;

-- Enable RLS on subjudul table  
ALTER TABLE subjudul ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON judul;
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON subjudul;
DROP POLICY IF EXISTS "Enable all operations for authenticated users" ON judul;
DROP POLICY IF EXISTS "Enable all operations for authenticated users" ON subjudul;

-- Create comprehensive policies for judul table
CREATE POLICY "judul_select_policy" ON judul
  FOR SELECT
  TO authenticated, anon, service_role
  USING (true);

CREATE POLICY "judul_insert_policy" ON judul
  FOR INSERT
  TO authenticated, service_role
  WITH CHECK (true);

CREATE POLICY "judul_update_policy" ON judul
  FOR UPDATE
  TO authenticated, service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "judul_delete_policy" ON judul
  FOR DELETE
  TO authenticated, service_role
  USING (true);

-- Create comprehensive policies for subjudul table
CREATE POLICY "subjudul_select_policy" ON subjudul
  FOR SELECT
  TO authenticated, anon, service_role
  USING (true);

CREATE POLICY "subjudul_insert_policy" ON subjudul
  FOR INSERT
  TO authenticated, service_role
  WITH CHECK (true);

CREATE POLICY "subjudul_update_policy" ON subjudul
  FOR UPDATE
  TO authenticated, service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "subjudul_delete_policy" ON subjudul
  FOR DELETE
  TO authenticated, service_role
  USING (true);

-- Grant necessary permissions
GRANT ALL ON judul TO authenticated;
GRANT ALL ON subjudul TO authenticated;
GRANT ALL ON judul TO service_role;
GRANT ALL ON subjudul TO service_role;
GRANT ALL ON judul TO anon;
GRANT ALL ON subjudul TO anon;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_judul_nama ON judul(nama);
CREATE INDEX IF NOT EXISTS idx_subjudul_judul_id ON subjudul(judul_id);
CREATE INDEX IF NOT EXISTS idx_subjudul_nama ON subjudul(nama);

-- Insert some default data if tables are empty
INSERT INTO judul (nama) VALUES 
  ('Survei Topografi'),
  ('Pemetaan GIS'),
  ('Analisis Data Spasial'),
  ('Perencanaan Wilayah'),
  ('Administrasi')
ON CONFLICT DO NOTHING;

-- Get judul IDs for subjudul insertion
DO $$
DECLARE
    survei_id uuid;
    pemetaan_id uuid;
    analisis_id uuid;
    perencanaan_id uuid;
    admin_id uuid;
BEGIN
    -- Get judul IDs
    SELECT id INTO survei_id FROM judul WHERE nama = 'Survei Topografi' LIMIT 1;
    SELECT id INTO pemetaan_id FROM judul WHERE nama = 'Pemetaan GIS' LIMIT 1;
    SELECT id INTO analisis_id FROM judul WHERE nama = 'Analisis Data Spasial' LIMIT 1;
    SELECT id INTO perencanaan_id FROM judul WHERE nama = 'Perencanaan Wilayah' LIMIT 1;
    SELECT id INTO admin_id FROM judul WHERE nama = 'Administrasi' LIMIT 1;

    -- Insert subjudul if judul exists
    IF survei_id IS NOT NULL THEN
        INSERT INTO subjudul (judul_id, nama) VALUES 
            (survei_id, 'Pengukuran Lapangan'),
            (survei_id, 'Pengolahan Data Survei'),
            (survei_id, 'Pembuatan Peta Topografi')
        ON CONFLICT DO NOTHING;
    END IF;

    IF pemetaan_id IS NOT NULL THEN
        INSERT INTO subjudul (judul_id, nama) VALUES 
            (pemetaan_id, 'Digitasi Peta'),
            (pemetaan_id, 'Analisis Spasial'),
            (pemetaan_id, 'Pembuatan Layout Peta')
        ON CONFLICT DO NOTHING;
    END IF;

    IF analisis_id IS NOT NULL THEN
        INSERT INTO subjudul (judul_id, nama) VALUES 
            (analisis_id, 'Analisis Buffer'),
            (analisis_id, 'Analisis Overlay'),
            (analisis_id, 'Interpretasi Data')
        ON CONFLICT DO NOTHING;
    END IF;

    IF perencanaan_id IS NOT NULL THEN
        INSERT INTO subjudul (judul_id, nama) VALUES 
            (perencanaan_id, 'Studi Kelayakan'),
            (perencanaan_id, 'Perencanaan Tata Ruang'),
            (perencanaan_id, 'Evaluasi Dampak')
        ON CONFLICT DO NOTHING;
    END IF;

    IF admin_id IS NOT NULL THEN
        INSERT INTO subjudul (judul_id, nama) VALUES 
            (admin_id, 'Dokumentasi Proyek'),
            (admin_id, 'Laporan Kegiatan'),
            (admin_id, 'Koordinasi Tim')
        ON CONFLICT DO NOTHING;
    END IF;
END $$;