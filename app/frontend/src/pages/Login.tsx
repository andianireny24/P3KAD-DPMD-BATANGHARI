import { useState } from "react";
import type { FormEvent } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Landmark, Lock } from "lucide-react";
import { toast } from "sonner";
import { apiPost, ApiError } from "@/lib/api";
import { beginSession, useMe } from "@/lib/session";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function Login() {
  const { data: me } = useMe();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  if (me?.authenticated) return <Navigate to="/" replace />;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await apiPost("/auth/login", { password });
      await beginSession();
      toast.success("Selamat datang!");
      navigate("/", { replace: true });
    } catch (err) {
      const status = err instanceof ApiError ? err.status : 0;
      toast.error(
        status === 401 ? "Password salah. Coba lagi." : "Tidak dapat terhubung ke server.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="hidden flex-col justify-between bg-emerald-900 p-10 text-white lg:flex">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-700">
            <Landmark className="h-6 w-6" />
          </div>
          <div>
            <p className="font-heading text-lg font-semibold tracking-tight">
              Dinas Pemberdayaan Masyarakat dan Desa
            </p>
            <p className="text-sm text-emerald-100/80">Kabupaten Batang Hari — Provinsi Jambi</p>
          </div>
        </div>
        <div className="space-y-4">
          <h1 className="font-heading text-4xl font-semibold leading-tight tracking-tight">
            Rekapitulasi Perangkat &amp; Penggiat Desa
          </h1>
          <p className="max-w-md text-emerald-100/90">
            Data 110 desa di 8 kecamatan, jumlah anggota per KK, rekap otomatis per desa dan
            kecamatan, sampai kalkulasi alokasi dana desa — semua dalam satu aplikasi.
          </p>
          <div className="grid grid-cols-3 gap-4 pt-2">
            <div>
              <p className="font-heading text-3xl font-semibold">110</p>
              <p className="text-xs uppercase tracking-wider text-emerald-100/70">Desa</p>
            </div>
            <div>
              <p className="font-heading text-3xl font-semibold">8</p>
              <p className="text-xs uppercase tracking-wider text-emerald-100/70">Kecamatan</p>
            </div>
            <div>
              <p className="font-heading text-3xl font-semibold">1</p>
              <p className="text-xs uppercase tracking-wider text-emerald-100/70">Data Tahunan</p>
            </div>
          </div>
        </div>
        <p className="text-xs text-emerald-100/60">
          Bidang Pemberdayaan Perencanaan Pengelolaan Keuangan dan Aset Desa
        </p>
      </div>
      <div className="flex items-center justify-center p-6">
        <form onSubmit={submit} className="w-full max-w-sm space-y-6" data-testid="login-form">
          <div className="space-y-2">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800">
              <Lock className="h-6 w-6" />
            </div>
            <h2 className="font-heading text-2xl font-semibold tracking-tight text-slate-900">
              Masuk Aplikasi
            </h2>
            <p className="text-sm text-slate-500">
              Masukkan password aplikasi untuk mulai merekap data.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="passcode">Password</Label>
            <Input
              id="passcode"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password aplikasi"
              required
              data-testid="input-passcode"
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading} data-testid="btn-login">
            {loading ? "Memeriksa…" : "Masuk"}
          </Button>
          <p className="text-center text-xs text-slate-400">
            Aplikasi rekap internal — Dinas PMD Kabupaten Batang Hari
          </p>
        </form>
      </div>
    </div>
  );
}
