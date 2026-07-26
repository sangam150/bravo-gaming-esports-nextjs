import { compareBravoTeamSlotOrder, resolveBravoTeamIdentity } from "./bravo-teams";
import {
  getSeason,
  getSeasonTournaments,
  getTournamentMatches,
  getTournamentPlayers,
  getTournamentStandings,
  getTournamentTeams,
  savePlayer,
  saveTeam,
} from "./data";
import { COLLECTIONS, deleteDocument, isDocumentStoreConfigured, queryDocumentCollection, saveDocument } from "./document-store";
import { buildPlayerAppearanceMapFromMatches, choosePreferredPlayerTeam } from "./player-team-history";
import { compareMvpRankingPlayers, comparePlayerLeaderboardPerformance } from "./ranking-sort";
import { buildSeasonLeaderboard } from "./season-standings";
import type { Player, Team, TournamentMatch, TournamentStanding } from "./types";

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function buildSeasonTeamId(seasonId: string, teamName: string) {
  return resolveBravoTeamIdentity(teamName)?.id ?? `${seasonId}--${slugify(teamName)}`;
}

function buildSeasonPlayerId(seasonId: string, sourcePlayerId: string, playerName: string) {
  return `${seasonId}--${slugify(sourcePlayerId || playerName)}`;
}

function compareSeasonTeamDocs(firstTeam: Pick<Team, "slotNumber" | "name">, secondTeam: Pick<Team, "slotNumber" | "name">) {
  return compareBravoTeamSlotOrder(firstTeam, secondTeam);
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
        firstPlayer.playerName.localeCompare(secondPlayer.playerName),
    )[0] ?? null;

  if (!mvp) return null;
  return mvp.pubgPlayerId ?? mvp.playerId ?? mvp.playerName;
}

async function deleteMissingSeasonDocuments<T extends { id: string }>(
  collectionName: string,
  seasonId: string,
  keepIds: Set<string>,
  scope?: "season" | "tournament",
) {
  const existingDocuments = await queryDocumentCollection<T>(collectionName, "seasonId", seasonId, 2000).catch(() => []);

  await Promise.all(
    existingDocuments
      .filter((document) => {
        const documentScope =
          typeof document === "object" && document && "scope" in document
            ? (document.scope as "season" | "tournament" | undefined)
            : undefined;

        if (scope && documentScope !== scope) return false;
        return !keepIds.has(document.id);
      })
      .map((document) => deleteDocument(collectionName, document.id)),
  );
}

function mergeTeamMetadata(
  seasonId: string,
  teamMetadata: Map<
    string,
    {
      teamName: string;
      slotNumber?: number;
      logoUrl?: string;
      logo?: string;
      country?: string;
      dayNumbers: Set<number>;
      sourceTeamNames: Set<string>;
    }
  >,
  input: {
    teamId?: string;
    teamName?: string;
    slotNumber?: number;
    logoUrl?: string;
    logo?: string;
    country?: string;
    dayNumber?: number;
    sourceTeamName?: string;
  },
) {
  const rawTeamName = input.teamName?.trim() || input.sourceTeamName?.trim();
  const canonicalTeam = resolveBravoTeamIdentity(rawTeamName ?? input.teamId);
  const teamId = input.teamId ?? (rawTeamName ? buildSeasonTeamId(seasonId, rawTeamName) : undefined);
  if (!teamId) {
    return;
  }

  const metadata = teamMetadata.get(teamId) ?? {
    teamName: canonicalTeam?.name ?? rawTeamName ?? teamId,
    slotNumber: canonicalTeam?.slotNumber,
    dayNumbers: new Set<number>(),
    sourceTeamNames: new Set<string>(),
  };

  metadata.teamName = canonicalTeam?.name ?? metadata.teamName ?? rawTeamName ?? teamId;
  metadata.slotNumber = metadata.slotNumber ?? input.slotNumber ?? canonicalTeam?.slotNumber;
  metadata.logoUrl = metadata.logoUrl ?? input.logoUrl;
  metadata.logo = metadata.logo ?? input.logo;
  metadata.country = metadata.country ?? input.country;

  if (typeof input.dayNumber === "number" && Number.isFinite(input.dayNumber)) {
    metadata.dayNumbers.add(input.dayNumber);
  }

  if (input.sourceTeamName?.trim()) {
    metadata.sourceTeamNames.add(input.sourceTeamName.trim());
  } else if (rawTeamName) {
    metadata.sourceTeamNames.add(rawTeamName);
  }

  teamMetadata.set(teamId, metadata);
}

export async function syncSeasonDerivedData(seasonId: string) {
  if (!isDocumentStoreConfigured()) {
    return null;
  }

  const season = await getSeason(seasonId);
  if (!season) {
    return null;
  }

  const seasonTitle = season.seriesTitle ?? season.title;
  const tournaments = await getSeasonTournaments(seasonId);
  const tournamentSnapshots = await Promise.all(
    tournaments.map(async (tournament) => {
      const [matches, standings, teams, players] = await Promise.all([
        getTournamentMatches(tournament.id),
        getTournamentStandings(tournament.id),
        getTournamentTeams(tournament.id),
        getTournamentPlayers(tournament.id),
      ]);

      return { tournament, matches, standings, teams, players };
    }),
  );

  const existingSeasonTeams = await queryDocumentCollection<Team>(COLLECTIONS.teams, "seasonId", seasonId, 1000).catch(() => []);
  const existingSeasonPlayers = await queryDocumentCollection<Player>(COLLECTIONS.players, "seasonId", seasonId, 3000).catch(() => []);
  const existingSeasonTeamByResolvedId = new Map(
    existingSeasonTeams
      .filter((team) => team.scope === "season")
      .map((team) => {
        const resolvedId =
          (team.sourceTeamName ? buildSeasonTeamId(seasonId, team.sourceTeamName) : undefined) ??
          resolveBravoTeamIdentity(team.name)?.id ??
          team.id;
        return [resolvedId, team] as const;
      }),
  );
  const existingSeasonPlayerById = new Map(
    existingSeasonPlayers.filter((player) => player.scope === "season").map((player) => [player.id, player] as const),
  );

  const allMatches = tournamentSnapshots.flatMap((snapshot) => snapshot.matches);
  const seasonAppearanceMap = buildPlayerAppearanceMapFromMatches(allMatches);
  const seasonMvpCounts = new Map<string, number>();
  const teamMetadata = new Map<
    string,
    {
      teamName: string;
      slotNumber?: number;
      logoUrl?: string;
      logo?: string;
      country?: string;
      dayNumbers: Set<number>;
      sourceTeamNames: Set<string>;
    }
  >();
  const mappedStandings: TournamentStanding[] = [];
  const playerAggregateMap = new Map<
    string,
    {
      id: string;
      name: string;
      inGameName: string;
      teamId?: string;
      teamName?: string;
      role?: Player["role"];
      nationality?: string;
      avatarUrl?: string;
      avatar?: string;
      pubgId?: string;
      pubgName?: string;
      assists: number;
      knocks: number;
      placementPoints: number;
      totalPoints: number;
      kills: number;
      damage: number;
      mvpCount: number;
      chickenDinners: number;
      matches: number;
      bestPlacement: number;
      dayNumbers: Set<number>;
      sourcePlayerKey: string;
    }
  >();

  for (const existingSeasonTeam of existingSeasonTeamByResolvedId.values()) {
    const canonicalTeamId =
      (existingSeasonTeam.sourceTeamName ? buildSeasonTeamId(seasonId, existingSeasonTeam.sourceTeamName) : undefined) ??
      resolveBravoTeamIdentity(existingSeasonTeam.name)?.id ??
      existingSeasonTeam.id;

    mergeTeamMetadata(seasonId, teamMetadata, {
      teamId: canonicalTeamId,
      teamName: existingSeasonTeam.name,
      slotNumber: existingSeasonTeam.slotNumber,
      logoUrl: existingSeasonTeam.logoUrl,
      logo: existingSeasonTeam.logo,
      country: existingSeasonTeam.country,
      sourceTeamName: existingSeasonTeam.sourceTeamName ?? existingSeasonTeam.name,
    });
  }

  for (const snapshot of tournamentSnapshots) {
    const dayNumber = snapshot.tournament.seasonDayNumber ?? snapshot.tournament.dayNumber;

    for (const registeredTeamId of snapshot.tournament.registeredTeamIds ?? []) {
      const existingSeasonTeam = existingSeasonTeamByResolvedId.get(registeredTeamId);
      const canonicalTeam = resolveBravoTeamIdentity(existingSeasonTeam?.name ?? registeredTeamId);

      mergeTeamMetadata(seasonId, teamMetadata, {
        teamId: registeredTeamId,
        teamName: existingSeasonTeam?.name ?? canonicalTeam?.name ?? registeredTeamId,
        slotNumber: existingSeasonTeam?.slotNumber ?? canonicalTeam?.slotNumber,
        logoUrl: existingSeasonTeam?.logoUrl,
        logo: existingSeasonTeam?.logo,
        country: existingSeasonTeam?.country,
        dayNumber,
        sourceTeamName: existingSeasonTeam?.sourceTeamName ?? existingSeasonTeam?.name ?? canonicalTeam?.name,
      });
    }

    for (const team of snapshot.teams) {
      const sourceTeamName = team.sourceTeamName ?? team.name;
      mergeTeamMetadata(seasonId, teamMetadata, {
        teamId: buildSeasonTeamId(seasonId, sourceTeamName),
        teamName: sourceTeamName,
        slotNumber: team.slotNumber,
        logoUrl: team.logoUrl,
        logo: team.logo,
        country: team.country,
        dayNumber,
        sourceTeamName,
      });
    }

    for (const standing of snapshot.standings) {
      const seasonTeamId = buildSeasonTeamId(seasonId, standing.teamName);
      mergeTeamMetadata(seasonId, teamMetadata, {
        teamId: seasonTeamId,
        teamName: standing.teamName,
        slotNumber: standing.slotNumber,
        dayNumber,
        sourceTeamName: standing.teamName,
      });

      mappedStandings.push({
        ...standing,
        teamId: seasonTeamId,
        slotNumber:
          standing.slotNumber ?? teamMetadata.get(seasonTeamId)?.slotNumber ?? resolveBravoTeamIdentity(standing.teamName)?.slotNumber,
        seasonId,
        seasonTitle,
        seasonDayNumber: dayNumber,
        scope: "tournament",
      });
    }

    const tournamentPlayerLookup = new Map(
      snapshot.players.flatMap((player) => {
        const keys = [player.sourcePlayerId, player.pubgId, player.pubgName, player.inGameName, player.name].filter(
          (value): value is string => Boolean(value),
        );
        return keys.map((key) => [key, player] as const);
      }),
    );

    for (const match of snapshot.matches) {
      const mvpPlayerKey = getMatchMvpPlayerKey(match);
      if (mvpPlayerKey) {
        seasonMvpCounts.set(mvpPlayerKey, (seasonMvpCounts.get(mvpPlayerKey) ?? 0) + 1);
      }

      for (const playerResult of match.playerResults ?? []) {
        const sourcePlayerKey = playerResult.pubgPlayerId ?? playerResult.playerId ?? playerResult.playerName;
        const relatedPlayer = tournamentPlayerLookup.get(sourcePlayerKey) ?? tournamentPlayerLookup.get(playerResult.playerName) ?? null;
        const seasonPlayerId = buildSeasonPlayerId(seasonId, sourcePlayerKey ?? "", playerResult.playerName);
        const seasonTeamId =
          playerResult.teamName && playerResult.teamName.trim().length > 0 ? buildSeasonTeamId(seasonId, playerResult.teamName) : undefined;

        if (playerResult.teamName && seasonTeamId) {
          mergeTeamMetadata(seasonId, teamMetadata, {
            teamId: seasonTeamId,
            teamName: playerResult.teamName,
            slotNumber: playerResult.slotNumber,
            dayNumber,
            sourceTeamName: playerResult.teamName,
          });
        }

        const existingSeasonPlayer = existingSeasonPlayerById.get(seasonPlayerId);
        const aggregate = playerAggregateMap.get(seasonPlayerId) ?? {
          id: seasonPlayerId,
          name: existingSeasonPlayer?.name ?? relatedPlayer?.name ?? playerResult.playerName,
          inGameName: existingSeasonPlayer?.inGameName ?? relatedPlayer?.inGameName ?? playerResult.playerName,
          teamId: seasonTeamId,
          teamName: playerResult.teamName,
          role: existingSeasonPlayer?.role ?? relatedPlayer?.role,
          nationality: existingSeasonPlayer?.nationality ?? relatedPlayer?.nationality,
          avatarUrl: existingSeasonPlayer?.avatarUrl ?? relatedPlayer?.avatarUrl ?? relatedPlayer?.avatar,
          avatar: existingSeasonPlayer?.avatar ?? relatedPlayer?.avatar ?? relatedPlayer?.avatarUrl,
          pubgId: existingSeasonPlayer?.pubgId ?? relatedPlayer?.pubgId ?? sourcePlayerKey,
          pubgName: existingSeasonPlayer?.pubgName ?? relatedPlayer?.pubgName ?? playerResult.playerName,
          assists: 0,
          knocks: 0,
          placementPoints: 0,
          totalPoints: 0,
          kills: 0,
          damage: 0,
          mvpCount: 0,
          chickenDinners: 0,
          matches: 0,
          bestPlacement: Number.POSITIVE_INFINITY,
          dayNumbers: new Set<number>(),
          sourcePlayerKey,
        };

        aggregate.role = aggregate.role ?? relatedPlayer?.role;
        aggregate.nationality = aggregate.nationality ?? relatedPlayer?.nationality;
        aggregate.pubgId = aggregate.pubgId ?? relatedPlayer?.pubgId;
        aggregate.pubgName = aggregate.pubgName ?? relatedPlayer?.pubgName;
        aggregate.assists += playerResult.assists;
        aggregate.knocks += playerResult.knocks;
        aggregate.placementPoints += playerResult.placementPoints;
        aggregate.totalPoints += playerResult.totalPoints;
        aggregate.kills += playerResult.kills;
        aggregate.damage += playerResult.damage;
        aggregate.chickenDinners += playerResult.placement === 1 ? 1 : 0;
        aggregate.matches += 1;
        aggregate.bestPlacement = Math.min(aggregate.bestPlacement, playerResult.placement);
        if (typeof dayNumber === "number" && Number.isFinite(dayNumber)) {
          aggregate.dayNumbers.add(dayNumber);
        }

        playerAggregateMap.set(seasonPlayerId, aggregate);
      }
    }
  }

  const leaderboardEntries = buildSeasonLeaderboard(mappedStandings);
  const playerSummaries = Array.from(playerAggregateMap.values())
    .map((playerAggregate) => {
      const preferredTeam = choosePreferredPlayerTeam(Array.from(seasonAppearanceMap.get(playerAggregate.sourcePlayerKey)?.values() ?? []));
      const resolvedTeamName = preferredTeam?.teamName ?? playerAggregate.teamName;

      return {
        ...playerAggregate,
        teamId: resolvedTeamName ? buildSeasonTeamId(seasonId, resolvedTeamName) : undefined,
        teamName: resolvedTeamName,
        mvpCount: seasonMvpCounts.get(playerAggregate.sourcePlayerKey) ?? 0,
        dayNumbers: Array.from(playerAggregate.dayNumbers).sort((firstDay, secondDay) => firstDay - secondDay),
        bestPlacement: Number.isFinite(playerAggregate.bestPlacement) ? playerAggregate.bestPlacement : undefined,
        averageDamage: playerAggregate.matches > 0 ? Number((playerAggregate.damage / playerAggregate.matches).toFixed(2)) : undefined,
        rating: playerAggregate.totalPoints,
        winRate: playerAggregate.matches > 0 ? Number((playerAggregate.chickenDinners / playerAggregate.matches).toFixed(4)) : undefined,
      };
    })
    .sort((firstPlayer, secondPlayer) => comparePlayerLeaderboardPerformance(firstPlayer, secondPlayer));

  const mvpOfWeek = [...playerSummaries].sort((firstPlayer, secondPlayer) => compareMvpRankingPlayers(firstPlayer, secondPlayer))[0];

  const seasonPlayerDocs = playerSummaries.map(
    (playerSummary) =>
      ({
        id: playerSummary.id,
        name: playerSummary.name,
        inGameName: playerSummary.inGameName,
        teamId: playerSummary.teamId,
        teamName: playerSummary.teamName,
        avatarUrl: playerSummary.avatarUrl,
        avatar: playerSummary.avatar,
        pubgId: playerSummary.pubgId,
        pubgName: playerSummary.pubgName,
        role: playerSummary.role,
        nationality: playerSummary.nationality,
        playerStatus: "active",
        assists: playerSummary.assists,
        knocks: playerSummary.knocks,
        placementPoints: playerSummary.placementPoints,
        totalPoints: playerSummary.totalPoints,
        averageDamage: playerSummary.averageDamage,
        bestPlacement: playerSummary.bestPlacement,
        kills: playerSummary.kills,
        damage: playerSummary.damage,
        mvpCount: playerSummary.mvpCount,
        chickenDinners: playerSummary.chickenDinners,
        matches: playerSummary.matches,
        rating: playerSummary.rating,
        winRate: playerSummary.winRate,
        isMvpOfWeek: playerSummary.id === mvpOfWeek?.id,
        scope: "season",
        seasonId,
        seasonTitle,
        seasonDayNumbers: playerSummary.dayNumbers,
        sourcePlayerId: playerSummary.pubgId ?? playerSummary.sourcePlayerKey,
        sourceProvider: "season_sync",
        createdAt: existingSeasonPlayerById.get(playerSummary.id)?.createdAt,
      }) satisfies Partial<Player> & { id: string; name: string },
  );

  const playerIdsByTeamId = new Map<string, string[]>();
  for (const playerDocument of seasonPlayerDocs) {
    if (!playerDocument.teamId) continue;
    const currentPlayerIds = playerIdsByTeamId.get(playerDocument.teamId) ?? [];
    currentPlayerIds.push(playerDocument.id);
    playerIdsByTeamId.set(playerDocument.teamId, currentPlayerIds);
  }

  const leaderboardEntriesByTeamId = new Map(leaderboardEntries.map((entry) => [entry.teamId, entry] as const));
  const seasonTeamIds = Array.from(
    new Set([...teamMetadata.keys(), ...leaderboardEntries.map((entry) => entry.teamId), ...playerIdsByTeamId.keys()]),
  );
  const seasonTeamDocs = seasonTeamIds
    .map((teamId) => {
      const metadata = teamMetadata.get(teamId);
      const existingSeasonTeam = existingSeasonTeamByResolvedId.get(teamId);
      const leaderboardEntry = leaderboardEntriesByTeamId.get(teamId);
      const canonicalTeam = resolveBravoTeamIdentity(metadata?.teamName ?? existingSeasonTeam?.name ?? teamId);
      const teamName = existingSeasonTeam?.name ?? metadata?.teamName ?? canonicalTeam?.name ?? teamId;

      return {
        id: teamId,
        name: teamName,
        tag: existingSeasonTeam?.tag ?? canonicalTeam?.tag,
        slotNumber: existingSeasonTeam?.slotNumber ?? metadata?.slotNumber ?? canonicalTeam?.slotNumber,
        logoUrl: existingSeasonTeam?.logoUrl ?? metadata?.logoUrl ?? metadata?.logo,
        logo: existingSeasonTeam?.logo ?? metadata?.logo ?? metadata?.logoUrl,
        country: existingSeasonTeam?.country ?? metadata?.country,
        rank: leaderboardEntry?.rank,
        totalPoints: leaderboardEntry?.totalPoints ?? 0,
        kills: leaderboardEntry?.kills ?? 0,
        matches: leaderboardEntry?.matches ?? 0,
        killPoints: leaderboardEntry?.killPoints ?? 0,
        placementPoints: leaderboardEntry?.placementPoints ?? 0,
        averagePlacement: leaderboardEntry?.averagePlacement,
        chickenDinners: leaderboardEntry?.chickenDinners ?? 0,
        status: existingSeasonTeam?.status ?? "active",
        registrationStatus: existingSeasonTeam?.registrationStatus ?? "approved",
        playerIds: playerIdsByTeamId.get(teamId) ?? [],
        captainName: existingSeasonTeam?.captainName,
        captainDiscord: existingSeasonTeam?.captainDiscord,
        captainPhone: existingSeasonTeam?.captainPhone,
        captainEmail: existingSeasonTeam?.captainEmail,
        scope: "season" as const,
        seasonId,
        seasonTitle,
        seasonDayNumbers:
          leaderboardEntry?.dayNumbers ?? Array.from(metadata?.dayNumbers ?? []).sort((firstDay, secondDay) => firstDay - secondDay),
        sourceTeamName: metadata?.teamName ?? teamName,
        sourceProvider: "season_sync",
        createdAt: existingSeasonTeam?.createdAt,
      } satisfies Partial<Team> & { id: string; name: string };
    })
    .sort((firstTeam, secondTeam) => compareSeasonTeamDocs(firstTeam, secondTeam));

  for (const teamDocument of seasonTeamDocs) {
    await saveTeam(teamDocument, teamDocument.id);
  }

  for (const playerDocument of seasonPlayerDocs) {
    await savePlayer(playerDocument, playerDocument.id);
  }

  const now = new Date().toISOString();
  const seasonStandingDocs = leaderboardEntries.map((entry) => ({
    id: `${seasonId}--${slugify(entry.teamName)}`,
    tournamentId: seasonId,
    teamId: entry.teamId,
    teamName: entry.teamName,
    matches: entry.matches,
    wins: entry.chickenDinners,
    kills: entry.kills,
    killPoints: entry.killPoints,
    placementPoints: entry.placementPoints,
    totalPoints: entry.totalPoints,
    bestPlacement: entry.bestPlacement,
    averagePlacement: entry.averagePlacement,
    rank: entry.rank,
    seasonId,
    seasonTitle,
    seasonDayNumber: season.currentDay,
    scope: "season" as const,
    sourceTournamentTitle: season.title,
    sourceProvider: "season_sync",
    updatedAt: now,
  }));

  await Promise.all(
    seasonStandingDocs.map((standingDocument) =>
      saveDocument(COLLECTIONS.standings, standingDocument.id, standingDocument as unknown as Record<string, unknown>),
    ),
  );

  await deleteMissingSeasonDocuments<Team>(COLLECTIONS.teams, seasonId, new Set(seasonTeamDocs.map((team) => team.id)), "season");
  await deleteMissingSeasonDocuments<Player>(COLLECTIONS.players, seasonId, new Set(seasonPlayerDocs.map((player) => player.id)), "season");
  await deleteMissingSeasonDocuments<TournamentStanding>(
    COLLECTIONS.standings,
    seasonId,
    new Set([...mappedStandings.map((standing) => standing.id), ...seasonStandingDocs.map((standing) => standing.id)]),
  );

  return {
    seasonId,
    tournaments: tournamentSnapshots.length,
    matches: allMatches.length,
    seasonTeams: seasonTeamDocs.length,
    seasonPlayers: seasonPlayerDocs.length,
    seasonStandings: seasonStandingDocs.length,
  };
}
