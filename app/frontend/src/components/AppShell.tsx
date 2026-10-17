import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { LogOut, Landmark } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { endSession } from "@/lib/session";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/", label: "Beranda", end: true },
  { to: "/perangkat-penggiat", label: "Data Perangkat & Penggiat", end: false },
  { to: "/rekapitulasi", label: "Rekapitulasi", end: false },
  { to: "/alokasi-dana", label: "Alokasi Dana", end: false },
  { to: "/impor", label: "Impor Excel", end: false },
  { to: "/wilayah", label: "Wilayah", end: false },
  { to: "/cetak", label: "Cetak", end: false },
];

export default function AppShell() {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await endSession();
    toast.success("Anda telah keluar");
    navigate("/login");
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900 antialiased">
      <header className="sticky top-0 z-40 border-b border-emerald-950/20 bg-emerald-900 text-white shadow-sm print:hidden">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-4 px-4 md:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-700">
              <Landmark className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="truncate font-heading text-sm font-semibold tracking-tight">
                DPMD Kab. Batang Hari
              </p>
              <p className="truncate text-xs text-emerald-100/80">
                SI Perangkat &amp; Penggiat Desa
              </p>
            </div>
          </div>
          <nav className="hidden items-center gap-1 xl:flex" data-testid="main-nav">
            {NAV.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.end}
                className={({ isActive }) =>
                  cn(
                    "rounded-md px-3 py-2 text-sm transition-colors duration-150",
                    isActive
                      ? "bg-emerald-700 font-semibold text-white"
                      : "text-emerald-50/80 hover:bg-emerald-800 hover:text-white",
                  )
                }
              >
                {n.label}
              </NavLink>
            ))}
          </nav>
          <Button
            data-testid="btn-logout"
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="text-emerald-50 hover:bg-emerald-800 hover:text-white"
          >
            <LogOut className="h-4 w-4" /> Keluar
          </Button>
        </div>
        <nav
          className="flex gap-1 overflow-x-auto border-t border-emerald-800 px-2 py-1 xl:hidden"
          data-testid="main-nav-mobile"
        >
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              className={({ isActive }) =>
                cn(
                  "whitespace-nowrap rounded-md px-3 py-1.5 text-xs transition-colors duration-150",
                  isActive
                    ? "bg-emerald-700 font-semibold text-white"
                    : "text-emerald-50/80 hover:bg-emerald-800 hover:text-white",
                )
              }
            >
              {n.label}
            </NavLink>
          ))}
        </nav>
      </header>
      <main className="mx-auto w-full max-w-7xl flex-1 space-y-6 p-4 md:p-8 print:max-w-none print:p-0">
        <Outlet />
      </main>
      <footer className="border-t border-slate-200 bg-white py-3 text-center text-xs text-slate-500 print:hidden">
        Dinas Pemberdayaan Masyarakat dan Desa — Kabupaten Batang Hari, Provinsi Jambi
      </footer>
    </div>
  );
}
