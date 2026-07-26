import AdminLogin from "@/components/admin/AdminLogin";
import { getServerAdminSession } from "@/lib/admin-auth";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Admin Login",
  description: "Secure Supabase admin login for Bravo Gaming Esports operations.",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AdminLoginPage() {
  const session = await getServerAdminSession();
  if (session) {
    redirect("/admin");
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <AdminLogin />
    </main>
  );
}
