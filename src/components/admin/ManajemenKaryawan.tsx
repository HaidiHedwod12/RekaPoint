import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { 
  UsersIcon, 
  PlusIcon, 
  PencilIcon, 
  TrashIcon,
  ArrowLeftIcon,
  UserIcon,
  BriefcaseIcon,
  KeyIcon,
  DocumentArrowUpIcon,
  DocumentArrowDownIcon,
  ChartBarIcon,
  StarIcon,
  CalendarIcon
} from '@heroicons/react/24/outline';
import { useNavigate } from 'react-router-dom';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card } from '../ui/Card';
import { getAllUsers, createUser, updateUser, deleteUser, getAktivitasByUser } from '../../lib/database';
import { createUserAsAdmin, updateUserAsAdmin } from '../../lib/database';
import { subscribeToTable, unsubscribeFromTable } from '../../lib/database';
import { getMonthlySettings, upsertMonthlySettings, getAllMonthlySettings } from '../../lib/database';
import { uploadUserDocument, getUserDocuments, deleteUserDocument, downloadDocument, UserDocument } from '../../lib/fileUpload';
import { User, Aktivitas } from '../../types';

interface UserWithStats extends User {
  totalActivities?: number;
  totalPoin?: number;
  minimalPoin?: number;
  monthlyMinimalPoin?: number;
  monthlyCanViewPoin?: boolean;
}

let loadUsersTimeout: ReturnType<typeof setTimeout> | null = null;

export const ManajemenKaryawan: React.FC = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [userStats, setUserStats] = useState<{ [key: string]: { activities: number; poin: number } }>({});
  const [monthlyMinimalPoinForm, setMonthlyMinimalPoinForm] = useState<{ [key: string]: number }>({});
  const [monthlyCanViewPoinForm, setMonthlyCanViewPoinForm] = useState<{ [key: string]: boolean }>({});
  const [monthlySettingsLoaded, setMonthlySettingsLoaded] = useState(false);
  const [updatingSettings, setUpdatingSettings] = useState<{ [key: string]: 'minimal_poin' | 'can_view_poin' | null }>({});
  const [statsFilter, setStatsFilter] = useState({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear()
  });
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    nama: '',
    username: '',
    password_hash: '',
    jabatan: '',
    role: 'karyawan' as 'admin' | 'karyawan',
    minimal_poin: 150,
    can_view_poin: false
  });
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    loadUsers();
    
    // Subscribe to realtime changes for users table
    const subscription = subscribeToTable('users', (payload) => {
      // Debounce reload
      if (loadUsersTimeout) clearTimeout(loadUsersTimeout);
      loadUsersTimeout = setTimeout(() => {
        loadUsers();
      }, 500); // reload max 2x per detik
    });
    
    return () => {
      unsubscribeFromTable('users');
      if (loadUsersTimeout) clearTimeout(loadUsersTimeout);
    };
  }, []);

  useEffect(() => {
    // Kosongkan data stats dan form saat filter berubah
    setUserStats({});
    setMonthlyMinimalPoinForm({});
    setMonthlyCanViewPoinForm({});
    setMonthlySettingsLoaded(false);
    loadUserStatsAndMonthlySettings();
  }, [users, statsFilter]);

  const loadUsers = async () => {
    try {
      console.log('Loading users...');
      const data = await getAllUsers();
      console.log('Users loaded:', data.length);
      setUsers(data);
    } catch (error) {
      console.error('Error loading users:', error);
      alert('Gagal memuat data karyawan: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const loadUserStatsAndMonthlySettings = async () => {
    if (users.length === 0) return; // Don't load if no users yet
    setMonthlySettingsLoaded(false);
    const stats: { [key: string]: { activities: number; poin: number } } = {};
    const newMonthlyMinimalPoin: { [key: string]: number } = {};
    const newMonthlyCanViewPoin: { [key: string]: boolean } = {};

    // Fetch data paralel untuk semua user
    await Promise.all(users.map(async (user) => {
      if (user.role === 'karyawan') {
        try {
          const activities = await getAktivitasByUser(user.id, statsFilter.month, statsFilter.year);
          stats[user.id] = {
            activities: activities.length,
            poin: activities.reduce((sum, act) => sum + (act.poin || 0), 0)
          };
          const monthlySettings = await getMonthlySettings(user.id, statsFilter.month, statsFilter.year);
          newMonthlyMinimalPoin[user.id] = monthlySettings.minimal_poin;
          newMonthlyCanViewPoin[user.id] = monthlySettings.can_view_poin;
        } catch (error) {
          stats[user.id] = { activities: 0, poin: 0 };
          newMonthlyMinimalPoin[user.id] = user.minimal_poin || 150;
          newMonthlyCanViewPoin[user.id] = user.can_view_poin || false;
        }
      }
    }));
    setUserStats(stats);
    setMonthlyMinimalPoinForm(newMonthlyMinimalPoin);
    setMonthlyCanViewPoinForm(newMonthlyCanViewPoin);
    setMonthlySettingsLoaded(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Submitting form:', formData);
    setSaving(true);
    try {
      if (editingUser) {
        console.log('Updating user:', editingUser.id);
        const updateData: any = {
          nama: formData.nama,
          username: formData.username,
          jabatan: formData.jabatan,
          role: formData.role,
          minimal_poin: formData.minimal_poin,
          can_view_poin: formData.can_view_poin
        };
        
        if (formData.password_hash) {
          updateData.password_hash = formData.password_hash;
        }
        
        // Update user data
        const updatedUser = await updateUserAsAdmin(editingUser.id, updateData);
        
        // Update monthly settings for current filter period
        try {
          await upsertMonthlySettings(
            editingUser.id,
            statsFilter.month,
            statsFilter.year,
            formData.minimal_poin,
            formData.can_view_poin
          );
          console.log('Monthly settings updated for current period');
        } catch (monthlyError) {
          console.error('Error updating monthly settings:', monthlyError);
          // Continue anyway - user update was successful
        }
        
        // Update local state immediately for smooth UI
        setUsers(prev => prev.map(user => 
          user.id === editingUser.id 
            ? { ...user, ...updateData }
            : user
        ));
        
        // Update monthly settings state immediately
        setMonthlyMinimalPoinForm(prev => ({
          ...prev,
          [editingUser.id]: formData.minimal_poin
        }));
        
        setMonthlyCanViewPoinForm(prev => ({
          ...prev,
          [editingUser.id]: formData.can_view_poin
        }));
        
        alert('Karyawan berhasil diupdate!');
      } else {
        console.log('Creating new user');
        const newUser = await createUserAsAdmin({
          ...formData,
          minimal_poin: formData.minimal_poin,
          can_view_poin: formData.can_view_poin
        });
        
        // Create monthly settings for new user
        try {
          await upsertMonthlySettings(
            newUser.id,
            statsFilter.month,
            statsFilter.year,
            formData.minimal_poin,
            formData.can_view_poin
          );
          console.log('Monthly settings created for new user');
        } catch (monthlyError) {
          console.error('Error creating monthly settings for new user:', monthlyError);
        }
        
        alert('Karyawan berhasil ditambahkan!');
      }
      
      // Tidak perlu reload users dan monthly settings di sini, cukup update state lokal
      resetForm();
      setShowForm(false);
    } catch (error) {
      console.error('Error saving user:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      if (errorMessage.includes('tidak ditemukan') || errorMessage.includes('sudah dihapus')) {
        alert('Gagal mengupdate karyawan: Karyawan tidak ditemukan atau sudah dihapus.');
      } else {
        alert('Gagal menyimpan data karyawan: ' + errorMessage);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (user: User) => {
    // Check if user still exists in current users list
    const userExists = users.find(u => u.id === user.id);
    if (!userExists) {
      alert('User sudah dihapus. Silakan refresh halaman.');
      loadUsers();
      return;
    }
    
    setEditingUser(user);
    setFormData({
      nama: user.nama,
      username: user.username,
      password_hash: user.password_hash || '',
      jabatan: user.jabatan,
      role: user.role,
      minimal_poin: user.minimal_poin || 150,
      can_view_poin: user.can_view_poin || false
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    // Find user info for confirmation
    const userToDelete = users.find(u => u.id === id);
    if (!userToDelete) {
      alert('User tidak ditemukan. Silakan refresh halaman.');
      loadUsers();
      return;
    }
    
    if (confirm(`Yakin ingin menghapus karyawan "${userToDelete.nama}" (@${userToDelete.username})? Semua data aktivitas akan ikut terhapus.`)) {
      try {
        console.log('Deleting user:', id, 'username:', userToDelete.username);
        await deleteUser(id);
        
        // Close any open forms for this user
        if (editingUser?.id === id) {
          resetForm();
        }
        
        alert('Karyawan berhasil dihapus');
        await loadUsers();
      } catch (error) {
        console.error('Error deleting user:', error);
        alert('Gagal menghapus karyawan: ' + (error instanceof Error ? error.message : 'Unknown error'));
        await loadUsers(); // Reload to sync state
      }
    }
  };

  const handleUpdateMinimalPoin = async (userId: string) => {
    // Check if user still exists
    const userExists = users.find(u => u.id === userId);
    if (!userExists) {
      alert('User sudah dihapus. Silakan refresh halaman.');
      loadUsers();
      return;
    }
    
    try {
      console.log('Updating minimal poin for user:', userId, monthlyMinimalPoinForm[userId]);
      await updateUserAsAdmin(userId, { minimal_poin: monthlyMinimalPoinForm[userId] });
      
      // Update local state instead of reloading
      setUsers(prev => prev.map(user => 
        user.id === userId 
          ? { ...user, minimal_poin: monthlyMinimalPoinForm[userId] }
          : user
      ));
      
      // Trigger a broadcast to notify all clients about the user update
      try {
        // This part of the code was removed as per the new_code, as the broadcast logic was not provided in the new_code.
        // If broadcast is still needed, it should be re-added here.
      } catch (broadcastError) {
        console.log('Could not broadcast minimal poin update:', broadcastError);
      }
      
      // Show success feedback without alert
      console.log('Minimal poin updated successfully');
    } catch (error) {
      console.error('Error updating minimal poin:', error);
      alert('Gagal mengupdate minimal poin: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  const handleUpdateMonthlyMinimalPoin = async (userId: string) => {
    const user = users.find(u => u.id === userId);
    if (!user) {
      console.error('User not found:', userId);
      return;
    }
    
    const newValue = monthlyMinimalPoinForm[userId];
    if (newValue === undefined || newValue < 0) {
      console.error('Invalid minimal poin value:', newValue);
      return;
    }
    
    // Set updating state
    setUpdatingSettings(prev => ({ ...prev, [userId]: 'minimal_poin' }));
    
    console.log('Updating monthly minimal poin for user:', {
      userId,
      userName: user.nama,
      month: statsFilter.month,
      year: statsFilter.year,
      currentValue: monthlyMinimalPoinForm[userId],
      newValue,
      userDefault: user.minimal_poin
    });
    
    try {
      await upsertMonthlySettings(
        userId, 
        statsFilter.month, 
        statsFilter.year, 
        newValue, 
        undefined
      );
      
      console.log('Monthly minimal poin updated successfully for', user.nama);
      
      // Update local state immediately for smooth UI
      setMonthlyMinimalPoinForm(prev => ({
        ...prev,
        [userId]: newValue
      }));
      
      // Also update user's default minimal_poin if needed
      try {
        await updateUserAsAdmin(userId, { minimal_poin: newValue });
        setUsers(prev => prev.map(u => 
          u.id === userId ? { ...u, minimal_poin: newValue } : u
        ));
        console.log('User default minimal_poin also updated');
      } catch (userUpdateError) {
        console.log('Could not update user default minimal_poin:', userUpdateError);
      }
      
      console.log(`Minimal poin bulanan untuk ${user.nama} berhasil diupdate ke ${newValue}!`);
    } catch (error) {
      console.error('Error updating monthly minimal poin:', error);
      // Revert local state on error
      setMonthlyMinimalPoinForm(prev => ({
        ...prev,
        [userId]: user.minimal_poin || 150
      }));
      alert('Gagal mengupdate minimal poin: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setUpdatingSettings(prev => ({ ...prev, [userId]: null }));
    }
  };

  const handleUpdateMonthlyCanViewPoin = async (userId: string) => {
    const user = users.find(u => u.id === userId);
    if (!user) {
      console.error('User not found:', userId);
      return;
    }
    
    // Set updating state
    setUpdatingSettings(prev => ({ ...prev, [userId]: 'can_view_poin' }));
    
    const newValue = monthlyCanViewPoinForm[userId];
    console.log('Updating monthly can view poin for user:', {
      userId,
      userName: user.nama,
      month: statsFilter.month,
      year: statsFilter.year,
      currentValue: monthlyCanViewPoinForm[userId],
      newValue
    });
    
    try {
      await upsertMonthlySettings(
        userId, 
        statsFilter.month, 
        statsFilter.year, 
        undefined, 
        newValue
      );
      
      console.log('Monthly can view poin updated successfully for', user.nama);
      
      // Update local state immediately for smooth UI
      setMonthlyCanViewPoinForm(prev => ({
        ...prev,
        [userId]: newValue
      }));
      
      // Also update user's default can_view_poin if needed
      try {
        await updateUserAsAdmin(userId, { can_view_poin: newValue });
        setUsers(prev => prev.map(u => 
          u.id === userId ? { ...u, can_view_poin: newValue } : u
        ));
        console.log('User default can_view_poin also updated');
      } catch (userUpdateError) {
        console.log('Could not update user default can_view_poin:', userUpdateError);
      }
      
      console.log(`Izin melihat poin bulanan untuk ${user.nama} berhasil diupdate!`);
    } catch (error) {
      console.error('Error updating monthly can_view_poin:', error);
      // Revert local state on error
      setMonthlyCanViewPoinForm(prev => ({
        ...prev,
        [userId]: user.can_view_poin || false
      }));
      alert('Gagal mengupdate izin melihat poin: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setUpdatingSettings(prev => ({ ...prev, [userId]: null }));
    }
  };

  const resetForm = () => {
    setFormData({
      nama: '',
      username: '',
      password_hash: '',
      jabatan: '',
      role: 'karyawan',
      minimal_poin: 150,
      can_view_poin: false
    });
    setEditingUser(null);
    setShowForm(false);
    setShowPassword(false);
    setSaving(false);
  };

  const getPoinStatus = (currentPoin: number, monthlyMinimalPoin: number) => {
    if (currentPoin >= monthlyMinimalPoin) {
      return {
        color: 'text-green-400',
        bgColor: 'bg-green-500/20 border-green-500/50',
        status: 'Tercapai'
      };
    } else {
      return {
        color: 'text-red-400',
        bgColor: 'bg-red-500/20 border-red-500/50',
        status: 'Kurang'
      };
    }
  };

  // User Card Component
  const UserCard: React.FC<{ user: UserWithStats; index: number }> = ({ user, index }) => {
    const stats = userStats[user.id] || { activities: 0, poin: 0 };
    const monthlyMinimalPoin = monthlyMinimalPoinForm[user.id] || user.minimal_poin || 150;
    const monthlyCanViewPoin = monthlyCanViewPoinForm[user.id] || false;
    const poinStatus = getPoinStatus(stats.poin, monthlyMinimalPoin);
    
    console.log(`UserCard for ${user.nama}:`, {
      monthlyMinimalPoinForm: monthlyMinimalPoinForm[user.id],
      userMinimalPoin: user.minimal_poin,
      finalMonthlyMinimalPoin: monthlyMinimalPoin,
      statsFilter
    });
    
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.1 }}
      >
        <Card>
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                user.role === 'admin' 
                  ? 'bg-gradient-to-br from-purple-500 to-pink-600' 
                  : 'bg-gradient-to-br from-green-500 to-teal-600'
              }`}>
                <UserIcon className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-white">{user.nama}</h3>
                <p className="text-sm text-gray-400">@{user.username}</p>
              </div>
            </div>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
              user.role === 'admin' 
                ? 'bg-purple-500/20 text-purple-300' 
                : 'bg-green-500/20 text-green-300'
            }`}>
              {user.role}
            </span>
          </div>
          
          <div className="space-y-3 mb-4">
            <div className="flex items-center space-x-2 text-sm text-gray-400">
              <BriefcaseIcon className="w-4 h-4" />
              <span>{user.jabatan}</span>
            </div>
            
            {user.role === 'karyawan' && (
              <>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Aktivitas:</span>
                  <span className="text-cyan-400 font-medium">{stats.activities}</span>
                </div>
                
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Poin:</span>
                  <span className={`font-bold ${poinStatus.color}`}>
                    {stats.poin}/{monthlyMinimalPoin}
                  </span>
                </div>
                
                <div className={`px-3 py-1 rounded-full text-xs font-medium border ${poinStatus.bgColor}`}>
                  {poinStatus.status}
                </div>
                
                {/* Monthly Minimal Poin Setting */}
                <div className="space-y-2 pt-2 border-t border-gray-700/50">
                  <label className="text-xs text-gray-400">
                    Minimal Poin ({new Date(statsFilter.year, statsFilter.month - 1).toLocaleDateString('id-ID', { month: 'short' })} {statsFilter.year}):
                  </label>
                  <div className="text-xs text-gray-500 mb-1">
                    Current: {monthlyMinimalPoin} | Default: {user.minimal_poin || 150}
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="number"
                      min="0"
                      max="1000"
                      value={monthlyMinimalPoinForm[user.id] !== undefined ? monthlyMinimalPoinForm[user.id] : (user.minimal_poin || 150)}
                      onChange={(e) => {
                        // Hanya update state lokal, tidak trigger update ke server
                        setMonthlyMinimalPoinForm({
                          ...monthlyMinimalPoinForm,
                          [user.id]: parseInt(e.target.value) || 0
                        });
                      }}
                      disabled={!monthlySettingsLoaded}
                      className="w-16 px-2 py-1 text-xs text-center glass-effect border border-gray-600/50 rounded text-white focus:outline-none focus:ring-1 focus:ring-cyan-400"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={async () => {
                        if (updatingSettings[user.id] === 'minimal_poin') return;
                        setUpdatingSettings(prev => ({ ...prev, [user.id]: 'minimal_poin' }));
                        const oldValue = user.minimal_poin;
                        const newValue = monthlyMinimalPoinForm[user.id];
                        setUsers(prev => prev.map(u => u.id === user.id ? { ...u, minimal_poin: newValue } : u));
                        try {
                          await new Promise(res => setTimeout(res, 1000)); // debounce 1 detik
                          await upsertMonthlySettings(
                            user.id,
                            statsFilter.month,
                            statsFilter.year,
                            newValue,
                            undefined
                          );
                          await updateUserAsAdmin(user.id, { minimal_poin: newValue });
                        } catch (error) {
                          setUsers(prev => prev.map(u => u.id === user.id ? { ...u, minimal_poin: oldValue } : u));
                          alert('Gagal update minimal poin: ' + (error instanceof Error ? error.message : 'Unknown error'));
                        } finally {
                          setUpdatingSettings(prev => ({ ...prev, [user.id]: null }));
                        }
                      }}
                      disabled={!monthlySettingsLoaded || updatingSettings[user.id] === 'minimal_poin'}
                      className="border-cyan-500/50 text-cyan-300 text-xs px-2 py-1"
                    >
                      {updatingSettings[user.id] === 'minimal_poin' ? (
                        <div className="flex items-center">
                          <div className="w-3 h-3 border border-cyan-400 border-t-transparent rounded-full animate-spin mr-1" />
                          Saving
                        </div>
                      ) : (
                        'Set'
                      )}
                    </Button>
                  </div>
                </div>
                
                {/* Monthly Izin Melihat Poin */}
                <div className="space-y-2 pt-2 border-t border-gray-700/50">
                  <label className="text-xs text-gray-400">
                    Izin Melihat Poin ({new Date(statsFilter.year, statsFilter.month - 1).toLocaleDateString('id-ID', { month: 'short' })} {statsFilter.year}):
                  </label>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={monthlyCanViewPoinForm[user.id] !== undefined ? monthlyCanViewPoinForm[user.id] : (user.can_view_poin || false)}
                        onChange={(e) => {
                          // Hanya update state lokal, tidak trigger update ke server
                          setMonthlyCanViewPoinForm({
                            ...monthlyCanViewPoinForm,
                            [user.id]: e.target.checked
                          });
                        }}
                        disabled={!monthlySettingsLoaded}
                        className="w-4 h-4 text-cyan-600 bg-gray-700 border-gray-600 rounded focus:ring-cyan-500"
                      />
                      <span className="text-xs text-gray-300">
                        {(monthlyCanViewPoinForm[user.id] !== undefined ? monthlyCanViewPoinForm[user.id] : (user.can_view_poin || false)) ? 'Boleh melihat' : 'Tidak boleh melihat'}
                      </span>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={async () => {
                        if (updatingSettings[user.id] === 'can_view_poin') return;
                        setUpdatingSettings(prev => ({ ...prev, [user.id]: 'can_view_poin' }));
                        const oldValue = user.can_view_poin;
                        const newValue = monthlyCanViewPoinForm[user.id];
                        setUsers(prev => prev.map(u => u.id === user.id ? { ...u, can_view_poin: newValue } : u));
                        try {
                          await new Promise(res => setTimeout(res, 1000)); // debounce 1 detik
                          await upsertMonthlySettings(
                            user.id,
                            statsFilter.month,
                            statsFilter.year,
                            undefined,
                            newValue
                          );
                          await updateUserAsAdmin(user.id, { can_view_poin: newValue });
                        } catch (error) {
                          setUsers(prev => prev.map(u => u.id === user.id ? { ...u, can_view_poin: oldValue } : u));
                          alert('Gagal update izin melihat poin: ' + (error instanceof Error ? error.message : 'Unknown error'));
                        } finally {
                          setUpdatingSettings(prev => ({ ...prev, [user.id]: null }));
                        }
                      }}
                      disabled={!monthlySettingsLoaded || updatingSettings[user.id] === 'can_view_poin'}
                      className="border-cyan-500/50 text-cyan-300 text-xs px-2 py-1"
                    >
                      {updatingSettings[user.id] === 'can_view_poin' ? (
                        <div className="flex items-center">
                          <div className="w-3 h-3 border border-cyan-400 border-t-transparent rounded-full animate-spin mr-1" />
                          Saving
                        </div>
                      ) : (
                        'Set'
                      )}
                    </Button>
                  </div>
                </div>
              </>
            )}
            
            <div className="text-xs text-gray-500">
              Bergabung: {new Date(user.created_at).toLocaleDateString('id-ID')}
            </div>
          </div>
          
          <div className="flex space-x-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleEdit(user)}
              className="flex-1 border-cyan-500/50 text-cyan-300"
            >
              <PencilIcon className="w-4 h-4 mr-1" />
              Edit
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleDelete(user.id)}
              className="border-red-500/50 text-red-300 hover:bg-red-500/10"
            >
              <TrashIcon className="w-4 h-4" />
            </Button>
          </div>
        </Card>
      </motion.div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-16 h-16 border-4 border-gray-600 border-t-cyan-400 rounded-full animate-spin" />
      </div>
    );
  }

  // Skeleton untuk area data karyawan
  if (!monthlySettingsLoaded) {
    return (
      <div className="min-h-screen py-8 flex flex-col items-center justify-center">
        <div className="w-16 h-16 border-4 border-gray-600 border-t-cyan-400 rounded-full animate-spin mb-4" />
        <div className="text-cyan-300">Memuat data karyawan untuk bulan {statsFilter.month}/{statsFilter.year}...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 relative">
      {/* Background elements */}
      <div className="fixed top-20 right-20 opacity-10">
        <UsersIcon className="w-64 h-64 text-cyan-400" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="outline"
                onClick={() => navigate('/dashboard')}
                className="border-cyan-500/50 text-cyan-300"
              >
                <ArrowLeftIcon className="w-5 h-5 mr-2" />
                Kembali
              </Button>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                  Manajemen Karyawan
                </h1>
                <p className="text-gray-400 mt-1">Kelola akun karyawan dan jabatan</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-cyan-300 font-medium">
                Pengaturan untuk: {new Date(statsFilter.year, statsFilter.month - 1).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
              </div>
              <select
                value={statsFilter.month}
                onChange={(e) => setStatsFilter({ ...statsFilter, month: parseInt(e.target.value) })}
                className="px-4 py-2 glass-effect border border-gray-600/50 rounded-lg text-white bg-slate-800/50 focus:outline-none focus:ring-2 focus:ring-cyan-400 [&>option]:bg-slate-800 [&>option]:text-white"
              >
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i + 1} value={i + 1} className="bg-slate-800 text-white">
                    {new Date(2025, i).toLocaleDateString('id-ID', { month: 'long' })}
                  </option>
                ))}
              </select>
              <select
                value={statsFilter.year}
                onChange={(e) => setStatsFilter({ ...statsFilter, year: parseInt(e.target.value) })}
                className="px-4 py-2 glass-effect border border-gray-600/50 rounded-lg text-white bg-slate-800/50 focus:outline-none focus:ring-2 focus:ring-cyan-400 [&>option]:bg-slate-800 [&>option]:text-white"
              >
                {Array.from({ length: 5 }, (_, i) => (
                  <option key={2025 + i} value={2025 + i} className="bg-slate-800 text-white">
                    {2025 + i}
                  </option>
                ))}
              </select>
              <Button
                onClick={() => setShowForm(true)}
                className="bg-gradient-to-r from-green-500 to-teal-600"
              >
                <PlusIcon className="w-5 h-5 mr-2" />
                Tambah Karyawan
              </Button>
            </div>
          </div>
        </motion.div>

        {showForm && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-8"
          >
            <Card>
              <h3 className="text-xl font-semibold text-white mb-6">
                {editingUser ? 'Edit Karyawan' : 'Tambah Karyawan Baru'}
              </h3>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Input
                    label="Nama Lengkap"
                    value={formData.nama}
                    onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
                    required
                    icon={<UserIcon className="w-5 h-5" />}
                  />
                  <Input
                    label="Username"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    required
                    icon={<UserIcon className="w-5 h-5" />}
                  />
                  <Input
                    label="Jabatan"
                    value={formData.jabatan}
                    onChange={(e) => setFormData({ ...formData, jabatan: e.target.value })}
                    required
                    icon={<BriefcaseIcon className="w-5 h-5" />}
                  />
                  <Input
                    label="Minimal Poin per Bulan"
                    type="number"
                    value={formData.minimal_poin.toString()}
                    onChange={(e) => setFormData({ ...formData, minimal_poin: parseInt(e.target.value) || 150 })}
                    required
                    icon={<StarIcon className="w-5 h-5" />}
                  />
                  <div className="relative">
                    <Input
                      label={editingUser ? "Password Baru (kosongkan jika tidak diubah)" : "Password"}
                      type={showPassword ? "text" : "password"}
                      value={formData.password_hash}
                      onChange={(e) => setFormData({ ...formData, password_hash: e.target.value })}
                      required={!editingUser}
                      icon={<KeyIcon className="w-5 h-5" />}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-9 text-gray-400 hover:text-gray-300"
                    >
                      {showPassword ? 'Hide' : 'Show'}
                    </button>
                  </div>
                </div>
                
                {/* Can View Poin Setting in Form */}
                {formData.role === 'karyawan' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Izin Melihat Poin
                    </label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={formData.can_view_poin || false}
                        onChange={(e) => setFormData({ ...formData, can_view_poin: e.target.checked })}
                        className="w-4 h-4 text-cyan-600 bg-gray-700 border-gray-600 rounded focus:ring-cyan-500"
                      />
                      <span className="text-sm text-gray-300">
                        Karyawan boleh melihat poin aktivitas
                      </span>
                    </div>
                  </div>
                )}
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Role</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value as 'admin' | 'karyawan' })}
                    className="w-full px-4 py-3 glass-effect border border-gray-600/50 rounded-lg text-white bg-slate-800/50 focus:outline-none focus:ring-2 focus:ring-cyan-400 [&>option]:bg-slate-800 [&>option]:text-white"
                  >
                    <option value="karyawan" className="bg-slate-800 text-white">Karyawan</option>
                    <option value="admin" className="bg-slate-800 text-white">Admin</option>
                  </select>
                </div>
                <div className="flex space-x-4">
                  <Button 
                    type="submit" 
                    className="bg-gradient-to-r from-green-500 to-teal-600"
                    disabled={saving}
                  >
                    {saving ? (
                      <div className="flex items-center">
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                        {editingUser ? 'Mengupdate...' : 'Menyimpan...'}
                      </div>
                    ) : (
                      editingUser ? 'Update' : 'Simpan'
                    )}
                  </Button>
                  <Button variant="outline" onClick={resetForm} disabled={saving}>
                    Batal
                  </Button>
                </div>
              </form>
            </Card>
          </motion.div>
        )}

        {/* Admin Users First */}
        {users.filter(user => user.role === 'admin').length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center">
              <div className="w-6 h-6 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full mr-2" />
              Administrator
            </h2>
            <div className="flex justify-center">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-4xl">
                {users.filter(user => user.role === 'admin').map((user, index) => (
                  <UserCard key={user.id} user={user} index={index} />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Employee Users */}
        {users.filter(user => user.role === 'karyawan').length > 0 && (
          <div>
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center">
              <div className="w-6 h-6 bg-gradient-to-br from-green-500 to-teal-600 rounded-full mr-2" />
              Karyawan
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {users.filter(user => user.role === 'karyawan').map((user, index) => (
                <UserCard key={user.id} user={user} index={index} />
              ))}
            </div>
          </div>
        )}

        {users.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <UsersIcon className="w-16 h-16 text-gray-500 mx-auto mb-4" />
            <p className="text-gray-400">Belum ada karyawan yang terdaftar</p>
          </motion.div>
        )}
      </div>
    </div>
  );
};