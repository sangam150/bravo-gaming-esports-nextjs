"use client";

import Link from "next/link";
import StatusBadge from "@/components/ui/StatusBadge";
import Tabs from "@/components/ui/Tabs";
import TeamAvatar from "@/components/ui/TeamAvatar";
import type { Player, Team, Tournament, TournamentMatch, TournamentStanding } from "@/lib/types";

function formatLabel(value?: string) {
  return value && value.trim().length > 0 ? value : "Unavailable";
}

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
  standings: TournamentStanding[];
}) {
  const topStandings = standings.slice(0, 5);

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="page-hero mb-6 overflow-hidden">
        {tournament.bannerUrl && (
          <div
            className="absolute inset-0 opacity-15"
            style={{
              backgroundImage: `url(${tournament.bannerUrl})`,
              backgroundPosition: "center",
              backgroundSize: "cover",
            }}
          />
        )}
        <div className="relative z-10 flex flex-wrap items-start gap-4">
          <TeamAvatar name={tournament.title} size="lg" imageUrl={tournament.bannerUrl} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="font-display text-2xl font-black uppercase text-white">{tournament.title}</h1>
              <StatusBadge status={tournament.status} />
              <span className="rounded-full border border-accent-blue/30 bg-accent-blue/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-accent-blue">
                {tournament.tier}
              </span>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-4 text-sm sm:grid-cols-3 xl:grid-cols-6">
              <div>
                <span className="text-label uppercase text-text-muted">Region</span>
                <p className="font-mono-stat text-white">{formatLabel(tournament.server)}</p>
              </div>
              <div>
                <span className="text-label uppercase text-text-muted">Mode</span>
                <p className="font-mono-stat text-white">{formatLabel(tournament.format)}</p>
              </div>
              <div>
                <span className="text-label uppercase text-text-muted">Perspective</span>
                <p className="font-mono-stat text-white">{formatLabel(tournament.perspective)}</p>
              </div>
              <div>
                <span className="text-label uppercase text-text-muted">Prize Pool</span>
                <p className="font-mono-stat font-bold text-accent-green">{tournament.prizePool}</p>
              </div>
              <div>
                <span className="text-label uppercase text-text-muted">Teams Joined</span>
                <p className="font-mono-stat text-white">
                  {tournament.teamCount}/{tournament.maxTeams}
                </p>
              </div>
              <div>
                <span className="text-label uppercase text-text-muted">Matches</span>
                <p className="font-mono-stat text-accent-blue">
                  {matches.length}/{tournament.matchCount ?? matches.length}
                </p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-3 text-xs uppercase tracking-[0.18em] text-text-muted">
              <span>Started: {formatLabel(tournament.startDate)}</span>
              {tournament.endDate && <span>Ended: {tournament.endDate}</span>}
              {tournament.sourceUrl && (
                <a href={tournament.sourceUrl} target="_blank" rel="noreferrer" className="text-accent-blue hover:underline">
                  Source Feed
                </a>
              )}
            </div>
          </div>
          <Link href="/tournaments" className="btn-secondary">
            Back to Tournaments
          </Link>
        </div>
      </div>

      <Tabs tabs={["Overview", "Standings", "Matches", "Teams", "Players", "Rules"]}>
        {(tab) => (
          <div className="grid gap-6 lg:grid-cols-3">
            {tab === "Overview" && (
              <>
                <div className="lg:col-span-2">
                  <div className="esports-card p-6">
                    <h2 className="section-heading !text-base">About Tournament</h2>
                    <p className="mt-4 text-sm text-text-muted">
                      {tournament.description || "Description unavailable from the source feed."}
                    </p>
                    <div className="mt-6 grid gap-3 text-sm text-text-muted sm:grid-cols-2">
                      <p>Format: {formatLabel(tournament.format)}</p>
                      <p>Game: {formatLabel(tournament.mode)}</p>
                      <p>Region: {formatLabel(tournament.server)}</p>
                      <p>Perspective: {formatLabel(tournament.perspective)}</p>
                      <p>Day: {tournament.dayNumber ? `Day ${tournament.dayNumber}` : "Unavailable"}</p>
                      <p>Source Status: {formatLabel(tournament.sourceStatus)}</p>
                    </div>
                  </div>
                </div>
                <div className="esports-card p-6">
                  <h2 className="section-heading !text-base">Live Standings Snapshot</h2>
                  {topStandings.length === 0 ? (
                    <p className="mt-4 text-sm text-text-muted">Standings unavailable.</p>
                  ) : (
                    <div className="table-scroll mt-4">
                      <table className="data-table min-w-full">
                        <thead>
                          <tr>
                            <th>#</th>
                            <th>Team</th>
                            <th>Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {topStandings.map((standing) => (
                            <tr key={standing.id}>
                              <td>#{standing.rank}</td>
                              <td className="font-semibold">{standing.teamName}</td>
                              <td className="points-cell">{standing.totalPoints}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </>
            )}

            {tab === "Standings" && (
              <div className="esports-card overflow-hidden !p-0 lg:col-span-3">
                {standings.length === 0 ? (
                  <p className="p-6 text-sm text-text-muted">Standings unavailable for this tournament.</p>
                ) : (
                  <div className="table-scroll">
                    <table className="data-table min-w-full">
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>Team</th>
                          <th>Matches</th>
                          <th>Placement</th>
                          <th>Kills</th>
                          <th>Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {standings.map((standing) => (
                          <tr key={standing.id}>
                            <td>#{standing.rank}</td>
                            <td className="font-semibold">{standing.teamName}</td>
                            <td>{standing.matches}</td>
                            <td>{standing.placementPoints}</td>
                            <td>{standing.killPoints}</td>
                            <td className="points-cell">{standing.totalPoints}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {tab === "Matches" && (
              <div className="space-y-4 lg:col-span-3">
                {matches.length === 0 ? (
                  <div className="esports-card p-6 text-sm text-text-muted">Match results unavailable for this tournament.</div>
                ) : (
                  matches.map((match) => (
                    <div key={match.id} className="esports-card overflow-hidden !p-0">
                      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-5 py-4">
                        <div>
                          <p className="text-label uppercase text-accent-blue">{match.map}</p>
                          <p className="mt-1 font-semibold text-white">Winner: {match.winner}</p>
                        </div>
                        <div className="text-sm text-text-muted">
                          <p>Total Knockouts: {match.knockouts}</p>
                          <p>{match.playedAt ?? "Schedule unavailable"}</p>
                        </div>
                      </div>
                      <div className="table-scroll">
                        <table className="data-table min-w-full">
                          <thead>
                            <tr>
                              <th>Placement</th>
                              <th>Team</th>
                              <th>Kills</th>
                              <th>Placement Pts</th>
                              <th>Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(match.teamResults ?? []).map((teamResult) => (
                              <tr key={`${match.id}-${teamResult.teamName}`}>
                                <td>#{teamResult.placement}</td>
                                <td>{teamResult.teamName}</td>
                                <td>{teamResult.kills}</td>
                                <td>{teamResult.placementPoints}</td>
                                <td className="points-cell">{teamResult.totalPoints}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {tab === "Teams" && (
              <div className="grid gap-3 sm:grid-cols-2 lg:col-span-3 lg:grid-cols-3">
                {teams.length === 0 ? (
                  <div className="esports-card p-6 text-sm text-text-muted">Team profiles unavailable for this tournament.</div>
                ) : (
                  teams.map((team) => (
                    <Link key={team.id} href={`/teams/${team.id}`} className="tournament-card flex items-center gap-3 p-4">
                      <TeamAvatar name={team.name} imageUrl={team.logoUrl ?? team.logo} />
                      <div className="min-w-0">
                        <p className="font-semibold text-white">{team.name}</p>
                        <p className="text-xs uppercase tracking-[0.16em] text-text-muted">{team.tag ?? "Registered"}</p>
                      </div>
                    </Link>
                  ))
                )}
              </div>
            )}

            {tab === "Players" && (
              <div className="esports-card overflow-hidden !p-0 lg:col-span-3">
                {players.length === 0 ? (
                  <p className="p-6 text-sm text-text-muted">Player stats unavailable for this tournament.</p>
                ) : (
                  <div className="table-scroll">
                    <table className="data-table min-w-full">
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>Player</th>
                          <th>Team</th>
                          <th>Kills</th>
                          <th>Damage</th>
                          <th>Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {players.map((player, index) => (
                          <tr key={player.id}>
                            <td>#{index + 1}</td>
                            <td className="font-semibold">{player.name}</td>
                            <td>{player.teamName ?? "Unavailable"}</td>
                            <td>{player.kills}</td>
                            <td>{player.damage.toLocaleString()}</td>
                            <td className="points-cell">{player.totalPoints ?? player.rating ?? 0}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {tab === "Rules" && (
              <div className="lg:col-span-3">
                <div className="esports-card p-6">
                  <h2 className="section-heading !text-base">Rules</h2>
                  <p className="mt-4 whitespace-pre-line text-sm text-text-muted">
                    {tournament.rules || "Rules unavailable from the source feed."}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </Tabs>
    </main>
  );
}
