"use client";

import Link from "next/link";
import StatusBadge from "@/components/ui/StatusBadge";
import Tabs from "@/components/ui/Tabs";
import TeamAvatar from "@/components/ui/TeamAvatar";
import type { Player, Team, Tournament, TournamentMatch } from "@/lib/types";

export default function TournamentDetailClient({
  tournament,
  matches,
  teams,
  players: _players,
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
              <div>
                <span className="text-label uppercase text-text-muted">Prize Pool: </span>
                <span className="font-mono-stat font-bold text-accent-green">{tournament.prizePool}</span>
              </div>
              <div>
                <span className="text-label uppercase text-text-muted">Teams: </span>
                <span className="font-mono-stat">
                  {tournament.teamCount}/{tournament.maxTeams}
                </span>
              </div>
              <div>
                <span className="text-label uppercase text-text-muted">Started: </span>
                <span>{tournament.startDate}</span>
              </div>
              <div>
                <span className="text-label uppercase text-text-muted">Matches: </span>
                <span className="text-accent-blue">{matches.length}/20</span>
              </div>
            </div>
          </div>
          {["OPEN", "REGISTERING"].includes(tournament.status) && (
            <Link href={`/teams/register?tournament=${tournament.id}`} className="btn-primary">
              Register
            </Link>
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
                    <li>Squad Format</li>
                    <li>{tournament.format}</li>
                    <li>{tournament.server} Server</li>
                    <li>Point System: 1st=10, 2nd=6, 3rd=5, 4th=4, 5th=3, 6th=2, 7th-8th=1, kills=1</li>
                    {tab === "Rules" && <li>Admin-verified match IDs required</li>}
                  </ul>
                </div>
              </div>
            )}
            {tab === "Overview" && (
              <div className="esports-card p-6">
                <h2 className="section-heading !text-base">Tournament Standings</h2>
                <table className="data-table mt-4 min-w-full">
                  <thead>
                    <tr>
                      <th>Team</th>
                      <th>Points</th>
                    </tr>
                  </thead>
                  <tbody>
                    {standings.slice(0, 4).map((standing) => (
                      <tr key={standing.team}>
                        <td className="font-semibold">{standing.team}</td>
                        <td className="points-cell">{standing.points}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <Link href="/leaderboard" className="btn-outline-blue mt-4 inline-flex !text-[11px]">
                  View Full Standings
                </Link>
              </div>
            )}
            {tab === "Teams" && (
              <div className="grid gap-3 sm:grid-cols-2 lg:col-span-3 lg:grid-cols-3">
                {teams.map((team) => (
                  <Link key={team.id} href={`/teams/${team.id}`} className="tournament-card flex items-center gap-3 p-4">
                    <TeamAvatar name={team.name} />
                    <span className="font-semibold text-white">{team.name}</span>
                  </Link>
                ))}
              </div>
            )}
            {tab === "Matches" && (
              <div className="grid gap-4 sm:grid-cols-2 lg:col-span-3 lg:grid-cols-3">
                {matches.length === 0 ? (
                  <p className="text-text-muted">Waiting for live match data</p>
                ) : (
                  matches.map((match) => (
                    <div key={match.id} className="esports-card p-4">
                      <p className="text-label uppercase text-accent-blue">{match.map}</p>
                      <p className="mt-2 font-semibold text-white">Winner: {match.winner}</p>
                      <p className="text-sm text-text-muted">
                        {match.points} pts - {match.knockouts} knockouts
                      </p>
                    </div>
                  ))
                )}
              </div>
            )}
            {tab === "Standings" && (
              <div className="esports-card overflow-hidden !p-0 lg:col-span-3">
                <table className="data-table min-w-full">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Team</th>
                      <th>Points</th>
                    </tr>
                  </thead>
                  <tbody>
                    {standings.map((standing, index) => (
                      <tr key={standing.team}>
                        <td>#{index + 1}</td>
                        <td>{standing.team}</td>
                        <td className="points-cell">{standing.points}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </Tabs>

      <Link href="/tournaments" className="btn-secondary mt-8 inline-flex">
        Back to Tournaments
      </Link>
    </main>
  );
}
