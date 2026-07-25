import { redirect } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { getServerAuthenticatedSession } from "@/lib/admin-auth";
import { hasPlayerDashboardAccess } from "@/lib/authz";

export const metadata: Metadata = {
  title: "Dashboard Redirect",
  description: "Bravo Gaming Esports uses admin login and team login only.",
};

export const dynamic = "force-dynamic";

export default async function PlayerDashboardPage() {
  const session = await getServerAuthenticatedSession();
  if (!session) redirect("/player/login");
  if (!hasPlayerDashboardAccess(session.role, session.isAdmin) || !session.playerId) {
    redirect("/player/login");
  }

  return (
    <main className="page-shell py-10">
      <section className="esports-card mx-auto max-w-3xl">
        <p className="section-title">Player Dashboard</p>
        <h1 className="mt-2 font-display text-3xl font-black uppercase">Player access confirmed</h1>
        <p className="mt-3 text-text-muted">
          Your account is securely linked to an approved Bravo player profile.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href={`/players/${session.playerId}`} className="btn-primary">Open player profile</Link>
          <Link href="/pubg/leaderboards" className="btn-secondary">View leaderboards</Link>
        </div>
      </section>
    </main>
  );
}
