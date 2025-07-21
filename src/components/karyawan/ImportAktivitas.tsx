import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  DocumentArrowUpIcon, 
  ArrowLeftIcon,
  DocumentArrowDownIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';
import { useNavigate } from 'react-router-dom';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { useAuth } from '../../contexts/AuthContext';
import { parseExcelFile, validateExcelData, importActivitiesToDatabase, downloadExcelTemplate, ImportResult, ExcelRow } from '../../lib/excelImport';
import { getAllUsers, getAllJudul, getAllSubJudul } from '../../lib/database';
import { User, Judul, SubJudul } from '../../types';

export const ImportAktivitas: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [result, setResult] = useState<ImportResult | null>(null);
  const [previewData, setPreviewData] = useState<ExcelRow[]>([]);
  const [validationResult, setValidationResult] = useState<{ valid: ExcelRow[]; invalid: any[] } | null>(null);
  const [databaseData, setDatabaseData] = useState<{
    users: User[];
    juduls: Judul[];
    subjuduls: SubJudul[];
  } | null>(null);
  const [loadingDatabase, setLoadingDatabase] = useState(true);

  useEffect(() => {
    loadDatabaseData();
  }, []);

  const loadDatabaseData = async () => {
    try {
      console.log('Loading database data for validation...');
      const [users, juduls, subjuduls] = await Promise.all([
        getAllUsers(),
        getAllJudul(),
        getAllSubJudul()
      ]);
      
      setDatabaseData({ users, juduls, subjuduls });
      console.log('Database data loaded:', { 
        users: users.length, 
        juduls: juduls.length, 
        subjuduls: subjuduls.length 
      });
    } catch (error) {
      console.error('Error loading database data:', error);
      alert('Gagal memuat data database untuk validasi: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setLoadingDatabase(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // Validate file type
    if (!selectedFile.name.endsWith('.xlsx') && !selectedFile.name.endsWith('.xls')) {
      alert('Hanya file Excel (.xlsx atau .xls) yang diperbolehkan');
      return;
    }

    if (!databaseData) {
      alert('Data database belum dimuat. Silakan tunggu sebentar dan coba lagi.');
      return;
    }

    setFile(selectedFile);
    setResult(null);
    setPreviewData([]);
    setValidationResult(null);

    try {
      console.log('Parsing Excel file:', selectedFile.name);
      const data = await parseExcelFile(selectedFile);
      console.log('Excel data parsed:', data.length, 'rows');
      
      // Show preview (first 5 rows)
      setPreviewData(data.slice(0, 5));
      
      // Validate data
      const validation = validateExcelData(data, databaseData.users, databaseData.juduls, databaseData.subjuduls);
      setValidationResult(validation);
      console.log('Validation result:', validation);
      
    } catch (error) {
      console.error('Error parsing file:', error);
      alert('Gagal membaca file Excel: ' + (error instanceof Error ? error.message : 'Unknown error'));
      setFile(null);
    }
  };

  const handleImport = async () => {
    if (!file || !user || !validationResult) return;

    setImporting(true);
    setProgress({ current: 0, total: validationResult.valid.length });

    try {
      console.log('Starting import process...');
      const importResult = await importActivitiesToDatabase(
        validationResult.valid,
        user,
        (current, total) => {
          setProgress({ current, total });
        }
      );
      
      setResult(importResult);
      console.log('Import completed:', importResult);
      
    } catch (error) {
      console.error('Import failed:', error);
      alert('Gagal mengimport data: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setImporting(false);
    }
  };

  const resetForm = () => {
    setFile(null);
    setResult(null);
    setPreviewData([]);
    setValidationResult(null);
    setProgress({ current: 0, total: 0 });
    
    // Reset file input
    const fileInput = document.getElementById('excel-file') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  };

  return (
    <div className="min-h-screen py-8 relative">
      {/* Background elements */}
      <div className="fixed top-20 right-20 opacity-10">
        <DocumentArrowUpIcon className="w-64 h-64 text-cyan-400" />
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
                Kembali
              </button>
              <div>
                <h1 className="text-2xl sm:text-4xl font-extrabold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent mb-1 drop-shadow-lg">Import Aktivitas</h1>
                <div className="text-cyan-200 text-sm sm:text-lg font-medium opacity-80">Upload aktivitas dari file Excel</div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Instructions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-8"
        >
          <Card>
            <div className="flex items-start space-x-4">
              <InformationCircleIcon className="w-8 h-8 text-cyan-400 flex-shrink-0 mt-1" />
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-white mb-4">Petunjuk Import Excel</h3>
                <div className="space-y-3 text-gray-300">
                  <p><strong>Format file:</strong> Excel (.xlsx atau .xls)</p>
                  <p><strong>Struktur kolom (baris pertama adalah header):</strong></p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm bg-slate-800/50 p-4 rounded-lg">
                    <div>• <strong>Kolom A:</strong> Tanggal (DD/MM/YYYY)</div>
                    <div>• <strong>Kolom B:</strong> Nama Karyawan (harus terdaftar)</div>
                    <div>• <strong>Kolom C:</strong> Judul (harus ada di database)</div>
                    <div>• <strong>Kolom D:</strong> Sub Judul (harus ada di database)</div>
                    <div>• <strong>Kolom E:</strong> Aktivitas (bebas)</div>
                    <div>• <strong>Kolom F:</strong> Deskripsi (opsional)</div>
                  </div>
                  <p className="text-yellow-300">
                    <strong>Penting:</strong> Nama Karyawan, Judul, dan Sub Judul harus sesuai dengan data yang ada di database
                  </p>
                  {databaseData && (
                    <div className="mt-4 space-y-2 text-sm">
                      <p><strong>Karyawan Terdaftar:</strong> {databaseData.users.map(u => u.nama).join(', ')}</p>
                      <p><strong>Judul Tersedia:</strong> {databaseData.juduls.map(j => j.nama).join(', ')}</p>
                      <p><strong>Sub Judul Tersedia:</strong> {databaseData.subjuduls.map(s => s.nama).join(', ')}</p>
                    </div>
                  )}
                </div>
                <div className="mt-4">
                  <Button
                    onClick={downloadExcelTemplate}
                    variant="outline"
                    className="border-green-500/50 text-green-300"
                  >
                    <DocumentArrowDownIcon className="w-5 h-5 mr-2" />
                    Download Template Excel
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* File Upload */}
        {loadingDatabase && (
          <div className="text-center py-4 text-cyan-400">
            <div className="w-6 h-6 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            Memuat data database untuk validasi...
          </div>
        )}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mb-8"
        >
          <Card>
            <h3 className="text-xl font-semibold text-white mb-6">Upload File Excel</h3>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Pilih File Excel
                </label>
                <input
                  id="excel-file"
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileSelect}
                  className="w-full px-4 py-3 glass-effect border border-gray-600/50 rounded-lg text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-cyan-500 file:text-white hover:file:bg-cyan-600 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                  disabled={loadingDatabase}
                />
              </div>

              {file && (
                <div className="flex items-center space-x-4 text-sm text-gray-300">
                  <DocumentArrowUpIcon className="w-5 h-5 text-green-400" />
                  <span>File terpilih: <strong>{file.name}</strong></span>
                  <span>({(file.size / 1024).toFixed(1)} KB)</span>
                </div>
              )}
            </div>
          </Card>
        </motion.div>

        {/* Preview Data */}
        {previewData.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <Card>
              <h3 className="text-xl font-semibold text-white mb-6">Preview Data (5 baris pertama)</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th className="text-left py-2 px-3 text-gray-300">Tanggal</th>
                      <th className="text-left py-2 px-3 text-gray-300">Nama</th>
                      <th className="text-left py-2 px-3 text-gray-300">Judul</th>
                      <th className="text-left py-2 px-3 text-gray-300">Sub Judul</th>
                      <th className="text-left py-2 px-3 text-gray-300">Aktivitas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.map((row, index) => (
                      <tr key={index} className="border-b border-gray-800">
                        <td className="py-2 px-3 text-gray-300">{row.tanggal}</td>
                        <td className="py-2 px-3 text-gray-300">{row.namaKaryawan}</td>
                        <td className="py-2 px-3 text-gray-300">{row.judul}</td>
                        <td className="py-2 px-3 text-gray-300">{row.subJudul}</td>
                        <td className="py-2 px-3 text-gray-300 max-w-xs truncate">{row.aktivitas}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </motion.div>
        )}

        {/* Validation Results */}
        {validationResult && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <Card>
              <h3 className="text-xl font-semibold text-white mb-6">Hasil Validasi</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="flex items-center space-x-3">
                  <CheckCircleIcon className="w-8 h-8 text-green-400" />
                  <div>
                    <div className="text-2xl font-bold text-green-400">{validationResult.valid.length}</div>
                    <div className="text-sm text-gray-400">Data Valid</div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <XCircleIcon className="w-8 h-8 text-red-400" />
                  <div>
                    <div className="text-2xl font-bold text-red-400">{validationResult.invalid.length}</div>
                    <div className="text-sm text-gray-400">Data Error</div>
                  </div>
                </div>
              </div>

              {validationResult.invalid.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-lg font-medium text-red-400 mb-3 flex items-center">
                    <ExclamationTriangleIcon className="w-5 h-5 mr-2" />
                    Data dengan Error
                  </h4>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {validationResult.invalid.map((item, index) => (
                      <div key={index} className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                        <div className="text-red-300 font-medium">Baris {item.row}: {item.error}</div>
                        <div className="text-gray-400 text-sm mt-1">
                          {item.data.tanggal} | {item.data.namaKaryawan} | {item.data.judul} | {item.data.aktivitas}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex space-x-4">
                <Button
                  onClick={handleImport}
                  disabled={importing || validationResult.valid.length === 0}
                  className="bg-gradient-to-r from-green-500 to-teal-600"
                  className="bg-gradient-to-r from-green-500 to-teal-600"
                >
                  {importing ? (
                    <div className="flex items-center">
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                      Import {progress.current}/{progress.total}
                    </div>
                  ) : (
                    <div className="flex items-center">
                      <DocumentArrowUpIcon className="w-5 h-5 mr-2" />
                      Import {validationResult.valid.length} Data Valid
                    </div>
                  )}
                </Button>
                
                <Button
                  variant="outline"
                  onClick={resetForm}
                  disabled={importing}
                  className="border-gray-500/50 text-gray-300"
                >
                  Reset
                </Button>
              </div>
            </Card>
          </motion.div>
        )}

        {/* Import Results */}
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <Card>
              <h3 className="text-xl font-semibold text-white mb-6">Hasil Import</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="flex items-center space-x-3">
                  <CheckCircleIcon className="w-8 h-8 text-green-400" />
                  <div>
                    <div className="text-2xl font-bold text-green-400">{result.success}</div>
                    <div className="text-sm text-gray-400">Berhasil Diimport</div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <XCircleIcon className="w-8 h-8 text-red-400" />
                  <div>
                    <div className="text-2xl font-bold text-red-400">{result.failed}</div>
                    <div className="text-sm text-gray-400">Gagal Diimport</div>
                  </div>
                </div>
              </div>

              {result.errors.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-lg font-medium text-red-400 mb-3">Error Details</h4>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {result.errors.map((error, index) => (
                      <div key={index} className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                        <div className="text-red-300 text-sm">{error}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex space-x-4">
                <Button
                  onClick={() => navigate('/karyawan/histori')}
                  className="bg-gradient-to-r from-cyan-500 to-blue-600"
                >
                  Lihat Histori Aktivitas
                </Button>
                
                <Button
                  variant="outline"
                  onClick={resetForm}
                  className="border-gray-500/50 text-gray-300"
                >
                  Import Lagi
                </Button>
              </div>
            </Card>
          </motion.div>
        )}
      </div>
    </div>
  );
};