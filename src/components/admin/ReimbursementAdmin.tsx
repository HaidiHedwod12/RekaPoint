import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  ArrowLeftIcon,
  DocumentTextIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  CurrencyDollarIcon,
  CalendarIcon,
  TagIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  TrashIcon,
  UserIcon,
  ChatBubbleLeftIcon,
  CheckIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { useNavigate } from 'react-router-dom';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Input } from '../ui/Input';
import { 
  getAllReimbursementRequests,
  updateReimbursementRequest,
  deleteReimbursementRequest,
  type ReimbursementRequest as DBReimbursementRequest
} from '../../lib/reimbursement';
import { useAuth } from '../../contexts/AuthContext';

// Use the database types
import { type ReimbursementItem as DBReimbursementItem } from '../../lib/reimbursement';
type ReimbursementItem = Omit<DBReimbursementItem, 'request_id' | 'created_at'> & {
  receipt_name?: string;
};

// Use the database type
type ReimbursementRequest = DBReimbursementRequest;

export const ReimbursementAdmin: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [requests, setRequests] = useState<ReimbursementRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<ReimbursementRequest | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showActionModal, setShowActionModal] = useState(false);
  const [actionType, setActionType] = useState<'approve' | 'reject' | 'paid'>('approve');
  const [notes, setNotes] = useState('');
  const [processing, setProcessing] = useState(false);
  const [filter, setFilter] = useState('all');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [processingDelete, setProcessingDelete] = useState(false);
  const [showEditStatusModal, setShowEditStatusModal] = useState(false);
  const [editStatus, setEditStatus] = useState<string>('pending');

  useEffect(() => {
    loadReimbursements();
  }, []);

  const loadReimbursements = async () => {
    try {
      console.log('Loading all reimbursement requests...');
      const data = await getAllReimbursementRequests();
      console.log('Loaded reimbursement requests:', data);
      setRequests(data);
    } catch (error) {
      console.error('Error loading reimbursements:', error);
      alert('Gagal memuat data reimbursement: ' + (error instanceof Error ? error.message : 'Unknown error'));
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

  const filteredRequests = requests.filter(request => {
    if (filter === 'all') return true;
    return request.status === filter;
  });

  const handleAction = (request: ReimbursementRequest, type: 'approve' | 'reject' | 'paid') => {
    setSelectedRequest(request);
    setActionType(type);
    setNotes('');
    setShowActionModal(true);
  };

  const processAction = async () => {
    if (!selectedRequest || !user) return;

    setProcessing(true);
    try {
      console.log('Processing action:', actionType, 'for request:', selectedRequest.id);
      
      // Update database
      const updatedRequest = await updateReimbursementRequest(
        selectedRequest.id,
        {
          status: actionType === 'approve' ? 'approved' : actionType === 'reject' ? 'rejected' : 'paid',
          notes: notes || undefined
        },
        user
      );

      // Update local state
      setRequests(prev => 
        prev.map(req => req.id === selectedRequest.id ? updatedRequest : req)
      );

      setShowActionModal(false);
      setSelectedRequest(null);
      alert('Permintaan berhasil diproses!');
    } catch (error) {
      console.error('Error processing action:', error);
      alert('Gagal memproses permintaan: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setProcessing(false);
    }
  };

  const handleDelete = (request: ReimbursementRequest) => {
    setSelectedRequest(request);
    setShowDeleteModal(true);
  };
  const processDelete = async () => {
    if (!selectedRequest) return;
    setProcessingDelete(true);
    try {
      await deleteReimbursementRequest(selectedRequest.id);
      setRequests(prev => prev.filter(req => req.id !== selectedRequest.id));
      setShowDeleteModal(false);
      setSelectedRequest(null);
      alert('Reimbursement berhasil dihapus!');
    } catch (error) {
      alert('Gagal menghapus reimbursement: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setProcessingDelete(false);
    }
  };
  const handleEditStatus = (request: ReimbursementRequest) => {
    setSelectedRequest(request);
    setEditStatus(request.status);
    setShowEditStatusModal(true);
  };
  const processEditStatus = async () => {
    if (!selectedRequest || !user) return;
    setProcessing(true);
    try {
      const updatedRequest = await updateReimbursementRequest(selectedRequest.id, { status: editStatus as any }, user);
      setRequests(prev => prev.map(req => req.id === selectedRequest.id ? updatedRequest : req));
      setShowEditStatusModal(false);
      setSelectedRequest(null);
      alert('Status reimbursement berhasil diubah!');
    } catch (error) {
      alert('Gagal mengubah status: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setProcessing(false);
    }
  };

  const getActionButton = (request: ReimbursementRequest) => {
    switch (request.status) {
      case 'pending':
        return (
          <>
            <Button
              size="sm"
              onClick={() => handleAction(request, 'approve')}
              className="bg-gradient-to-r from-green-500 to-teal-600"
            >
              <CheckIcon className="w-4 h-4 mr-1" />
              Setujui
            </Button>
            <Button
              size="sm"
              onClick={() => handleAction(request, 'reject')}
              className="bg-gradient-to-r from-red-500 to-pink-600"
            >
              <XMarkIcon className="w-4 h-4 mr-1" />
              Tolak
            </Button>
          </>
        );
      case 'approved':
        return (
          <Button
            size="sm"
            onClick={() => handleAction(request, 'paid')}
            className="bg-gradient-to-r from-blue-500 to-indigo-600"
          >
            <CurrencyDollarIcon className="w-4 h-4 mr-1" />
            Tandai Dibayar
          </Button>
        );
      default:
        return null;
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
                  Reimbursement Admin
                </h1>
                <p className="text-gray-400 mt-1 text-sm sm:text-base">Kelola permintaan reimbursement karyawan</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Filter */}
        <div className="mb-6">
          <div className="flex flex-wrap gap-2">
            {['all', 'pending', 'approved', 'rejected', 'paid'].map((status) => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`px-4 py-2 rounded-lg border transition-all ${
                  filter === status
                    ? 'border-cyan-400 bg-cyan-500/20 text-cyan-300'
                    : 'border-gray-600/50 text-gray-400 hover:border-gray-500/50'
                }`}
              >
                {status === 'all' ? 'Semua' : getStatusLabel(status)}
              </button>
            ))}
          </div>
        </div>

        {/* Requests List */}
        <div className="space-y-6">
          {filteredRequests.length > 0 ? (
            filteredRequests.map((request, index) => (
              <motion.div
                key={request.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card>
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full flex items-center justify-center">
                          <DocumentTextIcon className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center space-x-3">
                            <h3 className="text-xl font-semibold text-white">{request.title}</h3>
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(request.status)}`}>
                              {getStatusIcon(request.status)}
                              <span className="ml-1">{getStatusLabel(request.status)}</span>
                            </span>
                          </div>
                          <p className="text-gray-400">{request.description}</p>
                          <div className="flex items-center space-x-2 mt-1">
                            <UserIcon className="w-4 h-4 text-cyan-400" />
                            <span className="text-sm text-cyan-300 font-semibold">
                              {request.user_name}
                              {request.user_jabatan && (
                                <span className="text-cyan-400 font-normal"> ({request.user_jabatan})</span>
                              )}
                              {!request.user_name && request.user_id}
                            </span>
                          </div>
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
                        {request.processed_at && (
                          <div className="flex items-center space-x-2">
                            <CheckCircleIcon className="w-5 h-5 text-green-400" />
                            <div>
                              <p className="text-sm text-gray-400">Diproses</p>
                              <p className="text-white">
                                {new Date(request.processed_at).toLocaleDateString('id-ID')}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Quick Items Preview */}
                      <div className="mb-4">
                        <h4 className="text-sm font-medium text-gray-300 mb-2">Ringkasan Pengeluaran:</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {request.items?.slice(0, 4).map((item) => (
                            <div key={item.id} className="flex items-center justify-between p-2 glass-effect rounded border border-gray-700/50">
                              <span className="text-white text-sm truncate">{item.description}</span>
                              <span className="text-cyan-300 text-sm font-medium">
                                Rp {item.amount.toLocaleString('id-ID')}
                              </span>
                            </div>
                          ))}
                          {request.items && request.items.length > 4 && (
                            <div className="text-gray-400 text-sm italic">
                              +{request.items.length - 4} item lainnya
                            </div>
                          )}
                        </div>
                      </div>

                      {request.notes && (
                        <div className="mb-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                          <div className="flex items-start space-x-2">
                            <ChatBubbleLeftIcon className="w-5 h-5 text-yellow-400 mt-0.5" />
                            <div>
                              <p className="text-sm font-medium text-yellow-300">Catatan:</p>
                              <p className="text-yellow-200">{request.notes}</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col gap-2 w-full sm:w-auto mt-4 sm:mt-0">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedRequest(request);
                          setShowDetailModal(true);
                        }}
                        className="border-cyan-500/50 text-cyan-300 w-full"
                      >
                        <EyeIcon className="w-4 h-4 mr-1" />
                        Detail
                      </Button>
                      <div className="flex flex-row flex-wrap justify-center gap-2 w-full">
                        {getActionButton(request)}
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEditStatus(request)}
                        className="border-yellow-500/50 text-yellow-300 w-full"
                      >
                        <ExclamationTriangleIcon className="w-4 h-4 mr-1" />
                        Edit Status
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDelete(request)}
                        className="border-red-500/50 text-red-300 w-full"
                      >
                        <TrashIcon className="w-4 h-4 mr-1" />
                        Hapus
                      </Button>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))
          ) : (
            <Card>
              <div className="text-center py-12">
                <DocumentTextIcon className="w-16 h-16 text-gray-500 mx-auto mb-4" />
                <p className="text-gray-400">
                  {filter === 'all' 
                    ? 'Belum ada permintaan reimbursement'
                    : `Tidak ada permintaan dengan status "${getStatusLabel(filter)}"`
                  }
                </p>
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Detail Modal */}
      {showDetailModal && selectedRequest && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-xl p-8 w-full max-w-4xl max-h-[90vh] overflow-y-auto border border-cyan-500/30">
            <h2 className="text-xl font-bold text-cyan-300 mb-6">Detail Reimbursement</h2>
            
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="text-lg font-semibold text-white mb-2">{selectedRequest.title}</h3>
                  <p className="text-gray-400">{selectedRequest.description}</p>
                  <div className="flex items-center space-x-2 mt-2">
                    <UserIcon className="w-4 h-4 text-cyan-400" />
                    <span className="text-sm text-cyan-300 font-semibold">
                      {selectedRequest.user_name}
                      {selectedRequest.user_jabatan && (
                        <span className="text-cyan-400 font-normal"> ({selectedRequest.user_jabatan})</span>
                      )}
                      {!selectedRequest.user_name && `User ID: ${selectedRequest.user_id}`}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(selectedRequest.status)}`}>
                    {getStatusIcon(selectedRequest.status)}
                    <span className="ml-1">{getStatusLabel(selectedRequest.status)}</span>
                  </div>
                  <p className="text-2xl font-bold text-cyan-400 mt-2">
                    Rp {selectedRequest.total_amount.toLocaleString('id-ID')}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="text-lg font-semibold text-white">Detail Pengeluaran:</h4>
                {selectedRequest.items?.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-3 glass-effect rounded-lg border border-gray-700/50">
                    <div className="flex-1">
                      <p className="text-white font-medium">{item.description}</p>
                      <div className="flex items-center space-x-4 text-sm text-gray-400">
                        <span>{item.category}</span>
                        <span>{new Date(item.date).toLocaleDateString('id-ID')}</span>
                        {item.receipt_file_name && (
                          <span className="flex items-center">
                            <DocumentTextIcon className="w-4 h-4 mr-1" />
                            {item.receipt_file_name}
                          </span>
                        )}
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

              {selectedRequest.notes && (
                <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                  <div className="flex items-start space-x-2">
                    <ChatBubbleLeftIcon className="w-5 h-5 text-yellow-400 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-yellow-300">Catatan:</p>
                      <p className="text-yellow-200">{selectedRequest.notes}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-2 mt-6 justify-end">
              <Button 
                variant="outline" 
                onClick={() => setShowDetailModal(false)} 
                className="text-gray-300"
              >
                Tutup
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Action Modal */}
      {showActionModal && selectedRequest && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-xl p-8 w-full max-w-lg border border-cyan-500/30">
            <h2 className="text-xl font-bold text-cyan-300 mb-6">
              {actionType === 'approve' ? 'Setujui' : actionType === 'reject' ? 'Tolak' : 'Tandai Dibayar'} Reimbursement
            </h2>
            
            <div className="mb-6">
              <p className="text-white mb-2">
                <strong className="text-cyan-300 font-semibold">
                  {selectedRequest.user_name}
                  {selectedRequest.user_jabatan && (
                    <span className="text-cyan-400 font-normal"> ({selectedRequest.user_jabatan})</span>
                  )}
                  {!selectedRequest.user_name && `User ID: ${selectedRequest.user_id}`}
                </strong> - {selectedRequest.title}
              </p>
              <p className="text-cyan-300 font-semibold">
                Total: Rp {selectedRequest.total_amount.toLocaleString('id-ID')}
              </p>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Catatan (Opsional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-4 py-2 glass-effect border border-gray-600/50 rounded-lg text-white bg-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                rows={3}
                placeholder="Tambahkan catatan jika diperlukan..."
              />
            </div>

            <div className="flex gap-2 justify-end">
              <Button 
                variant="outline" 
                onClick={() => setShowActionModal(false)} 
                className="text-gray-300"
              >
                Batal
              </Button>
              <Button 
                onClick={processAction}
                className={
                  actionType === 'approve' 
                    ? 'bg-gradient-to-r from-green-500 to-teal-600'
                    : actionType === 'reject'
                    ? 'bg-gradient-to-r from-red-500 to-pink-600'
                    : 'bg-gradient-to-r from-blue-500 to-indigo-600'
                }
                disabled={processing}
              >
                {processing ? 'Memproses...' : 
                  actionType === 'approve' ? 'Setujui' : 
                  actionType === 'reject' ? 'Tolak' : 'Tandai Dibayar'
                }
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Hapus */}
      {showDeleteModal && selectedRequest && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-xl p-8 w-full max-w-lg border border-red-500/30">
            <h2 className="text-xl font-bold text-red-300 mb-6">Hapus Reimbursement</h2>
            <p className="text-white mb-4">Yakin ingin menghapus reimbursement <span className="text-cyan-300 font-semibold">{selectedRequest.title}</span> dari <span className="text-cyan-300 font-semibold">{selectedRequest.user_name || selectedRequest.user_id}</span>?</p>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowDeleteModal(false)} className="text-gray-300">Batal</Button>
              <Button onClick={processDelete} className="bg-gradient-to-r from-red-500 to-pink-600" disabled={processingDelete}>{processingDelete ? 'Menghapus...' : 'Hapus'}</Button>
            </div>
          </div>
        </div>
      )}
      {/* Modal Edit Status */}
      {showEditStatusModal && selectedRequest && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-xl p-8 w-full max-w-lg border border-yellow-500/30">
            <h2 className="text-xl font-bold text-yellow-300 mb-6">Edit Status Reimbursement</h2>
            <p className="text-white mb-4">Ubah status reimbursement <span className="text-cyan-300 font-semibold">{selectedRequest.title}</span> dari <span className="text-cyan-300 font-semibold">{selectedRequest.user_name || selectedRequest.user_id}</span>:</p>
            <select value={editStatus} onChange={e => setEditStatus(e.target.value)} className="w-full px-4 py-2 glass-effect border border-gray-600/50 rounded-lg text-white bg-slate-700 mb-4">
              <option value="pending">Menunggu Persetujuan</option>
              <option value="approved">Disetujui</option>
              <option value="rejected">Ditolak</option>
              <option value="paid">Sudah Dibayar</option>
            </select>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowEditStatusModal(false)} className="text-gray-300">Batal</Button>
              <Button onClick={processEditStatus} className="bg-gradient-to-r from-yellow-500 to-yellow-400" disabled={processing}>{processing ? 'Menyimpan...' : 'Simpan'}</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}; 