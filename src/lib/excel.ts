import * as XLSX from 'xlsx';
import { Aktivitas, User } from '../types';
import { format } from 'date-fns';

export const exportUserActivities = (user: User, activities: Aktivitas[], filename?: string) => {
  const worksheetData = activities.map(activity => ({
    'Tanggal': format(new Date(activity.tanggal), 'dd/MM/yyyy'),
    'Nama Karyawan': user.nama,
    'Jabatan': user.jabatan,
    'Judul': activity.judul?.nama || '',
    'Sub Judul': activity.subjudul?.nama || '',
    'Aktivitas': activity.aktivitas,
    'Deskripsi': activity.deskripsi || '',
    'Poin': activity.poin || 0
  }));

  const worksheet = XLSX.utils.json_to_sheet(worksheetData);
  const workbook = XLSX.utils.book_new();
  
  // Set column widths
  const colWidths = [
    { wch: 12 }, // Tanggal
    { wch: 20 }, // Nama Karyawan
    { wch: 15 }, // Jabatan
    { wch: 20 }, // Judul
    { wch: 20 }, // Sub Judul
    { wch: 30 }, // Aktivitas
    { wch: 25 }, // Deskripsi
    { wch: 8 }   // Poin
  ];
  worksheet['!cols'] = colWidths;

  XLSX.utils.book_append_sheet(workbook, worksheet, user.nama);
  
  const fileName = filename || `Aktivitas_${user.nama.replace(/\s+/g, '_')}_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
  XLSX.writeFile(workbook, fileName);
};

export const exportAllActivities = (usersWithActivities: { user: User; activities: Aktivitas[] }[]) => {
  const workbook = XLSX.utils.book_new();

  usersWithActivities.forEach(({ user, activities }) => {
    const worksheetData = activities.map(activity => ({
      'Tanggal': format(new Date(activity.tanggal), 'dd/MM/yyyy'),
      'Nama Karyawan': user.nama,
      'Jabatan': user.jabatan,
      'Judul': activity.judul?.nama || '',
      'Sub Judul': activity.subjudul?.nama || '',
      'Aktivitas': activity.aktivitas,
      'Deskripsi': activity.deskripsi || '',
      'Poin': activity.poin || 0
    }));

    const worksheet = XLSX.utils.json_to_sheet(worksheetData);
    
    // Set column widths
    const colWidths = [
      { wch: 12 }, // Tanggal
      { wch: 20 }, // Nama Karyawan
      { wch: 15 }, // Jabatan
      { wch: 20 }, // Judul
      { wch: 20 }, // Sub Judul
      { wch: 30 }, // Aktivitas
      { wch: 25 }, // Deskripsi
      { wch: 8 }   // Poin
    ];
    worksheet['!cols'] = colWidths;

    // Use first 31 characters of name for sheet name (Excel limit)
    const sheetName = user.nama.substring(0, 31);
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  });

  const fileName = `Aktivitas_Semua_Karyawan_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
  XLSX.writeFile(workbook, fileName);
};