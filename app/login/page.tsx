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
            <section className="hero-banner overflow-hidden p-8">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(29,155,240,0.16),transparent_32%),radial-gradient(circle_at_82%_18%,rgba(0,230,118,0.12),transparent_30%),linear-gradient(135deg,rgba(8,15,30,0.98),rgba(8,15,30,0.82))]" />
              <div className="relative z-10 grid gap-8 xl:grid-cols-[1.05fr,0.95fr]">
                <div>
                  <span className="brand-badge">Login</span>
                  <h1 className="hero-h1 mt-5">Sign in to Bravo Gaming</h1>
                  <p className="mt-4 max-w-2xl text-sm leading-relaxed text-text-muted">
                    The secure sign-in form is loading. If it takes a moment, stay on this page. For help, use the support links below.
                  </p>
                  <div className="mt-6 flex flex-wrap gap-3">
                    <a href="/contact" className="btn-secondary">
                      Contact Support
                    </a>
                    <a href="/reset-password" className="btn-primary">
                      Reset Password
                    </a>
                  </div>
                </div>

                <div className="rounded-card border border-white/[0.08] bg-bg-primary/80 p-6">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="section-title">Access Hub</p>
                      <h2 className="mt-2 font-display text-2xl font-black uppercase text-white">Preparing secure workspace</h2>
                    </div>
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-accent-blue/25 bg-accent-blue/10 text-accent-blue-light">•</span>
                  </div>
                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    {[
                      { label: "Admin access", value: "Protected" },
                      { label: "Team access", value: "Protected" },
                      { label: "Session check", value: "Loading" },
                      { label: "Support", value: "Ready" },
                    ].map((item) => (
                      <div key={item.label} className="rounded-[18px] border border-white/[0.08] bg-black/20 p-4">
                        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-text-muted">{item.label}</p>
                        <p className="mt-2 font-display text-lg font-black uppercase text-white">{item.value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          </div>
        </main>
      }
    >
      <LoginHubClient />
    </Suspense>
  );
}
