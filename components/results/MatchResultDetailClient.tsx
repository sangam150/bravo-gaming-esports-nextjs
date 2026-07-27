"use client";

import Tabs from "@/components/ui/Tabs";
import TeamAvatar from "@/components/ui/TeamAvatar";
import { formatDisplayNumber } from "@/lib/display-format";
import { compareMatchPlayerResults, compareMatchTeamResults } from "@/lib/ranking-sort";
import { useRealtimeMatchResult } from "@/lib/realtime-hooks";
import type { MatchPlayerResult, TournamentMatch } from "@/lib/types";
import Image from "next/image";
import Link from "next/link";

function readText(value?: string | null, fallback = "TBD") {
  const normalizedValue = value?.trim();
  return normalizedValue ? normalizedValue : fallback;
}

function readNumber(value?: number | null, fallback = 0) {
  return Number.isFinite(value) ? Number(value) : fallback;
}

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
  return [...(match.teamResults ?? [])]
    .map((teamResult) => ({
      ...teamResult,
      teamName: readText(teamResult.teamName),
      placement: readNumber(teamResult.placement),
      kills: readNumber(teamResult.kills),
      placementPoints: readNumber(teamResult.placementPoints),
      totalPoints: readNumber(teamResult.totalPoints),
    }))
    .sort((firstResult, secondResult) => compareMatchTeamResults(firstResult, secondResult));
}

function sortPlayerResults(match: TournamentMatch) {
  return [...(match.playerResults ?? [])]
    .map((playerResult) => ({
      ...playerResult,
      playerName: readText(playerResult.playerName),
      teamName: readText(playerResult.teamName),
      kills: readNumber(playerResult.kills),
      assists: readNumber(playerResult.assists),
      knocks: readNumber(playerResult.knocks),
      damage: readNumber(playerResult.damage),
      survivalTime: readNumber(playerResult.survivalTime),
      totalPoints: readNumber(playerResult.totalPoints),
    }))
    .sort((firstPlayer, secondPlayer) => compareMatchPlayerResults(firstPlayer, secondPlayer));
}

function getMvp(match: TournamentMatch): MatchPlayerResult | null {
  const playerResults = sortPlayerResults(match);
  if (playerResults.length === 0) return null;

  return (
    playerResults.sort(
      (firstPlayer, secondPlayer) =>
        secondPlayer.totalPoints - firstPlayer.totalPoints ||
        secondPlayer.kills - firstPlayer.kills ||
        secondPlayer.damage - firstPlayer.damage ||
        secondPlayer.assists - firstPlayer.assists ||
        firstPlayer.playerName.localeCompare(secondPlayer.playerName),
    )[0] ?? null
  );
}

function MatchMetaCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="stat-pill !p-4">
      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-text-muted">{label}</p>
      <p className="mt-2 font-mono-stat text-lg text-white">{value}</p>
    </div>
  );
}

export default function MatchResultDetailClient({ initialMatch }: { initialMatch: TournamentMatch }) {
  const { data: liveMatch } = useRealtimeMatchResult(initialMatch.id, initialMatch);
  const activeMatch = liveMatch ?? initialMatch;
  const sortedTeamResults = sortTeamResults(activeMatch);
  const sortedPlayerResults = sortPlayerResults(activeMatch);
  const mvp = getMvp(activeMatch);
  const matchAssets = Array.from(
    new Set(
      [
        activeMatch.resultImageUrl,
        activeMatch.scoreboardImageUrl,
        activeMatch.resultScreenshotUrl,
        ...(activeMatch.screenshotUrls ?? []),
      ].filter((value): value is string => Boolean(value)),
    ),
  );
  const lobbyDuration =
    sortedPlayerResults.length > 0 ? Math.max(...sortedPlayerResults.map((playerResult) => playerResult.survivalTime ?? 0)) : undefined;
  const tabs = ["Overview", "Teams", "Players"];

  return (
    <main className="page-shell pb-10 pt-5">
      <div className="page-stack">
        <section className="page-hero">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0">
              <p className="section-title">03. Match Detail Page</p>
              <h1 className="hero-h1 mt-4 max-w-[11ch]">{readText(activeMatch.eventName, "Bravo Daily Scrims")}</h1>
              <p className="mt-4 text-sm leading-7 text-text-secondary">
                {readText(activeMatch.map)} | Match {activeMatch.sequenceNumber ?? activeMatch.matchNumber ?? "-"} | PUBG Match ID{" "}
                <span className="font-mono text-white">{readText(activeMatch.pubgMatchId)}</span>
              </p>
            </div>

            <div className="rounded-[24px] border border-white/[0.06] bg-black/20 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
              <div className="flex items-center justify-between gap-4">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-accent-blue">Match State</p>
                <span className="rounded-full border border-accent-green/30 bg-accent-green/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-accent-green">
                  Completed
                </span>
              </div>
              <p className="mt-3 text-sm leading-7 text-text-muted">
                Full standings, lobby statistics, and player performance for this completed match.
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <Link href="/pubg/results" className="btn-secondary">
                  Back to Results
                </Link>
                {activeMatch.vodUrl ? (
                  <a href={activeMatch.vodUrl} target="_blank" rel="noreferrer" className="btn-watch-live">
                    Watch VOD
                  </a>
                ) : null}
              </div>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <MatchMetaCard label="Date" value={formatPlayedAt(activeMatch.playedAt)} />
            <MatchMetaCard label="Duration" value={formatSurvivalTime(lobbyDuration)} />
            <MatchMetaCard label="Match ID" value={readText(activeMatch.pubgMatchId)} />
            <MatchMetaCard label="Players" value={`${activeMatch.playerResults?.length ?? 0}`} />
            <MatchMetaCard label="Winner" value={readText(activeMatch.winner)} />
          </div>
        </section>

        <Tabs tabs={tabs}>
          {(activeTab) => (
            <div className="grid gap-6">
              {activeTab === "Overview" ? (
                <section className="grid gap-6 xl:grid-cols-[1.2fr,0.8fr]">
                  <div className="esports-card overflow-hidden !p-0">
                    <div className="border-b border-white/[0.06] px-5 py-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="section-title">Overview</p>
                          <h2 className="mt-2 font-display text-xl font-black uppercase text-white">Placement Table</h2>
                        </div>
                        <p className="text-xs uppercase tracking-[0.16em] text-text-muted">Teams ranked by total points</p>
                      </div>
                    </div>
                    <div className="table-scroll">
                      <table className="data-table min-w-full">
                        <thead>
                          <tr>
                            <th>#</th>
                            <th>Team</th>
                            <th className="text-right">Placement</th>
                            <th className="text-right">Kills</th>
                            <th className="text-right">Points</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sortedTeamResults.map((teamResult, index) => (
                            <tr key={`${activeMatch.id}-${teamResult.teamId ?? teamResult.teamName}-${index}`}>
                              <td className="font-mono-stat text-accent-blue-light">#{teamResult.placement || index + 1}</td>
                              <td>
                                <div className="flex items-center gap-3">
                                  <TeamAvatar name={teamResult.teamName} size="sm" />
                                  <span className="font-semibold text-white">{teamResult.teamName}</span>
                                </div>
                              </td>
                              <td className="text-right">{readNumber(teamResult.placementPoints)}</td>
                              <td className="text-right">{readNumber(teamResult.kills)}</td>
                              <td className="points-cell text-right">{readNumber(teamResult.totalPoints)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="grid gap-6">
                    <div className="esports-card p-5">
                      <p className="section-title">Map</p>
                      <div className="mt-3 overflow-hidden rounded-[20px] border border-white/[0.06] bg-[radial-gradient(circle_at_top_left,rgba(47,152,255,0.2),transparent_32%),linear-gradient(180deg,rgba(16,24,43,0.96),rgba(8,14,28,0.96))]">
                        {matchAssets[0] ? (
                          <Image
                            src={matchAssets[0]}
                            alt={`${readText(activeMatch.map)} match asset`}
                            width={1200}
                            height={400}
                            className="h-52 w-full object-cover opacity-80"
                          />
                        ) : (
                          <div className="flex h-52 items-end p-5">
                            <div>
                              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-accent-blue">Map Spotlight</p>
                              <p className="mt-2 font-display text-2xl font-black uppercase text-white">{readText(activeMatch.map)}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="esports-card p-5">
                      <p className="section-title">Match MVP</p>
                      {mvp ? (
                        <div className="mt-4">
                          <div className="flex items-center gap-3">
                            <TeamAvatar name={readText(mvp.playerName)} size="lg" />
                            <div>
                              <p className="font-display text-2xl font-black uppercase text-white">{readText(mvp.playerName)}</p>
                              <p className="text-sm text-text-muted">{readText(mvp.teamName)}</p>
                            </div>
                          </div>
                          <div className="mt-4 grid grid-cols-2 gap-3">
                            <MatchMetaCard label="Kills" value={mvp.kills} />
                            <MatchMetaCard label="Assists" value={mvp.assists} />
                            <MatchMetaCard label="Damage" value={formatDisplayNumber(mvp.damage)} />
                            <MatchMetaCard label="Survival" value={formatSurvivalTime(mvp.survivalTime)} />
                          </div>
                        </div>
                      ) : (
                        <p className="mt-4 text-sm leading-7 text-text-muted">
                          Player-level statistics are not available for this match yet.
                        </p>
                      )}
                    </div>
                  </div>
                </section>
              ) : null}

              {activeTab === "Teams" || activeTab === "Overview" ? (
                <section className="esports-card overflow-hidden !p-0">
                  <div className="border-b border-white/[0.06] px-5 py-4">
                    <p className="section-title">{activeTab === "Teams" ? "Teams" : "Lobby Board"}</p>
                    <h2 className="mt-2 font-display text-xl font-black uppercase text-white">Full Team Results</h2>
                  </div>
                  <div className="table-scroll">
                    <table className="data-table min-w-full">
                      <thead>
                        <tr>
                          <th>Rank</th>
                          <th>Slot</th>
                          <th>Team</th>
                          <th className="text-right">Kills</th>
                          <th className="text-right">Placement Pts</th>
                          <th className="text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sortedTeamResults.map((teamResult, index) => (
                          <tr key={`${activeMatch.id}-${teamResult.teamId ?? teamResult.teamName}-teams-${index}`}>
                            <td className="font-mono-stat text-accent-blue-light">#{teamResult.placement || index + 1}</td>
                            <td>{teamResult.slotNumber ? `#${teamResult.slotNumber}` : "-"}</td>
                            <td className="font-semibold text-white">{readText(teamResult.teamName)}</td>
                            <td className="text-right">{readNumber(teamResult.kills)}</td>
                            <td className="text-right">{readNumber(teamResult.placementPoints)}</td>
                            <td className="points-cell text-right">{readNumber(teamResult.totalPoints)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              ) : null}

              {activeTab === "Players" ? (
                <section className="esports-card overflow-hidden !p-0">
                  <div className="border-b border-white/[0.06] px-5 py-4">
                    <p className="section-title">Players</p>
                    <h2 className="mt-2 font-display text-xl font-black uppercase text-white">Full Player Statistics</h2>
                  </div>
                  {sortedPlayerResults.length > 0 ? (
                    <div className="table-scroll">
                      <table className="data-table min-w-[1100px]">
                        <thead>
                          <tr>
                            <th>Player</th>
                            <th>Team</th>
                            <th>Slot</th>
                            <th className="text-right">Kills</th>
                            <th className="text-right">Damage</th>
                            <th className="text-right">Assists</th>
                            <th className="text-right">Knocks</th>
                            <th className="text-right">Survival</th>
                            <th className="text-right">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sortedPlayerResults.map((playerResult) => (
                            <tr key={`${activeMatch.id}-${playerResult.pubgPlayerId ?? playerResult.playerName}`}>
                              <td className="font-semibold text-white">{playerResult.playerName}</td>
                              <td>{readText(playerResult.teamName)}</td>
                              <td>{playerResult.slotNumber ? `#${playerResult.slotNumber}` : "-"}</td>
                              <td className="text-right">{readNumber(playerResult.kills)}</td>
                              <td className="text-right">{formatDisplayNumber(readNumber(playerResult.damage))}</td>
                              <td className="text-right">{readNumber(playerResult.assists)}</td>
                              <td className="text-right">{readNumber(playerResult.knocks)}</td>
                              <td className="text-right">{formatSurvivalTime(playerResult.survivalTime)}</td>
                              <td className="points-cell text-right">{readNumber(playerResult.totalPoints)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="p-8 text-center text-sm text-text-muted">
                      Player statistics have not been stored for this match yet.
                    </div>
                  )}
                </section>
              ) : null}

              {matchAssets.length > 0 ? (
                <section className="esports-card p-5">
                  <p className="section-title">Assets</p>
                  <h2 className="mt-2 font-display text-xl font-black uppercase text-white">Broadcast Gallery</h2>
                  <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {matchAssets.map((assetUrl) => (
                      <a
                        key={assetUrl}
                        href={assetUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="overflow-hidden rounded-[18px] border border-white/[0.06] bg-black/15 transition hover:border-accent-blue/25"
                      >
                        <Image src={assetUrl} alt="Match asset" width={800} height={352} className="h-44 w-full object-cover" />
                      </a>
                    ))}
                  </div>
                </section>
              ) : null}
            </div>
          )}
        </Tabs>
      </div>
    </main>
  );
}
