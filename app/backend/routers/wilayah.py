import re
import uuid

from fastapi import APIRouter, Depends, HTTPException

from lib.auth import require_auth
from lib.db import db
from models.app import Desa, DesaInput, DesaPatch, KecamatanInput, KecamatanPatch, KecamatanWithDesa, WilayahResponse

router = APIRouter(dependencies=[Depends(require_auth)])


async def _next_urutan() -> int:
    last = await db.kecamatan.find({}, {"_id": 0, "urutan": 1}).sort("urutan", -1).to_list(1)
    return (last[0]["urutan"] + 1) if last else 1


@router.get("/wilayah", response_model=WilayahResponse)
async def get_wilayah():
    kecs = await db.kecamatan.find({}, {"_id": 0}).sort("urutan", 1).to_list(100)
    desas = await db.desa.find({}, {"_id": 0}).to_list(500)
    by_kec: dict[str, list[Desa]] = {k["id"]: [] for k in kecs}
    for d in desas:
        if d.get("kecamatan_id") in by_kec:
            by_kec[d["kecamatan_id"]].append(Desa(**d))
    for children in by_kec.values():
        children.sort(key=lambda d: d.nama)
    return WilayahResponse(
        kecamatan=[KecamatanWithDesa(**k, desa=by_kec.get(k["id"], [])) for k in kecs]
    )


@router.post("/wilayah/kecamatan", response_model=KecamatanWithDesa)
async def create_kecamatan(input: KecamatanInput):
    nama = input.nama.strip()
    if not nama:
        raise HTTPException(status_code=422, detail="Nama kecamatan wajib diisi")
    dup = await db.kecamatan.find_one(
        {"nama": {"$regex": f"^{re.escape(nama)}$", "$options": "i"}}
    )
    if dup:
        raise HTTPException(status_code=409, detail="Kecamatan dengan nama itu sudah ada")
    urutan = input.urutan if input.urutan is not None else await _next_urutan()
    kec = KecamatanWithDesa(id=str(uuid.uuid4()), nama=nama, urutan=urutan, desa=[])
    await db.kecamatan.insert_one(kec.model_dump())
    return kec


@router.patch("/wilayah/kecamatan/{kec_id}", response_model=KecamatanWithDesa)
async def patch_kecamatan(kec_id: str, input: KecamatanPatch):
    doc = await db.kecamatan.find_one({"id": kec_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Kecamatan tidak ditemukan")
    update: dict = {}
    if input.nama is not None and input.nama.strip():
        update["nama"] = input.nama.strip()
    if input.urutan is not None:
        update["urutan"] = input.urutan
    if update:
        await db.kecamatan.update_one({"id": kec_id}, {"$set": update})
    doc.update(update)
    desas = await db.desa.find({"kecamatan_id": kec_id}, {"_id": 0}).to_list(500)
    return KecamatanWithDesa(**doc, desa=[Desa(**d) for d in desas])


@router.delete("/wilayah/kecamatan/{kec_id}")
async def delete_kecamatan(kec_id: str):
    count = await db.desa.count_documents({"kecamatan_id": kec_id})
    if count:
        raise HTTPException(
            status_code=409,
            detail=f"Kecamatan masih memiliki {count} desa — kosongkan dulu",
        )
    res = await db.kecamatan.delete_one({"id": kec_id})
    if not res.deleted_count:
        raise HTTPException(status_code=404, detail="Kecamatan tidak ditemukan")
    return {"ok": True}


@router.post("/wilayah/desa", response_model=Desa)
async def create_desa(input: DesaInput):
    nama = input.nama.strip()
    if not nama:
        raise HTTPException(status_code=422, detail="Nama desa wajib diisi")
    kec = await db.kecamatan.find_one({"id": input.kecamatan_id})
    if not kec:
        raise HTTPException(status_code=404, detail="Kecamatan tidak ditemukan")
    dup = await db.desa.find_one(
        {"kecamatan_id": input.kecamatan_id, "nama": {"$regex": f"^{re.escape(nama)}$", "$options": "i"}}
    )
    if dup:
        raise HTTPException(status_code=409, detail="Desa sudah ada di kecamatan itu")
    desa = Desa(id=str(uuid.uuid4()), kecamatan_id=input.kecamatan_id, nama=nama)
    await db.desa.insert_one(desa.model_dump())
    return desa


@router.patch("/wilayah/desa/{desa_id}", response_model=Desa)
async def patch_desa(desa_id: str, input: DesaPatch):
    doc = await db.desa.find_one({"id": desa_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Desa tidak ditemukan")
    update: dict = {}
    if input.nama is not None and input.nama.strip():
        update["nama"] = input.nama.strip()
    if input.kecamatan_id is not None and input.kecamatan_id:
        if not await db.kecamatan.find_one({"id": input.kecamatan_id}):
            raise HTTPException(status_code=404, detail="Kecamatan tujuan tidak ditemukan")
        update["kecamatan_id"] = input.kecamatan_id
    if update:
        await db.desa.update_one({"id": desa_id}, {"$set": update})
    doc.update(update)
    return Desa(**doc)


@router.delete("/wilayah/desa/{desa_id}")
async def delete_desa(desa_id: str):
    count = await db.persons.count_documents({"desa_id": desa_id})
    if count:
        raise HTTPException(
            status_code=409,
            detail=f"Masih ada {count} data perangkat/penggiat di desa ini — hapus/pindahkan dulu",
        )
    res = await db.desa.delete_one({"id": desa_id})
    if not res.deleted_count:
        raise HTTPException(status_code=404, detail="Desa tidak ditemukan")
    return {"ok": True}
