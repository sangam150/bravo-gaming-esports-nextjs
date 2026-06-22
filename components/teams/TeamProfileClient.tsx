"use client";

import Link from "next/link";
import LogoBadge from "@/components/ui/LogoBadge";
import { formatDisplayNumber } from "@/lib/display-format";
import { buildTeamRosterHistory, buildUniqueMatchCount, sortMatchPlayersByPlayedAtDesc } from "@/lib/profile-derivations";
import { useBravoRealtimeData, useRealtimeMatchPlayersByTeamName, useRealtimeTeam } from "@/lib/realtime-hooks";
import type { MatchPlayerRecord, Player, Team } from "@/lib/types";

function formatPlayedAt(value?: string) {
  if (!value) return "Time unavailable";
  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kathmandu",
  }).format(parsedDate);
}

export default function TeamProfileClient({
  initialTeam,
  initialPlayers,
  initialMatchPlayers,
}: {
  initialTeam: Team;
  initialPlayers: Player[];
  initialMatchPlayers: MatchPlayerRecord[];
}) {
  const { data: liveTeam } = useRealtimeTeam(initialTeam.id, initialTeam);
  const { overview, players: livePlayers } = useBravoRealtimeData(
    { players: initialPlayers },
    {
      seasons: false,
      tournaments: false,
      standings: false,
      teams: false,
      scrims: false,
      matches: false,
      matchResults: false,
    }
  );
  const activeTeam = liveTeam ?? initialTeam;
  const playerPool = overview?.players?.length ? overview.players : livePlayers.filter((player) => player.scope !== "tournament");
  const currentRoster = playerPool.filter(
    (player) => player.teamId === activeTeam.id || player.teamName?.trim().toLowerCase() === activeTeam.name.trim().toLowerCase()
  );
  const { data: liveMatchPlayers } = useRealtimeMatchPlayersByTeamName(activeTeam.name, initialMatchPlayers);
  const orderedMatchPlayers = sortMatchPlayersByPlayedAtDesc(liveMatchPlayers);
  const previousPlayers = buildTeamRosterHistory(orderedMatchPlayers, currentRoster);
  const totalHistoricalMatches = buildUniqueMatchCount(orderedMatchPlayers);

  return (
    <main className="page-shell">
      <div className="page-inner">
        <section className="page-hero">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-center gap-6">
              <LogoBadge label={activeTeam.name} size="lg" imageUrl={activeTeam.logoUrl ?? activeTeam.logo} />
              <div className="min-w-0">
                <p className="section-title">Team Profile</p>
                <h1 className="mt-2 break-words text-4xl font-black text-white">{activeTeam.name}</h1>
                {activeTeam.tag && <p className="text-sm text-text-muted">Tag: [{activeTeam.tag}]</p>}
                <p className="mt-2 text-sm text-text-muted">
                  Slot {activeTeam.slotNumber ?? "-"} | {activeTeam.matches} matches | {activeTeam.totalPoints} points
                </p>
              </div>
            </div>
            <Link href="/teams" className="btn-esports-outline">
              Back to Teams
            </Link>
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
            {[
              { label: "Slot", value: activeTeam.slotNumber ? `#${activeTeam.slotNumber}` : "-", color: "text-accent-blue" },
              { label: "Rank", value: activeTeam.rank ? `#${activeTeam.rank}` : "-", color: "text-accent-blue" },
              { label: "Total Points", value: activeTeam.totalPoints, color: "text-accent-green" },
              { label: "Kills", value: activeTeam.kills, color: "text-white" },
              { label: "Matches", value: activeTeam.matches, color: "text-white" },
              { label: "Historical Matches", value: totalHistoricalMatches, color: "text-accent-blue" },
            ].map((stat) => (
              <div key={stat.label} className="stat-pill p-5 text-center">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-text-muted">{stat.label}</p>
                <p className={`mt-2 text-3xl font-black ${stat.color}`}>{stat.value}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-8 grid gap-6 xl:grid-cols-[1.05fr,1.95fr]">
          <div className="space-y-6">
            <div className="esports-card p-6">
              <p className="section-heading !text-sm">Current Roster</p>
              {currentRoster.length === 0 ? (
                <p className="mt-4 text-sm text-text-muted">Current roster details will appear here after admin approval.</p>
              ) : (
                <div className="mt-4 grid gap-3">
                  {currentRoster.map((player) => (
                    <Link
                      key={player.id}
                      href={`/players/${player.slug ?? player.id}`}
                      className="rounded-card border border-white/10 bg-bg-primary p-4 transition hover:border-accent-blue/30"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-semibold text-white">{player.name}</p>
                          <p className="text-xs uppercase tracking-[0.14em] text-text-muted">
                            {player.role ?? "Player"} | {player.matches} matches
                          </p>
                        </div>
                        <div className="text-right text-sm">
                          <p className="points-cell">{player.totalPoints ?? player.rating ?? 0}</p>
                          <p className="text-xs uppercase text-text-muted">Pts</p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <div className="esports-card p-6">
              <p className="section-heading !text-sm">Previous Players</p>
              {previousPlayers.length === 0 ? (
                <p className="mt-4 text-sm text-text-muted">No previous players detected from imported match history.</p>
              ) : (
                <div className="mt-4 space-y-3">
                  {previousPlayers.map((player) => (
                    <div key={player.sourcePlayerId} className="rounded-card border border-white/10 bg-bg-primary p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-semibold text-white">{player.playerName}</p>
                          <p className="text-xs uppercase tracking-[0.14em] text-text-muted">
                            Last seen {formatPlayedAt(player.latestPlayedAt)}
                          </p>
                        </div>
                        <div className="text-right text-xs text-text-muted">
                          <p>{player.matches} matches</p>
                          <p>{player.kills} kills</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="esports-card overflow-hidden !p-0">
            <div className="border-b border-white/10 px-5 py-4">
              <p className="section-heading !text-sm">Match-Level Roster History</p>
              <p className="mt-1 text-sm text-text-muted">
                Every imported appearance stays attached to the team the player represented in that specific match.
              </p>
            </div>
            {orderedMatchPlayers.length === 0 ? (
              <div className="p-8 text-center text-sm text-text-muted">Historical match appearances will appear here after results are approved.</div>
            ) : (
              <div className="table-scroll">
                <table className="data-table min-w-full">
                  <thead>
                    <tr>
                      <th>Player</th>
                      <th>Match</th>
                      <th>Map</th>
                      <th>Place</th>
                      <th>Kills</th>
                      <th>Damage</th>
                      <th>Total</th>
                      <th>Played</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orderedMatchPlayers.slice(0, 20).map((matchPlayer) => (
                      <tr key={matchPlayer.id}>
                        <td className="font-semibold text-white">{matchPlayer.playerName}</td>
                        <td className="font-mono-stat text-xs text-text-muted">{matchPlayer.pubgMatchId}</td>
                        <td>{matchPlayer.map ?? "-"}</td>
                        <td>#{matchPlayer.placement}</td>
                        <td>{matchPlayer.kills}</td>
                        <td>{formatDisplayNumber(matchPlayer.damage)}</td>
                        <td className="points-cell">{matchPlayer.totalPoints}</td>
                        <td className="text-text-muted">{formatPlayedAt(matchPlayer.playedAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
