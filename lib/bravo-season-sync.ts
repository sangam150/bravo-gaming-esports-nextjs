import {
  getSeason,
  getTournamentMatches,
  getTournamentPlayers,
  getTournamentStandings,
  getTournamentTeams,
  getTournaments,
  savePlayer,
  saveSeason,
  saveTeam,
  saveTournament,
  saveTournamentMatch,
} from "./data";
import { importBravoGamingFeed } from "./bravo-feed-import";
import { buildBravoTournamentTitle } from "./bravo-feed";
import { compareBravoTeamSlotOrder, resolveBravoTeamIdentity } from "./bravo-teams";
import { buildPlayerAppearanceMapFromMatches, choosePreferredPlayerTeam } from "./player-team-history";
import { compareMvpRankingPlayers, comparePlayerLeaderboardPerformance } from "./ranking-sort";
import { buildSeasonLeaderboard } from "./season-standings";
import {
  COLLECTIONS,
  deleteFirestoreDocument,
  fetchFirestoreCollection,
  isFirebaseConfigured,
  queryFirestoreCollection,
  saveFirestoreDocument,
} from "./firebase";
import type { Player, Scrim, Season, SiteStats, Team, Tournament, TournamentMatch, TournamentStanding } from "./types";

const BRAVO_SEASON_SERIES_TITLE = "BRAVO GAMING ESPORTS DAILY PUBG PC SCRIMS";
const BRAVO_SEASON_START_DATE = "2026-06-05";
const BRAVO_SEASON_NUMBER = 1;
const BRAVO_SEASON_SLUG = "bravo-gaming-esports-daily-pubg-pc-scrims-season-1";
const DEFAULT_SEASON_LENGTH = 15;
const DEFAULT_CURRENT_DAY = 6;
const BRAVO_REFERENCE_IMPORT_MAX_DAY = 3;

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function toDateKey(value: Date) {
  return value.toISOString().slice(0, 10);
}

function addDays(startDate: string, dayOffset: number) {
  const [year, month, day] = startDate.split("-").map((value) => Number(value));
  const date = new Date(Date.UTC(year, month - 1, day + dayOffset, 12, 0, 0));
  return toDateKey(date);
}

function buildSeasonTeamId(seasonId: string, teamName: string) {
  return resolveBravoTeamIdentity(teamName)?.id ?? `${seasonId}--${slugify(teamName)}`;
}

function buildSeasonPlayerId(seasonId: string, sourcePlayerId: string, playerName: string) {
  return `${seasonId}--${slugify(sourcePlayerId || playerName)}`;
}

function compareSeasonTeamDocs(
  firstTeam: Pick<Team, "slotNumber" | "name">,
  secondTeam: Pick<Team, "slotNumber" | "name">
) {
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
        firstPlayer.playerName.localeCompare(secondPlayer.playerName)
    )[0] ?? null;

  if (!mvp) return null;
  return mvp.pubgPlayerId ?? mvp.playerId ?? mvp.playerName;
}

async function deleteMissingSeasonDocuments<T extends { id: string }>(
  collectionName: string,
  seasonId: string,
  keepIds: Set<string>,
  scope?: "season" | "tournament"
) {
  const existingDocuments = await queryFirestoreCollection<T>(collectionName, "seasonId", seasonId, 500);
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
      .map((document) => deleteFirestoreDocument(collectionName, document.id))
  );
}

async function purgeTournamentScope(tournamentId: string) {
  const [matches, tournamentMatches, matchResults, matchPlayers, standings, teams, players] = await Promise.all([
    queryFirestoreCollection<TournamentMatch>(COLLECTIONS.matches, "tournamentId", tournamentId, 500),
    queryFirestoreCollection<TournamentMatch>(COLLECTIONS.tournamentMatches, "tournamentId", tournamentId, 500),
    queryFirestoreCollection<TournamentMatch>(COLLECTIONS.matchResults, "tournamentId", tournamentId, 500),
    queryFirestoreCollection(COLLECTIONS.matchPlayers, "tournamentId", tournamentId, 5000),
    queryFirestoreCollection<TournamentStanding>(COLLECTIONS.standings, "tournamentId", tournamentId, 500),
    queryFirestoreCollection<Team>(COLLECTIONS.teams, "sourceTournamentId", tournamentId, 500),
    queryFirestoreCollection<Player>(COLLECTIONS.players, "sourceTournamentId", tournamentId, 1000),
  ]);

  await Promise.all([
    ...matches.map((match) => deleteFirestoreDocument(COLLECTIONS.matches, match.id)),
    ...tournamentMatches.map((match) => deleteFirestoreDocument(COLLECTIONS.tournamentMatches, match.id)),
    ...matchResults.map((match) => deleteFirestoreDocument(COLLECTIONS.matchResults, match.id)),
    ...matchPlayers.map((matchPlayer) => deleteFirestoreDocument(COLLECTIONS.matchPlayers, matchPlayer.id)),
    ...standings.map((standing) => deleteFirestoreDocument(COLLECTIONS.standings, standing.id)),
    ...teams.map((team) => deleteFirestoreDocument(COLLECTIONS.teams, team.id)),
    ...players.map((player) => deleteFirestoreDocument(COLLECTIONS.players, player.id)),
    deleteFirestoreDocument(COLLECTIONS.tournaments, tournamentId),
  ]);
}

type TournamentSnapshot = {
  tournament: Tournament;
  matches: Awaited<ReturnType<typeof getTournamentMatches>>;
  standings: Awaited<ReturnType<typeof getTournamentStandings>>;
  teams: Awaited<ReturnType<typeof getTournamentTeams>>;
  players: Awaited<ReturnType<typeof getTournamentPlayers>>;
};

export async function syncBravoDailyScrimSeason(options?: {
  configuredDays?: number;
  currentDay?: number;
  importFeed?: boolean;
}) {
  if (!isFirebaseConfigured()) {
    throw new Error("Firebase is not configured. Add FIREBASE_* credentials before syncing Bravo season data.");
  }

  const importedFeed =
    options?.importFeed === false
      ? null
      : await importBravoGamingFeed({ maxDay: BRAVO_REFERENCE_IMPORT_MAX_DAY });
  const existingSeason = await getSeason(BRAVO_SEASON_SLUG);
  const configuredDays = Math.max(
    options?.configuredDays ?? Number(existingSeason?.configuredDays ?? DEFAULT_SEASON_LENGTH),
    options?.currentDay ?? Number(existingSeason?.currentDay ?? DEFAULT_CURRENT_DAY)
  );
  const currentDay = Math.max(1, options?.currentDay ?? existingSeason?.currentDay ?? DEFAULT_CURRENT_DAY);
  const now = new Date().toISOString();

  const tournaments = await getTournaments();
  const deprecatedFeedTournaments = tournaments.filter(
    (tournament) =>
      tournament.sourceProvider === "bravo_feed" &&
      typeof tournament.dayNumber === "number" &&
      (tournament.dayNumber ?? 0) > BRAVO_REFERENCE_IMPORT_MAX_DAY
  );

  if (deprecatedFeedTournaments.length > 0) {
    await Promise.all(deprecatedFeedTournaments.map((tournament) => purgeTournamentScope(tournament.id)));
  }

  const refreshedTournaments = deprecatedFeedTournaments.length > 0 ? await getTournaments() : tournaments;
  const existingSeasonTournaments = refreshedTournaments.filter((tournament) => tournament.seasonId === BRAVO_SEASON_SLUG);
  const importedBravoTournaments = refreshedTournaments
    .filter(
      (tournament) =>
        tournament.sourceProvider === "bravo_feed" &&
        typeof tournament.dayNumber === "number" &&
        (tournament.dayNumber ?? 0) <= BRAVO_REFERENCE_IMPORT_MAX_DAY
    )
    .sort((firstTournament, secondTournament) => (firstTournament.dayNumber ?? 0) - (secondTournament.dayNumber ?? 0));

  const maxImportedDay = Math.max(...importedBravoTournaments.map((tournament) => tournament.dayNumber ?? 0), 0);
  const carriedForwardSeasonTournaments = existingSeasonTournaments
    .filter((tournament) => {
      const seasonDayNumber = tournament.seasonDayNumber ?? tournament.dayNumber ?? 0;
      if (seasonDayNumber <= maxImportedDay) return false;

      return (tournament.matchCount ?? 0) > 0 || tournament.sourceProvider !== "bravo_season";
    })
    .sort(
      (firstTournament, secondTournament) =>
        (firstTournament.seasonDayNumber ?? firstTournament.dayNumber ?? Number.POSITIVE_INFINITY) -
          (secondTournament.seasonDayNumber ?? secondTournament.dayNumber ?? Number.POSITIVE_INFINITY) ||
        firstTournament.startDate.localeCompare(secondTournament.startDate)
    );

  const seasonTournaments: Tournament[] = [];

  for (const importedTournament of importedBravoTournaments) {
    const dayNumber = importedTournament.dayNumber ?? 0;
    const normalizedTournament: Partial<Tournament> & { title: string } = {
      ...importedTournament,
      title: buildBravoTournamentTitle(dayNumber),
      dayNumber,
      seasonId: BRAVO_SEASON_SLUG,
      seasonTitle: BRAVO_SEASON_SERIES_TITLE,
      seasonNumber: BRAVO_SEASON_NUMBER,
      seasonDayNumber: dayNumber,
    };

    const savedTournament = await saveTournament(normalizedTournament, importedTournament.id);
    seasonTournaments.push(savedTournament);
  }

  for (const existingTournament of carriedForwardSeasonTournaments) {
    const dayNumber = existingTournament.seasonDayNumber ?? existingTournament.dayNumber ?? 0;
    const savedTournament = await saveTournament(
      {
        ...existingTournament,
        title: buildBravoTournamentTitle(dayNumber),
        dayNumber,
        seasonId: BRAVO_SEASON_SLUG,
        seasonTitle: BRAVO_SEASON_SERIES_TITLE,
        seasonNumber: BRAVO_SEASON_NUMBER,
        seasonDayNumber: dayNumber,
        status:
          (existingTournament.matchCount ?? 0) > 0
            ? dayNumber < currentDay
              ? "COMPLETED"
              : "LIVE"
            : existingTournament.status,
        sourceName: existingTournament.sourceName ?? buildBravoTournamentTitle(dayNumber),
        createdAt: existingTournament.createdAt ?? now,
      },
      existingTournament.id
    );
    seasonTournaments.push(savedTournament);
  }

  seasonTournaments.sort(
    (firstTournament, secondTournament) =>
      (firstTournament.seasonDayNumber ?? Number.POSITIVE_INFINITY) -
      (secondTournament.seasonDayNumber ?? Number.POSITIVE_INFINITY)
  );

  const currentSeasonTournament =
    seasonTournaments.find((tournament) => (tournament.seasonDayNumber ?? tournament.dayNumber) === currentDay) ??
    null;

  const savedSeason = await saveSeason(
    {
      title: `${BRAVO_SEASON_SERIES_TITLE} Season ${BRAVO_SEASON_NUMBER}`,
      slug: BRAVO_SEASON_SLUG,
      seriesTitle: BRAVO_SEASON_SERIES_TITLE,
      seasonNumber: BRAVO_SEASON_NUMBER,
      status: "active",
      startDate: BRAVO_SEASON_START_DATE,
      configuredDays,
      currentDay,
      currentTournamentId: currentSeasonTournament?.id,
      description:
        "Daily PUBG PC scrims owned and persisted by Bravo Gaming Esports after importing verified historical day data into Firestore.",
      tournamentIds: seasonTournaments.map((tournament) => tournament.id),
      game: "PUBG PC",
      format: "Squad",
      region: "Global",
      perspective: "TPP",
      sourceProvider: "bravo_feed",
      createdAt: existingSeason?.createdAt ?? now,
    },
    BRAVO_SEASON_SLUG
  );

  const tournamentSnapshots: TournamentSnapshot[] = await Promise.all(
    seasonTournaments.map(async (tournament) => {
      const [matches, standings, teams, players] = await Promise.all([
        getTournamentMatches(tournament.id),
        getTournamentStandings(tournament.id),
        getTournamentTeams(tournament.id),
        getTournamentPlayers(tournament.id),
      ]);

      return { tournament, matches, standings, teams, players };
    })
  );

  const existingSeasonTeams = await queryFirestoreCollection<Team>(COLLECTIONS.teams, "seasonId", BRAVO_SEASON_SLUG, 500);
  const existingSeasonPlayers = await queryFirestoreCollection<Player>(COLLECTIONS.players, "seasonId", BRAVO_SEASON_SLUG, 1000);
  const existingSeasonTeamById = new Map(existingSeasonTeams.filter((team) => team.scope === "season").map((team) => [team.id, team]));
  const existingSeasonPlayerById = new Map(
    existingSeasonPlayers.filter((player) => player.scope === "season").map((player) => [player.id, player])
  );
  const seasonAppearanceMap = buildPlayerAppearanceMapFromMatches(
    tournamentSnapshots.flatMap((snapshot) => snapshot.matches)
  );
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

  for (const snapshot of tournamentSnapshots) {
    const dayNumber = snapshot.tournament.seasonDayNumber ?? snapshot.tournament.dayNumber ?? 0;
    for (const team of snapshot.teams) {
      const sourceTeamName = team.sourceTeamName ?? team.name;
      const seasonTeamId = buildSeasonTeamId(BRAVO_SEASON_SLUG, sourceTeamName);
      const canonicalTeam = resolveBravoTeamIdentity(sourceTeamName);
      const metadata = teamMetadata.get(seasonTeamId) ?? {
        teamName: canonicalTeam?.name ?? sourceTeamName,
        slotNumber: canonicalTeam?.slotNumber,
        dayNumbers: new Set<number>(),
        sourceTeamNames: new Set<string>(),
      };

      metadata.teamName = canonicalTeam?.name ?? metadata.teamName ?? sourceTeamName;
      metadata.slotNumber = metadata.slotNumber ?? team.slotNumber ?? canonicalTeam?.slotNumber;
      metadata.logoUrl = metadata.logoUrl ?? team.logoUrl ?? team.logo;
      metadata.logo = metadata.logo ?? team.logo ?? team.logoUrl;
      metadata.country = metadata.country ?? team.country;
      metadata.dayNumbers.add(dayNumber);
      metadata.sourceTeamNames.add(sourceTeamName);

      teamMetadata.set(seasonTeamId, metadata);

      await saveTeam(
        {
          ...team,
          scope: "tournament",
          seasonId: BRAVO_SEASON_SLUG,
          seasonTitle: BRAVO_SEASON_SERIES_TITLE,
          seasonDayNumbers: Array.from(new Set([...(team.seasonDayNumbers ?? []), dayNumber])).sort(
            (firstDay, secondDay) => firstDay - secondDay
          ),
        },
        team.id
      );
    }

    for (const standing of snapshot.standings) {
      const seasonTeamId = buildSeasonTeamId(BRAVO_SEASON_SLUG, standing.teamName);
      const canonicalTeam = resolveBravoTeamIdentity(standing.teamName);
      const metadata = teamMetadata.get(seasonTeamId) ?? {
        teamName: canonicalTeam?.name ?? standing.teamName,
        slotNumber: canonicalTeam?.slotNumber,
        dayNumbers: new Set<number>(),
        sourceTeamNames: new Set<string>(),
      };

      metadata.dayNumbers.add(dayNumber);
      metadata.sourceTeamNames.add(standing.teamName);
      teamMetadata.set(seasonTeamId, metadata);

      mappedStandings.push({
        ...standing,
        teamId: seasonTeamId,
        slotNumber:
          standing.slotNumber ??
          teamMetadata.get(seasonTeamId)?.slotNumber ??
          resolveBravoTeamIdentity(standing.teamName)?.slotNumber,
        seasonId: BRAVO_SEASON_SLUG,
        seasonTitle: BRAVO_SEASON_SERIES_TITLE,
        seasonDayNumber: dayNumber,
        scope: "tournament",
      });

      await saveFirestoreDocument(COLLECTIONS.standings, standing.id, {
        ...standing,
        teamId: seasonTeamId,
        slotNumber:
          standing.slotNumber ??
          teamMetadata.get(seasonTeamId)?.slotNumber ??
          resolveBravoTeamIdentity(standing.teamName)?.slotNumber,
        seasonId: BRAVO_SEASON_SLUG,
        seasonTitle: BRAVO_SEASON_SERIES_TITLE,
        seasonDayNumber: dayNumber,
        scope: "tournament",
      });
    }

    const tournamentPlayerLookup = new Map(
      snapshot.players.flatMap((player) => {
        const keys = [player.sourcePlayerId, player.pubgId, player.pubgName, player.inGameName, player.name].filter(
          (value): value is string => Boolean(value)
        );
        return keys.map((key) => [key, player] as const);
      })
    );

    for (const match of snapshot.matches) {
      const mvpPlayerKey = getMatchMvpPlayerKey(match);
      if (mvpPlayerKey) {
        seasonMvpCounts.set(mvpPlayerKey, (seasonMvpCounts.get(mvpPlayerKey) ?? 0) + 1);
      }

      for (const playerResult of match.playerResults ?? []) {
        const sourcePlayerKey = playerResult.pubgPlayerId ?? playerResult.playerId ?? playerResult.playerName;
        const relatedPlayer =
          tournamentPlayerLookup.get(sourcePlayerKey) ??
          tournamentPlayerLookup.get(playerResult.playerName) ??
          null;
        const seasonPlayerId = buildSeasonPlayerId(BRAVO_SEASON_SLUG, sourcePlayerKey ?? "", playerResult.playerName);
        const seasonTeamId =
          playerResult.teamName && playerResult.teamName.trim().length > 0
            ? buildSeasonTeamId(BRAVO_SEASON_SLUG, playerResult.teamName)
            : undefined;

        if (playerResult.teamName && seasonTeamId) {
          const canonicalTeam = resolveBravoTeamIdentity(playerResult.teamName);
          const metadata = teamMetadata.get(seasonTeamId) ?? {
            teamName: canonicalTeam?.name ?? playerResult.teamName,
            slotNumber: canonicalTeam?.slotNumber,
            dayNumbers: new Set<number>(),
            sourceTeamNames: new Set<string>(),
          };

          metadata.dayNumbers.add(dayNumber);
          metadata.sourceTeamNames.add(playerResult.teamName);
          teamMetadata.set(seasonTeamId, metadata);
        }

        const aggregate = playerAggregateMap.get(seasonPlayerId) ?? {
          id: seasonPlayerId,
          name: relatedPlayer?.name ?? playerResult.playerName,
          inGameName: relatedPlayer?.inGameName ?? playerResult.playerName,
          teamId: seasonTeamId,
          teamName: playerResult.teamName,
          role: relatedPlayer?.role,
          nationality: relatedPlayer?.nationality,
          avatarUrl:
            existingSeasonPlayerById.get(seasonPlayerId)?.avatarUrl ??
            relatedPlayer?.avatarUrl ??
            relatedPlayer?.avatar,
          avatar:
            existingSeasonPlayerById.get(seasonPlayerId)?.avatar ??
            relatedPlayer?.avatar ??
            relatedPlayer?.avatarUrl,
          pubgId: relatedPlayer?.pubgId ?? sourcePlayerKey,
          pubgName: relatedPlayer?.pubgName ?? playerResult.playerName,
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

        aggregate.role = relatedPlayer?.role ?? aggregate.role;
        aggregate.nationality = relatedPlayer?.nationality ?? aggregate.nationality;
        aggregate.pubgId = relatedPlayer?.pubgId ?? aggregate.pubgId;
        aggregate.pubgName = relatedPlayer?.pubgName ?? aggregate.pubgName;
        aggregate.assists += playerResult.assists;
        aggregate.knocks += playerResult.knocks;
        aggregate.placementPoints += playerResult.placementPoints;
        aggregate.totalPoints += playerResult.totalPoints;
        aggregate.kills += playerResult.kills;
        aggregate.damage += playerResult.damage;
        aggregate.chickenDinners += playerResult.placement === 1 ? 1 : 0;
        aggregate.matches += 1;
        aggregate.bestPlacement = Math.min(aggregate.bestPlacement, playerResult.placement);
        aggregate.dayNumbers.add(dayNumber);

        playerAggregateMap.set(seasonPlayerId, aggregate);
      }
    }

    for (const player of snapshot.players) {
      const seasonTeamId =
        player.teamName && player.teamName.trim().length > 0
          ? buildSeasonTeamId(BRAVO_SEASON_SLUG, player.teamName)
          : undefined;

      await savePlayer(
        {
          ...player,
          teamId: seasonTeamId,
          scope: "tournament",
          seasonId: BRAVO_SEASON_SLUG,
          seasonTitle: BRAVO_SEASON_SERIES_TITLE,
          seasonDayNumbers: Array.from(new Set([...(player.seasonDayNumbers ?? []), dayNumber])).sort(
            (firstDay, secondDay) => firstDay - secondDay
          ),
        },
        player.id
      );
    }
  }

  const leaderboardEntries = buildSeasonLeaderboard(mappedStandings);
  const playerSummaries = Array.from(playerAggregateMap.values())
    .map((playerAggregate) => {
      const preferredTeam = choosePreferredPlayerTeam(
        Array.from(seasonAppearanceMap.get(playerAggregate.sourcePlayerKey)?.values() ?? [])
      );
      const resolvedTeamName = preferredTeam?.teamName ?? playerAggregate.teamName;

      return {
        ...playerAggregate,
        teamId: resolvedTeamName ? buildSeasonTeamId(BRAVO_SEASON_SLUG, resolvedTeamName) : undefined,
        teamName: resolvedTeamName,
        mvpCount: seasonMvpCounts.get(playerAggregate.sourcePlayerKey) ?? 0,
        dayNumbers: Array.from(playerAggregate.dayNumbers).sort((firstDay, secondDay) => firstDay - secondDay),
        bestPlacement: Number.isFinite(playerAggregate.bestPlacement) ? playerAggregate.bestPlacement : undefined,
        averageDamage:
          playerAggregate.matches > 0
            ? Number((playerAggregate.damage / playerAggregate.matches).toFixed(2))
            : undefined,
        rating: playerAggregate.totalPoints,
        winRate:
          playerAggregate.matches > 0
            ? Number((playerAggregate.chickenDinners / playerAggregate.matches).toFixed(4))
            : undefined,
      };
    })
    .sort(
      (firstPlayer, secondPlayer) =>
        comparePlayerLeaderboardPerformance(firstPlayer, secondPlayer)
    );

  const mvpOfWeek = [...playerSummaries].sort((firstPlayer, secondPlayer) =>
    compareMvpRankingPlayers(firstPlayer, secondPlayer)
  )[0];

  const seasonPlayerDocs = playerSummaries.map((playerSummary) =>
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
      seasonId: BRAVO_SEASON_SLUG,
      seasonTitle: BRAVO_SEASON_SERIES_TITLE,
      seasonDayNumbers: playerSummary.dayNumbers,
      sourcePlayerId: playerSummary.pubgId,
      sourceProvider: "bravo_season",
    }) satisfies Partial<Player> & { id: string; name: string }
  );

  const playerIdsByTeamId = new Map<string, string[]>();
  for (const playerDocument of seasonPlayerDocs) {
    if (!playerDocument.teamId) continue;
    const currentPlayerIds = playerIdsByTeamId.get(playerDocument.teamId) ?? [];
    currentPlayerIds.push(playerDocument.id);
    playerIdsByTeamId.set(playerDocument.teamId, currentPlayerIds);
  }

  const leaderboardEntriesByTeamId = new Map(leaderboardEntries.map((entry) => [entry.teamId, entry]));
  const seasonTeamIds = Array.from(
    new Set([
      ...teamMetadata.keys(),
      ...leaderboardEntries.map((entry) => entry.teamId),
      ...playerIdsByTeamId.keys(),
    ])
  );
  const seasonTeamDocs = seasonTeamIds
    .map((teamId) => {
      const metadata = teamMetadata.get(teamId);
      const existingSeasonTeam = existingSeasonTeamById.get(teamId);
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
        seasonId: BRAVO_SEASON_SLUG,
        seasonTitle: BRAVO_SEASON_SERIES_TITLE,
        seasonDayNumbers: leaderboardEntry?.dayNumbers ?? Array.from(metadata?.dayNumbers ?? []).sort((a, b) => a - b),
        sourceTeamName: metadata?.teamName ?? teamName,
        sourceProvider: "bravo_season",
      } satisfies Partial<Team> & { id: string; name: string };
    })
    .sort((firstTeam, secondTeam) => compareSeasonTeamDocs(firstTeam, secondTeam));

  for (const teamDocument of seasonTeamDocs) {
    await saveTeam(teamDocument, teamDocument.id);
  }

  for (const playerDocument of seasonPlayerDocs) {
    await savePlayer(playerDocument, playerDocument.id);
  }

  const seasonStandingDocs = leaderboardEntries.map((entry) => ({
    id: `${BRAVO_SEASON_SLUG}--${slugify(entry.teamName)}`,
    tournamentId: BRAVO_SEASON_SLUG,
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
    seasonId: BRAVO_SEASON_SLUG,
    seasonTitle: BRAVO_SEASON_SERIES_TITLE,
    seasonDayNumber: currentDay,
    scope: "season" as const,
    sourceTournamentTitle: savedSeason.title,
    sourceProvider: "bravo_season",
    createdAt: existingSeason?.createdAt ?? now,
    updatedAt: now,
  }));

  await Promise.all(
    seasonStandingDocs.map((standingDocument) =>
      saveFirestoreDocument(COLLECTIONS.standings, standingDocument.id, standingDocument as unknown as Record<string, unknown>)
    )
  );

  const scrimDocs: Scrim[] = tournamentSnapshots.map((snapshot) => {
    const dayNumber = snapshot.tournament.seasonDayNumber ?? snapshot.tournament.dayNumber ?? 0;
    const scrimId = `${BRAVO_SEASON_SLUG}--day-${dayNumber}`;
    const matchIds = snapshot.matches.map((match) => match.pubgMatchId);
    const scrimStatus =
      snapshot.matches.length > 0
        ? dayNumber < currentDay
          ? "completed"
          : "live"
        : snapshot.tournament.status === "LIVE"
          ? "waiting_for_data"
          : "scheduled";

    return {
      id: scrimId,
      title: buildBravoTournamentTitle(dayNumber),
      date: addDays(BRAVO_SEASON_START_DATE, Math.max(dayNumber - 1, 0)),
      map: snapshot.tournament.mapRotation?.[0] ?? snapshot.matches[0]?.map ?? "Pending",
      lobbyTime: "8:00 PM NPT",
      teamIds: snapshot.teams.map((team) => buildSeasonTeamId(BRAVO_SEASON_SLUG, team.sourceTeamName ?? team.name)),
      pubgMatchId: matchIds[0],
      pubgMatchIds: matchIds,
      status: scrimStatus,
      mapRotation: snapshot.tournament.mapRotation ?? snapshot.matches.map((match) => match.map),
      seasonId: BRAVO_SEASON_SLUG,
      seasonTitle: BRAVO_SEASON_SERIES_TITLE,
      seasonDayNumber: dayNumber,
      tournamentId: snapshot.tournament.id,
      createdAt: now,
      updatedAt: now,
    };
  });

  await Promise.all(
    scrimDocs.map((scrimDocument) =>
      saveFirestoreDocument(COLLECTIONS.scrims, scrimDocument.id, scrimDocument as unknown as Record<string, unknown>)
    )
  );

  for (const snapshot of tournamentSnapshots) {
    const dayNumber = snapshot.tournament.seasonDayNumber ?? snapshot.tournament.dayNumber ?? 0;
    const scrimId = `${BRAVO_SEASON_SLUG}--day-${dayNumber}`;

    await Promise.all(
      snapshot.matches.map((match) =>
        saveTournamentMatch({
          ...match,
          scrimId,
        })
      )
    );
  }

  await deleteMissingSeasonDocuments<Tournament>(
    COLLECTIONS.tournaments,
    BRAVO_SEASON_SLUG,
    new Set(seasonTournaments.map((tournament) => tournament.id))
  );
  await deleteMissingSeasonDocuments<Team>(
    COLLECTIONS.teams,
    BRAVO_SEASON_SLUG,
    new Set(seasonTeamDocs.map((team) => team.id)),
    "season"
  );
  await deleteMissingSeasonDocuments<Player>(
    COLLECTIONS.players,
    BRAVO_SEASON_SLUG,
    new Set(seasonPlayerDocs.map((player) => player.id)),
    "season"
  );
  await deleteMissingSeasonDocuments<TournamentStanding>(
    COLLECTIONS.standings,
    BRAVO_SEASON_SLUG,
    new Set([...mappedStandings.map((standing) => standing.id), ...seasonStandingDocs.map((standing) => standing.id)])
  );
  await deleteMissingSeasonDocuments<Scrim>(COLLECTIONS.scrims, BRAVO_SEASON_SLUG, new Set(scrimDocs.map((scrim) => scrim.id)));

  const existingSiteStats = (await fetchFirestoreCollection<SiteStats>(COLLECTIONS.siteStats, 5)).find(
    (siteStats) => siteStats.id === "main"
  );

  await saveFirestoreDocument(COLLECTIONS.siteStats, "main", {
    ...(existingSiteStats ?? {}),
    currentSeasonId: savedSeason.id,
    currentSeasonTitle: BRAVO_SEASON_SERIES_TITLE,
    currentSeasonStatus: savedSeason.status,
    currentSeasonStart: savedSeason.startDate,
    currentSeasonLength: savedSeason.configuredDays,
    currentDay: savedSeason.currentDay,
  });

  return {
    importedFeedTournaments: importedFeed?.tournaments.length ?? 0,
    season: {
      id: savedSeason.id,
      title: savedSeason.title,
      currentDay: savedSeason.currentDay,
      configuredDays: savedSeason.configuredDays,
      tournamentIds: savedSeason.tournamentIds ?? [],
    },
    totals: {
      tournaments: seasonTournaments.length,
      scrims: scrimDocs.length,
      seasonTeams: seasonTeamDocs.length,
      seasonPlayers: seasonPlayerDocs.length,
      dailyStandings: mappedStandings.length,
      seasonLeaderboard: seasonStandingDocs.length,
      matches: tournamentSnapshots.reduce((totalMatches, snapshot) => totalMatches + snapshot.matches.length, 0),
    },
    placeholders: [],
  };
}

export const BRAVO_DAILY_SCRIMS_SEASON = {
  id: BRAVO_SEASON_SLUG,
  seriesTitle: BRAVO_SEASON_SERIES_TITLE,
  seasonNumber: BRAVO_SEASON_NUMBER,
  startDate: BRAVO_SEASON_START_DATE,
};
