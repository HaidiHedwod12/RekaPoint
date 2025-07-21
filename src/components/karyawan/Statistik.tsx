import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  ChartBarIcon, 
  ArrowLeftIcon,
  TrophyIcon,
  CalendarIcon,
  StarIcon,
  ArrowTrendingUpIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';
import { useNavigate } from 'react-router-dom';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { useAuth } from '../../contexts/AuthContext';
import { getAktivitasByUser } from '../../lib/database';
import { subscribeToTable, unsubscribeFromTable } from '../../lib/database';
import { getMonthlySettings } from '../../lib/database';
import { Aktivitas } from '../../types';

export const Statistik: React.FC = () => {
  const navigate = useNavigate();
  const { user, getMonthlyUserSettings } = useAuth();
  const [aktivitas, setAktivitas] = useState<Aktivitas[]>([]);
  const [loading, setLoading] = useState(true);
  const [monthlySettings, setMonthlySettings] = useState({
    minimal_poin: 150,
    can_view_poin: false
  });
  const [filter, setFilter] = useState({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear()
  });

  useEffect(() => {
    if (user) {
      loadAktivitas();
      
      // Subscribe to realtime changes for aktivitas table
      const subscription = subscribeToTable('aktivitas', (payload) => {
        console.log('Realtime aktivitas change for stats:', payload);
        
        // Only reload if the change affects current user
        if (payload.new?.user_id === user.id || payload.old?.user_id === user.id) {
          loadAktivitas();
        }
      });
      
      return () => {
        unsubscribeFromTable('aktivitas');
      };
    }
  }, [user, filter]);

  const loadAktivitas = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      console.log('Loading stats for user:', user.id, 'filter:', filter);
      
      // Load activities
      const data = await getAktivitasByUser(user.id, filter.month, filter.year);
      console.log('Activities loaded for stats:', data.length, 'items');
      setAktivitas(data);
      
      // Load monthly settings
      const settings = await getMonthlyUserSettings(filter.month, filter.year);
      setMonthlySettings(settings);
      
    } catch (error) {
      console.error('Error loading aktivitas:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate statistics
  const totalAktivitas = aktivitas.length;
  const totalPoin = aktivitas.reduce((sum, item) => sum + (item.poin || 0), 0);
  const minimalPoin = monthlySettings.minimal_poin;
  const rataRataPoin = totalAktivitas > 0 ? totalPoin / totalAktivitas : 0;
  const aktivitasTinggi = aktivitas.filter(item => (item.poin || 0) >= 80).length;

  // Performance insight based on minimal poin
  const getPerformanceInsight = () => {
    if (totalPoin >= minimalPoin) {
      if (totalPoin >= minimalPoin * 1.5) return { status: 'Excellent', color: 'text-green-400' };
      if (totalPoin >= minimalPoin * 1.2) return { status: 'Very Good', color: 'text-blue-400' };
      return { status: 'Good', color: 'text-cyan-400' };
    } else {
      return { status: 'Needs Improvement', color: 'text-red-400' };
    }
  };

  const performanceInsight = getPerformanceInsight();

  // Monthly statistics for the year
  const monthlyStats = Array.from({ length: 12 }, (_, i) => {
    const month = i + 1;
    const monthActivities = aktivitas.filter(item => {
      const itemMonth = new Date(item.tanggal).getMonth() + 1;
      return itemMonth === month;
    });
    
    return {
      month: new Date(2025, i).toLocaleDateString('id-ID', { month: 'short' }),
      count: monthActivities.length,
      poin: monthActivities.reduce((sum, item) => sum + (item.poin || 0), 0),
      average: monthActivities.length > 0 ? monthActivities.reduce((sum, item) => sum + (item.poin || 0), 0) / monthActivities.length : 0
    };
  });

  // Top performing activities
  const topActivities = monthlySettings.can_view_poin 
    ? aktivitas
        .filter(item => item.poin && item.poin >= 80)
        .sort((a, b) => (b.poin || 0) - (a.poin || 0))
        .slice(0, 5)
    : [];

  const getPoinStatus = () => {
    if (totalPoin >= minimalPoin) {
      return {
        color: 'text-green-400',
        bgColor: 'bg-green-500/20 border-green-500/50'
      };
    } else {
      return {
        color: 'text-red-400',
        bgColor: 'bg-red-500/20 border-red-500/50'
      };
    }
  };

  const poinStatus = getPoinStatus();

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
        <ChartBarIcon className="w-64 h-64 text-cyan-400" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sm:gap-0 mb-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
              <button
                onClick={() => navigate('/dashboard')}
                className="flex items-center gap-2 px-5 py-2 rounded-xl glass-effect border border-cyan-400/30 text-cyan-200 font-semibold shadow-md hover:bg-cyan-700/20 hover:text-white transition w-full sm:w-auto"
              >
                <ArrowLeftIcon className="w-5 h-5" />
                Kembali
              </button>
              <div>
                <h1 className="text-2xl sm:text-4xl font-extrabold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent mb-1 drop-shadow-lg">Statistik Aktivitas</h1>
                <div className="text-cyan-200 text-sm sm:text-lg font-medium opacity-80">Lihat ringkasan dan poin aktivitas Anda</div>
              </div>
            </div>
            
            <div className="flex space-x-4">
              <select
                value={filter.month}
                onChange={(e) => setFilter({ ...filter, month: parseInt(e.target.value) })}
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

        {/* Overview Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8"
        >
          <Card>
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full flex items-center justify-center">
                <DocumentTextIcon className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="text-2xl font-bold text-cyan-400">{aktivitas.filter(a => new Date(a.tanggal).getFullYear() === filter.year).length}</div>
                <div className="text-sm text-gray-400">Total Aktivitas Tahun {filter.year}</div>
              </div>
            </div>
          </Card>
          <Card>
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-full flex items-center justify-center">
                <CalendarIcon className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-400">{aktivitas.length}</div>
                <div className="text-sm text-gray-400">Total Aktivitas Bulan {new Date(filter.year, filter.month-1).toLocaleDateString('id-ID', { month: 'long' })}</div>
              </div>
            </div>
          </Card>
          <Card>
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-teal-600 rounded-full flex items-center justify-center">
                <StarIcon className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="text-2xl font-bold text-green-400">{monthlySettings.can_view_poin ? totalPoin : '-'}</div>
                <div className="text-sm text-gray-400">Total Poin Bulan {new Date(filter.year, filter.month-1).toLocaleDateString('id-ID', { month: 'long' })}</div>
              </div>
            </div>
          </Card>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Monthly Chart */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card>
              <h3 className="text-xl font-semibold text-white mb-6">Aktivitas Bulanan {filter.year}</h3>
              <div className="space-y-4">
                {monthlyStats.map((stat, index) => (
                  <div key={stat.month} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-medium text-white ${
                        index + 1 === filter.month ? 'bg-gradient-to-br from-cyan-500 to-blue-600' : 'bg-gradient-to-br from-gray-600 to-gray-700'
                      }`}>
                        {stat.month}
                      </div>
                      <span className="text-gray-300">{stat.count} aktivitas</span>
                    </div>
                    {monthlySettings.can_view_poin ? (
                      <div className="flex items-center space-x-4">
                        <div className="text-right">
                          <div className="text-sm font-medium text-white">{stat.poin} poin</div>
                          <div className="text-xs text-gray-400">Avg: {stat.average.toFixed(1)}</div>
                        </div>
                        <div className="w-20 h-2 bg-gray-700 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-cyan-500 to-blue-600 transition-all duration-500"
                            style={{ width: `${Math.min((stat.count / Math.max(...monthlyStats.map(s => s.count))) * 100, 100)}%` }}
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-4">
                        <div className="text-right">
                          <div className="text-sm font-medium text-gray-400">- poin</div>
                          <div className="text-xs text-gray-500">Tidak diizinkan</div>
                        </div>
                        <div className="w-20 h-2 bg-gray-700 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-gray-600 to-gray-700 transition-all duration-500"
                            style={{ width: `${Math.min((stat.count / Math.max(...monthlyStats.map(s => s.count))) * 100, 100)}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          </motion.div>

          {/* Top Activities */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6 }}
          >
            <Card>
              <h3 className="text-xl font-semibold text-white mb-6">
                {monthlySettings.can_view_poin ? 'Aktivitas Terbaik' : 'Aktivitas Terbaru'}
              </h3>
              {monthlySettings.can_view_poin && topActivities.length > 0 ? (
                <div className="space-y-4">
                  {topActivities.map((activity, index) => (
                    <div key={activity.id} className="flex items-start space-x-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                        index === 0 ? 'bg-gradient-to-br from-yellow-400 to-orange-500' :
                        index === 1 ? 'bg-gradient-to-br from-gray-300 to-gray-500' :
                        index === 2 ? 'bg-gradient-to-br from-orange-400 to-red-500' :
                        'bg-gradient-to-br from-cyan-500 to-blue-600'
                      }`}>
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-sm font-medium text-white line-clamp-2">
                            {activity.aktivitas}
                          </p>
                          <div className="flex items-center space-x-1 text-yellow-400">
                            <StarIcon className="w-4 h-4" />
                            <span className="text-sm font-bold">{activity.poin}/100</span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2 text-xs text-gray-400">
                          <CalendarIcon className="w-3 h-3" />
                          <span>{new Date(activity.tanggal).toLocaleDateString('id-ID')}</span>
                          <span>•</span>
                          <span>{activity.judul?.nama}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : monthlySettings.can_view_poin ? (
                <div className="text-center py-8">
                  <TrophyIcon className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                  <p className="text-gray-400">Belum ada aktivitas dengan poin tinggi</p>
                  <p className="text-sm text-gray-500 mt-1">Raih poin ≥80 untuk masuk daftar terbaik!</p>
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="space-y-4">
                    {aktivitas.slice(0, 5).map((activity, index) => (
                      <div key={activity.id} className="flex items-center gap-3">
                        <div className="w-7 h-7 flex-shrink-0 rounded-full flex items-center justify-center text-xs font-bold bg-gradient-to-br from-cyan-600 to-blue-600 text-white shadow-md">
                          {index + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-semibold text-white truncate max-w-xs md:max-w-md lg:max-w-lg">
                              {activity.aktivitas}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-cyan-300 mt-0.5">
                            <CalendarIcon className="w-3 h-3" />
                            <span>{new Date(activity.tanggal).toLocaleDateString('id-ID')}</span>
                            <span className="text-gray-500">•</span>
                            <span className="truncate max-w-[120px]">{activity.judul?.nama}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          </motion.div>
        </div>

        {/* Performance Insights */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="mt-8"
        >
          <Card>
            {monthlySettings.can_view_poin ? (
              <>
                <h3 className="text-xl font-semibold text-white mb-6">
                  Insight Performa - {new Date(filter.year, filter.month - 1).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="text-center">
                    <div className={`text-3xl font-bold mb-2 ${performanceInsight.color}`}>
                      {performanceInsight.status}
                    </div>
                    <p className="text-gray-400">Status Performa</p>
                    <div className={`mt-2 px-3 py-1 rounded-full text-xs font-medium border ${poinStatus.bgColor}`}>
                      {totalPoin >= minimalPoin ? 'Target Tercapai' : 'Perlu Peningkatan'}
                    </div>
                  </div>
                  
                  <div className="text-center">
                    <div className="text-3xl font-bold text-cyan-400 mb-2">
                      {Math.max(...monthlyStats.map(s => s.count))}
                    </div>
                    <p className="text-gray-400">Aktivitas Terbanyak/Bulan</p>
                  </div>
                  
                  <div className="text-center">
                    <div className="text-3xl font-bold text-purple-400 mb-2">
                      {minimalPoin}
                    </div>
                    <p className="text-gray-400">Target Minimal Poin</p>
                  </div>
                  
                  <div className="text-center">
                    <div className={`text-3xl font-bold mb-2 ${poinStatus.color}`}>
                      {totalPoin >= minimalPoin ? Math.round(((totalPoin - minimalPoin) / minimalPoin) * 100) : Math.round((totalPoin / minimalPoin) * 100)}%
                    </div>
                    <p className="text-gray-400">
                      {totalPoin >= minimalPoin ? 'Kelebihan Target' : 'Pencapaian Target'}
                    </p>
                  </div>
                </div>
              </>
            ) : (
              <>
                <h3 className="text-xl font-semibold text-white mb-6">
                  Ringkasan Aktivitas - {new Date(filter.year, filter.month - 1).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
                </h3>
                <div className="text-center py-8">
                  <ChartBarIcon className="w-16 h-16 text-gray-500 mx-auto mb-4" />
                  <p className="text-gray-400 mb-2">Insight performa belum tersedia</p>
                  <p className="text-sm text-gray-500">Admin belum memberikan izin untuk melihat poin bulan ini</p>
                  <div className="mt-4 glass-effect px-4 py-2 rounded-lg border border-gray-600/50 inline-block">
                    <div className="text-lg font-bold text-cyan-400">{totalAktivitas}</div>
                    <div className="text-xs text-gray-400">Total Aktivitas Tercatat</div>
                  </div>
                </div>
              </>
            )}
          </Card>
        </motion.div>
      </div>
    </div>
  );
};