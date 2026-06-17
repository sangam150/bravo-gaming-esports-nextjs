"use client";

import Link from "next/link";
import Tabs from "@/components/ui/Tabs";
import { compareBravoTeamSlotOrder, resolveBravoTeamIdentity } from "@/lib/bravo-teams";
import { compareMatchTeamResults } from "@/lib/ranking-sort";
import { useBravoRealtimeData } from "@/lib/realtime-hooks";
import type { MatchPlayerResult, ScrimDayResult, ScrimDayStatus, TournamentMatch } from "@/lib/types";

const weekdaySchedule = [
  { day: "Monday", map: "Rondo", time: "8:00 PM NPT" },
  { day: "Tuesday", map: "Erangel", time: "8:00 PM NPT" },
  { day: "Wednesday", map: "Miramar", time: "8:00 PM NPT" },
  { day: "Thursday", map: "Taego", time: "8:00 PM NPT" },
];

const weekendSchedule = [
  { day: "Saturday", map: "Rondo", time: "8:00 PM NPT" },
  { day: "Saturday", map: "Erangel", time: "9:00 PM NPT" },
  { day: "Saturday", map: "Miramar", time: "10:00 PM NPT" },
  { day: "Saturday", map: "Taego", time: "11:00 PM NPT" },
  { day: "Sunday", map: "Erangel (Final Clash)", time: "12:00 AM NPT" },
];

const pointSystem = [
  { place: "1st Place", pts: 10 },
  { place: "2nd Place", pts: 6 },
  { place: "3rd Place", pts: 5 },
  { place: "4th Place", pts: 4 },
  { place: "5th Place", pts: 3 },
  { place: "6th Place", pts: 2 },
  { place: "7th Place", pts: 1 },
  { place: "8th Place", pts: 1 },
  { place: "9th-16th", pts: 0 },
  { place: "Each Kill", pts: 1 },
];

const statusClassNames: Record<ScrimDayStatus, string> = {
  scheduled: "border-white/10 bg-white/5 text-slate-300",
  live: "border-accent-red/30 bg-accent-red/10 text-accent-red",
  completed: "border-accent-green/30 bg-accent-green/10 text-accent-green",
  waiting_for_data: "border-accent-yellow/30 bg-accent-yellow/10 text-accent-yellow",
  mixed: "border-accent-blue/30 bg-accent-blue/10 text-accent-blue",
};

function getStatusLabel(status: ScrimDayStatus) {
  if (status === "waiting_for_data") return "Results pending";
  if (status === "mixed") return "Mixed status";
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function formatUpdatedAt(value?: string) {
  if (!value) return "Awaiting sync";

  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) return value;

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kathmandu",
  }).format(parsedDate);
}

function getScrimMatchIds(pubgMatchId?: string, pubgMatchIds?: string[]) {
  return Array.from(
    new Set([...(pubgMatchIds ?? []), pubgMatchId].filter((matchId): matchId is string => Boolean(matchId)))
  );
}

function getAssignedTeamNames(teamIds: string[]) {
  return teamIds
    .map((teamId) => resolveBravoTeamIdentity(teamId))
    .filter((team): team is NonNullable<typeof team> => Boolean(team))
    .sort((firstTeam, secondTeam) => compareBravoTeamSlotOrder(firstTeam, secondTeam))
    .map((team) => `#${team.slotNumber} ${team.name}`);
}

function formatPlayedAt(value?: string) {
  if (!value) return "Schedule unavailable";

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

function sortTeamResultsByPlacement(teamResults: TournamentMatch["teamResults"]) {
  return [...(teamResults ?? [])].sort((firstResult, secondResult) =>
    compareMatchTeamResults(firstResult, secondResult)
  );
}

function getMatchMvp(match: TournamentMatch): MatchPlayerResult | null {
  const playerResults = [...(match.playerResults ?? [])];
  if (playerResults.length === 0) return null;

  return playerResults.sort(
    (firstPlayer, secondPlayer) =>
      secondPlayer.totalPoints - firstPlayer.totalPoints ||
      secondPlayer.kills - firstPlayer.kills ||
      secondPlayer.damage - firstPlayer.damage ||
      secondPlayer.assists - firstPlayer.assists ||
      firstPlayer.playerName.localeCompare(secondPlayer.playerName)
  )[0] ?? null;
}

function MatchBreakdownPanel({ matches }: { matches: ScrimDayResult["matches"] }) {
  if (matches.length === 0) {
    return (
      <div className="rounded-card border border-dashed border-white/10 px-4 py-8 text-center text-sm text-text-muted">
        Match-by-match results will be published after admin approval.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {matches.map((match, index) => {
        const sortedTeamResults = sortTeamResultsByPlacement(match.teamResults);
        const mvp = getMatchMvp(match);

        return (
          <article key={match.id} className="rounded-card border border-white/10 bg-bg-primary">
            <div className="flex flex-col gap-4 border-b border-white/10 px-5 py-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent-blue">
                  Match {index + 1}
                </p>
                <h5 className="mt-2 text-xl font-black text-white">{match.map}</h5>
                <p className="mt-1 text-sm text-text-muted">{formatPlayedAt(match.playedAt)}</p>
                <Link href={`/results/matches/${match.id}`} className="mt-3 inline-flex text-sm font-semibold text-accent-blue hover:underline">
                  Open Match Result Page
                </Link>
              </div>

              <div className="grid gap-3 sm:grid-cols-4">
                <div className="rounded-card border border-white/10 bg-white/5 px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.14em] text-text-muted">Winner</p>
                  <p className="mt-2 text-sm font-semibold text-white">{match.winner}</p>
                </div>
                <div className="rounded-card border border-white/10 bg-white/5 px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.14em] text-text-muted">Teams</p>
                  <p className="mt-2 text-lg font-black text-white">{sortedTeamResults.length}</p>
                </div>
                <div className="rounded-card border border-white/10 bg-white/5 px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.14em] text-text-muted">Players</p>
                  <p className="mt-2 text-lg font-black text-white">{match.playerResults?.length ?? 0}</p>
                </div>
                <div className="rounded-card border border-white/10 bg-white/5 px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.14em] text-text-muted">Lobby Kills</p>
                  <p className="mt-2 text-lg font-black text-white">{match.knockouts}</p>
                </div>
              </div>
            </div>

            <div className="grid gap-4 px-5 py-4 xl:grid-cols-[1.8fr,1fr]">
              <div className="table-scroll">
                <table className="data-table min-w-full">
                  <thead>
                    <tr>
                      <th>Place</th>
                      <th>Slot</th>
                      <th>Team</th>
                      <th>Kills</th>
                      <th>Place Pts</th>
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedTeamResults.map((teamResult) => (
                      <tr key={`${match.id}-${teamResult.teamName}`}>
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

              <div className="rounded-card border border-accent-blue/20 bg-accent-blue/5 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent-blue">Match MVP</p>
                {mvp ? (
                  <div className="mt-3 space-y-3">
                    <div>
                      <p className="text-lg font-black text-white">{mvp.playerName}</p>
                      <p className="text-sm text-text-muted">
                        {mvp.teamName} {mvp.slotNumber ? `| Slot ${mvp.slotNumber}` : ""}
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="rounded-card border border-white/10 bg-bg-primary px-3 py-2">
                        <p className="text-xs uppercase tracking-[0.14em] text-text-muted">Kills</p>
                        <p className="mt-1 font-mono-stat text-white">{mvp.kills}</p>
                      </div>
                      <div className="rounded-card border border-white/10 bg-bg-primary px-3 py-2">
                        <p className="text-xs uppercase tracking-[0.14em] text-text-muted">Assists</p>
                        <p className="mt-1 font-mono-stat text-white">{mvp.assists}</p>
                      </div>
                      <div className="rounded-card border border-white/10 bg-bg-primary px-3 py-2">
                        <p className="text-xs uppercase tracking-[0.14em] text-text-muted">Damage</p>
                        <p className="mt-1 font-mono-stat text-white">{mvp.damage.toLocaleString()}</p>
                      </div>
                      <div className="rounded-card border border-white/10 bg-bg-primary px-3 py-2">
                        <p className="text-xs uppercase tracking-[0.14em] text-text-muted">Survival</p>
                        <p className="mt-1 font-mono-stat text-white">{formatSurvivalTime(mvp.survivalTime)}</p>
                      </div>
                    </div>
                    <div className="rounded-card border border-white/10 bg-bg-primary px-3 py-2">
                      <p className="text-xs uppercase tracking-[0.14em] text-text-muted">Total Points</p>
                      <p className="mt-1 text-lg font-black text-accent-green">{mvp.totalPoints}</p>
                    </div>
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-text-muted">
                    MVP data is unavailable because player-level PUBG stats were not stored for this match.
                  </p>
                )}
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}

function SchedulePanel() {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="esports-card p-6">
        <h3 className="section-heading mb-4">Weekdays</h3>
        <div className="table-scroll">
          <table className="data-table min-w-full">
            <tbody>
              {weekdaySchedule.map((scheduleRow) => (
                <tr key={scheduleRow.day}>
                  <td className="font-display font-bold uppercase text-white">{scheduleRow.day}</td>
                  <td className="text-accent-blue">{scheduleRow.map}</td>
                  <td className="font-mono-stat text-text-muted">{scheduleRow.time}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <h3 className="section-heading mb-4 mt-8">Weekends</h3>
        <div className="table-scroll">
          <table className="data-table min-w-full">
            <tbody>
              {weekendSchedule.map((scheduleRow, index) => (
                <tr key={`${scheduleRow.day}-${index}`}>
                  <td className="font-display font-bold uppercase text-white">{scheduleRow.day}</td>
                  <td className="text-accent-blue">{scheduleRow.map}</td>
                  <td className="font-mono-stat text-text-muted">{scheduleRow.time}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="esports-card p-6">
        <h3 className="section-heading mb-4">Scrim Information</h3>
        <ul className="space-y-2 text-sm text-text-muted">
          <li>4 matches per day on weekdays.</li>
          <li>5 matches per day on weekends.</li>
          <li>Squad format.</li>
          <li>TPP mode.</li>
          <li>Asia server.</li>
          <li>Point system below.</li>
        </ul>
        <h3 className="section-heading mb-3 mt-8">Point System</h3>
        <div className="table-scroll">
          <table className="data-table min-w-full">
            <tbody>
              {pointSystem.map((pointsRow) => (
                <tr key={pointsRow.place}>
                  <td className="text-text-muted">{pointsRow.place}</td>
                  <td className="points-cell text-right">{pointsRow.pts} Points</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-xs text-text-muted">Total Points = Placement Points + Kill Points</p>
      </div>
    </div>
  );
}

function ResultsPanel({ days }: { days: ScrimDayResult[] }) {
  if (days.length === 0) {
    return (
        <div className="esports-card p-8 text-center text-text-muted">
        <p className="font-display font-bold uppercase text-white">Results pending</p>
        <p className="mt-2 text-sm">
          Create scrim entries in admin, import PUBG match IDs, and the daily results will appear here automatically.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {days.map((day) => (
        <section key={day.id} className="esports-card p-6">
          <div className="flex flex-col gap-4 border-b border-white/10 pb-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-3">
                <span className="rounded-full border border-accent-blue/20 bg-accent-blue/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-accent-blue">
                  {day.label}
                </span>
                <span
                  className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] ${statusClassNames[day.status]}`}
                >
                  {getStatusLabel(day.status)}
                </span>
              </div>
              <h3 className="mt-4 text-2xl font-black tracking-[-0.03em] text-white">{day.displayDate}</h3>
              <p className="mt-2 text-sm text-text-muted">
                {day.scrimCount} scrim slot{day.scrimCount === 1 ? "" : "s"} scheduled | {day.completedMatches} match
                result{day.completedMatches === 1 ? "" : "s"} imported from the PUBG API
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-card border border-white/10 bg-bg-primary px-4 py-3">
                <p className="text-xs uppercase tracking-[0.14em] text-text-muted">Leaderboard</p>
                <p className="mt-2 text-2xl font-black text-white">{day.leaderboard.length}</p>
              </div>
              <div className="rounded-card border border-white/10 bg-bg-primary px-4 py-3">
                <p className="text-xs uppercase tracking-[0.14em] text-text-muted">Pending</p>
                <p className="mt-2 text-2xl font-black text-white">{day.pendingMatches}</p>
              </div>
              <div className="rounded-card border border-white/10 bg-bg-primary px-4 py-3">
                <p className="text-xs uppercase tracking-[0.14em] text-text-muted">Last Sync</p>
                <p className="mt-2 text-sm font-semibold text-white">{formatUpdatedAt(day.lastUpdatedAt)}</p>
              </div>
            </div>
          </div>

          {day.announcements.length > 0 && (
            <div className="mt-5 rounded-card border border-accent-blue/15 bg-accent-blue/5 p-4 text-sm text-slate-200">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent-blue">Admin Notes</p>
              <div className="mt-2 space-y-2">
                {day.announcements.map((announcement, index) => (
                  <p key={`${day.id}-announcement-${index}`}>{announcement}</p>
                ))}
              </div>
            </div>
          )}

          <div className="mt-5 grid gap-4 xl:grid-cols-[1.2fr,1.8fr]">
            <div className="rounded-card border border-white/10 bg-bg-primary p-4">
              <div className="flex items-center justify-between gap-3">
                <h4 className="text-sm font-semibold uppercase tracking-[0.14em] text-white">Match Slots</h4>
                <span className="text-xs text-text-muted">{day.matchIds.length} synced</span>
              </div>
              <div className="mt-4 space-y-3">
                {day.scrims.map((scrim) => (
                  <div key={scrim.id} className="rounded-card border border-white/10 bg-white/5 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-white">{scrim.title}</p>
                        <p className="mt-1 text-xs text-text-muted">
                          {scrim.map} | {scrim.lobbyTime || "TBA"}
                        </p>
                      </div>
                      <span className="rounded-full border border-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.12em] text-slate-300">
                        {scrim.status.replaceAll("_", " ")}
                      </span>
                    </div>
                    {scrim.mapRotation && scrim.mapRotation.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {scrim.mapRotation.map((mapName) => (
                          <span
                            key={`${scrim.id}-${mapName}`}
                            className="rounded-full border border-accent-blue/20 bg-accent-blue/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-accent-blue"
                          >
                            {mapName}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="mt-3 flex flex-wrap gap-4 text-xs text-text-muted">
                      <span>Match IDs: {getScrimMatchIds(scrim.pubgMatchId, scrim.pubgMatchIds).join(", ") || "Pending"}</span>
                      <span>Teams: {scrim.teamIds?.length ?? 0}</span>
                    </div>
                    {scrim.teamIds?.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {getAssignedTeamNames(scrim.teamIds).map((teamLabel) => (
                          <span
                            key={`${scrim.id}-${teamLabel}`}
                            className="rounded-full border border-white/10 bg-bg-primary px-2.5 py-1 text-[11px] text-white"
                          >
                            {teamLabel}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-card border border-white/10 bg-bg-primary p-4">
              <div className="flex items-center justify-between gap-3">
                <h4 className="text-sm font-semibold uppercase tracking-[0.14em] text-white">Daily Standings</h4>
                <span className="text-xs text-text-muted">Stored in the Bravo data hub after PUBG sync</span>
              </div>

              {day.leaderboard.length === 0 ? (
                <div className="mt-4 rounded-card border border-dashed border-white/10 px-4 py-8 text-center text-sm text-text-muted">
                  Results for {day.label} will be published after admin approval. Add the PUBG match ID in admin and import it to
                  populate the table.
                </div>
              ) : (
                <div className="table-scroll mt-4">
                  <table className="data-table min-w-full">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Slot</th>
                        <th>Team</th>
                        <th>Matches</th>
                        <th>WWCD</th>
                        <th>Kills</th>
                        <th>Placement</th>
                        <th>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {day.leaderboard.map((standing, index) => (
                        <tr key={`${day.id}-${standing.teamId ?? standing.teamName}`}>
                          <td>{index + 1}</td>
                          <td>{standing.slotNumber ? `#${standing.slotNumber}` : "-"}</td>
                          <td className="font-semibold text-white">{standing.teamName}</td>
                          <td>{standing.matches}</td>
                          <td>{standing.wins}</td>
                          <td>{standing.kills}</td>
                          <td>{standing.placementPoints}</td>
                          <td className="points-cell">{standing.totalPoints}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          <div className="mt-5 rounded-card border border-white/10 bg-bg-primary p-4">
            <div className="flex items-center justify-between gap-3">
              <h4 className="text-sm font-semibold uppercase tracking-[0.14em] text-white">Imported Match Results</h4>
              <span className="text-xs text-text-muted">
                {day.matches.length} match{day.matches.length === 1 ? "" : "es"} stored
              </span>
            </div>
            <div className="mt-4">
              <MatchBreakdownPanel matches={day.matches} />
            </div>
          </div>
        </section>
      ))}
    </div>
  );
}

export default function ScrimsPage({ days }: { days: ScrimDayResult[] }) {
  const { scrimDayResults } = useBravoRealtimeData(undefined, {
    seasons: false,
    tournaments: false,
    standings: false,
    teams: false,
    players: false,
  });
  const activeDays = scrimDayResults.length > 0 ? scrimDayResults : days;
  const totalDays = activeDays.length;
  const totalMatches = activeDays.reduce((currentTotal, day) => currentTotal + day.completedMatches, 0);
  const totalScrimSlots = activeDays.reduce((currentTotal, day) => currentTotal + day.scrimCount, 0);
  const latestDay = activeDays[0];

  return (
    <main className="page-shell">
      <div className="page-inner">
      <div className="page-hero mb-8">
        <p className="section-title">PUBG PC</p>
        <h1 className="hero-h1 mt-2 !text-4xl">Daily Scrims</h1>
        <p className="mt-3 max-w-3xl text-text-muted">
          Competitive scrim rooms with verified daily standings. Each day&apos;s results are fetched from the PUBG API,
          stored in Bravo&apos;s Supabase-backed data hub, and displayed here as Day 1, Day 2, Day 3, and beyond.
        </p>
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="esports-card p-5">
          <p className="text-xs uppercase tracking-[0.16em] text-text-muted">Scrim Days</p>
          <p className="mt-3 text-3xl font-black text-white">{totalDays}</p>
        </div>
        <div className="esports-card p-5">
          <p className="text-xs uppercase tracking-[0.16em] text-text-muted">Synced Matches</p>
          <p className="mt-3 text-3xl font-black text-white">{totalMatches}</p>
        </div>
        <div className="esports-card p-5">
          <p className="text-xs uppercase tracking-[0.16em] text-text-muted">Scrim Slots</p>
          <p className="mt-3 text-3xl font-black text-white">{totalScrimSlots}</p>
        </div>
        <div className="esports-card p-5">
          <p className="text-xs uppercase tracking-[0.16em] text-text-muted">Active Day</p>
          <p className="mt-3 text-lg font-black text-white">{latestDay?.label ?? "Day not created yet"}</p>
          <p className="mt-1 text-sm text-text-muted">
            {latestDay?.displayDate ?? "Create the next scrim day from admin"}
          </p>
        </div>
      </div>

      <Tabs tabs={["Schedule", "Rules", "How to Join", "Daily Results"]}>
        {(tab) => (
          <>
            {tab === "Schedule" && <SchedulePanel />}
            {tab === "Rules" && (
              <div className="esports-card p-6 text-sm text-text-muted">
                <p>Teams must register before joining scrim lobbies.</p>
                <p className="mt-2">Match IDs must be submitted within 30 minutes of completion.</p>
                <p className="mt-2">Admin reviews all results before leaderboard updates.</p>
                <p className="mt-2">Fair play policy: cheating results in a permanent ban.</p>
              </div>
            )}
            {tab === "How to Join" && (
              <div className="esports-card p-6">
                <ol className="list-decimal space-y-3 pl-5 text-text-muted">
                  <li>Register your team at the registration page.</li>
                  <li>Join the Bravo Discord for lobby credentials.</li>
                  <li>Play scheduled scrims at listed times.</li>
                  <li>Submit match IDs to admins for verification.</li>
                </ol>
                <Link href="/teams/register" className="btn-primary mt-6 inline-flex">
                  Register Team
                </Link>
              </div>
            )}
            {tab === "Daily Results" && <ResultsPanel days={activeDays} />}
          </>
        )}
      </Tabs>

      <div className="mt-8 flex flex-col items-center justify-between gap-4 rounded-card border border-accent-blue/20 bg-accent-blue/5 p-6 sm:flex-row">
        <div>
          <h3 className="font-display text-lg font-bold uppercase text-white">Want to Play?</h3>
          <p className="text-sm text-text-muted">Register your team and compete in our daily scrims.</p>
        </div>
        <Link href="/teams/register" className="btn-primary">
          Join Scrims
        </Link>
      </div>
      </div>
    </main>
  );
}
