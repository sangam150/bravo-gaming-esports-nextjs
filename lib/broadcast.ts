import { compareMatchPlayerResults, compareTopFraggerPerformance, compareTeamLeaderboardPerformance } from "./ranking-sort";
import { isExplicitlyPublishedMatch, sanitizePublicMatch, publicMatchPlayerId } from "./public-match";
import { buildTournamentStandings } from "./tournament-standings";
import { resolvePublicAssetUrl } from "./public-asset-url";
import type { Player, Scrim, SponsorItem, Team, Tournament, TournamentMatch } from "./types";
import { isPublicScrim } from "./public-scrims";
import { validateScrimSlots } from "./scrim-slots";
import { parseEventSchedule } from "./event-schedule";
import { parseBroadcastTemplate, defaultBroadcastTemplate, type BroadcastTemplate } from "./broadcast-template";
import type { EventProduction } from "./event-production";

export const BROADCAST_GRAPHICS = [
  "scoreboard",
  "results",
  "winner",
  "mvp",
  "top-fragger",
  "top-damage",
  "headshots",
  "players",
  "rankings",
  "standings",
  "lower-third",
  "schedule",
  "sponsors",
  "opening",
  "closing",
  "killfeed",
  "road-to-finals",
  "road-to-finals-2",
  "todays-matches",
  "map-intro",
  "countdown",
  "casters",
  "team-stats",
  "break",
  "group-standings",
  "day-standings",
  "compact-scoreboard",
  "match-info",
  "team-spotlight",
  "sponsor-strip",
  "champion",
  "final-rankings",
  "player-comparison",
  "technical-break",
  "analyst-panel",
  "starting-soon",
  "advancement",
  "team-slots",
] as const;
export type BroadcastGraphic = (typeof BROADCAST_GRAPHICS)[number];
export const BROADCAST_GRAPHIC_GROUPS: { name: string; graphics: readonly BroadcastGraphic[] }[] = [
  { name: "Opening", graphics: ["opening", "countdown", "starting-soon"] },
  { name: "Schedule", graphics: ["schedule", "todays-matches", "map-intro", "team-slots"] },
  { name: "Gameplay", graphics: ["scoreboard", "compact-scoreboard", "match-info", "lower-third", "headshots", "killfeed"] },
  {
    name: "Standings",
    graphics: [
      "rankings",
      "standings",
      "road-to-finals",
      "road-to-finals-2",
      "group-standings",
      "day-standings",
      "final-rankings",
      "advancement",
    ],
  },
  { name: "Results", graphics: ["results"] },
  { name: "Players", graphics: ["players", "team-stats", "team-spotlight", "player-comparison", "top-fragger", "top-damage", "mvp"] },
  { name: "Winners", graphics: ["winner", "champion"] },
  { name: "Sponsors", graphics: ["sponsors", "sponsor-strip"] },
  { name: "Casters", graphics: ["casters", "analyst-panel"] },
  { name: "Break / Closing", graphics: ["break", "technical-break", "closing"] },
];
export type BroadcastCaster = {
  id: string;
  name: string;
  role: string;
  handle: string;
  portraitUrl: string;
  published: boolean;
  eventId?: string;
  dayId?: string;
  country?: string;
  order?: number;
};
export interface BroadcastState {
  revision: number;
  tournamentId: string;
  matchId: string;
  scrimId?: string;
  playerId: string;
  comparisonPlayerId?: string;
  rundown?: BroadcastGraphic[];
  graphic: BroadcastGraphic;
  visible: boolean;
  lowerTitle: string;
  lowerSubtitle: string;
  revealId: number;
  page: number;
  updatedAt?: string;
  teamId?: string;
  rosterIds?: string[];
  statsScope?: "match" | "tournament";
  countdownTarget?: string;
  stageLabel?: string;
  mapArtwork?: Record<string, string>;
  casters?: BroadcastCaster[];
  templates?: Partial<Record<BroadcastGraphic, BroadcastTemplate>>;
  presets?: { id: string; name: string; tournamentId: string; graphic: BroadcastGraphic; template: BroadcastTemplate }[];
  stageId?: string;
  groupId?: string;
  dayId?: string;
}
export const DEFAULT_BROADCAST_STATE: BroadcastState = {
  revision: 0,
  tournamentId: "",
  matchId: "",
  scrimId: "",
  playerId: "",
  graphic: "scoreboard",
  visible: false,
  lowerTitle: "",
  lowerSubtitle: "",
  revealId: 0,
  page: 0,
  teamId: "",
  rosterIds: [],
  statsScope: "match",
  countdownTarget: "",
  stageLabel: "",
  mapArtwork: {},
  casters: [],
};

export function isBroadcastGraphic(value: unknown): value is BroadcastGraphic {
  return typeof value === "string" && BROADCAST_GRAPHICS.some((graphic) => graphic === value);
}

export function parseBroadcastState(value: unknown): BroadcastState {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("A broadcast state object is required.");
  const row = value as Record<string, unknown>;
  if (!Number.isSafeInteger(row.revision) || Number(row.revision) < 0) throw new Error("A valid revision is required.");
  if (!isBroadcastGraphic(row.graphic) || typeof row.visible !== "boolean") throw new Error("A valid graphic and visibility are required.");
  const page = row.page ?? 0;
  if (!Number.isSafeInteger(page) || Number(page) < 0 || Number(page) > 99) throw new Error("Scoreboard page must be from 1 to 100.");
  const text = (key: string, limit: number) => {
    if (typeof row[key] !== "string" || row[key].length > limit) throw new Error(`${key} must be text of at most ${limit} characters.`);
    return row[key].trim();
  };
  const optionalText = (key: string, limit: number) => (row[key] === undefined ? "" : text(key, limit));
  const countdownTarget = optionalText("countdownTarget", 80);
  if (countdownTarget && (!/(Z|[+-]\d{2}:\d{2})$/.test(countdownTarget) || !Number.isFinite(Date.parse(countdownTarget))))
    throw new Error("Countdown target must include a valid timezone.");
  if (row.statsScope !== undefined && row.statsScope !== "match" && row.statsScope !== "tournament")
    throw new Error("Select match or tournament statistics.");
  if (
    row.rosterIds !== undefined &&
    (!Array.isArray(row.rosterIds) || row.rosterIds.length > 4 || row.rosterIds.some((id) => typeof id !== "string" || id.length > 160))
  )
    throw new Error("Select up to four roster players.");
  const artwork = row.mapArtwork ?? {};
  if (!artwork || typeof artwork !== "object" || Array.isArray(artwork) || Object.keys(artwork).length > 20)
    throw new Error("Invalid map artwork.");
  const mapArtwork: Record<string, string> = {};
  for (const [map, url] of Object.entries(artwork)) {
    if (map.length > 80 || typeof url !== "string" || url.length > 2000 || (url && !publicImage(url)))
      throw new Error("Map artwork must use a public asset URL.");
    mapArtwork[map] = url;
  }
  const casterRows = row.casters ?? [];
  if (!Array.isArray(casterRows) || casterRows.length > 4) throw new Error("Configure up to four casters.");
  const casters: BroadcastCaster[] = casterRows.map((value) => {
    if (!value || typeof value !== "object") throw new Error("Invalid caster profile.");
    const caster = value as Record<string, unknown>;
    for (const key of ["id", "name", "role", "handle", "portraitUrl"])
      if (typeof caster[key] !== "string" || String(caster[key]).length > (key === "portraitUrl" ? 2000 : 100))
        throw new Error("Invalid caster profile field.");
    if (
      typeof caster.published !== "boolean" ||
      (caster.published && !String(caster.name).trim()) ||
      (caster.portraitUrl && !publicImage(String(caster.portraitUrl)))
    )
      throw new Error("Caster profiles need a name and a public portrait URL.");
    for (const key of ["eventId", "dayId", "country"])
      if (caster[key] !== undefined && (typeof caster[key] !== "string" || String(caster[key]).length > 160))
        throw new Error("Invalid caster assignment.");
    if (caster.order !== undefined && (!Number.isSafeInteger(caster.order) || Number(caster.order) < 0 || Number(caster.order) > 100))
      throw new Error("Invalid caster display order.");
    return {
      id: String(caster.id),
      name: String(caster.name).trim(),
      role: String(caster.role).trim(),
      handle: String(caster.handle).trim(),
      portraitUrl: String(caster.portraitUrl),
      published: caster.published,
      eventId: String(caster.eventId ?? ""),
      dayId: String(caster.dayId ?? ""),
      country: String(caster.country ?? ""),
      order: Number(caster.order ?? 0),
    };
  });
  const templates: BroadcastState["templates"] = {};
  if (row.templates !== undefined && (!row.templates || typeof row.templates !== "object" || Array.isArray(row.templates)))
    throw new Error("Invalid graphic templates.");
  for (const [graphic, template] of Object.entries(row.templates ?? {})) {
    if (!isBroadcastGraphic(graphic)) throw new Error("Unknown graphic template.");
    templates[graphic] = parseBroadcastTemplate(template);
  }
  if (row.presets !== undefined && (!Array.isArray(row.presets) || row.presets.length > 30))
    throw new Error("Save up to 30 reusable presets.");
  const presets = ((row.presets ?? []) as Record<string, unknown>[]).map((preset) => {
    if (
      !preset ||
      !isBroadcastGraphic(preset.graphic) ||
      typeof preset.id !== "string" ||
      preset.id.length > 100 ||
      typeof preset.name !== "string" ||
      !preset.name.trim() ||
      preset.name.length > 100 ||
      typeof preset.tournamentId !== "string" ||
      preset.tournamentId.length > 160
    )
      throw new Error("Invalid named graphic preset.");
    return {
      id: preset.id,
      name: preset.name.trim(),
      tournamentId: preset.tournamentId,
      graphic: preset.graphic,
      template: parseBroadcastTemplate(preset.template),
    };
  });
  const rundown = row.rundown ?? [];
  if (!Array.isArray(rundown) || rundown.length > BROADCAST_GRAPHICS.length || rundown.some(graphic => !isBroadcastGraphic(graphic)) || new Set(rundown).size !== rundown.length) throw new Error("The rundown must contain unique supported graphics.");
  if (new Set(casters.map((caster) => caster.id)).size !== casters.length) throw new Error("Caster identities must be unique.");
  return {
    revision: Number(row.revision),
    tournamentId: text("tournamentId", 160),
    matchId: text("matchId", 160),
    scrimId: optionalText("scrimId", 160),
    playerId: text("playerId", 160),
    comparisonPlayerId: optionalText("comparisonPlayerId", 160),
    rundown: [...rundown] as BroadcastGraphic[],
    graphic: row.graphic,
    visible: row.visible,
    lowerTitle: text("lowerTitle", 100),
    lowerSubtitle: text("lowerSubtitle", 180),
    revealId: 0, // Only the server advances reveal sequences.
    page: Number(page),
    teamId: optionalText("teamId", 160),
    rosterIds: (row.rosterIds ?? []) as string[],
    statsScope: row.statsScope === "tournament" ? "tournament" : "match",
    countdownTarget,
    stageLabel: optionalText("stageLabel", 100),
    mapArtwork,
    casters,
    templates,
    presets,
    stageId: optionalText("stageId", 100),
    groupId: optionalText("groupId", 100),
    dayId: optionalText("dayId", 100),
  };
}

function publicImage(value?: string) {
  if (!value) return undefined;
  try {
    if (value.includes("://")) {
      const url = new URL(value);
      if (url.username || url.password || (url.search && url.pathname !== "/api/uploads/r2")) return undefined;
    }
    return resolvePublicAssetUrl(value) ?? undefined;
  } catch {
    return undefined;
  }
}

export function buildBroadcastSnapshot(input: {
  state: BroadcastState;
  tournament: Tournament | null;
  matches: TournamentMatch[];
  teams: Team[];
  players: Player[];
  sponsors: SponsorItem[];
  scrim?: Scrim | null;
  privatePreview?: boolean;
  production?: EventProduction | null;
  now?: number;
}) {
  const selectedInputMatch = input.matches.find(row => row.id === input.state.matchId);
  const selectedPublicId = (id?: string) => {
    const index = selectedInputMatch?.playerResults?.findIndex(row => row.playerId === id) ?? -1;
    return index >= 0 ? publicMatchPlayerId(selectedInputMatch!.playerResults![index], selectedInputMatch!.id, index) : id;
  };
  const state = { ...input.state, playerId: selectedPublicId(input.state.playerId) ?? "", comparisonPlayerId: selectedPublicId(input.state.comparisonPlayerId) ?? "",
    rosterIds: (input.state.rosterIds ?? []).flatMap(id => {
      const publicIds = input.matches.flatMap(match => (match.playerResults ?? []).flatMap((row,index) => row.playerId === id ? [publicMatchPlayerId(row, match.id, index)] : []));
      return publicIds.length ? publicIds : [id];
    }) };
  // Defense in depth: never let a stale control selection expose unpublished data.
  const tournament = input.tournament?.published === true || input.privatePreview === true ? input.tournament : null;
  const production = input.production;
  let structuredSchedule = null;
  try {
    structuredSchedule = tournament ? parseEventSchedule(tournament.schedule) : null;
  } catch {
    /* Invalid schedules fail closed. */
  }
  const stage = production?.stages.find((row) => row.id === state.stageId && (!row.archived || input.privatePreview));
  const group = production?.groups.find(
    (row) => row.id === state.groupId && (!row.archived || input.privatePreview) && (!state.stageId || row.stageId === state.stageId),
  );
  const day = production?.days.find(
    (row) => row.id === state.dayId && (!row.archived || input.privatePreview) && (!state.stageId || row.stageId === state.stageId),
  );
  const validScope = (!state.stageId || Boolean(stage)) && (!state.groupId || Boolean(group)) && (!state.dayId || Boolean(day));
  const contextRows = (structuredSchedule?.matches ?? []).filter(
    (row) =>
      (!state.stageId || row.stageId === state.stageId) &&
      (!state.groupId || row.groupId === state.groupId) &&
      (!state.dayId || row.dayId === state.dayId),
  );
  const hasScope = Boolean(state.stageId || state.groupId || state.dayId);
  const matches = tournament
    ? input.matches
        .filter(
          (match) =>
            validScope &&
            match.tournamentId === tournament.id &&
            (input.privatePreview === true || isExplicitlyPublishedMatch(match)) &&
            !match.deletedAt &&
            (!hasScope ||
              contextRows.some((row) =>
                row.matchId ? row.matchId === match.id : row.matchNumber === (match.matchNumber ?? match.sequenceNumber),
              )),
        )
        .map(sanitizePublicMatch)
    : [];
  const match = matches.find((item) => item.id === state.matchId) ?? null;
  const teamImages = new Map(
    input.teams
      .filter((team) => !team.deletedAt && team.status !== "inactive")
      .map((team) => [team.id, publicImage(team.logoUrl ?? team.logo)]),
  );
  // Slots belong to one explicitly selected, linked scrim. Global team slot
  // metadata and list order must never become a lobby assignment.
  const candidateScrim = input.scrim;
  const slotScrim = tournament && candidateScrim && candidateScrim.id === state.scrimId && candidateScrim.tournamentId === tournament.id &&
    !candidateScrim.deletedAt && (input.privatePreview === true || isPublicScrim(candidateScrim)) ? candidateScrim : null;
  const capacity = slotScrim?.teamCapacity;
  const assignments = slotScrim?.slotAssignments ?? [];
  let validSlots = false;
  if (slotScrim && typeof capacity === "number") {
    try { validateScrimSlots(slotScrim as unknown as Record<string, unknown>); validSlots = true; }
    catch { /* Malformed or legacy unconfigured slots never become a lobby layout. */ }
  }
  const teamSlots = slotScrim && validSlots ? Array.from({ length: capacity! }, (_, index) => {
    const slotNumber = index + 1;
    const assignment = assignments.find(row => row.slotNumber === slotNumber);
    const team = assignment ? input.teams.find(row => row.id === assignment.teamId && teamImages.has(row.id)) : null;
    return { slotNumber, occupied: Boolean(assignment), teamId: team?.id, teamName: team?.name, logoUrl: team ? teamImages.get(team.id) : undefined };
  }) : [];
  const playerImages = new Map(
    input.players
      .filter((player) => !player.deletedAt && player.playerStatus !== "inactive")
      .map((player) => [player.id, publicImage(player.avatarUrl ?? player.avatar)]),
  );
  const standings = tournament
    ? buildTournamentStandings(tournament.id, tournament.title, matches)
        .sort(compareTeamLeaderboardPerformance)
        .map((row, index) => ({
          rank: index + 1,
          teamId: row.teamId,
          teamName: row.teamName,
          matches: row.matches,
          wins: row.wins,
          kills: row.kills,
          killPoints: row.killPoints,
          placementPoints: row.placementPoints,
          adjustmentPoints: row.adjustmentPoints ?? 0,
          penaltyPoints: row.penaltyPoints ?? 0,
          bonusPoints: row.bonusPoints ?? 0,
          disqualifications: row.disqualifications ?? 0,
          totalPoints: row.totalPoints,
          logoUrl: teamImages.get(row.teamId),
        }))
    : [];
  const results = [...(match?.teamResults ?? [])].sort(compareTeamLeaderboardPerformance).map((row, index) => ({
    rank: index + 1,
    teamId: row.teamId,
    teamName: row.teamName,
    placement: row.placement,
    kills: row.kills,
    killPoints: row.killPoints,
    placementPoints: row.placementPoints,
    totalPoints: row.totalPoints,
    adjustmentPoints: row.adjustmentPoints ?? 0,
    decisionReason: row.decisionReason || "",
    disqualified: row.disqualified ?? false,
    logoUrl: row.teamId ? teamImages.get(row.teamId) : undefined,
  }));
  const players = [...(match?.playerResults ?? [])].sort(compareMatchPlayerResults).map((row) => ({
    playerId: row.playerId,
    playerName: row.playerName,
    teamName: row.teamName,
    teamId: row.teamId,
    teamLogoUrl: row.teamId ? teamImages.get(row.teamId) : undefined,
    kills: row.kills,
    assists: row.assists,
    knocks: row.knocks,
    damage: row.damage,
    survivalTime: row.survivalTime,
    avatarUrl: playerImages.get(row.playerId),
    disqualified: row.disqualified ?? false,
  }));
  const eligiblePlayers = players.filter((player) => !player.disqualified);
  const winner = match?.teamResults?.find((row) => row.placement === 1 && !row.disqualified);
  const scheduledMatches = (validScope ? contextRows : []).map((row) => {
    const published = matches.find((match) =>
      row.matchId ? match.id === row.matchId : (match.matchNumber ?? match.sequenceNumber) === row.matchNumber,
    );
    return {
      matchNumber: row.matchNumber,
      map: row.map,
      mapLabel: production?.maps.find(map => map.name === row.map && !map.archived)?.label || row.map,
      scheduledAt: row.scheduledAt,
      status: published && isExplicitlyPublishedMatch(published) ? "results-published" : row.status,
      displayTitle: row.displayTitle || row.title || "",
      artworkUrl: publicImage(
        state.mapArtwork?.[row.map] ||
          production?.maps.find((map) => map.name === row.map && !map.archived)?.thumbnail ||
          production?.maps.find((map) => map.name === row.map && !map.archived)?.artwork,
      ),
    };
  });
  const selectedTeam = tournament ? input.teams.find((team) => team.id === state.teamId && teamImages.has(team.id)) : undefined;
  const sceneMap = production?.maps.find(map => map.name === (match?.map || scheduledMatches.find(row => ["upcoming", "scheduled", "lobby-open"].includes(row.status))?.map) && !map.archived);
  const presentation = parseBroadcastTemplate(state.templates?.[state.graphic] ?? defaultBroadcastTemplate(state.graphic));
  if (!presentation.backgroundUrl && ["map-intro", "countdown", "starting-soon", "match-info"].includes(state.graphic)) presentation.backgroundUrl = publicImage(sceneMap?.background) || "";
  const teamStats = new Map<string, (typeof players)[number]>();
  const scopedMatches = state.statsScope === "tournament" ? matches : match ? [match] : [];
  for (const scoped of scopedMatches)
    for (const row of scoped.playerResults ?? []) {
      if (!selectedTeam || row.teamId !== selectedTeam.id) continue;
      const existing = teamStats.get(row.playerId);
      const portrait = input.players.find((player) => player.id === row.playerId);
      teamStats.set(row.playerId, {
        disqualified: row.disqualified ?? false,
        playerId: row.playerId,
        playerName: row.playerName || portrait?.inGameName || portrait?.name || "Player",
        teamId: selectedTeam.id,
        teamName: selectedTeam.name,
        teamLogoUrl: teamImages.get(selectedTeam.id),
        avatarUrl: playerImages.get(row.playerId),
        kills: (existing?.kills ?? 0) + row.kills,
        assists: (existing?.assists ?? 0) + row.assists,
        knocks: (existing?.knocks ?? 0) + row.knocks,
        damage: (existing?.damage ?? 0) + row.damage,
        survivalTime: (existing?.survivalTime ?? 0) + row.survivalTime,
      });
    }
  const teamPlayers = [...teamStats.values()]
    .filter((player) => !state.rosterIds?.length || state.rosterIds.includes(player.playerId))
    .sort((a, b) => compareTopFraggerPerformance(a, b) || a.playerId.localeCompare(b.playerId))
    .slice(0, 4);
  const allScheduledResultsPublished = Boolean(
    contextRows.length &&
    contextRows.every(
      (row) =>
        row.status === "cancelled" ||
        matches.some(
          (match) =>
            isExplicitlyPublishedMatch(match) &&
            (row.matchId ? row.matchId === match.id : row.matchNumber === (match.matchNumber ?? match.sequenceNumber)),
        ),
    ),
  );
  const fullEventScope = !state.stageId && !state.groupId && !state.dayId;
  const eventCompleted = tournament?.status.toLowerCase() === "completed";
  const finalResults = Boolean(tournament && fullEventScope && eventCompleted && allScheduledResultsPublished && standings.length);
  const comparisonPlayers =
    state.playerId && state.comparisonPlayerId && state.playerId !== state.comparisonPlayerId
      ? [players.find((row) => row.playerId === state.playerId), players.find((row) => row.playerId === state.comparisonPlayerId)].filter(
          (row): row is (typeof players)[number] => Boolean(row),
        )
      : [];
  return {
    control: {
      revision: state.revision,
      graphic: state.graphic,
      visible: state.visible && Boolean(tournament),
      lowerTitle: state.lowerTitle,
      lowerSubtitle: state.lowerSubtitle,
      revealId: state.revealId,
      page: state.page ?? 0,
      presentation,
      countdownTarget: tournament ? (state.countdownTarget ?? "") : "",
      stageLabel: tournament
        ? state.stageLabel || [stage?.name, group?.name, day?.name].filter(Boolean).join(" · ") || structuredSchedule?.stage || ""
        : "",
      scope: { stage: Boolean(stage), group: Boolean(group), day: Boolean(day) },
    },
    tournament: tournament
      ? {
          id: tournament.id,
          title: tournament.title,
          startDate: tournament.startDate,
          endDate: tournament.endDate,
          mapRotation: tournament.mapRotation ?? [],
          logoUrl: publicImage(production?.eventLogo),
          shortName: production?.shortName,
        }
      : null,
    match: match
      ? {
          id: match.id,
          matchNumber: match.matchNumber ?? match.sequenceNumber,
          map: match.map,
          mapLabel: sceneMap?.label || match.map,
          playedAt: match.playedAt,
          dataSource: match.dataSource,
          pointSystemName: match.pointSystemName,
          status: match.status,
        }
      : null,
    results,
    standings,
    players,
    winner: winner
      ? { teamName: winner.teamName, kills: winner.kills, logoUrl: winner.teamId ? teamImages.get(winner.teamId) : undefined }
      : null,
    champion: finalResults ? standings[0] : null,
    finalResults,
    advancement:
      stage && !state.groupId && !state.dayId && stage.advanceCount > 0
        ? {
            count: stage.advanceCount,
            final: Boolean(stage.completed && allScheduledResultsPublished),
            teams: standings.slice(0, stage.advanceCount),
          }
        : null,
    comparisonPlayers: comparisonPlayers.length === 2 ? comparisonPlayers : [],
    mvp: eligiblePlayers[0] ?? null,
    mvpRule: (match?.scoringRules?.awardCriteria ?? ["totalPoints", "kills", "damage", "assists"])
      .map((key) => key.replace(/([A-Z])/g, " $1").toLowerCase())
      .join(", then "),
    mvpScales: {
      assists: Math.max(1, ...players.map(player => player.assists)),
      kills: Math.max(1, ...players.map((player) => player.kills)),
      damage: Math.max(1, ...players.map((player) => player.damage)),
      knocks: Math.max(1, ...players.map((player) => player.knocks)),
      survivalTime: Math.max(1, ...players.map((player) => player.survivalTime)),
    },
    leaderRoster:
      tournament && standings[0]
        ? (
            [...matches]
              .sort(
                (a, b) =>
                  (b.playedAt ?? "").localeCompare(a.playedAt ?? "") ||
                  (b.matchNumber ?? b.sequenceNumber ?? 0) - (a.matchNumber ?? a.sequenceNumber ?? 0),
              )
              .find((row) => row.playerResults?.some((player) => player.teamId === standings[0].teamId))?.playerResults ?? []
          )
            .filter((player) => player.teamId === standings[0].teamId)
            .slice(0, 4)
            .map((player) => ({ id: player.playerId, name: player.playerName, avatarUrl: playerImages.get(player.playerId) }))
        : [],
    topFragger: [...eligiblePlayers].sort(compareTopFraggerPerformance)[0] ?? null,
    topDamage:
      [...eligiblePlayers].sort((a, b) => b.damage - a.damage || b.kills - a.kills || a.playerId.localeCompare(b.playerId))[0] ?? null,
    selectedPlayer: players.find((player) => player.playerId === state.playerId) ?? null,
    selectedTeam: selectedTeam
      ? {
          id: selectedTeam.id,
          name: selectedTeam.name,
          logoUrl: teamImages.get(selectedTeam.id),
          scope: state.statsScope ?? "match",
          players: teamPlayers,
        }
      : null,
    registeredTeams: tournament
      ? input.teams
          .filter((team) => tournament.registeredTeamIds?.includes(team.id) && teamImages.has(team.id))
          .map((team) => ({ id: team.id, name: team.name, logoUrl: teamImages.get(team.id) }))
      : [],
    teamSlots,
    slotScrim: slotScrim && validSlots ? { id: slotScrim.id, title: slotScrim.title, date: slotScrim.date, locked: slotScrim.slotsLocked === true, capacity } : null,
    casters: tournament
      ? (state.casters ?? [])
          .filter(
            (caster) => caster.published === true && caster.eventId === tournament.id && (!caster.dayId || caster.dayId === state.dayId),
          )
          .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
          .map((caster) => ({
            id: caster.id,
            name: caster.name,
            role: caster.role,
            handle: caster.handle,
            country: caster.country,
            portraitUrl: publicImage(caster.portraitUrl),
          }))
      : [],
    mapArtworkUrl:
      tournament && match
        ? publicImage(state.mapArtwork?.[match.map] || production?.maps.find((map) => map.name === match.map && !map.archived)?.artwork)
        : undefined,
    mapAnnotationsUrl:
      tournament && match ? publicImage(production?.maps.find((map) => map.name === match.map && !map.archived)?.annotations) : undefined,
    scheduledMatches,
    timeZone: structuredSchedule?.timeZone ?? production?.timeZone ?? "Asia/Kathmandu",
    sponsors: tournament
      ? input.sponsors
          .filter(
            (row) =>
              row.published === true &&
              row.visible === true &&
              !row.deletedAt &&
              (production?.sponsors.some((assignment) => assignment.id === row.id) ||
                row.supportedEvents?.includes(tournament.id) ||
                row.eventSlugs?.includes(tournament.slug ?? tournament.id)),
          )
          .filter((row) => {
            const assignment = production?.sponsors.find((item) => item.id === row.id);
            if (!assignment) return !production?.sponsors.length;
            const now = input.now ?? Date.now();
            return (
              assignment.visible &&
              (!assignment.stageId || assignment.stageId === state.stageId) &&
              (!assignment.dayId || assignment.dayId === state.dayId) &&
              (!assignment.matchId || assignment.matchId === state.matchId) &&
              (!assignment.graphics.length || assignment.graphics.includes(state.graphic)) &&
              (!assignment.startAt || Date.parse(assignment.startAt) <= now) &&
              (!assignment.endAt || Date.parse(assignment.endAt) > now)
            );
          })
          .map((row) => ({
            id: row.id,
            name: row.name,
            logoUrl: publicImage(row.logoUrl),
            position: production?.sponsors.find((item) => item.id === row.id)?.position ?? "bottom",
            order: production?.sponsors.find((item) => item.id === row.id)?.order ?? 0,
            rotationSeconds: production?.sponsors.find((item) => item.id === row.id)?.rotationSeconds ?? 10,
          }))
          .sort((a, b) => a.order - b.order)
      : [],
    // These are deliberately unavailable until a verified event pipeline exists.
    headshotLeader: null,
    eliminations: [],
    schedule: tournament
      ? { startDate: tournament.startDate, endDate: tournament.endDate, mapRotation: tournament.mapRotation ?? [] }
      : null,
  };
}
export type BroadcastSnapshot = ReturnType<typeof buildBroadcastSnapshot>;
