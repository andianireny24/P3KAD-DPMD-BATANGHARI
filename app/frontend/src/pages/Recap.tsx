import { Fragment, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { FileSpreadsheet, Printer } from "lucide-react";
import { toast } from "sonner";
import { apiDownload, apiGet } from "@/lib/api";
import type { Rekap } from "@/lib/types";
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

export default function Recap() {
  const [downloading, setDownloading] = useState(false);
  const rekap = useQuery({ queryKey: ["rekap"], queryFn: () => apiGet<Rekap>("/rekap") });
  const r = rekap.data;

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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4 print:hidden">
        <div>
          <h1 className="font-heading text-3xl font-semibold tracking-tight text-slate-900">
            Rekapitulasi
          </h1>
          <p className="text-sm text-slate-500">
            Hierarki kabupaten → kecamatan → desa, dihitung otomatis{" "}
            {r ? `(per ${r.tanggal})` : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={download} disabled={downloading} data-testid="btn-export-excel">
            <FileSpreadsheet className="h-4 w-4" /> {downloading ? "Mengunduh…" : "Ekspor Excel"}
          </Button>
          <Link to="/cetak" className={buttonVariants()} data-testid="btn-print-report">
            <Printer className="h-4 w-4" /> Cetak / PDF
          </Link>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden print:border-none print:shadow-none">
        <Table data-testid="rekap-table">
          <TableHeader>
            <TableRow className="bg-slate-100">
              <TableHead className="w-14">No</TableHead>
              <TableHead>Wilayah</TableHead>
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
                    ? "Gagal memuat rekap — coba muat ulang."
                    : "Belum ada data wilayah/person. Mulai dari Impor Excel."}
                </TableCell>
              </TableRow>
            ) : (
              r.kecamatan.map((k, i) => (
                <Fragment key={k.id}>
                  <TableRow className="bg-slate-100 font-semibold">
                    <TableCell className="font-mono text-xs text-slate-500">{i + 1}</TableCell>
                    <TableCell className="text-slate-900">
                      {k.nama}
                    </TableCell>
                    <TableCell className="text-center">
                      {k.desa_terisi}/{k.desa_count}
                    </TableCell>
                    <TableCell className="text-right font-mono">{k.perangkat}</TableCell>
                    <TableCell className="text-right font-mono">{k.penggiat}</TableCell>
                    <TableCell className="text-right font-mono">{k.total_orang}</TableCell>
                    <TableCell className="text-right font-mono">{k.jiwa}</TableCell>
                    <TableCell className="text-right font-mono">{k.kk}</TableCell>
                  </TableRow>
                  {k.desa.map((d, i) => (
                    <TableRow key={d.id} className="hover:bg-slate-50">
                      <TableCell className="pl-8 font-mono text-xs text-slate-400">{i + 1}</TableCell>
                      <TableCell className="pl-2 text-slate-700">{d.nama}</TableCell>
                      <TableCell className="text-center text-slate-500">
                        {d.total_orang > 0 ? "✓" : ""}
                      </TableCell>
                      <TableCell className="text-right font-mono">{d.perangkat}</TableCell>
                      <TableCell className="text-right font-mono">{d.penggiat}</TableCell>
                      <TableCell className="text-right font-mono">{d.total_orang}</TableCell>
                      <TableCell className="text-right font-mono">{d.jiwa}</TableCell>
                      <TableCell className="text-right font-mono">{d.kk}</TableCell>
                    </TableRow>
                  ))}
                </Fragment>
              ))
            )}
          </TableBody>
          {r && !rekap.error && r.kecamatan.length > 0 ? (
            <TableFooter>
              <TableRow className="bg-emerald-50 font-semibold">
                <TableCell colSpan={2} data-testid="rekap-total">
                  TOTAL KABUPATEN BATANG HARI
                </TableCell>
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
