import { useState } from "react";
import type { FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { apiDelete, apiGet, apiPost, apiPut } from "@/lib/api";
import type { AnggotaKeluarga, Person, PersonInput, Wilayah } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const PAGE_SIZE = 50;

const emptyAnggota = (): AnggotaKeluarga => ({
  nama: "",
  nik: "",
  hubungan: "",
  jenis_kelamin: "",
  tgl_lahir: "",
  pendidikan: "",
});

const emptyForm = (): PersonInput => ({
  nama: "",
  nik: "",
  no_kk: "",
  jenis: "perangkat",
  jabatan: "",
  desa_id: "",
  jumlah_anggota_kk: null,
  anggota: [],
});

const HUBUNGAN = ["Istri", "Suami", "Anak", "Faktor Lain"];

export default function Registry() {
  const queryClient = useQueryClient();
  const [filterKec, setFilterKec] = useState("all");
  const [filterDesa, setFilterDesa] = useState("all");
  const [filterJenis, setFilterJenis] = useState("all");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(0);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<PersonInput>(emptyForm());
  const [familyPerson, setFamilyPerson] = useState<Person | null>(null);

  const wilayah = useQuery({ queryKey: ["wilayah"], queryFn: () => apiGet<Wilayah>("/wilayah") });
  const persons = useQuery({
    queryKey: ["persons", filterKec, filterDesa, filterJenis, q],
    queryFn: () => {
      const p = new URLSearchParams();
      if (filterKec !== "all") p.set("kecamatan_id", filterKec);
      if (filterDesa !== "all") p.set("desa_id", filterDesa);
      if (filterJenis !== "all") p.set("jenis", filterJenis);
      if (q) p.set("q", q);
      const s = p.toString();
      return apiGet<Person[]>(`/persons${s ? `?${s}` : ""}`);
    },
  });

  const kecs = wilayah.data?.kecamatan ?? [];
  const kecLabels: Record<string, string> = {};
  const desaLabels: Record<string, string> = {};
  for (const k of kecs) {
    kecLabels[k.id] = k.nama;
    for (const d of k.desa) desaLabels[d.id] = `${d.nama} — ${k.nama}`;
  }

  const list = persons.data ?? [];
  const pageCount = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const rows = list.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);
  const totPerangkat = list.filter((p) => p.jenis === "perangkat").length;
  const totPenggiat = list.length - totPerangkat;
  const totJiwa = list.reduce((acc, p) => acc + (p.jumlah_anggota_kk || 0), 0);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["persons"] });
    queryClient.invalidateQueries({ queryKey: ["rekap"] });
    queryClient.invalidateQueries({ queryKey: ["alokasi-hitung"] });
  };

  const saveMutation = useMutation({
    mutationFn: async () =>
      editingId ? apiPut<Person>(`/persons/${editingId}`, form) : apiPost<Person>("/persons", form),
    onSuccess: () => {
      toast.success(editingId ? "Data berhasil diperbarui" : "Data berhasil ditambahkan");
      setOpen(false);
      invalidate();
    },
    onError: () => toast.error("Gagal menyimpan data"),
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiDelete(`/persons/${id}`),
    onSuccess: () => {
      toast.success("Data dihapus");
      invalidate();
    },
    onError: () => toast.error("Gagal menghapus data"),
  });

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm());
    setOpen(true);
  };
  const openEdit = (p: Person) => {
    setEditingId(p.id);
    setForm({
      nama: p.nama,
      nik: p.nik,
      no_kk: p.no_kk,
      jenis: p.jenis,
      jabatan: p.jabatan,
      desa_id: p.desa_id,
      jumlah_anggota_kk: p.anggota.length ? null : p.jumlah_anggota_kk,
      anggota: p.anggota.map((a) => ({ ...a })),
    });
    setOpen(true);
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!form.nama.trim() || !form.desa_id) {
      toast.error("Nama dan Desa wajib diisi");
      return;
    }
    saveMutation.mutate();
  };

  const setAnggota = (i: number, patch: Partial<AnggotaKeluarga>) => {
    setForm((f) => ({
      ...f,
      anggota: f.anggota.map((a, j) => (j === i ? { ...a, ...patch } : a)),
    }));
  };

  const autoJumlah =
    form.anggota.length > 0
      ? String(1 + form.anggota.length)
      : form.jumlah_anggota_kk != null
        ? String(form.jumlah_anggota_kk)
        : "";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-semibold tracking-tight text-slate-900">
            Data Perangkat &amp; Penggiat Desa
          </h1>
          <p className="text-sm text-slate-500">
            No, Nama, NIK, No. KK, jabatan, dan jumlah anggota per KK — dipisah per desa.
          </p>
        </div>
        <Button onClick={openCreate} data-testid="btn-add-person">
          <Plus className="h-4 w-4" /> Tambah Data
        </Button>
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
        <div className="min-w-52 flex-1 space-y-1">
          <Label htmlFor="search">Cari nama</Label>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              id="search"
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(0);
              }}
              placeholder="Ketik nama…"
              className="pl-8"
              data-testid="person-search-input"
            />
          </div>
        </div>
        <div className="space-y-1">
          <Label>Kecamatan</Label>
          <Select
            value={filterKec}
            onValueChange={(v) => {
              setFilterKec(v);
              setFilterDesa("all");
              setPage(0);
            }}
          >
            <SelectTrigger className="w-48" data-testid="filter-kecamatan">
              <SelectValue>{(v: string) => kecLabels[v] ?? "Semua Kecamatan"}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Kecamatan</SelectItem>
              {kecs.map((k) => (
                <SelectItem key={k.id} value={k.id}>
                  {k.nama}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>Desa</Label>
          <Select
            value={filterDesa}
            onValueChange={(v) => {
              setFilterDesa(v);
              setPage(0);
            }}
          >
            <SelectTrigger className="w-56" data-testid="filter-desa">
              <SelectValue>{(v: string) => desaLabels[v] ?? "Semua Desa"}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Desa</SelectItem>
              {kecs
                .filter((k) => filterKec === "all" || k.id === filterKec)
                .flatMap((k) =>
                  k.desa.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.nama} — {k.nama}
                    </SelectItem>
                  )),
                )}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>Jenis</Label>
          <Select
            value={filterJenis}
            onValueChange={(v) => {
              setFilterJenis(v);
              setPage(0);
            }}
          >
            <SelectTrigger className="w-40" data-testid="filter-jenis">
              <SelectValue>
                {(v: string) =>
                  v === "perangkat" ? "Perangkat" : v === "penggiat" ? "Penggiat" : "Semua"
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua</SelectItem>
              <SelectItem value="perangkat">Perangkat</SelectItem>
              <SelectItem value="penggiat">Penggiat</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        <Table data-testid="person-table">
          <TableHeader>
            <TableRow className="bg-slate-100">
              <TableHead className="w-12">No</TableHead>
              <TableHead>Nama</TableHead>
              <TableHead>NIK</TableHead>
              <TableHead>No. KK</TableHead>
              <TableHead>Jenis</TableHead>
              <TableHead>Jabatan</TableHead>
              <TableHead>Desa</TableHead>
              <TableHead className="text-right">Anggota KK</TableHead>
              <TableHead className="w-28 text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {persons.isLoading ? (
              <TableRow>
                <TableCell colSpan={9} className="py-10 text-center text-sm text-slate-500">
                  Memuat data…
                </TableCell>
              </TableRow>
            ) : persons.error ? (
              <TableRow>
                <TableCell colSpan={9} className="py-10 text-center text-sm text-slate-500">
                  Gagal memuat data — coba muat ulang.
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="py-10 text-center text-sm text-slate-500">
                  Belum ada data. Klik “Tambah Data” atau impor Excel lama Anda di menu Impor Excel.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((p, i) => (
                <TableRow key={p.id} className="hover:bg-slate-50" data-testid="person-row">
                  <TableCell className="font-mono text-xs text-slate-500">
                    {safePage * PAGE_SIZE + i + 1}
                  </TableCell>
                  <TableCell className="font-medium text-slate-900">{p.nama}</TableCell>
                  <TableCell className="font-mono text-xs">{p.nik}</TableCell>
                  <TableCell className="font-mono text-xs">{p.no_kk}</TableCell>
                  <TableCell>
                    <Badge
                      className={
                        p.jenis === "perangkat"
                          ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-100"
                          : "bg-blue-100 text-blue-800 hover:bg-blue-100"
                      }
                    >
                      {p.jenis === "perangkat" ? "Perangkat" : "Penggiat"}
                    </Badge>
                  </TableCell>
                  <TableCell>{p.jabatan}</TableCell>
                  <TableCell>
                    <span className="font-medium">{p.desa_nama}</span>
                    <span className="block text-xs text-slate-500">{p.kecamatan_nama}</span>
                  </TableCell>
                  <TableCell className="text-right font-mono">{p.jumlah_anggota_kk}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        title="Lihat anggota keluarga"
                        onClick={() => setFamilyPerson(p)}
                        data-testid="btn-family"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        title="Edit"
                        onClick={() => openEdit(p)}
                        data-testid="btn-edit-person"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        title="Hapus"
                        className="text-rose-700 hover:bg-rose-50 hover:text-rose-800"
                        onClick={() => {
                          if (confirm(`Hapus data ${p.nama}?`)) deleteMutation.mutate(p.id);
                        }}
                        data-testid="btn-delete-person"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
          {rows.length > 0 ? (
            <TableFooter>
              <TableRow className="bg-emerald-50 font-semibold">
                <TableCell colSpan={5}>JUMLAH ({list.length} orang)</TableCell>
                <TableCell colSpan={2} className="text-right">
                  Perangkat {totPerangkat} · Penggiat {totPenggiat}
                </TableCell>
                <TableCell className="text-right font-mono" data-testid="persons-total-jiwa">
                  {totJiwa}
                </TableCell>
                <TableCell />
              </TableRow>
            </TableFooter>
          ) : null}
        </Table>
        {pageCount > 1 ? (
          <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3">
            <p className="text-xs text-slate-500">
              Halaman {safePage + 1} dari {pageCount}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={safePage === 0}
                onClick={() => setPage(safePage - 1)}
                data-testid="btn-prev-page"
              >
                Sebelumnya
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={safePage >= pageCount - 1}
                onClick={() => setPage(safePage + 1)}
                data-testid="btn-next-page"
              >
                Berikutnya
              </Button>
            </div>
          </div>
        ) : null}
      </div>

      {/* Form tambah/edit */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle data-testid="person-form-title">
              {editingId ? "Edit Data Perangkat/Penggiat" : "Tambah Data Perangkat/Penggiat"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={submit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="f-nama">Nama *</Label>
                <Input
                  id="f-nama"
                  value={form.nama}
                  onChange={(e) => setForm({ ...form, nama: e.target.value })}
                  required
                  data-testid="form-nama"
                />
              </div>
              <div className="space-y-1">
                <Label>Jenis *</Label>
                <Select
                  value={form.jenis}
                  onValueChange={(v) => setForm({ ...form, jenis: v as PersonInput["jenis"] })}
                >
                  <SelectTrigger data-testid="form-jenis">
                    <SelectValue>
                      {(v: string) => (v === "penggiat" ? "Penggiat Desa" : "Perangkat Desa")}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="perangkat">Perangkat Desa</SelectItem>
                    <SelectItem value="penggiat">Penggiat Desa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="f-jabatan">Jabatan</Label>
                <Input
                  id="f-jabatan"
                  value={form.jabatan}
                  onChange={(e) => setForm({ ...form, jabatan: e.target.value })}
                  placeholder="cth: Kepala Desa, Kaur Keuangan, Kader Posyandu"
                  data-testid="form-jabatan"
                />
              </div>
              <div className="space-y-1">
                <Label>Desa *</Label>
                <Select value={form.desa_id} onValueChange={(v) => setForm({ ...form, desa_id: v })}>
                  <SelectTrigger data-testid="form-desa">
                    <SelectValue>{(v: string) => desaLabels[v] ?? "Pilih desa"}</SelectValue>
                  </SelectTrigger>
                  <SelectContent className="max-h-72">
                    {kecs.map((k) =>
                      k.desa.map((d) => (
                        <SelectItem key={d.id} value={d.id}>
                          {d.nama} — {k.nama}
                        </SelectItem>
                      )),
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="f-nik">NIK</Label>
                <Input
                  id="f-nik"
                  value={form.nik}
                  onChange={(e) => setForm({ ...form, nik: e.target.value })}
                  inputMode="numeric"
                  className="font-mono"
                  data-testid="form-nik"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="f-kk">No. Kartu Keluarga</Label>
                <Input
                  id="f-kk"
                  value={form.no_kk}
                  onChange={(e) => setForm({ ...form, no_kk: e.target.value })}
                  inputMode="numeric"
                  className="font-mono"
                  data-testid="form-no-kk"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="f-jumlah">Jumlah Anggota per KK</Label>
                <Input
                  id="f-jumlah"
                  value={autoJumlah}
                  onChange={(e) =>
                    setForm({ ...form, jumlah_anggota_kk: parseInt(e.target.value) || null })
                  }
                  disabled={form.anggota.length > 0}
                  inputMode="numeric"
                  className="font-mono"
                  data-testid="form-jumlah-anggota"
                />
                <p className="text-xs text-slate-500">
                  {form.anggota.length > 0
                    ? "Otomatis: 1 + jumlah anggota keluarga di bawah"
                    : "Isi manual bila tidak merinci anggota keluarga"}
                </p>
              </div>
            </div>

            <div className="space-y-2 rounded-lg border border-slate-200 p-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-700">
                  Anggota Keluarga ({form.anggota.length})
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setForm({ ...form, anggota: [...form.anggota, emptyAnggota()] })}
                  data-testid="form-anggota-add"
                >
                  <Plus className="h-4 w-4" /> Tambah Anggota
                </Button>
              </div>
              {form.anggota.map((a, i) => (
                <div key={i} className="grid gap-2 rounded-md border border-slate-100 p-2 sm:grid-cols-12">
                  <Input
                    value={a.nama}
                    onChange={(e) => setAnggota(i, { nama: e.target.value })}
                    placeholder="Nama anggota"
                    className="sm:col-span-3"
                    data-testid="anggota-nama"
                  />
                  <Input
                    value={a.nik}
                    onChange={(e) => setAnggota(i, { nik: e.target.value })}
                    placeholder="NIK"
                    inputMode="numeric"
                    className="sm:col-span-3 font-mono"
                    data-testid="anggota-nik"
                  />
                  <Select
                    value={a.hubungan || "__x"}
                    onValueChange={(v) => setAnggota(i, { hubungan: v === "__x" ? "" : v })}
                  >
                    <SelectTrigger className="sm:col-span-2" data-testid="anggota-hubungan">
                      <SelectValue>{(v: string) => (v === "__x" ? "Hubungan" : v)}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__x">Hubungan</SelectItem>
                      {HUBUNGAN.map((h) => (
                        <SelectItem key={h} value={h}>
                          {h}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={a.jenis_kelamin || "__x"}
                    onValueChange={(v) =>
                      setAnggota(i, { jenis_kelamin: v === "__x" ? "" : v })
                    }
                  >
                    <SelectTrigger className="sm:col-span-2" data-testid="anggota-jk">
                      <SelectValue>
                        {(v: string) => (v === "__x" ? "J. Kelamin" : v)}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__x">J. Kelamin</SelectItem>
                      <SelectItem value="Laki-laki">Laki-laki</SelectItem>
                      <SelectItem value="Perempuan">Perempuan</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="text-rose-700"
                    onClick={() =>
                      setForm({ ...form, anggota: form.anggota.filter((_, j) => j !== i) })
                    }
                    data-testid="anggota-remove"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  <Input
                    type="date"
                    value={a.tgl_lahir}
                    onChange={(e) => setAnggota(i, { tgl_lahir: e.target.value })}
                    className="sm:col-span-3"
                    title="Tanggal lahir"
                    data-testid="anggota-tgl-lahir"
                  />
                  <Input
                    value={a.pendidikan}
                    onChange={(e) => setAnggota(i, { pendidikan: e.target.value })}
                    placeholder="Pendidikan (cth: S1, SMA)"
                    className="sm:col-span-3"
                    data-testid="anggota-pendidikan"
                  />
                </div>
              ))}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Batal
              </Button>
              <Button type="submit" disabled={saveMutation.isPending} data-testid="btn-save-person">
                {saveMutation.isPending ? "Menyimpan…" : "Simpan"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog anggota keluarga */}
      <Dialog open={familyPerson !== null} onOpenChange={(o) => !o && setFamilyPerson(null)}>
        <DialogContent className="sm:max-w-2xl" data-testid="family-dialog">
          <DialogHeader>
            <DialogTitle>Anggota Keluarga — {familyPerson?.nama}</DialogTitle>
          </DialogHeader>
          {familyPerson ? (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-4 rounded-lg bg-slate-50 p-3 text-sm">
                <span>
                  <span className="text-slate-500">NIK: </span>
                  <span className="font-mono">{familyPerson.nik || "—"}</span>
                </span>
                <span>
                  <span className="text-slate-500">No. KK: </span>
                  <span className="font-mono">{familyPerson.no_kk || "—"}</span>
                </span>
                <span>
                  <span className="text-slate-500">Desa: </span>
                  {familyPerson.desa_nama}
                </span>
                <span>
                  <span className="text-slate-500">Jumlah Anggota KK: </span>
                  <span className="font-semibold">{familyPerson.jumlah_anggota_kk}</span>
                </span>
              </div>
              {familyPerson.anggota.length === 0 ? (
                <p className="py-6 text-center text-sm text-slate-500">
                  Belum ada rincian anggota keluarga untuk data ini.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-100">
                      <TableHead className="w-10">No</TableHead>
                      <TableHead>Nama</TableHead>
                      <TableHead>NIK</TableHead>
                      <TableHead>Hubungan</TableHead>
                      <TableHead>J. Kelamin</TableHead>
                      <TableHead>Tgl Lahir</TableHead>
                      <TableHead>Pendidikan</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {familyPerson.anggota.map((a, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-mono text-xs text-slate-500">{i + 1}</TableCell>
                        <TableCell>{a.nama}</TableCell>
                        <TableCell className="font-mono text-xs">{a.nik}</TableCell>
                        <TableCell>{a.hubungan}</TableCell>
                        <TableCell>{a.jenis_kelamin}</TableCell>
                        <TableCell className="font-mono text-xs">{a.tgl_lahir}</TableCell>
                        <TableCell>{a.pendidikan}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
