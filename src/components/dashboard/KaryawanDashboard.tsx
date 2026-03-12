import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  PlusCircleIcon, 
  ClockIcon, 
  ChartBarIcon, 
  CalendarIcon,
  DocumentArrowUpIcon,
  MapPinIcon,
  DocumentTextIcon,
  GlobeAltIcon,
  StarIcon,
  CurrencyDollarIcon
} from '@heroicons/react/24/outline';
import { MenuCard } from './MenuCard';
import { useAuth } from '../../contexts/AuthContext';
import { getAktivitasByUser } from '../../lib/database';
import { subscribeToTable, unsubscribeFromTable } from '../../lib/database';


export const KaryawanDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalActivities: 0
  });
  const [filter, setFilter] = useState({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear()
  });

  useEffect(() => {
    if (user) {
      loadStats();
      
      // Subscribe to realtime changes for aktivitas table
      subscribeToTable('aktivitas', (payload) => {
        console.log('Realtime aktivitas change for dashboard:', payload);
        
        // Only reload if the change affects current user
        if (payload.new?.user_id === user.id || payload.old?.user_id === user.id) {
          loadStats();
        }
      });
      
      return () => {
        unsubscribeFromTable('aktivitas');
      };
    }
  }, [user, filter]);

  const getPerformanceLabel = (total: number) => {
    const now = new Date();
    const isCurrentMonth = filter.year === now.getFullYear() && filter.month === (now.getMonth() + 1);
    const isPastMonth = filter.year < now.getFullYear() || (filter.year === now.getFullYear() && filter.month < (now.getMonth() + 1));
    
    let divisor = 1;
    if (isCurrentMonth) {
      divisor = now.getDate();
    } else if (isPastMonth) {
      divisor = new Date(filter.year, filter.month, 0).getDate();
    } else {
      divisor = 1;
    }

    const average = total / divisor;

    if (total === 0) return { label: 'Belum Ada Aktivitas', color: 'text-red-400', bg: 'bg-red-500/20', average };
    if (average >= 3) return { label: 'Sangat Aktif', color: 'text-green-400', bg: 'bg-green-500/20', average };
    if (average >= 2) return { label: 'Aktif', color: 'text-cyan-400', bg: 'bg-cyan-500/20', average };
    if (average >= 1) return { label: 'Cukup Aktif', color: 'text-yellow-400', bg: 'bg-yellow-500/20', average };
    return { label: 'Perlu Ditingkatkan', color: 'text-orange-400', bg: 'bg-orange-500/20', average };
  };

  const loadStats = async () => {
    if (!user) return;
    
    console.log('Loading dashboard stats for user:', user.id, 'filter:', filter);
    try {
      // Load activities
      const activities = await getAktivitasByUser(user.id, filter.month, filter.year);
      console.log('Dashboard activities loaded:', activities.length, 'items');
      setStats({
        totalActivities: activities.length
      });
    } catch (error) {
      console.error('Error loading stats:', error);
      alert('Gagal memuat statistik dashboard: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };



  const menuItems = [
    {
      title: 'Tambah Aktivitas',
      description: 'Catat aktivitas harian Anda',
      icon: PlusCircleIcon,
      iconBg: 'from-green-500 to-teal-600',
      onClick: () => navigate('/karyawan/tambah')
    },
    {
      title: 'Histori Aktivitas',
      description: 'Lihat aktivitas yang sudah dicatat',
      icon: ClockIcon,
      iconBg: 'from-blue-500 to-purple-600',
      onClick: () => navigate('/karyawan/histori')
    },
    {
      title: 'Reimbursement',
      description: 'Ajukan penggantian biaya operasional',
      icon: CurrencyDollarIcon,
      iconBg: 'from-emerald-500 to-green-600',
      onClick: () => navigate('/karyawan/reimbursement')
    },
    {
      title: 'Statistik',
      description: 'Lihat ringkasan aktivitas Anda',
      icon: ChartBarIcon,
      iconBg: 'from-orange-500 to-red-600',
      onClick: () => navigate('/karyawan/statistik')
    },
    {
      title: 'Kalender',
      description: 'Lihat aktivitas dalam tampilan kalender',
      icon: CalendarIcon,
      iconBg: 'from-cyan-500 to-blue-600',
      onClick: () => navigate('/karyawan/kalender')
    },
    {
      title: 'Import Excel',
      description: 'Upload aktivitas dari file Excel',
      icon: DocumentArrowUpIcon,
      iconBg: 'from-purple-500 to-pink-600',
      onClick: () => navigate('/karyawan/import')
    },
    {
      title: 'Notulensi',
      description: 'Catat hasil paparan dan diskusi kegiatan',
      icon: DocumentTextIcon,
      iconBg: 'from-blue-500 to-cyan-600',
      onClick: () => navigate('/karyawan/notulensi')
    },
    {
      title: 'Test Supabase',
      description: 'Test koneksi database (Development)',
      icon: StarIcon,
      iconBg: 'from-yellow-500 to-orange-600',
      onClick: () => navigate('/test-supabase')
    }
  ];

  return (
    <div className="min-h-screen py-8 relative">
      {/* Background elements */}
      <div className="fixed top-20 right-10 opacity-10 hidden sm:block">
        <MapPinIcon className="w-36 h-36 sm:w-72 sm:h-72 text-cyan-400" />
      </div>
      <div className="fixed bottom-10 left-10 opacity-10 hidden sm:block">
        <DocumentTextIcon className="w-28 h-28 sm:w-56 sm:h-56 text-blue-400" />
      </div>
      <div className="fixed top-1/3 left-1/4 opacity-5 hidden sm:block">
        <GlobeAltIcon className="w-40 h-40 sm:w-80 sm:h-80 text-purple-300" />
      </div>

      <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-6 sm:mb-12 pt-2 sm:pt-8"
        >
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            className="inline-flex items-center justify-center w-12 h-12 sm:w-20 sm:h-20 bg-gradient-to-br from-green-500 to-teal-600 rounded-full mb-2 sm:mb-6 pulse-glow"
          >
            <DocumentTextIcon className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
          </motion.div>
          <h1 className="text-xl sm:text-4xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent mb-1 sm:mb-4">
            Selamat Datang, {user?.nama}
          </h1>
          <p className="text-base sm:text-xl text-gray-300 mb-1 sm:mb-2">
            Catat dan kelola aktivitas harian Anda
          </p>
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 }}
            className="mt-2 sm:mt-6 space-y-2 sm:space-y-3"
          >
            <div className="inline-flex items-center justify-center space-x-2 glass-effect px-4 sm:px-6 py-2 sm:py-3 rounded-full border border-cyan-500/30 text-xs sm:text-base">
              <MapPinIcon className="w-5 h-5 text-cyan-400" />
              <span className="text-gray-400">Jabatan:</span>
              <span className="text-cyan-300 font-medium">{user?.jabatan}</span>
            </div>
            {/* Filter */}
            <div className="flex justify-center space-x-2 sm:space-x-4 mb-2 sm:mb-4">
              <select
                value={filter.month}
                onChange={(e) => setFilter({ ...filter, month: parseInt(e.target.value) })}
                className="px-2 sm:px-3 py-1 sm:py-2 glass-effect border border-gray-600/50 rounded-lg text-white bg-slate-800/50 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400 [&>option]:bg-slate-800 [&>option]:text-white"
              >
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i + 1} value={i + 1} className="bg-slate-800 text-white">
                    {new Date(2025, i).toLocaleDateString('id-ID', { month: 'long' })}
                  </option>
                ))}
              </select>
              <select
                value={filter.year}
                onChange={(e) => setFilter({ ...filter, year: parseInt(e.target.value) })}
                className="px-2 sm:px-3 py-1 sm:py-2 glass-effect border border-gray-600/50 rounded-lg text-white bg-slate-800/50 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400 [&>option]:bg-slate-800 [&>option]:text-white"
              >
                {Array.from({ length: 5 }, (_, i) => (
                  <option key={2025 + i} value={2025 + i} className="bg-slate-800 text-white">
                    {2025 + i}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col sm:flex-row justify-center space-y-2 sm:space-y-0 sm:space-x-4">
              <div className="glass-effect px-6 py-3 rounded-xl border border-green-500/30 hover:border-green-400/50 transition-all duration-300">
                <div className="text-3xl font-extrabold text-green-400">{stats.totalActivities}</div>
                <div className="text-sm font-medium text-gray-400">Total Aktivitas Tercatat</div>
                {(() => {
                  const perf = getPerformanceLabel(stats.totalActivities);
                  return (
                    <div className="mt-2 text-xs">
                      <span className={`px-2 py-0.5 rounded-full border border-current font-medium ${perf.color} ${perf.bg}`}>
                        Status: {perf.label} ({perf.average.toFixed(1)}/hari)
                      </span>
                    </div>
                  );
                })()}
                <div className="text-[10px] text-cyan-200/60 mt-2 uppercase tracking-wider font-medium">{new Date(filter.year, filter.month - 1).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}</div>
              </div>
            </div>
          </motion.div>
        </motion.div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-8">
          {menuItems.map((item, index) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 + index * 0.1 }}
            >
              <MenuCard {...item} />
            </motion.div>
          ))}
        </div>
        {/* Quick actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2 }}
          className="mt-8 sm:mt-12"
        >
          <h3 className="text-lg sm:text-xl font-semibold text-white mb-4 sm:mb-6 text-center">
            Aktivitas {new Date(filter.year, filter.month - 1).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
          </h3>
          <div className="glass-effect border border-cyan-500/20 rounded-xl p-4 sm:p-6 hover:border-cyan-400/50 transition-all duration-300">
            <div className="text-center text-gray-400">
              <CalendarIcon className="w-8 h-8 sm:w-12 sm:h-12 mx-auto mb-2 sm:mb-4 text-cyan-400/50" />
              {stats.totalActivities === 0 ? (
                <>
                  <p>Belum ada aktivitas yang dicatat untuk periode ini</p>
                  <p className="text-xs sm:text-sm mt-1 sm:mt-2">Klik "Tambah Aktivitas" untuk mulai mencatat</p>
                </>
              ) : (
                <>
                  <p>Total {stats.totalActivities} aktivitas tercatat</p>
                </>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};