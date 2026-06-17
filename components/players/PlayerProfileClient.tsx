"use client";

import Link from "next/link";
import { buildPlayerPreferredTeam, buildPlayerTeamHistory, sortMatchPlayersByPlayedAtDesc } from "@/lib/profile-derivations";
import { useRealtimeMatchPlayersBySourcePlayerId, useRealtimePlayer, useRealtimeTeam } from "@/lib/realtime-hooks";
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

export default function PlayerProfileClient({
  initialPlayer,
  initialTeam,
  initialMatchPlayers,
}: {
  initialPlayer: Player;
  initialTeam: Team | null;
  initialMatchPlayers: MatchPlayerRecord[];
}) {
  const { data: livePlayer } = useRealtimePlayer(initialPlayer.id, initialPlayer);
  const activePlayer = livePlayer ?? initialPlayer;
  const { data: liveTeam } = useRealtimeTeam(activePlayer.teamId ?? initialTeam?.id ?? "", initialTeam);
  const { data: liveMatchPlayers } = useRealtimeMatchPlayersBySourcePlayerId(
    activePlayer.pubgId ?? activePlayer.name ?? initialMatchPlayers[0]?.sourcePlayerId,
    initialMatchPlayers
  );
  const orderedMatchPlayers = sortMatchPlayersByPlayedAtDesc(liveMatchPlayers);
  const teamHistory = buildPlayerTeamHistory(orderedMatchPlayers);
  const preferredTeam = buildPlayerPreferredTeam(orderedMatchPlayers);
  const activeTeam = liveTeam ?? initialTeam;

  const stats = [
    { label: "Kills", value: activePlayer.kills, accent: "text-accent-red" },
    { label: "Damage", value: activePlayer.damage.toLocaleString(), accent: "text-accent-blue" },
    { label: "Assists", value: activePlayer.assists ?? 0, accent: "text-accent-green" },
    { label: "MVP Awards", value: activePlayer.mvpCount, accent: "text-amber-400" },
    { label: "Matches", value: activePlayer.matches, accent: "text-white" },
    { label: "Rating", value: activePlayer.rating ?? "-", accent: "text-accent-blue" },
  ];

  return (
    <main className="page-shell">
      <div className="page-inner">
        <section className="page-hero">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-center gap-6">
              <div
                className={`relative flex h-28 w-28 items-center justify-center rounded-3xl border-2 text-4xl font-black shadow-[0_0_40px_rgba(29,155,240,0.15)] ${
                  activePlayer.isMvpOfWeek
                    ? "border-amber-500/40 bg-gradient-to-br from-amber-500/20 to-slate-900 text-amber-400"
                    : "border-accent-blue/30 bg-gradient-to-br from-accent-blue/20 to-slate-900 text-accent-blue"
                }`}
              >
                {activePlayer.name.slice(0, 2).toUpperCase()}
                {activePlayer.isMvpOfWeek && (
                  <span className="absolute -right-2 -top-2 rounded-full bg-amber-500/15 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-amber-300">
                    MVP
                  </span>
                )}
              </div>
              <div className="min-w-0">
                <p className="section-title">Player Profile</p>
                <h1 className="mt-2 break-words text-4xl font-black text-white">{activePlayer.name}</h1>
                {activePlayer.isMvpOfWeek && (
                  <span className="mt-2 inline-flex rounded-full bg-amber-500/15 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-amber-400">
                    MVP of the Week
                  </span>
                )}
                {(activeTeam || preferredTeam) && (
                  <p className="mt-2 text-sm text-text-muted">
                    Current team: {activeTeam?.name ?? preferredTeam?.teamName ?? "Unknown"}
                  </p>
                )}
                {activeTeam && (
                  <Link href={`/teams/${activeTeam.id}`} className="mt-2 block text-sm font-semibold text-accent-blue hover:underline">
                    View Team Profile
                  </Link>
                )}
              </div>
            </div>
            <Link href="/players" className="btn-esports-outline">
              Back to Players
            </Link>
          </div>

          <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {stats.map((stat) => (
              <div key={stat.label} className="stat-pill p-5">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-text-muted">{stat.label}</p>
                <p className={`mt-2 text-3xl font-black ${stat.accent}`}>{stat.value}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-8 grid gap-6 xl:grid-cols-[1.05fr,1.95fr]">
          <div className="space-y-6">
            <div className="esports-card p-6">
              <p className="section-heading !text-sm">Team History</p>
              {teamHistory.length === 0 ? (
                <p className="mt-4 text-sm text-text-muted">Team history will appear here after approved match results are available.</p>
              ) : (
                <div className="mt-4 space-y-3">
                  {teamHistory.map((teamEntry) => (
                    <div key={`${teamEntry.teamId ?? teamEntry.teamName}`} className="rounded-card border border-white/10 bg-bg-primary p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-semibold text-white">{teamEntry.teamName}</p>
                          <p className="text-xs uppercase tracking-[0.14em] text-text-muted">
                            {teamEntry.matches} matches | Last seen {formatPlayedAt(teamEntry.latestPlayedAt)}
                          </p>
                        </div>
                        <div className="text-right text-xs text-text-muted">
                          <p>{teamEntry.kills} kills</p>
                          <p>{teamEntry.assists} assists</p>
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
              <p className="section-heading !text-sm">Match History</p>
              <p className="mt-1 text-sm text-text-muted">
                Historical stats stay tied to the team this player represented in each imported match.
              </p>
            </div>
            {orderedMatchPlayers.length === 0 ? (
              <div className="p-8 text-center text-sm text-text-muted">Player match history will appear here after approved results are available.</div>
            ) : (
              <div className="table-scroll">
                <table className="data-table min-w-full">
                  <thead>
                    <tr>
                      <th>Team</th>
                      <th>Match</th>
                      <th>Map</th>
                      <th>Place</th>
                      <th>Kills</th>
                      <th>Damage</th>
                      <th>Assists</th>
                      <th>Total</th>
                      <th>Played</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orderedMatchPlayers.slice(0, 20).map((matchPlayer) => (
                      <tr key={matchPlayer.id}>
                        <td className="font-semibold text-white">{matchPlayer.teamName}</td>
                        <td className="font-mono-stat text-xs text-text-muted">{matchPlayer.pubgMatchId}</td>
                        <td>{matchPlayer.map ?? "-"}</td>
                        <td>#{matchPlayer.placement}</td>
                        <td>{matchPlayer.kills}</td>
                        <td>{matchPlayer.damage.toLocaleString()}</td>
                        <td>{matchPlayer.assists}</td>
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
