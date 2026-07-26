"use client";

import { usePathname } from "next/navigation";
import AdminLogin from "./AdminLogin";
import { useAdminAuth } from "./AuthProvider";

export default function AdminGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, isAdmin, loading } = useAdminAuth();
  const isLoginRoute = pathname === "/admin/login";

  if (loading) {
    return <div className="flex min-h-[60vh] items-center justify-center text-sm text-text-muted">Preparing admin dashboard...</div>;
  }

  if (isLoginRoute) {
    return <>{children}</>;
  }

  if (!user) {
    return <AdminLogin />;
  }

  if (!isAdmin) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="esports-card max-w-md p-8 text-center">
          <h1 className="font-display text-2xl font-black uppercase text-white">Admin Access Required</h1>
          <p className="mt-3 text-sm text-text-muted">You do not have permission to access this page.</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
