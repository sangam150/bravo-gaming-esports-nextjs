import LoginHubClient from "@/components/auth/LoginHubClient";
import { getServerAuthenticatedSession } from "@/lib/admin-auth";
import { hasPlayerDashboardAccess } from "@/lib/authz";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Player Login",
  description: "Secure Bravo Gaming Esports login for players with an approved linked player profile.",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function PlayerLoginPage() {
  const session = await getServerAuthenticatedSession();
  if (session && hasPlayerDashboardAccess(session.role, session.isAdmin) && session.playerId) {
    redirect("/dashboard/player");
  }

  return (
    <Suspense
      fallback={
        <main className="page-shell py-16">
          <section className="esports-card mx-auto max-w-xl p-8 text-center">
            <p className="section-title">Player Login</p>
            <h1 className="mt-3 font-display text-3xl font-black uppercase text-white">Secure player access</h1>
            <p className="mt-3 text-sm leading-7 text-text-muted">
              Player access requires a confirmed account linked to an approved Bravo player profile.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link href="/login" className="btn-secondary">
                General Login
              </Link>
              <Link href="/contact" className="btn-primary">
                Contact Bravo
              </Link>
            </div>
          </section>
        </main>
      }
    >
      <LoginHubClient variant="player" />
    </Suspense>
  );
}
