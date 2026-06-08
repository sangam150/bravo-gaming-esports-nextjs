"use client";

import { useAdminAuth } from "./AuthProvider";
import AdminLogin from "./AdminLogin";

export default function AdminGate({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAdminAuth();

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-sm text-text-muted">
        Verifying admin session...
      </div>
    );
  }

  if (!user) {
    return <AdminLogin />;
  }

  return <>{children}</>;
}
