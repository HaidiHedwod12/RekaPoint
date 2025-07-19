import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  ArrowLeftIcon,
  PlusIcon,
  DocumentTextIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  DocumentIcon,
  CurrencyDollarIcon,
  CalendarIcon,
  TagIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  TrashIcon,
  PencilIcon
} from '@heroicons/react/24/outline';
import { useNavigate } from 'react-router-dom';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Input } from '../ui/Input';
import { useAuth } from '../../contexts/AuthContext';
import { 
  createReimbursementRequest, 
  getReimbursementRequestsByUser,
  uploadReimbursementFile,
  type ReimbursementRequest as DBReimbursementRequest,
  type CreateReimbursementRequest
} from '../../lib/reimbursement';
import { getAllJudul, getSubJudulByJudul } from '../../lib/database';

// Use the database type instead of local interface
import { type ReimbursementItem as DBReimbursementItem } from '../../lib/reimbursement';
type ReimbursementItem = Omit<DBReimbursementItem, 'request_id' | 'created_at'> & {
  receipt_name?: string;
};

// Use the database type instead of local interface
type ReimbursementRequest = DBReimbursementRequest;

export const Reimbursement: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [requests, setRequests] = useState<ReimbursementRequest[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [judulList, setJudulList] = useState<{ id: string; nama: string }[]>([]);
  const [subJudulList, setSubJudulList] = useState<{ id: string; nama: string }[]>([]);
  const [judulId, setJudulId] = useState('');
  const [subJudulId, setSubJudulId] = useState('');
  const [judulLainnya, setJudulLainnya] = useState('');
  const [subJudulLainnya, setSubJudulLainnya] = useState('');
  const [tanggal, setTanggal] = useState('');
  const [buktiFiles, setBuktiFiles] = useState<File[]>([]);

  // New item form
  const [newItem, setNewItem] = useState({
    description: '',
    amount: '',
    category: '',
    date: '',
    receipt_file: null as File | null
  });

  // Hapus formData, gunakan state terpisah untuk judul, subjudul, tanggal, deskripsi, items
  const [items, setItems] = useState<ReimbursementItem[]>([]);
  const [description, setDescription] = useState('');

  const categories = [
    'Transportasi',
    'Makan & Minuman',
    'Alat Kantor',
    'Komunikasi',
    'Perjalanan Dinas',
    'Lainnya'
  ];

  useEffect(() => {
    getAllJudul().then(setJudulList);
  }, []);
  useEffect(() => {
    if (judulId && judulId !== 'lainnya') {
      getSubJudulByJudul(judulId).then(setSubJudulList);
    } else {
      setSubJudulList([]);
      setSubJudulId('');
    }
  }, [judulId]);

  useEffect(() => {
    loadReimbursements();
  }, []);

  const loadReimbursements = async () => {
    if (!user) return;
    
    try {
      const data = await getReimbursementRequestsByUser(user.id);
      setRequests(data);
    } catch (error) {
      console.error('Error loading reimbursements:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/50';
      case 'approved': return 'bg-green-500/20 text-green-300 border-green-500/50';
      case 'rejected': return 'bg-red-500/20 text-red-300 border-red-500/50';
      case 'paid': return 'bg-blue-500/20 text-blue-300 border-blue-500/50';
      default: return 'bg-gray-500/20 text-gray-300 border-gray-500/50';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <ClockIcon className="w-5 h-5" />;
      case 'approved': return <CheckCircleIcon className="w-5 h-5" />;
      case 'rejected': return <XCircleIcon className="w-5 h-5" />;
      case 'paid': return <CurrencyDollarIcon className="w-5 h-5" />;
      default: return <ClockIcon className="w-5 h-5" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return 'Menunggu Persetujuan';
      case 'approved': return 'Disetujui';
      case 'rejected': return 'Ditolak';
      case 'paid': return 'Sudah Dibayar';
      default: return 'Menunggu';
    }
  };

  const addItem = () => {
    if (!newItem.description || !newItem.amount || !newItem.category) {
      alert('Mohon lengkapi semua field item');
      return;
    }
    const item: ReimbursementItem = {
      id: Date.now().toString(),
      description: newItem.description,
      amount: parseFloat(newItem.amount),
      category: newItem.category,
      date: tanggal || ''
      // Tidak ada receipt_name/receipt_file_name di sini
    };
    setItems(prev => [...prev, item]);
    setNewItem({ description: '', amount: '', category: '', date: '', receipt_file: null });
  };
  const removeItem = (itemId: string) => {
    setItems(prev => prev.filter(item => item.id !== itemId));
  };

  const submitRequest = async () => {
    if (!judulId && !judulLainnya) {
      alert('Pilih judul pengajuan atau isi Lainnya');
      return;
    }
    if ((judulId === 'lainnya' && !judulLainnya) || (subJudulId === 'lainnya' && !subJudulLainnya)) {
      alert('Isi judul/subjudul Lainnya');
      return;
    }
    if (!tanggal) {
      alert('Pilih tanggal pengajuan');
      return;
    }
    if (items.length === 0 || !user) {
      alert('Tambah minimal 1 item pengeluaran');
      return;
    }
    setSubmitting(true);
    try {
      const judulValue = judulId === 'lainnya' ? judulLainnya : (judulList.find(j => j.id === judulId)?.nama || '');
      const subjudulValue = subJudulId === 'lainnya' ? subJudulLainnya : (subJudulList.find(s => s.id === subJudulId)?.nama || '');
      const createRequest: CreateReimbursementRequest = {
        title: judulValue,
        subjudul: subjudulValue,
        tanggal,
        description,
        items: items.map(item => ({
          description: item.description,
          amount: item.amount,
          category: item.category,
          date: tanggal
        }))
      };
      // Save to database
      const newRequest = await createReimbursementRequest(createRequest, user);
      // Upload files jika ada
      if (buktiFiles.length > 0) {
        await Promise.all(buktiFiles.map(file => uploadReimbursementFile(file, newRequest.id, user.id)));
      }
      setRequests(prev => [newRequest, ...prev]);
      setShowForm(false);
      setItems([]);
      setDescription('');
      setJudulId(''); setSubJudulId(''); setJudulLainnya(''); setSubJudulLainnya(''); setTanggal(''); setBuktiFiles([]);
    } catch (error) {
      console.error('Error submitting request:', error);
      alert('Gagal mengirim permintaan');
    } finally {
      setSubmitting(false);
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
        <DocumentTextIcon className="w-64 h-64 text-cyan-400" />
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
                  Reimbursement
                </h1>
                <p className="text-gray-400 mt-1">Ajukan penggantian biaya operasional</p>
              </div>
            </div>
            <Button
              onClick={() => setShowForm(true)}
              className="bg-gradient-to-r from-cyan-500 to-blue-600"
            >
              <PlusIcon className="w-5 h-5 mr-2" />
              Ajukan Reimbursement
            </Button>
          </div>
        </motion.div>

        {/* Requests List */}
        <div className="space-y-6">
          {requests.length > 0 ? (
            requests.map((request, index) => (
              <motion.div
                key={request.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-4">
                                                 <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full flex items-center justify-center">
                           <DocumentTextIcon className="w-6 h-6 text-white" />
                         </div>
                        <div className="flex-1">
                          <h3 className="text-xl font-semibold text-white">{request.title}</h3>
                          <p className="text-gray-400">{request.description}</p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(request.status)}`}>
                            {getStatusIcon(request.status)}
                            <span className="ml-1">{getStatusLabel(request.status)}</span>
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div className="flex items-center space-x-2">
                          <CurrencyDollarIcon className="w-5 h-5 text-cyan-400" />
                          <div>
                            <p className="text-sm text-gray-400">Total Pengeluaran</p>
                            <p className="text-white font-semibold">
                              Rp {request.total_amount.toLocaleString('id-ID')}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <CalendarIcon className="w-5 h-5 text-cyan-400" />
                          <div>
                            <p className="text-sm text-gray-400">Tanggal Ajuan</p>
                            <p className="text-white">
                              {new Date(request.submitted_at).toLocaleDateString('id-ID')}
                            </p>
                          </div>
                        </div>
                                                 <div className="flex items-center space-x-2">
                           <TagIcon className="w-5 h-5 text-cyan-400" />
                           <div>
                             <p className="text-sm text-gray-400">Jumlah Item</p>
                             <p className="text-white">{request.items?.length || 0} item</p>
                           </div>
                         </div>
                      </div>

                                             {/* Items List */}
                       <div className="space-y-2">
                         <h4 className="text-sm font-medium text-gray-300">Detail Pengeluaran:</h4>
                         {request.items?.map((item) => (
                          <div key={item.id} className="flex items-center justify-between p-3 glass-effect rounded-lg border border-gray-700/50">
                            <div className="flex-1">
                              <p className="text-white font-medium">{item.description}</p>
                              <div className="flex items-center space-x-4 text-sm text-gray-400">
                                <span>{item.category}</span>
                                <span>{new Date(item.date).toLocaleDateString('id-ID')}</span>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-white font-semibold">
                                Rp {item.amount.toLocaleString('id-ID')}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>

                      {request.notes && (
                        <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                          <div className="flex items-start space-x-2">
                            <ExclamationTriangleIcon className="w-5 h-5 text-yellow-400 mt-0.5" />
                            <div>
                              <p className="text-sm font-medium text-yellow-300">Catatan Admin:</p>
                              <p className="text-yellow-200">{request.notes}</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))
          ) : (
            <Card>
                             <div className="text-center py-12">
                 <DocumentTextIcon className="w-16 h-16 text-gray-500 mx-auto mb-4" />
                 <p className="text-gray-400 mb-4">Belum ada permintaan reimbursement</p>
                <Button
                  onClick={() => setShowForm(true)}
                  className="bg-gradient-to-r from-cyan-500 to-blue-600"
                >
                  <PlusIcon className="w-5 h-5 mr-2" />
                  Ajukan Reimbursement Pertama
                </Button>
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-xl p-8 w-full max-w-4xl max-h-[90vh] overflow-y-auto border border-cyan-500/30">
            <h2 className="text-xl font-bold text-cyan-300 mb-6">Ajukan Reimbursement</h2>
            
            <div className="space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Tanggal Pengajuan</label>
                  <input type="date" value={tanggal} onChange={e => setTanggal(e.target.value)} className="w-full px-4 py-2 glass-effect border border-gray-600/50 rounded-lg text-white bg-slate-700" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Judul Pengajuan</label>
                  <select value={judulId} onChange={e => setJudulId(e.target.value)} className="w-full px-4 py-2 glass-effect border border-gray-600/50 rounded-lg text-white bg-slate-700">
                    <option value="">Pilih Judul</option>
                    {judulList.map(j => <option key={j.id} value={j.id}>{j.nama}</option>)}
                    <option value="lainnya">Lainnya</option>
                  </select>
                  {judulId === 'lainnya' && (
                    <input type="text" value={judulLainnya} onChange={e => setJudulLainnya(e.target.value)} placeholder="Isi judul lainnya" className="mt-2 w-full px-4 py-2 glass-effect border border-gray-600/50 rounded-lg text-white bg-slate-700" />
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Sub Judul Pengajuan</label>
                  <select value={subJudulId} onChange={e => setSubJudulId(e.target.value)} className="w-full px-4 py-2 glass-effect border border-gray-600/50 rounded-lg text-white bg-slate-700">
                    <option value="">Pilih Sub Judul</option>
                    {subJudulList.map(s => <option key={s.id} value={s.id}>{s.nama}</option>)}
                    <option value="lainnya">Lainnya</option>
                  </select>
                  {subJudulId === 'lainnya' && (
                    <input type="text" value={subJudulLainnya} onChange={e => setSubJudulLainnya(e.target.value)} placeholder="Isi sub judul lainnya" className="mt-2 w-full px-4 py-2 glass-effect border border-gray-600/50 rounded-lg text-white bg-slate-700" />
                  )}
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-300 mb-2">Deskripsi (Opsional)</label>
                  <textarea value={description} onChange={e => setDescription(e.target.value)} className="w-full px-4 py-2 glass-effect border border-gray-600/50 rounded-lg text-white bg-slate-700" rows={3} placeholder="Jelaskan detail pengeluaran dan keperluan..." />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-300 mb-2">Upload Bukti Kwitansi (Opsional, bisa lebih dari satu)</label>
                  <input type="file" multiple onChange={e => setBuktiFiles(Array.from(e.target.files || []))} className="w-full px-4 py-2 glass-effect border border-gray-600/50 rounded-lg text-white bg-slate-700" accept=".jpg,.jpeg,.png,.pdf" />
                </div>
              </div>

              {/* Add Item Form */}
              <div className="border border-gray-700/50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-white mb-4">Tambah Item Pengeluaran</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <Input
                    label="Deskripsi"
                    value={newItem.description}
                    onChange={(e) => setNewItem(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Contoh: Grab Car"
                  />
                  <Input
                    label="Jumlah (Rp)"
                    type="number"
                    value={newItem.amount}
                    onChange={(e) => setNewItem(prev => ({ ...prev, amount: e.target.value }))}
                    placeholder="50000"
                  />
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Kategori</label>
                    <select
                      value={newItem.category}
                      onChange={(e) => setNewItem(prev => ({ ...prev, category: e.target.value }))}
                      className="w-full px-4 py-2 glass-effect border border-gray-600/50 rounded-lg text-white bg-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                    >
                      <option value="">Pilih Kategori</option>
                      {categories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <Button
                  onClick={addItem}
                  className="mt-4 bg-gradient-to-r from-green-500 to-teal-600"
                  size="sm"
                >
                  <PlusIcon className="w-4 h-4 mr-2" />
                  Tambah Item
                </Button>
              </div>

              {/* Items List */}
              {items.length > 0 && (
                <div className="border border-gray-700/50 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-white mb-4">Daftar Pengeluaran</h3>
                  <div className="space-y-2">
                    {items.map((item) => (
                      <div key={item.id} className="flex items-center justify-between p-3 glass-effect rounded-lg border border-gray-700/50">
                        <div className="flex-1">
                          <p className="text-white font-medium">{item.description}</p>
                          <div className="flex items-center space-x-4 text-sm text-gray-400">
                            <span>{item.category}</span>
                            <span>{new Date(item.date).toLocaleDateString('id-ID')}</span>
                            {/* Tidak ada file kwitansi per item */}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-white font-semibold">
                            Rp {item.amount.toLocaleString('id-ID')}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 p-3 bg-cyan-500/10 border border-cyan-500/30 rounded-lg">
                    <p className="text-cyan-300 font-semibold">
                      Total: Rp {items.reduce((sum, item) => sum + item.amount, 0).toLocaleString('id-ID')}
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-2 mt-6 justify-end">
              <Button 
                variant="outline" 
                onClick={() => setShowForm(false)} 
                className="text-gray-300"
              >
                Batal
              </Button>
              <Button 
                onClick={submitRequest}
                className="bg-gradient-to-r from-cyan-500 to-blue-600"
                disabled={submitting}
              >
                {submitting ? 'Mengirim...' : 'Ajukan Reimbursement'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}; 