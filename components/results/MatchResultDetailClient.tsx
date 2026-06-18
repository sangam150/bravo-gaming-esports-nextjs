"use client";

import Link from "next/link";
import { compareMatchPlayerResults, compareMatchTeamResults } from "@/lib/ranking-sort";
import { useRealtimeMatchResult } from "@/lib/realtime-hooks";
import type { MatchPlayerResult, TournamentMatch } from "@/lib/types";

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

function formatSurvivalTime(totalSeconds?: number) {
  if (!Number.isFinite(totalSeconds)) return "-";
  const minutes = Math.floor((totalSeconds ?? 0) / 60);
  const seconds = Math.floor((totalSeconds ?? 0) % 60);
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function sortTeamResults(match: TournamentMatch) {
  return [...(match.teamResults ?? [])].sort(
    (firstResult, secondResult) => compareMatchTeamResults(firstResult, secondResult)
  );
}

function getMvp(match: TournamentMatch): MatchPlayerResult | null {
  const playerResults = [...(match.playerResults ?? [])];
  if (playerResults.length === 0) return null;

  return (
    playerResults.sort(
      (firstPlayer, secondPlayer) =>
        secondPlayer.totalPoints - firstPlayer.totalPoints ||
        secondPlayer.kills - firstPlayer.kills ||
        secondPlayer.damage - firstPlayer.damage ||
        secondPlayer.assists - firstPlayer.assists ||
        firstPlayer.playerName.localeCompare(secondPlayer.playerName)
    )[0] ?? null
  );
}

export default function MatchResultDetailClient({ initialMatch }: { initialMatch: TournamentMatch }) {
  const { data: liveMatch } = useRealtimeMatchResult(initialMatch.id, initialMatch);
  const activeMatch = liveMatch ?? initialMatch;
  const sortedTeamResults = sortTeamResults(activeMatch);
  const sortedPlayerResults = [...(activeMatch.playerResults ?? [])].sort((firstPlayer, secondPlayer) =>
    compareMatchPlayerResults(firstPlayer, secondPlayer)
  );
  const mvp = getMvp(activeMatch);
  const matchAssets = Array.from(
    new Set(
      [activeMatch.resultImageUrl, activeMatch.scoreboardImageUrl, activeMatch.resultScreenshotUrl, ...(activeMatch.screenshotUrls ?? [])].filter(
        (value): value is string => Boolean(value)
      )
    )
  );

  return (
    <main className="page-shell">
      <div className="page-inner space-y-8">
        <section className="page-hero p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="section-title">Match Result</p>
              <h1 className="hero-h1 mt-2 !text-4xl">
                Match {activeMatch.sequenceNumber ?? "-"} | {activeMatch.map}
              </h1>
              <p className="mt-4 text-sm text-text-muted">
                PUBG Match ID: <span className="font-mono text-white">{activeMatch.pubgMatchId}</span>
              </p>
              <p className="mt-1 text-sm text-text-muted">Played: {formatPlayedAt(activeMatch.playedAt)}</p>
              {activeMatch.tournamentId && (
                <Link href={`/tournaments/${activeMatch.tournamentId}`} className="mt-3 inline-flex text-sm font-semibold text-accent-blue hover:underline">
                  Back to Day Results
                </Link>
              )}
            </div>
            <Link href="/results" className="btn-secondary">
              Back to Results
            </Link>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="esports-card p-5">
            <p className="text-xs uppercase tracking-[0.14em] text-text-muted">Winner</p>
            <p className="mt-3 text-lg font-black text-white">{activeMatch.winner}</p>
          </div>
          <div className="esports-card p-5">
            <p className="text-xs uppercase tracking-[0.14em] text-text-muted">Teams</p>
            <p className="mt-3 text-3xl font-black text-white">{sortedTeamResults.length}</p>
          </div>
          <div className="esports-card p-5">
            <p className="text-xs uppercase tracking-[0.14em] text-text-muted">Players</p>
            <p className="mt-3 text-3xl font-black text-white">{activeMatch.playerResults?.length ?? 0}</p>
          </div>
          <div className="esports-card p-5">
            <p className="text-xs uppercase tracking-[0.14em] text-text-muted">Lobby Kills</p>
            <p className="mt-3 text-3xl font-black text-white">{activeMatch.knockouts}</p>
          </div>
        </section>

        {activeMatch.vodUrl || matchAssets.length > 0 ? (
          <section className="grid gap-6 xl:grid-cols-[0.8fr,1.2fr]">
            <div className="esports-card p-6">
              <p className="section-heading !text-sm">Broadcast Assets</p>
              <p className="mt-2 text-sm text-text-muted">
                Uploaded result posters, scoreboard captures, screenshots, and VOD links stay attached to the public match page.
              </p>
              <div className="mt-5 space-y-3">
                {activeMatch.vodUrl ? (
                  <a href={activeMatch.vodUrl} target="_blank" rel="noreferrer" className="btn-primary inline-flex">
                    Open VOD
                  </a>
                ) : null}
                <div className="rounded-card border border-white/10 bg-bg-primary p-4">
                  <p className="text-xs uppercase tracking-[0.14em] text-text-muted">Stored assets</p>
                  <p className="mt-2 font-mono-stat text-white">{matchAssets.length}</p>
                </div>
              </div>
            </div>

            <div className="esports-card p-6">
              <p className="section-heading !text-sm">Result Gallery</p>
              {matchAssets.length > 0 ? (
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  {matchAssets.map((assetUrl) => (
                    <a key={assetUrl} href={assetUrl} target="_blank" rel="noreferrer" className="overflow-hidden rounded-card border border-white/10 bg-bg-primary transition hover:border-accent-blue/30">
                      <img src={assetUrl} alt="Match result asset" className="h-44 w-full object-cover" />
                    </a>
                  ))}
                </div>
              ) : (
                <p className="mt-4 text-sm text-text-muted">No uploaded result assets yet.</p>
              )}
            </div>
          </section>
        ) : null}

        <section className="grid gap-6 xl:grid-cols-[1.6fr,1fr]">
          <div className="esports-card overflow-hidden !p-0">
            <div className="border-b border-white/10 px-5 py-4">
              <p className="section-heading !text-sm">Placement Table</p>
              <p className="mt-1 text-sm text-text-muted">Placement points, kills, and total points for every team.</p>
            </div>
            <div className="table-scroll">
              <table className="data-table min-w-full">
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Slot</th>
                    <th>Team</th>
                    <th>Kills</th>
                    <th>Placement Pts</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedTeamResults.map((teamResult) => (
                    <tr key={`${activeMatch.id}-${teamResult.teamName}`}>
                      <td>#{teamResult.placement}</td>
                      <td>{teamResult.slotNumber ? `#${teamResult.slotNumber}` : "-"}</td>
                      <td className="font-semibold text-white">{teamResult.teamName}</td>
                      <td>{teamResult.kills}</td>
                      <td>{teamResult.placementPoints}</td>
                      <td className="points-cell">{teamResult.totalPoints}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="esports-card p-6">
            <p className="section-heading !text-sm">Match MVP</p>
            {mvp ? (
              <div className="mt-4 space-y-4">
                <div>
                  <p className="text-2xl font-black text-white">{mvp.playerName}</p>
                  <p className="mt-1 text-sm text-text-muted">
                    {mvp.teamName} {mvp.slotNumber ? `| Slot ${mvp.slotNumber}` : ""}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-card border border-white/10 bg-bg-primary p-3">
                    <p className="text-xs uppercase tracking-[0.14em] text-text-muted">Kills</p>
                    <p className="mt-2 font-mono-stat text-white">{mvp.kills}</p>
                  </div>
                  <div className="rounded-card border border-white/10 bg-bg-primary p-3">
                    <p className="text-xs uppercase tracking-[0.14em] text-text-muted">Assists</p>
                    <p className="mt-2 font-mono-stat text-white">{mvp.assists}</p>
                  </div>
                  <div className="rounded-card border border-white/10 bg-bg-primary p-3">
                    <p className="text-xs uppercase tracking-[0.14em] text-text-muted">Damage</p>
                    <p className="mt-2 font-mono-stat text-white">{mvp.damage.toLocaleString()}</p>
                  </div>
                  <div className="rounded-card border border-white/10 bg-bg-primary p-3">
                    <p className="text-xs uppercase tracking-[0.14em] text-text-muted">Survival</p>
                    <p className="mt-2 font-mono-stat text-white">{formatSurvivalTime(mvp.survivalTime)}</p>
                  </div>
                </div>
              </div>
            ) : (
              <p className="mt-4 text-sm text-text-muted">Player-level stats are not available for this match yet.</p>
            )}
          </div>
        </section>

        <section className="esports-card overflow-hidden !p-0">
          <div className="border-b border-white/10 px-5 py-4">
            <p className="section-heading !text-sm">Player Statistics</p>
            <p className="mt-1 text-sm text-text-muted">Kills, damage, assists, survival time, and total points.</p>
          </div>
          {activeMatch.playerResults && activeMatch.playerResults.length > 0 ? (
            <div className="table-scroll">
              <table className="data-table min-w-[1100px]">
                <thead>
                  <tr>
                    <th>Player</th>
                    <th>Team</th>
                    <th>Slot</th>
                    <th>Kills</th>
                    <th>Damage</th>
                    <th>Assists</th>
                    <th>Knocks</th>
                    <th>Survival</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedPlayerResults.map((playerResult) => (
                    <tr key={`${activeMatch.id}-${playerResult.pubgPlayerId ?? playerResult.playerName}`}>
                      <td className="font-semibold text-white">{playerResult.playerName}</td>
                      <td>{playerResult.teamName}</td>
                      <td>{playerResult.slotNumber ? `#${playerResult.slotNumber}` : "-"}</td>
                      <td>{playerResult.kills}</td>
                      <td>{playerResult.damage.toLocaleString()}</td>
                      <td>{playerResult.assists}</td>
                      <td>{playerResult.knocks}</td>
                      <td>{formatSurvivalTime(playerResult.survivalTime)}</td>
                      <td className="points-cell">{playerResult.totalPoints}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-8 text-center text-sm text-text-muted">Player statistics have not been stored for this match yet.</div>
          )}
        </section>
      </div>
    </main>
  );
}
