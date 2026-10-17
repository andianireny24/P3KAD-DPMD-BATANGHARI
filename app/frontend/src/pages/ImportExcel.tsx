import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, FileUp } from "lucide-react";
import { toast } from "sonner";
import { apiPostForm } from "@/lib/api";
import type { ImportPreview, ImportResult } from "@/lib/types";
import { LABEL_FIELD } from "@/lib/format";
import { Button } from "@/components/ui/button";
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
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const FIELDS = ["nama", "nik", "no_kk", "jabatan", "desa", "kecamatan", "jenis", "jumlah_anggota_kk"];

export default function ImportExcel() {
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [jenisDefault, setJenisDefault] = useState("perangkat");
  const [result, setResult] = useState<ImportResult | null>(null);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["persons"] });
    queryClient.invalidateQueries({ queryKey: ["rekap"] });
    queryClient.invalidateQueries({ queryKey: ["wilayah"] });
    queryClient.invalidateQueries({ queryKey: ["alokasi-hitung"] });
  };

  const previewMutation = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error("no-file");
      const fd = new FormData();
      fd.append("file", file);
      return apiPostForm<ImportPreview>("/import/preview", fd);
    },
    onSuccess: (data) => {
      setPreview(data);
      setResult(null);
      setMapping(data.suggested);
      toast.success(`File terbaca: ${data.row_count} baris data`);
    },
    onError: () => toast.error("File tidak terbaca. Simpan sebagai .xlsx lalu coba lagi."),
  });

  const commitMutation = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error("no-file");
      const fd = new FormData();
      fd.append("file", file);
      fd.append(
        "mapping",
        JSON.stringify(
          Object.fromEntries(Object.entries(mapping).filter(([, h]) => h !== "__skip__")),
        ),
      );
      fd.append("jenis_default", jenisDefault);
      return apiPostForm<ImportResult>("/import/commit", fd);
    },
    onSuccess: (data) => {
      setResult(data);
      invalidate();
      toast.success(`${data.inserted} data berhasil diimpor`);
    },
    onError: () => toast.error("Impor gagal — periksa pemetaan kolom"),
  });

  const busy = previewMutation.isPending || commitMutation.isPending;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-3xl font-semibold tracking-tight text-slate-900">
          Impor Excel
        </h1>
        <p className="text-sm text-slate-500">
          Unggah Excel lama Anda — kolom dipetakan otomatis, tinggal diperiksa lalu diimpor.
        </p>
      </div>

      <div className="rounded-xl border-2 border-dashed border-emerald-300 bg-emerald-50/50 p-8 text-center">
        <FileUp className="mx-auto h-10 w-10 text-emerald-700" />
        <p className="mt-3 text-sm text-slate-600">
          Pilih file .xlsx (sheet aktif yang dibaca) — misal rekap perangkat/penggiat tahun lalu.
        </p>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
          <Input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xlsm"
            onChange={(e) => {
              setFile(e.target.files?.[0] ?? null);
              setPreview(null);
              setResult(null);
            }}
            className="max-w-sm bg-white"
            data-testid="import-file-input"
          />
          <Button
            onClick={() => previewMutation.mutate()}
            disabled={!file || busy}
            data-testid="btn-preview-import"
          >
            {previewMutation.isPending ? "Membaca…" : "Baca File"}
          </Button>
        </div>
      </div>

      {preview ? (
        <div className="space-y-6">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
            <h2 className="font-heading text-lg font-semibold tracking-tight text-slate-900">
              Pemetaan Kolom
            </h2>
            <p className="mb-4 text-xs text-slate-500">
              {preview.row_count} baris data terdeteksi. Kolom disarankan otomatis — ubah bila
              kurang tepat.
            </p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {FIELDS.map((f) => (
                <div key={f} className="space-y-1">
                  <Label>{LABEL_FIELD[f]}</Label>
                  <Select
                    value={mapping[f] ?? "__skip__"}
                    onValueChange={(v) => setMapping((m) => ({ ...m, [f]: v }))}
                  >
                    <SelectTrigger data-testid={`mapping-select-${f}`}>
                      <SelectValue>{(v: string) => (v === "__skip__" ? "— lewati —" : v)}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__skip__">— lewati —</SelectItem>
                      {preview.headers.map((h) => (
                        <SelectItem key={h} value={h}>
                          {h || "(kolom kosong)"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
              <div className="space-y-1">
                <Label>Jenis bila kolom jenis kosong</Label>
                <Select value={jenisDefault} onValueChange={(v) => setJenisDefault(v)}>
                  <SelectTrigger data-testid="import-jenis-default">
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
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
            <div className="border-b border-slate-100 px-5 py-3">
              <h3 className="font-heading text-sm font-semibold text-slate-700">
                Pratinjau 5 baris pertama
              </h3>
            </div>
            <Table data-testid="import-sample-table">
              <TableHeader>
                <TableRow className="bg-slate-100">
                  {preview.headers.map((h, i) => (
                    <TableHead key={i}>{h || `Kolom ${i + 1}`}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {preview.sample.map((row, i) => (
                  <TableRow key={i}>
                    {preview.headers.map((_, j) => (
                      <TableCell key={j} className="whitespace-nowrap font-mono text-xs">
                        {row[j] ?? ""}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              size="lg"
              onClick={() => commitMutation.mutate()}
              disabled={busy}
              data-testid="btn-commit-import"
            >
              {commitMutation.isPending ? "Mengimpor…" : `Impor ${preview.row_count} Baris Data`}
            </Button>
            <p className="text-xs text-slate-500">
              Desa/kecamatan yang belum ada akan dibuat otomatis dari isi kolom.
            </p>
          </div>
        </div>
      ) : null}

      {result ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5" data-testid="import-result">
          <p className="flex items-center gap-2 font-heading text-lg font-semibold text-emerald-800">
            <CheckCircle2 className="h-5 w-5" /> Impor Selesai
          </p>
          <div className="mt-3 grid gap-2 text-sm text-emerald-900 sm:grid-cols-4">
            <span>
              Masuk: <b data-testid="result-inserted">{result.inserted}</b>
            </span>
            <span>
              Dilewati: <b>{result.skipped}</b>
            </span>
            <span>
              Kecamatan baru: <b>{result.created_kecamatan}</b>
            </span>
            <span>
              Desa baru: <b>{result.created_desa}</b>
            </span>
          </div>
          {result.errors.length > 0 ? (
            <ul className="mt-3 list-disc space-y-1 pl-5 text-xs text-amber-800">
              {result.errors.map((e, i) => (
                <li key={i}>{e}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
