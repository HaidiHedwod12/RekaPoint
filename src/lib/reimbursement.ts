import { supabase, supabaseAdmin } from './supabase';
import { User } from '../types';

// =====================================================
// UTILITY FUNCTIONS
// =====================================================

// Generate a valid UUID v4
const generateUUID = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

// Ensure user ID is a valid UUID
const ensureValidUUID = (userId: string): string => {
  // Check if it's already a valid UUID
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(userId)) {
    return userId;
  }
  
  // If not valid UUID, generate a new one based on the user ID
  // This is a simple hash-based approach
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    const char = userId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  // Convert hash to UUID format
  const hashHex = Math.abs(hash).toString(16).padStart(8, '0');
  return `${hashHex}-0000-4000-8000-${hashHex}00000000`;
};

// =====================================================
// TYPES
// =====================================================

export interface ReimbursementItem {
  id: string;
  request_id: string;
  description: string;
  amount: number;
  category: string;
  date: string;
  receipt_file_path?: string;
  receipt_file_name?: string;
  created_at: string;
}

export interface ReimbursementFile {
  id: string;
  request_id: string;
  item_id?: string;
  file_name: string;
  file_path: string;
  file_size: number;
  mime_type?: string;
  uploaded_at: string;
}

export interface ReimbursementRequest {
  id: string;
  user_id: string;
  title: string;
  subjudul: string;
  tanggal: string;
  description: string;
  total_amount: number;
  status: 'pending' | 'approved' | 'rejected' | 'paid';
  submitted_at: string;
  processed_at?: string;
  processed_by?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  // Joined data
  user_name?: string;
  user_jabatan?: string;
  items?: ReimbursementItem[];
  files?: ReimbursementFile[];
}

export interface CreateReimbursementRequest {
  title: string;
  subjudul: string;
  tanggal: string;
  description: string;
  items: Omit<ReimbursementItem, 'id' | 'request_id' | 'created_at'>[];
}

export interface UpdateReimbursementRequest {
  status: 'approved' | 'rejected' | 'paid';
  notes?: string;
}

// =====================================================
// REIMBURSEMENT REQUESTS
// =====================================================

export const createReimbursementRequest = async (
  request: CreateReimbursementRequest,
  user: User
): Promise<ReimbursementRequest> => {
  try {
    console.log('Creating reimbursement request for user:', user.id);
    console.log('User data:', user);
    
    // Use user ID directly - it should already be a valid UUID from database
    console.log('Using user ID from auth:', user.id);
    console.log('User details:', user);
    
    // Calculate total amount
    const totalAmount = request.items.reduce((sum, item) => sum + item.amount, 0);

    // Insert reimbursement request
    const { data: reimbursementData, error: reimbursementError } = await supabase
      .from('reimbursement_requests')
      .insert({
        user_id: user.id,
        title: request.title,
        subjudul: request.subjudul,
        tanggal: request.tanggal,
        description: request.description,
        total_amount: totalAmount,
        status: 'pending'
      })
      .select()
      .single();

    if (reimbursementError) {
      console.error('Database error:', reimbursementError);
      throw reimbursementError;
    }

    // Insert items
    const itemsWithRequestId = request.items.map(item => ({
      ...item,
      request_id: reimbursementData.id
    }));

    const { error: itemsError } = await supabase
      .from('reimbursement_items')
      .insert(itemsWithRequestId);

    if (itemsError) throw itemsError;

    // Return the created request with items
    return await getReimbursementRequestById(reimbursementData.id);
  } catch (error) {
    console.error('Error creating reimbursement request:', error);
    throw error;
  }
};

export const getReimbursementRequestsByUser = async (
  userId: string
): Promise<ReimbursementRequest[]> => {
  try {
    console.log('Fetching reimbursement requests for user:', userId);
    
    // Ensure user ID is a valid UUID
    const validUserId = ensureValidUUID(userId);
    console.log('Using valid UUID for user:', validUserId);
    
    const { data, error } = await supabase
      .from('reimbursement_requests')
      .select(`
        *,
        items:reimbursement_items(*),
        files:reimbursement_files(*)
      `)
      .eq('user_id', validUserId)
      .order('submitted_at', { ascending: false });

    if (error) {
      console.error('Database error:', error);
      throw error;
    }
    
    console.log('Fetched data:', data);
    return data || [];
  } catch (error) {
    console.error('Error fetching reimbursement requests:', error);
    throw error;
  }
};

export const getAllReimbursementRequests = async (): Promise<ReimbursementRequest[]> => {
  try {
    console.log('Fetching all reimbursement requests...');
    // Ganti query ke view agar dapat user_name dan user_jabatan
    const { data, error } = await supabase
      .from('reimbursement_requests_with_details')
      .select(`
        *,
        items:reimbursement_items(*),
        files:reimbursement_files(*)
      `)
      .order('submitted_at', { ascending: false });

    if (error) {
      console.error('Database error:', error);
      throw error;
    }
    
    console.log('Fetched reimbursement requests:', data);
    return data || [];
  } catch (error) {
    console.error('Error fetching all reimbursement requests:', error);
    throw error;
  }
};

export const getReimbursementRequestById = async (
  requestId: string
): Promise<ReimbursementRequest> => {
  try {
    const { data, error } = await supabase
      .from('reimbursement_requests')
      .select(`
        *,
        items:reimbursement_items(*),
        files:reimbursement_files(*)
      `)
      .eq('id', requestId)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching reimbursement request:', error);
    throw error;
  }
};

export const updateReimbursementRequest = async (
  requestId: string,
  update: UpdateReimbursementRequest,
  adminUser: User
): Promise<ReimbursementRequest> => {
  try {
    const { data, error } = await supabase
      .from('reimbursement_requests')
      .update({
        status: update.status,
        notes: update.notes,
        processed_at: new Date().toISOString(),
        processed_by: adminUser.id
      })
      .eq('id', requestId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating reimbursement request:', error);
    throw error;
  }
};

export const updateReimbursementRequestByUser = async (
  requestId: string,
  update: {
    title: string;
    subjudul: string;
    tanggal: string;
    description: string;
    items: Omit<ReimbursementItem, 'id' | 'request_id' | 'created_at'>[];
  },
  user: User
): Promise<ReimbursementRequest> => {
  try {
    console.log('Updating reimbursement request:', requestId, update);
    console.log('User:', user);
    
    // Calculate total amount
    const totalAmount = update.items.reduce((sum, item) => sum + item.amount, 0);
    console.log('Total amount:', totalAmount);

    // Update reimbursement request
    const { data: reimbursementData, error: reimbursementError } = await supabaseAdmin
      .from('reimbursement_requests')
      .update({
        title: update.title,
        subjudul: update.subjudul,
        tanggal: update.tanggal,
        description: update.description,
        total_amount: totalAmount,
        updated_at: new Date().toISOString()
      })
      .eq('id', requestId)
      .eq('user_id', user.id) // Only allow user to update their own request
      .eq('status', 'pending') // Only allow update if still pending
      .select()
      .single();

    if (reimbursementError) {
      console.error('Database error updating request:', reimbursementError);
      console.error('Error details:', {
        code: reimbursementError.code,
        message: reimbursementError.message,
        details: reimbursementError.details,
        hint: reimbursementError.hint
      });
      throw reimbursementError;
    }

    console.log('Request updated successfully:', reimbursementData);

    // Delete existing items
    const { error: deleteItemsError } = await supabaseAdmin
      .from('reimbursement_items')
      .delete()
      .eq('request_id', requestId);

    if (deleteItemsError) {
      console.error('Database error deleting items:', deleteItemsError);
      console.error('Delete error details:', {
        code: deleteItemsError.code,
        message: deleteItemsError.message,
        details: deleteItemsError.details,
        hint: deleteItemsError.hint
      });
      throw deleteItemsError;
    }

    console.log('Existing items deleted successfully');

    // Insert new items - hanya field yang ada di schema
    const itemsWithRequestId = update.items.map(item => ({
      request_id: requestId,
      description: item.description,
      amount: item.amount,
      category: item.category,
      date: item.date,
      receipt_file_path: item.receipt_file_path || null,
      receipt_file_name: item.receipt_file_name || null
    }));

    console.log('Inserting items:', itemsWithRequestId);

    const { data: insertedItems, error: itemsError } = await supabaseAdmin
      .from('reimbursement_items')
      .insert(itemsWithRequestId)
      .select();

    if (itemsError) {
      console.error('Database error inserting items:', itemsError);
      console.error('Insert error details:', {
        code: itemsError.code,
        message: itemsError.message,
        details: itemsError.details,
        hint: itemsError.hint
      });
      throw itemsError;
    }

    console.log('Items inserted successfully:', insertedItems);

    // Return the updated request with items
    return await getReimbursementRequestById(requestId);
  } catch (error) {
    console.error('Error updating reimbursement request:', error);
    throw error;
  }
};

export const deleteReimbursementRequest = async (
  requestId: string
): Promise<void> => {
  try {
    const { error } = await supabase
      .from('reimbursement_requests')
      .delete()
      .eq('id', requestId);

    if (error) throw error;
  } catch (error) {
    console.error('Error deleting reimbursement request:', error);
    throw error;
  }
};

// =====================================================
// REIMBURSEMENT ITEMS
// =====================================================

export const addReimbursementItem = async (
  requestId: string,
  item: Omit<ReimbursementItem, 'id' | 'request_id' | 'created_at'>
): Promise<ReimbursementItem> => {
  try {
    const { data, error } = await supabase
      .from('reimbursement_items')
      .insert({
        ...item,
        request_id: requestId
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error adding reimbursement item:', error);
    throw error;
  }
};

export const updateReimbursementItem = async (
  itemId: string,
  updates: Partial<ReimbursementItem>
): Promise<ReimbursementItem> => {
  try {
    const { data, error } = await supabase
      .from('reimbursement_items')
      .update(updates)
      .eq('id', itemId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating reimbursement item:', error);
    throw error;
  }
};

export const deleteReimbursementItem = async (
  itemId: string
): Promise<void> => {
  try {
    const { error } = await supabase
      .from('reimbursement_items')
      .delete()
      .eq('id', itemId);

    if (error) throw error;
  } catch (error) {
    console.error('Error deleting reimbursement item:', error);
    throw error;
  }
};

// =====================================================
// FILE UPLOAD
// =====================================================

export const uploadReimbursementFile = async (
  file: File,
  requestId: string,
  userId: string,
  itemId?: string
): Promise<ReimbursementFile> => {
  try {
    // Generate unique filename
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `${userId}/${requestId}/${fileName}`;

    // Upload file to storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('reimbursement-receipts')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) throw uploadError;

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('reimbursement-receipts')
      .getPublicUrl(filePath);

    // Save file record to database
    const { data: fileRecord, error: dbError } = await supabase
      .from('reimbursement_files')
      .insert({
        request_id: requestId,
        item_id: itemId,
        file_name: file.name,
        file_path: filePath,
        file_size: file.size,
        mime_type: file.type
      })
      .select()
      .single();

    if (dbError) throw dbError;

    return {
      ...fileRecord,
      file_path: urlData.publicUrl
    };
  } catch (error) {
    console.error('Error uploading reimbursement file:', error);
    throw error;
  }
};

export const deleteReimbursementFile = async (
  fileId: string,
  filePath: string
): Promise<void> => {
  try {
    // Delete from storage
    const { error: storageError } = await supabase.storage
      .from('reimbursement-receipts')
      .remove([filePath]);

    if (storageError) throw storageError;

    // Delete from database
    const { error: dbError } = await supabase
      .from('reimbursement_files')
      .delete()
      .eq('id', fileId);

    if (dbError) throw dbError;
  } catch (error) {
    console.error('Error deleting reimbursement file:', error);
    throw error;
  }
};

export const getReimbursementFileUrl = (filePath: string): string => {
  const { data } = supabase.storage
    .from('reimbursement-receipts')
    .getPublicUrl(filePath);
  
  return data.publicUrl;
};

// =====================================================
// STATISTICS
// =====================================================

export const getReimbursementStats = async (userId?: string) => {
  try {
    let query = supabase
      .from('reimbursement_requests')
      .select('status, total_amount');

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query;

    if (error) throw error;

    const stats = {
      total: data.length,
      pending: data.filter((r: any) => r.status === 'pending').length,
      approved: data.filter((r: any) => r.status === 'approved').length,
      rejected: data.filter((r: any) => r.status === 'rejected').length,
      paid: data.filter((r: any) => r.status === 'paid').length,
      totalAmount: data.reduce((sum: number, r: any) => sum + r.total_amount, 0)
    };

    return stats;
  } catch (error) {
    console.error('Error fetching reimbursement stats:', error);
    throw error;
  }
};

// Statistik reimbursement untuk bulan & tahun tertentu
export const getReimbursementStatsByMonthYear = async (month: number, year: number) => {
  try {
    // Hitung range tanggal
    const startDate = new Date(year, month - 1, 1).toISOString().split('T')[0];
    const endDate = new Date(year, month, 0).toISOString().split('T')[0];
    const { data, error } = await supabase
      .from('reimbursement_requests')
      .select('total_amount')
      .gte('submitted_at', startDate)
      .lte('submitted_at', endDate);
    if (error) throw error;
    const totalAmount = (data || []).reduce((sum: number, r: any) => sum + (r.total_amount || 0), 0);
    return totalAmount;
  } catch (error) {
    console.error('Error fetching reimbursement stats by month/year:', error);
    throw error;
  }
};

// Statistik reimbursement untuk tahun tertentu
export const getReimbursementStatsByYear = async (year: number) => {
  try {
    const startDate = new Date(year, 0, 1).toISOString().split('T')[0];
    const endDate = new Date(year, 11, 31).toISOString().split('T')[0];
    const { data, error } = await supabase
      .from('reimbursement_requests')
      .select('total_amount')
      .gte('submitted_at', startDate)
      .lte('submitted_at', endDate);
    if (error) throw error;
    const totalAmount = (data || []).reduce((sum: number, r: any) => sum + (r.total_amount || 0), 0);
    return totalAmount;
  } catch (error) {
    console.error('Error fetching reimbursement stats by year:', error);
    throw error;
  }
};

// =====================================================
// REALTIME SUBSCRIPTIONS
// =====================================================

export const subscribeToReimbursementRequests = (
  userId: string,
  callback: (payload: any) => void
) => {
  return supabase
    .channel('reimbursement_requests')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'reimbursement_requests',
        filter: `user_id=eq.${userId}`
      },
      callback
    )
    .subscribe();
};

export const subscribeToAllReimbursementRequests = (
  callback: (payload: any) => void
) => {
  return supabase
    .channel('all_reimbursement_requests')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'reimbursement_requests'
      },
      callback
    )
    .subscribe();
}; 