import { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import LoginHubClient from "@/components/auth/LoginHubClient";
import { hasTeamWorkspaceAccess } from "@/lib/authz";
import { getServerAuthenticatedSession } from "@/lib/admin-auth";

export const metadata: Metadata = {
  title: "Login",
  description: "Bravo Gaming Esports Supabase login hub for admin and team access.",
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

  return (
    <Suspense
      fallback={
        <main className="page-shell pb-12 pt-6">
          <div className="page-stack">
            <section className="hero-banner p-8">
              <span className="brand-badge">Login</span>
              <h1 className="hero-h1 mt-5">Sign in to Bravo Gaming</h1>
              <p className="mt-4 text-sm text-text-muted">
                The secure sign-in form is loading. If it does not appear, refresh the page or contact Bravo support.
              </p>
            </section>
          </div>
        </main>
      }
    >
      <LoginHubClient />
    </Suspense>
  );
}
