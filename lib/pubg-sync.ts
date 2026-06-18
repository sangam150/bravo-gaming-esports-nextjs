import { ensureSeasonDay, getSeasonDayContext } from "./admin-season-days";
import { getCurrentSeason, getTournament, getTournamentMatches } from "./data";
import { BRAVO_DAILY_SCRIMS_SEASON, syncBravoDailyScrimSeason } from "./bravo-season-sync";
import { buildFallbackTeamNameFromSlot, canonicalizeBravoTeamName, getBravoCanonicalTeams, parseBravoSlotNumber, resolveBravoTeamIdentity } from "./bravo-teams";
import {
  COLLECTIONS,
  commitDocumentWriteOperations,
  fetchDocumentCollection,
  type DocumentWriteOperation,
  getDocument,
  isDocumentStoreConfigured,
  queryDocumentCollection,
} from "./document-store";
import { aggregateTeamResults, parseMatchParticipants, type ParsedPlayerStat } from "./pubg-match-parser";
import { buildPlayerAppearanceMapFromMatches, choosePreferredPlayerTeam } from "./player-team-history";
import { placementPoints, pubgFetch, PUBG_SHARD, summarizeMatch } from "./pubg";
import { compareMvpRankingPlayers, comparePlayerLeaderboardPerformance } from "./ranking-sort";
import { buildTournamentStandings } from "./tournament-standings";
import type {
  MatchPlayerRecord,
  MatchPlayerResult,
  Player,
  PubgBulkImportResult,
  PubgBulkImportResultItem,
  PubgBulkPreviewResult,
  PubgImportConflict,
  PubgImportContext,
  PubgImportEdit,
  PubgImportIssue,
  PubgImportPreview,
  PubgMatchImport,
  PubgDuplicateMode,
  Scrim,
  Season,
  Team,
  TeamMatchResult,
  Tournament,
  TournamentMatch,
  TournamentStanding,
} from "./types";

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function buildTournamentScopedTeamId(tournamentId: string, teamName: string) {
  const resolvedTeam = resolveBravoTeamIdentity(teamName);
  return `${tournamentId}--${resolvedTeam?.id ?? slugify(teamName)}`;
}

function buildTournamentScopedPlayerId(tournamentId: string, playerId: string, playerName: string) {
  return `${tournamentId}--${slugify(playerId || playerName)}`;
}

function buildMatchPlayerRecordId(matchId: string, playerId: string, playerName: string) {
  return `${matchId}--${slugify(playerId || playerName)}`;
}

function normalizeTeamResults(results: TeamMatchResult[]): TeamMatchResult[] {
  return results
    .map((result) => {
      const resolvedTeam = resolveBravoTeamIdentity(result.teamName);
      const inferredSlotNumber =
        resolvedTeam?.slotNumber ?? result.slotNumber ?? parseBravoSlotNumber(result.teamName);
      const normalizedName =
        resolvedTeam?.name ?? buildFallbackTeamNameFromSlot(inferredSlotNumber) ?? result.teamName;

      return {
        ...result,
        teamId: resolvedTeam?.id ?? slugify(normalizedName),
        teamName: normalizedName,
        slotNumber: inferredSlotNumber,
      };
    })
    .sort((firstResult, secondResult) => {
      if ((firstResult.slotNumber ?? Number.POSITIVE_INFINITY) !== (secondResult.slotNumber ?? Number.POSITIVE_INFINITY)) {
        return (firstResult.slotNumber ?? Number.POSITIVE_INFINITY) - (secondResult.slotNumber ?? Number.POSITIVE_INFINITY);
      }

      return firstResult.teamName.localeCompare(secondResult.teamName);
    });
}

function buildPlayerResults(players: ParsedPlayerStat[]): MatchPlayerResult[] {
  return players
    .map((player) => {
      const resolvedTeam = resolveBravoTeamIdentity(player.teamName);
      const inferredSlotNumber = resolvedTeam?.slotNumber ?? parseBravoSlotNumber(player.teamName);
      const normalizedTeamName =
        resolvedTeam?.name ?? buildFallbackTeamNameFromSlot(inferredSlotNumber) ?? player.teamName;
      const normalizedPlacementPoints = placementPoints(player.placement);

      return {
        playerId: player.playerId,
        pubgPlayerId: player.playerId,
        playerName: player.playerName,
        teamId: resolvedTeam?.id ?? slugify(normalizedTeamName),
        teamName: normalizedTeamName,
        slotNumber: inferredSlotNumber,
        placement: player.placement,
        kills: player.kills,
        assists: player.assists,
        knocks: player.knocks,
        damage: player.damage,
        survivalTime: player.survivalTime,
        placementPoints: normalizedPlacementPoints,
        totalPoints: normalizedPlacementPoints + player.kills,
      } satisfies MatchPlayerResult;
    })
    .sort((firstPlayer, secondPlayer) => {
      if ((firstPlayer.slotNumber ?? Number.POSITIVE_INFINITY) !== (secondPlayer.slotNumber ?? Number.POSITIVE_INFINITY)) {
        return (firstPlayer.slotNumber ?? Number.POSITIVE_INFINITY) - (secondPlayer.slotNumber ?? Number.POSITIVE_INFINITY);
      }

      return firstPlayer.playerName.localeCompare(secondPlayer.playerName);
    });
}

function getMatchMvpPlayerKey(match: TournamentMatch) {
  const playerResults = [...(match.playerResults ?? [])];
  if (playerResults.length === 0) return null;

  const mvp =
    playerResults.sort(
      (firstPlayer, secondPlayer) =>
        secondPlayer.totalPoints - firstPlayer.totalPoints ||
        secondPlayer.kills - firstPlayer.kills ||
        secondPlayer.damage - firstPlayer.damage ||
        secondPlayer.assists - firstPlayer.assists ||
        firstPlayer.playerName.localeCompare(secondPlayer.playerName)
    )[0] ?? null;

  if (!mvp) return null;
  return mvp.pubgPlayerId ?? mvp.playerId ?? mvp.playerName;
}

type ImportTargetOptions = {
  tournamentId?: string;
  scrimId?: string;
  seasonId?: string;
  seasonDayNumber?: number;
  autoCreateDay?: boolean;
  dayTitle?: string;
  dayDate?: string;
  dayMap?: string;
  dayLobbyTime?: string;
  dayMapRotation?: string[];
  matchEdits?: PubgImportEdit[];
};

type ResolvedImportContext = {
  scrim: Scrim | null;
  tournamentId?: string;
  tournament: Tournament | null;
  seasonId?: string;
  seasonTitle?: string;
  seasonDayNumber?: number;
  createdDay?: boolean;
};

function toImportContext(context: ResolvedImportContext): PubgImportContext {
  return {
    seasonId: context.seasonId,
    seasonTitle: context.seasonTitle,
    seasonDayNumber: context.seasonDayNumber,
    tournamentId: context.tournamentId,
    tournamentTitle: context.tournament?.title,
    scrimId: context.scrim?.id,
    scrimTitle: context.scrim?.title,
    createdDay: context.createdDay,
  };
}

function classifyImportIssue(
  matchId: string,
  error: unknown,
  options?: { alreadyImported?: boolean }
): PubgImportIssue {
  const message = error instanceof Error ? error.message : String(error);
  const normalizedMessage = message.toLowerCase();

  let code: PubgImportIssue["code"] = "unknown_error";
  if (normalizedMessage.includes("permission denied") || normalizedMessage.includes("unauthorized")) {
    code = "permission_denied";
  } else if (
    normalizedMessage.includes("pubg api error 404") ||
    normalizedMessage.includes("invalid match id") ||
    normalizedMessage.includes("no match found")
  ) {
    code = "invalid_match_id";
  } else if (normalizedMessage.includes("quota") || normalizedMessage.includes("resource-exhausted")) {
    code = "quota_exceeded";
  } else if (normalizedMessage.includes("duplicate match")) {
    code = "duplicate_match";
  } else if (normalizedMessage.includes("scrim day missing")) {
    code = "scrim_day_missing";
  } else if (normalizedMessage.includes("database write failed") || normalizedMessage.includes("document store")) {
    code = "database_write_failed";
  } else if (normalizedMessage.includes("pubg api error") || normalizedMessage.includes("pubg api failed")) {
    code = "pubg_api_failed";
  }

  return {
    matchId,
    error: message,
    code,
    alreadyImported: options?.alreadyImported,
  };
}

function cleanImportString(value?: string | null) {
  const normalizedValue = value?.trim();
  return normalizedValue ? normalizedValue : undefined;
}

function cleanImportStringArray(values?: string[] | null) {
  if (!values?.length) return undefined;

  const normalizedValues = Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
  return normalizedValues.length > 0 ? normalizedValues : undefined;
}

function getSeasonDayOverrides(options?: ImportTargetOptions) {
  const dayTitle = cleanImportString(options?.dayTitle);
  const dayDate = cleanImportString(options?.dayDate);
  const dayMap = cleanImportString(options?.dayMap);
  const dayLobbyTime = cleanImportString(options?.dayLobbyTime);
  const dayMapRotation = cleanImportStringArray(options?.dayMapRotation);

  if (!dayTitle && !dayDate && !dayMap && !dayLobbyTime && !dayMapRotation?.length) {
    return undefined;
  }

  return {
    dayTitle,
    dayDate,
    dayMap,
    dayLobbyTime,
    dayMapRotation,
  };
}

function normalizeImportEdits(edits?: PubgImportEdit[]) {
  if (!edits?.length) {
    return new Map<string, PubgImportEdit>();
  }

  const normalizedEdits = new Map<string, PubgImportEdit>();
  for (const edit of edits) {
    const sourceMatchId = edit.sourceMatchId?.trim();
    if (!sourceMatchId) {
      continue;
    }

    normalizedEdits.set(sourceMatchId, {
      sourceMatchId,
      matchId: edit.matchId?.trim() || undefined,
      matchNumber: Number.isFinite(edit.matchNumber) ? Number(edit.matchNumber) : undefined,
      map: edit.map?.trim() || undefined,
      playedAt: edit.playedAt?.trim() || undefined,
      teamResults: edit.teamResults?.map((result) => ({ ...result })) ?? undefined,
      playerResults: edit.playerResults?.map((result) => ({ ...result })) ?? undefined,
    });
  }

  return normalizedEdits;
}

function normalizeEditedTeamResults(results: TeamMatchResult[]) {
  return normalizeTeamResults(
    results.map((result) => {
      const kills = Number.isFinite(result.kills) ? Number(result.kills) : 0;
      const placement = Number.isFinite(result.placement) ? Number(result.placement) : 0;
      const placementPointsValue = Number.isFinite(result.placementPoints)
        ? Number(result.placementPoints)
        : placementPoints(placement);
      const killPointsValue = kills;

      return {
        ...result,
        placement,
        kills,
        damage: Number.isFinite(result.damage) ? Number(result.damage) : 0,
        placementPoints: placementPointsValue,
        killPoints: killPointsValue,
        totalPoints: placementPointsValue + killPointsValue,
      };
    })
  );
}

function normalizeEditedPlayerResults(
  results: MatchPlayerResult[],
  teamResults: TeamMatchResult[]
) {
  const teamByKey = new Map<string, TeamMatchResult>();
  for (const teamResult of teamResults) {
    teamByKey.set(teamResult.teamName.trim().toLowerCase(), teamResult);
    if (teamResult.teamId) {
      teamByKey.set(teamResult.teamId.trim().toLowerCase(), teamResult);
    }
  }

  return results
    .map((result) => {
      const teamKey = result.teamName.trim().toLowerCase();
      const teamResult = teamByKey.get(teamKey);
      const placement = Number.isFinite(result.placement)
        ? Number(result.placement)
        : (teamResult?.placement ?? 0);
      const placementPointsValue = Number.isFinite(result.placementPoints)
        ? Number(result.placementPoints)
        : (teamResult?.placementPoints ?? placementPoints(placement));
      const kills = Number.isFinite(result.kills) ? Number(result.kills) : 0;
      const resolvedTeam = resolveBravoTeamIdentity(teamResult?.teamName ?? result.teamName);
      const inferredSlotNumber =
        resolvedTeam?.slotNumber ??
        teamResult?.slotNumber ??
        result.slotNumber ??
        parseBravoSlotNumber(teamResult?.teamName ?? result.teamName);
      const normalizedTeamName =
        resolvedTeam?.name ??
        teamResult?.teamName ??
        buildFallbackTeamNameFromSlot(inferredSlotNumber) ??
        result.teamName;

      return {
        ...result,
        teamId: resolvedTeam?.id ?? teamResult?.teamId ?? slugify(normalizedTeamName),
        teamName: normalizedTeamName,
        slotNumber: inferredSlotNumber,
        placement,
        kills,
        assists: Number.isFinite(result.assists) ? Number(result.assists) : 0,
        knocks: Number.isFinite(result.knocks) ? Number(result.knocks) : 0,
        damage: Number.isFinite(result.damage) ? Number(result.damage) : 0,
        survivalTime: Number.isFinite(result.survivalTime) ? Number(result.survivalTime) : 0,
        placementPoints: placementPointsValue,
        totalPoints: placementPointsValue + kills,
      } satisfies MatchPlayerResult;
    })
    .sort((firstPlayer, secondPlayer) => {
      if ((firstPlayer.slotNumber ?? Number.POSITIVE_INFINITY) !== (secondPlayer.slotNumber ?? Number.POSITIVE_INFINITY)) {
        return (firstPlayer.slotNumber ?? Number.POSITIVE_INFINITY) - (secondPlayer.slotNumber ?? Number.POSITIVE_INFINITY);
      }

      return firstPlayer.playerName.localeCompare(secondPlayer.playerName);
    });
}

function applyImportEdit(
  matchRecord: TournamentMatch,
  edit?: PubgImportEdit
) {
  if (!edit) {
    return matchRecord;
  }

  if (edit.matchId && edit.matchId !== matchRecord.pubgMatchId) {
    throw new Error(
      `Match ID mismatch for ${matchRecord.pubgMatchId}. Refresh preview after changing the match ID before importing.`
    );
  }

  const teamResults = edit.teamResults?.length
    ? normalizeEditedTeamResults(edit.teamResults)
    : (matchRecord.teamResults ?? []);
  const playerResults = edit.playerResults?.length
    ? normalizeEditedPlayerResults(edit.playerResults, teamResults)
    : (matchRecord.playerResults ?? []);
  const winner =
    teamResults.find((teamResult) => teamResult.placement === 1)?.teamName ??
    teamResults[0]?.teamName ??
    matchRecord.winner;

  return {
    ...matchRecord,
    map: edit.map ?? matchRecord.map,
    playedAt: edit.playedAt ?? matchRecord.playedAt,
    sequenceNumber: edit.matchNumber ?? matchRecord.sequenceNumber,
    winner,
    points: teamResults[0]?.totalPoints ?? matchRecord.points,
    knockouts: teamResults.reduce((totalKills, teamResult) => totalKills + teamResult.kills, 0),
    placementPoints: teamResults[0]?.placementPoints ?? matchRecord.placementPoints,
    killPoints: teamResults[0]?.killPoints ?? matchRecord.killPoints,
    teamResults,
    playerResults,
  } satisfies TournamentMatch;
}

async function loadSeasonPlayers() {
  if (!isDocumentStoreConfigured()) {
    return [];
  }

  return fetchDocumentCollection<Player>(COLLECTIONS.players, 2000).catch(() => []);
}

async function resolveImportContext(
  options?: ImportTargetOptions & { requireDay?: boolean }
): Promise<ResolvedImportContext> {
  const initialScrim = options?.scrimId
    ? await getDocument<Scrim>(COLLECTIONS.scrims, options.scrimId)
    : null;
  let scrim = initialScrim;
  let tournamentId = options?.tournamentId ?? initialScrim?.tournamentId;
  let tournament = tournamentId ? await getTournament(tournamentId) : null;
  let createdDay = false;

  const currentSeason = !options?.seasonId && !tournament?.seasonId && !scrim?.seasonId ? await getCurrentSeason() : null;
  const requestedSeasonId = options?.seasonId ?? tournament?.seasonId ?? scrim?.seasonId ?? currentSeason?.id;
  const requestedDayNumber =
    options?.seasonDayNumber ??
    tournament?.seasonDayNumber ??
    tournament?.dayNumber ??
    scrim?.seasonDayNumber ??
    currentSeason?.currentDay;
  const dayOverrides = getSeasonDayOverrides(options);

  if (requestedSeasonId && requestedDayNumber && (!tournament || !scrim || dayOverrides)) {
    if (options?.autoCreateDay !== false || dayOverrides) {
      const ensuredDay = await ensureSeasonDay(requestedSeasonId, requestedDayNumber, {
        createIfMissing: options?.autoCreateDay !== false,
        overrides: dayOverrides,
      });
      tournament = ensuredDay.tournament;
      scrim = ensuredDay.scrim;
      tournamentId = ensuredDay.tournament.id;
      createdDay = ensuredDay.created;
    } else {
      const dayContext = await getSeasonDayContext(requestedSeasonId, requestedDayNumber);
      tournament = tournament ?? dayContext.tournament;
      scrim = scrim ?? dayContext.scrim;
      tournamentId = tournament?.id ?? tournamentId;
    }
  }

  if (tournament && !scrim && tournament.seasonId && (tournament.seasonDayNumber ?? tournament.dayNumber)) {
    const dayContext = await getSeasonDayContext(
      tournament.seasonId,
      tournament.seasonDayNumber ?? tournament.dayNumber ?? 0
    );
    scrim = dayContext.scrim;
  }

  if (options?.requireDay && (!tournament || !scrim)) {
    throw new Error("Scrim day missing. Select or create a scrim day first.");
  }

  return {
    scrim,
    tournamentId: tournament?.id ?? tournamentId,
    tournament,
    seasonId: requestedSeasonId ?? tournament?.seasonId ?? scrim?.seasonId,
    seasonTitle: tournament?.seasonTitle ?? scrim?.seasonTitle ?? currentSeason?.seriesTitle ?? currentSeason?.title,
    seasonDayNumber: requestedDayNumber,
    createdDay,
  };
}

async function detectImportConflicts(
  playerResults: MatchPlayerResult[],
  existingPlayers?: Player[]
): Promise<PubgImportConflict[]> {
  if (!isDocumentStoreConfigured() || playerResults.length === 0) {
    return [];
  }

  const players = existingPlayers ?? (await fetchDocumentCollection<Player>(COLLECTIONS.players, 2000).catch(() => []));
  const scopedPlayers = players
    .filter((player) => player.scope === "season" || !player.scope)
    .sort((firstPlayer, secondPlayer) => {
      if ((firstPlayer.scope === "season") !== (secondPlayer.scope === "season")) {
        return firstPlayer.scope === "season" ? -1 : 1;
      }
      return (secondPlayer.updatedAt ?? "").localeCompare(firstPlayer.updatedAt ?? "");
    });

  const playerLookup = new Map<string, Player>();
  for (const player of scopedPlayers) {
    const keys = [player.pubgId, player.pubgName, player.inGameName, player.name]
      .filter((value): value is string => Boolean(value))
      .map((value) => value.trim().toLowerCase());

    for (const key of keys) {
      if (!playerLookup.has(key)) {
        playerLookup.set(key, player);
      }
    }
  }

  const conflicts = new Map<string, PubgImportConflict>();
  for (const playerResult of playerResults) {
    const matchKeys = [playerResult.pubgPlayerId, playerResult.playerName]
      .filter((value): value is string => Boolean(value))
      .map((value) => value.trim().toLowerCase());
    const existingPlayer = matchKeys.map((key) => playerLookup.get(key)).find(Boolean);
    if (!existingPlayer) continue;

    const currentTeamKey = existingPlayer.teamId ?? existingPlayer.teamName?.trim().toLowerCase();
    const importedTeamKey = playerResult.teamId ?? playerResult.teamName.trim().toLowerCase();
    if (!currentTeamKey || !importedTeamKey || currentTeamKey === importedTeamKey) {
      continue;
    }

    conflicts.set(playerResult.pubgPlayerId ?? playerResult.playerId ?? playerResult.playerName, {
      type: "player_team_mismatch",
      playerName: playerResult.playerName,
      pubgPlayerId: playerResult.pubgPlayerId,
      currentTeamId: existingPlayer.teamId,
      currentTeamName: existingPlayer.teamName,
      importedTeamId: playerResult.teamId,
      importedTeamName: playerResult.teamName,
    });
  }

  return Array.from(conflicts.values()).sort((firstConflict, secondConflict) =>
    firstConflict.playerName.localeCompare(secondConflict.playerName)
  );
}

async function buildPubgMatchPreview(
  matchId: string,
  options?: ImportTargetOptions,
  existingPlayers?: Player[],
  resolvedContext?: ResolvedImportContext
): Promise<{
  preview: PubgImportPreview;
  context: ResolvedImportContext;
  matchRecord: TournamentMatch;
}> {
  const context = resolvedContext ?? (await resolveImportContext(options));
  const matchData = await pubgFetch(`/shards/${PUBG_SHARD}/matches/${matchId}`);
  const summary = summarizeMatch(matchData);
  const parsedPlayers = parseMatchParticipants(matchData);
  const playerResults = buildPlayerResults(parsedPlayers);
  const teamResults = normalizeTeamResults(aggregateTeamResults(parsedPlayers));
  const winner = teamResults.find((teamResult) => teamResult.placement === 1)?.teamName ?? teamResults[0]?.teamName ?? "Unknown";
  const now = new Date().toISOString();

  const matchRecord: TournamentMatch = {
    id: matchId,
    pubgMatchId: matchId,
    tournamentId: context.tournamentId,
    scrimId: context.scrim?.id ?? options?.scrimId,
    map: summary.mapName ?? "Unknown",
    winner,
    points: teamResults[0]?.totalPoints ?? 0,
    knockouts: teamResults.reduce((totalKills, teamResult) => totalKills + teamResult.kills, 0),
    placementPoints: teamResults[0]?.placementPoints ?? 0,
    killPoints: teamResults[0]?.killPoints ?? 0,
    playedAt: summary.createdAt ?? now,
    dataSource: "pubg_api",
    syncedAt: now,
    teamResults,
    playerResults,
  };

  const conflicts = await detectImportConflicts(playerResults, existingPlayers);
  const alreadyImported = Boolean(await getDocument(COLLECTIONS.matches, matchId));

  return {
    context,
    matchRecord,
    preview: {
      matchId,
      alreadyImported,
      summary,
      tournamentId: context.tournamentId,
      tournamentTitle: context.tournament?.title,
      scrimId: context.scrim?.id,
      scrimTitle: context.scrim?.title,
      seasonId: context.seasonId ?? context.tournament?.seasonId,
      seasonDayNumber:
        context.seasonDayNumber ??
        context.tournament?.seasonDayNumber ??
        context.tournament?.dayNumber ??
        context.scrim?.seasonDayNumber,
      detectedTeams: teamResults.length,
      detectedPlayers: playerResults.length,
      teamResults,
      playerResults,
      conflicts,
    },
  };
}

function buildMatchPlayerRecords(match: TournamentMatch, tournament?: Tournament | null): MatchPlayerRecord[] {
  return (match.playerResults ?? []).map((playerResult) => {
    const sourcePlayerId = playerResult.pubgPlayerId ?? playerResult.playerId ?? playerResult.playerName;

    return {
      id: buildMatchPlayerRecordId(match.pubgMatchId, sourcePlayerId, playerResult.playerName),
      matchId: match.id,
      pubgMatchId: match.pubgMatchId,
      tournamentId: match.tournamentId,
      scrimId: match.scrimId,
      seasonId: tournament?.seasonId,
      seasonTitle: tournament?.seasonTitle,
      seasonDayNumber: tournament?.seasonDayNumber ?? tournament?.dayNumber,
      map: match.map,
      playedAt: match.playedAt,
      dataSource: match.dataSource,
      sourcePlayerId,
      playerId: sourcePlayerId,
      playerName: playerResult.playerName,
      pubgPlayerId: playerResult.pubgPlayerId,
      teamId: playerResult.teamId,
      teamName: playerResult.teamName,
      slotNumber: playerResult.slotNumber,
      placement: playerResult.placement,
      kills: playerResult.kills,
      assists: playerResult.assists,
      knocks: playerResult.knocks,
      damage: playerResult.damage,
      survivalTime: playerResult.survivalTime,
      placementPoints: playerResult.placementPoints,
      totalPoints: playerResult.totalPoints,
    } satisfies MatchPlayerRecord;
  });
}

async function syncTournamentDerivedData(tournamentId: string, tournament?: Tournament | null) {
  const currentTournament = tournament ?? (await getTournament(tournamentId));
  if (!currentTournament) return;

  const [matches, existingStandings, existingTeams, existingPlayers, existingMatchPlayers] = await Promise.all([
    getTournamentMatches(tournamentId),
    queryDocumentCollection<TournamentStanding>(COLLECTIONS.standings, "tournamentId", tournamentId, 200),
    queryDocumentCollection<Team>(COLLECTIONS.teams, "sourceTournamentId", tournamentId, 200),
    queryDocumentCollection<Player>(COLLECTIONS.players, "sourceTournamentId", tournamentId, 1000),
    queryDocumentCollection<MatchPlayerRecord>(COLLECTIONS.matchPlayers, "tournamentId", tournamentId, 5000),
  ]);

  const standings = buildTournamentStandings(tournamentId, currentTournament.title, matches).map((standing) => ({
    ...standing,
    seasonId: currentTournament.seasonId,
    seasonTitle: currentTournament.seasonTitle,
    seasonDayNumber: currentTournament.seasonDayNumber ?? currentTournament.dayNumber,
    scope: "tournament" as const,
    sourceTournamentId: tournamentId,
    sourceTournamentTitle: currentTournament.title,
    sourceProvider: "pubg_api",
  }));

  const matchPlayerDocuments = matches.flatMap((match) => buildMatchPlayerRecords(match, currentTournament));
  const appearanceMap = buildPlayerAppearanceMapFromMatches(matches);
  const playerAggregateMap = new Map<
    string,
    Omit<Player, "id"> & {
      id: string;
      sourcePlayerKey: string;
      bestPlacementAccumulator: number;
    }
  >();
  const mvpCounts = new Map<string, number>();

  for (const match of matches) {
    const mvpPlayerKey = getMatchMvpPlayerKey(match);
    if (mvpPlayerKey) {
      mvpCounts.set(mvpPlayerKey, (mvpCounts.get(mvpPlayerKey) ?? 0) + 1);
    }

    for (const playerResult of match.playerResults ?? []) {
      const sourcePlayerKey = playerResult.pubgPlayerId ?? playerResult.playerId ?? playerResult.playerName;
      const playerId = buildTournamentScopedPlayerId(tournamentId, sourcePlayerKey, playerResult.playerName);
      const existingPlayer = playerAggregateMap.get(playerId) ?? {
        name: playerResult.playerName,
        inGameName: playerResult.playerName,
        teamId: playerResult.teamId,
        teamName: playerResult.teamName,
        pubgId: sourcePlayerKey,
        pubgName: playerResult.playerName,
        assists: 0,
        knocks: 0,
        placementPoints: 0,
        totalPoints: 0,
        averageDamage: 0,
        bestPlacement: playerResult.placement,
        kills: 0,
        damage: 0,
        mvpCount: 0,
        chickenDinners: 0,
        matches: 0,
        rating: 0,
        playerStatus: "active",
        scope: "tournament",
        seasonId: currentTournament.seasonId,
        seasonTitle: currentTournament.seasonTitle,
        seasonDayNumbers:
          typeof (currentTournament.seasonDayNumber ?? currentTournament.dayNumber) === "number"
            ? [currentTournament.seasonDayNumber ?? currentTournament.dayNumber ?? 0]
            : [],
        sourceTournamentId: tournamentId,
        sourceTournamentTitle: currentTournament.title,
        sourceProvider: "pubg_api",
        id: playerId,
        sourcePlayerKey,
        bestPlacementAccumulator: playerResult.placement,
      } satisfies Omit<Player, "id"> & { id: string; sourcePlayerKey: string; bestPlacementAccumulator: number };

      existingPlayer.assists = (existingPlayer.assists ?? 0) + playerResult.assists;
      existingPlayer.knocks = (existingPlayer.knocks ?? 0) + playerResult.knocks;
      existingPlayer.placementPoints = (existingPlayer.placementPoints ?? 0) + playerResult.placementPoints;
      existingPlayer.totalPoints = (existingPlayer.totalPoints ?? 0) + playerResult.totalPoints;
      existingPlayer.kills += playerResult.kills;
      existingPlayer.damage += playerResult.damage;
      existingPlayer.chickenDinners += playerResult.placement === 1 ? 1 : 0;
      existingPlayer.matches += 1;
      existingPlayer.bestPlacementAccumulator = Math.min(
        existingPlayer.bestPlacementAccumulator,
        playerResult.placement
      );
      existingPlayer.bestPlacement = Math.min(existingPlayer.bestPlacement ?? playerResult.placement, playerResult.placement);

      playerAggregateMap.set(playerId, existingPlayer);
    }
  }

  const playerDocuments = Array.from(playerAggregateMap.values())
    .map(({ bestPlacementAccumulator, sourcePlayerKey, ...playerAggregate }) => {
      const preferredTeam = choosePreferredPlayerTeam(
        Array.from(appearanceMap.get(sourcePlayerKey)?.values() ?? [])
      );
      const resolvedTeamName = preferredTeam?.teamName ?? playerAggregate.teamName;

      return {
        ...playerAggregate,
        teamId: resolvedTeamName ? buildTournamentScopedTeamId(tournamentId, resolvedTeamName) : undefined,
        teamName: resolvedTeamName,
        averageDamage:
          playerAggregate.matches > 0
            ? Number((playerAggregate.damage / playerAggregate.matches).toFixed(2))
            : 0,
        mvpCount: mvpCounts.get(sourcePlayerKey) ?? 0,
        rating: playerAggregate.totalPoints,
        winRate:
          playerAggregate.matches > 0
            ? Number(((playerAggregate.chickenDinners ?? 0) / playerAggregate.matches).toFixed(4))
            : 0,
        bestPlacement: Number.isFinite(bestPlacementAccumulator)
          ? bestPlacementAccumulator
          : undefined,
        isMvpOfWeek: false,
      };
    })
    .sort(
      (firstPlayer, secondPlayer) =>
        comparePlayerLeaderboardPerformance(firstPlayer, secondPlayer)
    );

  const mvpOfWeek = [...playerDocuments].sort((firstPlayer, secondPlayer) =>
    compareMvpRankingPlayers(firstPlayer, secondPlayer)
  )[0];
  if (mvpOfWeek) {
    mvpOfWeek.isMvpOfWeek = true;
  }

  const playerIdsByTeamId = new Map<string, string[]>();
  for (const playerDocument of playerDocuments) {
    if (!playerDocument.teamId) continue;
    const currentPlayerIds = playerIdsByTeamId.get(playerDocument.teamId) ?? [];
    currentPlayerIds.push(playerDocument.id);
    playerIdsByTeamId.set(playerDocument.teamId, currentPlayerIds);
  }

  const standingsByTeamId = new Map(standings.map((standing) => [standing.teamId, standing]));
  const teamSeedMap = new Map<string, { id: string; name: string; slotNumber?: number }>();

  if (currentTournament.seasonId === BRAVO_DAILY_SCRIMS_SEASON.id) {
    for (const team of getBravoCanonicalTeams()) {
      teamSeedMap.set(team.id, {
        id: team.id,
        name: team.name,
        slotNumber: team.slotNumber,
      });
    }
  }

  for (const standing of standings) {
    teamSeedMap.set(standing.teamId, {
      id: standing.teamId,
      name: standing.teamName,
      slotNumber: standing.slotNumber,
    });
  }

  for (const match of matches) {
    for (const teamResult of match.teamResults ?? []) {
      const teamId = teamResult.teamId ?? slugify(teamResult.teamName);
      if (teamSeedMap.has(teamId)) {
        continue;
      }

      teamSeedMap.set(teamId, {
        id: teamId,
        name: teamResult.teamName,
        slotNumber: teamResult.slotNumber,
      });
    }
  }

  const teamDocuments = Array.from(teamSeedMap.values()).map((team) => {
    const scopedTeamId = buildTournamentScopedTeamId(tournamentId, team.name);
    const standing = standingsByTeamId.get(team.id);
    const existingTeam = existingTeams.find(
      (currentTeam) =>
        currentTeam.id === scopedTeamId ||
        currentTeam.name === team.name ||
        currentTeam.sourceTeamName === team.name
    );

    return {
      id: scopedTeamId,
      name: team.name,
      tag: resolveBravoTeamIdentity(team.name)?.tag ?? existingTeam?.tag ?? `Day ${currentTournament.seasonDayNumber ?? currentTournament.dayNumber ?? ""}`.trim(),
      slotNumber: team.slotNumber ?? existingTeam?.slotNumber,
      rank: standing?.rank,
      totalPoints: standing?.totalPoints ?? 0,
      kills: standing?.kills ?? 0,
      matches: standing?.matches ?? 0,
      killPoints: standing?.killPoints ?? 0,
      placementPoints: standing?.placementPoints ?? 0,
      averagePlacement: standing?.averagePlacement,
      chickenDinners: standing?.wins ?? 0,
      status: "active" as const,
      registrationStatus: "approved" as const,
      playerIds: playerIdsByTeamId.get(scopedTeamId) ?? [],
      scope: "tournament" as const,
      seasonId: currentTournament.seasonId,
      seasonTitle: currentTournament.seasonTitle,
      seasonDayNumbers:
        typeof (currentTournament.seasonDayNumber ?? currentTournament.dayNumber) === "number"
          ? [currentTournament.seasonDayNumber ?? currentTournament.dayNumber ?? 0]
          : [],
      sourceTournamentId: tournamentId,
      sourceTournamentTitle: currentTournament.title,
      sourceTeamName: team.name,
      sourceProvider: "pubg_api",
    } satisfies Partial<Team> & { id: string; name: string };
  });

  const standingIds = new Set(standings.map((standing) => standing.id));
  const teamIds = new Set(teamDocuments.map((team) => team.id));
  const playerIds = new Set(playerDocuments.map((player) => player.id));
  const matchPlayerIds = new Set(matchPlayerDocuments.map((matchPlayer) => matchPlayer.id));

  const operations: DocumentWriteOperation[] = [
    ...existingStandings
      .filter((standing) => !standingIds.has(standing.id))
      .map((standing) => ({ type: "delete" as const, collectionName: COLLECTIONS.standings, docId: standing.id })),
    ...existingTeams
      .filter((team) => !teamIds.has(team.id))
      .map((team) => ({ type: "delete" as const, collectionName: COLLECTIONS.teams, docId: team.id })),
    ...existingPlayers
      .filter((player) => !playerIds.has(player.id))
      .map((player) => ({ type: "delete" as const, collectionName: COLLECTIONS.players, docId: player.id })),
    ...existingMatchPlayers
      .filter((matchPlayer) => !matchPlayerIds.has(matchPlayer.id))
      .map((matchPlayer) => ({
        type: "delete" as const,
        collectionName: COLLECTIONS.matchPlayers,
        docId: matchPlayer.id,
      })),
    ...standings.map((standing) => ({
      type: "set" as const,
      collectionName: COLLECTIONS.standings,
      docId: standing.id,
      data: standing as unknown as Record<string, unknown>,
      merge: true,
    })),
    ...teamDocuments.map((team) => ({
      type: "set" as const,
      collectionName: COLLECTIONS.teams,
      docId: team.id,
      data: team as unknown as Record<string, unknown>,
      merge: true,
    })),
    ...playerDocuments.map((player) => ({
      type: "set" as const,
      collectionName: COLLECTIONS.players,
      docId: player.id,
      data: player as unknown as Record<string, unknown>,
      merge: true,
    })),
    ...matchPlayerDocuments.map((matchPlayer) => ({
      type: "set" as const,
      collectionName: COLLECTIONS.matchPlayers,
      docId: matchPlayer.id,
      data: matchPlayer as unknown as Record<string, unknown>,
      merge: true,
    })),
    {
      type: "set" as const,
      collectionName: COLLECTIONS.tournaments,
      docId: tournamentId,
      data: {
        matchCount: matches.length,
        teamCount:
          currentTournament.registeredTeamIds && currentTournament.registeredTeamIds.length > 0
            ? currentTournament.registeredTeamIds.length
            : teamDocuments.length,
        registeredTeamIds:
          currentTournament.registeredTeamIds && currentTournament.registeredTeamIds.length > 0
            ? currentTournament.registeredTeamIds
            : teamDocuments.map((team) => resolveBravoTeamIdentity(team.name)?.id ?? team.id),
        status:
          matches.length > 0 && currentTournament.status !== "COMPLETED"
            ? "LIVE"
            : currentTournament.status,
      },
      merge: true,
    },
  ];

  await commitDocumentWriteOperations(operations);
}

async function syncBravoSeasonIfNeeded(tournament?: Tournament | null) {
  if (!tournament?.seasonId || tournament.seasonId !== BRAVO_DAILY_SCRIMS_SEASON.id) {
    return;
  }

  const season = await getDocument<Season>(COLLECTIONS.seasons, tournament.seasonId);
  await syncBravoDailyScrimSeason({
    configuredDays: season?.configuredDays,
    currentDay: season?.currentDay,
    importFeed: false,
  });
}

export async function syncTournamentAndSeasonDerivedData(
  tournamentId?: string | null,
  tournament?: Tournament | null
) {
  const resolvedTournamentId = tournamentId ?? tournament?.id;
  if (!resolvedTournamentId) {
    return;
  }

  const resolvedTournament = tournament ?? (await getTournament(resolvedTournamentId));
  if (!resolvedTournament) {
    return;
  }

  await syncTournamentDerivedData(resolvedTournamentId, resolvedTournament);
  await syncBravoSeasonIfNeeded(resolvedTournament);
}

function normalizeRequestedMatchIds(matchIds: string[]) {
  return Array.from(new Set(matchIds.map((matchId) => matchId.trim()).filter(Boolean)));
}

function deriveScrimImportStatus(scrim: Scrim, pubgMatchIds: string[]) {
  const expectedMatchCount = Math.max(scrim.mapRotation?.length ?? 0, pubgMatchIds.length, 1);
  if (pubgMatchIds.length === 0) {
    return "waiting_for_data" as const;
  }

  return pubgMatchIds.length >= expectedMatchCount ? "completed" : "live";
}

function normalizeStoredMatchForDisplay(match: TournamentMatch): TournamentMatch {
  return {
    ...match,
    winner: canonicalizeBravoTeamName(match.winner),
    teamResults: (match.teamResults ?? []).map((teamResult) => {
      const resolvedTeam = resolveBravoTeamIdentity(teamResult.teamName);
      const inferredSlotNumber =
        resolvedTeam?.slotNumber ?? teamResult.slotNumber ?? parseBravoSlotNumber(teamResult.teamName);
      const normalizedTeamName =
        resolvedTeam?.name ?? buildFallbackTeamNameFromSlot(inferredSlotNumber) ?? teamResult.teamName;

      return {
        ...teamResult,
        teamId: resolvedTeam?.id ?? teamResult.teamId ?? slugify(normalizedTeamName),
        teamName: normalizedTeamName,
        slotNumber: inferredSlotNumber,
      };
    }),
    playerResults: (match.playerResults ?? []).map((playerResult) => {
      const resolvedTeam = resolveBravoTeamIdentity(playerResult.teamName);
      const inferredSlotNumber =
        resolvedTeam?.slotNumber ?? playerResult.slotNumber ?? parseBravoSlotNumber(playerResult.teamName);
      const normalizedTeamName =
        resolvedTeam?.name ?? buildFallbackTeamNameFromSlot(inferredSlotNumber) ?? playerResult.teamName;

      return {
        ...playerResult,
        teamId: resolvedTeam?.id ?? playerResult.teamId ?? slugify(normalizedTeamName),
        teamName: normalizedTeamName,
        slotNumber: inferredSlotNumber,
      };
    }),
  };
}

async function getMatchSequenceNumbers(tournamentId: string, matchIds: string[]) {
  const existingMatches = await getTournamentMatches(tournamentId, { includeDrafts: true });
  const sequenceNumberByMatchId = new Map<string, number>();

  for (const existingMatch of existingMatches) {
    if (typeof existingMatch.sequenceNumber === "number" && Number.isFinite(existingMatch.sequenceNumber)) {
      sequenceNumberByMatchId.set(existingMatch.pubgMatchId, existingMatch.sequenceNumber);
    }
  }

  let nextSequenceNumber = Math.max(0, ...Array.from(sequenceNumberByMatchId.values()));
  for (const matchId of matchIds) {
    if (!sequenceNumberByMatchId.has(matchId)) {
      nextSequenceNumber += 1;
      sequenceNumberByMatchId.set(matchId, nextSequenceNumber);
    }
  }

  return sequenceNumberByMatchId;
}

export async function previewPubgMatches(
  matchIds: string[],
  options?: ImportTargetOptions
): Promise<PubgBulkPreviewResult> {
  const normalizedMatchIds = normalizeRequestedMatchIds(matchIds);
  if (normalizedMatchIds.length === 0) {
    throw new Error("At least one PUBG match ID is required.");
  }

  const [context, existingPlayers] = await Promise.all([
    resolveImportContext({ ...options, requireDay: true, autoCreateDay: options?.autoCreateDay ?? true }),
    loadSeasonPlayers(),
  ]);

  const previews: PubgImportPreview[] = [];
  const errors: PubgImportIssue[] = [];

  for (const matchId of normalizedMatchIds) {
    try {
      const { preview } = await buildPubgMatchPreview(
        matchId,
        {
          tournamentId: context.tournamentId,
          scrimId: context.scrim?.id,
          seasonId: context.seasonId,
          seasonDayNumber: context.seasonDayNumber,
        },
        existingPlayers,
        context
      );
      previews.push(preview);
    } catch (error: unknown) {
      errors.push(classifyImportIssue(matchId, error));
    }
  }

  if (context.tournamentId && previews.length > 0) {
    const matchNumbers = await getMatchSequenceNumbers(
      context.tournamentId,
      previews.map((preview) => preview.matchId)
    );

    for (const preview of previews) {
      preview.matchNumber = matchNumbers.get(preview.matchId);
    }
  }

  return {
    context: toImportContext(context),
    previews,
    errors,
  };
}

export async function previewPubgMatch(
  matchId: string,
  options?: ImportTargetOptions
): Promise<PubgImportPreview> {
  const result = await previewPubgMatches([matchId], options);
  if (result.previews.length === 0) {
    throw new Error(result.errors[0]?.error ?? "Preview failed.");
  }
  return result.previews[0];
}

export async function importPubgMatches(
  matchIds: string[],
  options?: ImportTargetOptions & { screenshotUrl?: string; duplicateMode?: PubgDuplicateMode }
): Promise<PubgBulkImportResult> {
  if (!isDocumentStoreConfigured()) {
    throw new Error("Supabase is not configured. Add the Supabase environment variables before importing PUBG data.");
  }

  const normalizedMatchIds = normalizeRequestedMatchIds(matchIds);
  if (normalizedMatchIds.length === 0) {
    throw new Error("At least one PUBG match ID is required.");
  }

  const duplicateMode = options?.duplicateMode ?? "overwrite";
  const matchEdits = normalizeImportEdits(options?.matchEdits);
  const [context, existingPlayers] = await Promise.all([
    resolveImportContext({ ...options, requireDay: true, autoCreateDay: options?.autoCreateDay ?? true }),
    loadSeasonPlayers(),
  ]);

  if (!context.tournamentId || !context.tournament || !context.scrim) {
    throw new Error("Scrim day missing. Select or create a scrim day first.");
  }

  const previewResults: Array<{
    preview: PubgImportPreview;
    matchRecord: TournamentMatch;
  }> = [];
  const results: PubgBulkImportResultItem[] = [];

  for (const matchId of normalizedMatchIds) {
    try {
      const { preview, matchRecord } = await buildPubgMatchPreview(
        matchId,
        {
          tournamentId: context.tournamentId,
          scrimId: context.scrim.id,
          seasonId: context.seasonId,
          seasonDayNumber: context.seasonDayNumber,
        },
        existingPlayers,
        context
      );

      if (preview.alreadyImported && duplicateMode === "skip") {
        results.push({
          matchId,
          success: true,
          skipped: true,
          alreadyImported: true,
        });
        continue;
      }

      if (preview.alreadyImported && duplicateMode === "error") {
        results.push({
          matchId,
          success: false,
          alreadyImported: true,
          error: "Duplicate match. This PUBG match is already imported.",
          code: "duplicate_match",
        });
        continue;
      }

      previewResults.push({ preview, matchRecord });
    } catch (error: unknown) {
      const issue = classifyImportIssue(matchId, error);
      results.push({
        matchId,
        success: false,
        error: issue.error,
        code: issue.code,
      });
    }
  }

  if (previewResults.length > 0) {
    const now = new Date().toISOString();
    const sequenceNumberByMatchId = await getMatchSequenceNumbers(
      context.tournamentId,
      previewResults.map((item) => item.preview.matchId)
    );

    const importedMatchRecords = previewResults.map(({ preview, matchRecord }) => {
      const edit = matchEdits.get(preview.matchId);
      const editedMatchRecord = applyImportEdit(matchRecord, edit);

      return {
        preview,
        matchRecord: {
          ...editedMatchRecord,
          tournamentId: context.tournamentId,
          scrimId: context.scrim?.id,
          sequenceNumber:
            edit?.matchNumber ??
            editedMatchRecord.sequenceNumber ??
            sequenceNumberByMatchId.get(preview.matchId),
          resultScreenshotUrl: options?.screenshotUrl,
          syncedAt: now,
        } satisfies TournamentMatch,
      };
    });

    const mergedPubgMatchIds = Array.from(
      new Set([
        ...(context.scrim.pubgMatchIds ?? []),
        context.scrim.pubgMatchId,
        ...importedMatchRecords.map((item) => item.preview.matchId),
      ].filter((matchId): matchId is string => Boolean(matchId)))
    );

    const operations: DocumentWriteOperation[] = [];
    for (const { preview, matchRecord } of importedMatchRecords) {
      const matchPlayerDocuments = buildMatchPlayerRecords(matchRecord, context.tournament);
      const importRecord: PubgMatchImport = {
        id: preview.matchId,
        pubgMatchId: preview.matchId,
        mapName: matchRecord.map,
        gameMode: preview.summary.gameMode ?? "unknown",
        createdAt: matchRecord.playedAt ?? preview.summary.createdAt ?? now,
        duration: preview.summary.duration,
        tournamentId: context.tournamentId,
        scrimId: context.scrim.id,
        syncedAt: now,
        teamResults: matchRecord.teamResults ?? [],
        playerResults: matchRecord.playerResults ?? [],
        dataSource: "pubg_api",
      };

      operations.push(
        {
          type: "set",
          collectionName: COLLECTIONS.pubgMatches,
          docId: preview.matchId,
          data: { ...preview.summary, ...importRecord },
          merge: true,
        },
        {
          type: "set",
          collectionName: COLLECTIONS.matchResults,
          docId: preview.matchId,
          data: matchRecord as unknown as Record<string, unknown>,
          merge: true,
        },
        {
          type: "set",
          collectionName: COLLECTIONS.matches,
          docId: preview.matchId,
          data: matchRecord as unknown as Record<string, unknown>,
          merge: true,
        },
        {
          type: "set",
          collectionName: COLLECTIONS.tournamentMatches,
          docId: preview.matchId,
          data: matchRecord as unknown as Record<string, unknown>,
          merge: true,
        },
        ...matchPlayerDocuments.map((matchPlayer) => ({
          type: "set" as const,
          collectionName: COLLECTIONS.matchPlayers,
          docId: matchPlayer.id,
          data: matchPlayer as unknown as Record<string, unknown>,
          merge: true,
        }))
      );
    }

    operations.push({
      type: "set",
      collectionName: COLLECTIONS.scrims,
      docId: context.scrim.id,
      data: {
        pubgMatchId: mergedPubgMatchIds[0],
        pubgMatchIds: mergedPubgMatchIds,
        tournamentId: context.tournamentId,
        status: deriveScrimImportStatus(context.scrim, mergedPubgMatchIds),
        announcement:
          mergedPubgMatchIds.length > 0
            ? context.scrim.announcement === "Match data will appear once results are published."
              ? ""
              : context.scrim.announcement
            : context.scrim.announcement,
      },
      merge: true,
    });

    try {
      await commitDocumentWriteOperations(operations);
    } catch (error: unknown) {
      throw new Error(
        `Database write failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }

    await syncTournamentAndSeasonDerivedData(context.tournamentId, context.tournament);

    for (const { preview } of importedMatchRecords) {
      results.push({
        matchId: preview.matchId,
        success: true,
        alreadyImported: preview.alreadyImported,
      });
    }
  }

  return {
    context: toImportContext(context),
    results,
    importedCount: results.filter((result) => result.success && !result.skipped).length,
    skippedCount: results.filter((result) => result.skipped).length,
    failedCount: results.filter((result) => !result.success).length,
  };
}

export async function importPubgMatch(
  matchId: string,
  options?: ImportTargetOptions & { screenshotUrl?: string; duplicateMode?: PubgDuplicateMode }
) {
  const preview = await previewPubgMatch(matchId, options);
  const result = await importPubgMatches([matchId], options);
  const importedMatch = await getDocument<TournamentMatch>(COLLECTIONS.matches, matchId);

  return {
    summary: preview.summary,
    preview,
    teamResults: importedMatch?.teamResults ?? preview.teamResults,
    playerResults: importedMatch?.playerResults ?? preview.playerResults,
    matchRecord: importedMatch,
    players: importedMatch?.playerResults?.length ?? preview.playerResults.length,
    importResult: result,
  };
}

export async function getLiveMatchResults(limit = 20) {
  try {
    const docs = await fetchDocumentCollection<TournamentMatch>(COLLECTIONS.matchResults, limit);
    return docs
      .map(normalizeStoredMatchForDisplay)
      .filter((match) => match.status !== "draft")
      .sort((firstMatch, secondMatch) => (secondMatch.syncedAt ?? "").localeCompare(firstMatch.syncedAt ?? ""));
  } catch {
    return [];
  }
}

export async function getMatchResult(matchId: string) {
  const match = await getDocument<TournamentMatch>(COLLECTIONS.matchResults, matchId);
  if (!match) return null;

  const normalizedMatch = normalizeStoredMatchForDisplay(match);
  return normalizedMatch.status === "draft" ? null : normalizedMatch;
}

