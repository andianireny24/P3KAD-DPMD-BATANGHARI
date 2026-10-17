# SI Perangkat & Penggiat Desa — DPMD Kabupaten Batang Hari

Aplikasi internal **Dinas Pemberdayaan Masyarakat dan Desa (DPMD) Kabupaten Batang Hari, Jambi**
— Bidang Pemberdayaan Perencanaan Pengelolaan Keuangan dan Aset Desa — untuk merekap tahunan
data **perangkat desa** dan **penggiat desa** di **110 desa / 8 kecamatan**, menghitung
**jumlah anggota per KK**, dan menghitung **alokasi dana desa**.

## Fitur

- **Login satu password** — sesi httpOnly cookie (30 hari), password diatur lewat `APP_PASSWORD`.
- **Data Perangkat & Penggiat** — No, Nama, NIK, No. KK, jenis (perangkat/penggiat), jabatan,
  desa/kecamatan, jumlah anggota per KK (otomatis dari rincian anggota keluarga: kepala + 1 +
  anggota), rincian anggota keluarga (NIK, hubungan, jenis kelamin, tgl lahir, pendidikan).
- **Rekapitulasi otomatis** — hierarki Kabupaten → 8 Kecamatan → 110 Desa: jumlah perangkat,
  penggiat, total orang, anggota KK (jiwa), dan jumlah KK (distinct No. KK).
- **Impor Excel** — unggah `.xlsx` lama, kolom dipetakan otomatis (bisa dikoreksi), pratinjau
  5 baris, lalu impor; kecamatan/desa yang belum ada dibuat otomatis. NIK 16 digit aman
  (dibaca openpyxl, bukan float).
- **Kalkulator Alokasi Dana Desa** — tabel terhubung: qty diambil otomatis dari data
  (per perangkat / per penggiat / per orang / per jiwa / per KK / **per jabatan** via kata kunci,
  atau nominal tetap) × tarif × frekuensi. Item bisa ditambah/diubah/dihapus — termasuk BNBA
  dari Excel terpisah (isi sebagai "Nominal Tetap").
- **Ekspor Excel** — 5 sheet: Rekap Kecamatan, Rekap Desa, Detail Perangkat & Penggiat,
  Anggota Keluarga, Alokasi Dana.
- **Cetak / PDF** — laporan berkop surat resmi + kolom tanda tangan, cetak dari browser.
- **Master Wilayah** — kecamatan & desa bisa ditambah/diubah/dihapus.

## Struktur

```
backend/   FastAPI + Motor (MongoDB) + Pydantic v2  → port 8001
  server.py            bootstrap + pendaftaran router di api_router (/api)
  routers/             auth, wilayah, persons, rekap, alokasi, import_excel, export_excel
  models/app.py        model Pydantic (cermin manual: frontend/src/lib/types.ts)
  lib/                 db (motor + index), auth (sesi), dates (tanggal server)
  seed.py              seed idempoten 8 kecamatan + 110 desa + contoh data
frontend/  Vite + React 19 + TypeScript strict + Tailwind v4 + shadcn/ui  → port 3000
  src/pages/           Login, Dashboard, Registry, Recap, Alokasi, ImportExcel, Wilayah, Print
  src/lib/api.ts       fetch layer bertipe di atas /api (relatif, lewat proxy Vite)
tests/     Playwright e2e (pre-scaffold)
```

## Menjalankan di Laptop

Kebutuhan: Python 3.11+, Node 20+, MongoDB lokal (`mongod` berjalan di localhost:27017).

```bash
# 1) Backend
cd backend
python -m venv .venv && source .venv/bin/activate     # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env                                   # lalu isi APP_PASSWORD Anda
uvicorn server:app --host 0.0.0.0 --port 8001 --reload

# 2) Frontend (terminal kedua)
cd frontend
yarn install
yarn dev                                               # buka http://localhost:3000

# 3) Data awal (8 kecamatan, 110 desa, item alokasi, contoh data)
cd backend && python seed.py
```

Login dengan `APP_PASSWORD` dari `backend/.env` (default contoh: `dpmdbatanghari2025`).
Frontend memanggil backend lewat proxy `/api` → `http://localhost:8001` (sudah diatur di
`vite.config.ts`), jadi tidak ada pengaturan CORS tambahan saat lokal.

## Upload ke GitHub

Repositori sudah disiapkan `.gitignore` (node_modules, __pycache__, `.env` tidak ikut) dan
`.env.example`. Caranya:

```bash
git init -b main          # jika belum
git add .
git commit -m "SI Perangkat & Penggiat Desa DPMD Batang Hari"
git remote add origin https://github.com/<username>/<repo>.git
git push -u origin main
```

## Catatan

- Anchors tanggal server memakai `APP_TZ` (default `Asia/Jakarta`) — jangan hitung tanggal di sisi browser.
- Semua endpoint berada di bawah `/api` (satu router); frontend selalu memanggil path relatif.
- Data contoh di dalam seed boleh dihapus lewat UI setelah data asli diimpor.
