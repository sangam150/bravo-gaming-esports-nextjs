import AuthProvider from "@/components/admin/AuthProvider";
import AdminGate from "@/components/admin/AdminGate";

export const metadata = {
  title: "Admin | Bravo Gaming Esports",
  robots: {
    index: false,
    follow: false,
  },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="admin-shell min-h-screen bg-bg-primary">
      <AuthProvider>
        <AdminGate>{children}</AdminGate>
      </AuthProvider>
    </div>
  );
}
