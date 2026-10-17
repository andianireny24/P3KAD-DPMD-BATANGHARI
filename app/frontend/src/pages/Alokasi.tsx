import { useState } from "react";
import type { FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Info, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { apiDelete, apiGet, apiPost, apiPut } from "@/lib/api";
import type { AlokasiHitung, AlokasiItem, AlokasiTarget, Wilayah } from "@/lib/types";
import { formatAngka, formatRupiah, LABEL_TARGET } from "@/lib/format";
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

const emptyItem = (): AlokasiItem => ({
  id: "",
  nama: "",
  target: "perangkat",
  jabatan_match: "",
  rate: 0,
  frekuensi: 12,
  qty_manual: 0,
  keterangan: "",
  urutan: 0,
});

export default function Alokasi() {
  const queryClient = useQueryClient();
  const [scopeKec, setScopeKec] = useState("all");
  const [scopeDesa, setScopeDesa] = useState("all");
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<AlokasiItem>(emptyItem());

  const wilayah = useQuery({ queryKey: ["wilayah"], queryFn: () => apiGet<Wilayah>("/wilayah") });
  const items = useQuery({ queryKey: ["alokasi"], queryFn: () => apiGet<AlokasiItem[]>("/alokasi") });
  const hitung = useQuery({
    queryKey: ["alokasi-hitung", scopeKec, scopeDesa],
    queryFn: () => {
      const p = new URLSearchParams();
      if (scopeKec !== "all") p.set("kecamatan_id", scopeKec);
      if (scopeDesa !== "all") p.set("desa_id", scopeDesa);
      const s = p.toString();
      return apiGet<AlokasiHitung>(`/alokasi/hitung${s ? `?${s}` : ""}`);
    },
  });

  const kecs = wilayah.data?.kecamatan ?? [];
  const kecLabels: Record<string, string> = {};
  const desaLabels: Record<string, string> = {};
  for (const k of kecs) {
    kecLabels[k.id] = k.nama;
    for (const d of k.desa) desaLabels[d.id] = `${d.nama} — ${k.nama}`;
  }

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["alokasi"] });
    queryClient.invalidateQueries({ queryKey: ["alokasi-hitung"] });
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const body = { ...form };
      delete (body as { id?: string }).id;
      delete (body as { urutan?: number }).urutan;
      return editingId ? apiPut<AlokasiItem>(`/alokasi/${editingId}`, body) : apiPost<AlokasiItem>("/alokasi", body);
    },
    onSuccess: () => {
      toast.success("Item alokasi disimpan");
      setOpen(false);
      invalidate();
    },
    onError: () => toast.error("Gagal menyimpan item"),
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiDelete(`/alokasi/${id}`),
    onSuccess: () => {
      toast.success("Item dihapus");
      invalidate();
    },
    onError: () => toast.error("Gagal menghapus item"),
  });

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyItem());
    setOpen(true);
  };
  const openEdit = (id: string) => {
    const it = (items.data ?? []).find((x) => x.id === id);
    if (!it) return;
    setEditingId(id);
    setForm({ ...it });
    setOpen(true);
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!form.nama.trim()) {
      toast.error("Nama item wajib diisi");
      return;
    }
    saveMutation.mutate();
  };

  const hit = hitung.data;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-semibold tracking-tight text-slate-900">
            Kalkulator Alokasi Dana Desa
          </h1>
          <p className="text-sm text-slate-500">
            Tabel terhubung: jumlah (qty) diambil otomatis dari data perangkat &amp; penggiat.
          </p>
        </div>
        <Button onClick={openCreate} data-testid="btn-add-item">
          <Plus className="h-4 w-4" /> Tambah Item
        </Button>
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
        <div className="space-y-1">
          <Label>Wilayah Hitung</Label>
          <Select
            value={scopeKec}
            onValueChange={(v) => {
              setScopeKec(v);
              setScopeDesa("all");
            }}
          >
            <SelectTrigger className="w-52" data-testid="alokasi-scope-kecamatan">
              <SelectValue>{(v: string) => kecLabels[v] ?? "Seluruh Kabupaten"}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Seluruh Kabupaten</SelectItem>
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
          <Select value={scopeDesa} onValueChange={(v) => setScopeDesa(v)}>
            <SelectTrigger className="w-56" data-testid="alokasi-scope-desa">
              <SelectValue>{(v: string) => desaLabels[v] ?? "Semua Desa"}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Desa</SelectItem>
              {kecs
                .filter((k) => scopeKec === "all" || k.id === scopeKec)
                .flatMap((k) =>
                  k.desa.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.nama}
                    </SelectItem>
                  )),
                )}
            </SelectContent>
          </Select>
        </div>
        <p className="ml-auto flex max-w-sm items-start gap-2 text-xs text-slate-500">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          BNBA dari Excel terpisah: tambahkan sebagai item “Nominal Tetap”, lalu isi angkanya
          di kolom Jumlah (Qty).
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        <Table data-testid="alokasi-table">
          <TableHeader>
            <TableRow className="bg-slate-100">
              <TableHead className="w-12">No</TableHead>
              <TableHead>Nama Item</TableHead>
              <TableHead>Dasar Hitung</TableHead>
              <TableHead className="text-right">Jumlah (Qty)</TableHead>
              <TableHead className="text-right">Tarif (Rp)</TableHead>
              <TableHead className="text-right">Frekuensi</TableHead>
              <TableHead className="text-right">Jumlah (Rp)</TableHead>
              <TableHead className="w-24 text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {hitung.isLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="py-10 text-center text-sm text-slate-500">
                  Menghitung…
                </TableCell>
              </TableRow>
            ) : hitung.error || !hit || hit.items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="py-10 text-center text-sm text-slate-500">
                  {hitung.error
                    ? "Gagal menghitung — coba muat ulang."
                    : "Belum ada item. Klik “Tambah Item” untuk menyusun dasar hitung alokasi."}
                </TableCell>
              </TableRow>
            ) : (
              hit.items.map((it, i) => (
                <TableRow key={it.id} className="hover:bg-slate-50" data-testid="alokasi-row">
                  <TableCell className="font-mono text-xs text-slate-500">{i + 1}</TableCell>
                  <TableCell>
                    <span className="font-medium text-slate-900">{it.nama}</span>
                    {it.keterangan ? (
                      <span className="block text-xs text-slate-500">{it.keterangan}</span>
                    ) : null}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{LABEL_TARGET[it.target] ?? it.target}</Badge>
                  </TableCell>
                  <TableCell className="text-right font-mono" data-testid={`alokasi-qty-${it.id}`}>
                    {formatAngka(it.qty)}
                  </TableCell>
                  <TableCell className="text-right font-mono">{formatRupiah(it.rate)}</TableCell>
                  <TableCell className="text-right font-mono">{it.frekuensi}x/thn</TableCell>
                  <TableCell
                    className="text-right font-mono font-semibold text-emerald-800"
                    data-testid={`alokasi-jumlah-${it.id}`}
                  >
                    {formatRupiah(it.jumlah)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => openEdit(it.id)}
                        data-testid="btn-edit-item"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="text-rose-700 hover:bg-rose-50 hover:text-rose-800"
                        onClick={() => {
                          if (confirm(`Hapus item ${it.nama}?`)) deleteMutation.mutate(it.id);
                        }}
                        data-testid="btn-delete-item"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
          {hit && !hitung.error && hit.items.length > 0 ? (
            <TableFooter>
              <TableRow className="bg-emerald-50 font-semibold">
                <TableCell colSpan={6}>TOTAL ALOKASI</TableCell>
                <TableCell className="text-right font-mono" data-testid="alokasi-total">
                  {formatRupiah(hit.total)}
                </TableCell>
                <TableCell />
              </TableRow>
            </TableFooter>
          ) : null}
        </Table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle data-testid="alokasi-form-title">
              {editingId ? "Edit Item Alokasi" : "Tambah Item Alokasi"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="a-nama">Nama Item *</Label>
              <Input
                id="a-nama"
                value={form.nama}
                onChange={(e) => setForm({ ...form, nama: e.target.value })}
                placeholder="cth: SILTAP Kepala Desa"
                required
                data-testid="form-item-nama"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>Dasar Hitung</Label>
                <Select
                  value={form.target}
                  onValueChange={(v) => setForm({ ...form, target: v as AlokasiTarget })}
                >
                  <SelectTrigger data-testid="form-item-target">
                    <SelectValue>{(v: string) => LABEL_TARGET[v] ?? v}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(LABEL_TARGET).map(([v, label]) => (
                      <SelectItem key={v} value={v}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {form.target === "jabatan" ? (
                <div className="space-y-1">
                  <Label htmlFor="a-jabatan">Kata Kunci Jabatan</Label>
                  <Input
                    id="a-jabatan"
                    value={form.jabatan_match}
                    onChange={(e) => setForm({ ...form, jabatan_match: e.target.value })}
                    placeholder="cth: kepala desa, kades"
                    data-testid="form-item-jabatan-match"
                  />
                  <p className="text-xs text-slate-500">Pisah dengan koma.</p>
                </div>
              ) : null}
              {form.target === "tetap" ? (
                <div className="space-y-1">
                  <Label htmlFor="a-qty">Jumlah (Qty)</Label>
                  <Input
                    id="a-qty"
                    value={String(form.qty_manual)}
                    onChange={(e) =>
                      setForm({ ...form, qty_manual: Number(e.target.value) || 0 })
                    }
                    inputMode="numeric"
                    className="font-mono"
                    data-testid="form-item-qty"
                  />
                </div>
              ) : null}
              <div className="space-y-1">
                <Label htmlFor="a-rate">Tarif per Bulan (Rp)</Label>
                <Input
                  id="a-rate"
                  value={String(form.rate)}
                  onChange={(e) => setForm({ ...form, rate: Number(e.target.value) || 0 })}
                  inputMode="numeric"
                  className="font-mono"
                  data-testid="form-item-rate"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="a-frek">Frekuensi (x per tahun)</Label>
                <Input
                  id="a-frek"
                  value={String(form.frekuensi)}
                  onChange={(e) =>
                    setForm({ ...form, frekuensi: parseInt(e.target.value) || 0 })
                  }
                  inputMode="numeric"
                  className="font-mono"
                  data-testid="form-item-frekuensi"
                />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label htmlFor="a-ket">Keterangan</Label>
                <Input
                  id="a-ket"
                  value={form.keterangan}
                  onChange={(e) => setForm({ ...form, keterangan: e.target.value })}
                  data-testid="form-item-keterangan"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Batal
              </Button>
              <Button type="submit" disabled={saveMutation.isPending} data-testid="btn-save-item">
                {saveMutation.isPending ? "Menyimpan…" : "Simpan"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
