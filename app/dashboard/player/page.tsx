import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import AccessStateCard from "@/components/auth/AccessStateCard";
import AuthSignOutButton from "@/components/auth/AuthSignOutButton";
import { getPubgHubDataset } from "@/lib/pubg-hub";
import { hasPlayerDashboardAccess } from "@/lib/authz";
import { getServerAuthenticatedSession } from "@/lib/admin-auth";

export const metadata: Metadata = {
  title: "Player Dashboard",
  description: "Bravo Gaming Esports player dashboard for approved player profile access, stats, and match history.",
};

export const revalidate = 300;

export default async function PlayerDashboardPage() {
  const session = await getServerAuthenticatedSession();

  if (!session) {
    redirect("/player/login?redirect=/dashboard/player");
  }

  if (!hasPlayerDashboardAccess(session.role, session.isAdmin)) {
    return (
      <AccessStateCard
        badge="Access Denied"
        title="Player dashboard access is restricted"
        description="This signed-in account is not linked to the Bravo player dashboard role. Please use the correct player account or contact Bravo if your access should be enabled."
        actions={[
          { href: "/login", label: "Open Login Hub", tone: "primary" },
          { href: "/contact", label: "Contact Bravo", tone: "secondary" },
        ]}
      />
    );
  }

  const pubg = await getPubgHubDataset();
  const linkedPlayer =
    session.playerId
      ? pubg.players.find((player) => player.id === session.playerId || player.slug === session.playerId) ?? null
      : null;
  const fallbackPreviewPlayer = linkedPlayer ?? pubg.players[0] ?? null;

  if (!linkedPlayer && !session.isAdmin) {
    return (
      <AccessStateCard
        badge="Player Setup Pending"
        title="Your account still needs a player profile link"
        description="You are signed in with a valid Bravo player account, but your profile is not yet connected to a published player record. Once that link is completed, your personal dashboard will appear here."
        actions={[
          { href: "/contact", label: "Contact Bravo", tone: "primary" },
          { href: "/pubg/players", label: "Browse Players", tone: "secondary" },
        ]}
      />
    );
  }

  return (
    <main className="page-shell pb-12 pt-6">
      <div className="page-stack">
        <section className="hero-banner overflow-hidden p-8">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_16%_18%,_rgba(29,155,240,0.18),_transparent_30%),radial-gradient(circle_at_82%_20%,_rgba(0,230,118,0.14),_transparent_30%),linear-gradient(135deg,rgba(8,15,30,0.98),rgba(8,15,30,0.82))]" />
          <div className="relative z-10 grid gap-6 xl:grid-cols-[1.05fr,0.95fr]">
            <div>
              <span className="brand-badge">Player Dashboard</span>
              <h1 className="hero-h1 mt-5">Welcome back, {session.displayName ?? session.email}</h1>
              <p className="mt-4 max-w-3xl text-sm leading-relaxed text-text-muted">
                This protected dashboard is now limited to authenticated Bravo player accounts. Personal profile links,
                stat history, and future fantasy access will expand here as account linking is completed.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <AuthSignOutButton className="btn-secondary" redirectTo="/player/login" />
                <Link href="/pubg/players" className="btn-secondary">
                  Browse Players
                </Link>
              </div>
            </div>

            <div className="rounded-card border border-white/[0.08] bg-bg-primary/75 p-6">
              <p className="section-title">Access Status</p>
              <h2 className="mt-2 font-display text-2xl font-black uppercase text-white">
                {linkedPlayer ? linkedPlayer.pubgName : "Protected Preview"}
              </h2>
              <p className="mt-3 text-sm text-text-muted">
                {linkedPlayer
                  ? "Your account is connected to a published player record."
                  : "Admin access can preview the protected player dashboard even before a player profile link is assigned."}
              </p>

              {fallbackPreviewPlayer ? (
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-3xl border border-white/10 bg-black/20 p-4">
                    <p className="text-[11px] uppercase tracking-[0.14em] text-text-muted">Kills</p>
                    <p className="mt-2 font-mono-stat text-2xl text-white">{fallbackPreviewPlayer.kills}</p>
                  </div>
                  <div className="rounded-3xl border border-white/10 bg-black/20 p-4">
                    <p className="text-[11px] uppercase tracking-[0.14em] text-text-muted">Damage</p>
                    <p className="mt-2 font-mono-stat text-2xl text-white">{fallbackPreviewPlayer.damage}</p>
                  </div>
                  <div className="rounded-3xl border border-white/10 bg-black/20 p-4">
                    <p className="text-[11px] uppercase tracking-[0.14em] text-text-muted">Matches</p>
                    <p className="mt-2 font-mono-stat text-2xl text-white">{fallbackPreviewPlayer.matches}</p>
                  </div>
                  <div className="rounded-3xl border border-white/10 bg-black/20 p-4">
                    <p className="text-[11px] uppercase tracking-[0.14em] text-text-muted">Current Team</p>
                    <p className="mt-2 text-sm font-semibold text-white">
                      {fallbackPreviewPlayer.currentTeamName ?? "Team assignment pending"}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="mt-5 rounded-3xl border border-white/10 bg-black/20 p-4 text-sm text-text-muted">
                  Player statistics will appear here once published records are available.
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
