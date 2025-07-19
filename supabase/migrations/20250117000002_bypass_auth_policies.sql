-- =====================================================
-- BYPASS AUTH POLICIES FOR CUSTOM AUTH SYSTEM
-- =====================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own reimbursement requests" ON reimbursement_requests;
DROP POLICY IF EXISTS "Users can insert own reimbursement requests" ON reimbursement_requests;
DROP POLICY IF EXISTS "Users can update own pending requests" ON reimbursement_requests;
DROP POLICY IF EXISTS "Admins can view all reimbursement requests" ON reimbursement_requests;
DROP POLICY IF EXISTS "Admins can update all reimbursement requests" ON reimbursement_requests;

DROP POLICY IF EXISTS "Users can view own reimbursement items" ON reimbursement_items;
DROP POLICY IF EXISTS "Users can insert own reimbursement items" ON reimbursement_items;
DROP POLICY IF EXISTS "Users can update own pending reimbursement items" ON reimbursement_items;
DROP POLICY IF EXISTS "Users can delete own pending reimbursement items" ON reimbursement_items;
DROP POLICY IF EXISTS "Admins can view all reimbursement items" ON reimbursement_items;
DROP POLICY IF EXISTS "Admins can manage all reimbursement items" ON reimbursement_items;

DROP POLICY IF EXISTS "Users can view own reimbursement files" ON reimbursement_files;
DROP POLICY IF EXISTS "Users can insert own reimbursement files" ON reimbursement_files;
DROP POLICY IF EXISTS "Users can delete own pending reimbursement files" ON reimbursement_files;
DROP POLICY IF EXISTS "Admins can view all reimbursement files" ON reimbursement_files;
DROP POLICY IF EXISTS "Admins can manage all reimbursement files" ON reimbursement_files;

-- =====================================================
-- CREATE POLICIES FOR CUSTOM AUTH SYSTEM
-- =====================================================

-- REIMBURSEMENT_REQUESTS POLICIES
-- Allow all authenticated users to view all requests (for now)
CREATE POLICY "Allow all users to view reimbursement requests" ON reimbursement_requests
    FOR SELECT USING (true);

-- Allow all authenticated users to insert requests
CREATE POLICY "Allow all users to insert reimbursement requests" ON reimbursement_requests
    FOR INSERT WITH CHECK (true);

-- Allow users to update their own pending requests
CREATE POLICY "Allow users to update own pending requests" ON reimbursement_requests
    FOR UPDATE USING (status = 'pending');

-- Allow admins to update all requests
CREATE POLICY "Allow admins to update all requests" ON reimbursement_requests
    FOR UPDATE USING (true);

-- =====================================================
-- REIMBURSEMENT_ITEMS POLICIES
-- =====================================================

-- Allow all users to view all items
CREATE POLICY "Allow all users to view reimbursement items" ON reimbursement_items
    FOR SELECT USING (true);

-- Allow all users to insert items
CREATE POLICY "Allow all users to insert reimbursement items" ON reimbursement_items
    FOR INSERT WITH CHECK (true);

-- Allow users to update items
CREATE POLICY "Allow all users to update reimbursement items" ON reimbursement_items
    FOR UPDATE USING (true);

-- Allow users to delete items
CREATE POLICY "Allow all users to delete reimbursement items" ON reimbursement_items
    FOR DELETE USING (true);

-- =====================================================
-- REIMBURSEMENT_FILES POLICIES
-- =====================================================

-- Allow all users to view all files
CREATE POLICY "Allow all users to view reimbursement files" ON reimbursement_files
    FOR SELECT USING (true);

-- Allow all users to insert files
CREATE POLICY "Allow all users to insert reimbursement files" ON reimbursement_files
    FOR INSERT WITH CHECK (true);

-- Allow all users to delete files
CREATE POLICY "Allow all users to delete reimbursement files" ON reimbursement_files
    FOR DELETE USING (true);

-- =====================================================
-- STORAGE POLICIES (Update for custom auth)
-- =====================================================

-- Drop existing storage policies
DROP POLICY IF EXISTS "Users can upload reimbursement receipts" ON storage.objects;
DROP POLICY IF EXISTS "Users can view own reimbursement receipts" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own reimbursement receipts" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own reimbursement receipts" ON storage.objects;
DROP POLICY IF EXISTS "Admins can view all reimbursement receipts" ON storage.objects;
DROP POLICY IF EXISTS "Admins can manage all reimbursement receipts" ON storage.objects;

-- Create new storage policies
CREATE POLICY "Allow all users to upload reimbursement receipts" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'reimbursement-receipts');

CREATE POLICY "Allow all users to view reimbursement receipts" ON storage.objects
    FOR SELECT USING (bucket_id = 'reimbursement-receipts');

CREATE POLICY "Allow all users to update reimbursement receipts" ON storage.objects
    FOR UPDATE USING (bucket_id = 'reimbursement-receipts');

CREATE POLICY "Allow all users to delete reimbursement receipts" ON storage.objects
    FOR DELETE USING (bucket_id = 'reimbursement-receipts');

-- =====================================================
-- MIGRATION COMPLETE
-- ===================================================== 