import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { FileSpreadsheet, Printer, Table2, Upload } from "lucide-react";
import { toast } from "sonner";
import { apiDownload, apiGet } from "@/lib/api";
import type { AlokasiHitung, Rekap } from "@/lib/types";
import { formatAngka, formatRupiah } from "@/lib/format";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function Kpi({
  label,
  value,
  sub,
  testid,
}: {
  label: string;
  value: string;
  sub?: string;
  testid: string;
}) {
  return (
    <div
      data-testid={testid}
      className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
    >
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</p>
      <p className="mt-1 font-heading text-3xl font-semibold tracking-tight text-emerald-800">
        {value}
      </p>
      {sub ? <p className="mt-1 text-xs text-slate-500">{sub}</p> : null}
    </div>
  );
}

export default function Dashboard() {
  const [downloading, setDownloading] = useState(false);
  const rekap = useQuery({ queryKey: ["rekap"], queryFn: () => apiGet<Rekap>("/rekap") });
  const hitung = useQuery({
    queryKey: ["alokasi-hitung", "all"],
    queryFn: () => apiGet<AlokasiHitung>("/alokasi/hitung"),
  });

  const download = async () => {
    setDownloading(true);
    try {
      await apiDownload("/export/excel", "rekap_perangkat_penggiat_batanghari.xlsx");
      toast.success("File Excel terunduh");
    } catch {
      toast.error("Gagal mengunduh Excel");
    } finally {
      setDownloading(false);
    }
  };

  const r = rekap.data;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-semibold tracking-tight text-slate-900">
            Beranda
          </h1>
          <p className="text-sm text-slate-500">
            Rekap data perangkat &amp; penggiat desa —{" "}
            {r ? `per ${r.tanggal}` : "memuat tanggal data…"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            to="/perangkat-penggiat"
            className={buttonVariants({ variant: "outline" })}
            data-testid="btn-quick-input"
          >
            <Table2 className="h-4 w-4" /> Input Data
          </Link>
          <Link
            to="/impor"
            className={buttonVariants({ variant: "outline" })}
            data-testid="btn-quick-import"
          >
            <Upload className="h-4 w-4" /> Impor Excel
          </Link>
          <Button
            variant="outline"
            onClick={download}
            disabled={downloading}
            data-testid="btn-quick-export"
          >
            <FileSpreadsheet className="h-4 w-4" /> {downloading ? "Mengunduh…" : "Unduh Excel"}
          </Button>
          <Link to="/cetak" className={buttonVariants()} data-testid="btn-quick-print">
            <Printer className="h-4 w-4" /> Cetak Laporan
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 md:gap-6">
        <Kpi
          label="Kecamatan"
          value={r ? formatAngka(r.kecamatan_count) : "—"}
          testid="kpi-total-kecamatan"
        />
        <Kpi label="Desa" value={r ? formatAngka(r.desa_count) : "—"} testid="kpi-total-desa" />
        <Kpi
          label="Perangkat Desa"
          value={r ? formatAngka(r.total.perangkat) : "—"}
          testid="kpi-total-perangkat"
        />
        <Kpi
          label="Penggiat Desa"
          value={r ? formatAngka(r.total.penggiat) : "—"}
          testid="kpi-total-penggiat"
        />
        <Kpi
          label="Anggota KK (Jiwa)"
          value={r ? formatAngka(r.total.jiwa) : "—"}
          sub="Termasuk yang bersangkutan"
          testid="kpi-total-jiwa"
        />
        <Kpi label="Kartu Keluarga" value={r ? formatAngka(r.total.kk) : "—"} testid="kpi-total-kk" />
        <Kpi
          label="Total Alokasi Dana"
          value={hitung.data ? formatRupiah(hitung.data.total) : "—"}
          sub="Kalkulator alokasi (kabupaten)"
          testid="kpi-total-alokasi"
        />
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
            Dasar Perhitungan
          </p>
          <p className="mt-1 text-sm leading-relaxed text-emerald-900">
            Semua angka KPI dihitung otomatis dari data — siap dipakai saat menghitung dasar
            alokasi dana desa.
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="font-heading text-lg font-semibold tracking-tight text-slate-900">
              Rekap per Kecamatan
            </h2>
            <p className="text-xs text-slate-500">
              Rincian lengkap per desa ada di menu Rekapitulasi
            </p>
          </div>
          <Link to="/rekapitulasi" className={buttonVariants({ variant: "ghost", size: "sm" })}>
            Lihat Semua
          </Link>
        </div>
        <Table data-testid="dashboard-rekap-table">
          <TableHeader>
            <TableRow className="bg-slate-100">
              <TableHead className="w-12">No</TableHead>
              <TableHead>Kecamatan</TableHead>
              <TableHead className="text-center">Desa Terisi</TableHead>
              <TableHead className="text-right">Perangkat</TableHead>
              <TableHead className="text-right">Penggiat</TableHead>
              <TableHead className="text-right">Total Orang</TableHead>
              <TableHead className="text-right">Anggota KK</TableHead>
              <TableHead className="text-right">KK</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rekap.isLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="py-10 text-center text-sm text-slate-500">
                  Memuat rekap…
                </TableCell>
              </TableRow>
            ) : rekap.error || !r || r.kecamatan.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="py-10 text-center text-sm text-slate-500">
                  {rekap.error
                    ? "Belum ada data rekap — coba muat ulang."
                    : "Belum ada data. Mulai dengan Impor Excel atau Input Data."}
                </TableCell>
              </TableRow>
            ) : (
              r.kecamatan.map((k, i) => (
                <TableRow key={k.id} className="hover:bg-slate-50">
                  <TableCell className="font-mono text-xs text-slate-500">{i + 1}</TableCell>
                  <TableCell className="font-medium text-slate-900">{k.nama}</TableCell>
                  <TableCell className="text-center text-slate-600">
                    {k.desa_terisi}/{k.desa_count}
                  </TableCell>
                  <TableCell className="text-right font-mono">{k.perangkat}</TableCell>
                  <TableCell className="text-right font-mono">{k.penggiat}</TableCell>
                  <TableCell className="text-right font-mono">{k.total_orang}</TableCell>
                  <TableCell className="text-right font-mono">{k.jiwa}</TableCell>
                  <TableCell className="text-right font-mono">{k.kk}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
          {r && !rekap.error ? (
            <TableFooter>
              <TableRow className="bg-emerald-50 font-semibold">
                <TableCell colSpan={2}>TOTAL KABUPATEN</TableCell>
                <TableCell className="text-center">{r.desa_count} desa</TableCell>
                <TableCell className="text-right font-mono">{r.total.perangkat}</TableCell>
                <TableCell className="text-right font-mono">{r.total.penggiat}</TableCell>
                <TableCell className="text-right font-mono">{r.total.total_orang}</TableCell>
                <TableCell className="text-right font-mono">{r.total.jiwa}</TableCell>
                <TableCell className="text-right font-mono">{r.total.kk}</TableCell>
              </TableRow>
            </TableFooter>
          ) : null}
        </Table>
      </div>
    </div>
  );
}
