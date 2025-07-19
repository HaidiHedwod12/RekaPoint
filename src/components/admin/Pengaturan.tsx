import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  CogIcon, 
  ArrowLeftIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  FolderIcon,
  DocumentIcon
} from '@heroicons/react/24/outline';
import { useNavigate } from 'react-router-dom';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card } from '../ui/Card';
import { 
  getAllJudul, 
  createJudul, 
  updateJudul, 
  deleteJudul,
  getSubJudulByJudul,
  createSubJudul,
  updateSubJudul,
  deleteSubJudul
} from '../../lib/database';
import { subscribeToTable, unsubscribeFromTable } from '../../lib/database';
import { Judul, SubJudul } from '../../types';

export const Pengaturan: React.FC = () => {
  const navigate = useNavigate();
  const [juduls, setJuduls] = useState<Judul[]>([]);
  const [subjuduls, setSubjuduls] = useState<{ [key: string]: SubJudul[] }>({});
  const [loading, setLoading] = useState(true);
  
  // Form states
  const [showJudulForm, setShowJudulForm] = useState(false);
  const [showSubjudulForm, setShowSubjudulForm] = useState<string | null>(null);
  const [editingJudul, setEditingJudul] = useState<Judul | null>(null);
  const [editingSubjudul, setEditingSubjudul] = useState<SubJudul | null>(null);
  const [judulName, setJudulName] = useState('');
  const [subjudulName, setSubjudulName] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
    
    // Subscribe to realtime changes for judul and subjudul tables
    const judulSubscription = subscribeToTable('judul', (payload) => {
      console.log('Realtime judul change:', payload);
      loadData();
    });
    
    const subjudulSubscription = subscribeToTable('subjudul', (payload) => {
      console.log('Realtime subjudul change:', payload);
      loadData();
    });
    
    return () => {
      unsubscribeFromTable('judul');
      unsubscribeFromTable('subjudul');
    };
  }, []);

  const loadData = async () => {
    try {
      console.log('Loading judul and subjudul data...');
      const judulData = await getAllJudul();
      console.log('Judul data loaded:', judulData);
      setJuduls(judulData);
      
      // Load subjuduls for each judul
      const subjudulData: { [key: string]: SubJudul[] } = {};
      for (const judul of judulData) {
        console.log('Loading subjudul for judul:', judul.id, judul.nama);
        const subs = await getSubJudulByJudul(judul.id);
        console.log('SubJudul loaded for', judul.nama, ':', subs);
        subjudulData[judul.id] = subs;
      }
      setSubjuduls(subjudulData);
      console.log('All data loaded successfully');
    } catch (error) {
      console.error('Error loading data:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert('Gagal memuat data: ' + errorMessage + '\n\nPastikan:\n1. Database sudah terhubung\n2. RLS policies sudah disetup\n3. User sudah login');
    } finally {
      setLoading(false);
    }
  };

  // Judul functions
  const handleJudulSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!judulName.trim()) return;
    
    setSaving(true);
    try {
      if (editingJudul) {
        console.log('Updating judul:', editingJudul.id, judulName.trim());
        await updateJudul(editingJudul.id, judulName.trim());
        console.log('Judul updated successfully');
      } else {
        console.log('Creating new judul:', judulName.trim());
        await createJudul(judulName.trim());
        console.log('Judul created successfully');
      }
      await loadData();
      resetJudulForm();
      alert(editingJudul ? 'Judul berhasil diupdate!' : 'Judul berhasil ditambahkan!');
    } catch (error) {
      console.error('Error saving judul:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      if (errorMessage.includes('duplicate key') || errorMessage.includes('already exists')) {
        alert('Judul dengan nama tersebut sudah ada!');
      } else {
        alert('Gagal menyimpan judul: ' + errorMessage);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleJudulEdit = (judul: Judul) => {
    setEditingJudul(judul);
    setJudulName(judul.nama);
    setShowJudulForm(true);
  };

  const handleJudulDelete = async (id: string) => {
    const judulToDelete = juduls.find(j => j.id === id);
    if (!judulToDelete) {
      alert('Judul tidak ditemukan. Silakan refresh halaman.');
      loadData();
      return;
    }
    
    if (confirm(`Yakin ingin menghapus judul "${judulToDelete.nama}"? Semua subjudul akan ikut terhapus.`)) {
      try {
        console.log('Deleting judul:', id, judulToDelete.nama);
        await deleteJudul(id);
        console.log('Judul deleted successfully');
        await loadData();
        alert('Judul berhasil dihapus');
      } catch (error) {
        console.error('Error deleting judul:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        if (errorMessage.includes('foreign key') || errorMessage.includes('referenced')) {
          alert('Tidak bisa menghapus judul karena masih ada subjudul atau aktivitas yang menggunakannya!');
        } else {
          alert('Gagal menghapus judul: ' + errorMessage);
        }
        await loadData(); // Reload to sync state
      }
    }
  };

  const resetJudulForm = () => {
    setJudulName('');
    setEditingJudul(null);
    setShowJudulForm(false);
  };

  // Subjudul functions
  const handleSubjudulSubmit = async (e: React.FormEvent, judulId: string) => {
    e.preventDefault();
    if (!subjudulName.trim()) return;
    
    setSaving(true);
    try {
      if (editingSubjudul) {
        console.log('Updating subjudul:', editingSubjudul.id, subjudulName.trim());
        await updateSubJudul(editingSubjudul.id, subjudulName.trim());
        console.log('Subjudul updated successfully');
      } else {
        console.log('Creating new subjudul:', judulId, subjudulName.trim());
        await createSubJudul(judulId, subjudulName.trim());
        console.log('Subjudul created successfully');
      }
      await loadData();
      resetSubjudulForm();
      alert(editingSubjudul ? 'Subjudul berhasil diupdate!' : 'Subjudul berhasil ditambahkan!');
    } catch (error) {
      console.error('Error saving subjudul:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      if (errorMessage.includes('duplicate key') || errorMessage.includes('already exists')) {
        alert('Subjudul dengan nama tersebut sudah ada!');
      } else {
        alert('Gagal menyimpan subjudul: ' + errorMessage);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleSubjudulEdit = (subjudul: SubJudul) => {
    setEditingSubjudul(subjudul);
    setSubjudulName(subjudul.nama);
    setShowSubjudulForm(subjudul.judul_id);
  };

  const handleSubjudulDelete = async (id: string) => {
    // Find subjudul info for confirmation
    let subjudulToDelete = null;
    for (const judulId in subjuduls) {
      const found = subjuduls[judulId].find(s => s.id === id);
      if (found) {
        subjudulToDelete = found;
        break;
      }
    }
    
    if (!subjudulToDelete) {
      alert('Subjudul tidak ditemukan. Silakan refresh halaman.');
      loadData();
      return;
    }
    
    if (confirm(`Yakin ingin menghapus subjudul "${subjudulToDelete.nama}"?`)) {
      try {
        console.log('Deleting subjudul:', id, subjudulToDelete.nama);
        await deleteSubJudul(id);
        console.log('Subjudul deleted successfully');
        await loadData();
        alert('Subjudul berhasil dihapus');
      } catch (error) {
        console.error('Error deleting subjudul:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        if (errorMessage.includes('foreign key') || errorMessage.includes('referenced')) {
          alert('Tidak bisa menghapus subjudul karena masih ada aktivitas yang menggunakannya!');
        } else {
          alert('Gagal menghapus subjudul: ' + errorMessage);
        }
        await loadData(); // Reload to sync state
      }
    }
  };

  const resetSubjudulForm = () => {
    setSubjudulName('');
    setEditingSubjudul(null);
    setShowSubjudulForm(null);
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
        <CogIcon className="w-64 h-64 text-cyan-400" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="outline"
                onClick={() => navigate('/dashboard')}
                className="border-cyan-500/50 text-cyan-300"
              >
                <ArrowLeftIcon className="w-5 h-5 mr-2" />
                Kembali
              </Button>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                  Pengaturan
                </h1>
                <p className="text-gray-400 mt-1">Kelola judul dan subjudul aktivitas</p>
              </div>
            </div>
            <Button
              onClick={() => setShowJudulForm(true)}
              className="bg-gradient-to-r from-green-500 to-teal-600"
            >
              <PlusIcon className="w-5 h-5 mr-2" />
              Tambah Judul
            </Button>
          </div>
        </motion.div>

        {/* Judul Form */}
        {showJudulForm && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-8"
          >
            <Card>
              <h3 className="text-xl font-semibold text-white mb-6">
                {editingJudul ? 'Edit Judul' : 'Tambah Judul Baru'}
              </h3>
              <form onSubmit={handleJudulSubmit} className="space-y-6">
                <Input
                  label="Nama Judul"
                  value={judulName}
                  onChange={(e) => setJudulName(e.target.value)}
                  required
                  icon={<FolderIcon className="w-5 h-5" />}
                  placeholder="Masukkan nama judul aktivitas"
                />
                <div className="flex space-x-4">
                  <Button 
                    type="submit" 
                    className="bg-gradient-to-r from-green-500 to-teal-600"
                    disabled={saving}
                  >
                    {saving ? (
                      <div className="flex items-center">
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                        {editingJudul ? 'Mengupdate...' : 'Menyimpan...'}
                      </div>
                    ) : (
                      editingJudul ? 'Update' : 'Simpan'
                    )}
                  </Button>
                  <Button variant="outline" onClick={resetJudulForm} disabled={saving}>
                    Batal
                  </Button>
                </div>
              </form>
            </Card>
          </motion.div>
        )}

        {/* Juduls List */}
        <div className="space-y-6">
          {juduls.map((judul, index) => (
            <motion.div
              key={judul.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full flex items-center justify-center">
                      <FolderIcon className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-white">{judul.nama}</h3>
                      <p className="text-sm text-gray-400">
                        {subjuduls[judul.id]?.length || 0} subjudul
                      </p>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowSubjudulForm(judul.id)}
                      className="border-green-500/50 text-green-300"
                    >
                      <PlusIcon className="w-4 h-4 mr-1" />
                      Subjudul
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleJudulEdit(judul)}
                      className="border-cyan-500/50 text-cyan-300"
                    >
                      <PencilIcon className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleJudulDelete(judul.id)}
                      className="border-red-500/50 text-red-300 hover:bg-red-500/10"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Subjudul Form */}
                {showSubjudulForm === judul.id && (
                  <div className="mb-4 p-4 glass-effect rounded-lg border border-gray-600/50">
                    <h4 className="text-lg font-medium text-white mb-4">
                      {editingSubjudul ? 'Edit Subjudul' : 'Tambah Subjudul Baru'}
                    </h4>
                    <form onSubmit={(e) => handleSubjudulSubmit(e, judul.id)} className="space-y-4">
                      <Input
                        label="Nama Subjudul"
                        value={subjudulName}
                        onChange={(e) => setSubjudulName(e.target.value)}
                        required
                        icon={<DocumentIcon className="w-5 h-5" />}
                        placeholder="Masukkan nama subjudul"
                      />
                      <div className="flex space-x-4">
                        <Button 
                          type="submit" 
                          size="sm" 
                          className="bg-gradient-to-r from-green-500 to-teal-600"
                          disabled={saving}
                        >
                          {saving ? (
                            <div className="flex items-center">
                              <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                              {editingSubjudul ? 'Mengupdate...' : 'Menyimpan...'}
                            </div>
                          ) : (
                            editingSubjudul ? 'Update' : 'Simpan'
                          )}
                        </Button>
                        <Button variant="outline" size="sm" onClick={resetSubjudulForm} disabled={saving}>
                          Batal
                        </Button>
                      </div>
                    </form>
                  </div>
                )}

                {/* Subjuduls List */}
                {subjuduls[judul.id] && subjuduls[judul.id].length > 0 && (
                  <div className="space-y-2">
                    <h5 className="text-sm font-medium text-gray-400 mb-3">Daftar Subjudul:</h5>
                    {subjuduls[judul.id].map((subjudul) => (
                      <div
                        key={subjudul.id}
                        className="flex items-center justify-between p-3 glass-effect rounded-lg border border-gray-700/50 hover:border-gray-600/50 transition-all duration-200"
                      >
                        <div className="flex items-center space-x-3">
                          <DocumentIcon className="w-5 h-5 text-gray-400" />
                          <span className="text-gray-300">{subjudul.nama}</span>
                        </div>
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleSubjudulEdit(subjudul)}
                            className="text-cyan-300 hover:text-cyan-200"
                          >
                            <PencilIcon className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleSubjudulDelete(subjudul.id)}
                            className="text-red-300 hover:text-red-200"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {(!subjuduls[judul.id] || subjuduls[judul.id].length === 0) && (
                  <div className="text-center py-6 text-gray-500">
                    <DocumentIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Belum ada subjudul</p>
                  </div>
                )}
              </Card>
            </motion.div>
          ))}
        </div>

        {juduls.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <FolderIcon className="w-16 h-16 text-gray-500 mx-auto mb-4" />
            <p className="text-gray-400 mb-4">Belum ada judul yang dibuat</p>
            <Button
              onClick={() => setShowJudulForm(true)}
              className="bg-gradient-to-r from-green-500 to-teal-600"
            >
              <PlusIcon className="w-5 h-5 mr-2" />
              Tambah Judul Pertama
            </Button>
          </motion.div>
        )}
      </div>
    </div>
  );
};