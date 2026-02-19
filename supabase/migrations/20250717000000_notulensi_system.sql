-- =====================================================
-- NOTULENSI SYSTEM MIGRATION
-- =====================================================

-- Enable UUID extension if not exists
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 1. CREATE TABLES
-- =====================================================

-- Tabel utama notulensi
CREATE TABLE IF NOT EXISTS notulensi (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    judul_id UUID NOT NULL REFERENCES judul(id) ON DELETE CASCADE,
    subjudul_id UUID NOT NULL REFERENCES subjudul(id) ON DELETE CASCADE,
    sesi TEXT NOT NULL, -- Paparan Pendahuluan, dst, atau custom
    tanggal DATE NOT NULL,
    tempat TEXT NOT NULL,
    catatan TEXT NOT NULL, -- HTML rich text
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabel pihak notulensi
CREATE TABLE IF NOT EXISTS notulensi_pihak (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    notulensi_id UUID NOT NULL REFERENCES notulensi(id) ON DELETE CASCADE,
    nama_pihak TEXT NOT NULL,
    perwakilan TEXT[] NOT NULL, -- array nama perwakilan
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 2. CREATE STORAGE BUCKET (optional, for file attachments)
-- =====================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'notulensi-files',
    'notulensi-files',
    false,
    10485760, -- 10MB limit
    ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/jpeg', 'image/png']
) ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 3. CREATE INDEXES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_notulensi_user_id ON notulensi(user_id);
CREATE INDEX IF NOT EXISTS idx_notulensi_judul_id ON notulensi(judul_id);
CREATE INDEX IF NOT EXISTS idx_notulensi_subjudul_id ON notulensi(subjudul_id);
CREATE INDEX IF NOT EXISTS idx_notulensi_tanggal ON notulensi(tanggal);
CREATE INDEX IF NOT EXISTS idx_notulensi_pihak_notulensi_id ON notulensi_pihak(notulensi_id);

-- =====================================================
-- 4. CREATE ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================
ALTER TABLE notulensi ENABLE ROW LEVEL SECURITY;
ALTER TABLE notulensi_pihak ENABLE ROW LEVEL SECURITY;

-- Notulensi: Karyawan hanya bisa CRUD notulensi milik sendiri, admin bisa semua
CREATE POLICY "Karyawan manage own notulensi" ON notulensi
  FOR ALL TO authenticated
  USING (auth.uid()::text = user_id::text)
  WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Admin manage all notulensi" ON notulensi
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id::text = auth.uid()::text AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM users WHERE id::text = auth.uid()::text AND role = 'admin'));

-- Notulensi_pihak: hanya bisa akses pihak dari notulensi milik sendiri atau admin
CREATE POLICY "Karyawan manage own notulensi_pihak" ON notulensi_pihak
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM notulensi WHERE notulensi.id = notulensi_id AND notulensi.user_id::text = auth.uid()::text))
  WITH CHECK (EXISTS (SELECT 1 FROM notulensi WHERE notulensi.id = notulensi_id AND notulensi.user_id::text = auth.uid()::text));

CREATE POLICY "Admin manage all notulensi_pihak" ON notulensi_pihak
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id::text = auth.uid()::text AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM users WHERE id::text = auth.uid()::text AND role = 'admin'));

-- =====================================================
-- 5. TRIGGER FOR updated_at
-- =====================================================
CREATE OR REPLACE FUNCTION update_notulensi_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_notulensi_updated_at
  BEFORE UPDATE ON notulensi
  FOR EACH ROW
  EXECUTE FUNCTION update_notulensi_updated_at();

-- =====================================================
-- MIGRATION COMPLETE
-- ===================================================== 