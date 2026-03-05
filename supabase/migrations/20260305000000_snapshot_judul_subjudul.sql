-- =====================================================
-- MIGRATION: Snapshot Judul/SubJudul di Aktivitas & Notulensi
-- =====================================================
-- Tujuan: Menjaga data aktivitas & notulensi tetap ada dan menampilkan
-- nama judul/subjudul yang benar walaupun admin sudah mengedit/menghapus
-- judul/subjudul tersebut.

-- =====================================================
-- 1. TAMBAH KOLOM SNAPSHOT
-- =====================================================

-- Aktivitas
ALTER TABLE aktivitas ADD COLUMN IF NOT EXISTS judul_nama TEXT;
ALTER TABLE aktivitas ADD COLUMN IF NOT EXISTS subjudul_nama TEXT;

-- Notulensi
ALTER TABLE notulensi ADD COLUMN IF NOT EXISTS judul_nama TEXT;
ALTER TABLE notulensi ADD COLUMN IF NOT EXISTS subjudul_nama TEXT;

-- =====================================================
-- 2. BACKFILL DATA EXISTING
-- =====================================================

-- Isi judul_nama dan subjudul_nama dari data yang sudah ada
UPDATE aktivitas
SET judul_nama = j.nama
FROM judul j
WHERE aktivitas.judul_id = j.id AND aktivitas.judul_nama IS NULL;

UPDATE aktivitas
SET subjudul_nama = s.nama
FROM subjudul s
WHERE aktivitas.subjudul_id = s.id AND aktivitas.subjudul_nama IS NULL;

UPDATE notulensi
SET judul_nama = j.nama
FROM judul j
WHERE notulensi.judul_id = j.id AND notulensi.judul_nama IS NULL;

UPDATE notulensi
SET subjudul_nama = s.nama
FROM subjudul s
WHERE notulensi.subjudul_id = s.id AND notulensi.subjudul_nama IS NULL;

-- =====================================================
-- 3. UBAH FK CONSTRAINT: CASCADE → SET NULL
-- =====================================================

-- Aktivitas: Drop old FK, buat nullable, buat FK baru dengan SET NULL
ALTER TABLE aktivitas ALTER COLUMN judul_id DROP NOT NULL;
ALTER TABLE aktivitas ALTER COLUMN subjudul_id DROP NOT NULL;

ALTER TABLE aktivitas DROP CONSTRAINT IF EXISTS aktivitas_judul_id_fkey;
ALTER TABLE aktivitas DROP CONSTRAINT IF EXISTS aktivitas_subjudul_id_fkey;

ALTER TABLE aktivitas
  ADD CONSTRAINT aktivitas_judul_id_fkey
  FOREIGN KEY (judul_id) REFERENCES judul(id) ON DELETE SET NULL;

ALTER TABLE aktivitas
  ADD CONSTRAINT aktivitas_subjudul_id_fkey
  FOREIGN KEY (subjudul_id) REFERENCES subjudul(id) ON DELETE SET NULL;

-- Notulensi: Drop old FK, buat nullable, buat FK baru dengan SET NULL
ALTER TABLE notulensi ALTER COLUMN judul_id DROP NOT NULL;
ALTER TABLE notulensi ALTER COLUMN subjudul_id DROP NOT NULL;

ALTER TABLE notulensi DROP CONSTRAINT IF EXISTS notulensi_judul_id_fkey;
ALTER TABLE notulensi DROP CONSTRAINT IF EXISTS notulensi_subjudul_id_fkey;

ALTER TABLE notulensi
  ADD CONSTRAINT notulensi_judul_id_fkey
  FOREIGN KEY (judul_id) REFERENCES judul(id) ON DELETE SET NULL;

ALTER TABLE notulensi
  ADD CONSTRAINT notulensi_subjudul_id_fkey
  FOREIGN KEY (subjudul_id) REFERENCES subjudul(id) ON DELETE SET NULL;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
