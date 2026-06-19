import Link from "next/link";
import type { Metadata } from "next";
import TeamAvatar from "@/components/ui/TeamAvatar";
import { getCurrentSeasonOverview } from "@/lib/data";
import { getPubgDashboardData } from "@/lib/pubg-hub";

export const metadata: Metadata = {
  title: "PUBG Hall of Fame",
  description: "Bravo Gaming Esports PUBG Hall of Fame with current season leaders, top teams, and top players built from published data.",
};

export const revalidate = 300;

export default async function PubgHallOfFamePage() {
  const [overview, dashboard] = await Promise.all([getCurrentSeasonOverview(), getPubgDashboardData()]);
  const seasonLeaders = overview?.leaderboard.slice(0, 3) ?? [];
  const allTimeTeams = dashboard.teams.slice(0, 10);
  const allTimePlayers = dashboard.players.slice(0, 10);

  return (
    <main className="page-shell">
      <div className="page-inner space-y-8">
        <section className="page-hero overflow-hidden p-6 sm:p-8">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,215,0,0.16),transparent_28%),radial-gradient(circle_at_80%_15%,rgba(29,155,240,0.14),transparent_26%)]" />
          <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <p className="section-title">PUBG Hall of Fame</p>
              <h1 className="hero-h1 mt-2 !text-4xl sm:!text-5xl">Bravo&apos;s data-backed legacy board</h1>
              <p className="mt-4 max-w-3xl text-sm leading-relaxed text-text-muted sm:text-base">
                This route now reads from the live PUBG dataset instead of static placeholder champions, so the public legacy surface stays aligned with published results.
              </p>
            </div>
            <Link href="/pubg/leaderboards" className="btn-primary shrink-0">
              Open Leaderboards
            </Link>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[0.9fr,1.1fr]">
          <div className="esports-card p-6">
            <p className="section-heading !text-sm">Current Season Podium</p>
            <p className="mt-2 text-sm text-text-muted">
              The top three teams from the active published season.
            </p>
            <div className="mt-5 space-y-3">
              {seasonLeaders.length === 0 ? (
                <p className="text-sm text-text-muted">Season podium will appear after the first published match results.</p>
              ) : (
                seasonLeaders.map((team) => (
                  <Link
                    key={team.teamId}
                    href={`/pubg/teams/${team.teamId}`}
                    className="flex items-center justify-between gap-3 rounded-card border border-white/10 bg-bg-primary p-4 transition hover:border-accent-yellow/30"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="font-mono-stat text-lg font-black text-accent-yellow">#{team.rank}</div>
                      <TeamAvatar name={team.team} imageUrl={team.logoUrl} size="sm" />
                      <div className="min-w-0">
                        <p className="truncate font-semibold uppercase text-white">{team.team}</p>
                        <p className="text-xs uppercase tracking-[0.16em] text-text-muted">
                          {team.matches} matches | {team.chickenDinners ?? 0} WWCD
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-mono-stat text-lg font-black text-white">{team.points}</p>
                      <p className="text-label uppercase text-text-muted">Pts</p>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>

          <div className="esports-card p-6">
            <p className="section-heading !text-sm">Hall Snapshot</p>
            <div className="mt-5 grid gap-4 sm:grid-cols-3">
              <div className="rounded-card border border-white/10 bg-bg-primary p-4">
                <p className="text-label uppercase text-text-muted">Teams Tracked</p>
                <p className="mt-2 font-mono-stat text-3xl text-white">{dashboard.teams.length}</p>
              </div>
              <div className="rounded-card border border-white/10 bg-bg-primary p-4">
                <p className="text-label uppercase text-text-muted">Players Tracked</p>
                <p className="mt-2 font-mono-stat text-3xl text-white">{dashboard.players.length}</p>
              </div>
              <div className="rounded-card border border-white/10 bg-bg-primary p-4">
                <p className="text-label uppercase text-text-muted">Matches Published</p>
                <p className="mt-2 font-mono-stat text-3xl text-white">{dashboard.matches.length}</p>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-2">
          <div className="esports-card overflow-hidden !p-0">
            <div className="border-b border-white/10 px-5 py-4">
              <p className="section-heading !text-sm">Top Teams</p>
              <p className="mt-1 text-sm text-text-muted">Driven by total points, wins, damage, and recent published form.</p>
            </div>
            <div className="divide-y divide-white/10">
              {allTimeTeams.map((team, index) => (
                <Link
                  key={team.id}
                  href={`/pubg/teams/${team.slug}`}
                  className="flex items-center justify-between gap-3 px-5 py-4 transition hover:bg-white/[0.03]"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="font-mono-stat text-sm font-black text-accent-blue">#{index + 1}</div>
                    <TeamAvatar name={team.name} imageUrl={team.logoUrl} size="sm" />
                    <div className="min-w-0">
                      <p className="truncate font-semibold uppercase text-white">{team.name}</p>
                      <p className="text-xs uppercase tracking-[0.16em] text-text-muted">
                        {team.wins} WWCD | {team.kills} kills
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-mono-stat text-lg font-black text-white">{team.totalPoints}</p>
                    <p className="text-label uppercase text-text-muted">Pts</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          <div className="esports-card overflow-hidden !p-0">
            <div className="border-b border-white/10 px-5 py-4">
              <p className="section-heading !text-sm">Top Players</p>
              <p className="mt-1 text-sm text-text-muted">Kills, damage, MVP count, and recent output shape the player legacy view.</p>
            </div>
            <div className="divide-y divide-white/10">
              {allTimePlayers.map((player, index) => (
                <Link
                  key={player.id}
                  href={`/pubg/players/${player.slug}`}
                  className="flex items-center justify-between gap-3 px-5 py-4 transition hover:bg-white/[0.03]"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="font-mono-stat text-sm font-black text-accent-blue">#{index + 1}</div>
                    <TeamAvatar name={player.pubgName} imageUrl={player.avatarUrl} size="sm" />
                    <div className="min-w-0">
                      <p className="truncate font-semibold uppercase text-white">{player.pubgName}</p>
                      <p className="text-xs uppercase tracking-[0.16em] text-text-muted">
                        {player.currentTeamName ?? "No active team"} | {player.kills} kills
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-mono-stat text-lg font-black text-white">{player.damage.toLocaleString()}</p>
                    <p className="text-label uppercase text-text-muted">Damage</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
