import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  UsersIcon, 
  ClipboardDocumentListIcon, 
  ArrowDownTrayIcon, 
  CogIcon,
  MapIcon,
  ChartBarIcon,
  GlobeAltIcon,
  BuildingOfficeIcon,
  UserIcon,
  CurrencyDollarIcon,
  StarIcon
} from '@heroicons/react/24/outline';
import { MenuCard } from './MenuCard';
import { useAuth } from '../../contexts/AuthContext';
import { getAllUsers, getAllAktivitas } from '../../lib/database';
import { getReimbursementStatsByMonthYear, getReimbursementStatsByYear } from '../../lib/reimbursement';
import { Card } from '../ui/Card';

export const AdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // State untuk statistik
  const [totalKaryawan, setTotalKaryawan] = useState<number>(0);
  const [totalAktivitas, setTotalAktivitas] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear()
  });
  const [totalReimbursementMonth, setTotalReimbursementMonth] = useState<number>(0);
  const [totalReimbursementYear, setTotalReimbursementYear] = useState<number>(0);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    Promise.all([
      getAllUsers(),
      getAllAktivitas(filter.month, filter.year),
      getReimbursementStatsByMonthYear(filter.month, filter.year),
      getReimbursementStatsByYear(filter.year)
    ]).then(([users, aktivitas, reimbursementMonth, reimbursementYear]) => {
      if (!isMounted) return;
      setTotalKaryawan(users.filter(u => u.role === 'karyawan').length);
      setTotalAktivitas(aktivitas.length);
      setTotalReimbursementMonth(reimbursementMonth);
      setTotalReimbursementYear(reimbursementYear);
      setLoading(false);
    });
    return () => { isMounted = false; };
  }, [filter]);

  const menuItems = [
    {
      title: 'Manajemen Karyawan',
      description: 'Kelola akun karyawan dan jabatan',
      icon: UsersIcon,
      iconBg: 'from-purple-500 to-pink-600',
      onClick: () => navigate('/admin/karyawan')
    },
    {
      title: 'Profil Karyawan',
      description: 'Kelola informasi dan dokumen karyawan',
      icon: UserIcon,
      iconBg: 'from-indigo-500 to-purple-600',
      onClick: () => navigate('/admin/profil-karyawan')
    },
    {
      title: 'Reimbursement',
      description: 'Kelola permintaan reimbursement karyawan',
      icon: CurrencyDollarIcon,
      iconBg: 'from-emerald-500 to-green-600',
      onClick: () => navigate('/admin/reimbursement')
    },
    {
      title: 'Penilaian Aktivitas',
      description: 'Nilai aktivitas harian karyawan',
      icon: ClipboardDocumentListIcon,
      iconBg: 'from-green-500 to-teal-600',
      onClick: () => navigate('/admin/penilaian')
    },
    {
      title: 'Ekspor Data',
      description: 'Unduh laporan aktivitas karyawan',
      icon: ArrowDownTrayIcon,
      iconBg: 'from-orange-500 to-red-600',
      onClick: () => navigate('/admin/ekspor')
    },
    {
      title: 'Pengaturan',
      description: 'Kelola judul dan subjudul aktivitas',
      icon: CogIcon,
      iconBg: 'from-cyan-500 to-blue-600',
      onClick: () => navigate('/admin/pengaturan')
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
      <div className="fixed top-32 right-20 opacity-10">
        <MapIcon className="w-64 h-64 text-cyan-400" />
      </div>
      <div className="fixed bottom-20 left-20 opacity-10">
        <ChartBarIcon className="w-48 h-48 text-blue-400" />
      </div>
      <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 opacity-5">
        <GlobeAltIcon className="w-96 h-96 text-cyan-300" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full mb-6 pulse-glow"
          >
            <BuildingOfficeIcon className="w-10 h-10 text-white" />
          </motion.div>
          
          <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent mb-4">
            Selamat Datang, {user?.nama}
          </h1>
          <p className="text-xl text-gray-300 mb-2">
            Panel Admin RekaPoint
          </p>
          <p className="text-gray-400">
            Kelola sistem aktivitas karyawan PT Rekadwipa Teknika Studio
          </p>
          
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 }}
            className="mt-6 inline-flex items-center space-x-2 glass-effect px-6 py-3 rounded-full border border-cyan-500/30"
          >
            <MapIcon className="w-5 h-5 text-cyan-400" />
            <span className="text-cyan-300 font-medium">GIS & Survey Management System</span>
          </motion.div>
        </motion.div>

        {/* Menu Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
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

        {/* Filter Bulan & Tahun */}
        <div className="flex flex-wrap items-center justify-end gap-4 mb-8">
          <select
            value={filter.month}
            onChange={e => setFilter({ ...filter, month: parseInt(e.target.value) })}
            className="px-4 py-2 glass-effect border border-gray-600/50 rounded-lg text-white bg-slate-800/50 focus:outline-none focus:ring-2 focus:ring-cyan-400 [&>option]:bg-slate-800 [&>option]:text-white"
          >
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i + 1} value={i + 1} className="bg-slate-800 text-white">
                {new Date(2025, i).toLocaleDateString('id-ID', { month: 'long' })}
              </option>
            ))}
          </select>
          <select
            value={filter.year}
            onChange={e => setFilter({ ...filter, year: parseInt(e.target.value) })}
            className="px-4 py-2 glass-effect border border-gray-600/50 rounded-lg text-white bg-slate-800/50 focus:outline-none focus:ring-2 focus:ring-cyan-400 [&>option]:bg-slate-800 [&>option]:text-white"
          >
            {Array.from({ length: 5 }, (_, i) => (
              <option key={2025 + i} value={2025 + i} className="bg-slate-800 text-white">
                {2025 + i}
              </option>
            ))}
          </select>
        </div>

        {/* Stats cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2 }}
          className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8"
        >
          <Card className="text-center">
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center mb-3">
                <UsersIcon className="w-7 h-7 text-white" />
              </div>
              <div className="text-3xl font-bold text-cyan-400 mb-1">
                {loading ? <span className="animate-pulse">...</span> : totalKaryawan}
              </div>
              <div className="text-gray-400">Total Karyawan</div>
            </div>
          </Card>
          <Card className="text-center">
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-500 to-teal-600 flex items-center justify-center mb-3">
                <ClipboardDocumentListIcon className="w-7 h-7 text-white" />
              </div>
              <div className="text-3xl font-bold text-green-400 mb-1">
                {loading ? <span className="animate-pulse">...</span> : totalAktivitas}
              </div>
              <div className="text-gray-400">Aktivitas Bulan Ini</div>
            </div>
          </Card>
          <Card className="text-center">
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center mb-3">
                <CurrencyDollarIcon className="w-7 h-7 text-white" />
              </div>
              <div className="text-3xl font-bold text-emerald-400 mb-1">
                {loading ? <span className="animate-pulse">...</span> : `Rp ${totalReimbursementMonth.toLocaleString('id-ID')}`}
              </div>
              <div className="text-gray-400">Reimbursement Bulan Ini</div>
            </div>
          </Card>
          <Card className="text-center">
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center mb-3">
                <CurrencyDollarIcon className="w-7 h-7 text-white" />
              </div>
              <div className="text-3xl font-bold text-blue-400 mb-1">
                {loading ? <span className="animate-pulse">...</span> : `Rp ${totalReimbursementYear.toLocaleString('id-ID')}`}
              </div>
              <div className="text-gray-400">Reimbursement Tahun Ini</div>
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};