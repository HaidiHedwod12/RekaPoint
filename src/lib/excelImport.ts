import * as XLSX from 'xlsx';
import { createAktivitas, getAllJudul, getAllSubJudul } from './database';
import { Judul, SubJudul, User } from '../types';

export interface ExcelRow {
  nama: string;
  tanggal: string;
  tipe: string;
  project: string;
  aktivitas: string;
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
          header: ['nama', 'tanggal', 'tipe', 'project', 'aktivitas'],
          defval: '' // Default value for empty cells
        });

        console.log('Parsed Excel data:', jsonData);
        resolve(jsonData as ExcelRow[]);
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
    if (!row.nama || row.nama.toString().trim() === '') {
      errors.push('Nama tidak boleh kosong');
    } else {
      // Validate if user exists in database
      const nama = row.nama.toString().trim().toLowerCase();
      if (!userNamesMap.has(nama)) {
        errors.push(`Nama "${row.nama}" tidak terdaftar dalam sistem`);
      }
    }

    if (!row.tanggal || row.tanggal.toString().trim() === '') {
      errors.push('Tanggal tidak boleh kosong');
    }

    if (!row.tipe || row.tipe.toString().trim() === '') {
      errors.push('Tipe tidak boleh kosong');
    } else {
      // Validate if judul exists in database
      const tipeName = row.tipe.toString().trim().toLowerCase();
      if (!judulNamesMap.has(tipeName)) {
        errors.push(`Tipe "${row.tipe}" tidak ditemukan dalam database`);
      }
    }

    if (!row.project || row.project.toString().trim() === '') {
      errors.push('Project tidak boleh kosong');
    } else {
      // Validate if subjudul exists in database
      const projectName = row.project.toString().trim().toLowerCase();
      if (!subjudulNamesMap.has(projectName)) {
        errors.push(`Project "${row.project}" tidak ditemukan dalam database`);
      }
    }

    if (!row.aktivitas || row.aktivitas.toString().trim() === '') {
      errors.push('Aktivitas tidak boleh kosong');
    }

    // Validate date format (only number)
    if (row.tanggal) {
      const dateStr = row.tanggal.toString().trim();
      const dateNum = parseInt(dateStr);

      if (isNaN(dateNum) || dateNum < 1 || dateNum > 31) {
        errors.push('Tanggal harus berupa angka 1-31');
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
  selectedMonth: number,
  selectedYear: number,
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
        const nama = row.nama.toString().trim();
        if (nama.toLowerCase() !== currentUser.nama.toLowerCase()) {
          throw new Error(`Aktivitas hanya bisa diimport untuk karyawan yang sedang login (${currentUser.nama})`);
        }

        // Convert date from day number to selected month and year
        const dayNum = parseInt(row.tanggal.toString().trim());
        const formattedDate = `${selectedYear}-${selectedMonth.toString().padStart(2, '0')}-${dayNum.toString().padStart(2, '0')}`;

        // Find judul ID
        const tipeName = row.tipe.toString().trim().toLowerCase();
        const judulId = judulMap.get(tipeName);
        if (!judulId) {
          throw new Error(`Tipe "${row.tipe}" tidak ditemukan dalam database`);
        }

        // Find subjudul ID
        const projectName = row.project.toString().trim().toLowerCase();
        const subjudulId = subjudulMap.get(projectName);
        if (!subjudulId) {
          throw new Error(`Project "${row.project}" tidak ditemukan dalam database`);
        }

        // Create activity
        const aktivitasData = {
          user_id: currentUser.id,
          tanggal: formattedDate,
          judul_id: judulId,
          subjudul_id: subjudulId,
          aktivitas: row.aktivitas.toString().trim(),
          deskripsi: undefined
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
      'Nama': 'Contoh Nama Karyawan',
      'Tanggal': '12',
      'Tipe': 'Contoh Judul',
      'Project': 'Contoh Sub Judul',
      'Aktivitas': 'Contoh aktivitas yang dilakukan'
    }
  ];

  // Create workbook and worksheet
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(templateData);

  // Set column widths
  const colWidths = [
    { wch: 20 }, // Nama
    { wch: 10 }, // Tanggal
    { wch: 20 }, // Tipe
    { wch: 20 }, // Project
    { wch: 30 }  // Aktivitas
  ];
  worksheet['!cols'] = colWidths;

  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Template Aktivitas');

  // Download file
  XLSX.writeFile(workbook, 'Template_Import_Aktivitas.xlsx');
};

export const exportActivitiesToExcel = (aktivitasList: any[], filename?: string) => {
  // Transform data to match import template format
  const exportData = aktivitasList.map((aktivitas) => {
    // Extract day from date
    const tanggalObj = new Date(aktivitas.tanggal);
    const dayOnly = tanggalObj.getDate();
    const no = dayOnly.toString().padStart(2, '0');

    return {
      'No.': no,
      'Nama': aktivitas.user?.nama || aktivitas.nama_karyawan || '',
      'Tanggal': dayOnly.toString(),
      'Tipe': aktivitas.judul?.nama || '',
      'Project': aktivitas.subjudul?.nama || '',
      'Aktivitas': aktivitas.aktivitas || ''
    };
  });

  // Sort by No. ascending (alphabetical works because of zero-padding)
  exportData.sort((a, b) => a['No.'].localeCompare(b['No.']));

  // Create workbook and worksheet
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(exportData);

  // Set column widths
  const colWidths = [
    { wch: 5 },  // No.
    { wch: 20 }, // Nama
    { wch: 10 }, // Tanggal
    { wch: 20 }, // Tipe
    { wch: 20 }, // Project
    { wch: 30 }  // Aktivitas
  ];
  worksheet['!cols'] = colWidths;

  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Aktivitas Export');

  // Generate filename with current date if not provided
  const finalFilename = filename || `Export_Aktivitas_${new Date().toLocaleString('sv').split(' ')[0]}.xlsx`;

  // Download file
  XLSX.writeFile(workbook, finalFilename);
};