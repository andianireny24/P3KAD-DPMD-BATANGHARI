import { useQuery } from "@tanstack/react-query";
import { Printer } from "lucide-react";
import { apiGet } from "@/lib/api";
import type { Rekap } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function Print() {
  const rekap = useQuery({ queryKey: ["rekap"], queryFn: () => apiGet<Rekap>("/rekap") });
  const r = rekap.data;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 print:hidden">
        <div>
          <h1 className="font-heading text-3xl font-semibold tracking-tight text-slate-900">
            Cetak Laporan
          </h1>
          <p className="text-sm text-slate-500">
            Buka dialog cetak browser, lalu pilih “Simpan sebagai PDF”.
          </p>
        </div>
        <Button onClick={() => window.print()} data-testid="btn-print-now">
          <Printer className="h-4 w-4" /> Cetak / Simpan PDF
        </Button>
      </div>

      <div
        className="mx-auto max-w-4xl space-y-8 rounded-xl border border-slate-200 bg-white p-8 text-black shadow-xs print:max-w-none print:rounded-none print:border-none print:p-0 print:shadow-none"
        data-testid="print-report"
      >
        {/* KOP SURAT */}
        <div className="border-b-4 border-double border-black pb-3 text-center leading-tight">
          <p className="font-heading text-base font-bold uppercase tracking-wide">
            Pemerintah Kabupaten Batang Hari
          </p>
          <p className="font-heading text-xl font-bold uppercase tracking-wide">
            Dinas Pemberdayaan Masyarakat dan Desa
          </p>
          <p className="text-xs">
            Bidang Pemberdayaan Perencanaan Pengelolaan Keuangan dan Aset Desa
          </p>
          <p className="text-xs">
            Kompleks Perkantoran Pemerintah Kabupaten Batang Hari — Muara Bulian, Jambi
          </p>
        </div>

        <div className="text-center">
          <h2 className="font-heading text-base font-bold uppercase underline">
            Rekapitulasi Data Perangkat dan Penggiat Desa
          </h2>
          <p className="text-sm">Kabupaten Batang Hari — per {r?.tanggal ?? "…"}</p>
        </div>

        {/* Rekap per kecamatan */}
        <div className="print-avoid-break">
          <p className="mb-2 text-sm font-semibold">A. Rekapitulasi per Kecamatan</p>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">No</TableHead>
                <TableHead>Kecamatan</TableHead>
                <TableHead className="text-center">Jml Desa</TableHead>
                <TableHead className="text-right">Perangkat</TableHead>
                <TableHead className="text-right">Penggiat</TableHead>
                <TableHead className="text-right">Total Orang</TableHead>
                <TableHead className="text-right">Anggota KK</TableHead>
                <TableHead className="text-right">KK</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(r?.kecamatan ?? []).map((k, i) => (
                <TableRow key={k.id}>
                  <TableCell className="font-mono text-xs">{i + 1}</TableCell>
                  <TableCell>{k.nama}</TableCell>
                  <TableCell className="text-center">{k.desa_count}</TableCell>
                  <TableCell className="text-right font-mono">{k.perangkat}</TableCell>
                  <TableCell className="text-right font-mono">{k.penggiat}</TableCell>
                  <TableCell className="text-right font-mono">{k.total_orang}</TableCell>
                  <TableCell className="text-right font-mono">{k.jiwa}</TableCell>
                  <TableCell className="text-right font-mono">{k.kk}</TableCell>
                </TableRow>
              ))}
            </TableBody>
            {r ? (
              <TableFooter>
                <TableRow className="font-semibold">
                  <TableCell colSpan={2}>TOTAL KABUPATEN</TableCell>
                  <TableCell className="text-center">{r.desa_count}</TableCell>
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

        {/* Rekap per desa */}
        <div className="print-avoid-break">
          <p className="mb-2 text-sm font-semibold">B. Rekapitulasi per Desa</p>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">No</TableHead>
                <TableHead>Kecamatan</TableHead>
                <TableHead>Desa</TableHead>
                <TableHead className="text-right">Perangkat</TableHead>
                <TableHead className="text-right">Penggiat</TableHead>
                <TableHead className="text-right">Total Orang</TableHead>
                <TableHead className="text-right">Anggota KK</TableHead>
                <TableHead className="text-right">KK</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(r?.kecamatan ?? []).flatMap((k, ki) =>
                k.desa.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell className="font-mono text-xs">{ki + 1}</TableCell>
                    <TableCell>{k.nama}</TableCell>
                    <TableCell>{d.nama}</TableCell>
                    <TableCell className="text-right font-mono">{d.perangkat}</TableCell>
                    <TableCell className="text-right font-mono">{d.penggiat}</TableCell>
                    <TableCell className="text-right font-mono">{d.total_orang}</TableCell>
                    <TableCell className="text-right font-mono">{d.jiwa}</TableCell>
                    <TableCell className="text-right font-mono">{d.kk}</TableCell>
                  </TableRow>
                )),
              )}
            </TableBody>
          </Table>
        </div>

        {/* Tanda tangan */}
        <div className="flex justify-between pt-10 text-sm print-avoid-break">
          <div className="text-center">
            <p>Verifikator</p>
            <div className="h-20" />
            <p className="underline">……………………………………</p>
          </div>
          <div className="text-center">
            <p>Muara Bulian, {r?.tanggal ?? "…"}</p>
            <p className="font-semibold">Kepala Dinas PMD</p>
            <p className="font-semibold">Kabupaten Batang Hari</p>
            <div className="h-20" />
            <p className="font-semibold underline">……………………………………</p>
            <p>NIP. ………………………………</p>
          </div>
        </div>
      </div>
    </div>
  );
}
