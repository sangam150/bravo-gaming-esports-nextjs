"use client";

import Link from "next/link";
import Tabs from "@/components/ui/Tabs";
import StatusBadge from "@/components/ui/StatusBadge";
import TeamAvatar from "@/components/ui/TeamAvatar";
import type { Player, Team, Tournament, TournamentMatch } from "@/lib/types";

export default function TournamentDetailClient({
  tournament,
  matches,
  teams,
  players,
  standings,
}: {
  tournament: Tournament;
  matches: TournamentMatch[];
  teams: Team[];
  players: Player[];
  standings: { team: string; points: number }[];
}) {
  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="page-hero mb-6">
        <div className="flex flex-wrap items-start gap-4">
          <TeamAvatar name={tournament.title} size="lg" />
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="font-display text-2xl font-black uppercase text-white">{tournament.title}</h1>
              <StatusBadge status={tournament.status} />
            </div>
            <div className="mt-4 flex flex-wrap gap-6 text-sm">
              <div><span className="text-label uppercase text-text-muted">Prize Pool: </span><span className="font-mono-stat font-bold text-accent-green">{tournament.prizePool}</span></div>
              <div><span className="text-label uppercase text-text-muted">Teams: </span><span className="font-mono-stat">{tournament.teamCount}/{tournament.maxTeams}</span></div>
              <div><span className="text-label uppercase text-text-muted">Started: </span><span>{tournament.startDate}</span></div>
              <div><span className="text-label uppercase text-text-muted">Matches: </span><span className="text-accent-blue">{matches.length}/20</span></div>
            </div>
          </div>
          {["OPEN", "REGISTERING"].includes(tournament.status) && (
            <Link href={`/teams/register?tournament=${tournament.id}`} className="btn-primary">Register</Link>
          )}
        </div>
      </div>

      <Tabs tabs={["Overview", "Teams", "Matches", "Standings", "Rules"]}>
        {(tab) => (
          <div className="grid gap-6 lg:grid-cols-3">
            {(tab === "Overview" || tab === "Rules") && (
              <div className={tab === "Overview" ? "lg:col-span-2" : "lg:col-span-3"}>
                <div className="esports-card p-6">
                  <h2 className="section-heading !text-base">{tab === "Overview" ? "About Tournament" : "Rules"}</h2>
                  <p className="mt-4 text-sm text-text-muted">{tournament.description}</p>
                  <ul className="mt-4 space-y-2 text-sm text-text-muted">
                    <li>• Squad Format</li>
                    <li>• {tournament.format}</li>
                    <li>• {tournament.server} Server</li>
                    <li>• Point System: 1st=10, 2nd=6, 3rd=4, kills=1</li>
                    {tab === "Rules" && <li>• Admin-verified match IDs required</li>}
                  </ul>
                </div>
              </div>
            )}
            {tab === "Overview" && (
              <div className="esports-card p-6">
                <h2 className="section-heading !text-base">Tournament Standings</h2>
                <table className="data-table mt-4 min-w-full">
                  <thead><tr><th>Team</th><th>Points</th></tr></thead>
                  <tbody>
                    {standings.slice(0, 4).map((s) => (
                      <tr key={s.team}><td className="font-semibold">{s.team}</td><td className="points-cell">{s.points}</td></tr>
                    ))}
                  </tbody>
                </table>
                <Link href="/leaderboard" className="btn-outline-blue mt-4 inline-flex !text-[11px]">View Full Standings →</Link>
              </div>
            )}
            {tab === "Teams" && (
              <div className="lg:col-span-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {teams.map((t) => (
                  <Link key={t.id} href={`/teams/${t.id}`} className="tournament-card flex items-center gap-3 p-4">
                    <TeamAvatar name={t.name} />
                    <span className="font-semibold text-white">{t.name}</span>
                  </Link>
                ))}
              </div>
            )}
            {tab === "Matches" && (
              <div className="lg:col-span-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {matches.length === 0 ? <p className="text-text-muted">Waiting for live match data</p> : matches.map((m) => (
                  <div key={m.id} className="esports-card p-4">
                    <p className="text-label uppercase text-accent-blue">{m.map}</p>
                    <p className="mt-2 font-semibold text-white">Winner: {m.winner}</p>
                    <p className="text-sm text-text-muted">{m.points} pts · {m.knockouts} knockouts</p>
                  </div>
                ))}
              </div>
            )}
            {tab === "Standings" && (
              <div className="lg:col-span-3 esports-card overflow-hidden !p-0">
                <table className="data-table min-w-full">
                  <thead><tr><th>#</th><th>Team</th><th>Points</th></tr></thead>
                  <tbody>
                    {standings.map((s, i) => (
                      <tr key={s.team}><td>#{i + 1}</td><td>{s.team}</td><td className="points-cell">{s.points}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </Tabs>

      <Link href="/tournaments" className="btn-secondary mt-8 inline-flex">← Back to Tournaments</Link>
    </main>
  );
}
