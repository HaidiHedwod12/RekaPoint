-- =====================================================
-- FIX REIMBURSEMENT RLS POLICIES
-- =====================================================

-- Drop all existing policies first
DROP POLICY IF EXISTS "Allow everything on reimbursement_requests" ON reimbursement_requests;
DROP POLICY IF EXISTS "Allow everything on reimbursement_items" ON reimbursement_items;
DROP POLICY IF EXISTS "Allow everything on reimbursement_files" ON reimbursement_files;

-- =====================================================
-- CREATE PROPER RLS POLICIES FOR REIMBURSEMENT
-- =====================================================

-- REIMBURSEMENT_REQUESTS POLICIES
-- Allow users to view their own requests
CREATE POLICY "Users can view own reimbursement requests" ON reimbursement_requests
    FOR SELECT USING (auth.uid() = user_id);

-- Allow users to insert their own requests
CREATE POLICY "Users can insert own reimbursement requests" ON reimbursement_requests
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own pending requests
CREATE POLICY "Users can update own pending requests" ON reimbursement_requests
    FOR UPDATE USING (auth.uid() = user_id AND status = 'pending');

-- Allow admins to view all requests
CREATE POLICY "Admins can view all reimbursement requests" ON reimbursement_requests
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'admin'
        )
    );

-- Allow admins to update all requests
CREATE POLICY "Admins can update all reimbursement requests" ON reimbursement_requests
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'admin'
        )
    );

-- =====================================================
-- REIMBURSEMENT_ITEMS POLICIES
-- =====================================================

-- Allow users to view items from their own requests
CREATE POLICY "Users can view own reimbursement items" ON reimbursement_items
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM reimbursement_requests 
            WHERE reimbursement_requests.id = reimbursement_items.request_id 
            AND reimbursement_requests.user_id = auth.uid()
        )
    );

-- Allow users to insert items to their own requests
CREATE POLICY "Users can insert own reimbursement items" ON reimbursement_items
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM reimbursement_requests 
            WHERE reimbursement_requests.id = reimbursement_items.request_id 
            AND reimbursement_requests.user_id = auth.uid()
            AND reimbursement_requests.status = 'pending'
        )
    );

-- Allow users to update items from their own pending requests
CREATE POLICY "Users can update own pending reimbursement items" ON reimbursement_items
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM reimbursement_requests 
            WHERE reimbursement_requests.id = reimbursement_items.request_id 
            AND reimbursement_requests.user_id = auth.uid()
            AND reimbursement_requests.status = 'pending'
        )
    );

-- Allow users to delete items from their own pending requests
CREATE POLICY "Users can delete own pending reimbursement items" ON reimbursement_items
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM reimbursement_requests 
            WHERE reimbursement_requests.id = reimbursement_items.request_id 
            AND reimbursement_requests.user_id = auth.uid()
            AND reimbursement_requests.status = 'pending'
        )
    );

-- Allow admins to view all items
CREATE POLICY "Admins can view all reimbursement items" ON reimbursement_items
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'admin'
        )
    );

-- Allow admins to manage all items
CREATE POLICY "Admins can manage all reimbursement items" ON reimbursement_items
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'admin'
        )
    );

-- =====================================================
-- REIMBURSEMENT_FILES POLICIES
-- =====================================================

-- Allow users to view files from their own requests
CREATE POLICY "Users can view own reimbursement files" ON reimbursement_files
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM reimbursement_requests 
            WHERE reimbursement_requests.id = reimbursement_files.request_id 
            AND reimbursement_requests.user_id = auth.uid()
        )
    );

-- Allow users to insert files to their own requests
CREATE POLICY "Users can insert own reimbursement files" ON reimbursement_files
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM reimbursement_requests 
            WHERE reimbursement_requests.id = reimbursement_files.request_id 
            AND reimbursement_requests.user_id = auth.uid()
            AND reimbursement_requests.status = 'pending'
        )
    );

-- Allow users to delete files from their own pending requests
CREATE POLICY "Users can delete own pending reimbursement files" ON reimbursement_files
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM reimbursement_requests 
            WHERE reimbursement_requests.id = reimbursement_files.request_id 
            AND reimbursement_requests.user_id = auth.uid()
            AND reimbursement_requests.status = 'pending'
        )
    );

-- Allow admins to view all files
CREATE POLICY "Admins can view all reimbursement files" ON reimbursement_files
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'admin'
        )
    );

-- Allow admins to manage all files
CREATE POLICY "Admins can manage all reimbursement files" ON reimbursement_files
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'admin'
        )
    );

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