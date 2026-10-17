export const formatRupiah = (v: number): string =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(v || 0);

export const formatAngka = (v: number): string =>
  new Intl.NumberFormat("id-ID").format(v || 0);

export const LABEL_TARGET: Record<string, string> = {
  perangkat: "Per Perangkat",
  penggiat: "Per Penggiat",
  semua: "Per Orang (Semua)",
  jiwa: "Per Anggota KK (Jiwa)",
  kk: "Per KK",
  jabatan: "Per Jabatan",
  tetap: "Nominal Tetap",
};

export const LABEL_FIELD: Record<string, string> = {
  nama: "Nama",
  nik: "NIK",
  no_kk: "No. KK",
  jabatan: "Jabatan",
  desa: "Desa",
  kecamatan: "Kecamatan",
  jenis: "Jenis (Perangkat/Penggiat)",
  jumlah_anggota_kk: "Jumlah Anggota KK",
};
