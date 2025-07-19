-- =====================================================
-- FIX REIMBURSEMENT POLICIES AND FOREIGN KEY ISSUES
-- =====================================================

-- First, let's check if the tables exist and have correct structure
DO $$
BEGIN
    -- Check if reimbursement_requests table exists
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'reimbursement_requests') THEN
        RAISE EXCEPTION 'Table reimbursement_requests does not exist';
    END IF;
    
    -- Check if users table exists
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'users') THEN
        RAISE EXCEPTION 'Table users does not exist';
    END IF;
    
    -- Check foreign key constraint
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'reimbursement_requests_user_id_fkey'
        AND table_name = 'reimbursement_requests'
    ) THEN
        RAISE EXCEPTION 'Foreign key constraint reimbursement_requests_user_id_fkey does not exist';
    END IF;
    
    RAISE NOTICE 'All tables and constraints exist correctly';
END $$;

-- =====================================================
-- DROP AND RECREATE ALL REIMBURSEMENT POLICIES
-- =====================================================

-- Drop all existing policies
DROP POLICY IF EXISTS "Allow all users to view reimbursement requests" ON reimbursement_requests;
DROP POLICY IF EXISTS "Allow all users to insert reimbursement requests" ON reimbursement_requests;
DROP POLICY IF EXISTS "Allow users to update own pending requests" ON reimbursement_requests;
DROP POLICY IF EXISTS "Allow admins to update all requests" ON reimbursement_requests;

DROP POLICY IF EXISTS "Allow all users to view reimbursement items" ON reimbursement_items;
DROP POLICY IF EXISTS "Allow all users to insert reimbursement items" ON reimbursement_items;
DROP POLICY IF EXISTS "Allow all users to update reimbursement items" ON reimbursement_items;
DROP POLICY IF EXISTS "Allow all users to delete reimbursement items" ON reimbursement_items;

DROP POLICY IF EXISTS "Allow all users to view reimbursement files" ON reimbursement_files;
DROP POLICY IF EXISTS "Allow all users to insert reimbursement files" ON reimbursement_files;
DROP POLICY IF EXISTS "Allow all users to delete reimbursement files" ON reimbursement_files;

-- =====================================================
-- CREATE COMPLETELY OPEN POLICIES FOR TESTING
-- =====================================================

-- REIMBURSEMENT_REQUESTS - Allow everything
CREATE POLICY "Allow everything on reimbursement_requests" ON reimbursement_requests
    FOR ALL USING (true) WITH CHECK (true);

-- REIMBURSEMENT_ITEMS - Allow everything  
CREATE POLICY "Allow everything on reimbursement_items" ON reimbursement_items
    FOR ALL USING (true) WITH CHECK (true);

-- REIMBURSEMENT_FILES - Allow everything
CREATE POLICY "Allow everything on reimbursement_files" ON reimbursement_files
    FOR ALL USING (true) WITH CHECK (true);

-- =====================================================
-- STORAGE POLICIES - Allow everything for testing
-- =====================================================

-- Drop existing storage policies
DROP POLICY IF EXISTS "Allow all users to upload reimbursement receipts" ON storage.objects;
DROP POLICY IF EXISTS "Allow all users to view reimbursement receipts" ON storage.objects;
DROP POLICY IF EXISTS "Allow all users to update reimbursement receipts" ON storage.objects;
DROP POLICY IF EXISTS "Allow all users to delete reimbursement receipts" ON storage.objects;

-- Create completely open storage policies
CREATE POLICY "Allow everything on reimbursement-receipts bucket" ON storage.objects
    FOR ALL USING (bucket_id = 'reimbursement-receipts') WITH CHECK (bucket_id = 'reimbursement-receipts');

-- =====================================================
-- VERIFY POLICIES ARE CREATED
-- =====================================================

DO $$
DECLARE
    policy_count INTEGER;
BEGIN
    -- Count policies on reimbursement_requests
    SELECT COUNT(*) INTO policy_count 
    FROM pg_policies 
    WHERE tablename = 'reimbursement_requests';
    
    RAISE NOTICE 'reimbursement_requests has % policies', policy_count;
    
    -- Count policies on reimbursement_items
    SELECT COUNT(*) INTO policy_count 
    FROM pg_policies 
    WHERE tablename = 'reimbursement_items';
    
    RAISE NOTICE 'reimbursement_items has % policies', policy_count;
    
    -- Count policies on reimbursement_files
    SELECT COUNT(*) INTO policy_count 
    FROM pg_policies 
    WHERE tablename = 'reimbursement_files';
    
    RAISE NOTICE 'reimbursement_files has % policies', policy_count;
END $$;

-- =====================================================
-- MIGRATION COMPLETE
-- ===================================================== 