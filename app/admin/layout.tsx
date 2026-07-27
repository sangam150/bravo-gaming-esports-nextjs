import AdminGate from "@/components/admin/AdminGate";
import AuthProvider from "@/components/admin/AuthProvider";
import { getServerAuthenticatedSession } from "@/lib/admin-auth";

export const metadata = {
  title: "Admin | Bravo Gaming Esports",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerAuthenticatedSession();

  return (
    <div className="admin-shell min-h-screen bg-bg-primary">
      <AuthProvider initialUser={session ? { uid: session.uid, email: session.email } : null} initialRole={session?.role ?? null}>
        <AdminGate>{children}</AdminGate>
      </AuthProvider>
    </div>
  );
}
