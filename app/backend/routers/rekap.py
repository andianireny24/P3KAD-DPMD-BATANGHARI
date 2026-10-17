from collections import defaultdict

from fastapi import APIRouter, Depends

from lib.auth import require_auth
from lib.dates import today_iso
from lib.db import db
from models.app import Rekap, RekapDesa, RekapKecamatan, RekapTotal

router = APIRouter(dependencies=[Depends(require_auth)])


async def build_rekap() -> Rekap:
    kecs = await db.kecamatan.find({}, {"_id": 0}).sort("urutan", 1).to_list(100)
    desas = await db.desa.find({}, {"_id": 0}).to_list(500)
    persons = await db.persons.find(
        {}, {"_id": 0, "desa_id": 1, "jenis": 1, "jumlah_anggota_kk": 1, "no_kk": 1}
    ).to_list(100000)

    desa_stats = defaultdict(lambda: {"orang": 0, "perangkat": 0, "penggiat": 0, "jiwa": 0, "kk": set()})
    kec_stats = defaultdict(lambda: {"kk": set()})
    kab_kk: set[str] = set()
    for p in persons:
        st = desa_stats[p.get("desa_id", "")]
        st["orang"] += 1
        st["jiwa"] += int(p.get("jumlah_anggota_kk") or 0)
        if p.get("jenis") == "perangkat":
            st["perangkat"] += 1
        else:
            st["penggiat"] += 1
        if p.get("no_kk"):
            st["kk"].add(p["no_kk"])
            kab_kk.add(p["no_kk"])

    desa_to_kec = {d["id"]: d.get("kecamatan_id", "") for d in desas}
    for p in persons:
        if p.get("no_kk"):
            kec_stats[desa_to_kec.get(p.get("desa_id", ""), "")]["kk"].add(p["no_kk"])

    desa_rows: dict[str, list[RekapDesa]] = defaultdict(list)
    for d in desas:
        st = desa_stats[d["id"]]
        desa_rows[d.get("kecamatan_id", "")].append(
            RekapDesa(
                id=d["id"], nama=d["nama"], perangkat=st["perangkat"], penggiat=st["penggiat"],
                total_orang=st["orang"], jiwa=st["jiwa"], kk=len(st["kk"]),
            )
        )
    for children in desa_rows.values():
        children.sort(key=lambda r: r.nama)

    kec_out: list[RekapKecamatan] = []
    tot = {"perangkat": 0, "penggiat": 0, "orang": 0, "jiwa": 0}
    for k in kecs:
        children = desa_rows.get(k["id"], [])
        ksum = RekapKecamatan(
            id=k["id"], nama=k["nama"], desa_count=len(children),
            desa_terisi=sum(1 for c in children if c.total_orang > 0),
            perangkat=sum(c.perangkat for c in children),
            penggiat=sum(c.penggiat for c in children),
            total_orang=sum(c.total_orang for c in children),
            jiwa=sum(c.jiwa for c in children),
            kk=len(kec_stats.get(k["id"], {"kk": set()})["kk"]),
            desa=children,
        )
        tot["perangkat"] += ksum.perangkat
        tot["penggiat"] += ksum.penggiat
        tot["orang"] += ksum.total_orang
        tot["jiwa"] += ksum.jiwa
        kec_out.append(ksum)

    return Rekap(
        tanggal=today_iso("Asia/Jakarta"),
        kecamatan_count=len(kecs),
        desa_count=len(desas),
        kecamatan=kec_out,
        total=RekapTotal(
            id="", nama="TOTAL KABUPATEN", perangkat=tot["perangkat"], penggiat=tot["penggiat"],
            total_orang=tot["orang"], jiwa=tot["jiwa"], kk=len(kab_kk),
        ),
    )


@router.get("/rekap", response_model=Rekap)
async def get_rekap():
    return await build_rekap()
