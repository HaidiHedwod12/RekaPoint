-- =====================================================
-- NOTULENSI EDIT TRACKING MIGRATION
-- =====================================================

ALTER TABLE notulensi ADD COLUMN IF NOT EXISTS created_by UUID;
ALTER TABLE notulensi ADD COLUMN IF NOT EXISTS edited_by TEXT[];

-- =====================================================
-- MIGRATION COMPLETE
-- ===================================================== 