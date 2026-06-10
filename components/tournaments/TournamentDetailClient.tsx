"use client";

import Link from "next/link";
import { compareBravoTeamSlotOrder, resolveBravoTeamIdentity } from "@/lib/bravo-teams";
import StatusBadge from "@/components/ui/StatusBadge";
import Tabs from "@/components/ui/Tabs";
import TeamAvatar from "@/components/ui/TeamAvatar";
import {
  sortTournamentMatches,
  sortTournamentPlayers,
  useRealtimeTournament,
  useRealtimeTournamentMatches,
  useRealtimeTournamentPlayers,
  useRealtimeTournamentStandings,
  useRealtimeTournamentTeams,
} from "@/lib/realtime-hooks";
import type { Player, Team, Tournament, TournamentMatch, TournamentStanding } from "@/lib/types";

function formatLabel(value?: string) {
  return value && value.trim().length > 0 ? value : "Unavailable";
}

function getTeamProfileHref(teamName: string, fallbackId: string) {
  return `/teams/${resolveBravoTeamIdentity(teamName)?.id ?? fallbackId}`;
}

function sortTeamResultsBySlot(teamResults: TournamentMatch["teamResults"]) {
  return [...(teamResults ?? [])].sort((firstResult, secondResult) =>
    compareBravoTeamSlotOrder(
      { slotNumber: firstResult.slotNumber, teamName: firstResult.teamName },
      { slotNumber: secondResult.slotNumber, teamName: secondResult.teamName }
    )
  );
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
  const { data: liveTournament } = useRealtimeTournament(tournament.id, tournament);
  const { data: liveMatches } = useRealtimeTournamentMatches(tournament.id, matches);
  const { data: liveTeams } = useRealtimeTournamentTeams(tournament.id, teams);
  const { data: livePlayers } = useRealtimeTournamentPlayers(tournament.id, players);
  const { data: liveStandings } = useRealtimeTournamentStandings(tournament.id, standings);

  const activeTournament = liveTournament ?? tournament;
  const activeMatches = sortTournamentMatches(liveMatches);
  const activeTeams = [...liveTeams].sort((firstTeam, secondTeam) => compareBravoTeamSlotOrder(firstTeam, secondTeam));
  const activePlayers = sortTournamentPlayers(livePlayers);
  const activeStandings = [...liveStandings].sort(
    (firstStanding, secondStanding) =>
      (firstStanding.rank ?? Number.POSITIVE_INFINITY) - (secondStanding.rank ?? Number.POSITIVE_INFINITY) ||
      secondStanding.totalPoints - firstStanding.totalPoints
  );
  const topStandings = activeStandings.slice(0, 5);

  return (
    <main className="page-shell">
      <div className="page-inner">
      <div className="page-hero mb-6 overflow-hidden">
        {activeTournament.bannerUrl && (
          <div
            className="absolute inset-0 opacity-15"
            style={{
              backgroundImage: `url(${activeTournament.bannerUrl})`,
              backgroundPosition: "center",
              backgroundSize: "cover",
            }}
          />
        )}
        <div className="relative z-10 flex flex-wrap items-start gap-4">
          <TeamAvatar name={activeTournament.title} size="lg" imageUrl={activeTournament.bannerUrl} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-3">
              {activeTournament.seasonTitle && (
                <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-text-muted">
                  {activeTournament.seasonTitle}
                </span>
              )}
              <h1 className="font-display text-2xl font-black uppercase text-white">{activeTournament.title}</h1>
              <StatusBadge status={activeTournament.status} />
              <span className="rounded-full border border-accent-blue/30 bg-accent-blue/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-accent-blue">
                {activeTournament.tier}
              </span>
              {typeof (activeTournament.seasonDayNumber ?? activeTournament.dayNumber) === "number" && (
                <span className="rounded-full border border-accent-green/25 bg-accent-green/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-accent-green">
                  Day {activeTournament.seasonDayNumber ?? activeTournament.dayNumber}
                </span>
              )}
            </div>
            <div className="mt-4 grid grid-cols-2 gap-4 text-sm sm:grid-cols-3 xl:grid-cols-6">
              <div>
                <span className="text-label uppercase text-text-muted">Region</span>
                <p className="font-mono-stat text-white">{formatLabel(activeTournament.server)}</p>
              </div>
              <div>
                <span className="text-label uppercase text-text-muted">Mode</span>
                <p className="font-mono-stat text-white">{formatLabel(activeTournament.format)}</p>
              </div>
              <div>
                <span className="text-label uppercase text-text-muted">Perspective</span>
                <p className="font-mono-stat text-white">{formatLabel(activeTournament.perspective)}</p>
              </div>
              <div>
                <span className="text-label uppercase text-text-muted">Prize Pool</span>
                <p className="font-mono-stat font-bold text-accent-green">{activeTournament.prizePool}</p>
              </div>
              <div>
                <span className="text-label uppercase text-text-muted">Teams Joined</span>
                <p className="font-mono-stat text-white">
                  {activeTournament.teamCount}/{activeTournament.maxTeams}
                </p>
              </div>
              <div>
                <span className="text-label uppercase text-text-muted">Matches</span>
                <p className="font-mono-stat text-accent-blue">
                  {activeMatches.length}/{activeTournament.matchCount ?? activeMatches.length}
                </p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-3 text-xs uppercase tracking-[0.18em] text-text-muted">
              <span>Started: {formatLabel(activeTournament.startDate)}</span>
              {activeTournament.endDate && <span>Ended: {activeTournament.endDate}</span>}
              {activeTournament.sourceUrl && (
                <a href={activeTournament.sourceUrl} target="_blank" rel="noreferrer" className="text-accent-blue hover:underline">
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
                      {activeTournament.description || "Description unavailable from the source feed."}
                    </p>
                    <div className="mt-6 grid gap-3 text-sm text-text-muted sm:grid-cols-2">
                      <p>Format: {formatLabel(activeTournament.format)}</p>
                      <p>Game: {formatLabel(activeTournament.mode)}</p>
                      <p>Region: {formatLabel(activeTournament.server)}</p>
                      <p>Perspective: {formatLabel(activeTournament.perspective)}</p>
                      <p>Day: {activeTournament.dayNumber ? `Day ${activeTournament.dayNumber}` : "Unavailable"}</p>
                      <p>Source Status: {formatLabel(activeTournament.sourceStatus)}</p>
                    </div>
                  </div>
                </div>
                <div className="esports-card p-6">
                  <h2 className="section-heading !text-base">Live Standings Snapshot</h2>
                  {topStandings.length === 0 ? (
                    <p className="mt-4 text-sm text-text-muted">Matches not imported yet for this day.</p>
                  ) : (
                    <div className="table-scroll mt-4">
                      <table className="data-table min-w-full">
                        <thead>
                          <tr>
                            <th>#</th>
                            <th>Slot</th>
                            <th>Team</th>
                            <th>Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {topStandings.map((standing) => (
                            <tr key={standing.id}>
                              <td>#{standing.rank}</td>
                              <td>{standing.slotNumber ? `#${standing.slotNumber}` : "-"}</td>
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
                {activeStandings.length === 0 ? (
                  <p className="p-6 text-sm text-text-muted">Matches not imported yet for this day.</p>
                ) : (
                  <div className="table-scroll">
                    <table className="data-table min-w-full">
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>Slot</th>
                          <th>Team</th>
                          <th>Matches</th>
                          <th>Placement</th>
                          <th>Kills</th>
                          <th>Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {activeStandings.map((standing) => (
                          <tr key={standing.id}>
                            <td>#{standing.rank}</td>
                            <td>{standing.slotNumber ? `#${standing.slotNumber}` : "-"}</td>
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
                {activeMatches.length === 0 ? (
                  <div className="esports-card p-6 text-sm text-text-muted">Matches not imported yet for this day.</div>
                ) : (
                  activeMatches.map((match) => (
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
                              <th>Slot</th>
                              <th>Placement</th>
                              <th>Team</th>
                              <th>Kills</th>
                              <th>Placement Pts</th>
                              <th>Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {sortTeamResultsBySlot(match.teamResults).map((teamResult) => (
                              <tr key={`${match.id}-${teamResult.teamName}`}>
                                <td>{teamResult.slotNumber ? `#${teamResult.slotNumber}` : "-"}</td>
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
                {activeTeams.length === 0 ? (
                  <div className="esports-card p-6 text-sm text-text-muted">Team entries will appear after matches are imported for this day.</div>
                ) : (
                  activeTeams.map((team) => (
                    <Link
                      key={team.id}
                      href={getTeamProfileHref(team.name, team.id)}
                      className="tournament-card flex items-center gap-3 p-4"
                    >
                      <TeamAvatar name={team.name} imageUrl={team.logoUrl ?? team.logo} />
                      <div className="min-w-0">
                        <p className="font-semibold text-white">{team.name}</p>
                        <p className="text-xs uppercase tracking-[0.16em] text-text-muted">
                          {team.slotNumber ? `Slot ${team.slotNumber}` : team.tag ?? "Registered"}
                        </p>
                      </div>
                    </Link>
                  ))
                )}
              </div>
            )}

            {tab === "Players" && (
              <div className="esports-card overflow-hidden !p-0 lg:col-span-3">
                {activePlayers.length === 0 ? (
                  <p className="p-6 text-sm text-text-muted">Player stats will appear after matches are imported for this day.</p>
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
                        {activePlayers.map((player, index) => (
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
                    {activeTournament.rules || "Rules unavailable from the source feed."}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </Tabs>
      </div>
    </main>
  );
}
