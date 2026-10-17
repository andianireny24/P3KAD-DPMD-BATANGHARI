import { useState } from "react";
import type { FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MapPin, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/api";
import type { Desa, Kecamatan, Wilayah } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type KecDialog = { open: boolean; editing: Kecamatan | null; nama: string };
type DesaDialog = { open: boolean; kecId: string; editing: Desa | null; nama: string };

export default function Wilayah() {
  const queryClient = useQueryClient();
  const [kecDialog, setKecDialog] = useState<KecDialog>({ open: false, editing: null, nama: "" });
  const [desaDialog, setDesaDialog] = useState<DesaDialog>({
    open: false,
    kecId: "",
    editing: null,
    nama: "",
  });

  const wilayah = useQuery({ queryKey: ["wilayah"], queryFn: () => apiGet<Wilayah>("/wilayah") });
  const kecs = wilayah.data?.kecamatan ?? [];

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["wilayah"] });
    queryClient.invalidateQueries({ queryKey: ["rekap"] });
  };

  const saveKec = useMutation({
    mutationFn: async () =>
      kecDialog.editing
        ? apiPatch(`/wilayah/kecamatan/${kecDialog.editing.id}`, { nama: kecDialog.nama })
        : apiPost("/wilayah/kecamatan", { nama: kecDialog.nama }),
    onSuccess: () => {
      toast.success("Kecamatan disimpan");
      setKecDialog({ open: false, editing: null, nama: "" });
      invalidate();
    },
    onError: () => toast.error("Gagal menyimpan kecamatan"),
  });
  const deleteKec = useMutation({
    mutationFn: (id: string) => apiDelete(`/wilayah/kecamatan/${id}`),
    onSuccess: () => {
      toast.success("Kecamatan dihapus");
      invalidate();
    },
    onError: () => toast.error("Gagal menghapus — kecamatan masih berisi desa"),
  });

  const saveDesa = useMutation({
    mutationFn: async () =>
      desaDialog.editing
        ? apiPatch(`/wilayah/desa/${desaDialog.editing.id}`, { nama: desaDialog.nama })
        : apiPost("/wilayah/desa", { kecamatan_id: desaDialog.kecId, nama: desaDialog.nama }),
    onSuccess: () => {
      toast.success("Desa disimpan");
      setDesaDialog({ open: false, kecId: "", editing: null, nama: "" });
      invalidate();
    },
    onError: () => toast.error("Gagal menyimpan desa"),
  });
  const deleteDesa = useMutation({
    mutationFn: (id: string) => apiDelete(`/wilayah/desa/${id}`),
    onSuccess: () => {
      toast.success("Desa dihapus");
      invalidate();
    },
    onError: () => toast.error("Gagal menghapus — masih ada data orang di desa ini"),
  });

  const submitKec = (e: FormEvent) => {
    e.preventDefault();
    if (!kecDialog.nama.trim()) return;
    saveKec.mutate();
  };
  const submitDesa = (e: FormEvent) => {
    e.preventDefault();
    if (!desaDialog.nama.trim()) return;
    saveDesa.mutate();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-semibold tracking-tight text-slate-900">
            Wilayah
          </h1>
          <p className="text-sm text-slate-500">
            Master data 8 kecamatan dan 110 desa — bisa ditambah, diubah, dihapus.
          </p>
        </div>
        <Button
          onClick={() => setKecDialog({ open: true, editing: null, nama: "" })}
          data-testid="btn-add-kecamatan"
        >
          <Plus className="h-4 w-4" /> Tambah Kecamatan
        </Button>
      </div>

      {wilayah.isLoading ? (
        <p className="py-10 text-center text-sm text-slate-500">Memuat wilayah…</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {kecs.map((k) => (
            <div
              key={k.id}
              className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs"
              data-testid="kecamatan-card"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="flex items-center gap-2 font-heading text-lg font-semibold tracking-tight text-slate-900">
                  <MapPin className="h-4 w-4 text-emerald-700" /> {k.nama}
                </p>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => setKecDialog({ open: true, editing: k, nama: k.nama })}
                    data-testid="btn-edit-kecamatan"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="text-rose-700 hover:bg-rose-50 hover:text-rose-800"
                    onClick={() => {
                      if (confirm(`Hapus kecamatan ${k.nama}?`)) deleteKec.mutate(k.id);
                    }}
                    data-testid="btn-delete-kecamatan"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <ul className="mt-3 divide-y divide-slate-100 text-sm" data-testid="desa-list">
                {k.desa.map((d) => (
                  <li key={d.id} className="flex items-center justify-between py-1.5">
                    <span className="text-slate-700">{d.nama}</span>
                    <span className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={() =>
                          setDesaDialog({ open: true, kecId: k.id, editing: d, nama: d.nama })
                        }
                        data-testid="btn-edit-desa"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        className="text-rose-700 hover:bg-rose-50 hover:text-rose-800"
                        onClick={() => {
                          if (confirm(`Hapus desa ${d.nama}?`)) deleteDesa.mutate(d.id);
                        }}
                        data-testid="btn-delete-desa"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </span>
                  </li>
                ))}
              </ul>
              <Button
                variant="outline"
                size="sm"
                className="mt-3 w-full"
                onClick={() =>
                  setDesaDialog({ open: true, kecId: k.id, editing: null, nama: "" })
                }
                data-testid="btn-add-desa"
              >
                <Plus className="h-4 w-4" /> Tambah Desa
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Dialog kecamatan */}
      {kecDialog.open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <form
            onSubmit={submitKec}
            className="w-full max-w-sm space-y-4 rounded-xl bg-white p-6 shadow-lg"
            data-testid="kecamatan-dialog"
          >
            <h3 className="font-heading text-lg font-semibold text-slate-900">
              {kecDialog.editing ? "Edit Kecamatan" : "Tambah Kecamatan"}
            </h3>
            <div className="space-y-1">
              <Label htmlFor="kec-nama">Nama Kecamatan</Label>
              <Input
                id="kec-nama"
                value={kecDialog.nama}
                onChange={(e) => setKecDialog({ ...kecDialog, nama: e.target.value })}
                required
                data-testid="kecamatan-nama-input"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setKecDialog({ open: false, editing: null, nama: "" })}
              >
                Batal
              </Button>
              <Button type="submit" disabled={saveKec.isPending} data-testid="btn-save-kecamatan">
                Simpan
              </Button>
            </div>
          </form>
        </div>
      ) : null}

      {/* Dialog desa */}
      {desaDialog.open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <form
            onSubmit={submitDesa}
            className="w-full max-w-sm space-y-4 rounded-xl bg-white p-6 shadow-lg"
            data-testid="desa-dialog"
          >
            <h3 className="font-heading text-lg font-semibold text-slate-900">
              {desaDialog.editing ? "Edit Desa" : "Tambah Desa"}
            </h3>
            <div className="space-y-1">
              <Label htmlFor="desa-nama">Nama Desa</Label>
              <Input
                id="desa-nama"
                value={desaDialog.nama}
                onChange={(e) => setDesaDialog({ ...desaDialog, nama: e.target.value })}
                required
                data-testid="desa-nama-input"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  setDesaDialog({ open: false, kecId: "", editing: null, nama: "" })
                }
              >
                Batal
              </Button>
              <Button type="submit" disabled={saveDesa.isPending} data-testid="btn-save-desa">
                Simpan
              </Button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
