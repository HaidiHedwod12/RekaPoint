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
  updateReimbursementRequestByUser,
  deleteReimbursementRequest,
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

  // New item form
  const [newItem, setNewItem] = useState({
    description: '',
    amount: '',
    category: '',
    date: ''
  });

  // Hapus formData, gunakan state terpisah untuk judul, subjudul, tanggal, deskripsi, items
  const [items, setItems] = useState<ReimbursementItem[]>([]);
  const [description, setDescription] = useState('');

  // Edit state
  const [editRequest, setEditRequest] = useState<ReimbursementRequest | null>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [editItem, setEditItem] = useState<ReimbursementItem | null>(null);
  const [editItemForm, setEditItemForm] = useState<any>({});

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

  useEffect(() => {
    if (editForm.judulId && editForm.judulId !== 'lainnya') {
      getSubJudulByJudul(editForm.judulId).then(setSubJudulList);
    } else {
      setSubJudulList([]);
    }
  }, [editForm.judulId]);

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
    };
    setItems(prev => [...prev, item]);
    setNewItem({ description: '', amount: '', category: '', date: '' });
  };

  const removeItem = (itemId: string) => {
    setItems(prev => prev.filter(item => item.id !== itemId));
  };

  const addEditItem = () => {
    if (!newItem.description || !newItem.amount || !newItem.category) {
      alert('Mohon lengkapi semua field item');
      return;
    }
    const item: ReimbursementItem = {
      id: Date.now().toString(),
      description: newItem.description,
      amount: parseFloat(newItem.amount),
      category: newItem.category,
      date: editRequest ? editForm.tanggal : tanggal
    };
    
    if (editRequest) {
      setEditForm((prev: any) => ({
        ...prev,
        items: [...(prev.items || []), item]
      }));
    } else {
      setItems(prev => [...prev, item]);
    }
    setNewItem({ description: '', amount: '', category: '', date: '' });
  };

  const removeEditItem = (itemId: string) => {
    if (editRequest) {
      setEditForm((prev: any) => ({
        ...prev,
        items: (prev.items || []).filter((item: any) => item.id !== itemId)
      }));
    } else {
      setItems(prev => prev.filter(item => item.id !== itemId));
    }
  };

  const startEditItem = (item: ReimbursementItem) => {
    setEditItem(item);
    setEditItemForm({
      description: item.description,
      amount: item.amount.toString(),
      category: item.category
    });
  };

  const saveEditItem = () => {
    if (!editItem || !editItemForm.description || !editItemForm.amount || !editItemForm.category) {
      alert('Mohon lengkapi semua field item');
      return;
    }

    const updatedItem = {
      ...editItem,
      description: editItemForm.description,
      amount: parseFloat(editItemForm.amount),
      category: editItemForm.category
    };

    if (editRequest) {
      setEditForm((prev: any) => ({
        ...prev,
        items: (prev.items || []).map((item: any) => 
          item.id === editItem.id ? updatedItem : item
        )
      }));
    } else {
      setItems(prev => prev.map(item => 
        item.id === editItem.id ? updatedItem : item
      ));
    }

    setEditItem(null);
    setEditItemForm({});
  };

  const cancelEditItem = () => {
    setEditItem(null);
    setEditItemForm({});
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
      setRequests(prev => [newRequest, ...prev]);
      setShowForm(false);
      setItems([]);
      setDescription('');
      setJudulId(''); setSubJudulId(''); setJudulLainnya(''); setSubJudulLainnya(''); setTanggal('');
    } catch (error) {
      console.error('Error submitting request:', error);
      alert('Gagal mengirim permintaan');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async (request: ReimbursementRequest) => {
    // Cari judul yang sesuai
    const matchedJudul = judulList.find(j => j.nama === request.title);
    
    setEditRequest(request);
    setEditForm({
      title: request.title,
      subjudul: request.subjudul,
      tanggal: request.tanggal,
      description: request.description || '',
      items: request.items || [],
      judulId: matchedJudul ? matchedJudul.id : 'lainnya',
      subJudulId: '' // Akan diisi setelah load subjudul
    });
    
    // Load subjudul jika ada judul yang dipilih
    if (matchedJudul) {
      const subJuduls = await getSubJudulByJudul(matchedJudul.id);
      setSubJudulList(subJuduls);
      
      // Cari subjudul yang sesuai setelah load
      const matchedSubJudul = subJuduls.find(s => s.nama === request.subjudul);
      setEditForm((prev: any) => ({
        ...prev,
        subJudulId: matchedSubJudul ? matchedSubJudul.id : 'lainnya'
      }));
    }
    
    setShowForm(true);
  };

  const handleEditSave = async () => {
    if (!editRequest || !user) return;
    
    setSubmitting(true);
    try {
      // Update reimbursement request
      const updatedRequest = {
        title: editForm.title,
        subjudul: editForm.subjudul,
        tanggal: editForm.tanggal,
        description: editForm.description,
        items: editForm.items
      };
      
      // Call update function
      await updateReimbursementRequestByUser(editRequest.id, updatedRequest, user);
      
      setEditRequest(null);
      setEditForm({});
      setShowForm(false);
      await loadReimbursements();
      alert('Reimbursement berhasil diupdate!');
    } catch (error) {
      console.error('Error updating request:', error);
      alert('Gagal mengupdate reimbursement');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (requestId: string) => {
    if (!user) return;

    if (window.confirm('Apakah Anda yakin ingin menghapus permintaan reimbursement ini?')) {
      try {
        await deleteReimbursementRequest(requestId);
        alert('Reimbursement berhasil dihapus.');
        loadReimbursements();
      } catch (error) {
        console.error('Error deleting reimbursement:', error);
        alert('Gagal menghapus reimbursement.');
      }
    }
  };

  const resetForm = () => {
    setEditRequest(null);
    setEditForm({});
    setEditItem(null);
    setEditItemForm({});
    setItems([]);
    setDescription('');
    setJudulId('');
    setSubJudulId('');
    setJudulLainnya('');
    setSubJudulLainnya('');
    setTanggal('');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-16 h-16 border-4 border-gray-600 border-t-cyan-400 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <>
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
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sm:gap-0 mb-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
                <button
                  onClick={() => navigate('/dashboard')}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl glass-effect border border-cyan-400/30 text-cyan-200 font-semibold shadow-md hover:bg-cyan-700/20 hover:text-white transition w-full sm:w-auto"
                >
                  Kembali
                </button>
                <div>
                  <h1 className="text-2xl sm:text-4xl font-extrabold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent mb-1 drop-shadow-lg">Reimbursement</h1>
                  <div className="text-cyan-200 text-sm sm:text-lg font-medium opacity-80">Ajukan dan kelola penggantian biaya operasional</div>
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
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                {requests.map((request, index) => (
                  <motion.div
                    key={request.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Card>
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4 mb-2">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="flex-shrink-0 flex items-center justify-center bg-cyan-700/30 rounded-full p-2 min-w-[40px] min-h-[40px]">
                            <DocumentIcon className="w-7 h-7 text-cyan-300" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h2 className="text-lg sm:text-xl font-bold text-white truncate">{request.title}</h2>
                            <div className="text-cyan-200 text-xs sm:text-sm opacity-80 truncate">{request.subjudul}</div>
                          </div>
                        </div>
                        <div className="flex sm:flex-col items-start sm:items-end gap-2 mt-2 sm:mt-0">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(request.status)}`}>
                            {getStatusIcon(request.status)}
                            <span className="ml-1">{getStatusLabel(request.status)}</span>
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
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
                            <p className="text-sm text-gray-400">Tanggal Kegiatan</p>
                            <p className="text-white">
                              {new Date(request.tanggal).toLocaleDateString('id-ID')}
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
                    </Card>
                  </motion.div>
                ))}
              </motion.div>
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

          {/* Form Modal */}
          {showForm && (
            <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
              <div className="bg-slate-800 rounded-xl p-8 w-full max-w-4xl max-h-[90vh] overflow-y-auto border border-cyan-500/30">
                <h2 className="text-xl font-bold text-cyan-300 mb-6">
                  {editRequest ? 'Edit Reimbursement' : 'Ajukan Reimbursement'}
                </h2>
                
                <div className="space-y-6">
                  {/* Basic Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Tanggal Kegiatan</label>
                      <input 
                        type="date" 
                        value={editRequest ? editForm.tanggal : tanggal} 
                        onChange={e => editRequest ? setEditForm({...editForm, tanggal: e.target.value}) : setTanggal(e.target.value)} 
                        className="w-full px-4 py-2 glass-effect border border-gray-600/50 rounded-lg text-white bg-slate-700" 
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Tanggal Ajuan</label>
                      <input
                        type="date"
                        value={new Date().toISOString().split('T')[0]}
                        className="w-full px-4 py-2 glass-effect border border-gray-600/50 rounded-lg text-gray-500 bg-slate-800 cursor-not-allowed"
                        disabled
                      />
                      <p className="text-xs text-gray-400 mt-1">Otomatis terisi dengan tanggal hari ini</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Judul Pengajuan</label>
                      {editRequest ? (
                        <div>
                          <select 
                            value={editForm.judulId || ''} 
                            onChange={e => setEditForm({...editForm, judulId: e.target.value, title: e.target.value === 'lainnya' ? editForm.title : (judulList.find(j => j.id === e.target.value)?.nama || '')})} 
                            className="w-full px-4 py-2 glass-effect border border-gray-600/50 rounded-lg text-white bg-slate-700"
                          >
                            <option value="">Pilih Judul</option>
                            {judulList.map(j => <option key={j.id} value={j.id}>{j.nama}</option>)}
                            <option value="lainnya">Lainnya</option>
                          </select>
                          {(editForm.judulId === 'lainnya' || (!editForm.judulId && editForm.title && !judulList.find(j => j.nama === editForm.title))) && (
                            <input 
                              type="text" 
                              value={editForm.title} 
                              onChange={e => setEditForm({...editForm, title: e.target.value})} 
                              placeholder="Isi judul lainnya" 
                              className="mt-2 w-full px-4 py-2 glass-effect border border-gray-600/50 rounded-lg text-white bg-slate-700" 
                            />
                          )}
                        </div>
                      ) : (
                        <div>
                          <select value={judulId} onChange={e => setJudulId(e.target.value)} className="w-full px-4 py-2 glass-effect border border-gray-600/50 rounded-lg text-white bg-slate-700">
                            <option value="">Pilih Judul</option>
                            {judulList.map(j => <option key={j.id} value={j.id}>{j.nama}</option>)}
                            <option value="lainnya">Lainnya</option>
                          </select>
                          {judulId === 'lainnya' && (
                            <input type="text" value={judulLainnya} onChange={e => setJudulLainnya(e.target.value)} placeholder="Isi judul lainnya" className="mt-2 w-full px-4 py-2 glass-effect border border-gray-600/50 rounded-lg text-white bg-slate-700" />
                          )}
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Sub Judul Pengajuan</label>
                      {editRequest ? (
                        <div>
                          <select 
                            value={editForm.subJudulId || ''} 
                            onChange={e => setEditForm({...editForm, subJudulId: e.target.value, subjudul: e.target.value === 'lainnya' ? editForm.subjudul : (subJudulList.find(s => s.id === e.target.value)?.nama || '')})} 
                            className="w-full px-4 py-2 glass-effect border border-gray-600/50 rounded-lg text-white bg-slate-700"
                          >
                            <option value="">Pilih Sub Judul</option>
                            {subJudulList.map(s => <option key={s.id} value={s.id}>{s.nama}</option>)}
                            <option value="lainnya">Lainnya</option>
                          </select>
                          {(editForm.subJudulId === 'lainnya' || (!editForm.subJudulId && editForm.subjudul && !subJudulList.find(s => s.nama === editForm.subjudul))) && (
                            <input 
                              type="text" 
                              value={editForm.subjudul} 
                              onChange={e => setEditForm({...editForm, subjudul: e.target.value})} 
                              placeholder="Isi sub judul lainnya" 
                              className="mt-2 w-full px-4 py-2 glass-effect border border-gray-600/50 rounded-lg text-white bg-slate-700" 
                            />
                          )}
                        </div>
                      ) : (
                        <div>
                          <select value={subJudulId} onChange={e => setSubJudulId(e.target.value)} className="w-full px-4 py-2 glass-effect border border-gray-600/50 rounded-lg text-white bg-slate-700">
                            <option value="">Pilih Sub Judul</option>
                            {subJudulList.map(s => <option key={s.id} value={s.id}>{s.nama}</option>)}
                            <option value="lainnya">Lainnya</option>
                          </select>
                          {subJudulId === 'lainnya' && (
                            <input type="text" value={subJudulLainnya} onChange={e => setSubJudulLainnya(e.target.value)} placeholder="Isi sub judul lainnya" className="mt-2 w-full px-4 py-2 glass-effect border border-gray-600/50 rounded-lg text-white bg-slate-700" />
                          )}
                        </div>
                      )}
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-300 mb-2">Deskripsi (Opsional)</label>
                      <textarea 
                        value={editRequest ? editForm.description : description} 
                        onChange={e => editRequest ? setEditForm({...editForm, description: e.target.value}) : setDescription(e.target.value)} 
                        className="w-full px-4 py-2 glass-effect border border-gray-600/50 rounded-lg text-white bg-slate-700" 
                        rows={3} 
                        placeholder="Jelaskan detail pengeluaran dan keperluan..." 
                      />
                    </div>

                  </div>

                  {/* Items management for edit */}
                  {editRequest && (
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-4">Item Pengeluaran</h3>
                      <div className="space-y-2 mb-4">
                        {editForm.items?.map((item: any, index: number) => (
                          <div key={item.id} className="p-3 glass-effect rounded-lg border border-gray-700/50">
                            {editItem?.id === item.id ? (
                              // Edit mode
                              <div className="space-y-3">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                  <Input
                                    label="Deskripsi"
                                    value={editItemForm.description}
                                    onChange={(e) => setEditItemForm({...editItemForm, description: e.target.value})}
                                    placeholder="Contoh: Grab Car"
                                  />
                                  <Input
                                    label="Jumlah (Rp)"
                                    type="number"
                                    value={editItemForm.amount}
                                    onChange={(e) => setEditItemForm({...editItemForm, amount: e.target.value})}
                                    placeholder="50000"
                                  />
                                  <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">Kategori</label>
                                    <select
                                      value={editItemForm.category}
                                      onChange={(e) => setEditItemForm({...editItemForm, category: e.target.value})}
                                      className="w-full px-4 py-2 glass-effect border border-gray-600/50 rounded-lg text-white bg-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                                    >
                                      <option value="">Pilih Kategori</option>
                                      {categories.map(cat => (
                                        <option key={cat} value={cat}>{cat}</option>
                                      ))}
                                    </select>
                                  </div>
                                </div>
                                <div className="flex gap-2">
                                  <Button
                                    onClick={saveEditItem}
                                    className="bg-gradient-to-r from-green-500 to-teal-600"
                                    size="sm"
                                  >
                                    Simpan
                                  </Button>
                                  <Button
                                    onClick={cancelEditItem}
                                    variant="outline"
                                    className="border-gray-500/50 text-gray-300"
                                    size="sm"
                                  >
                                    Batal
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              // View mode
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <p className="text-white font-medium">{item.description}</p>
                                  <div className="flex items-center space-x-4 text-sm text-gray-400">
                                    <span>{item.category}</span>
                                    <span>{new Date(item.date).toLocaleDateString('id-ID')}</span>
                                  </div>
                                </div>
                                <div className="text-right mr-4">
                                  <p className="text-white font-semibold">
                                    Rp {item.amount.toLocaleString('id-ID')}
                                  </p>
                                </div>
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => startEditItem(item)}
                                    className="text-yellow-400 hover:text-yellow-300"
                                    title="Edit"
                                  >
                                    <PencilIcon className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => removeEditItem(item.id)}
                                    className="text-red-400 hover:text-red-300"
                                    title="Hapus"
                                  >
                                    <TrashIcon className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                      
                      {/* Add new item form for edit */}
                      <div className="border border-gray-700/50 rounded-lg p-4">
                        <h4 className="text-md font-semibold text-white mb-4">Tambah Item Baru</h4>
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
                          onClick={addEditItem}
                          className="mt-4 bg-gradient-to-r from-green-500 to-teal-600"
                          size="sm"
                        >
                          <PlusIcon className="w-4 h-4 mr-2" />
                          Tambah Item
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Add Item Form for new request */}
                  {!editRequest && (
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
                  )}

                  {/* Items List for new request */}
                  {!editRequest && items.length > 0 && (
                    <div className="border border-gray-700/50 rounded-lg p-4">
                      <h3 className="text-lg font-semibold text-white mb-4">Daftar Pengeluaran</h3>
                      <div className="space-y-2">
                        {items.map((item) => (
                          <div key={item.id} className="p-3 glass-effect rounded-lg border border-gray-700/50">
                            {editItem?.id === item.id ? (
                              // Edit mode
                              <div className="space-y-3">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                  <Input
                                    label="Deskripsi"
                                    value={editItemForm.description}
                                    onChange={(e) => setEditItemForm({...editItemForm, description: e.target.value})}
                                    placeholder="Contoh: Grab Car"
                                  />
                                  <Input
                                    label="Jumlah (Rp)"
                                    type="number"
                                    value={editItemForm.amount}
                                    onChange={(e) => setEditItemForm({...editItemForm, amount: e.target.value})}
                                    placeholder="50000"
                                  />
                                  <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">Kategori</label>
                                    <select
                                      value={editItemForm.category}
                                      onChange={(e) => setEditItemForm({...editItemForm, category: e.target.value})}
                                      className="w-full px-4 py-2 glass-effect border border-gray-600/50 rounded-lg text-white bg-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                                    >
                                      <option value="">Pilih Kategori</option>
                                      {categories.map(cat => (
                                        <option key={cat} value={cat}>{cat}</option>
                                      ))}
                                    </select>
                                  </div>
                                </div>
                                <div className="flex gap-2">
                                  <Button
                                    onClick={saveEditItem}
                                    className="bg-gradient-to-r from-green-500 to-teal-600"
                                    size="sm"
                                  >
                                    Simpan
                                  </Button>
                                  <Button
                                    onClick={cancelEditItem}
                                    variant="outline"
                                    className="border-gray-500/50 text-gray-300"
                                    size="sm"
                                  >
                                    Batal
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              // View mode
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <p className="text-white font-medium">{item.description}</p>
                                  <div className="flex items-center space-x-4 text-sm text-gray-400">
                                    <span>{item.category}</span>
                                    <span>{new Date(item.date).toLocaleDateString('id-ID')}</span>
                                  </div>
                                </div>
                                <div className="text-right mr-4">
                                  <p className="text-white font-semibold">
                                    Rp {item.amount.toLocaleString('id-ID')}
                                  </p>
                                </div>
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => startEditItem(item)}
                                    className="text-yellow-400 hover:text-yellow-300"
                                    title="Edit"
                                  >
                                    <PencilIcon className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => removeEditItem(item.id)}
                                    className="text-red-400 hover:text-red-300"
                                    title="Hapus"
                                  >
                                    <TrashIcon className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            )}
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
                    onClick={() => {
                      setShowForm(false);
                      resetForm();
                    }} 
                    className="text-gray-300"
                  >
                    Batal
                  </Button>
                  <Button 
                    onClick={editRequest ? handleEditSave : submitRequest}
                    className="bg-gradient-to-r from-cyan-500 to-blue-600"
                    disabled={submitting}
                  >
                    {submitting ? 'Mengirim...' : (editRequest ? 'Update Reimbursement' : 'Ajukan Reimbursement')}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}; 