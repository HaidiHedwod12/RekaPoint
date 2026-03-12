import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  ChartBarIcon,
  ArrowLeftIcon,
  CalendarIcon,
  ArrowTrendingUpIcon,
  DocumentTextIcon,
  FireIcon,
  CheckCircleIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import { useNavigate } from 'react-router-dom';
import { Card } from '../ui/Card';
import { useAuth } from '../../contexts/AuthContext';
import { getAktivitasByUser, getAllJudul } from '../../lib/database';
import { subscribeToTable, unsubscribeFromTable } from '../../lib/database';
import { Aktivitas, Judul } from '../../types';

export const Statistik: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  // aktivitasBulan: activities for selected month (for month-specific stats)
  const [aktivitasBulan, setAktivitasBulan] = useState<Aktivitas[]>([]);
  // aktivitasTahun: activities for the entire selected year (for monthly chart)
  const [aktivitasTahun, setAktivitasTahun] = useState<Aktivitas[]>([]);
  const [allJuduls, setAllJuduls] = useState<Judul[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear()
  });

  useEffect(() => {
    if (user) {
      loadData();

      const subscription = subscribeToTable('aktivitas', (payload) => {
        if (payload.new?.user_id === user.id || payload.old?.user_id === user.id) {
          loadData();
        }
      });

      return () => {
        unsubscribeFromTable('aktivitas');
      };
    }
  }, [user, filter]);

  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Load all three in parallel
      const [bulan, tahun, juduls] = await Promise.all([
        // Monthly data — filtered by month+year for current-month stats
        getAktivitasByUser(user.id, filter.month, filter.year),
        // Yearly data — only year filter so all months are included in chart
        getAktivitasByUser(user.id, undefined, filter.year),
        getAllJudul()
      ]);
      setAktivitasBulan(bulan);
      setAktivitasTahun(tahun);
      setAllJuduls(juduls);
    } catch (error) {
      console.error('Error loading statistik:', error);
    } finally {
      setLoading(false);
    }
  };

  // === Statistics Calculations ===

  // Use aktivitasBulan for current-month stats
  const totalBulan = aktivitasBulan.length;

  // Unique active days this month
  const hariAktif = new Set(aktivitasBulan.map(a => a.tanggal.slice(0, 10))).size;

  // Category breakdown: ALL juduls shown, even those with 0 activities
  const byJudulId: Record<string, number> = {};
  aktivitasBulan.forEach(a => {
    const key = a.judul_id || '__unknown__';
    byJudulId[key] = (byJudulId[key] || 0) + 1;
  });
  // Build full list from allJuduls (always shows all), sorted descending
  const judulEntries: [string, number][] = allJuduls
    .map(j => [j.nama, byJudulId[j.id] || 0] as [string, number])
    .sort((a, b) => b[1] - a[1]);

  if (byJudulId['__unknown__'] > 0) {
    judulEntries.push(['Lainnya', byJudulId['__unknown__']]);
  }

  // Monthly stats: use aktivitasTahun (full year) grouped by month
  const monthlyStats = Array.from({ length: 12 }, (_, i) => {
    const month = i + 1;
    const count = aktivitasTahun.filter(item => {
      const itemMonth = parseInt(item.tanggal.slice(5, 7));
      return itemMonth === month;
    }).length;
    return {
      monthLabel: new Date(filter.year, i).toLocaleDateString('id-ID', { month: 'short' }),
      monthIndex: month,
      count,
    };
  });

  const maxCount = Math.max(...monthlyStats.map(s => s.count), 1);

  // Performance label based on daily average activity count
  const getPerformanceLabel = () => {
    const now = new Date();
    const isCurrentMonth = filter.year === now.getFullYear() && filter.month === (now.getMonth() + 1);
    const isPastMonth = filter.year < now.getFullYear() || (filter.year === now.getFullYear() && filter.month < (now.getMonth() + 1));
    
    let divisor = 1;
    if (isCurrentMonth) {
      divisor = now.getDate();
    } else if (isPastMonth) {
      divisor = new Date(filter.year, filter.month, 0).getDate();
    } else {
      divisor = 1; // Future month
    }

    const average = totalBulan / divisor;

    if (totalBulan === 0) return { label: 'Belum Ada Aktivitas', color: 'text-red-400', bg: 'bg-red-500/20 border-red-500/50', average };
    if (average >= 3) return { label: 'Sangat Aktif', color: 'text-green-400', bg: 'bg-green-500/20 border-green-500/50', average };
    if (average >= 2) return { label: 'Aktif', color: 'text-cyan-400', bg: 'bg-cyan-500/20 border-cyan-500/50', average };
    if (average >= 1) return { label: 'Cukup Aktif', color: 'text-yellow-400', bg: 'bg-yellow-500/20 border-yellow-500/50', average };
    return { label: 'Perlu Ditingkatkan', color: 'text-orange-400', bg: 'bg-orange-500/20 border-orange-500/50', average };
  };

  const performance = getPerformanceLabel();

  // Recent 5 activities (from monthly data)
  const recentActivities = [...aktivitasBulan]
    .sort((a, b) => b.tanggal.localeCompare(a.tanggal))
    .slice(0, 5);

  const selectedMonthLabel = new Date(filter.year, filter.month - 1).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-16 h-16 border-4 border-gray-600 border-t-cyan-400 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 relative">
      {/* Background decorative icon */}
      <div className="fixed top-20 right-20 opacity-10">
        <ChartBarIcon className="w-64 h-64 text-cyan-400" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
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
                <div className="text-cyan-200 text-sm sm:text-lg font-medium opacity-80">Pantau performa dan perkembangan aktivitas Anda</div>
              </div>
            </div>

            <div className="flex space-x-3">
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

        {/* Overview Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8"
        >
          <Card>
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                <DocumentTextIcon className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="text-3xl font-bold text-cyan-400">{totalBulan}</div>
                <div className="text-sm text-gray-400">Total Aktivitas — {selectedMonthLabel}</div>
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center flex-shrink-0">
                <CalendarIcon className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="text-3xl font-bold text-purple-400">{hariAktif}</div>
                <div className="text-sm text-gray-400">Hari Aktif Bulan Ini</div>
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-500 rounded-full flex items-center justify-center flex-shrink-0">
                <FireIcon className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className={`text-xl font-bold ${performance.color}`}>{performance.label}</div>
                <div className="text-sm text-gray-400">Status Performa</div>
                <div className={`mt-1 px-2 py-0.5 rounded-full text-xs font-medium border inline-block ${performance.bg}`}>
                  Rata-rata {performance.average.toFixed(1)} keg./hari
                </div>
              </div>
            </div>
          </Card>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column: Monthly Chart & Recent Activities */}
          <div className="space-y-6">
            {/* Monthly Bar Chart */}
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}>
              <Card>
                <h3 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
                  <ChartBarIcon className="w-5 h-5 text-cyan-400" />
                  Aktivitas Bulanan {filter.year}
                </h3>
                <div className="space-y-3">
                  {monthlyStats.map((stat) => {
                    const pct = maxCount > 0 ? (stat.count / maxCount) * 100 : 0;
                    const isCurrentMonth = stat.monthIndex === filter.month;
                    return (
                      <div key={stat.monthLabel} className="flex items-center gap-3">
                        <div
                          className={`w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold text-white flex-shrink-0 ${
                            isCurrentMonth
                              ? 'bg-gradient-to-br from-cyan-500 to-blue-600 shadow-lg shadow-cyan-500/30'
                              : 'bg-slate-700'
                          }`}
                        >
                          {stat.monthLabel}
                        </div>
                        <div className="flex-1 h-2.5 bg-gray-700/60 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-700 ${
                              isCurrentMonth
                                ? 'bg-gradient-to-r from-cyan-400 to-blue-500'
                                : 'bg-gradient-to-r from-slate-500 to-slate-600'
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className={`text-sm font-semibold w-6 text-right ${isCurrentMonth ? 'text-cyan-400' : 'text-gray-400'}`}>
                          {stat.count}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </Card>
            </motion.div>

            {/* Recent Activities */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
              <Card>
                <h3 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
                  <ClockIcon className="w-5 h-5 text-blue-400" />
                  Aktivitas Terbaru
                </h3>
                {recentActivities.length > 0 ? (
                  <div className="space-y-4">
                    {recentActivities.map((activity, index) => (
                      <div key={activity.id} className="flex items-start gap-3">
                        <div className="w-7 h-7 flex-shrink-0 rounded-full flex items-center justify-center text-xs font-bold bg-gradient-to-br from-cyan-600 to-blue-600 text-white shadow-md">
                          {index + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-white truncate">{activity.aktivitas}</p>
                          <div className="flex items-center gap-2 text-xs text-cyan-300 mt-0.5">
                            <CalendarIcon className="w-3 h-3 flex-shrink-0" />
                            <span>{new Date(activity.tanggal).toLocaleDateString('id-ID')}</span>
                            <span className="text-gray-500">•</span>
                            <span className="truncate">{activity.judul?.nama || activity.judul_nama || '(Lainnya)'}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <DocumentTextIcon className="w-12 h-12 text-gray-500 mx-auto mb-3" />
                    <p className="text-gray-400">Belum ada aktivitas</p>
                  </div>
                )}
              </Card>
            </motion.div>
          </div>

          {/* Right Column: Category Breakdown & Performance Insight */}
          <div className="space-y-6">
            {/* Category Breakdown */}
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }}>
              <Card>
                <h3 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
                  <ArrowTrendingUpIcon className="w-5 h-5 text-purple-400" />
                  Breakdown per Kategori
                </h3>
                {judulEntries.length > 0 ? (
                  <div className="space-y-4">
                    {judulEntries.map(([nama, count], idx) => {
                      const pct = totalBulan > 0 ? (count / totalBulan) * 100 : 0;
                      const colors = [
                        'from-cyan-400 to-blue-500',
                        'from-purple-400 to-pink-500',
                        'from-green-400 to-teal-500',
                        'from-orange-400 to-red-500',
                        'from-yellow-400 to-amber-500',
                      ];
                      const color = colors[idx % colors.length];
                      return (
                        <div key={nama}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-gray-300 truncate max-w-[200px]" title={nama}>{nama}</span>
                            <span className="text-white font-semibold ml-2">{count} <span className="text-gray-400 font-normal">({pct.toFixed(0)}%)</span></span>
                          </div>
                          <div className="h-2 bg-gray-700/60 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full bg-gradient-to-r ${color} transition-all duration-700`} style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <ChartBarIcon className="w-12 h-12 text-gray-500 mx-auto mb-3" />
                    <p className="text-gray-400">Belum ada aktivitas bulan ini</p>
                  </div>
                )}
              </Card>
            </motion.div>

            {/* Performance Summary */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
              <Card>
                <h3 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
                  <CheckCircleIcon className="w-5 h-5 text-green-400" />
                  Insight Performa — {selectedMonthLabel}
                </h3>
                <div className="grid grid-cols-2 gap-5">
                  <div className="glass-effect rounded-xl p-4 border border-cyan-500/20 text-center">
                    <div className="text-3xl font-extrabold text-cyan-400 mb-1">{totalBulan}</div>
                    <div className="text-xs text-gray-400">Total Aktivitas</div>
                  </div>
                  <div className="glass-effect rounded-xl p-4 border border-purple-500/20 text-center">
                    <div className="text-3xl font-extrabold text-purple-400 mb-1">{hariAktif}</div>
                    <div className="text-xs text-gray-400">Hari Aktif</div>
                  </div>
                  <div className="glass-effect rounded-xl p-4 border border-blue-500/20 text-center">
                    <div className="text-3xl font-extrabold text-blue-400 mb-1">
                      {performance.average.toFixed(1)}
                    </div>
                    <div className="text-xs text-gray-400">Rata-rata / Hari</div>
                  </div>
                  <div className="glass-effect rounded-xl p-4 border border-orange-500/20 text-center">
                    <div className={`text-2xl font-extrabold mb-1 ${performance.color}`}>{performance.label}</div>
                    <div className="text-xs text-gray-400">Status</div>
                  </div>
                </div>

                {/* Progress guide */}
                <div className="mt-5 space-y-2">
                  <p className="text-xs text-gray-500 mb-2">Panduan Performa:</p>
                  {[
                    { label: 'Sangat Aktif', min: 3, color: 'bg-green-500' },
                    { label: 'Aktif', min: 2, color: 'bg-cyan-500' },
                    { label: 'Cukup Aktif', min: 1, color: 'bg-yellow-500' },
                    { label: 'Perlu Ditingkatkan', min: 0, color: 'bg-orange-500' },
                  ].map(tier => (
                    <div key={tier.label} className="flex items-center gap-2 text-xs">
                      <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${tier.color}`} />
                      <span className="text-gray-400">{tier.label}</span>
                      <span className="text-gray-600">— ≥{tier.min} keg./hari</span>
                      {tier.label !== 'Perlu Ditingkatkan' ? (
                        performance.average >= tier.min && (
                          <CheckCircleIcon className="w-3.5 h-3.5 text-green-400 ml-auto" />
                        )
                      ) : (
                        performance.average < 1 && totalBulan > 0 && (
                          <CheckCircleIcon className="w-3.5 h-3.5 text-green-400 ml-auto" />
                        )
                      )}
                    </div>
                  ))}
                </div>
              </Card>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
};