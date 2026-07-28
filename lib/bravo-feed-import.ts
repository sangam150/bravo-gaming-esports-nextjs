import {
  BRAVO_FEED_URL,
  buildBravoDayTag,
  buildBravoTournamentSlug,
  buildBravoTournamentTitle,
  fetchBravoFeedTournaments,
  type BravoSourcePlayerStanding,
  type BravoSourceStanding,
} from "./bravo-feed";
import { getBravoCanonicalTeamIds, parseBravoSlotNumber, resolveBravoTeamIdentity } from "./bravo-teams";
import { savePlayer, saveTeam, saveTournament, saveTournamentMatch } from "./data";
import { COLLECTIONS, deleteDocument, isDocumentStoreConfigured, queryDocumentCollection, saveDocument } from "./document-store";
import { slugify } from "./slug-utils";
import { buildTournamentStandings, normalizeMapName, toTeamMatchResults } from "./tournament-standings";
import type { Player, Team, TournamentMatch, TournamentStanding } from "./types";

function parseNumericSuffix(value: string) {
  const match = value.match(/(\d+)/);
  return match ? Number(match[1]) : undefined;
}

function normalizeTier(value?: string) {
  if (!value) return "C-TIER";
  return value.endsWith("-TIER") ? value.toUpperCase() : `${value.toUpperCase()}-TIER`;
}

function uniqueMapRotation(matches: TournamentMatch[]) {
  return Array.from(new Set(matches.map((match) => match.map).filter(Boolean)));
}

function buildTeamId(tournamentId: string, teamName: string) {
  const resolvedTeam = resolveBravoTeamIdentity(teamName);
  return `${tournamentId}--${resolvedTeam?.id ?? slugify(teamName)}`;
}

function buildPlayerId(tournamentId: string, playerId: string, playerName: string) {
  return `${tournamentId}--${slugify(playerId || playerName)}`;
}

function buildMatchId(tournamentId: string, sourceMatchId: string) {
  return `${tournamentId}--${slugify(sourceMatchId)}`;
}

function buildStandingId(tournamentId: string, teamName: string) {
  return `${tournamentId}--${slugify(teamName)}`;
}

function toStandingDocument(
  standing: BravoSourceStanding,
  tournamentId: string,
  tournamentTitle: string,
  dayNumber: number,
  teamId: string,
  averagePlacement: number,
  slotNumber?: number,
) {
  return {
    id: buildStandingId(tournamentId, standing.teamName),
    tournamentId,
    teamId,
    teamName: standing.teamName,
    slotNumber,
    matches: standing.matchesPlayed,
    wins: standing.chickenDinners,
    kills: standing.totalKills,
    killPoints: standing.totalKills,
    placementPoints: standing.placementPoints,
    totalPoints: standing.totalPoints,
    bestPlacement: standing.bestPlacement,
    averagePlacement,
    rank: standing.rank,
    seasonDayNumber: dayNumber,
    scope: "tournament",
    sourceTournamentId: tournamentId,
    sourceTournamentTitle: tournamentTitle,
    sourceProvider: "bravo_feed",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    dayTag: buildBravoDayTag(dayNumber),
  } satisfies TournamentStanding & { dayTag: string };
}

function buildPlayerDocument(
  playerStanding: BravoSourcePlayerStanding,
  playerId: string,
  teamId: string | undefined,
  teamName: string,
  tournamentId: string,
  tournamentTitle: string,
  dayNumber: number,
) {
  return {
    id: playerId,
    name: playerStanding.playerName,
    inGameName: playerStanding.playerName,
    teamId,
    teamName,
    pubgId: playerStanding.playerId,
    pubgName: playerStanding.playerName,
    assists: playerStanding.totalAssists,
    knocks: playerStanding.totalKnocks,
    placementPoints: playerStanding.placementPoints,
    totalPoints: playerStanding.totalPoints,
    averageDamage: playerStanding.averageDamageDealt,
    bestPlacement: playerStanding.bestPlacement,
    kills: playerStanding.totalKills,
    damage: Math.round(playerStanding.totalDamageDealt),
    mvpCount: 0,
    chickenDinners: 0,
    matches: playerStanding.matchesPlayed,
    rating: playerStanding.totalPoints,
    scope: "tournament",
    seasonDayNumbers: [dayNumber],
    sourceTournamentId: tournamentId,
    sourceTournamentTitle: tournamentTitle,
    sourcePlayerId: playerStanding.playerId,
    sourceProvider: "bravo_feed",
  } satisfies Partial<Player> & { id: string; name: string };
}

async function deleteMissingDocuments<T extends { id: string }>(existingDocuments: T[], keepIds: Set<string>, collectionName: string) {
  const deletions = existingDocuments
    .filter((document) => !keepIds.has(document.id))
    .map((document) => deleteDocument(collectionName, document.id));

  await Promise.all(deletions);
}

export async function importBravoGamingFeed(options?: { maxDay?: number }) {
  if (!isDocumentStoreConfigured()) {
    throw new Error("Supabase is not configured. Add the Supabase environment variables before importing Bravo feed data.");
  }

  const importedFeed = await fetchBravoFeedTournaments(options);
  const importSummaries: Array<{
    tournamentId: string;
    title: string;
    sourceUrl: string;
    status: string;
    teams: number;
    players: number;
    matches: number;
  }> = [];

  for (const tournamentItem of importedFeed) {
    const tournamentId = buildBravoTournamentSlug(tournamentItem.dayNumber);
    const tournamentTitle = buildBravoTournamentTitle(tournamentItem.dayNumber);
    const tournamentData = tournamentItem.payload.tournament;

    const sourceTeamNames = new Set<string>();
    const canonicalTeamIdsBySourceName = new Map<string, string>();
    const canonicalTeamNamesBySourceName = new Map<string, string>();
    const canonicalTeamSlotsBySourceName = new Map<string, number | undefined>();

    for (const standing of Array.isArray(tournamentItem.payload.standings) ? tournamentItem.payload.standings : []) {
      sourceTeamNames.add(standing.teamName);
    }

    for (const match of tournamentData.matches) {
      for (const result of match.results) {
        sourceTeamNames.add(result.teamName);
      }
    }

    for (const playerStanding of tournamentItem.payload.playerStandings) {
      sourceTeamNames.add(playerStanding.teamName);
    }

    for (const sourceTeamName of sourceTeamNames) {
      const resolvedTeam = resolveBravoTeamIdentity(sourceTeamName);
      canonicalTeamIdsBySourceName.set(sourceTeamName, resolvedTeam?.id ?? buildTeamId(tournamentId, sourceTeamName));
      canonicalTeamNamesBySourceName.set(sourceTeamName, resolvedTeam?.name ?? sourceTeamName);
      canonicalTeamSlotsBySourceName.set(sourceTeamName, resolvedTeam?.slotNumber ?? parseBravoSlotNumber(sourceTeamName));
    }

    const matchDocuments: TournamentMatch[] = tournamentData.matches.map((match) => {
      const teamResults = toTeamMatchResults(
        match.results.map((result) => ({
          ...result,
          teamId: canonicalTeamIdsBySourceName.get(result.teamName) ?? null,
          teamName: canonicalTeamNamesBySourceName.get(result.teamName) ?? result.teamName,
          slotNumber: canonicalTeamSlotsBySourceName.get(result.teamName),
        })),
      );
      const winner = teamResults.find((teamResult) => teamResult.placement === 1)?.teamName ?? teamResults[0]?.teamName ?? "Unknown";

      return {
        id: buildMatchId(tournamentId, match.id),
        tournamentId,
        pubgMatchId: match.id,
        externalMatchId: match.id,
        sequenceNumber: match.sequenceNumber,
        map: normalizeMapName(match.mapName),
        winner,
        points: teamResults[0]?.totalPoints ?? 0,
        knockouts: teamResults.reduce((totalKills, teamResult) => totalKills + teamResult.kills, 0),
        placementPoints: teamResults[0]?.placementPoints ?? 0,
        killPoints: teamResults[0]?.killPoints ?? 0,
        playedAt: match.scheduledAt,
        sourceUrl: tournamentItem.sourceUrl,
        dataSource: "external_feed",
        syncedAt: new Date().toISOString(),
        teamResults,
      } satisfies TournamentMatch;
    });

    const computedStandings = buildTournamentStandings(tournamentId, tournamentTitle, matchDocuments);
    const computedStandingsByName = new Map(computedStandings.map((standing) => [standing.teamName, standing]));

    const standingDocuments: TournamentStanding[] = Array.isArray(tournamentItem.payload.standings)
      ? tournamentItem.payload.standings.map((standing) => {
          const canonicalTeamName = canonicalTeamNamesBySourceName.get(standing.teamName) ?? standing.teamName;
          const computedStanding = computedStandingsByName.get(canonicalTeamName);
          const canonicalTeamId = canonicalTeamIdsBySourceName.get(standing.teamName) ?? buildTeamId(tournamentId, canonicalTeamName);
          const slotNumber = canonicalTeamSlotsBySourceName.get(standing.teamName);

          return toStandingDocument(
            { ...standing, teamName: canonicalTeamName },
            tournamentId,
            tournamentTitle,
            tournamentItem.dayNumber,
            canonicalTeamId,
            computedStanding?.averagePlacement ?? 0,
            slotNumber,
          );
        })
      : computedStandings.map((standing) => ({
          ...standing,
          id: buildStandingId(tournamentId, standing.teamName),
        }));

    const playerDocuments = tournamentItem.payload.playerStandings.map((playerStanding) =>
      buildPlayerDocument(
        playerStanding,
        buildPlayerId(tournamentId, playerStanding.playerId, playerStanding.playerName),
        canonicalTeamIdsBySourceName.get(playerStanding.teamName),
        canonicalTeamNamesBySourceName.get(playerStanding.teamName) ?? playerStanding.teamName,
        tournamentId,
        tournamentTitle,
        tournamentItem.dayNumber,
      ),
    );

    const playerIdsByTeamName = new Map<string, string[]>();
    for (const playerDocument of playerDocuments) {
      const currentTeamPlayers = playerIdsByTeamName.get(playerDocument.teamName ?? "") ?? [];
      currentTeamPlayers.push(playerDocument.id);
      playerIdsByTeamName.set(playerDocument.teamName ?? "", currentTeamPlayers);
    }

    const standingsByTeamName = new Map(standingDocuments.map((standing) => [standing.teamName, standing]));
    const teamDocuments = Array.from(sourceTeamNames)
      .sort((firstName, secondName) => (parseNumericSuffix(firstName) ?? 999) - (parseNumericSuffix(secondName) ?? 999))
      .reduce<Array<Partial<Team> & { id: string; name: string }>>((documents, sourceTeamName) => {
        const canonicalTeamName = canonicalTeamNamesBySourceName.get(sourceTeamName) ?? sourceTeamName;
        const standing = standingsByTeamName.get(canonicalTeamName);
        const teamId = buildTeamId(tournamentId, canonicalTeamName);

        if (documents.some((document) => document.id === teamId)) {
          return documents;
        }

        documents.push({
          id: teamId,
          name: canonicalTeamName,
          tag: resolveBravoTeamIdentity(canonicalTeamName)?.tag ?? buildBravoDayTag(tournamentItem.dayNumber),
          slotNumber:
            canonicalTeamSlotsBySourceName.get(sourceTeamName) ??
            resolveBravoTeamIdentity(canonicalTeamName)?.slotNumber ??
            parseNumericSuffix(sourceTeamName),
          country: tournamentData.region,
          rank: standing?.rank,
          totalPoints: standing?.totalPoints ?? 0,
          kills: standing?.kills ?? 0,
          matches: standing?.matches ?? 0,
          killPoints: standing?.killPoints ?? standing?.kills ?? 0,
          placementPoints: standing?.placementPoints ?? 0,
          averagePlacement: standing?.averagePlacement ?? 0,
          chickenDinners: standing?.wins ?? 0,
          status: "active" as const,
          registrationStatus: "approved" as const,
          playerIds: playerIdsByTeamName.get(canonicalTeamName) ?? [],
          scope: "tournament" as const,
          seasonDayNumbers: [tournamentItem.dayNumber],
          sourceTournamentId: tournamentId,
          sourceTournamentTitle: tournamentTitle,
          sourceTeamName,
          sourceProvider: "bravo_feed",
        });

        return documents;
      }, []);

    const tournamentDocument = {
      id: tournamentId,
      title: tournamentTitle,
      tier: normalizeTier(tournamentData.tier),
      status: tournamentItem.status,
      prizePool:
        typeof tournamentData.prizePool === "number" && tournamentData.prizePool > 0
          ? `NPR ${tournamentData.prizePool.toLocaleString()}`
          : "Awaiting result publication",
      teamCount: teamDocuments.length,
      maxTeams: Math.max(tournamentData.maxSlots ?? getBravoCanonicalTeamIds().length, teamDocuments.length || 1),
      startDate: tournamentData.startDate?.slice(0, 10) ?? tournamentData.createdAt.slice(0, 10),
      endDate: tournamentData.endDate?.slice(0, 10),
      format: tournamentData.mode ?? "Squad",
      mode: "PUBG PC",
      server: tournamentData.region ?? "Global",
      perspective: tournamentData.perspective ?? "TPP",
      description: tournamentData.description || undefined,
      rules: tournamentData.rules || undefined,
      mapRotation: uniqueMapRotation(matchDocuments),
      bannerUrl: tournamentData.bannerUrl,
      registeredTeamIds: teamDocuments.map((team) => resolveBravoTeamIdentity(team.name)?.id ?? team.id),
      dayNumber: tournamentItem.dayNumber,
      matchCount: matchDocuments.length,
      sourceId: tournamentData.code,
      sourceName: tournamentData.name,
      sourceStatus: tournamentData.status,
      sourceUrl: tournamentItem.sourceUrl,
      sourceProvider: "bravo_feed",
      createdAt: tournamentData.createdAt,
    };

    const [existingMatches, existingStandings, existingTeams, existingPlayers] = await Promise.all([
      queryDocumentCollection<TournamentMatch>(COLLECTIONS.tournamentMatches, "tournamentId", tournamentId, 200),
      queryDocumentCollection<TournamentStanding>(COLLECTIONS.standings, "tournamentId", tournamentId, 200),
      queryDocumentCollection<Team>(COLLECTIONS.teams, "sourceTournamentId", tournamentId, 200),
      queryDocumentCollection<Player>(COLLECTIONS.players, "sourceTournamentId", tournamentId, 500),
    ]);

    await Promise.all([
      deleteMissingDocuments(existingMatches, new Set(matchDocuments.map((match) => match.id)), COLLECTIONS.tournamentMatches),
      deleteMissingDocuments(existingStandings, new Set(standingDocuments.map((standing) => standing.id)), COLLECTIONS.standings),
      deleteMissingDocuments(existingTeams, new Set(teamDocuments.map((team) => team.id)), COLLECTIONS.teams),
      deleteMissingDocuments(existingPlayers, new Set(playerDocuments.map((player) => player.id)), COLLECTIONS.players),
    ]);

    await saveTournament(tournamentDocument, tournamentId);
    await Promise.all(teamDocuments.map((team) => saveTeam(team, team.id)));
    await Promise.all(playerDocuments.map((player) => savePlayer(player, player.id)));
    await Promise.all(matchDocuments.map((match) => saveTournamentMatch(match)));
    await Promise.all(
      standingDocuments.map((standing) => saveDocument(COLLECTIONS.standings, standing.id, standing as unknown as Record<string, unknown>)),
    );

    importSummaries.push({
      tournamentId,
      title: tournamentTitle,
      sourceUrl: tournamentItem.sourceUrl,
      status: tournamentItem.payload.tournament.status,
      teams: teamDocuments.length,
      players: playerDocuments.length,
      matches: matchDocuments.length,
    });
  }

  return {
    sourceUrl: BRAVO_FEED_URL,
    importedAt: new Date().toISOString(),
    tournaments: importSummaries,
  };
}
