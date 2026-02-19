-- =====================================================
-- NOTULENSI SESSIONS MANUAL MIGRATION
-- =====================================================

CREATE TABLE IF NOT EXISTS notulensi_sessions_manual (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subjudul_id UUID NOT NULL REFERENCES subjudul(id) ON DELETE CASCADE,
    sesi TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Disable RLS for public access
ALTER TABLE notulensi_sessions_manual DISABLE ROW LEVEL SECURITY;

-- (No policy needed if RLS disabled)
-- If you want to enable RLS in the future, add policy for anon/authenticated

-- =====================================================
-- MIGRATION COMPLETE
-- ===================================================== 