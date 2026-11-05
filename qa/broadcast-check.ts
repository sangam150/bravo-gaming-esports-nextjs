import assert from "node:assert/strict";
import { buildBroadcastSnapshot, DEFAULT_BROADCAST_STATE, parseBroadcastState, BROADCAST_GRAPHIC_GROUPS, BROADCAST_GRAPHICS } from "../lib/broadcast";
import { scoreMatchResults, type PointSystemRecord } from "../lib/competition-scoring";
import { parsePointSystemInput } from "../lib/point-system-input";
import { validateScrimInput, scrimAuditSummary } from "../lib/scrim-input";
import { toPublicScrim } from "../lib/public-scrims";
import { validateMatchResultsForPublication } from "../lib/match-result-validation";
import { createReadinessProbe } from "../lib/readiness-probe";
import { parseEventSchedule, scheduleForDay } from "../lib/event-schedule";
import { publicEventSchedule } from "../lib/event-schedule";
import { parseEventProduction, DEFAULT_EVENT_PRODUCTION } from "../lib/event-production";
import { transitionBroadcastStudio, type StudioRecord } from "../lib/broadcast-studio";
import { eventDateTimeLocalToUtcIso, formatEventDateTimeInput } from "../lib/event-datetime";
import { parseScoringRules, parseScoringDecision } from "../lib/scoring-rules";
import { buildTournamentStandings } from "../lib/tournament-standings";
import type { MatchPlayerResult, Scrim, TeamMatchResult, Tournament, TournamentMatch } from "../lib/types";

const tournament: Tournament = {
  id: "event-1",
  title: "QA event",
  published: true,
  tier: "",
  status: "LIVE",
  prizePool: "",
  teamCount: 2,
  maxTeams: 24,
  startDate: "2026-11-04",
  format: "Squad",
  mode: "Squad",
  server: "Asia",
};
const state = { ...DEFAULT_BROADCAST_STATE, tournamentId: tournament.id, matchId: "match-1", visible: true };
const team = (id: string, placement: number, kills: number): TeamMatchResult => ({
  teamId: id,
  teamName: id,
  placement,
  kills,
  damage: 0,
  killPoints: kills,
  placementPoints: placement === 1 ? 10 : 6,
  totalPoints: kills + (placement === 1 ? 10 : 6),
});
const player = (id: string, kills: number, damage: number): MatchPlayerResult => ({
  playerId: id,
  playerName: id,
  teamId: "alpha",
  teamName: "alpha",
  placement: 1,
  kills,
  damage,
  assists: 0,
  knocks: kills,
  survivalTime: 1200,
  placementPoints: 10,
  totalPoints: kills + 10,
});
const match: TournamentMatch = {
  id: "match-1",
  tournamentId: tournament.id,
  map: "Erangel",
  pubgMatchId: "match-id",
  status: "published",
  winner: "alpha",
  points: 11,
  knockouts: 21,
  dataSource: "manual_correction",
  teamResults: [team("alpha", 1, 1), team("bravo", 2, 20)],
  playerResults: [player("player-a", 5, 500), player("player-b", 5, 700), player("player-c", 4, 1000)],
};
const input = {
  state,
  tournament,
  matches: [match, { ...match, id: "draft", status: "draft" as const }, { ...match, id: "other-event", tournamentId: "private" }],
  teams: [],
  players: [],
  sponsors: [],
};
const snapshot = buildBroadcastSnapshot(input);
assert.deepEqual([...BROADCAST_GRAPHIC_GROUPS.flatMap(group => group.graphics)].sort(), [...BROADCAST_GRAPHICS].sort(), "Each available graphic must have exactly one operator category");
assert.equal(snapshot.winner?.teamName, "alpha", "Match winner is first place, not highest points");
assert.equal(snapshot.results[0].teamName, "bravo", "Results board orders by scored points");
assert.equal(snapshot.standings[0].matches, 1, "Drafts and other events cannot affect standings");
assert.equal(snapshot.mvp?.playerId, "player-b", "MVP ties use damage after kills");
const legacyPoints = { ...match, playerResults: match.playerResults!.map(row => ({ ...row, totalPoints: row.playerId === "player-c" ? 100 : 0 })) };
assert.equal(buildBroadcastSnapshot({ ...input, matches: [legacyPoints] }).mvp?.playerId, "player-c", "Legacy MVP matches the existing SQL total-points-first order without rescoring history");
assert.equal(snapshot.topDamage?.playerId, "player-c");
assert.equal(snapshot.headshotLeader, null);
assert.deepEqual(snapshot.eliminations, []);
assert.equal(buildBroadcastSnapshot({ ...input, tournament: { ...tournament, published: false } }).results.length, 0);
assert.equal(buildBroadcastSnapshot({ ...input, tournament: null }).control.visible, false);
assert.equal(buildBroadcastSnapshot({ ...input, matches: [{ ...match, deletedAt: "2026-11-04" }] }).match, null);
assert.equal(
  buildBroadcastSnapshot({ ...input, state: { ...state, matchId: "draft" } }).match,
  null,
  "A stale selection never falls back to a different match",
);

const privateMatch = Object.assign({}, match, {
  roomPassword: "PRIVATE_PASSWORD",
  rawJson: { token: "PRIVATE_TOKEN" },
  playerResults: [Object.assign(player("p", 1, 10), { phone: "PRIVATE_PHONE", pubgPlayerId: "PRIVATE_ACCOUNT" })],
});
const unmappedAccount = { ...privateMatch, playerResults: [Object.assign(player("PRIVATE_ACCOUNT", 1, 10), { playerName: "QA Unmapped Player", pubgPlayerId: "PRIVATE_ACCOUNT" })] };
const safeUnmapped = buildBroadcastSnapshot({ ...input, state: { ...state, playerId: "PRIVATE_ACCOUNT" }, matches: [unmappedAccount] });
assert.doesNotMatch(JSON.stringify(safeUnmapped), /PRIVATE_ACCOUNT/, "Unmapped PUBG accounts must not leak through the playerId fallback");
assert.ok(safeUnmapped.selectedPlayer, "An operator can still select a published unmapped result without exposing its account ID");
assert.doesNotMatch(
  JSON.stringify(buildBroadcastSnapshot({ ...input, matches: [privateMatch] })),
  /PRIVATE_|rawJson|roomPassword|pubgPlayerId/,
);
const logoInput = {
  ...input,
  teams: [{ id: "alpha", name: "alpha", totalPoints: 0, kills: 0, matches: 0, logoUrl: "/api/uploads/r2?key=teams%2Falpha%2Flogo.png" }],
};
assert.match(buildBroadcastSnapshot(logoInput).winner?.logoUrl ?? "", /^\/api\/uploads\/r2\?key=/, "Existing R2 proxy delivery must work");
assert.equal(
  buildBroadcastSnapshot({
    ...logoInput,
    teams: [{ ...logoInput.teams[0], logoUrl: "https://assets.bravogamingesports.com/logo.png?signature=secret" }],
  }).winner?.logoUrl,
  undefined,
  "Signed URLs must not enter broadcasts",
);

const parsed = parseBroadcastState({ ...state, revealId: 999, privateToken: "secret" });
assert.equal(parsed.revealId, 0);
assert.equal("privateToken" in parsed, false);
for (const patch of [
  { revision: -1 },
  { revision: 1.5 },
  { visible: "yes" },
  { graphic: "invalid" },
  { lowerTitle: "x".repeat(101) },
  { tournamentId: null },
])
  assert.throws(() => parseBroadcastState({ ...state, ...patch }));
assert.throws(() => parseBroadcastState(null));
assert.throws(() => parseBroadcastState({ ...state, page: -1 }));
assert.throws(() => parseBroadcastState({ ...state, page: 100 }));
assert.equal(parseBroadcastState({ ...state, page: 2 }).page, 2);

const eventSchedule = JSON.stringify({
  version: 1,
  stage: "Grand Finals",
  timeZone: "Asia/Kathmandu",
  matches: [
    { matchNumber: 1, map: "Erangel", scheduledAt: "2026-11-04T20:00:00+05:45", status: "completed", matchId: match.id },
    { matchNumber: 2, map: "Miramar", scheduledAt: "2026-11-04T21:00:00+05:45", status: "upcoming" },
  ],
});
assert.equal(parseEventSchedule(eventSchedule)?.matches[0].scheduledAt, "2026-11-04T14:15:00.000Z");
assert.equal(
  scheduleForDay([{ scheduledAt: "2026-11-04T23:00:00Z" }], "Asia/Kathmandu", Date.parse("2026-11-04T10:00:00Z")).length,
  0,
  "Tomorrow in Nepal must not appear in Today's Matches",
);
assert.equal(scheduleForDay([{ scheduledAt: "2026-11-04T23:00:00Z" }], "UTC", Date.parse("2026-11-04T10:00:00Z")).length, 1);
assert.equal(parseEventSchedule("Legacy schedule notes"), null);
assert.throws(() => parseEventSchedule(eventSchedule.replace("Asia/Kathmandu", "Invalid/Zone")));
assert.throws(() => parseEventSchedule(eventSchedule.replace("2026-11-04T21:00:00+05:45", "2026-11-04T21:00")));
const enhanced = {
  ...logoInput,
  tournament: { ...tournament, schedule: eventSchedule, registeredTeamIds: ["alpha"] },
  state: {
    ...state,
    teamId: "alpha",
    statsScope: "match" as const,
    casters: [
      { id: "public", eventId: tournament.id, name: "Approved caster", role: "Analyst", handle: "@approved", portraitUrl: "", published: true },
      { id: "private", name: "PRIVATE_CASTER", role: "PRIVATE_ROLE", handle: "PRIVATE_HANDLE", portraitUrl: "", published: false },
    ],
  },
};
const enhancedSnapshot = buildBroadcastSnapshot(enhanced);
assert.equal(enhancedSnapshot.scheduledMatches[0].status, "results-published");
assert.equal(enhancedSnapshot.scheduledMatches[1].status, "upcoming");
assert.equal(enhancedSnapshot.control.stageLabel, "Grand Finals");
assert.equal(enhancedSnapshot.casters.length, 1);
assert.doesNotMatch(JSON.stringify(enhancedSnapshot), /PRIVATE_/);
assert.equal(enhancedSnapshot.selectedTeam?.players[0].kills, 5);
assert.equal(enhancedSnapshot.registeredTeams.length, 1);
assert.equal(enhancedSnapshot.champion, null, "An active event cannot have a champion");
const completeSchedule = JSON.stringify({ ...parseEventSchedule(eventSchedule), matches: [parseEventSchedule(eventSchedule)!.matches[0]] });
const completedSnapshot = buildBroadcastSnapshot({ ...input, tournament: { ...tournament, status: "COMPLETED", schedule: completeSchedule }, matches: [match] });
assert.equal(completedSnapshot.champion?.teamId, "bravo", "Champion follows official final points, not the most recent match winner");
assert.equal(buildBroadcastSnapshot({ ...input, tournament: { ...tournament, status: "COMPLETED", schedule: eventSchedule } }).champion, null, "Missing scheduled results block champion/final claims");
assert.equal(buildBroadcastSnapshot({ ...input, state: { ...state, playerId: "player-a", comparisonPlayerId: "player-c" } }).comparisonPlayers.length, 2);
assert.equal(buildBroadcastSnapshot({ ...input, state: { ...state, playerId: "player-a", comparisonPlayerId: "player-a" } }).comparisonPlayers.length, 0);
assert.equal(eventDateTimeLocalToUtcIso("2026-11-04T20:00", "Asia/Kathmandu"), "2026-11-04T14:15:00.000Z");
assert.equal(formatEventDateTimeInput("2026-11-04T14:15:00Z", "America/New_York"), "2026-11-04T09:15");
assert.equal(eventDateTimeLocalToUtcIso("2026-03-08T02:30", "America/New_York"), null, "DST gaps cannot silently shift a match");
assert.equal(eventDateTimeLocalToUtcIso("2026-11-01T01:30", "America/New_York"), null, "Ambiguous DST hours must not select an arbitrary instant");
assert.doesNotMatch(publicEventSchedule(eventSchedule.replace('"map":"Erangel"', '"observerNotes":"PRIVATE_OBSERVER","map":"Erangel"')) ?? "", /PRIVATE_OBSERVER|observerNotes/);
assert.equal(publicEventSchedule('{"version":99,"observerNotes":"PRIVATE_OBSERVER"}'), undefined, "Unknown schedule versions fail closed");
assert.equal(publicEventSchedule('{"observerNotes":"PRIVATE_OBSERVER"'), undefined, "Malformed structured schedules cannot expose raw notes");
let studio: StudioRecord = parseBroadcastState(state);
const nextGraphic = { ...studio, graphic: "casters" as const, lowerTitle: "Private draft" };
studio = transitionBroadcastStudio(studio, nextGraphic, "preview");
assert.equal(studio.graphic, state.graphic, "Preview must never replace PGM");
assert.equal(studio.visible, true, "Preview must not hide the existing program");
assert.doesNotMatch(JSON.stringify(buildBroadcastSnapshot({ ...input, state: studio })), /Private draft|readySignature|previousProgram|presets/);
assert.throws(() => transitionBroadcastStudio(studio, { ...nextGraphic, revision: studio.revision }, "take"), /Mark this exact/);
studio = transitionBroadcastStudio(studio, { ...nextGraphic, revision: studio.revision }, "ready");
assert.throws(() => transitionBroadcastStudio(studio, { ...nextGraphic, lowerTitle: "changed after ready", revision: studio.revision }, "take"), /Mark this exact/);
studio = transitionBroadcastStudio(studio, { ...nextGraphic, revision: studio.revision }, "take");
assert.equal(studio.graphic, "casters");
assert.equal(studio.previousProgram?.graphic, state.graphic);
studio = transitionBroadcastStudio(studio, { ...studio, revision: studio.revision }, "restore");
assert.equal(studio.graphic, state.graphic, "Operator can restore the previous program");
assert.throws(() => transitionBroadcastStudio(studio, { ...studio, revision: 0 }, "hide"), /revision conflict/);
const production = parseEventProduction({ ...DEFAULT_EVENT_PRODUCTION, stages: [{ id: "s", name: "Finals", order: 0, advanceCount: 2 }], groups: [{ id: "g", stageId: "s", name: "A", teamIds: ["alpha"] }], days: [{ id: "d", stageId: "s", name: "Day 1", date: "2026-11-04" }] });
assert.equal(production.groups[0].teamIds[0], "alpha");
const sponsorConfig = parseEventProduction({ ...production, sponsors: [{ id: "sponsor", stageId: "s", dayId: "d", matchId: match.id, graphics: ["scoreboard"], rotationSeconds: 7, position: "top", startAt: "2026-11-04T12:00:00Z", endAt: "2026-11-04T16:00:00Z", visible: true }] });
const sponsorInput = { ...input, production: sponsorConfig, sponsors: [{ id: "sponsor", name: "APPROVED QA SPONSOR", tier: "broadcast", published: true, visible: true }], state: { ...state, stageId: "s", dayId: "d" }, tournament: { ...tournament, schedule: JSON.stringify({ ...parseEventSchedule(eventSchedule), matches: parseEventSchedule(eventSchedule)!.matches.map(row => ({ ...row, stageId: "s", dayId: "d" })) }) }, now: Date.parse("2026-11-04T14:00:00Z") };
assert.equal(buildBroadcastSnapshot(sponsorInput).sponsors[0]?.rotationSeconds, 7);
assert.equal(buildBroadcastSnapshot(sponsorInput).sponsors[0]?.position, "top");
assert.equal(buildBroadcastSnapshot({ ...sponsorInput, now: Date.parse("2026-11-04T16:00:00Z") }).sponsors.length, 0, "Expired sponsors disappear at the boundary");
assert.equal(buildBroadcastSnapshot({ ...sponsorInput, state: { ...sponsorInput.state, graphic: "casters" } }).sponsors.length, 0, "Sponsors cannot bleed into unassigned scenes");
assert.equal(buildBroadcastSnapshot({ ...sponsorInput, sponsors: [{ ...sponsorInput.sponsors[0], published: false }] }).sponsors.length, 0);
assert.throws(() => parseEventProduction({ ...production, groups: [{ ...production.groups[0], stageId: "another-event-stage" }] }));
assert.throws(() => parseEventProduction({ ...production, assets: [{ id: "bad", url: "https://assets.bravogamingesports.com/image.png?token=private" }] }));
const scopedSchedule = JSON.stringify({ ...parseEventSchedule(eventSchedule), matches: parseEventSchedule(eventSchedule)!.matches.map((row, index) => ({ ...row, stageId: "s", groupId: index ? "other" : "g", dayId: "d" })) });
const scoped = buildBroadcastSnapshot({ ...input, production, tournament: { ...tournament, schedule: scopedSchedule }, state: { ...state, stageId: "s", groupId: "g", dayId: "d" } });
assert.equal(scoped.scheduledMatches.length, 1);
assert.equal(scoped.control.stageLabel, "Finals · A · Day 1");
assert.equal(buildBroadcastSnapshot({ ...input, production, state: { ...state, stageId: "wrong" } }).standings.length, 0);
assert.equal(buildBroadcastSnapshot({ ...input, privatePreview: true, tournament: { ...tournament, published: false } }).results.length, 2, "Only explicitly authorized preview builders can include draft events");
const historicalRoster = buildBroadcastSnapshot({ ...input, players: [{ id: "player-b", name: "CURRENT_RENAMED_PROFILE", inGameName: "CURRENT_RENAMED_PROFILE", teamId: "another-team", kills: 0, damage: 0, assists: 0, matches: 0, mvpCount: 0, chickenDinners: 0 }], state: { ...state, teamId: "alpha" }, teams: logoInput.teams });
assert.equal(historicalRoster.selectedTeam?.players.find(player => player.playerId === "player-b")?.playerName, "player-b", "Historical match names must not follow later profile edits");
assert.ok(snapshot.leaderRoster.every(player => player.id.startsWith("player-")), "Leader portraits derive from scoped historical results, never the current roster");
const withdrawn = buildBroadcastSnapshot({ ...enhanced, matches: [{ ...match, status: "draft" }] });
assert.equal(withdrawn.mvp, null);
assert.equal(withdrawn.selectedTeam?.players.length, 0);
assert.equal(withdrawn.standings.length, 0);
assert.equal(withdrawn.scheduledMatches[0].status, "completed", "Unpublished results cannot remain labeled results-published");
const updatedLogo = buildBroadcastSnapshot({
  ...enhanced,
  teams: [{ ...enhanced.teams[0], logoUrl: "/api/uploads/r2?key=teams%2Falpha%2Freplaced.png" }],
});
assert.notEqual(updatedLogo.selectedTeam?.logoUrl, enhancedSnapshot.selectedTeam?.logoUrl);
const updatedScores = buildBroadcastSnapshot({ ...enhanced, matches: [{ ...match, teamResults: [team("alpha", 1, 20)] }] });
assert.equal(updatedScores.standings[0].totalPoints, 30);
for (const patch of [
  { countdownTarget: "2026-11-04T21:00" },
  { statsScope: "lifetime" },
  { rosterIds: Array(5).fill("p") },
  { mapArtwork: { Erangel: "https://assets.bravogamingesports.com/map.png?signature=secret" } },
  { casters: [{ id: "bad", name: "Name", role: "Caster", handle: "", published: true, portraitUrl: "/api/uploads/private/private-file" }] },
])
  assert.throws(() => parseBroadcastState({ ...state, ...patch }));

const rules = {
  id: "qa-rules",
  ...parsePointSystemInput({ name: "QA custom", kill_points: 2.5, placement_points: { "1": 12, "2": 7 } }),
} satisfies PointSystemRecord;
const scored = scoreMatchResults(match.teamResults!, match.playerResults!, rules);
assert.equal(scored.teamResults.find((row) => row.teamId === "alpha")?.totalPoints, 14.5);
assert.equal(scored.teamResults.find((row) => row.teamId === "bravo")?.totalPoints, 57);
assert.equal(scored.playerResults[0].totalPoints, 24.5);
const customRules = { ...rules, placement_points: { "1": 12.25, "2": 7 }, rules_json: parseScoringRules({ tieBreakers: ["wins", "kills"], awardCriteria: ["damage", "kills"] }) };
const customScores = scoreMatchResults([{ ...team("alpha", 1, 1), totalPoints: 9999, adjustmentPoints: -4, decisionReason: "Approved late roster penalty" }, team("bravo", 2, 20)], match.playerResults!, customRules);
assert.equal(customScores.teamResults.find(row => row.teamId === "alpha")?.totalPoints, 10.75, "Server-calculated points include an explicit signed decision and ignore supplied totals");
assert.equal(customScores.playerResults[0].playerId, "player-c", "Award criteria belong to the saved scoring version");
const customSnapshot = buildBroadcastSnapshot({ ...input, matches: [{ ...match, scoringRules: customScores.scoringRules, teamResults: customScores.teamResults, playerResults: customScores.playerResults }] });
assert.equal(customSnapshot.mvp?.playerId, "player-c");
assert.equal(customSnapshot.topFragger?.playerId, "player-b", "Custom MVP criteria must not change the top-fragger definition");
const dq = scoreMatchResults([{ ...team("alpha", 1, 10), disqualified: true, decisionReason: "Approved match disqualification" }, team("bravo", 2, 5)], match.playerResults!, customRules);
assert.equal(dq.teamResults.find(row => row.teamId === "alpha")?.totalPoints, 0);
assert.equal(dq.winner, "Winner Pending", "DQ never silently promotes another team");
const dqSnapshot = buildBroadcastSnapshot({ ...input, matches: [{ ...match, scoringRules: dq.scoringRules, teamResults: dq.teamResults, playerResults: dq.playerResults }] });
assert.equal(dqSnapshot.mvp, null);
assert.equal(dqSnapshot.topFragger, null);
assert.equal(dqSnapshot.winner, null);
const tiedMatch = { ...match, scoringRules: customScores.scoringRules, teamResults: [team("alpha", 2, 10), team("bravo", 1, 6)] };
assert.equal(buildTournamentStandings(tournament.id, tournament.title, [tiedMatch])[0].teamId, "bravo", "All standings rows use one configured tie-break sequence");
const earlierTie = { ...tiedMatch, id: "earlier", matchNumber: 1, teamResults: [team("alpha", 1, 2), team("bravo", 2, 3)] };
const laterTie = { ...tiedMatch, id: "later", matchNumber: 2 };
assert.deepEqual(buildTournamentStandings(tournament.id, tournament.title, [earlierTie, laterTie]), buildTournamentStandings(tournament.id, tournament.title, [laterTie, earlierTie]), "Latest-placement ties are deterministic for equal timestamps regardless of query order");
for (const decision of [{ adjustmentPoints: -5 }, { adjustmentPoints: 1001, decisionReason: "Too large" }, { adjustmentPoints: 0.001, decisionReason: "Too precise" }, { disqualified: "yes" }, { disqualified: true, decisionReason: "DQ", adjustmentPoints: 2 }]) assert.throws(() => parseScoringDecision(decision));
for (const sequence of [{ tieBreakers: ["kills", "kills"] }, { tieBreakers: ["madeUp"] }, { awardCriteria: [] }, { awardCriteria: ["totalPoints"] }]) assert.throws(() => parseScoringRules(sequence));
assert.equal(
  scoreMatchResults([team("bravo", 2, 1)], [], rules).winner,
  "Winner Pending",
  "Never invent a winner when first place is absent",
);
for (const invalid of [
  { name: "" },
  { kill_points: -1 },
  { kill_points: 0.123 },
  { placement_points: { "0": 1 } },
  { placement_points: { "1": -1 } },
  { placement_points: { "65": 1 } },
  { placement_points: [] },
])
  assert.throws(() => parsePointSystemInput({ name: "rules", kill_points: 1, placement_points: { "1": 10 }, ...invalid }));

const scrim: Scrim = {
  id: "day-1",
  title: "Daily scrim",
  date: "2026-11-04",
  map: "Erangel",
  lobbyTime: "20:00 NPT",
  roomId: "PRIVATE_ROOM",
  roomPassword: "PRIVATE_PASSWORD",
  status: "scheduled",
  teamIds: [],
  published: true,
};
validateScrimInput({ ...scrim });
for (const patch of [
  { status: "invented" },
  { date: "bad" },
  { title: " " },
  { seasonDayNumber: -1 },
  { roomId: 123 },
  { published: "true" },
])
  assert.throws(() => validateScrimInput({ ...scrim, ...patch }));
assert.doesNotMatch(JSON.stringify(scrimAuditSummary(scrim)), /PRIVATE_|roomPassword|roomId/);
assert.doesNotMatch(JSON.stringify(toPublicScrim(scrim)), /PRIVATE_|roomPassword|roomId/);
validateMatchResultsForPublication(match.teamResults!, match.playerResults!);
for (const invalid of [[], [team("a", 2, 1)], [team("a", 1, -1)], [team("a", 1, 1), team("b", 1, 1)], [team("a", 1, 1), team("a", 2, 1)]])
  assert.throws(() => validateMatchResultsForPublication(invalid, []));
assert.throws(() => validateMatchResultsForPublication(match.teamResults!, [player("a", -1, 100)]));
assert.throws(() => validateMatchResultsForPublication(match.teamResults!, [player("a", 1, 100), player("a", 2, 200)]));
assert.throws(() => validateMatchResultsForPublication(match.teamResults!, [{ ...player("a", 1, 100), placement: 2 }]));
async function checkRecovery() {
  let now = 0;
  let attempts = 0;
  let available = false;
  const probe = createReadinessProbe(
    async () => {
      attempts += 1;
      if (!available) throw new Error("Simulated outage");
      return true;
    },
    () => now,
  );
  const first = probe();
  assert.equal(probe(), first, "Concurrent readiness checks share one request");
  await assert.rejects(first, /Simulated outage/);
  available = true;
  now = 4999;
  await assert.rejects(probe(), /Simulated outage/);
  assert.equal(attempts, 1, "Outages use bounded retry caching");
  now = 5001;
  assert.equal(await probe(), true, "A transient outage must recover without a process restart");
  assert.equal(attempts, 2);
  now = 35_002;
  assert.equal(await probe(), true);
  assert.equal(attempts, 3, "Successful readiness is periodically rechecked");
  console.log("Broadcast privacy, scoring, publication, scrims and database-outage recovery QA passed.");
}
void checkRecovery().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
