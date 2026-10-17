import { Navigate, Outlet } from "react-router-dom";
import { useMe } from "@/lib/session";

export default function ProtectedRoute() {
  const { data, isLoading } = useMe();
  if (isLoading) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-slate-50">
        <p className="text-sm text-slate-500">Memuat…</p>
      </div>
    );
  }
  if (!data?.authenticated) return <Navigate to="/login" replace />;
  return <Outlet />;
}
