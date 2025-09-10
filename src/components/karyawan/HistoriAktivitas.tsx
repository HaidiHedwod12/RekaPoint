import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  ClockIcon, 
  ArrowLeftIcon,
  CalendarIcon,
  DocumentTextIcon,
  StarIcon,
  PencilIcon,
  TrashIcon,
  DocumentDuplicateIcon,
  DocumentIcon,
  DocumentArrowDownIcon
} from '@heroicons/react/24/outline';
import { useNavigate } from 'react-router-dom';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { useAuth } from '../../contexts/AuthContext';
import { getAktivitasByUser, deleteAktivitas, updateAktivitas, createAktivitas } from '../../lib/database';
import { exportActivitiesToExcel } from '../../lib/excelImport';
import { subscribeToTable, unsubscribeFromTable } from '../../lib/database';
import { Aktivitas } from '../../types';
import { format } from 'date-fns';

export const HistoriAktivitas: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [aktivitas, setAktivitas] = useState<Aktivitas[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear()
  });
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [editItem, setEditItem] = useState<Aktivitas | null>(null);
  const [editForm, setEditForm] = useState<any>({});

  useEffect(() => {
    if (user) {
      loadAktivitas();
      
      // Subscribe to realtime changes for aktivitas table
      const subscription = subscribeToTable('aktivitas', (payload) => {
        console.log('Realtime aktivitas change:', payload);
        
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
      console.log('Loading aktivitas for user:', user.id, 'filter:', filter);
      const data = await getAktivitasByUser(user.id, filter.month, filter.year);
      console.log('Aktivitas loaded:', data.length, 'items');
      setAktivitas(data);
    } catch (error) {
      console.error('Error loading aktivitas:', error);
      alert('Gagal memuat histori aktivitas: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Yakin ingin menghapus aktivitas ini?')) {
      try {
        console.log('Deleting aktivitas:', id);
        await deleteAktivitas(id);
        console.log('Aktivitas deleted successfully');
        await loadAktivitas();
        alert('Aktivitas berhasil dihapus!');
      } catch (error) {
        console.error('Error deleting aktivitas:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        alert('Gagal menghapus aktivitas: ' + errorMessage);
      }
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`Yakin ingin menghapus ${selectedIds.length} aktivitas terpilih?`)) return;
    try {
      await Promise.all(selectedIds.map(id => deleteAktivitas(id)));
      setSelectedIds([]);
      await loadAktivitas();
      alert('Aktivitas terpilih berhasil dihapus!');
    } catch (error) {
      alert('Gagal menghapus aktivitas terpilih!');
    }
  };
  const handleEditSave = async () => {
    if (!editItem) return;
    try {
      await updateAktivitas(editItem.id, editForm);
      setEditItem(null);
      setEditForm({});
      await loadAktivitas();
      alert('Aktivitas berhasil diupdate!');
    } catch (error) {
      alert('Gagal update aktivitas!');
    }
  };

  const handleDuplicate = async (item: Aktivitas) => {
    if (!user) return;
    
    try {
      // Buat aktivitas baru dengan data yang sama, menggunakan tanggal asli
      const duplicateData = {
        user_id: user.id,
        judul_id: item.judul_id,
        subjudul_id: item.subjudul_id,
        aktivitas: item.aktivitas,
        deskripsi: item.deskripsi || '',
        tanggal: item.tanggal, // Gunakan tanggal asli
        poin: item.poin || 0
      };
      
      // Panggil fungsi create aktivitas
      await createAktivitas(duplicateData);
      await loadAktivitas();
      alert('Aktivitas berhasil diduplikasi! Aktivitas baru dibuat dengan tanggal yang sama.');
    } catch (error) {
      console.error('Error duplicating aktivitas:', error);
      alert('Gagal menduplikasi aktivitas!');
    }
  };

  const handleExportExcel = () => {
    if (aktivitas.length === 0) {
      alert('Tidak ada data aktivitas untuk diekspor!');
      return;
    }

    const monthName = new Date(2024, filter.month - 1).toLocaleDateString('id-ID', { month: 'long' });
    const filename = `Aktivitas_${user?.nama}_${monthName}_${filter.year}.xlsx`;
    
    exportActivitiesToExcel(aktivitas, filename);
  };

  const getPoinColor = (poin: number) => {
    if (poin >= 80) return 'text-green-400';
    if (poin >= 60) return 'text-yellow-400';
    if (poin >= 40) return 'text-orange-400';
    return 'text-red-400';
  };

  const getPoinBadge = (poin: number) => {
    if (poin >= 80) return 'bg-green-500/20 text-green-300 border-green-500/30';
    if (poin >= 60) return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
    if (poin >= 40) return 'bg-orange-500/20 text-orange-300 border-orange-500/30';
    return 'bg-red-500/20 text-red-300 border-red-500/30';
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
        <ClockIcon className="w-64 h-64 text-cyan-400" />
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
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
                <h1 className="text-2xl sm:text-4xl font-extrabold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent mb-1 drop-shadow-lg">Histori Aktivitas</h1>
                <div className="text-cyan-200 text-sm sm:text-lg font-medium opacity-80">Lihat aktivitas yang sudah dicatat</div>
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
        </motion.div>

        {/* Summary Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8"
        >
          <div className="glass-effect border border-cyan-500/20 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-cyan-400">{aktivitas.length}</div>
            <div className="text-sm text-gray-400">Total Aktivitas</div>
          </div>
          
          {/* Only show total poin if user has permission */}
          {user?.can_view_poin ? (
            <div className="glass-effect border border-green-500/20 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-green-400">
                {aktivitas.reduce((sum, item) => sum + (item.poin || 0), 0)}
              </div>
              <div className="text-sm text-gray-400">Total Poin</div>
            </div>
          ) : (
            <div className="glass-effect border border-gray-600/50 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-gray-400">-</div>
              <div className="text-sm text-gray-400">Total Poin</div>
              <div className="text-xs text-gray-500 mt-1">Belum diizinkan</div>
            </div>
          )}
        </motion.div>

        {/* Bulk actions */}
        <div className="mb-4 flex items-center gap-4">
          <input type="checkbox"
            checked={aktivitas.length > 0 && selectedIds.length === aktivitas.length}
            onChange={e => setSelectedIds(e.target.checked ? aktivitas.map(a => a.id) : [])}
            className="w-5 h-5 rounded border border-cyan-500/50 bg-slate-700 text-cyan-500 focus:ring-cyan-400 transition-all accent-cyan-500"
          />
          <span className="text-sm text-gray-300">Pilih Semua</span>
          <Button
            variant="outline"
            className="border-red-500/50 text-red-300 text-xs px-3 py-1"
            disabled={selectedIds.length === 0}
            onClick={handleBulkDelete}
          >
            Hapus Terpilih
          </Button>
        </div>

        {/* Activities List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-6"
        >
          {aktivitas.map((item, index) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + index * 0.1 }}
            >
              <Card>
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(item.id)}
                    onChange={e => setSelectedIds(
                      e.target.checked
                        ? [...selectedIds, item.id]
                        : selectedIds.filter(id => id !== item.id)
                    )}
                    className="w-5 h-5 mt-2 rounded border border-cyan-500/50 bg-slate-700 text-cyan-500 focus:ring-cyan-400 transition-all accent-cyan-500"
                  />
                  <div className="flex-1">
                    <div className="flex items-center space-x-4 mb-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full flex items-center justify-center">
                        <DocumentTextIcon className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <CalendarIcon className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-400">
                            {format(new Date(item.tanggal), 'dd MMMM yyyy')}
                          </span>
                        </div>
                        <div className="flex items-center space-x-4 mt-1">
                          <span className="text-sm text-cyan-300">{item.judul?.nama}</span>
                          <span className="text-sm text-gray-400">•</span>
                          <span className="text-sm text-blue-300">{item.subjudul?.nama}</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <h4 className="font-medium text-white mb-2">Aktivitas:</h4>
                        <p className="text-gray-300">{item.aktivitas}</p>
                      </div>

                      {item.deskripsi && (
                        <div>
                          <h4 className="font-medium text-white mb-2">Deskripsi:</h4>
                          <p className="text-gray-300">{item.deskripsi}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                {/* Action Buttons di bawah isi card */}
                <div className="flex flex-wrap sm:flex-nowrap gap-2 mt-4 w-full justify-end border-t border-cyan-500/10 pt-4">
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-cyan-500/50 text-cyan-300 text-xs px-2 py-1"
                    onClick={() => {
                      setEditItem(item);
                      setEditForm({
                        tanggal: item.tanggal,
                        judul_id: item.judul_id,
                        subjudul_id: item.subjudul_id,
                        aktivitas: item.aktivitas,
                        deskripsi: item.deskripsi || ''
                      });
                    }}
                  >
                    <PencilIcon className="w-4 h-4 mr-1" /> Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-blue-500/50 text-blue-300 text-xs px-2 py-1"
                    onClick={() => handleDuplicate(item)}
                  >
                    <DocumentDuplicateIcon className="w-4 h-4 mr-1" /> Duplicate
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-red-500/50 text-red-300 text-xs px-2 py-1"
                    onClick={() => handleDelete(item.id)}
                  >
                    <TrashIcon className="w-4 h-4 mr-1" /> Hapus
                  </Button>
                </div>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        {aktivitas.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <DocumentTextIcon className="w-16 h-16 text-gray-500 mx-auto mb-4" />
            <p className="text-gray-400">Tidak ada aktivitas untuk periode yang dipilih</p>
            <Button
              onClick={() => navigate('/karyawan/tambah')}
              className="mt-4 bg-gradient-to-r from-green-500 to-teal-600"
            >
              Tambah Aktivitas Pertama
            </Button>
          </motion.div>
        )}
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
              {/* TODO: Tambahkan dropdown judul/subjudul jika perlu */}
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