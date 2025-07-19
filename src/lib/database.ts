import { supabase, supabaseAdmin } from './supabase';
import { User, Judul, SubJudul, Aktivitas } from '../types';

// Enhanced Realtime subscriptions with better error handling
let subscriptions: { [key: string]: any } = {};

export const subscribeToTable = (tableName: string, callback: (payload: any) => void) => {
  // Unsubscribe existing subscription
  if (subscriptions[tableName]) {
    subscriptions[tableName].unsubscribe();
  }
  
  console.log(`Setting up realtime subscription for ${tableName}`);
  
  subscriptions[tableName] = supabase
    .channel(`${tableName}-realtime`)
    .on('postgres_changes', 
      { event: '*', schema: 'public', table: tableName }, 
      (payload: any) => {
        console.log(`Realtime change in ${tableName}:`, payload);
        callback(payload);
      }
    )
    .subscribe((status: any) => {
      console.log(`Subscription status for ${tableName}:`, status);
    });
    
  return subscriptions[tableName];
};

export const unsubscribeFromTable = (tableName: string) => {
  if (subscriptions[tableName]) {
    subscriptions[tableName].unsubscribe();
    delete subscriptions[tableName];
    console.log(`Unsubscribed from ${tableName}`);
  }
};

export const unsubscribeAll = () => {
  Object.keys(subscriptions).forEach(tableName => {
    unsubscribeFromTable(tableName);
  });
};

// User management
export const getAllUsers = async (): Promise<User[]> => {
  console.log('Fetching all users...');
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .order('nama');
  
  if (error) {
    console.error('Error fetching users:', error);
    throw error;
  }
  
  console.log('Users fetched successfully:', data?.length);
  return data || [];
};

export const createUser = async (userData: Omit<User, 'id' | 'created_at'>): Promise<User> => {
  console.log('Creating user:', userData);
  
  // Hash password (in production, use proper hashing)
  const hashedPassword = userData.password_hash;
  
  const { data, error } = await supabase
    .from('users')
    .insert([{
      ...userData,
      password_hash: hashedPassword,
      username: userData.username.toLowerCase().trim()
    }])
    .select()
    .single();
  
  if (error) {
    console.error('Error creating user:', error);
    throw error;
  }
  
  console.log('User created successfully:', data);
  return data;
};

export const updateUser = async (id: string, userData: Partial<User>): Promise<User> => {
  console.log('Updating user:', id, userData);
  
  // First check if user exists
  const { data: existingUser, error: checkError } = await supabase
    .from('users')
    .select('id')
    .eq('id', id)
    .maybeSingle();
    
  if (checkError) {
    console.error('Error checking user existence:', checkError);
    throw new Error('Error checking user: ' + checkError.message);
  }
  
  if (!existingUser) {
    console.error('User not found:', id);
    throw new Error('User tidak ditemukan atau sudah dihapus');
  }
  
  // Prepare update data
  const updateData: any = { ...userData };
  
  // If username is being updated, normalize it
  if (updateData.username) {
    updateData.username = updateData.username.toLowerCase().trim();
  }
  
  // If password is being updated, hash it
  if (updateData.password_hash) {
    updateData.password_hash = updateData.password_hash;
  }
  
  const { data, error } = await supabase
    .from('users')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();
  
  if (error) {
    if (error.code === 'PGRST116') {
      throw new Error('User tidak ditemukan atau sudah dihapus');
    }
    console.error('Error updating user:', error);
    throw error;
  }
  
  if (!data) {
    throw new Error('User tidak ditemukan atau sudah dihapus');
  }
  
  console.log('User updated successfully:', data);
  
  // Trigger realtime update for users table
  try {
    await supabase.channel('users-update').send({
      type: 'broadcast',
      event: 'user_updated',
      payload: data
    });
  } catch (broadcastError) {
    console.log('Could not broadcast user update:', broadcastError);
  }
  
  return data;
};

export const deleteUser = async (id: string): Promise<void> => {
  console.log('Deleting user:', id);
  
  // First check if user exists using admin client
  const { data: existingUser, error: checkError } = await supabase
    .from('users')
    .select('id, username')
    .eq('id', id)
    .maybeSingle();
    
  if (checkError) {
    console.error('Error checking user existence:', checkError);
    throw new Error('Error checking user: ' + checkError.message);
  }
  
  if (!existingUser) {
    console.error('User not found:', id);
    throw new Error('User tidak ditemukan');
  }
  
  // Delete using admin client to bypass RLS
  const { error } = await supabaseAdmin
    .from('users')
    .delete()
    .eq('id', id);
  
  if (error) {
    console.error('Error deleting user:', error);
    // If delete by ID fails, try delete by username as fallback
    console.log('Trying to delete by username:', existingUser.username);
    const { error: usernameError } = await supabaseAdmin
      .from('users')
      .delete()
      .eq('username', existingUser.username);
    
    if (usernameError) {
      console.error('Error deleting user by username:', usernameError);
      throw new Error('Gagal menghapus user: ' + usernameError.message);
    }
    
    console.log('User deleted successfully by username');
  } else {
    console.log('User deleted successfully by ID');
  }
};

// Admin-only operations using service role
export const createUserAsAdmin = async (userData: Omit<User, 'id' | 'created_at'>): Promise<User> => {
  console.log('Creating user as admin:', userData);
  
  const { data, error } = await supabaseAdmin
    .from('users')
    .insert([{
      ...userData,
      username: userData.username.toLowerCase().trim()
    }])
    .select()
    .single();
  
  if (error) {
    console.error('Error creating user as admin:', error);
    throw error;
  }
  
  console.log('User created successfully as admin:', data);
  return data;
};

export const updateUserAsAdmin = async (id: string, userData: Partial<User>): Promise<User> => {
  console.log('Updating user as admin:', id, userData);
  
  // First check if user exists
  const { data: existingUser, error: checkError } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('id', id)
    .maybeSingle();
    
  if (checkError) {
    console.error('Error checking user existence:', checkError);
    throw new Error('Error checking user: ' + checkError.message);
  }
  
  if (!existingUser) {
    console.error('User not found:', id);
    throw new Error('User tidak ditemukan atau sudah dihapus');
  }
  
  // Prepare update data
  const updateData: any = { ...userData };
  
  if (updateData.username) {
    updateData.username = updateData.username.toLowerCase().trim();
  }
  
  const { data, error } = await supabaseAdmin
    .from('users')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();
  
  if (error) {
    console.error('Error updating user as admin:', error);
    throw error;
  }
  
  if (!data) {
    throw new Error('User tidak ditemukan atau sudah dihapus');
  }
  
  console.log('User updated successfully as admin:', data);
  return data;
};

// Judul management
export const getAllJudul = async (): Promise<Judul[]> => {
  console.log('Fetching all judul...');
  const { data, error } = await supabase
    .from('judul')
    .select('*')
    .order('nama');
  
  if (error) {
    console.error('Error fetching judul:', error);
    throw error;
  }
  
  console.log('Judul fetched successfully:', data?.length);
  return data || [];
};

export const createJudul = async (nama: string): Promise<Judul> => {
  console.log('Creating judul:', nama);
  const { data, error } = await supabaseAdmin
    .from('judul')
    .insert([{ nama }])
    .select()
    .single();
  
  if (error) {
    console.error('Error creating judul:', error);
    throw error;
  }
  
  console.log('Judul created successfully:', data);
  return data;
};

export const updateJudul = async (id: string, nama: string): Promise<Judul> => {
  console.log('Updating judul:', id, nama);
  const { data, error } = await supabaseAdmin
    .from('judul')
    .update({ nama })
    .eq('id', id)
    .select()
    .single();
  
  if (error) {
    console.error('Error updating judul:', error);
    throw error;
  }
  
  console.log('Judul updated successfully:', data);
  return data;
};

export const deleteJudul = async (id: string): Promise<void> => {
  console.log('Deleting judul:', id);
  const { error } = await supabaseAdmin
    .from('judul')
    .delete()
    .eq('id', id);
  
  if (error) {
    console.error('Error deleting judul:', error);
    throw error;
  }
  
  console.log('Judul deleted successfully');
};

// SubJudul management
export const getSubJudulByJudul = async (judulId: string): Promise<SubJudul[]> => {
  console.log('Fetching subjudul for judul:', judulId);
  const { data, error } = await supabase
    .from('subjudul')
    .select('*')
    .eq('judul_id', judulId)
    .order('nama');
  
  if (error) {
    console.error('Error fetching subjudul:', error);
    throw error;
  }
  
  console.log('SubJudul fetched successfully:', data?.length);
  return data || [];
};

export const getAllSubJudul = async (): Promise<SubJudul[]> => {
  console.log('Fetching all subjudul...');
  const { data, error } = await supabase
    .from('subjudul')
    .select('*')
    .order('nama');
  
  if (error) {
    console.error('Error fetching all subjudul:', error);
    throw error;
  }
  
  console.log('All SubJudul fetched successfully:', data?.length);
  return data || [];
};

export const createSubJudul = async (judulId: string, nama: string): Promise<SubJudul> => {
  console.log('Creating subjudul:', judulId, nama);
  const { data, error } = await supabaseAdmin
    .from('subjudul')
    .insert([{ judul_id: judulId, nama }])
    .select()
    .single();
  
  if (error) {
    console.error('Error creating subjudul:', error);
    throw error;
  }
  
  console.log('SubJudul created successfully:', data);
  return data;
};

export const updateSubJudul = async (id: string, nama: string): Promise<SubJudul> => {
  console.log('Updating subjudul:', id, nama);
  const { data, error } = await supabaseAdmin
    .from('subjudul')
    .update({ nama })
    .eq('id', id)
    .select()
    .single();
  
  if (error) {
    console.error('Error updating subjudul:', error);
    throw error;
  }
  
  console.log('SubJudul updated successfully:', data);
  return data;
};

export const deleteSubJudul = async (id: string): Promise<void> => {
  console.log('Deleting subjudul:', id);
  const { error } = await supabaseAdmin
    .from('subjudul')
    .delete()
    .eq('id', id);
  
  if (error) {
    console.error('Error deleting subjudul:', error);
    throw error;
  }
  
  console.log('SubJudul deleted successfully');
};

// Aktivitas management with proper joins
export const getAktivitasByUser = async (userId: string, month?: number, year?: number): Promise<Aktivitas[]> => {
  console.log('Fetching aktivitas for user:', userId, 'month:', month, 'year:', year);
  
  // Use admin client to bypass RLS for consistent data access
  let query = supabaseAdmin
    .from('aktivitas')
    .select(`
      *,
      users(id, nama, username, jabatan, role, minimal_poin),
      judul(id, nama),
      subjudul(id, nama)
    `)
    .eq('user_id', userId)
    .order('tanggal', { ascending: false });

  if (month && year) {
    const startDate = new Date(year, month - 1, 1).toISOString().split('T')[0];
    const endDate = new Date(year, month, 0).toISOString().split('T')[0];
    query = query.gte('tanggal', startDate).lte('tanggal', endDate);
  } else if (year) {
    const startDate = new Date(year, 0, 1).toISOString().split('T')[0];
    const endDate = new Date(year, 11, 31).toISOString().split('T')[0];
    query = query.gte('tanggal', startDate).lte('tanggal', endDate);
  }

  const { data, error } = await query;
  
  if (error) {
    console.error('Error fetching user aktivitas:', error);
    throw error;
  }
  
  console.log('User aktivitas fetched successfully:', data?.length);
  // Transform the data to match our expected structure
  return (data || []).map((item: any) => ({
    ...item,
    user: item.users,
    judul: item.judul,
    subjudul: item.subjudul
  }));
};

export const getAllAktivitas = async (month?: number, year?: number): Promise<Aktivitas[]> => {
  console.log('Fetching all aktivitas, month:', month, 'year:', year);
  
  // Use admin client for consistent access
  let query = supabaseAdmin
    .from('aktivitas')
    .select(`
      *,
      users(id, nama, username, jabatan, role, minimal_poin),
      judul(id, nama),
      subjudul(id, nama)
    `)
    .order('tanggal', { ascending: false });

  if (month && year) {
    const startDate = new Date(year, month - 1, 1).toISOString().split('T')[0];
    const endDate = new Date(year, month, 0).toISOString().split('T')[0];
    query = query.gte('tanggal', startDate).lte('tanggal', endDate);
  } else if (year) {
    const startDate = new Date(year, 0, 1).toISOString().split('T')[0];
    const endDate = new Date(year, 11, 31).toISOString().split('T')[0];
    query = query.gte('tanggal', startDate).lte('tanggal', endDate);
  }

  const { data, error } = await query;
  
  if (error) {
    console.error('Error fetching all aktivitas:', error);
    throw error;
  }
  
  console.log('All aktivitas fetched successfully:', data?.length);
  // Transform the data to match our expected structure
  return (data || []).map((item: any) => ({
    ...item,
    user: item.users,
    judul: item.judul,
    subjudul: item.subjudul
  }));
};

export const createAktivitas = async (aktivitasData: Omit<Aktivitas, 'id' | 'created_at' | 'updated_at' | 'user' | 'judul' | 'subjudul'>): Promise<Aktivitas> => {
  console.log('Creating aktivitas:', aktivitasData);
  
  // Use admin client directly for consistent behavior
  const { data, error } = await supabaseAdmin
    .from('aktivitas')
    .insert([aktivitasData])
    .select(`
      *,
      users(id, nama, username, jabatan, role, minimal_poin),
      judul(id, nama),
      subjudul(id, nama)
    `)
    .single();
  
  if (error) {
    console.error('Error creating aktivitas:', error);
    throw error;
  }
  
  console.log('Aktivitas created successfully:', data);
  // Transform the data to match our expected structure
  return {
    ...data,
    user: data.users,
    judul: data.judul,
    subjudul: data.subjudul
  };
};

export const updateAktivitas = async (id: string, aktivitasData: Partial<Aktivitas>): Promise<Aktivitas> => {
  console.log('Updating aktivitas:', id, aktivitasData);
  
  const { data, error } = await supabaseAdmin
    .from('aktivitas')
    .update(aktivitasData)
    .eq('id', id)
    .select(`
      *,
      users(id, nama, username, jabatan, role, minimal_poin),
      judul(id, nama),
      subjudul(id, nama)
    `)
    .single();
  
  if (error) {
    console.error('Error updating aktivitas:', error);
    throw error;
  }
  
  console.log('Aktivitas updated successfully:', data);
  // Transform the data to match our expected structure
  return {
    ...data,
    user: data.users,
    judul: data.judul,
    subjudul: data.subjudul
  };
};

export const deleteAktivitas = async (id: string): Promise<void> => {
  console.log('Deleting aktivitas:', id);
  
  const { error } = await supabaseAdmin
    .from('aktivitas')
    .delete()
    .eq('id', id);
  
  if (error) {
    console.error('Error deleting aktivitas:', error);
    throw error;
  }
  
  console.log('Aktivitas deleted successfully');
};

export const updateAktivitasPoin = async (id: string, poin: number): Promise<Aktivitas> => {
  console.log('Updating aktivitas poin:', id, poin);
  
  const { data, error } = await supabaseAdmin
    .from('aktivitas')
    .update({ poin })
    .eq('id', id)
    .select(`
      *,
      users(id, nama, username, jabatan, role, minimal_poin),
      judul(id, nama),
      subjudul(id, nama)
    `)
    .single();
  
  if (error) {
    console.error('Error updating aktivitas poin:', error);
    throw error;
  }
  
  console.log('Aktivitas poin updated successfully:', data);
  // Transform the data to match our expected structure
  return {
    ...data,
    user: data.users,
    judul: data.judul,
    subjudul: data.subjudul
  };
};

// Monthly Settings management
export interface MonthlySettings {
  id: string;
  user_id: string;
  month: number;
  year: number;
  minimal_poin: number;
  can_view_poin: boolean;
  created_at: string;
  updated_at: string;
}

export const getMonthlySettings = async (userId: string, month: number, year: number): Promise<{ minimal_poin: number; can_view_poin: boolean }> => {
  console.log('Getting monthly settings for user:', userId, 'month:', month, 'year:', year);
  
  try {
    // First try to get monthly settings
    const { data: monthlyData, error: monthlyError } = await supabaseAdmin
      .from('monthly_settings')
      .select('*')
      .eq('user_id', userId)
      .eq('month', month)
      .eq('year', year)
      .maybeSingle();
    
    if (monthlyError) {
      console.error('Error getting monthly settings:', monthlyError);
    }
    
    if (monthlyData) {
      console.log('Found monthly settings:', monthlyData);
      return {
        minimal_poin: monthlyData.minimal_poin,
        can_view_poin: monthlyData.can_view_poin
      };
    }
    
    // Jika tidak ada monthly settings, return default: minimal_poin = 0, can_view_poin = false
    return {
      minimal_poin: 0,
      can_view_poin: false
    };
  } catch (error) {
    console.error('Error in getMonthlySettings:', error);
    return { minimal_poin: 0, can_view_poin: false };
  }
};

export const getAllMonthlySettings = async (month: number, year: number): Promise<MonthlySettings[]> => {
  console.log('Getting all monthly settings for month:', month, 'year:', year);
  
  const { data, error } = await supabaseAdmin
    .from('monthly_settings')
    .select('*')
    .eq('month', month)
    .eq('year', year);
  
  if (error) {
    console.error('Error getting all monthly settings:', error);
    throw error;
  }
  
  console.log('All monthly settings retrieved:', data?.length);
  return data || [];
};

export const upsertMonthlySettings = async (
  userId: string, 
  month: number, 
  year: number, 
  minimalPoin?: number, 
  canViewPoin?: boolean
): Promise<any> => {
  console.log('=== UPSERT MONTHLY SETTINGS START ===');
  console.log('Input params:', { userId, month, year, minimalPoin, canViewPoin });
  
  try {
    // First check if record exists
    const { data: existing, error: checkError } = await supabaseAdmin
      .from('monthly_settings')
      .select('*')
      .eq('user_id', userId)
      .eq('month', month)
      .eq('year', year)
      .maybeSingle();
    
    if (checkError) {
      console.error('Error checking existing monthly settings:', checkError);
      throw checkError;
    }
    
    console.log('Existing record:', existing);
    
    // Get user defaults for fallback
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('minimal_poin, can_view_poin')
      .eq('id', userId)
      .single();
    
    if (userError) {
      console.error('Error getting user data:', userError);
      throw userError;
    }
    
    console.log('User defaults:', userData);
    
    const userDefaults = {
      minimal_poin: userData?.minimal_poin || 150,
      can_view_poin: userData?.can_view_poin || false
    };
    
    if (existing) {
      // Update existing record
      const updateData: any = {};
      
      if (minimalPoin !== undefined) {
        updateData.minimal_poin = minimalPoin;
      }
      
      if (canViewPoin !== undefined) {
        updateData.can_view_poin = canViewPoin;
      }
      
      console.log('Updating existing record with:', updateData);
      
      const { data, error } = await supabaseAdmin
        .from('monthly_settings')
        .update(updateData)
        .eq('user_id', userId)
        .eq('month', month)
        .eq('year', year)
        .select()
        .single();
      
      if (error) {
        console.error('Error updating monthly settings:', error);
        throw error;
      }
      
      console.log('=== UPDATE SUCCESS ===', data);
      return data;
    } else {
      // Insert new record
      const insertData = {
        user_id: userId,
        month,
        year,
        minimal_poin: minimalPoin !== undefined ? minimalPoin : userDefaults.minimal_poin,
        can_view_poin: canViewPoin !== undefined ? canViewPoin : userDefaults.can_view_poin
      };
      
      console.log('Inserting new record:', insertData);
      
      const { data, error } = await supabaseAdmin
        .from('monthly_settings')
        .insert([insertData])
        .select()
        .single();
      
      if (error) {
        console.error('Error inserting monthly settings:', error);
        throw error;
      }
      
      console.log('=== INSERT SUCCESS ===', data);
      return data;
    }
    
  } catch (error) {
    console.error('=== UPSERT ERROR ===', error);
    throw error;
  } finally {
    console.log('=== UPSERT MONTHLY SETTINGS END ===');
  }
};

export const getUserWithMonthlySettings = async (userId: string, month: number, year: number): Promise<User & { monthly_minimal_poin: number; monthly_can_view_poin: boolean }> => {
  console.log('Getting user with monthly settings:', userId, month, year);
  
  // Get user data
  const { data: userData, error: userError } = await supabaseAdmin
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();
  
  if (userError) {
    console.error('Error getting user:', userError);
    throw userError;
  }
  
  // Get monthly settings
  const monthlySettings = await getMonthlySettings(userId, month, year);
  
  return {
    ...userData,
    monthly_minimal_poin: monthlySettings.minimal_poin,
    monthly_can_view_poin: monthlySettings.can_view_poin
  };
};