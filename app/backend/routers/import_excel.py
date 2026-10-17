"""Impor Excel: pratinjau header + pemetaan kolom, lalu commit.
Menggunakan openpyxl langsung (bukan pandas) agar NIK 16 digit yang diketik
sebagai angka di Excel tidak kehilangan presisi."""
import io
import json
import re
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from openpyxl import load_workbook

from lib.auth import require_auth
from lib.db import db
from models.app import Person

router = APIRouter(dependencies=[Depends(require_auth)])

FIELDS = ["nama", "nik", "no_kk", "jabatan", "desa", "kecamatan", "jenis", "jumlah_anggota_kk"]

ALIASES: dict[str, set[str]] = {
    "kecamatan": {"kecamatan", "kec", "namakecamatan"},
    "desa": {"desa", "namadesa", "desakelurahan", "desakel"},
    "jenis": {"jenis", "kategori", "status", "jenisstatus", "statuskepegawaian"},
    "jumlah_anggota_kk": {
        "jumlahanggotakk", "jmlanggotakk", "jumlahanggota", "jumlahanggotaperkk",
        "jmlanggota", "jumlahanggotakeluarga", "anggotakk", "jiwa", "jumlahjiwa",
    },
    "no_kk": {"nokk", "nokartukeluarga", "kk", "nomorkk", "nomorkartukeluarga"},
    "nik": {"nik", "nonik", "nomornik"},
    "jabatan": {"jabatan", "posisi", "kedudukan", "namajabatan"},
    "nama": {"nama", "namalengkap", "namaorang", "namapemohon", "namaperangkat", "namapenggiat"},
}


def _norm(v) -> str:
    return re.sub(r"[^a-z0-9]", "", str(v).lower()) if v is not None else ""


def _cell(v) -> str:
    if v is None:
        return ""
    if isinstance(v, float) and v.is_integer():
        return str(int(v))  # NIK/KK typed as numbers come back as whole floats
    return str(v).strip()


def _read_rows(data: bytes) -> list[list[str]]:
    try:
        wb = load_workbook(io.BytesIO(data), read_only=True, data_only=True)
    except Exception:
        raise HTTPException(status_code=400, detail="File tidak terbaca. Simpan sebagai .xlsx lalu coba lagi.")
    ws = wb.active
    rows: list[list[str]] = []
    for row in ws.iter_rows(values_only=True):
        if all(v is None or str(v).strip() == "" for v in row):
            continue
        rows.append([_cell(v) for v in row])
    wb.close()
    return rows


def suggest_mapping(headers: list[str]) -> dict[str, str]:
    normed = [(_norm(h), h) for h in headers]
    mapping: dict[str, str] = {}
    for field in FIELDS:
        aliases = ALIASES[field]
        hit = None
        for nh, raw in normed:  # exact alias match wins
            if nh in aliases:
                hit = raw
                break
        if hit is None:  # then substring, longest alias first
            for alias in sorted(aliases, key=len, reverse=True):
                if len(alias) < 4:
                    continue
                for nh, raw in normed:
                    if alias in nh:
                        hit = raw
                        break
                if hit:
                    break
        if hit:
            mapping[field] = hit
    return mapping


def detect_jenis(value: str, default: str) -> str:
    s = value.lower()
    if any(k in s for k in ("penggiat", "kader", "kpm", "pemberdayaan", "posyandu", "karang taruna")):
        return "penggiat"
    if any(k in s for k in ("perangkat", "kades", "kepala desa", "sekdes", "sekretaris", "kaur", "kasi", "kadus", "bpd")):
        return "perangkat"
    return default


def to_int(value: str):
    try:
        return int(float(str(value).replace(",", ".")))
    except (TypeError, ValueError):
        return None


async def _resolve_wilayah(kec_nama: str, desa_nama: str) -> tuple[str, str, bool, bool]:
    """Return (desa_id, kecamatan_id, created_kec, created_desa) — match by name (ci), create if missing."""
    async def ci(coll, nama: str):
        return await coll.find_one({"nama": {"$regex": f"^{re.escape(nama)}$", "$options": "i"}})

    created_kec = created_desa = False
    kec = await ci(db.kecamatan, kec_nama) if kec_nama else None
    desa = await ci(db.desa, desa_nama) if desa_nama else None

    if desa and (kec is None or desa.get("kecamatan_id") == kec["id"]):
        return desa["id"], desa.get("kecamatan_id", ""), created_kec, created_desa

    if not kec:
        kec = await ci(db.kecamatan, "Lainnya")  # bucket when the file has no kecamatan column
        if not kec:
            kid = str(uuid.uuid4())
            await db.kecamatan.insert_one({"id": kid, "nama": "Lainnya", "urutan": 99})
            kec = {"id": kid}
            created_kec = True

    if desa:  # same-named desa exists in another kecamatan → create a sibling under this one
        desa = None

    did = str(uuid.uuid4())
    await db.desa.insert_one({"id": did, "kecamatan_id": kec["id"], "nama": desa_nama})
    created_desa = True
    return did, kec["id"], created_kec, created_desa


@router.post("/import/preview")
async def import_preview(file: UploadFile = File(...)):
    data = await file.read()
    rows = _read_rows(data)
    if not rows:
        raise HTTPException(status_code=400, detail="File kosong atau tidak terbaca")
    headers = rows[0]
    return {
        "headers": headers,
        "row_count": len(rows) - 1,
        "sample": rows[1:6],
        "suggested": suggest_mapping(headers),
    }


@router.post("/import/commit")
async def import_commit(
    file: UploadFile = File(...),
    mapping: str = Form("{}"),
    jenis_default: str = Form("perangkat"),
):
    data = await file.read()
    rows = _read_rows(data)
    if len(rows) < 2:
        raise HTTPException(status_code=400, detail="Tidak ada baris data untuk diimpor")
    try:
        mp = json.loads(mapping)
    except json.JSONDecodeError:
        raise HTTPException(status_code=422, detail="Pemetaan kolom tidak valid")
    headers = rows[0]
    idx: dict[str, int] = {}
    for f in FIELDS:
        h = mp.get(f)
        if h and h in headers:
            idx[f] = headers.index(h)

    def val(row: list[str], f: str) -> str:
        j = idx.get(f)
        return row[j] if j is not None and j < len(row) else ""

    inserted = skipped = created_kec_total = created_desa_total = 0
    errors: list[str] = []
    cache: dict[tuple[str, str], tuple[str, str]] = {}
    default_jenis = jenis_default if jenis_default in ("perangkat", "penggiat") else "perangkat"

    for i, row in enumerate(rows[1:], start=2):
        nama = val(row, "nama")
        if not nama:
            skipped += 1
            errors.append(f"Baris {i}: kolom Nama kosong — dilewati")
            continue
        desa_nama = val(row, "desa")
        kec_nama = val(row, "kecamatan")
        if not desa_nama:
            skipped += 1
            errors.append(f"Baris {i}: kolom Desa kosong — dilewati")
            continue
        key = (kec_nama.lower(), desa_nama.lower())
        if key in cache:
            desa_id, kecamatan_id = cache[key]
        else:
            desa_id, kecamatan_id, ck, cd = await _resolve_wilayah(kec_nama, desa_nama)
            created_kec_total += ck
            created_desa_total += cd
            cache[key] = (desa_id, kecamatan_id)

        jenis = detect_jenis(val(row, "jenis"), default_jenis)
        jumlah = to_int(val(row, "jumlah_anggota_kk"))
        person = dict(
            id=str(uuid.uuid4()),
            nama=nama,
            nik=val(row, "nik"),
            no_kk=val(row, "no_kk"),
            jenis=jenis,
            jabatan=val(row, "jabatan"),
            desa_id=desa_id,
            kecamatan_id=kecamatan_id,
            jumlah_anggota_kk=jumlah if jumlah and jumlah > 0 else 1,
            anggota=[],
            created_at=datetime.now(timezone.utc),
        )
        await db.persons.insert_one(person)
        inserted += 1

    return {
        "inserted": inserted,
        "skipped": skipped,
        "created_kecamatan": created_kec_total,
        "created_desa": created_desa_total,
        "errors": errors[:30],
    }
