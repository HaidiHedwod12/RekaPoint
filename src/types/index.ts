export interface User {
  id: string;
  nama: string;
  username: string;
  password_hash?: string;
  jabatan: string;
  role: 'admin' | 'karyawan';
  minimal_poin: number;
  can_view_poin: boolean;
  created_at: string;
}

export interface Judul {
  id: string;
  nama: string;
  created_at: string;
}

export interface SubJudul {
  id: string;
  judul_id: string;
  nama: string;
  created_at: string;
}

export interface Aktivitas {
  id: string;
  user_id: string;
  tanggal: string;
  judul_id: string;
  subjudul_id: string;
  aktivitas: string;
  deskripsi?: string;
  poin?: number;
  created_at: string;
  updated_at: string;
  // Relations
  user?: User;
  judul?: Judul;
  subjudul?: SubJudul;
}

export interface AuthUser {
  user: User;
  token: string;
}