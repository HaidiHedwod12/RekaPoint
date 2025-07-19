import * as XLSX from 'xlsx';
import { createAktivitas, getAllJudul, getAllSubJudul } from './database';
import { Judul, SubJudul, User } from '../types';

export interface ExcelRow {
  tanggal: string;
  namaKaryawan: string;
  judul: string;
  subJudul: string;
  aktivitas: string;
  deskripsi: string;
}

export interface ImportResult {
  success: number;
  failed: number;
  errors: string[];
  details: {
    row: number;
    error: string;
    data: ExcelRow;
  }[];
}

export const parseExcelFile = (file: File): Promise<ExcelRow[]> => {
  // Fungsi konversi serial number Excel ke Date JS
  function excelDateToJSDate(serial: number): Date {
    const utc_days = Math.floor(serial - 25569);
    const utc_value = utc_days * 86400;
    const date_info = new Date(utc_value * 1000);
    return new Date(date_info.getFullYear(), date_info.getMonth(), date_info.getDate());
  }
  // Format ke DD/MM/YYYY
  function formatDate(date: Date): string {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        
        // Get first worksheet
        const worksheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[worksheetName];
        
        // Convert to JSON, starting from row 2 (skip header)
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
          range: 1, // Skip first row (header)
          header: ['tanggal', 'namaKaryawan', 'judul', 'subJudul', 'aktivitas', 'deskripsi'],
          defval: '' // Default value for empty cells
        });
        
        // Konversi tanggal serial number ke string tanggal jika perlu
        const fixedData = (jsonData as ExcelRow[]).map(row => {
          let tanggal = row.tanggal;
          if (typeof tanggal === 'number') {
            tanggal = formatDate(excelDateToJSDate(tanggal));
          }
          return { ...row, tanggal };
        });
        console.log('Parsed Excel data:', fixedData);
        resolve(fixedData as ExcelRow[]);
      } catch (error) {
        console.error('Error parsing Excel file:', error);
        reject(new Error('Gagal membaca file Excel. Pastikan format file benar.'));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Gagal membaca file.'));
    };
    
    reader.readAsArrayBuffer(file);
  });
};

export const validateExcelData = (
  data: ExcelRow[], 
  users: User[], 
  juduls: Judul[], 
  subjuduls: SubJudul[]
): { valid: ExcelRow[]; invalid: { row: number; error: string; data: ExcelRow }[] } => {
  const valid: ExcelRow[] = [];
  const invalid: { row: number; error: string; data: ExcelRow }[] = [];
  
  // Create lookup maps for faster validation
  const userNamesMap = new Set(users.map(user => user.nama.toLowerCase().trim()));
  const judulNamesMap = new Set(juduls.map(judul => judul.nama.toLowerCase().trim()));
  const subjudulNamesMap = new Set(subjuduls.map(subjudul => subjudul.nama.toLowerCase().trim()));
  
  data.forEach((row, index) => {
    const rowNumber = index + 2; // +2 because we skip header and array is 0-indexed
    const errors: string[] = [];
    
    // Validate required fields
    if (!row.tanggal || row.tanggal.toString().trim() === '') {
      errors.push('Tanggal tidak boleh kosong');
    }
    
    if (!row.namaKaryawan || row.namaKaryawan.toString().trim() === '') {
      errors.push('Nama Karyawan tidak boleh kosong');
    } else {
      // Validate if user exists in database
      const namaKaryawan = row.namaKaryawan.toString().trim().toLowerCase();
      if (!userNamesMap.has(namaKaryawan)) {
        errors.push(`Nama Karyawan "${row.namaKaryawan}" tidak terdaftar dalam sistem`);
      }
    }
    
    if (!row.judul || row.judul.toString().trim() === '') {
      errors.push('Judul tidak boleh kosong');
    } else {
      // Validate if judul exists in database
      const judulName = row.judul.toString().trim().toLowerCase();
      if (!judulNamesMap.has(judulName)) {
        errors.push(`Judul "${row.judul}" tidak ditemukan dalam database`);
      }
    }
    
    if (!row.subJudul || row.subJudul.toString().trim() === '') {
      errors.push('Sub Judul tidak boleh kosong');
    } else {
      // Validate if subjudul exists in database
      const subjudulName = row.subJudul.toString().trim().toLowerCase();
      if (!subjudulNamesMap.has(subjudulName)) {
        errors.push(`Sub Judul "${row.subJudul}" tidak ditemukan dalam database`);
      }
    }
    
    if (!row.aktivitas || row.aktivitas.toString().trim() === '') {
      errors.push('Aktivitas tidak boleh kosong');
    }
    
    // Validate date format
    if (row.tanggal) {
      const dateStr = row.tanggal.toString().trim();
      const dateRegex = /^\d{1,2}\/\d{1,2}\/\d{4}$/;
      
      if (!dateRegex.test(dateStr)) {
        errors.push('Format tanggal harus DD/MM/YYYY (contoh: 12/05/2025)');
      } else {
        // Try to parse the date
        const [day, month, year] = dateStr.split('/').map(Number);
        const date = new Date(year, month - 1, day);
        
        if (date.getDate() !== day || date.getMonth() !== month - 1 || date.getFullYear() !== year) {
          errors.push('Tanggal tidak valid');
        }
      }
    }
    
    if (errors.length > 0) {
      invalid.push({
        row: rowNumber,
        error: errors.join(', '),
        data: row
      });
    } else {
      valid.push(row);
    }
  });
  
  return { valid, invalid };
};

export const importActivitiesToDatabase = async (
  data: ExcelRow[], 
  currentUser: User,
  onProgress?: (current: number, total: number) => void
): Promise<ImportResult> => {
  const result: ImportResult = {
    success: 0,
    failed: 0,
    errors: [],
    details: []
  };
  
  try {
    // Load all juduls and subjuduls for mapping
    console.log('Loading juduls and subjuduls for mapping...');
    const [juduls, subjuduls] = await Promise.all([
      getAllJudul(),
      getAllSubJudul()
    ]);
    
    console.log('Juduls loaded:', juduls.length);
    console.log('SubJuduls loaded:', subjuduls.length);
    
    // Create mapping objects for faster lookup
    const judulMap = new Map<string, string>();
    juduls.forEach(judul => {
      judulMap.set(judul.nama.toLowerCase().trim(), judul.id);
    });
    
    const subjudulMap = new Map<string, string>();
    subjuduls.forEach(subjudul => {
      subjudulMap.set(subjudul.nama.toLowerCase().trim(), subjudul.id);
    });
    
    console.log('Starting import process for', data.length, 'rows');
    
    // Process each row
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const rowNumber = i + 2; // +2 because we skip header and array is 0-indexed
      
      try {
        // Update progress
        if (onProgress) {
          onProgress(i + 1, data.length);
        }
        
        console.log(`Processing row ${rowNumber}:`, row);
        
        // Validate that this activity is for the current user
        const namaKaryawan = row.namaKaryawan.toString().trim();
        if (namaKaryawan.toLowerCase() !== currentUser.nama.toLowerCase()) {
          throw new Error(`Aktivitas hanya bisa diimport untuk karyawan yang sedang login (${currentUser.nama})`);
        }
        
        // Convert date from DD/MM/YYYY to YYYY-MM-DD
        const dateStr = row.tanggal.toString().trim();
        const [day, month, year] = dateStr.split('/').map(Number);
        const formattedDate = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
        
        // Find judul ID
        const judulName = row.judul.toString().trim().toLowerCase();
        const judulId = judulMap.get(judulName);
        if (!judulId) {
          throw new Error(`Judul "${row.judul}" tidak ditemukan dalam database`);
        }
        
        // Find subjudul ID
        const subjudulName = row.subJudul.toString().trim().toLowerCase();
        const subjudulId = subjudulMap.get(subjudulName);
        if (!subjudulId) {
          throw new Error(`Sub Judul "${row.subJudul}" tidak ditemukan dalam database`);
        }
        
        // Create activity
        const aktivitasData = {
          user_id: currentUser.id,
          tanggal: formattedDate,
          judul_id: judulId,
          subjudul_id: subjudulId,
          aktivitas: row.aktivitas.toString().trim(),
          deskripsi: row.deskripsi ? row.deskripsi.toString().trim() : undefined
        };
        
        console.log('Creating aktivitas:', aktivitasData);
        await createAktivitas(aktivitasData);
        
        result.success++;
        console.log(`Row ${rowNumber} imported successfully`);
        
      } catch (error) {
        console.error(`Error importing row ${rowNumber}:`, error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        
        result.failed++;
        result.errors.push(`Baris ${rowNumber}: ${errorMessage}`);
        result.details.push({
          row: rowNumber,
          error: errorMessage,
          data: row
        });
      }
    }
    
    console.log('Import completed:', result);
    return result;
    
  } catch (error) {
    console.error('Fatal error during import:', error);
    throw new Error('Gagal mengimport data: ' + (error instanceof Error ? error.message : 'Unknown error'));
  }
};

export const downloadExcelTemplate = () => {
  // Create template data
  const templateData = [
    {
      'Tanggal': '12/05/2025',
      'Nama Karyawan': 'Contoh Nama',
      'Judul': 'Contoh Judul',
      'Sub Judul': 'Contoh Sub Judul',
      'Aktivitas': 'Contoh aktivitas yang dilakukan',
      'Deskripsi': 'Deskripsi tambahan (opsional)'
    }
  ];
  
  // Create workbook and worksheet
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(templateData);
  
  // Set column widths
  const colWidths = [
    { wch: 12 }, // Tanggal
    { wch: 20 }, // Nama Karyawan
    { wch: 20 }, // Judul
    { wch: 20 }, // Sub Judul
    { wch: 30 }, // Aktivitas
    { wch: 25 }  // Deskripsi
  ];
  worksheet['!cols'] = colWidths;
  
  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Template Aktivitas');
  
  // Download file
  XLSX.writeFile(workbook, 'Template_Import_Aktivitas.xlsx');
};