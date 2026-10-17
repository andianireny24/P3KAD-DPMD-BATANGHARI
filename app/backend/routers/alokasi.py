import uuid

from fastapi import APIRouter, Depends, HTTPException

from lib.auth import require_auth
from lib.db import db
from models.app import AlokasiHitung, AlokasiHitungItem, AlokasiInput, AlokasiItem

router = APIRouter(dependencies=[Depends(require_auth)])

# qty for every target except "tetap"/"jabatan" comes live from the person registry
COUNT_TARGETS = {"perangkat", "penggiat", "semua", "jiwa", "kk"}


async def compute_hitung(kecamatan_id: str = "", desa_id: str = "") -> AlokasiHitung:
    query: dict = {}
    if desa_id:
        query["desa_id"] = desa_id
    elif kecamatan_id:
        query["kecamatan_id"] = kecamatan_id
    persons = await db.persons.find(
        query, {"_id": 0, "jenis": 1, "jabatan": 1, "jumlah_anggota_kk": 1, "no_kk": 1}
    ).to_list(100000)

    counts = {
        "perangkat": sum(1 for p in persons if p.get("jenis") == "perangkat"),
        "penggiat": sum(1 for p in persons if p.get("jenis") == "penggiat"),
        "semua": len(persons),
        "jiwa": sum(int(p.get("jumlah_anggota_kk") or 0) for p in persons),
        "kk": len({p["no_kk"] for p in persons if p.get("no_kk")}),
    }

    def jabatan_count(pattern: str) -> int:
        keys = [k.strip().lower() for k in pattern.split(",") if k.strip()]
        if not keys:
            return 0
        n = 0
        for p in persons:
            jab = (p.get("jabatan") or "").lower()
            if any(k in jab for k in keys):
                n += 1
        return n

    items = await db.alokasi_items.find({}, {"_id": 0}).sort("urutan", 1).to_list(500)
    out: list[AlokasiHitungItem] = []
    for it in items:
        obj = AlokasiItem(**it)
        if obj.target == "tetap":
            qty = obj.qty_manual
        elif obj.target == "jabatan":
            qty = float(jabatan_count(obj.jabatan_match))
        else:
            qty = float(counts.get(obj.target, 0))
        jumlah = qty * obj.rate * obj.frekuensi
        out.append(
            AlokasiHitungItem(
                id=obj.id, nama=obj.nama, target=obj.target, rate=obj.rate,
                frekuensi=obj.frekuensi, keterangan=obj.keterangan, qty=qty, jumlah=jumlah,
            )
        )
    return AlokasiHitung(items=out, total=sum(i.jumlah for i in out))


@router.get("/alokasi/hitung", response_model=AlokasiHitung)
async def hitung(kecamatan_id: str = "", desa_id: str = ""):
    return await compute_hitung(kecamatan_id, desa_id)


@router.get("/alokasi", response_model=list[AlokasiItem])
async def list_items():
    docs = await db.alokasi_items.find({}, {"_id": 0}).sort("urutan", 1).to_list(500)
    return [AlokasiItem(**d) for d in docs]


@router.post("/alokasi", response_model=AlokasiItem)
async def create_item(input: AlokasiInput):
    if input.urutan is None:
        last = await db.alokasi_items.find({}, {"_id": 0, "urutan": 1}).sort("urutan", -1).to_list(1)
        input.urutan = (last[0]["urutan"] + 1) if last else 1
    obj = AlokasiItem(id=str(uuid.uuid4()), **input.model_dump())
    await db.alokasi_items.insert_one(obj.model_dump())
    return obj


@router.put("/alokasi/{item_id}", response_model=AlokasiItem)
async def update_item(item_id: str, input: AlokasiInput):
    existing = await db.alokasi_items.find_one({"id": item_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Item tidak ditemukan")
    # urutan is passed explicitly, so it must not also arrive inside the dumped input
    obj = AlokasiItem(
        id=item_id,
        urutan=existing.get("urutan", 0),
        **input.model_dump(exclude={"urutan"}),
    )
    await db.alokasi_items.replace_one({"id": item_id}, obj.model_dump())
    return obj


@router.delete("/alokasi/{item_id}")
async def delete_item(item_id: str):
    res = await db.alokasi_items.delete_one({"id": item_id})
    if not res.deleted_count:
        raise HTTPException(status_code=404, detail="Item tidak ditemukan")
    return {"ok": True}
