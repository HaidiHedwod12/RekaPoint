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
import { getMonthlySettings } from '../../lib/database';

export const KaryawanDashboard: React.FC = () => {
  const { user, getMonthlyUserSettings } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalActivities: 0,
    totalPoin: 0,
    minimalPoin: 150,
    canViewPoin: false
  });
  const [filter, setFilter] = useState({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear()
  });

  useEffect(() => {
    if (user) {
      loadStats();
      
      // Subscribe to realtime changes for aktivitas table
      const subscription = subscribeToTable('aktivitas', (payload) => {
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

  const loadStats = async () => {
    if (!user) return;
    
    console.log('Loading dashboard stats for user:', user.id, 'filter:', filter);
    try {
      // Load activities
      const activities = await getAktivitasByUser(user.id, filter.month, filter.year);
      console.log('Dashboard activities loaded:', activities.length, 'items');
      const totalPoin = activities.reduce((sum, act) => sum + (act.poin || 0), 0);
      
      // Load monthly settings
      const monthlySettings = await getMonthlyUserSettings(filter.month, filter.year);
      
      setStats({
        totalActivities: activities.length,
        totalPoin,
        minimalPoin: monthlySettings.minimal_poin,
        canViewPoin: monthlySettings.can_view_poin
      });
    } catch (error) {
      console.error('Error loading stats:', error);
      alert('Gagal memuat statistik dashboard: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  const getPoinStatus = () => {
    if (stats.totalPoin >= stats.minimalPoin) {
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

  const poinStatus = getPoinStatus();

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
      description: 'Lihat ringkasan dan poin aktivitas',
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
              <div className="glass-effect px-4 py-2 rounded-lg border border-green-500/20 hover:border-green-400/50 transition-all duration-300">
                <div className="text-lg font-bold text-green-400">{stats.totalActivities}</div>
                <div className="text-xs text-gray-400">Aktivitas</div>
              </div>
              {stats.canViewPoin ? (
                <>
                  <div className={`glass-effect px-4 py-2 rounded-lg border transition-all duration-300 ${poinStatus.bgColor}`}>
                    <div className={`text-lg font-bold ${poinStatus.color}`}>{stats.totalPoin}/{stats.minimalPoin}</div>
                    <div className="text-xs text-gray-400">Total Poin</div>
                  </div>
                  <div className={`glass-effect px-4 py-2 rounded-lg border transition-all duration-300 ${poinStatus.bgColor}`}>
                    <div className={`text-lg font-bold ${poinStatus.color}`}>{poinStatus.status}</div>
                    <div className="text-xs text-gray-400">Status</div>
                  </div>
                </>
              ) : (
                <>
                  <div className="glass-effect px-4 py-2 rounded-lg border border-gray-600/50 transition-all duration-300">
                    <div className="text-lg font-bold text-gray-400">-</div>
                    <div className="text-xs text-gray-400">Total Poin</div>
                    <div className="text-xs text-gray-500">Belum diizinkan</div>
                  </div>
                  <div className="glass-effect px-4 py-2 rounded-lg border border-gray-600/50 transition-all duration-300">
                    <div className="text-lg font-bold text-gray-400">-</div>
                    <div className="text-xs text-gray-400">Status</div>
                    <div className="text-xs text-gray-500">Belum diizinkan</div>
                  </div>
                </>
              )}
            </div>
            {!stats.canViewPoin && (
              <div className="mt-2 sm:mt-4 glass-effect px-4 py-2 rounded-lg border border-yellow-500/20 bg-yellow-500/5">
                <p className="text-xs text-yellow-300 text-center">
                  💡 Poin belum dapat dilihat untuk bulan ini. Hubungi admin untuk mendapatkan izin melihat poin.
                </p>
              </div>
            )}
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
                  {stats.canViewPoin && (
                    <p className="text-xs sm:text-sm mt-1 sm:mt-2">Poin: {stats.totalPoin}/{stats.minimalPoin}</p>
                  )}
                </>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};