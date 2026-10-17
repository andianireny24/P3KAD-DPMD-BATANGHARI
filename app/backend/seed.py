"""Seed idempoten: 8 kecamatan + 110 desa resmi, item alokasi awal, contoh data.
Jalankan: cd /app/backend && python seed.py"""
import asyncio
import uuid
from datetime import datetime, timezone

from lib.db import db, ensure_indexes
from models.app import AnggotaKeluarga

KECAMATAN: list[dict] = [
    {"nama": "Muara Bulian", "urutan": 1, "desa": ["Aro", "Bajubang Laut", "Kilangan", "Malapari", "Muara Singoan", "Napal Sisik", "Olak", "Pasar Terusan", "Pelayangan", "Rambahan", "Rantau Puri", "Simpang Terusan", "Singkawang", "Sungai Baung", "Sungai Buluh", "Tenam"]},
    {"nama": "Bajubang", "urutan": 2, "desa": ["Batin", "Bungku", "Ladang Peris", "Mekar Jaya", "Mekar Sari Ness", "Penerokan", "Petajin", "Pompa Air", "Sungkai"]},
    {"nama": "Batin XXIV", "urutan": 3, "desa": ["Aur Gading", "Bulian Baru", "Hajran", "Jangga Aur", "Jangga Baru", "Jelutih", "Karmeo", "Koto Buayo", "Mata Gual", "Olak Besar", "Paku Aji", "Simpang Jelutih", "Simpang Karmeo", "Terentang Baru", "Karang Harapan"]},
    {"nama": "Mersam", "urutan": 4, "desa": ["Belanti Jaya", "Benteng Rendah", "Bukit Harapan", "Bukit Kemuning", "Kembang Tanjung", "Mersam", "Pematang Gadung", "Rantau Gedang", "Sengkati Baru", "Sengkati Gedang", "Sengkati Kecil", "Sengkati Mudo", "Simpang Rantau Gedang", "Sungai Puar", "Tanjung Putra", "Tapah Sari", "Teluk Melintang"]},
    {"nama": "Muara Tembesi", "urutan": 5, "desa": ["Ampelu", "Ampelu Mudo", "Jebak", "Pelayangan", "Pematang Lima Suku", "Pulau", "Rambutan Masam", "Rantau Kapas Mudo", "Rantau Kapas Tuo", "Suka Ramai", "Sungai Pulai", "Tanjung Marwo"]},
    {"nama": "Pemayung", "urutan": 6, "desa": ["Awin", "Kampung Pulau", "Kaos", "Kuap", "Kubu Kandang", "Lopak Aur", "Lubuk Ruso", "Olak Rambahan", "Pulau Betung", "Pulau Raman", "Selat", "Senaning", "Serasah", "Simpang Kubu Kandang", "Tebing Tinggi", "Teluk", "Teluk Ketapang", "Ture"]},
    {"nama": "Maro Sebo Ulu", "urutan": 7, "desa": ["Batu Sawar", "Buluh Kasab", "Kampung Baru", "Kembang Seri", "Kembang Seri Baru", "Mekar Sari", "Olak Kemang", "Padang Kelapo", "Peninjauan", "Rengas IX", "Rawa Mekar", "Sungai Lingkar", "Sungai Ruan Ilir", "Sungai Ruan Ulu", "Tebing Tinggi", "Teluk Leban"]},
    {"nama": "Maro Sebo Ilir", "urutan": 8, "desa": ["Bukit Sari", "Bulian Jaya", "Danau Embat", "Karya Mukti", "Kehidupan Baru", "Terusan", "Tidar Kuranji"]},
]

DEFAULT_ALOKASI = [
    {"nama": "SILTAP Kepala Desa", "target": "jabatan", "jabatan_match": "kepala desa", "rate": 2427000, "frekuensi": 12, "qty_manual": 0, "keterangan": "Format DATA MASTER tahun lalu", "urutan": 1},
    {"nama": "SILTAP Sekretaris Desa", "target": "jabatan", "jabatan_match": "sekretaris desa,sekdes", "rate": 2225000, "frekuensi": 12, "qty_manual": 0, "keterangan": "Format DATA MASTER tahun lalu", "urutan": 2},
    {"nama": "SILTAP Kasi", "target": "jabatan", "jabatan_match": "kasi,", "rate": 2150000, "frekuensi": 12, "qty_manual": 0, "keterangan": "Format DATA MASTER tahun lalu", "urutan": 3},
    {"nama": "SILTAP Kaur", "target": "jabatan", "jabatan_match": "kaur", "rate": 2075000, "frekuensi": 12, "qty_manual": 0, "keterangan": "Format DATA MASTER tahun lalu", "urutan": 4},
    {"nama": "Tunjangan Ketua BPD", "target": "jabatan", "jabatan_match": "ketua bpd", "rate": 1450000, "frekuensi": 12, "qty_manual": 0, "keterangan": "Format DATA MASTER tahun lalu", "urutan": 5},
    {"nama": "Insentif Ketua RT", "target": "jabatan", "jabatan_match": "ketua rt", "rate": 500000, "frekuensi": 12, "qty_manual": 0, "keterangan": "Format DATA MASTER tahun lalu", "urutan": 6},
    {"nama": "Iuran BPJS Kesehatan per KK (4%+1%)", "target": "kk", "rate": 173575, "frekuensi": 12, "qty_manual": 0, "keterangan": "Sesuai sheet BPJS KESEHATAN KP — jumlah KP x iuran", "urutan": 7},
    {"nama": "BPJS TK per Orang", "target": "semua", "rate": 18746, "frekuensi": 12, "qty_manual": 0, "keterangan": "Format DATA MASTER tahun lalu", "urutan": 8},
    {"nama": "Bantuan Non Tunai (BNBA) — isi sesuai Excel terpisah", "target": "tetap", "rate": 1, "frekuensi": 1, "qty_manual": 0, "keterangan": "Ubah Jumlah (Qty) sesuai total BNBA di Excel terpisah", "urutan": 9},
]

# Data contoh kecil supaya rekap/kalkulator tidak kosong — boleh dihapus lewat UI.
CONTOH = [
    {"desa": ("Muara Bulian", "Aro"), "rows": [
        {"nama": "Ahmad Syarifuddin", "nik": "321604150319780001", "no_kk": "32160401012 0230001".replace(" ", ""), "jenis": "perangkat", "jabatan": "Kepala Desa",
         "anggota": [
             {"nama": "Siti Aminah", "nik": "321604150319830002", "hubungan": "Istri", "jenis_kelamin": "Perempuan", "tgl_lahir": "1983-03-15", "pendidikan": "S1"},
             {"nama": "Rizky Pratama", "nik": "321604150320050003", "hubungan": "Anak", "jenis_kelamin": "Laki-laki", "tgl_lahir": "2005-07-02", "pendidikan": "SMA"},
             {"nama": "Fitri Handayani", "nik": "321604150320080004", "hubungan": "Anak", "jenis_kelamin": "Perempuan", "tgl_lahir": "2008-11-11", "pendidikan": "SMP"},
         ]},
        {"nama": "Siti Rahma", "nik": "321604120819900005", "no_kk": "32160401012 0230005".replace(" ", ""), "jenis": "perangkat", "jabatan": "Kaur Keuangan",
         "anggota": [
             {"nama": "Andi Saputra", "nik": "321604120819880006", "hubungan": "Suami", "jenis_kelamin": "Laki-laki", "tgl_lahir": "1988-08-12", "pendidikan": "S1"},
             {"nama": "Nayla Sari", "nik": "321604120820150007", "hubungan": "Anak", "jenis_kelamin": "Perempuan", "tgl_lahir": "2015-01-05", "pendidikan": "SD"},
         ]},
        {"nama": "Dedi Kurniawan", "nik": "321604050219920008", "no_kk": "32160401012 0230008".replace(" ", ""), "jenis": "perangkat", "jabatan": "Kepala Dusun I",
         "anggota": [
             {"nama": "Rina Wati", "nik": "321604050219930009", "hubungan": "Istri", "jenis_kelamin": "Perempuan", "tgl_lahir": "1993-02-05", "pendidikan": "SMA"},
         ]},
    ]},
    {"desa": ("Maro Sebo Ilir", "Bukit Sari"), "rows": [
        {"nama": "Rahmat Hidayat", "nik": "321608101019850001", "no_kk": "32160801012 0230010".replace(" ", ""), "jenis": "perangkat", "jabatan": "Kepala Desa",
         "anggota": [
             {"nama": "Wulan Sari", "nik": "321608101019870002", "hubungan": "Istri", "jenis_kelamin": "Perempuan", "tgl_lahir": "1987-10-10", "pendidikan": "S1"},
             {"nama": "Bagas Dwi", "nik": "321608101020100003", "hubungan": "Anak", "jenis_kelamin": "Laki-laki", "tgl_lahir": "2010-04-21", "pendidikan": "SD"},
             {"nama": "Kirana Putri", "nik": "321608101020140004", "hubungan": "Anak", "jenis_kelamin": "Perempuan", "tgl_lahir": "2014-09-30", "pendidikan": "TK"},
         ]},
        {"nama": "Yulianti", "nik": "321608220219910005", "no_kk": "32160801012 0230015".replace(" ", ""), "jenis": "penggiat", "jabatan": "Penggiat Posyandu / Kader Kesehatan Desa",
         "anggota": [
             {"nama": "Hendra Gunawan", "nik": "321608220219890006", "hubungan": "Suami", "jenis_kelamin": "Laki-laki", "tgl_lahir": "1989-02-22", "pendidikan": "SMA"},
             {"nama": "Alya Rahma", "nik": "321608220220160007", "hubungan": "Anak", "jenis_kelamin": "Perempuan", "tgl_lahir": "2016-06-17", "pendidikan": "TK"},
         ]},
        {"nama": "Marwan", "nik": "321608050619880008", "no_kk": "32160801012 0230018".replace(" ", ""), "jenis": "penggiat", "jabatan": "Ketua RT / RW", "anggota": []},
    ]},
]


async def main() -> None:
    kec_ids: dict[str, str] = {}
    desa_ids: dict[tuple[str, str], str] = {}
    for k in KECAMATAN:
        doc = await db.kecamatan.find_one({"nama": k["nama"]})
        if not doc:
            kid = str(uuid.uuid4())
            await db.kecamatan.insert_one({"id": kid, "nama": k["nama"], "urutan": k["urutan"]})
            kec_ids[k["nama"]] = kid
        else:
            kec_ids[k["nama"]] = doc["id"]
        for nama in k["desa"]:
            ddoc = await db.desa.find_one({"kecamatan_id": kec_ids[k["nama"]], "nama": nama})
            if not ddoc:
                did = str(uuid.uuid4())
                await db.desa.insert_one({"id": did, "kecamatan_id": kec_ids[k["nama"]], "nama": nama})
                desa_ids[(k["nama"], nama)] = did
            else:
                desa_ids[(k["nama"], nama)] = ddoc["id"]

    if await db.alokasi_items.count_documents({}) == 0:
        await db.alokasi_items.insert_many(
            [{**item, "id": str(uuid.uuid4())} for item in DEFAULT_ALOKASI]
        )

    if await db.persons.count_documents({}) == 0:
        for group in CONTOH:
            desa_id = desa_ids.get(group["desa"])
            if not desa_id:
                continue
            kec_id = kec_ids[group["desa"][0]]
            for r in group["rows"]:
                anggota = [AnggotaKeluarga(**a) for a in r.get("anggota", [])]
                person = dict(
                    id=str(uuid.uuid4()),
                    nama=r["nama"], nik=r["nik"], no_kk=r["no_kk"],
                    jenis=r["jenis"], jabatan=r["jabatan"],
                    desa_id=desa_id, kecamatan_id=kec_id,
                    jumlah_anggota_kk=(1 + len(anggota)) if anggota else 1,
                    anggota=[a.model_dump() for a in anggota],
                    created_at=datetime.now(timezone.utc),
                )
                await db.persons.insert_one(person)

    await ensure_indexes()
    kec_n = await db.kecamatan.count_documents({})
    desa_n = await db.desa.count_documents({})
    per_n = await db.persons.count_documents({})
    alok_n = await db.alokasi_items.count_documents({})
    print(f"Seeded: {kec_n} kecamatan, {desa_n} desa, {per_n} contoh person, {alok_n} item alokasi")


if __name__ == "__main__":
    asyncio.run(main())
