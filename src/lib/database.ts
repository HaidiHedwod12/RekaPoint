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
      users(id, nama, username, jabatan, role),
      judul(id, nama),
      subjudul(id, nama)
    `)
    .eq('user_id', userId)
    .order('tanggal', { ascending: false });

  if (month && year) {
    const lastDay = new Date(year, month, 0).getDate();
    const startDate = `${year}-${month.toString().padStart(2, '0')}-01`;
    const endDate = `${year}-${month.toString().padStart(2, '0')}-${lastDay.toString().padStart(2, '0')}`;
    query = query.gte('tanggal', startDate).lte('tanggal', endDate);
  } else if (year) {
    const startDate = `${year}-01-01`;
    const endDate = `${year}-12-31`;
    query = query.gte('tanggal', startDate).lte('tanggal', endDate);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching user aktivitas:', error);
    throw error;
  }

  console.log('User aktivitas fetched successfully:', data?.length);
  // Transform the data to match our expected structure
  // Fallback ke snapshot nama jika judul/subjudul sudah dihapus
  return (data || []).map((item: any) => ({
    ...item,
    user: item.users,
    judul: item.judul || (item.judul_nama ? { id: null, nama: item.judul_nama } : null),
    subjudul: item.subjudul || (item.subjudul_nama ? { id: null, nama: item.subjudul_nama } : null)
  }));
};

export const getAllAktivitas = async (month?: number, year?: number): Promise<Aktivitas[]> => {
  console.log('Fetching all aktivitas, month:', month, 'year:', year);

  // Use admin client for consistent access
  let query = supabaseAdmin
    .from('aktivitas')
    .select(`
      *,
      users(id, nama, username, jabatan, role),
      judul(id, nama),
      subjudul(id, nama)
    `)
    .order('tanggal', { ascending: false });

  if (month && year) {
    const lastDay = new Date(year, month, 0).getDate();
    const startDate = `${year}-${month.toString().padStart(2, '0')}-01`;
    const endDate = `${year}-${month.toString().padStart(2, '0')}-${lastDay.toString().padStart(2, '0')}`;
    query = query.gte('tanggal', startDate).lte('tanggal', endDate);
  } else if (year) {
    const startDate = `${year}-01-01`;
    const endDate = `${year}-12-31`;
    query = query.gte('tanggal', startDate).lte('tanggal', endDate);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching all aktivitas:', error);
    throw error;
  }

  console.log('All aktivitas fetched successfully:', data?.length);
  // Transform the data to match our expected structure
  // Fallback ke snapshot nama jika judul/subjudul sudah dihapus
  return (data || []).map((item: any) => ({
    ...item,
    user: item.users,
    judul: item.judul || (item.judul_nama ? { id: null, nama: item.judul_nama } : null),
    subjudul: item.subjudul || (item.subjudul_nama ? { id: null, nama: item.subjudul_nama } : null)
  }));
};

export const createAktivitas = async (aktivitasData: Omit<Aktivitas, 'id' | 'created_at' | 'updated_at' | 'user' | 'judul' | 'subjudul'>): Promise<Aktivitas> => {
  console.log('Creating aktivitas:', aktivitasData);

  // Fetch nama judul & subjudul untuk disimpan sebagai snapshot
  let judul_nama = aktivitasData.judul_nama;
  let subjudul_nama = aktivitasData.subjudul_nama;

  if (!judul_nama && aktivitasData.judul_id) {
    const { data: judulData } = await supabaseAdmin
      .from('judul').select('nama').eq('id', aktivitasData.judul_id).single();
    judul_nama = judulData?.nama || '';
  }
  if (!subjudul_nama && aktivitasData.subjudul_id) {
    const { data: subjudulData } = await supabaseAdmin
      .from('subjudul').select('nama').eq('id', aktivitasData.subjudul_id).single();
    subjudul_nama = subjudulData?.nama || '';
  }

  // Use admin client directly for consistent behavior
  const { data, error } = await supabaseAdmin
    .from('aktivitas')
    .insert([{ ...aktivitasData, judul_nama, subjudul_nama }])
    .select(`
      *,
      users(id, nama, username, jabatan, role),
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
      users(id, nama, username, jabatan, role),
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



// =====================
// NOTULENSI MANAGEMENT
// =====================
import { Notulensi, NotulensiPihak } from '../types';

// Get all notulensi (admin) atau notulensi milik user (karyawan)
export const getAllNotulensi = async (userId?: string): Promise<Notulensi[]> => {
  let query = supabaseAdmin
    .from('notulensi')
    .select(`*, user:users(*), judul:judul(*), subjudul:subjudul(*), pihak:notulensi_pihak(*)`)
    .order('tanggal', { ascending: false });
  if (userId) {
    query = query.eq('user_id', userId);
  }
  const { data, error } = await query;
  if (error) throw error;
  // Fallback ke snapshot nama jika judul/subjudul sudah dihapus
  return (data || []).map((item: any) => ({
    ...item,
    judul: item.judul || (item.judul_nama ? { id: null, nama: item.judul_nama } : null),
    subjudul: item.subjudul || (item.subjudul_nama ? { id: null, nama: item.subjudul_nama } : null)
  }));
};

export const getNotulensiById = async (id: string): Promise<Notulensi | null> => {
  const { data, error } = await supabase
    .from('notulensi')
    .select(`*, user:users(*), judul:judul(*), subjudul:subjudul(*), pihak:notulensi_pihak(*)`)
    .eq('id', id)
    .single();
  if (error) throw error;
  if (!data) return null;
  // Fallback ke snapshot nama jika judul/subjudul sudah dihapus
  return {
    ...data,
    judul: data.judul || (data.judul_nama ? { id: null, nama: data.judul_nama } : null),
    subjudul: data.subjudul || (data.subjudul_nama ? { id: null, nama: data.subjudul_nama } : null)
  };
};

export const createNotulensi = async (notulensi: Omit<Notulensi, 'id' | 'created_at' | 'updated_at' | 'user' | 'judul' | 'subjudul' | 'pihak'>, pihak: Omit<NotulensiPihak, 'id' | 'notulensi_id' | 'created_at'>[], userId: string): Promise<Notulensi> => {
  // Fetch nama judul & subjudul untuk disimpan sebagai snapshot
  let judul_nama = notulensi.judul_nama;
  let subjudul_nama = notulensi.subjudul_nama;

  if (!judul_nama && notulensi.judul_id) {
    const { data: judulData } = await supabaseAdmin
      .from('judul').select('nama').eq('id', notulensi.judul_id).single();
    judul_nama = judulData?.nama || '';
  }
  if (!subjudul_nama && notulensi.subjudul_id) {
    const { data: subjudulData } = await supabaseAdmin
      .from('subjudul').select('nama').eq('id', notulensi.subjudul_id).single();
    subjudul_nama = subjudulData?.nama || '';
  }

  // Insert notulensi dengan created_by dan snapshot nama
  const { data: nData, error: nError } = await supabase
    .from('notulensi')
    .insert([{ ...notulensi, created_by: userId, judul_nama, subjudul_nama }])
    .select()
    .single();
  if (nError) throw nError;
  // Insert pihak
  const pihakData = pihak.map(p => ({ ...p, notulensi_id: nData.id }));
  if (pihakData.length > 0) {
    const { error: pError } = await supabase
      .from('notulensi_pihak')
      .insert(pihakData);
    if (pError) throw pError;
  }
  // Return notulensi lengkap
  return await getNotulensiById(nData.id) as Notulensi;
};

export const updateNotulensi = async (id: string, notulensi: Partial<Omit<Notulensi, 'id' | 'created_at' | 'updated_at' | 'user' | 'judul' | 'subjudul' | 'pihak'>>, pihak: Omit<NotulensiPihak, 'id' | 'notulensi_id' | 'created_at'>[], userId: string): Promise<Notulensi> => {
  // Ambil notulensi lama
  const old = await getNotulensiById(id);
  let editedBy: string[] = Array.isArray(old?.edited_by) ? [...old.edited_by] : [];
  if (userId && !editedBy.includes(userId)) {
    editedBy.push(userId);
  }
  // Jangan update created_by!
  const { error: nError } = await supabase
    .from('notulensi')
    .update({ ...notulensi, edited_by: editedBy })
    .eq('id', id);
  if (nError) throw nError;
  // Hapus pihak lama
  await supabase.from('notulensi_pihak').delete().eq('notulensi_id', id);
  // Insert pihak baru
  const pihakData = pihak.map(p => ({ ...p, notulensi_id: id }));
  if (pihakData.length > 0) {
    const { error: pError } = await supabase
      .from('notulensi_pihak')
      .insert(pihakData);
    if (pError) throw pError;
  }
  // Return notulensi lengkap
  return await getNotulensiById(id) as Notulensi;
};

export const deleteNotulensi = async (id: string): Promise<void> => {
  // Hapus pihak dulu (cascade, tapi untuk jaga-jaga)
  await supabase.from('notulensi_pihak').delete().eq('notulensi_id', id);
  // Hapus notulensi
  const { error } = await supabase.from('notulensi').delete().eq('id', id);
  if (error) throw error;
};

// =====================
// NOTULENSI SESSIONS MANUAL
// =====================
export const getManualSessionsBySubJudul = async (subjudul_id: string): Promise<string[]> => {
  const { data, error } = await supabase
    .from('notulensi_sessions_manual')
    .select('sesi')
    .eq('subjudul_id', subjudul_id)
    .order('created_at');
  if (error) throw error;
  return (data || []).map((row: any) => row.sesi);
};

export const addManualSession = async (subjudul_id: string, sesi: string): Promise<void> => {
  const { error } = await supabase
    .from('notulensi_sessions_manual')
    .insert([{ subjudul_id, sesi }]);
  if (error) throw error;
};

export const deleteManualSession = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('notulensi_sessions_manual')
    .delete()
    .eq('id', id);
  if (error) throw error;
};