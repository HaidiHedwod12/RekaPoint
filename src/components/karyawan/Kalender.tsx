import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  CalendarIcon, 
  ArrowLeftIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  StarIcon,
  DocumentTextIcon,
  PencilIcon,
  DocumentDuplicateIcon,
  TrashIcon,
  DocumentArrowDownIcon
} from '@heroicons/react/24/outline';
import { useNavigate } from 'react-router-dom';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { useAuth } from '../../contexts/AuthContext';
import { getAktivitasByUser } from '../../lib/database';
import { exportActivitiesToExcel } from '../../lib/excelImport';
import { subscribeToTable, unsubscribeFromTable } from '../../lib/database';
import { Aktivitas } from '../../types';

export const Kalender: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [aktivitas, setAktivitas] = useState<Aktivitas[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  useEffect(() => {
    if (user) {
      loadAktivitas();
      
      // Subscribe to realtime changes for aktivitas table
      const subscription = subscribeToTable('aktivitas', (payload) => {
        console.log('Realtime aktivitas change for calendar:', payload);
        
        // Only reload if the change affects current user
        if (payload.new?.user_id === user.id || payload.old?.user_id === user.id) {
          loadAktivitas();
        }
      });
      
      return () => {
        unsubscribeFromTable('aktivitas');
      };
    }
  }, [user, currentDate]);

  const loadAktivitas = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      console.log('Loading aktivitas for calendar:', user.id, 'month:', currentDate.getMonth() + 1, 'year:', currentDate.getFullYear());
      const data = await getAktivitasByUser(
        user.id, 
        currentDate.getMonth() + 1, 
        currentDate.getFullYear()
      );
      console.log('Calendar aktivitas loaded:', data.length, 'items');
      setAktivitas(data);
    } catch (error) {
      console.error('Error loading aktivitas:', error);
      alert('Gagal memuat data kalender: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    // Add all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }
    
    return days;
  };

  const getActivitiesForDate = (date: Date) => {
    return aktivitas.filter(activity => {
      const activityDate = new Date(activity.tanggal);
      return activityDate.toDateString() === date.toDateString();
    });
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1);
      } else {
        newDate.setMonth(prev.getMonth() + 1);
      }
      return newDate;
    });
    setSelectedDate(null);
  };

  const getDayColor = (activities: Aktivitas[]) => {
    if (activities.length === 0) return '';
    
    const avgPoin = activities.reduce((sum, act) => sum + (act.poin || 0), 0) / activities.length;
    
    if (avgPoin >= 80) return 'bg-green-500/20 border-green-500/50';
    if (avgPoin >= 60) return 'bg-yellow-500/20 border-yellow-500/50';
    if (avgPoin >= 40) return 'bg-orange-500/20 border-orange-500/50';
    return 'bg-red-500/20 border-red-500/50';
  };

  // State for edit modal
  const [editItem, setEditItem] = useState<Aktivitas | null>(null);
  const [editForm, setEditForm] = useState({
    tanggal: '',
    aktivitas: '',
    deskripsi: ''
  });

  const handleEdit = (activity: Aktivitas) => {
    setEditItem(activity);
    setEditForm({
      tanggal: activity.tanggal,
      aktivitas: activity.aktivitas,
      deskripsi: activity.deskripsi || ''
    });
  };

  const handleEditSave = async () => {
    if (!editItem || !user) return;
    
    try {
      // Import updateAktivitas function
      const { updateAktivitas } = await import('../../lib/database');
      
      await updateAktivitas(editItem.id, {
        tanggal: editForm.tanggal,
        aktivitas: editForm.aktivitas,
        deskripsi: editForm.deskripsi
      });
      
      await loadAktivitas();
      setEditItem(null);
      alert('Aktivitas berhasil diperbarui!');
    } catch (error) {
      console.error('Error updating aktivitas:', error);
      alert('Gagal memperbarui aktivitas!');
    }
  };

  const handleDuplicate = async (activity: Aktivitas) => {
    if (!user) return;
    
    try {
      // Import createAktivitas function
      const { createAktivitas } = await import('../../lib/database');
      
      // Buat aktivitas baru dengan data yang sama, menggunakan tanggal asli
      const duplicateData = {
        user_id: user.id,
        judul_id: activity.judul_id,
        subjudul_id: activity.subjudul_id,
        aktivitas: activity.aktivitas,
        deskripsi: activity.deskripsi || '',
        tanggal: activity.tanggal, // Gunakan tanggal asli
        poin: activity.poin || 0
      };
      
      await createAktivitas(duplicateData);
      await loadAktivitas();
      alert('Aktivitas berhasil diduplikasi! Aktivitas baru dibuat dengan tanggal yang sama.');
    } catch (error) {
      console.error('Error duplicating aktivitas:', error);
      alert('Gagal menduplikasi aktivitas!');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus aktivitas ini?')) return;
    
    try {
      // Import deleteAktivitas function
      const { deleteAktivitas } = await import('../../lib/database');
      
      await deleteAktivitas(id);
      await loadAktivitas();
      alert('Aktivitas berhasil dihapus!');
    } catch (error) {
      console.error('Error deleting aktivitas:', error);
      alert('Gagal menghapus aktivitas!');
    }
  };

  const handleExportExcel = () => {
    if (aktivitas.length === 0) {
      alert('Tidak ada data aktivitas untuk diekspor!');
      return;
    }

    const monthName = currentDate.toLocaleDateString('id-ID', { month: 'long' });
    const year = currentDate.getFullYear();
    const filename = `Aktivitas_${user?.nama}_${monthName}_${year}.xlsx`;
    
    exportActivitiesToExcel(aktivitas, filename);
  };

  const days = getDaysInMonth(currentDate);
  const monthName = currentDate.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
  const selectedActivities = selectedDate ? getActivitiesForDate(selectedDate) : [];

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
        <CalendarIcon className="w-64 h-64 text-cyan-400" />
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
                <h1 className="text-2xl sm:text-4xl font-extrabold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent mb-1 drop-shadow-lg">Kalender Aktivitas</h1>
                <div className="text-cyan-200 text-sm sm:text-lg font-medium opacity-80">Lihat aktivitas dalam tampilan kalender</div>
              </div>
            </div>
            
            <div className="flex justify-end">
              <Button
                onClick={handleExportExcel}
                variant="outline" 
                className="border-green-500/50 text-green-300"
                disabled={aktivitas.length === 0}
              >
                <DocumentArrowDownIcon className="w-5 h-5 mr-2" />
                Export Excel
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Calendar */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="lg:col-span-2"
            >
              <Card>
                {/* Calendar Header */}
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-white">{monthName}</h2>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigateMonth('prev')}
                      className="border-gray-600/50 text-gray-300"
                    >
                      <ChevronLeftIcon className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigateMonth('next')}
                      className="border-gray-600/50 text-gray-300"
                    >
                      <ChevronRightIcon className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-7 gap-2 mb-4">
                  {['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'].map(day => (
                    <div key={day} className="text-center text-sm font-medium text-gray-400 py-2">
                      {day}
                    </div>
                  ))}
                </div>

                {/* Calendar Grid */}
                <div className="grid grid-cols-7 gap-2">
                  {days.map((day, index) => {
                    if (!day) {
                      return <div key={index} className="h-16" />;
                    }

                    const dayActivities = getActivitiesForDate(day);
                    const isSelected = selectedDate?.toDateString() === day.toDateString();
                    const isToday = day.toDateString() === new Date().toDateString();

                    return (
                      <motion.button
                        key={day.toISOString()}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setSelectedDate(day)}
                        className={`h-16 rounded-lg border transition-all duration-200 relative ${
                          isSelected 
                            ? 'border-cyan-400 bg-cyan-500/20' 
                            : dayActivities.length > 0
                            ? getDayColor(dayActivities)
                            : 'border-gray-700/50 hover:border-gray-600/50'
                        } ${isToday ? 'ring-2 ring-cyan-400/50' : ''}`}
                      >
                        <div className="flex flex-col items-center justify-center h-full">
                          <span className={`text-sm font-medium ${
                            isSelected ? 'text-cyan-300' : 'text-gray-300'
                          }`}>
                            {day.getDate()}
                          </span>
                          {dayActivities.length > 0 && (
                            <div className="flex items-center space-x-1 mt-1">
                              <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full" />
                              <span className="text-xs text-cyan-300">{dayActivities.length}</span>
                            </div>
                          )}
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              </Card>
            </motion.div>

            {/* Activity Details */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Card>
                <h3 className="text-xl font-semibold text-white mb-6">
                  {selectedDate 
                    ? `Aktivitas ${selectedDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'long' })}`
                    : 'Pilih Tanggal'
                  }
                </h3>

                {selectedDate ? (
                  <div>
                    {selectedActivities.length > 0 && (
                      <div className="space-y-4 mb-4">
                        {selectedActivities.map((activity) => (
                          <div key={activity.id} className="glass-effect rounded-lg p-4 border border-gray-700/50">
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex-1">
                                <h4 className="font-medium text-white mb-1">{activity.judul?.nama}</h4>
                                <p className="text-sm text-cyan-300">{activity.subjudul?.nama}</p>
                              </div>
                              {/* Action Buttons */}
                              <div className="flex gap-1">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="border-cyan-500/50 text-cyan-300 text-xs px-2 py-1"
                                  onClick={() => handleEdit(activity)}
                                >
                                  <PencilIcon className="w-3 h-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="border-blue-500/50 text-blue-300 text-xs px-2 py-1"
                                  onClick={() => handleDuplicate(activity)}
                                >
                                  <DocumentDuplicateIcon className="w-3 h-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="border-red-500/50 text-red-300 text-xs px-2 py-1"
                                  onClick={() => handleDelete(activity.id)}
                                >
                                  <TrashIcon className="w-3 h-3" />
                                </Button>
                              </div>
                            </div>
                            <p className="text-gray-300 text-sm mb-2">{activity.aktivitas}</p>
                            {activity.deskripsi && (
                              <p className="text-gray-400 text-xs">{activity.deskripsi}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {selectedActivities.length === 0 && (
                      <div className="text-center py-8">
                        <DocumentTextIcon className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                        <p className="text-gray-400">Tidak ada aktivitas pada tanggal ini</p>
                      </div>
                    )}
                    
                    <div className="text-center">
                      <Button
                        onClick={() => {
                          if (selectedDate) {
                            const year = selectedDate.getFullYear();
                            const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
                            const day = String(selectedDate.getDate()).padStart(2, '0');
                            const dateString = `${year}-${month}-${day}`;
                            navigate('/karyawan/tambah', { state: { selectedDate: dateString } });
                          }
                        }}
                        className="bg-gradient-to-r from-green-500 to-teal-600"
                        size="sm"
                      >
                        Tambah Aktivitas
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <CalendarIcon className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                    <p className="text-gray-400">Klik pada tanggal untuk melihat aktivitas</p>
                  </div>
                )}
              </Card>

              {/* Monthly Summary */}
              <Card className="mt-6">
                <h3 className="text-lg font-semibold text-white mb-4">Ringkasan Bulan Ini</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Total Aktivitas</span>
                    <span className="text-cyan-400 font-medium">{aktivitas.length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Total Poin</span>
                    <span className={`font-medium ${user?.can_view_poin ? 'text-green-400' : 'text-gray-500'}`}>
                      {user?.can_view_poin ? aktivitas.reduce((sum, act) => sum + (act.poin || 0), 0) : '-'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Hari Aktif</span>
                    <span className="text-purple-400 font-medium">
                      {new Set(aktivitas.map(act => new Date(act.tanggal).toDateString())).size}
                    </span>
                  </div>
                </div>
              </Card>
            </motion.div>
          </div>
        </motion.div>
      </div>

      {/* Edit Modal */}
      {editItem && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-xl p-8 w-full max-w-lg border border-cyan-500/30">
            <h2 className="text-xl font-bold text-cyan-300 mb-4">Edit Aktivitas</h2>
            <div className="space-y-3">
              <label className="block text-sm text-gray-300">Tanggal</label>
              <input type="date" className="w-full px-3 py-2 rounded bg-slate-700 text-white"
                value={editForm.tanggal?.slice(0,10) || ''}
                onChange={e => setEditForm({ ...editForm, tanggal: e.target.value })}
              />
              <label className="block text-sm text-gray-300">Aktivitas</label>
              <input type="text" className="w-full px-3 py-2 rounded bg-slate-700 text-white"
                value={editForm.aktivitas || ''}
                onChange={e => setEditForm({ ...editForm, aktivitas: e.target.value })}
              />
              <label className="block text-sm text-gray-300">Deskripsi</label>
              <textarea className="w-full px-3 py-2 rounded bg-slate-700 text-white"
                value={editForm.deskripsi || ''}
                onChange={e => setEditForm({ ...editForm, deskripsi: e.target.value })}
              />
            </div>
            <div className="flex gap-2 mt-6 justify-end">
              <Button variant="outline" onClick={() => setEditItem(null)} className="text-gray-300">Batal</Button>
              <Button variant="outline" onClick={handleEditSave} className="text-cyan-300 border-cyan-500/50">Simpan</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};