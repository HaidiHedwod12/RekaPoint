import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  UsersIcon, 
  PlusIcon, 
  PencilIcon, 
  TrashIcon,
  ArrowLeftIcon,
  UserIcon,
  BriefcaseIcon,
  KeyIcon
} from '@heroicons/react/24/outline';
import { useNavigate } from 'react-router-dom';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card } from '../ui/Card';
import { getAllUsers, deleteUser, getAktivitasByUser } from '../../lib/database';
import { createUserAsAdmin, updateUserAsAdmin } from '../../lib/database';
import { subscribeToTable, unsubscribeFromTable } from '../../lib/database';
import { User } from '../../types';

interface UserWithStats extends User {
  totalActivities?: number;
}

let loadUsersTimeout: ReturnType<typeof setTimeout> | null = null;

export const ManajemenKaryawan: React.FC = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const [userStats, setUserStats] = useState<{ [key: string]: { activities: number } }>({});
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
    role: 'karyawan' as 'admin' | 'karyawan'
  });
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    loadUsers();
    
    // Subscribe to realtime changes for users table
      subscribeToTable('users', () => {
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
    // Kosongkan data stats saat filter berubah
    setUserStats({});
    loadUserStats();
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

  const loadUserStats = async () => {
    if (users.length === 0) return; 
    const stats: { [key: string]: { activities: number } } = {};

    // Fetch data paralel untuk semua user
    await Promise.all(users.map(async (user) => {
      if (user.role === 'karyawan') {
        try {
          const activities = await getAktivitasByUser(user.id, statsFilter.month, statsFilter.year);
          stats[user.id] = {
            activities: activities.length
          };
        } catch (error) {
          stats[user.id] = { activities: 0 };
        }
      }
    }));
    setUserStats(stats);
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
          role: formData.role
        };
        
        if (formData.password_hash) {
          updateData.password_hash = formData.password_hash;
        }
        
        // Update user data
        await updateUserAsAdmin(editingUser.id, updateData);
        
        // Update local state immediately for smooth UI
        setUsers(prev => prev.map(user => 
          user.id === editingUser.id 
            ? { ...user, ...updateData }
            : user
        ));
        
        alert('Karyawan berhasil diupdate!');
      } else {
        console.log('Creating new user');
        await createUserAsAdmin({
          ...formData
        });
        
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
      role: user.role
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



  const getPerformanceLabel = (total: number, month: number, year: number) => {
    const now = new Date();
    const isCurrentMonth = year === now.getFullYear() && month === (now.getMonth() + 1);
    const isPastMonth = year < now.getFullYear() || (year === now.getFullYear() && month < (now.getMonth() + 1));
    
    let divisor = 1;
    if (isCurrentMonth) {
      divisor = now.getDate();
    } else if (isPastMonth) {
      divisor = new Date(year, month, 0).getDate();
    } else {
      divisor = 1;
    }

    const average = total / divisor;

    if (total === 0) return { label: 'Belum Ada', color: 'text-red-400', bg: 'bg-red-500/20' };
    if (average >= 3) return { label: 'Sangat Aktif', color: 'text-green-400', bg: 'bg-green-500/20' };
    if (average >= 2) return { label: 'Aktif', color: 'text-cyan-400', bg: 'bg-cyan-500/20' };
    if (average >= 1) return { label: 'Cukup Aktif', color: 'text-yellow-400', bg: 'bg-yellow-500/20' };
    return { label: 'Perlu Tingkatkan', color: 'text-orange-400', bg: 'bg-orange-500/20' };
  };

  const resetForm = () => {
    setFormData({
      nama: '',
      username: '',
      password_hash: '',
      jabatan: '',
      role: 'karyawan'
    });
    setEditingUser(null);
    setShowForm(false);
    setShowPassword(false);
    setSaving(false);
  };

  // User Card Component
  const UserCard: React.FC<{ user: UserWithStats; index: number }> = ({ user, index }) => {
    const stats = userStats[user.id] || { activities: 0 };
    
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
                <div className="flex items-center justify-between text-sm py-2 border-y border-gray-700/50 mb-2">
                  <span className="text-gray-400">Aktivitas Bulan Ini:</span>
                  <div className="text-right">
                    <div className="text-cyan-400 font-bold text-lg leading-tight">{stats.activities}</div>
                    {(() => {
                      const perf = getPerformanceLabel(stats.activities, statsFilter.month, statsFilter.year);
                      return (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full border border-current font-medium ${perf.color} ${perf.bg}`}>
                          {perf.label}
                        </span>
                      );
                    })()}
                  </div>
                </div>
              </>
            )}
            
            <div className="text-xs text-gray-500">
              Bergabung: {user.created_at ? new Date(user.created_at).toLocaleDateString('id-ID') : '-'}
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



  return (
    <div className="min-h-screen py-8 relative">
      {/* Background elements */}
      <div className="fixed top-20 right-20 opacity-10 hidden sm:block">
        <UsersIcon className="w-32 h-32 sm:w-64 sm:h-64 text-cyan-400" />
      </div>

      <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 sm:mb-8"
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sm:gap-0">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
              <Button
                variant="outline"
                onClick={() => navigate('/dashboard')}
                className="border-cyan-500/50 text-cyan-300 w-full sm:w-auto"
              >
                <ArrowLeftIcon className="w-5 h-5 mr-2" />
                Kembali
              </Button>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                  Manajemen Karyawan
                </h1>
                <p className="text-gray-400 mt-1 text-sm sm:text-base">Kelola akun karyawan dan jabatan</p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-4 w-full sm:w-auto">
              <div className="text-xs sm:text-sm text-cyan-300 font-medium text-center sm:text-left">
                Pengaturan untuk: {new Date(statsFilter.year, statsFilter.month - 1).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
              </div>
              <select
                value={statsFilter.month}
                onChange={(e) => setStatsFilter({ ...statsFilter, month: parseInt(e.target.value) })}
                className="px-2 sm:px-4 py-1 sm:py-2 glass-effect border border-gray-600/50 rounded-lg text-white bg-slate-800/50 focus:outline-none focus:ring-2 focus:ring-cyan-400 text-xs sm:text-base [&>option]:bg-slate-800 [&>option]:text-white"
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
                className="px-2 sm:px-4 py-1 sm:py-2 glass-effect border border-gray-600/50 rounded-lg text-white bg-slate-800/50 focus:outline-none focus:ring-2 focus:ring-cyan-400 text-xs sm:text-base [&>option]:bg-slate-800 [&>option]:text-white"
              >
                {Array.from({ length: 5 }, (_, i) => (
                  <option key={2025 + i} value={2025 + i} className="bg-slate-800 text-white">
                    {2025 + i}
                  </option>
                ))}
              </select>
              <Button
                onClick={() => setShowForm(true)}
                className="bg-gradient-to-r from-green-500 to-teal-600 w-full sm:w-auto"
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 max-w-4xl">
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
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