// Hand-written mirrors of the Pydantic models in backend/models/app.py — keep in sync in the same edit.

export type Jenis = "perangkat" | "penggiat";
export type AlokasiTarget = "perangkat" | "penggiat" | "semua" | "jiwa" | "kk" | "jabatan" | "tetap";

export interface AnggotaKeluarga {
  nama: string;
  nik: string;
  hubungan: string;
  jenis_kelamin: string;
  tgl_lahir: string;
  pendidikan: string;
}

export interface Person {
  id: string;
  nama: string;
  nik: string;
  no_kk: string;
  jenis: Jenis;
  jabatan: string;
  desa_id: string;
  desa_nama: string;
  kecamatan_id: string;
  kecamatan_nama: string;
  jumlah_anggota_kk: number;
  anggota: AnggotaKeluarga[];
  created_at: string;
}

export interface PersonInput {
  nama: string;
  nik: string;
  no_kk: string;
  jenis: Jenis;
  jabatan: string;
  desa_id: string;
  jumlah_anggota_kk: number | null;
  anggota: AnggotaKeluarga[];
}

export interface Desa {
  id: string;
  kecamatan_id: string;
  nama: string;
}

export interface Kecamatan {
  id: string;
  nama: string;
  urutan: number;
  desa: Desa[];
}

export interface Wilayah {
  kecamatan: Kecamatan[];
}

export interface RekapDesa {
  id: string;
  nama: string;
  perangkat: number;
  penggiat: number;
  total_orang: number;
  jiwa: number;
  kk: number;
}

export interface RekapKecamatan extends RekapDesa {
  desa_count: number;
  desa_terisi: number;
  desa: RekapDesa[];
}

export interface Rekap {
  tanggal: string;
  kecamatan_count: number;
  desa_count: number;
  kecamatan: RekapKecamatan[];
  total: RekapDesa;
}

export interface AlokasiItem {
  id: string;
  nama: string;
  target: AlokasiTarget;
  jabatan_match: string;
  rate: number;
  frekuensi: number;
  qty_manual: number;
  keterangan: string;
  urutan: number;
}

export interface AlokasiHitungItem {
  id: string;
  nama: string;
  target: AlokasiTarget;
  rate: number;
  frekuensi: number;
  keterangan: string;
  qty: number;
  jumlah: number;
}

export interface AlokasiHitung {
  items: AlokasiHitungItem[];
  total: number;
}

export interface ImportPreview {
  headers: string[];
  row_count: number;
  sample: string[][];
  suggested: Record<string, string>;
}

export interface ImportResult {
  inserted: number;
  skipped: number;
  created_kecamatan: number;
  created_desa: number;
  errors: string[];
}

export interface Me {
  authenticated: boolean;
}
