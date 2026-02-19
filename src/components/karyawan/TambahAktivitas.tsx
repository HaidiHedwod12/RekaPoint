import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  PlusCircleIcon,
  ArrowLeftIcon,
  CalendarIcon,
  FolderIcon,
  DocumentIcon,
  PencilSquareIcon
} from '@heroicons/react/24/outline';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card } from '../ui/Card';
import { useAuth } from '../../contexts/AuthContext';
import { getAllJudul, getSubJudulByJudul, createAktivitas } from '../../lib/database';
import { subscribeToTable, unsubscribeFromTable } from '../../lib/database';
import { Judul, SubJudul } from '../../types';

export const TambahAktivitas: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [juduls, setJuduls] = useState<Judul[]>([]);
  const [subjuduls, setSubjuduls] = useState<SubJudul[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    tanggal: location.state?.selectedDate || new Date().toLocaleString('sv').split(' ')[0],
    judul_id: '',
    subjudul_id: '',
    aktivitas: '',
    deskripsi: ''
  });

  useEffect(() => {
    loadJuduls();

    // Subscribe to realtime changes for judul and subjudul
    const judulSubscription = subscribeToTable('judul', (payload) => {
      console.log('Realtime judul change:', payload);
      loadJuduls();
    });

    const subjudulSubscription = subscribeToTable('subjudul', (payload) => {
      console.log('Realtime subjudul change:', payload);
      if (formData.judul_id) {
        loadSubjuduls(formData.judul_id);
      }
    });

    return () => {
      unsubscribeFromTable('judul');
      unsubscribeFromTable('subjudul');
    };
  }, []);

  useEffect(() => {
    if (formData.judul_id) {
      loadSubjuduls(formData.judul_id);
    } else {
      setSubjuduls([]);
      setFormData(prev => ({ ...prev, subjudul_id: '' }));
    }
  }, [formData.judul_id]);

  const loadJuduls = async () => {
    try {
      const data = await getAllJudul();
      setJuduls(data);
    } catch (error) {
      console.error('Error loading juduls:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSubjuduls = async (judulId: string) => {
    try {
      const data = await getSubJudulByJudul(judulId);
      setSubjuduls(data);
    } catch (error) {
      console.error('Error loading subjuduls:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    // Validate form data
    if (!formData.tanggal || !formData.judul_id || !formData.subjudul_id || !formData.aktivitas.trim()) {
      alert('Mohon lengkapi semua field yang wajib diisi!');
      return;
    }
    console.log('Submitting aktivitas:', formData);
    setSaving(true);
    try {
      const newAktivitas = await createAktivitas({
        user_id: user.id,
        tanggal: formData.tanggal,
        judul_id: formData.judul_id,
        subjudul_id: formData.subjudul_id,
        aktivitas: formData.aktivitas.trim(),
        deskripsi: formData.deskripsi || undefined
      });

      console.log('New aktivitas created:', newAktivitas);

      // Reset form
      setFormData({
        tanggal: new Date().toLocaleString('sv').split(' ')[0],
        judul_id: '',
        subjudul_id: '',
        aktivitas: '',
        deskripsi: ''
      });

      alert('Aktivitas berhasil disimpan!');
      console.log('Aktivitas saved successfully');

      // Stay on the same page for adding more activities
      // navigate('/karyawan/histori'); // Removed automatic navigation
    } catch (error) {
      console.error('Error saving aktivitas:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      if (errorMessage.includes('foreign key') || errorMessage.includes('violates') || errorMessage.includes('not found')) {
        alert('Error: Judul atau SubJudul tidak valid. Silakan pilih ulang.');
        // Reload juduls and subjuduls
        loadJuduls();
      } else if (errorMessage.includes('duplicate') || errorMessage.includes('unique')) {
        alert('Error: Aktivitas dengan data yang sama sudah ada.');
      } else if (errorMessage.includes('permission') || errorMessage.includes('policy')) {
        alert('Error: Tidak memiliki izin untuk menyimpan aktivitas. Silakan login ulang atau hubungi admin.');
      } else {
        alert('Gagal menyimpan aktivitas: ' + errorMessage);
      }

      // Don't reset form on error so user can try again
      return;
    } finally {
      setSaving(false);
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
        <PlusCircleIcon className="w-64 h-64 text-cyan-400" />
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
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
                <h1 className="text-2xl sm:text-4xl font-extrabold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent mb-1 drop-shadow-lg">Tambah Aktivitas</h1>
                <div className="text-cyan-200 text-sm sm:text-lg font-medium opacity-80">Catat aktivitas harian Anda</div>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <Card>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input
                  label="Tanggal"
                  type="date"
                  value={formData.tanggal}
                  onChange={(e) => setFormData({ ...formData, tanggal: e.target.value })}
                  required
                  icon={<CalendarIcon className="w-5 h-5" />}
                />

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Judul <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <FolderIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <select
                      value={formData.judul_id}
                      onChange={(e) => setFormData({ ...formData, judul_id: e.target.value })}
                      required
                      className="w-full pl-10 pr-4 py-3 glass-effect border border-gray-600/50 rounded-lg text-white bg-slate-800/50 focus:outline-none focus:ring-2 focus:ring-cyan-400 [&>option]:bg-slate-800 [&>option]:text-white [&>option:checked]:bg-cyan-600"
                    >
                      <option value="" className="bg-slate-800 text-gray-400">Pilih Judul</option>
                      {juduls.map((judul) => (
                        <option key={judul.id} value={judul.id} className="bg-slate-800 text-white">
                          {judul.nama}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Sub Judul <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <DocumentIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <select
                    value={formData.subjudul_id}
                    onChange={(e) => setFormData({ ...formData, subjudul_id: e.target.value })}
                    required
                    disabled={!formData.judul_id}
                    className="w-full pl-10 pr-4 py-3 glass-effect border border-gray-600/50 rounded-lg text-white bg-slate-800/50 focus:outline-none focus:ring-2 focus:ring-cyan-400 disabled:opacity-50 [&>option]:bg-slate-800 [&>option]:text-white [&>option:checked]:bg-cyan-600"
                  >
                    <option value="" className="bg-slate-800 text-gray-400">Pilih Sub Judul</option>
                    {subjuduls.map((subjudul) => (
                      <option key={subjudul.id} value={subjudul.id} className="bg-slate-800 text-white">
                        {subjudul.nama}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Aktivitas <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <PencilSquareIcon className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                  <textarea
                    value={formData.aktivitas}
                    onChange={(e) => setFormData({ ...formData, aktivitas: e.target.value })}
                    required
                    rows={4}
                    placeholder="Deskripsikan aktivitas yang Anda lakukan..."
                    className="w-full pl-10 pr-4 py-3 glass-effect border border-gray-600/50 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-400 resize-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Deskripsi Tambahan (Opsional)
                </label>
                <div className="relative">
                  <DocumentIcon className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                  <textarea
                    value={formData.deskripsi}
                    onChange={(e) => setFormData({ ...formData, deskripsi: e.target.value })}
                    rows={3}
                    placeholder="Tambahkan detail atau catatan tambahan..."
                    className="w-full pl-10 pr-4 py-3 glass-effect border border-gray-600/50 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-400 resize-none"
                  />
                </div>
              </div>

              <div className="flex space-x-4">
                <Button
                  type="submit"
                  disabled={saving}
                  className="bg-gradient-to-r from-green-500 to-teal-600 flex-1"
                >
                  {saving ? (
                    <div className="flex items-center">
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                      Menyimpan...
                    </div>
                  ) : (
                    <div className="flex items-center">
                      <PlusCircleIcon className="w-5 h-5 mr-2" />
                      Simpan Aktivitas
                    </div>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/dashboard')}
                  className="border-gray-500/50 text-gray-300"
                >
                  Batal
                </Button>
              </div>
            </form>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};