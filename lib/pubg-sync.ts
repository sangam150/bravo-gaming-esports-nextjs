import { getTournament, getTournamentMatches } from "./data";
import { BRAVO_DAILY_SCRIMS_SEASON, syncBravoDailyScrimSeason } from "./bravo-season-sync";
import { getBravoCanonicalTeams, resolveBravoTeamIdentity } from "./bravo-teams";
import {
  COLLECTIONS,
  deleteFirestoreDocument,
  fetchFirestoreCollection,
  getFirestoreDocument,
  isFirebaseConfigured,
  queryFirestoreCollection,
  saveFirestoreDocument,
} from "./firebase";
import { aggregateTeamResults, parseMatchParticipants, type ParsedPlayerStat } from "./pubg-match-parser";
import { placementPoints, pubgFetch, PUBG_SHARD, summarizeMatch } from "./pubg";
import { buildTournamentStandings } from "./tournament-standings";
import type {
  MatchPlayerResult,
  Player,
  PubgMatchImport,
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

function normalizeTeamResults(results: TeamMatchResult[]): TeamMatchResult[] {
  return results
    .map((result) => {
      const resolvedTeam = resolveBravoTeamIdentity(result.teamName);

      return {
        ...result,
        teamId: resolvedTeam?.id ?? result.teamId,
        teamName: resolvedTeam?.name ?? result.teamName,
        slotNumber: resolvedTeam?.slotNumber ?? result.slotNumber,
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
      const normalizedPlacementPoints = placementPoints(player.placement);

      return {
        playerId: player.playerId,
        pubgPlayerId: player.playerId,
        playerName: player.playerName,
        teamId: resolvedTeam?.id,
        teamName: resolvedTeam?.name ?? player.teamName,
        slotNumber: resolvedTeam?.slotNumber,
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

async function deleteMissingDocuments<T extends { id: string }>(
  existingDocuments: T[],
  keepIds: Set<string>,
  collectionName: string
) {
  await Promise.all(
    existingDocuments
      .filter((document) => !keepIds.has(document.id))
      .map((document) => deleteFirestoreDocument(collectionName, document.id))
  );
}

async function resolveTournamentContext(options?: { tournamentId?: string; scrimId?: string }) {
  const scrim = options?.scrimId
    ? await getFirestoreDocument<Scrim>(COLLECTIONS.scrims, options.scrimId)
    : null;
  const tournamentId = options?.tournamentId ?? scrim?.tournamentId;
  const tournament = tournamentId ? await getTournament(tournamentId) : null;

  return { scrim, tournamentId, tournament };
}

async function syncTournamentDerivedData(tournamentId: string, tournament?: Tournament | null) {
  const currentTournament = tournament ?? (await getTournament(tournamentId));
  if (!currentTournament) return;

  const [matches, existingStandings, existingTeams, existingPlayers] = await Promise.all([
    getTournamentMatches(tournamentId),
    queryFirestoreCollection<TournamentStanding>(COLLECTIONS.standings, "tournamentId", tournamentId, 200),
    queryFirestoreCollection<Team>(COLLECTIONS.teams, "sourceTournamentId", tournamentId, 200),
    queryFirestoreCollection<Player>(COLLECTIONS.players, "sourceTournamentId", tournamentId, 1000),
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

  const playerAggregateMap = new Map<
    string,
    Omit<Player, "id"> & {
      id: string;
      bestPlacementAccumulator: number;
    }
  >();

  for (const match of matches) {
    for (const playerResult of match.playerResults ?? []) {
      const playerId = buildTournamentScopedPlayerId(
        tournamentId,
        playerResult.pubgPlayerId ?? playerResult.playerId,
        playerResult.playerName
      );
      const existingPlayer = playerAggregateMap.get(playerId) ?? {
        name: playerResult.playerName,
        inGameName: playerResult.playerName,
        teamId: playerResult.teamId,
        teamName: playerResult.teamName,
        pubgId: playerResult.pubgPlayerId ?? playerResult.playerId,
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
        bestPlacementAccumulator: playerResult.placement,
      } satisfies Omit<Player, "id"> & { id: string; bestPlacementAccumulator: number };

      existingPlayer.teamId = playerResult.teamId ?? existingPlayer.teamId;
      existingPlayer.teamName = playerResult.teamName ?? existingPlayer.teamName;
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
    .map(({ bestPlacementAccumulator, ...playerAggregate }) => ({
      ...playerAggregate,
      averageDamage:
        playerAggregate.matches > 0
          ? Number((playerAggregate.damage / playerAggregate.matches).toFixed(2))
          : 0,
      rating: playerAggregate.totalPoints,
      winRate:
        playerAggregate.matches > 0
          ? Number(((playerAggregate.chickenDinners ?? 0) / playerAggregate.matches).toFixed(4))
          : 0,
      bestPlacement: Number.isFinite(bestPlacementAccumulator)
        ? bestPlacementAccumulator
        : undefined,
      isMvpOfWeek: false,
    }))
    .sort(
      (firstPlayer, secondPlayer) =>
        (secondPlayer.totalPoints ?? 0) - (firstPlayer.totalPoints ?? 0) ||
        secondPlayer.kills - firstPlayer.kills ||
        firstPlayer.name.localeCompare(secondPlayer.name)
    );

  if (playerDocuments.length > 0) {
    playerDocuments[0].isMvpOfWeek = true;
  }

  const playerIdsByTeamId = new Map<string, string[]>();
  for (const playerDocument of playerDocuments) {
    if (!playerDocument.teamId) continue;
    const currentPlayerIds = playerIdsByTeamId.get(playerDocument.teamId) ?? [];
    currentPlayerIds.push(playerDocument.id);
    playerIdsByTeamId.set(playerDocument.teamId, currentPlayerIds);
  }

  const standingsByTeamId = new Map(standings.map((standing) => [standing.teamId, standing]));
  const canonicalTeams =
    currentTournament.seasonId === BRAVO_DAILY_SCRIMS_SEASON.id
      ? getBravoCanonicalTeams()
      : standings.map((standing) => ({
          id: standing.teamId,
          name: standing.teamName,
          slotNumber: standing.slotNumber,
        }));

  const teamDocuments = canonicalTeams.map((team) => {
    const standing = standingsByTeamId.get(team.id);
    const existingTeam = existingTeams.find((currentTeam) => currentTeam.name === team.name || currentTeam.sourceTeamName === team.name);

    return {
      id: buildTournamentScopedTeamId(tournamentId, team.name),
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
      playerIds: playerIdsByTeamId.get(team.id) ?? [],
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

  await Promise.all([
    deleteMissingDocuments(existingStandings, new Set(standings.map((standing) => standing.id)), COLLECTIONS.standings),
    deleteMissingDocuments(existingTeams, new Set(teamDocuments.map((team) => team.id)), COLLECTIONS.teams),
    deleteMissingDocuments(existingPlayers, new Set(playerDocuments.map((player) => player.id)), COLLECTIONS.players),
  ]);

  await Promise.all(
    standings.map((standing) =>
      saveFirestoreDocument(COLLECTIONS.standings, standing.id, standing as unknown as Record<string, unknown>)
    )
  );
  await Promise.all(teamDocuments.map((team) => saveFirestoreDocument(COLLECTIONS.teams, team.id, team as Record<string, unknown>)));
  await Promise.all(
    playerDocuments.map((player) =>
      saveFirestoreDocument(COLLECTIONS.players, player.id, player as unknown as Record<string, unknown>)
    )
  );

  await saveFirestoreDocument(COLLECTIONS.tournaments, tournamentId, {
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
  });
}

async function syncBravoSeasonIfNeeded(tournament?: Tournament | null) {
  if (!tournament?.seasonId || tournament.seasonId !== BRAVO_DAILY_SCRIMS_SEASON.id) {
    return;
  }

  const season = await getFirestoreDocument<Season>(COLLECTIONS.seasons, tournament.seasonId);
  await syncBravoDailyScrimSeason({
    configuredDays: season?.configuredDays,
    currentDay: season?.currentDay,
    importFeed: false,
  });
}

export async function importPubgMatch(
  matchId: string,
  options?: { tournamentId?: string; scrimId?: string; screenshotUrl?: string }
) {
  if (!isFirebaseConfigured()) {
    throw new Error("Firebase is not configured. Add FIREBASE_* credentials before importing PUBG data.");
  }

  const context = await resolveTournamentContext(options);
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
    scrimId: options?.scrimId,
    map: summary.mapName ?? "Unknown",
    winner,
    points: teamResults[0]?.totalPoints ?? 0,
    knockouts: teamResults.reduce((totalKills, teamResult) => totalKills + teamResult.kills, 0),
    placementPoints: teamResults[0]?.placementPoints ?? 0,
    killPoints: teamResults[0]?.killPoints ?? 0,
    playedAt: summary.createdAt ?? now,
    resultScreenshotUrl: options?.screenshotUrl,
    dataSource: "pubg_api",
    syncedAt: now,
    teamResults,
    playerResults,
  };

  const importRecord: PubgMatchImport = {
    id: matchId,
    pubgMatchId: matchId,
    mapName: summary.mapName ?? "Unknown",
    gameMode: summary.gameMode ?? "unknown",
    createdAt: summary.createdAt ?? now,
    duration: summary.duration,
    tournamentId: context.tournamentId,
    scrimId: options?.scrimId,
    syncedAt: now,
    teamResults,
    playerResults,
    dataSource: "pubg_api",
  };

  await Promise.all([
    saveFirestoreDocument(COLLECTIONS.pubgMatches, matchId, { ...summary, ...importRecord }),
    saveFirestoreDocument(COLLECTIONS.matchResults, matchId, matchRecord as unknown as Record<string, unknown>),
    saveFirestoreDocument(COLLECTIONS.matches, matchId, matchRecord as unknown as Record<string, unknown>),
    saveFirestoreDocument(COLLECTIONS.tournamentMatches, matchId, matchRecord as unknown as Record<string, unknown>),
  ]);

  if (options?.scrimId) {
    const existingScrim = await getFirestoreDocument<Scrim>(COLLECTIONS.scrims, options.scrimId);
    const pubgMatchIds = Array.from(
      new Set(
        [...(existingScrim?.pubgMatchIds ?? []), existingScrim?.pubgMatchId, matchId].filter(
          (value): value is string => Boolean(value)
        )
      )
    );

    await saveFirestoreDocument(COLLECTIONS.scrims, options.scrimId, {
      pubgMatchId: pubgMatchIds[0] ?? matchId,
      pubgMatchIds,
      tournamentId: existingScrim?.tournamentId ?? context.tournamentId,
      status: "completed",
      updatedAt: now,
    });
  }

  if (context.tournamentId) {
    await syncTournamentDerivedData(context.tournamentId, context.tournament);
    await syncBravoSeasonIfNeeded(context.tournament);
  }

  return { summary, teamResults, playerResults, matchRecord, players: parsedPlayers.length };
}

export async function getLiveMatchResults(limit = 20) {
  try {
    const docs = await fetchFirestoreCollection<TournamentMatch>(COLLECTIONS.matchResults, limit);
    return docs.sort((firstMatch, secondMatch) => (secondMatch.syncedAt ?? "").localeCompare(firstMatch.syncedAt ?? ""));
  } catch {
    return [];
  }
}

export async function getMatchResult(matchId: string) {
  return getFirestoreDocument<TournamentMatch>(COLLECTIONS.matchResults, matchId);
}
