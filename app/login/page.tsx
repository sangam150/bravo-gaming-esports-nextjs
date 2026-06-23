import { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import LoginHubClient from "@/components/auth/LoginHubClient";
import {
  hasPlayerDashboardAccess,
  hasTeamWorkspaceAccess,
} from "@/lib/authz";
import { getServerAuthenticatedSession } from "@/lib/admin-auth";

export const metadata: Metadata = {
  title: "Login",
  description: "Bravo Gaming Esports Supabase login hub for admin, team, and player access.",
};

export const revalidate = 300;

export default async function LoginPage() {
  const session = await getServerAuthenticatedSession();

  if (session?.isAdmin) {
    redirect("/admin");
  }

  if (session && hasTeamWorkspaceAccess(session.role, session.isAdmin)) {
    redirect("/team");
  }

  if (session && hasPlayerDashboardAccess(session.role, session.isAdmin)) {
    redirect("/dashboard/player");
  }

  return (
    <Suspense
      fallback={
        <main className="page-shell pb-12 pt-6">
          <div className="page-stack">
            <section className="hero-banner p-8">
              <span className="brand-badge">Login</span>
              <h1 className="hero-h1 mt-5">Loading access hub</h1>
              <p className="mt-4 text-sm text-text-muted">Preparing your Bravo Gaming login workspace.</p>
            </section>
          </div>
        </main>
      }
    >
      <LoginHubClient />
    </Suspense>
  );
}
