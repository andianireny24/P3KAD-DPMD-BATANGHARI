import { Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import ProtectedRoute from "@/components/ProtectedRoute";
import AppShell from "@/components/AppShell";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import Registry from "@/pages/Registry";
import Recap from "@/pages/Recap";
import Alokasi from "@/pages/Alokasi";
import ImportExcel from "@/pages/ImportExcel";
import Wilayah from "@/pages/Wilayah";
import Print from "@/pages/Print";

// One <Route> per page in src/pages; BrowserRouter already wraps this in main.tsx.
export default function App() {
  return (
    <>
      <Routes>
        <Route element={<ProtectedRoute />}>
          <Route element={<AppShell />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/perangkat-penggiat" element={<Registry />} />
            <Route path="/rekapitulasi" element={<Recap />} />
            <Route path="/alokasi-dana" element={<Alokasi />} />
            <Route path="/impor" element={<ImportExcel />} />
            <Route path="/wilayah" element={<Wilayah />} />
            <Route path="/cetak" element={<Print />} />
          </Route>
        </Route>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toaster />
    </>
  );
}
