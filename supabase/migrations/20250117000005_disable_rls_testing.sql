-- =====================================================
-- DISABLE RLS FOR TESTING REIMBURSEMENT UPDATE
-- =====================================================

-- Disable RLS on reimbursement tables for testing
ALTER TABLE reimbursement_requests DISABLE ROW LEVEL SECURITY;
ALTER TABLE reimbursement_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE reimbursement_files DISABLE ROW LEVEL SECURITY;

-- =====================================================
-- MIGRATION COMPLETE
-- ===================================================== 