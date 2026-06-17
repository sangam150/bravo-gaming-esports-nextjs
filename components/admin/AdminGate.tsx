"use client";

import { useAdminAuth } from "./AuthProvider";
import AdminLogin from "./AdminLogin";

export default function AdminGate({ children }: { children: React.ReactNode }) {
  const { user, isAdmin, loading } = useAdminAuth();

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

  if (!isAdmin) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="esports-card max-w-md p-8 text-center">
          <h1 className="font-display text-2xl font-black uppercase text-white">Admin Access Required</h1>
          <p className="mt-3 text-sm text-text-muted">
            This account is signed in, but it does not have an admin role in Supabase.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
