-- =====================================================
-- REIMBURSEMENT SYSTEM MIGRATION
-- =====================================================

-- Enable UUID extension if not exists
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 1. CREATE TABLES
-- =====================================================

-- Tabel utama reimbursement requests
CREATE TABLE IF NOT EXISTS reimbursement_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    total_amount DECIMAL(12,2) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'paid')),
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE,
    processed_by UUID REFERENCES auth.users(id),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabel detail item pengeluaran
CREATE TABLE IF NOT EXISTS reimbursement_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    request_id UUID NOT NULL REFERENCES reimbursement_requests(id) ON DELETE CASCADE,
    description VARCHAR(500) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    category VARCHAR(100) NOT NULL,
    date DATE NOT NULL,
    receipt_file_path VARCHAR(500),
    receipt_file_name VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabel untuk tracking file uploads
CREATE TABLE IF NOT EXISTS reimbursement_files (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    request_id UUID NOT NULL REFERENCES reimbursement_requests(id) ON DELETE CASCADE,
    item_id UUID REFERENCES reimbursement_items(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type VARCHAR(100),
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 2. CREATE INDEXES
-- =====================================================

-- Index untuk performance
CREATE INDEX IF NOT EXISTS idx_reimbursement_requests_user_id ON reimbursement_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_reimbursement_requests_status ON reimbursement_requests(status);
CREATE INDEX IF NOT EXISTS idx_reimbursement_requests_submitted_at ON reimbursement_requests(submitted_at);
CREATE INDEX IF NOT EXISTS idx_reimbursement_items_request_id ON reimbursement_items(request_id);
CREATE INDEX IF NOT EXISTS idx_reimbursement_files_request_id ON reimbursement_files(request_id);

-- =====================================================
-- 3. CREATE STORAGE BUCKET
-- =====================================================

-- Buat storage bucket untuk bukti kwitansi
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'reimbursement-receipts',
    'reimbursement-receipts',
    false,
    10485760, -- 10MB limit
    ARRAY['image/jpeg', 'image/png', 'image/gif', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
) ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 4. CREATE ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE reimbursement_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE reimbursement_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE reimbursement_files ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- REIMBURSEMENT_REQUESTS POLICIES
-- =====================================================

-- Policy: Users can view their own requests
CREATE POLICY "Users can view own reimbursement requests" ON reimbursement_requests
    FOR SELECT USING (auth.uid() = user_id);

-- Policy: Users can insert their own requests
CREATE POLICY "Users can insert own reimbursement requests" ON reimbursement_requests
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own pending requests
CREATE POLICY "Users can update own pending requests" ON reimbursement_requests
    FOR UPDATE USING (auth.uid() = user_id AND status = 'pending');

-- Policy: Admins can view all requests
CREATE POLICY "Admins can view all reimbursement requests" ON reimbursement_requests
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'admin'
        )
    );

-- Policy: Admins can update all requests
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

-- Policy: Users can view items from their own requests
CREATE POLICY "Users can view own reimbursement items" ON reimbursement_items
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM reimbursement_requests 
            WHERE reimbursement_requests.id = reimbursement_items.request_id 
            AND reimbursement_requests.user_id = auth.uid()
        )
    );

-- Policy: Users can insert items to their own requests
CREATE POLICY "Users can insert own reimbursement items" ON reimbursement_items
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM reimbursement_requests 
            WHERE reimbursement_requests.id = reimbursement_items.request_id 
            AND reimbursement_requests.user_id = auth.uid()
            AND reimbursement_requests.status = 'pending'
        )
    );

-- Policy: Users can update items from their own pending requests
CREATE POLICY "Users can update own pending reimbursement items" ON reimbursement_items
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM reimbursement_requests 
            WHERE reimbursement_requests.id = reimbursement_items.request_id 
            AND reimbursement_requests.user_id = auth.uid()
            AND reimbursement_requests.status = 'pending'
        )
    );

-- Policy: Users can delete items from their own pending requests
CREATE POLICY "Users can delete own pending reimbursement items" ON reimbursement_items
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM reimbursement_requests 
            WHERE reimbursement_requests.id = reimbursement_items.request_id 
            AND reimbursement_requests.user_id = auth.uid()
            AND reimbursement_requests.status = 'pending'
        )
    );

-- Policy: Admins can view all items
CREATE POLICY "Admins can view all reimbursement items" ON reimbursement_items
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'admin'
        )
    );

-- Policy: Admins can manage all items
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

-- Policy: Users can view files from their own requests
CREATE POLICY "Users can view own reimbursement files" ON reimbursement_files
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM reimbursement_requests 
            WHERE reimbursement_requests.id = reimbursement_files.request_id 
            AND reimbursement_requests.user_id = auth.uid()
        )
    );

-- Policy: Users can insert files to their own requests
CREATE POLICY "Users can insert own reimbursement files" ON reimbursement_files
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM reimbursement_requests 
            WHERE reimbursement_requests.id = reimbursement_files.request_id 
            AND reimbursement_requests.user_id = auth.uid()
            AND reimbursement_requests.status = 'pending'
        )
    );

-- Policy: Users can delete files from their own pending requests
CREATE POLICY "Users can delete own pending reimbursement files" ON reimbursement_files
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM reimbursement_requests 
            WHERE reimbursement_requests.id = reimbursement_files.request_id 
            AND reimbursement_requests.user_id = auth.uid()
            AND reimbursement_requests.status = 'pending'
        )
    );

-- Policy: Admins can view all files
CREATE POLICY "Admins can view all reimbursement files" ON reimbursement_files
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'admin'
        )
    );

-- Policy: Admins can manage all files
CREATE POLICY "Admins can manage all reimbursement files" ON reimbursement_files
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'admin'
        )
    );

-- =====================================================
-- STORAGE POLICIES
-- =====================================================

-- Policy: Users can upload files to their own folder
CREATE POLICY "Users can upload reimbursement receipts" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'reimbursement-receipts' 
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

-- Policy: Users can view their own files
CREATE POLICY "Users can view own reimbursement receipts" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'reimbursement-receipts' 
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

-- Policy: Users can update their own files
CREATE POLICY "Users can update own reimbursement receipts" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'reimbursement-receipts' 
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

-- Policy: Users can delete their own files
CREATE POLICY "Users can delete own reimbursement receipts" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'reimbursement-receipts' 
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

-- Policy: Admins can view all files
CREATE POLICY "Admins can view all reimbursement receipts" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'reimbursement-receipts' 
        AND EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'admin'
        )
    );

-- Policy: Admins can manage all files
CREATE POLICY "Admins can manage all reimbursement receipts" ON storage.objects
    FOR ALL USING (
        bucket_id = 'reimbursement-receipts' 
        AND EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'admin'
        )
    );

-- =====================================================
-- 5. CREATE FUNCTIONS
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to auto-update updated_at
CREATE TRIGGER update_reimbursement_requests_updated_at 
    BEFORE UPDATE ON reimbursement_requests 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to calculate total amount
CREATE OR REPLACE FUNCTION calculate_reimbursement_total(request_uuid UUID)
RETURNS DECIMAL(12,2) AS $$
BEGIN
    RETURN COALESCE(
        (SELECT SUM(amount) FROM reimbursement_items WHERE request_id = request_uuid),
        0
    );
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 6. CREATE VIEWS FOR EASY QUERYING
-- =====================================================

-- View untuk data reimbursement lengkap
CREATE OR REPLACE VIEW reimbursement_requests_with_details AS
SELECT 
    rr.*,
    u.nama as user_name,
    u.jabatan as user_jabatan,
    COUNT(ri.id) as item_count,
    ARRAY_AGG(
        DISTINCT rf.file_path
    ) FILTER (WHERE rf.file_path IS NOT NULL) as receipt_files
FROM reimbursement_requests rr
LEFT JOIN users u ON rr.user_id = u.id
LEFT JOIN reimbursement_items ri ON rr.id = ri.request_id
LEFT JOIN reimbursement_files rf ON rr.id = rf.request_id
GROUP BY rr.id, u.nama, u.jabatan;

-- =====================================================
-- 7. INSERT SAMPLE DATA (Optional)
-- =====================================================

-- Uncomment jika ingin insert sample data untuk testing
/*
INSERT INTO reimbursement_requests (user_id, title, description, total_amount, status)
VALUES 
    ('user-uuid-1', 'Pengeluaran Transportasi Meeting', 'Biaya transportasi untuk meeting dengan klien', 150000, 'pending'),
    ('user-uuid-2', 'Biaya Alat Kantor', 'Pembelian alat tulis dan perlengkapan kantor', 75000, 'approved');

INSERT INTO reimbursement_items (request_id, description, amount, category, date)
VALUES 
    ('request-uuid-1', 'Grab Car ke lokasi meeting', 50000, 'Transportasi', '2025-01-15'),
    ('request-uuid-1', 'Makan siang', 100000, 'Makan & Minuman', '2025-01-15'),
    ('request-uuid-2', 'Pulpen dan kertas', 25000, 'Alat Kantor', '2025-01-14'),
    ('request-uuid-2', 'Stapler dan staples', 50000, 'Alat Kantor', '2025-01-14');
*/

-- =====================================================
-- MIGRATION COMPLETE
-- ===================================================== 