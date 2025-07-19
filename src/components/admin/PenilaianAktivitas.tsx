import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  ClipboardDocumentListIcon, 
  ArrowLeftIcon,
  StarIcon,
  UserIcon,
  CalendarIcon,
  DocumentTextIcon,
  UsersIcon
} from '@heroicons/react/24/outline';
import { useNavigate } from 'react-router-dom';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { getAllAktivitas, updateAktivitasPoin, getAllUsers } from '../../lib/database';
import { subscribeToTable, unsubscribeFromTable } from '../../lib/database';
import { Aktivitas, User } from '../../types';
import { format } from 'date-fns';

export const PenilaianAktivitas: React.FC = () => {
  const navigate = useNavigate();
  const [aktivitas, setAktivitas] = useState<Aktivitas[]>([]);
  const [allAktivitas, setAllAktivitas] = useState<Aktivitas[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingPoin, setUpdatingPoin] = useState<string | null>(null);
  const [filter, setFilter] = useState({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    userId: ''
  });

  useEffect(() => {
    loadAktivitas();
    loadUsers();
    
    // Subscribe to realtime changes for aktivitas table
    const subscription = subscribeToTable('aktivitas', (payload) => {
      console.log('Realtime aktivitas change:', payload);
      loadAktivitas(); // Reload aktivitas when changes occur
    });
    
    return () => {
      unsubscribeFromTable('aktivitas');
    };
  }, [filter]);

  const loadUsers = async () => {
    try {
      const data = await getAllUsers();
      setUsers(data.filter(user => user.role === 'karyawan'));
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const loadAktivitas = async () => {
    setLoading(true);
    try {
      console.log('Loading aktivitas for admin penilaian, filter:', filter);
      const data = await getAllAktivitas(filter.month, filter.year);
      console.log('Admin aktivitas loaded:', data.length, 'items');
      setAllAktivitas(data);
      
      // Filter by user if selected
      if (filter.userId) {
        const filteredData = data.filter(item => item.user_id === filter.userId);
        setAktivitas(filteredData);
      } else {
        setAktivitas(data);
      }
    } catch (error) {
      console.error('Error loading aktivitas:', error);
      alert('Gagal memuat aktivitas untuk penilaian: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const handlePoinChange = async (id: string, poin: number) => {
    setUpdatingPoin(id);
    try {
      console.log('Updating poin for aktivitas:', id, 'to:', poin);
      await updateAktivitasPoin(id, poin);
      console.log('Poin updated successfully');
      // Update local state instead of reloading
      setAktivitas(prev => prev.map(item => 
        item.id === id ? { ...item, poin } : item
      ));
    } catch (error) {
      console.error('Error updating poin:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert('Gagal mengupdate poin: ' + errorMessage);
    } finally {
      setUpdatingPoin(null);
    }
  };

  const handlePoinInputChange = (id: string, value: string) => {
    const poin = parseInt(value) || 0;
    if (poin >= 0 && poin <= 100) {
      // Update local state immediately for responsive UI
      setAktivitas(prev => prev.map(item => 
        item.id === id ? { ...item, poin } : item
      ));
    }
  };

  const handlePoinInputBlur = (id: string, value: string) => {
    const poin = parseInt(value) || 0;
    if (poin >= 0 && poin <= 100) {
      handlePoinChange(id, poin);
    }
  };

  const handlePoinInputKeyPress = (e: React.KeyboardEvent, id: string, value: string) => {
    if (e.key === 'Enter') {
      const poin = parseInt(value) || 0;
      if (poin >= 0 && poin <= 100) {
        handlePoinChange(id, poin);
      }
    }
  };

  const getPoinColor = (poin: number | null) => {
    if (!poin) return 'text-gray-400';
    if (poin >= 80) return 'text-green-400';
    if (poin >= 60) return 'text-yellow-400';
    if (poin >= 40) return 'text-orange-400';
    return 'text-red-400';
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
        <ClipboardDocumentListIcon className="w-64 h-64 text-cyan-400" />
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
                  Penilaian Aktivitas
                </h1>
                <p className="text-gray-400 mt-1">Nilai aktivitas harian karyawan</p>
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
              <select
                value={filter.userId}
                onChange={(e) => setFilter({ ...filter, userId: e.target.value })}
                className="px-4 py-2 glass-effect border border-gray-600/50 rounded-lg text-white bg-slate-800/50 focus:outline-none focus:ring-2 focus:ring-cyan-400 [&>option]:bg-slate-800 [&>option]:text-white"
              >
                <option value="" className="bg-slate-800 text-white">Semua Karyawan</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id} className="bg-slate-800 text-white">
                    {user.nama}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </motion.div>

        <div className="space-y-6">
          {aktivitas.map((item, index) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-4 mb-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full flex items-center justify-center">
                        <UserIcon className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-white">{item.user?.nama}</h3>
                        <p className="text-sm text-gray-400">{item.user?.jabatan}</p>
                      </div>
                      <div className="flex items-center space-x-2 text-sm text-gray-400">
                        <CalendarIcon className="w-4 h-4" />
                        <span>{format(new Date(item.tanggal), 'dd MMM yyyy')}</span>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <p className="text-sm text-gray-400">Judul: {item.judul?.nama}</p>
                        <p className="text-sm text-gray-400">Sub Judul: {item.subjudul?.nama}</p>
                      </div>
                      
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

                  <div className="ml-6 text-center">
                    <div className="mb-4">
                      <p className="text-sm text-gray-400 mb-2">Poin Saat Ini</p>
                      <div className={`text-2xl font-bold ${getPoinColor(item.poin || 0)}`}>
                        {item.poin || 0}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <p className="text-sm text-gray-400">Berikan Poin (0-100):</p>
                      <div className="space-y-2">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={item.poin || 0}
                          onChange={(e) => handlePoinInputChange(item.id, e.target.value)}
                          onBlur={(e) => handlePoinInputBlur(item.id, e.target.value)}
                          onKeyPress={(e) => handlePoinInputKeyPress(e, item.id, (e.target as HTMLInputElement).value)}
                          disabled={updatingPoin === item.id}
                          className="w-20 px-2 py-1 text-center glass-effect border border-gray-600/50 rounded text-white focus:outline-none focus:ring-2 focus:ring-cyan-400 disabled:opacity-50"
                        />
                        <div className="flex flex-wrap gap-1 justify-center">
                          <button
                            onClick={() => handlePoinChange(item.id, 100)}
                            disabled={updatingPoin === item.id}
                            className="px-2 py-1 text-xs bg-green-500/20 text-green-300 border border-green-500/50 rounded hover:bg-green-500/30 disabled:opacity-50"
                          >
                            100
                          </button>
                          <button
                            onClick={() => handlePoinChange(item.id, 80)}
                            disabled={updatingPoin === item.id}
                            className="px-2 py-1 text-xs bg-blue-500/20 text-blue-300 border border-blue-500/50 rounded hover:bg-blue-500/30 disabled:opacity-50"
                          >
                            80
                          </button>
                          <button
                            onClick={() => handlePoinChange(item.id, 60)}
                            disabled={updatingPoin === item.id}
                            className="px-2 py-1 text-xs bg-yellow-500/20 text-yellow-300 border border-yellow-500/50 rounded hover:bg-yellow-500/30 disabled:opacity-50"
                          >
                            60
                          </button>
                          <button
                            onClick={() => handlePoinChange(item.id, 40)}
                            disabled={updatingPoin === item.id}
                            className="px-2 py-1 text-xs bg-orange-500/20 text-orange-300 border border-orange-500/50 rounded hover:bg-orange-500/30 disabled:opacity-50"
                          >
                            40
                          </button>
                          <button
                            onClick={() => handlePoinChange(item.id, 0)}
                            disabled={updatingPoin === item.id}
                            className="px-2 py-1 text-xs bg-red-500/20 text-red-300 border border-red-500/50 rounded hover:bg-red-500/30 disabled:opacity-50"
                          >
                            0
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>

        {aktivitas.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <DocumentTextIcon className="w-16 h-16 text-gray-500 mx-auto mb-4" />
            <p className="text-gray-400">
              {filter.userId 
                ? `Tidak ada aktivitas untuk karyawan yang dipilih pada periode ini`
                : `Tidak ada aktivitas untuk periode yang dipilih`
              }
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
};