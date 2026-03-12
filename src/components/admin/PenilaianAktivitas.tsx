import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  ClipboardDocumentListIcon,
  ArrowLeftIcon,
  UserIcon,
  CalendarIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';
import { useNavigate } from 'react-router-dom';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { getAllAktivitas, getAllUsers } from '../../lib/database';
import { subscribeToTable, unsubscribeFromTable } from '../../lib/database';
import { Aktivitas, User } from '../../types';
import { format } from 'date-fns';

export const PenilaianAktivitas: React.FC = () => {
  const navigate = useNavigate();
  const [aktivitas, setAktivitas] = useState<Aktivitas[]>([]);

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    userId: ''
  });

  useEffect(() => {
    loadAktivitas();
    loadUsers();

    // Subscribe to realtime changes for aktivitas table
    subscribeToTable('aktivitas', () => {
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
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sm:gap-0">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
              <Button
                variant="outline"
                onClick={() => navigate('/dashboard')}
                className="border-cyan-500/50 text-cyan-300 w-full sm:w-auto"
              >
                <ArrowLeftIcon className="w-5 h-5 mr-2" />
                Kembali
              </Button>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                  Daftar Aktivitas
                </h1>
                <p className="text-gray-400 mt-1 text-sm sm:text-base">Lihat aktivitas harian karyawan</p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 w-full sm:w-auto">
              <select
                value={filter.month}
                onChange={(e) => setFilter({ ...filter, month: parseInt(e.target.value) })}
                className="px-2 sm:px-4 py-1 sm:py-2 glass-effect border border-gray-600/50 rounded-lg text-white bg-slate-800/50 focus:outline-none focus:ring-2 focus:ring-cyan-400 w-full sm:w-auto text-xs sm:text-base [&>option]:bg-slate-800 [&>option]:text-white"
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
                className="px-2 sm:px-4 py-1 sm:py-2 glass-effect border border-gray-600/50 rounded-lg text-white bg-slate-800/50 focus:outline-none focus:ring-2 focus:ring-cyan-400 w-full sm:w-auto text-xs sm:text-base [&>option]:bg-slate-800 [&>option]:text-white"
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
                className="px-2 sm:px-4 py-1 sm:py-2 glass-effect border border-gray-600/50 rounded-lg text-white bg-slate-800/50 focus:outline-none focus:ring-2 focus:ring-cyan-400 w-full sm:w-auto text-xs sm:text-base [&>option]:bg-slate-800 [&>option]:text-white"
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
                    <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 items-start sm:items-center mb-4">
                      <div className="w-8 h-8 sm:w-12 sm:h-12 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full flex items-center justify-center">
                        <UserIcon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-white text-sm sm:text-base">{item.user?.nama}</h3>
                        <p className="text-xs sm:text-sm text-gray-400">{item.user?.jabatan}</p>
                      </div>
                      <div className="flex items-center space-x-2 text-xs sm:text-sm text-gray-400">
                        <CalendarIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                        <span>{format(new Date(item.tanggal), 'dd MMM yyyy')}</span>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <p className="text-sm text-gray-400">Judul: {item.judul?.nama || item.judul_nama || '(Dihapus)'}</p>
                        <p className="text-sm text-gray-400">Sub Judul: {item.subjudul?.nama || item.subjudul_nama || '(Dihapus)'}</p>
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