import re
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException

from lib.auth import require_auth
from lib.db import db
from models.app import Person, PersonInput

router = APIRouter(dependencies=[Depends(require_auth)])


async def _maps():
    desas = await db.desa.find({}, {"_id": 0}).to_list(500)
    kecs = await db.kecamatan.find({}, {"_id": 0}).to_list(100)
    return {d["id"]: d for d in desas}, {k["id"]: k for k in kecs}


def _jumlah(input: PersonInput) -> int:
    if input.anggota:
        return 1 + len(input.anggota)  # the person themselves + listed members
    if input.jumlah_anggota_kk is not None and input.jumlah_anggota_kk > 0:
        return input.jumlah_anggota_kk
    return 1


def _clean(doc: dict) -> dict:
    doc = dict(doc)
    doc.pop("desa_nama", None)  # display fields are derived, never stored — don't pass twice
    doc.pop("kecamatan_nama", None)
    return doc


async def _enrich(doc: dict) -> Person:
    desa_map, kec_map = await _maps()
    d = desa_map.get(doc.get("desa_id", ""), {})
    k = kec_map.get(doc.get("kecamatan_id", ""), {})
    return Person(**_clean(doc), desa_nama=d.get("nama", ""), kecamatan_nama=k.get("nama", ""))


async def _build_doc(input: PersonInput, person_id: str, created_at: datetime) -> dict:
    desa = await db.desa.find_one({"id": input.desa_id}, {"_id": 0})
    if not desa:
        raise HTTPException(status_code=404, detail="Desa tidak ditemukan")
    person = Person(
        id=person_id,
        nama=input.nama.strip(),
        nik=input.nik.strip(),
        no_kk=input.no_kk.strip(),
        jenis=input.jenis,
        jabatan=input.jabatan.strip(),
        desa_id=input.desa_id,
        kecamatan_id=desa.get("kecamatan_id", ""),
        jumlah_anggota_kk=_jumlah(input),
        anggota=input.anggota,
        created_at=created_at,
    )
    return person.model_dump(exclude={"desa_nama", "kecamatan_nama"})


@router.get("/persons", response_model=list[Person])
async def list_persons(kecamatan_id: str = "", desa_id: str = "", jenis: str = "", q: str = ""):
    query: dict = {}
    if desa_id:
        query["desa_id"] = desa_id
    elif kecamatan_id:
        query["kecamatan_id"] = kecamatan_id
    if jenis in ("perangkat", "penggiat"):
        query["jenis"] = jenis
    if q:
        query["nama"] = {"$regex": re.escape(q), "$options": "i"}
    docs = await db.persons.find(query, {"_id": 0}).sort("created_at", 1).to_list(20000)
    desa_map, kec_map = await _maps()
    out = []
    for doc in docs:
        d = desa_map.get(doc.get("desa_id", ""), {})
        k = kec_map.get(doc.get("kecamatan_id", ""), {})
        out.append(Person(**_clean(doc), desa_nama=d.get("nama", ""), kecamatan_nama=k.get("nama", "")))
    return out


@router.post("/persons", response_model=Person)
async def create_person(input: PersonInput):
    doc = await _build_doc(input, str(__import__("uuid").uuid4()), datetime.now(timezone.utc))
    await db.persons.insert_one(doc)
    return await _enrich(doc)


@router.put("/persons/{person_id}", response_model=Person)
async def update_person(person_id: str, input: PersonInput):
    existing = await db.persons.find_one({"id": person_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Data tidak ditemukan")
    doc = await _build_doc(input, person_id, existing.get("created_at", datetime.now(timezone.utc)))
    await db.persons.replace_one({"id": person_id}, doc)
    return await _enrich(doc)


@router.delete("/persons/{person_id}")
async def delete_person(person_id: str):
    res = await db.persons.delete_one({"id": person_id})
    if not res.deleted_count:
        raise HTTPException(status_code=404, detail="Data tidak ditemukan")
    return {"ok": True}
