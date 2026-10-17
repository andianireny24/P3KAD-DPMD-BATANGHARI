"""Pydantic v2 models — hand-mirrored in frontend/src/lib/types.ts (keep in sync)."""
import uuid
from datetime import datetime, timezone
from typing import Literal, Optional

from pydantic import BaseModel, Field


def _uuid() -> str:
    return str(uuid.uuid4())


def _now() -> datetime:
    return datetime.now(timezone.utc)


class AnggotaKeluarga(BaseModel):
    nama: str
    nik: str = ""
    hubungan: str = ""
    jenis_kelamin: str = ""
    tgl_lahir: str = ""
    pendidikan: str = ""


class PersonInput(BaseModel):
    nama: str
    nik: str = ""
    no_kk: str = ""
    jenis: Literal["perangkat", "penggiat"] = "perangkat"
    jabatan: str = ""
    desa_id: str
    jumlah_anggota_kk: Optional[int] = None
    anggota: list[AnggotaKeluarga] = []


class Person(BaseModel):
    id: str = Field(default_factory=_uuid)
    nama: str
    nik: str = ""
    no_kk: str = ""
    jenis: Literal["perangkat", "penggiat"] = "perangkat"
    jabatan: str = ""
    desa_id: str
    kecamatan_id: str = ""
    jumlah_anggota_kk: int = 1
    anggota: list[AnggotaKeluarga] = []
    desa_nama: str = ""
    kecamatan_nama: str = ""
    created_at: datetime = Field(default_factory=_now)


class KecamatanInput(BaseModel):
    nama: str
    urutan: Optional[int] = None


class KecamatanPatch(BaseModel):
    nama: Optional[str] = None
    urutan: Optional[int] = None


class Kecamatan(BaseModel):
    id: str = Field(default_factory=_uuid)
    nama: str
    urutan: int = 0


class DesaInput(BaseModel):
    kecamatan_id: str
    nama: str


class DesaPatch(BaseModel):
    nama: Optional[str] = None
    kecamatan_id: Optional[str] = None


class Desa(BaseModel):
    id: str = Field(default_factory=_uuid)
    kecamatan_id: str
    nama: str


class KecamatanWithDesa(Kecamatan):
    desa: list[Desa] = []


class WilayahResponse(BaseModel):
    kecamatan: list[KecamatanWithDesa] = []


class AlokasiInput(BaseModel):
    nama: str
    target: Literal["perangkat", "penggiat", "semua", "jiwa", "kk", "jabatan", "tetap"] = "perangkat"
    jabatan_match: str = ""
    rate: float = 0
    frekuensi: int = 12
    qty_manual: float = 0
    keterangan: str = ""
    urutan: Optional[int] = None


class AlokasiItem(BaseModel):
    id: str = Field(default_factory=_uuid)
    nama: str
    target: Literal["perangkat", "penggiat", "semua", "jiwa", "kk", "jabatan", "tetap"] = "perangkat"
    jabatan_match: str = ""
    rate: float = 0
    frekuensi: int = 12
    qty_manual: float = 0
    keterangan: str = ""
    urutan: int = 0


class AlokasiHitungItem(BaseModel):
    id: str
    nama: str
    target: str
    rate: float
    frekuensi: int
    keterangan: str = ""
    qty: float
    jumlah: float


class AlokasiHitung(BaseModel):
    items: list[AlokasiHitungItem] = []
    total: float = 0


class RekapDesa(BaseModel):
    id: str
    nama: str
    perangkat: int = 0
    penggiat: int = 0
    total_orang: int = 0
    jiwa: int = 0
    kk: int = 0


class RekapKecamatan(RekapDesa):
    desa_count: int = 0
    desa_terisi: int = 0
    desa: list[RekapDesa] = []


class RekapTotal(RekapDesa):
    pass


class Rekap(BaseModel):
    tanggal: str
    kecamatan_count: int = 0
    desa_count: int = 0
    kecamatan: list[RekapKecamatan] = []
    total: RekapTotal


class LoginRequest(BaseModel):
    password: str
