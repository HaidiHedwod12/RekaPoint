import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  ArrowDownTrayIcon, 
  ArrowLeftIcon,
  UserIcon,
  CalendarIcon,
  DocumentArrowDownIcon,
  UsersIcon
} from '@heroicons/react/24/outline';
import { useNavigate } from 'react-router-dom';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { getAllUsers, getAktivitasByUser, getAllAktivitas } from '../../lib/database';
import { exportUserActivities, exportAllActivities } from '../../lib/excel';
import { User, Aktivitas } from '../../types';

export const EksporData: React.FC = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState<string | null>(null);
  const [filter, setFilter] = useState({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear()
  });

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const data = await getAllUsers();
      setUsers(data.filter(user => user.role === 'karyawan'));
      console.log('Users loaded for export:', data.length);
      console.error('Error loading users:', error);
      alert('Gagal memuat data karyawan untuk ekspor: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const handleExportUser = async (user: User) => {
    setExporting(user.id);
    try {
      const activities = await getAktivitasByUser(user.id, filter.month, filter.year);
      exportUserActivities(user, activities);
    } catch (error) {
      console.error('Error exporting user data:', error);
    } finally {
      setExporting(null);
    }
  };

  const handleExportAll = async () => {
    setExporting('all');
    try {
      const allActivities = await getAllAktivitas(filter.month, filter.year);
      
      // Group activities by user
      const userActivitiesMap = new Map<string, { user: User; activities: Aktivitas[] }>();
      
      allActivities.forEach(activity => {
        if (activity.user) {
          const userId = activity.user.id;
          if (!userActivitiesMap.has(userId)) {
            userActivitiesMap.set(userId, {
              user: activity.user,
              activities: []
            });
          }
          userActivitiesMap.get(userId)!.activities.push(activity);
        }
      });

      const usersWithActivities = Array.from(userActivitiesMap.values());
      exportAllActivities(usersWithActivities);
    } catch (error) {
      console.error('Error exporting all data:', error);
    } finally {
      setExporting(null);
    }
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
      <div className="fixed top-20 right-20 opacity-10">
        <ArrowDownTrayIcon className="w-64 h-64 text-cyan-400" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
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
                  Ekspor Data
                </h1>
                <p className="text-gray-400 mt-1 text-sm sm:text-base">Unduh laporan aktivitas karyawan</p>
              </div>
            </div>
            
            <div className="flex space-x-4">
              <select
                value={filter.month}
                onChange={(e) => setFilter({ ...filter, month: parseInt(e.target.value) })}
                className="px-4 py-2 glass-effect border border-gray-600/50 rounded-lg text-white bg-slate-800/50 focus:outline-none focus:ring-2 focus:ring-cyan-400 [&>option]:bg-slate-800 [&>option]:text-white"
              >
                <option value={0} className="bg-slate-800 text-white">Semua Bulan</option>
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i + 1} value={i + 1} className="bg-slate-800 text-white">
                    {new Date(2025, i).toLocaleDateString('id-ID', { month: 'long' })}
                  </option>
                ))}
              </select>
              <select
                value={filter.year}
                onChange={(e) => setFilter({ ...filter, year: parseInt(e.target.value) })}
                className="px-4 py-2 glass-effect border border-gray-600/50 rounded-lg text-white bg-slate-800/50 focus:outline-none focus:ring-2 focus:ring-cyan-400 [&>option]:bg-slate-800 [&>option]:text-white"
              >
                {Array.from({ length: 5 }, (_, i) => (
                  <option key={2025 + i} value={2025 + i} className="bg-slate-800 text-white">
                    {2025 + i}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </motion.div>

        {/* Export All Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <Card>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center">
                  <UsersIcon className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-white">Ekspor Semua Data</h3>
                  <p className="text-gray-400">Unduh laporan aktivitas semua karyawan dalam satu file</p>
                </div>
              </div>
              <Button
                onClick={handleExportAll}
                disabled={exporting === 'all'}
                className="bg-gradient-to-r from-orange-500 to-red-600"
              >
                {exporting === 'all' ? (
                  <div className="flex items-center">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                    Mengekspor...
                  </div>
                ) : (
                  <div className="flex items-center">
                    <DocumentArrowDownIcon className="w-5 h-5 mr-2" />
                    Ekspor Semua
                  </div>
                )}
              </Button>
            </div>
          </Card>
        </motion.div>

        {/* Individual User Export */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {users.map((user, index) => (
            <motion.div
              key={user.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card>
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full flex items-center justify-center">
                    <UserIcon className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">{user.nama}</h3>
                    <p className="text-sm text-gray-400">{user.jabatan}</p>
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center space-x-2 text-sm text-gray-400">
                    <CalendarIcon className="w-4 h-4" />
                    <span>
                      {filter.month === 0 ? 'Semua bulan' : new Date(2025, filter.month - 1).toLocaleDateString('id-ID', { month: 'long' })} {filter.year}
                    </span>
                  </div>
                </div>

                <Button
                  onClick={() => handleExportUser(user)}
                  disabled={exporting === user.id}
                  className="w-full bg-gradient-to-r from-green-500 to-teal-600"
                  size="sm"
                >
                  {exporting === user.id ? (
                    <div className="flex items-center">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                      Mengekspor...
                    </div>
                  ) : (
                    <div className="flex items-center">
                      <ArrowDownTrayIcon className="w-4 h-4 mr-2" />
                      Ekspor Data
                    </div>
                  )}
                </Button>
              </Card>
            </motion.div>
          ))}
        </div>

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