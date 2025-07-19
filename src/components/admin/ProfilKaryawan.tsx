import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  UserIcon, 
  ArrowLeftIcon,
  CalendarIcon,
  MapPinIcon,
  BriefcaseIcon,
  DocumentIcon,
  PlusIcon,
  TrashIcon,
  ArrowDownTrayIcon,
  EyeIcon,
  PhoneIcon,
  EnvelopeIcon,
  IdentificationIcon,
  AcademicCapIcon,
  HeartIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline';
import { useNavigate } from 'react-router-dom';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Input } from '../ui/Input';
import { getAllUsers } from '../../lib/database';
import { User } from '../../types';
import { supabase } from '../../lib/supabase';
import { uploadUserDocument, getUserDocuments, deleteUserDocument, UserDocument, downloadDocument } from '../../lib/fileUpload';
import JSZip from 'jszip';

interface EmployeeProfile extends User {
  tanggal_lahir?: string;
  alamat?: string;
  no_telp?: string;
  email?: string;
  status_karyawan?: 'aktif' | 'nonaktif' | 'kontrak' | 'probation';
  tanggal_bergabung?: string;
  posisi?: string;
  departemen?: string;
  gaji?: number;
  bpjs_kesehatan?: boolean;
  bpjs_ketenagakerjaan?: boolean;
}

interface EmployeeDocument {
  id: string;
  employee_id: string;
  document_type: 'cv' | 'kontrak' | 'sertifikasi' | 'bpjs_kesehatan' | 'bpjs_ketenagakerjaan' | 'ktp' | 'kk' | 'ijazah' | 'lainnya';
  file_name: string;
  file_path: string;
  file_size: number;
  uploaded_at: string;
  description?: string;
}

export const ProfilKaryawan: React.FC = () => {
  const navigate = useNavigate();
  const [employees, setEmployees] = useState<EmployeeProfile[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [showProfileForm, setShowProfileForm] = useState(false);
  const [showDocumentUpload, setShowDocumentUpload] = useState(false);
  const [documents, setDocuments] = useState<UserDocument[]>([]);
  const [uploading, setUploading] = useState(false);
  const [profileForm, setProfileForm] = useState<any>({});
  const [savingProfile, setSavingProfile] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedDocumentType, setSelectedDocumentType] = useState('cv');
  const [documentDescription, setDocumentDescription] = useState('');
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);

  useEffect(() => {
    loadEmployees();
  }, []);

  // Ambil dokumen karyawan saat selectedEmployee berubah
  useEffect(() => {
    const fetchDocuments = async () => {
      if (selectedEmployee) {
        const docs = await getUserDocuments(selectedEmployee.id);
        setDocuments(docs);
      } else {
        setDocuments([]);
      }
    };
    fetchDocuments();
  }, [selectedEmployee, showDocumentUpload]);

  const loadEmployees = async () => {
    try {
      const data = await getAllUsers();
      setEmployees(data.filter(user => user.role === 'karyawan'));
    } catch (error) {
      console.error('Error loading employees:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'aktif': return 'bg-green-500/20 text-green-300 border-green-500/50';
      case 'kontrak': return 'bg-blue-500/20 text-blue-300 border-blue-500/50';
      case 'probation': return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/50';
      case 'nonaktif': return 'bg-red-500/20 text-red-300 border-red-500/50';
      default: return 'bg-gray-500/20 text-gray-300 border-gray-500/50';
    }
  };

  const getDocumentIcon = (type: string) => {
    switch (type) {
      case 'cv': return <DocumentIcon className="w-5 h-5" />;
      case 'kontrak': return <BriefcaseIcon className="w-5 h-5" />;
      case 'sertifikasi': return <AcademicCapIcon className="w-5 h-5" />;
      case 'bpjs_kesehatan': return <HeartIcon className="w-5 h-5" />;
      case 'bpjs_ketenagakerjaan': return <ShieldCheckIcon className="w-5 h-5" />;
      default: return <DocumentIcon className="w-5 h-5" />;
    }
  };

  const getDocumentTypeLabel = (type: string) => {
    switch (type) {
      case 'cv': return 'CV/Resume';
      case 'kontrak': return 'Kontrak Kerja';
      case 'sertifikasi': return 'Sertifikasi';
      case 'bpjs_kesehatan': return 'BPJS Kesehatan';
      case 'bpjs_ketenagakerjaan': return 'BPJS Ketenagakerjaan';
      case 'ktp': return 'KTP';
      case 'kk': return 'Kartu Keluarga';
      case 'ijazah': return 'Ijazah';
      default: return 'Dokumen Lainnya';
    }
  };

  // Saat klik Edit Profil, isi form dengan data karyawan
  const openEditProfile = () => {
    if (!selectedEmployee) return;
    setProfileForm({
      nama: selectedEmployee.nama || '',
      jabatan: selectedEmployee.jabatan || '',
      tanggal_lahir: selectedEmployee.tanggal_lahir || '',
      no_telp: selectedEmployee.no_telp || '',
      email: selectedEmployee.email || '',
      status_karyawan: selectedEmployee.status_karyawan || 'aktif',
      alamat: selectedEmployee.alamat || '',
    });
    setShowProfileForm(true);
  };

  // Handler simpan profil
  const handleSaveProfile = async () => {
    if (!selectedEmployee) return;
    setSavingProfile(true);
    try {
      const { error } = await supabase
        .from('users')
        .update({
          nama: profileForm.nama,
          jabatan: profileForm.jabatan,
          tanggal_lahir: profileForm.tanggal_lahir,
          no_telp: profileForm.no_telp,
          email: profileForm.email,
          status_karyawan: profileForm.status_karyawan,
          alamat: profileForm.alamat,
        })
        .eq('id', selectedEmployee.id);
      if (error) throw error;
      await loadEmployees();
      setShowProfileForm(false);
      alert('Profil berhasil diupdate!');
    } catch (err) {
      alert('Gagal update profil: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setSavingProfile(false);
    }
  };

  const handleUploadDocument = async () => {
    if (!selectedEmployee || !selectedFile) {
      alert('Pilih file dan karyawan terlebih dahulu!');
      return;
    }
    setUploading(true);
    const result = await uploadUserDocument(
      selectedEmployee.id,
      selectedFile,
      selectedDocumentType as any // pastikan sesuai tipe
    );
    setUploading(false);
    if (result.success) {
      alert('Upload dokumen berhasil!');
      setShowDocumentUpload(false);
      setSelectedFile(null);
      setDocumentDescription('');
      // refresh dokumen jika perlu
    } else {
      alert('Gagal upload dokumen: ' + result.error);
    }
  };

  const handleDeleteDocument = async (docId: string) => {
    if (window.confirm('Yakin ingin menghapus dokumen ini?')) {
      const success = await deleteUserDocument(docId);
      if (success) {
        alert('Dokumen berhasil dihapus');
        // Refresh dokumen
        if (selectedEmployee) {
          const docs = await getUserDocuments(selectedEmployee.id);
          setDocuments(docs);
        }
      } else {
        alert('Gagal menghapus dokumen');
      }
    }
  };

  const handleSelectDoc = (docId: string) => {
    setSelectedDocIds((prev) =>
      prev.includes(docId) ? prev.filter((id) => id !== docId) : [...prev, docId]
    );
  };
  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedDocIds([]);
      setSelectAll(false);
    } else {
      setSelectedDocIds(documents.map((doc) => doc.id));
      setSelectAll(true);
    }
  };
  // Download selected (ZIP jika >1)
  const handleDownloadSelected = async () => {
    const docsToDownload = documents.filter((doc) => selectedDocIds.includes(doc.id));
    if (docsToDownload.length === 0) return;
    if (docsToDownload.length === 1) {
      const doc = docsToDownload[0];
      await downloadDocument(doc.file_path, getDownloadFileName(doc, selectedEmployee));
      return;
    }
    // ZIP
    const zip = new JSZip();
    for (const doc of docsToDownload) {
      const { data, error } = await supabase.storage.from('user-documents').createSignedUrl(doc.file_path, 3600);
      if (error) continue;
      const response = await fetch(data.signedUrl);
      const blob = await response.blob();
      zip.file(getDownloadFileName(doc, selectedEmployee), blob);
    }
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(zipBlob);
    link.download = `Dokumen_${selectedEmployee?.nama || 'karyawan'}.zip`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  };
  // Delete selected
  const handleDeleteSelected = async () => {
    if (selectedDocIds.length === 0) return;
    if (!window.confirm('Yakin ingin menghapus dokumen yang dipilih?')) return;
    for (const docId of selectedDocIds) {
      await deleteUserDocument(docId);
    }
    if (selectedEmployee) {
      const docs = await getUserDocuments(selectedEmployee.id);
      setDocuments(docs);
    }
    setSelectedDocIds([]);
    setSelectAll(false);
  };
  // Download all
  const handleDownloadAll = async () => {
    setSelectedDocIds(documents.map((doc) => doc.id));
    setSelectAll(true);
    await handleDownloadSelected();
  };
  // Delete all
  const handleDeleteAll = async () => {
    setSelectedDocIds(documents.map((doc) => doc.id));
    setSelectAll(true);
    await handleDeleteSelected();
  };

  // Helper untuk nama file download
  const getDownloadFileName = (doc: UserDocument, employee: EmployeeProfile | null) => {
    // Ambil ekstensi dari file_name asli
    const ext = doc.file_name.split('.').pop();
    const title = doc.document_type.toUpperCase();
    const nama = employee?.nama || '';
    // Pastikan ada spasi antara tipe dan nama, dan gunakan ekstensi asli
    return `${title} ${nama.trim()}.${ext}`;
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
        <UserIcon className="w-64 h-64 text-cyan-400" />
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
                  Profil Karyawan
                </h1>
                <p className="text-gray-400 mt-1">Kelola informasi dan dokumen karyawan</p>
              </div>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Employee List */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card>
              <h3 className="text-xl font-semibold text-white mb-6">Daftar Karyawan</h3>
              <div className="space-y-3">
                {employees.map((employee, index) => (
                  <motion.div
                    key={employee.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 * index }}
                  >
                    <button
                      onClick={() => setSelectedEmployee(employee)}
                      className={`w-full p-4 rounded-lg border transition-all duration-200 text-left ${
                        selectedEmployee?.id === employee.id
                          ? 'border-cyan-400 bg-cyan-500/20'
                          : 'border-gray-700/50 hover:border-gray-600/50 hover:bg-gray-800/50'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full flex items-center justify-center">
                          <UserIcon className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium text-white">{employee.nama}</h4>
                          <p className="text-sm text-gray-400">{employee.jabatan}</p>
                          {employee.status_karyawan && (
                            <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(employee.status_karyawan)}`}>
                              {employee.status_karyawan}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  </motion.div>
                ))}
              </div>
            </Card>
          </motion.div>

          {/* Employee Profile */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="lg:col-span-2"
          >
            {selectedEmployee ? (
              <div className="space-y-6">
                {/* Profile Information */}
                <Card>
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-semibold text-white">Informasi Karyawan</h3>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={openEditProfile}
                      className="border-cyan-500/50 text-cyan-300"
                    >
                      <PlusIcon className="w-4 h-4 mr-2" />
                      Edit Profil
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="flex items-center space-x-3">
                        <UserIcon className="w-5 h-5 text-cyan-400" />
                        <div>
                          <p className="text-sm text-gray-400">Nama Lengkap</p>
                          <p className="text-white font-medium">{selectedEmployee.nama}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-3">
                        <BriefcaseIcon className="w-5 h-5 text-cyan-400" />
                        <div>
                          <p className="text-sm text-gray-400">Jabatan</p>
                          <p className="text-white font-medium">{selectedEmployee.jabatan}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-3">
                        <IdentificationIcon className="w-5 h-5 text-cyan-400" />
                        <div>
                          <p className="text-sm text-gray-400">Username</p>
                          <p className="text-white font-medium">@{selectedEmployee.username}</p>
                        </div>
                      </div>
                      
                      {selectedEmployee.tanggal_lahir && (
                        <div className="flex items-center space-x-3">
                          <CalendarIcon className="w-5 h-5 text-cyan-400" />
                          <div>
                            <p className="text-sm text-gray-400">Tanggal Lahir</p>
                            <p className="text-white font-medium">{selectedEmployee.tanggal_lahir}</p>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div className="space-y-4">
                      {selectedEmployee.no_telp && (
                        <div className="flex items-center space-x-3">
                          <PhoneIcon className="w-5 h-5 text-cyan-400" />
                          <div>
                            <p className="text-sm text-gray-400">No. Telepon</p>
                            <p className="text-white font-medium">{selectedEmployee.no_telp}</p>
                          </div>
                        </div>
                      )}
                      
                      {selectedEmployee.email && (
                        <div className="flex items-center space-x-3">
                          <EnvelopeIcon className="w-5 h-5 text-cyan-400" />
                          <div>
                            <p className="text-sm text-gray-400">Email</p>
                            <p className="text-white font-medium">{selectedEmployee.email}</p>
                          </div>
                        </div>
                      )}
                      
                      {selectedEmployee.alamat && (
                        <div className="flex items-center space-x-3">
                          <MapPinIcon className="w-5 h-5 text-cyan-400" />
                          <div>
                            <p className="text-sm text-gray-400">Alamat</p>
                            <p className="text-white font-medium">{selectedEmployee.alamat}</p>
                          </div>
                        </div>
                      )}
                      
                      {selectedEmployee.status_karyawan && (
                        <div className="flex items-center space-x-3">
                          <ShieldCheckIcon className="w-5 h-5 text-cyan-400" />
                          <div>
                            <p className="text-sm text-gray-400">Status Karyawan</p>
                            <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(selectedEmployee.status_karyawan)}`}>
                              {selectedEmployee.status_karyawan}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>

                {/* Documents */}
                <Card>
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-semibold text-white">Dokumen Karyawan</h3>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowDocumentUpload(true)}
                      className="border-cyan-500/50 text-cyan-300"
                    >
                      <PlusIcon className="w-4 h-4 mr-2" />
                      Upload Dokumen
                    </Button>
                  </div>
                  {/* Tombol aksi multi-select */}
                  {documents.length > 0 && (
                    <div className="flex gap-2 mb-4">
                      <Button size="sm" variant="outline" onClick={handleDownloadSelected} disabled={selectedDocIds.length === 0} className="border-green-500/50 text-green-300">Download Selected</Button>
                      <Button size="sm" variant="outline" onClick={handleDeleteSelected} disabled={selectedDocIds.length === 0} className="border-red-500/50 text-red-300">Delete Selected</Button>
                      <Button size="sm" variant="outline" onClick={handleDownloadAll} className="border-green-500/50 text-green-300">Download All</Button>
                      <Button size="sm" variant="outline" onClick={handleDeleteAll} className="border-red-500/50 text-red-300">Delete All</Button>
                    </div>
                  )}
                  <div className="space-y-3">
                    {documents.length > 0 ? (
                      <div>
                        <div className="flex items-center mb-2">
                          <input type="checkbox" checked={selectAll} onChange={handleSelectAll} className="mr-2" />
                          <span className="text-sm text-gray-300">Select All</span>
                        </div>
                        {documents.map((doc) => (
                          <div key={doc.id} className="flex items-center justify-between p-4 glass-effect rounded-lg border border-gray-700/50">
                            <div className="flex items-center space-x-3">
                              <input type="checkbox" checked={selectedDocIds.includes(doc.id)} onChange={() => handleSelectDoc(doc.id)} className="mr-2" />
                              <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full flex items-center justify-center">
                                <DocumentIcon className="w-5 h-5 text-white" />
                              </div>
                              <div>
                                <p className="text-white font-medium">{doc.file_name}</p>
                                <p className="text-sm text-gray-400">{doc.document_type.toUpperCase()}</p>
                                <p className="text-xs text-gray-500">
                                  {(doc.file_size / 1024 / 1024).toFixed(2)} MB • {new Date(doc.uploaded_at).toLocaleDateString('id-ID')}
                                </p>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-green-500/50 text-green-300"
                                onClick={async () => {
                                  await downloadDocument(doc.file_path, getDownloadFileName(doc, selectedEmployee));
                                }}
                              >
                                <ArrowDownTrayIcon className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-red-500/50 text-red-300"
                                onClick={() => handleDeleteDocument(doc.id)}
                              >
                                <TrashIcon className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <DocumentIcon className="w-16 h-16 text-gray-500 mx-auto mb-4" />
                        <p className="text-gray-400">Belum ada dokumen yang diupload</p>
                        <Button
                          onClick={() => setShowDocumentUpload(true)}
                          className="mt-4 bg-gradient-to-r from-cyan-500 to-blue-600"
                          size="sm"
                        >
                          Upload Dokumen Pertama
                        </Button>
                      </div>
                    )}
                  </div>
                </Card>
              </div>
            ) : (
              <Card>
                <div className="text-center py-12">
                  <UserIcon className="w-16 h-16 text-gray-500 mx-auto mb-4" />
                  <p className="text-gray-400">Pilih karyawan untuk melihat profil</p>
                </div>
              </Card>
            )}
          </motion.div>
        </div>
      </div>

      {/* Profile Edit Modal */}
      {showProfileForm && selectedEmployee && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-xl p-8 w-full max-w-2xl border border-cyan-500/30">
            <h2 className="text-xl font-bold text-cyan-300 mb-6">Edit Profil Karyawan</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Nama Lengkap"
                value={profileForm.nama}
                onChange={e => setProfileForm({ ...profileForm, nama: e.target.value })}
                icon={<UserIcon className="w-5 h-5" />}
              />
              <Input
                label="Jabatan"
                value={profileForm.jabatan}
                onChange={e => setProfileForm({ ...profileForm, jabatan: e.target.value })}
                icon={<BriefcaseIcon className="w-5 h-5" />}
              />
              <Input
                label="Tanggal Lahir"
                type="date"
                value={profileForm.tanggal_lahir || ''}
                onChange={e => setProfileForm({ ...profileForm, tanggal_lahir: e.target.value })}
                icon={<CalendarIcon className="w-5 h-5" />}
              />
              <Input
                label="No. Telepon"
                value={profileForm.no_telp || ''}
                onChange={e => setProfileForm({ ...profileForm, no_telp: e.target.value })}
                icon={<PhoneIcon className="w-5 h-5" />}
              />
              <Input
                label="Email"
                type="email"
                value={profileForm.email || ''}
                onChange={e => setProfileForm({ ...profileForm, email: e.target.value })}
                icon={<EnvelopeIcon className="w-5 h-5" />}
              />
              <select
                className="px-4 py-2 glass-effect border border-gray-600/50 rounded-lg text-white bg-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                value={profileForm.status_karyawan}
                onChange={e => setProfileForm({ ...profileForm, status_karyawan: e.target.value })}
              >
                <option value="aktif">Aktif</option>
                <option value="kontrak">Kontrak</option>
                <option value="probation">Probation</option>
                <option value="nonaktif">Nonaktif</option>
              </select>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-300 mb-2">Alamat</label>
                <textarea
                  className="w-full px-4 py-2 glass-effect border border-gray-600/50 rounded-lg text-white bg-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                  rows={3}
                  placeholder="Masukkan alamat lengkap"
                  value={profileForm.alamat || ''}
                  onChange={e => setProfileForm({ ...profileForm, alamat: e.target.value })}
                />
              </div>
            </div>
            <div className="flex gap-2 mt-6 justify-end">
              <Button variant="outline" onClick={() => setShowProfileForm(false)} className="text-gray-300">
                Batal
              </Button>
              <Button variant="outline" className="text-cyan-300 border-cyan-500/50" onClick={handleSaveProfile} disabled={savingProfile}>
                {savingProfile ? 'Menyimpan...' : 'Simpan'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Document Upload Modal */}
      {showDocumentUpload && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-xl p-8 w-full max-w-lg border border-cyan-500/30">
            <h2 className="text-xl font-bold text-cyan-300 mb-6">Upload Dokumen</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Jenis Dokumen</label>
                <select
                  className="w-full px-4 py-2 glass-effect border border-gray-600/50 rounded-lg text-white bg-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                  value={selectedDocumentType}
                  onChange={e => setSelectedDocumentType(e.target.value)}
                >
                  <option value="cv">CV/Resume</option>
                  <option value="kontrak">Kontrak Kerja</option>
                  <option value="sertifikat">Sertifikasi</option>
                  <option value="bpjs_kesehatan">BPJS Kesehatan</option>
                  <option value="bpjs_ketenagakerjaan">BPJS Ketenagakerjaan</option>
                  <option value="ktp">KTP</option>
                  <option value="kk">Kartu Keluarga</option>
                  <option value="ijazah">Ijazah</option>
                  <option value="lainnya">Dokumen Lainnya</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">File</label>
                <input
                  type="file"
                  className="w-full px-4 py-2 glass-effect border border-gray-600/50 rounded-lg text-white bg-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                  onChange={e => setSelectedFile(e.target.files ? e.target.files[0] : null)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Deskripsi (Opsional)</label>
                <textarea
                  className="w-full px-4 py-2 glass-effect border border-gray-600/50 rounded-lg text-white bg-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                  rows={3}
                  placeholder="Deskripsi dokumen..."
                  value={documentDescription}
                  onChange={e => setDocumentDescription(e.target.value)}
                />
              </div>
            </div>
            <div className="flex gap-2 mt-6 justify-end">
              <Button variant="outline" onClick={() => setShowDocumentUpload(false)} className="text-gray-300">
                Batal
              </Button>
              <Button
                variant="outline"
                className="text-cyan-300 border-cyan-500/50"
                onClick={handleUploadDocument}
                disabled={uploading || !selectedFile}
              >
                {uploading ? 'Uploading...' : 'Upload'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}; 