"use client";

import ManagedImage from "@/components/ui/ManagedImage";
import StatusBadge from "@/components/ui/StatusBadge";
import Tabs from "@/components/ui/Tabs";
import TeamAvatar from "@/components/ui/TeamAvatar";
import { compareBravoTeamSlotOrder, resolveBravoTeamIdentity } from "@/lib/bravo-teams";
import { formatDisplayNumber } from "@/lib/display-format";
import { resolvePublicAssetUrl } from "@/lib/public-asset-url";
import { compareMatchTeamResults, sortTournamentStandings } from "@/lib/ranking-sort";
import { sortTournamentMatches, sortTournamentPlayers } from "@/lib/realtime-hooks";
import { parseEventSchedule } from "@/lib/event-schedule";
import type { EventProduction } from "@/lib/event-production";
import { buildTournamentStandings } from "@/lib/tournament-standings";
import { resolvePublicEventPolicy } from "@/lib/public-event-policy";
import type { PublicTournamentWorkspace } from "@/lib/tournament-workspace";
import { useEffect, useState } from "react";
import type { Player, Team, Tournament, TournamentMatch, TournamentStanding } from "@/lib/types";
import Link from "next/link";

function formatLabel(value?: string) {
  return value && value.trim().length > 0 ? value : "Unavailable";
}

function getTeamProfileHref(teamName: string, fallbackId: string) {
  return `/teams/${resolveBravoTeamIdentity(teamName)?.id ?? fallbackId}`;
}

function sortTeamResultsByPlacement(teamResults: TournamentMatch["teamResults"]) {
  return [...(teamResults ?? [])].sort((firstResult, secondResult) => compareMatchTeamResults(firstResult, secondResult));
}

export default function TournamentDetailClient({
  tournament,
  matches,
  teams,
  players,
  standings,
  production = null,
  sponsors = [],
  announcements = [],
  serverTime = 0,
}: {
  tournament: Tournament;
  matches: TournamentMatch[];
  teams: Team[];
  players: Player[];
  standings: TournamentStanding[];
  production?: EventProduction | null;
  sponsors?: PublicTournamentWorkspace["sponsors"];
  announcements?: PublicTournamentWorkspace["announcements"];
  serverTime?: number;
}) {
  const [workspace, setWorkspace] = useState<PublicTournamentWorkspace>({ ...tournament, matches, teams, players, standings, production, sponsors, announcements, serverTime });
  const [connectionError, setConnectionError] = useState("");
  const [stageId, setStageId] = useState("");
  const [groupId, setGroupId] = useState("");
  const [dayId, setDayId] = useState("");
  useEffect(() => {
    let stopped = false; let timer: ReturnType<typeof setTimeout>; let active: AbortController | null = null;
    async function refresh() {
      if (stopped) return;
      if (document.hidden) { timer = setTimeout(refresh, 15_000); return; }
      active = new AbortController(); const timeout = setTimeout(() => active?.abort(), 8000);
      try {
        const response = await fetch(`/api/tournaments/${encodeURIComponent(tournament.id)}`, { cache: "no-store", signal: active.signal });
        if (!response.ok) throw new Error(response.status === 404 ? "This competition is no longer published." : "Published competition updates are temporarily unavailable.");
        const payload = await response.json(); if (!payload.success || !payload.data || payload.data.id !== tournament.id) throw new Error("Published competition data is unavailable.");
        if (!stopped) { setWorkspace(payload.data); setConnectionError(""); }
      } catch (cause) { if (!stopped) setConnectionError(cause instanceof Error && cause.message !== "The user aborted a request." ? cause.message : "Published competition updates are temporarily unavailable."); }
      finally { clearTimeout(timeout); if (!stopped) timer = setTimeout(refresh, 15_000); }
    }
    void refresh(); return () => { stopped = true; clearTimeout(timer); active?.abort(); };
  }, [tournament.id]);
  const activeTournament = workspace;
  const activeProduction = workspace.production;
  const activeMatches = sortTournamentMatches(workspace.matches.filter(match => match.status === "published"));
  const activeTeams = [...workspace.teams].sort((firstTeam, secondTeam) => compareBravoTeamSlotOrder(firstTeam, secondTeam));
  const activePlayers = sortTournamentPlayers(workspace.players);
  let schedule = null;
  try { schedule = parseEventSchedule(activeTournament.schedule); } catch { /* Malformed public schedules fail closed. */ }
  const period = schedule?.matches.filter(row => (!stageId || row.stageId === stageId) && (!groupId || row.groupId === groupId) && (!dayId || row.dayId === dayId)) ?? [];
  const selectedMatches = stageId || groupId || dayId ? activeMatches.filter(match => period.some(row => row.matchId ? row.matchId === match.id : row.matchNumber === (match.matchNumber ?? match.sequenceNumber))) : activeMatches;
  const activeStandings = buildTournamentStandings(tournament.id, activeTournament.title, selectedMatches);
  const topStandings = sortTournamentStandings(workspace.standings).slice(0, 5);
  const tournamentBannerUrl = resolvePublicAssetUrl(activeTournament.bannerUrl);
  const registration = resolvePublicEventPolicy(activeTournament, workspace.serverTime);
  const eventTimeZone = schedule?.timeZone ?? activeProduction?.timeZone ?? "Asia/Kathmandu";
  if (connectionError) return <main className="page-shell"><div className="page-inner"><div className="esports-card space-y-4 p-6"><h1>{activeTournament.title}</h1><p role="alert">{connectionError} Previously displayed results are hidden until a fresh published snapshot is available.</p><Link href="/tournaments" className="btn-secondary">Back to tournaments</Link></div></div></main>;

  return (
    <main className="page-shell">
      <div className="page-inner">
        <div className="page-hero mb-6 overflow-hidden">
          {tournamentBannerUrl ? (
            <div className="pointer-events-none absolute inset-0 opacity-15" aria-hidden="true">
              <ManagedImage src={tournamentBannerUrl} alt="" sizes="100vw" wrapperClassName="h-full w-full" className="object-cover" />
            </div>
          ) : null}
          <div className="relative z-10 flex flex-wrap items-start gap-4">
            <TeamAvatar name={activeTournament.title} size="lg" imageUrl={activeProduction?.eventLogo || tournamentBannerUrl || undefined} />
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
            {registration.registrationOpen && <Link href={`/teams/register?tournament=${encodeURIComponent(activeTournament.id)}`} className="btn-primary">Register team</Link>}
          </div>
        </div>

        <Tabs
          tabs={["Overview", "Standings", "Schedule", "Results", "Teams", "Players", "Rules", "Partners"]}
          label="Tournament sections"
          barClassName="sticky top-16 z-20 sm:top-20 md:static"
        >
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
                        {activeProduction?.organizerName && <p>Organizer: {activeProduction.organizerName}</p>}
                        {activeProduction?.hostCountry && <p>Host country: {activeProduction.hostCountry}</p>}
                        {activeProduction?.region && <p>Event region: {activeProduction.region}</p>}
                        <p>Timezone: {eventTimeZone}</p>
                        {activeProduction?.currency && <p>Prize currency: {activeProduction.currency}</p>}
                        {activeTournament.registrationStartDate && <p>Registration opens: {activeTournament.registrationStartDate}</p>}
                        {activeTournament.registrationEndDate && <p>Registration deadline: {activeTournament.registrationEndDate}</p>}
                      </div>
                      {activeProduction?.stages.length ? <p className="mt-4 text-sm text-text-muted">Stages: {[...activeProduction.stages].sort((a, b) => a.order - b.order).map(stage => stage.name).join(" → ")}</p> : null}
                      {activeProduction?.officialLinks.length ? <div className="mt-4 flex flex-wrap gap-4">{activeProduction.officialLinks.map(link => <a key={link} className="break-all text-sm text-accent-blue hover:underline" href={link} target="_blank" rel="noreferrer">{link}</a>)}</div> : null}
                    </div>
                  </div>
                  <div className="esports-card p-6">
                    <h2 className="section-heading !text-base">Published Standings Snapshot</h2>
                    {topStandings.length === 0 ? (
                      <p className="mt-4 text-sm text-text-muted">Verified day results have not been published.</p>
                    ) : (
                      <div className="table-scroll mt-4" tabIndex={0}>
                        <table className="data-table min-w-full">
                          <caption className="sr-only">Leading teams in the current tournament standings</caption>
                          <thead>
                            <tr>
                              <th scope="col">#</th>
                              <th scope="col">Slot</th>
                              <th scope="col">Team</th>
                              <th scope="col">Total</th>
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
                  {workspace.announcements.length ? <section className="esports-card space-y-4 p-6 lg:col-span-3"><h2 className="section-heading !text-base">Official announcements</h2>{workspace.announcements.map(announcement => <article key={announcement.id}><h3 className="font-semibold text-white">{announcement.title}</h3><p className="whitespace-pre-line text-sm text-text-muted">{announcement.detail}</p><time className="text-xs text-text-muted">{announcement.date}</time></article>)}</section> : null}
                </>
              )}

              {tab === "Standings" && (
                <div className="esports-card overflow-hidden !p-0 lg:col-span-3">
                  {activeProduction && <fieldset className="grid gap-3 border-b border-white/10 p-4 sm:grid-cols-3"><legend className="px-4 text-sm text-text-muted">Standings period · published results only</legend><label className="text-sm">Stage<select className="input-esports" value={stageId} onChange={event => { setStageId(event.target.value); setGroupId(""); setDayId(""); }}><option value="">All stages</option>{activeProduction.stages.map(stage => <option key={stage.id} value={stage.id}>{stage.name}{stage.archived ? " (archived)" : ""}</option>)}</select></label><label className="text-sm">Group<select className="input-esports" value={groupId} onChange={event => setGroupId(event.target.value)}><option value="">All groups</option>{activeProduction.groups.filter(group => !stageId || group.stageId === stageId).map(group => <option key={group.id} value={group.id}>{group.name}</option>)}</select></label><label className="text-sm">Match day<select className="input-esports" value={dayId} onChange={event => setDayId(event.target.value)}><option value="">All days</option>{activeProduction.days.filter(day => !stageId || day.stageId === stageId).map(day => <option key={day.id} value={day.id}>{day.name}</option>)}</select></label></fieldset>}
                  {activeStandings.length === 0 ? (
                    <p className="p-6 text-sm text-text-muted">Verified day standings have not been published.</p>
                  ) : (
                    <div className="table-scroll" tabIndex={0}>
                      <table className="data-table min-w-full">
                        <caption className="sr-only">Complete standings for the selected tournament day</caption>
                        <thead>
                          <tr>
                            <th scope="col">#</th>
                            <th scope="col">Slot</th>
                            <th scope="col">Team</th>
                            <th scope="col">Matches</th>
                            <th scope="col">Placement</th>
                            <th scope="col">Kills</th>
                            <th scope="col">Total</th>
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

              {tab === "Schedule" && (
                <section className="esports-card space-y-4 p-6 lg:col-span-3"><h2 className="section-heading !text-base">Match schedule</h2><p className="text-sm text-text-muted">Times shown in {eventTimeZone}. Operational status is organizer supplied; results are labeled published only after publication.</p>{schedule?.matches.length ? <div className="table-scroll"><table className="data-table min-w-full"><caption className="sr-only">Published event match schedule</caption><thead><tr>{["Match", "Stage / day", "Map", "Scheduled time", "Status"].map(label => <th key={label} scope="col">{label}</th>)}</tr></thead><tbody>{schedule.matches.map(row => <tr key={row.matchNumber}><td>{row.displayTitle || row.title || `Match ${row.matchNumber}`}</td><td>{[activeProduction?.stages.find(stage => stage.id === row.stageId)?.name, activeProduction?.groups.find(group => group.id === row.groupId)?.name, activeProduction?.days.find(day => day.id === row.dayId)?.name].filter(Boolean).join(" · ") || schedule.stage || "—"}</td><td>{row.map}</td><td><time dateTime={row.scheduledAt}>{new Intl.DateTimeFormat("en-GB", { timeZone: eventTimeZone, year: "numeric", month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(row.scheduledAt))}</time></td><td>{activeMatches.some(match => row.matchId ? row.matchId === match.id : row.matchNumber === (match.matchNumber ?? match.sequenceNumber)) ? "Results published" : row.status.replaceAll("-", " ")}</td></tr>)}</tbody></table></div> : <p className="whitespace-pre-line text-sm text-text-muted">{activeTournament.schedule && !activeTournament.schedule.trim().startsWith("{") ? activeTournament.schedule : "The organizer has not published a structured schedule."}</p>}<p className="text-sm text-text-muted">Map rotation: {activeTournament.mapRotation?.join(" → ") || "Not published"}</p></section>
              )}

              {tab === "Results" && (
                <div className="space-y-4 lg:col-span-3">
                  {activeMatches.length === 0 ? (
                    <div className="esports-card p-6 text-sm text-text-muted">Verified match results have not been published.</div>
                  ) : (
                    activeMatches.map((match) => (
                      <div key={match.id} className="esports-card overflow-hidden !p-0">
                        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-5 py-4">
                          <div>
                            <p className="text-label uppercase text-accent-blue">{match.map}</p>
                            <p className="mt-1 font-semibold text-white">Winner: {match.winner}</p>
                            <Link
                              href={`/results/matches/${encodeURIComponent(match.id)}`}
                              className="mt-2 inline-flex text-sm font-semibold text-accent-blue hover:underline"
                            >
                              Open Match Page
                            </Link>
                          </div>
                          <div className="text-sm text-text-muted">
                            <p>Total Knockouts: {match.knockouts}</p>
                            <p>{match.playedAt ?? "Schedule unavailable"}</p>
                          </div>
                        </div>
                        <div className="table-scroll" tabIndex={0}>
                          <table className="data-table min-w-full">
                            <caption className="sr-only">
                              Team results for {match.map}, won by {match.winner}
                            </caption>
                            <thead>
                              <tr>
                                <th scope="col">Slot</th>
                                <th scope="col">Placement</th>
                                <th scope="col">Team</th>
                                <th scope="col">Kills</th>
                                <th scope="col">Placement Pts</th>
                                <th scope="col">Total</th>
                              </tr>
                            </thead>
                            <tbody>
                              {sortTeamResultsByPlacement(match.teamResults).map((teamResult) => (
                                <tr key={`${match.id}-${teamResult.teamName}`}>
                                  <td>{teamResult.slotNumber ? `#${teamResult.slotNumber}` : "-"}</td>
                                  <td>#{teamResult.placement}</td>
                                  <td>{teamResult.teamName}{teamResult.disqualified || teamResult.adjustmentPoints ? <p className="mt-1 text-xs text-text-muted">{teamResult.disqualified ? "Match disqualification" : `${teamResult.adjustmentPoints! > 0 ? "+" : ""}${teamResult.adjustmentPoints} point adjustment`} · {teamResult.decisionReason}</p> : null}</td>
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
                    <div className="esports-card p-6 text-sm text-text-muted">
                      Team entries will appear after matches are imported for this day.
                    </div>
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
                            {team.slotNumber ? `Slot ${team.slotNumber}` : (team.tag ?? "Registered")}
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
                    <div className="table-scroll" tabIndex={0}>
                      <table className="data-table min-w-full">
                        <caption className="sr-only">Player performance for the selected tournament day</caption>
                        <thead>
                          <tr>
                            <th scope="col">#</th>
                            <th scope="col">Player</th>
                            <th scope="col">Team</th>
                            <th scope="col">Kills</th>
                            <th scope="col">Damage</th>
                            <th scope="col">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {activePlayers.map((player, index) => (
                            <tr key={player.id}>
                              <td>#{index + 1}</td>
                              <td className="font-semibold">{player.name}</td>
                              <td>{player.teamName ?? "Unavailable"}</td>
                              <td>{player.kills}</td>
                              <td>{formatDisplayNumber(player.damage)}</td>
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
              {tab === "Partners" && <section className="esports-card space-y-4 p-6 lg:col-span-3"><h2 className="section-heading !text-base">Official event partners</h2>{workspace.sponsors.length ? <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{workspace.sponsors.map(sponsor => <article key={sponsor.id} className="flex items-center gap-4 rounded border border-white/10 p-4"><TeamAvatar name={sponsor.name} imageUrl={sponsor.logoUrl} size="lg" /><h3 className="font-semibold text-white">{sponsor.name}</h3></article>)}</div> : <p className="text-sm text-text-muted">No current published partner assignment.</p>}</section>}
            </div>
          )}
        </Tabs>
      </div>
    </main>
  );
}
