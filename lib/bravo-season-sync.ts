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
import { buildBravoTournamentSlug, buildBravoTournamentTitle } from "./bravo-feed";
import { buildSeasonLeaderboard } from "./season-standings";
import {
  COLLECTIONS,
  deleteFirestoreDocument,
  fetchFirestoreCollection,
  isFirebaseConfigured,
  queryFirestoreCollection,
  saveFirestoreDocument,
} from "./firebase";
import type { Player, Scrim, Season, SiteStats, Team, Tournament, TournamentStanding } from "./types";

const BRAVO_SEASON_SERIES_TITLE = "BRAVO GAMING ESPORTS DAILY PUBG PC SCRIMS";
const BRAVO_SEASON_START_DATE = "2026-06-05";
const BRAVO_SEASON_NUMBER = 1;
const BRAVO_SEASON_SLUG = "bravo-gaming-esports-daily-pubg-pc-scrims-season-1";
const DEFAULT_SEASON_LENGTH = 15;
const DEFAULT_CURRENT_DAY = 5;

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
  return `${seasonId}--${slugify(teamName)}`;
}

function buildSeasonPlayerId(seasonId: string, sourcePlayerId: string, playerName: string) {
  return `${seasonId}--${slugify(sourcePlayerId || playerName)}`;
}

function normalizeTournamentPlaceholderStatus(dayNumber: number, currentDay: number): Tournament["status"] {
  if (dayNumber === currentDay) return "LIVE";
  return "UPCOMING";
}

function normalizeScrimPlaceholderStatus(dayNumber: number, currentDay: number): Scrim["status"] {
  if (dayNumber === currentDay) return "waiting_for_data";
  return "scheduled";
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

  const importedFeed = options?.importFeed === false ? null : await importBravoGamingFeed();
  const existingSeason = await getSeason(BRAVO_SEASON_SLUG);
  const configuredDays = Math.max(
    options?.configuredDays ?? Number(existingSeason?.configuredDays ?? DEFAULT_SEASON_LENGTH),
    options?.currentDay ?? Number(existingSeason?.currentDay ?? DEFAULT_CURRENT_DAY)
  );
  const currentDay = Math.max(1, options?.currentDay ?? existingSeason?.currentDay ?? DEFAULT_CURRENT_DAY);
  const now = new Date().toISOString();

  const tournaments = await getTournaments();
  const importedBravoTournaments = tournaments
    .filter((tournament) => tournament.sourceProvider === "bravo_feed" && typeof tournament.dayNumber === "number")
    .sort((firstTournament, secondTournament) => (firstTournament.dayNumber ?? 0) - (secondTournament.dayNumber ?? 0));

  const tournamentByDay = new Map(importedBravoTournaments.map((tournament) => [tournament.dayNumber ?? 0, tournament]));
  const maxImportedDay = Math.max(...importedBravoTournaments.map((tournament) => tournament.dayNumber ?? 0), 0);

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

  for (let dayNumber = maxImportedDay + 1; dayNumber <= currentDay; dayNumber += 1) {
    const tournamentId = buildBravoTournamentSlug(dayNumber);
    const placeholderTournament: Partial<Tournament> & { title: string } = {
      title: buildBravoTournamentTitle(dayNumber),
      tier: "C-TIER",
      status: normalizeTournamentPlaceholderStatus(dayNumber, currentDay),
      prizePool: "$0",
      teamCount: 0,
      maxTeams: 32,
      startDate: addDays(BRAVO_SEASON_START_DATE, dayNumber - 1),
      endDate: addDays(BRAVO_SEASON_START_DATE, dayNumber - 1),
      format: "Squad",
      mode: "PUBG PC",
      server: "Global",
      perspective: "TPP",
      description:
        dayNumber === currentDay
          ? "Current Bravo daily scrim day is active on our platform. Official match results are still pending import."
          : "Historical Bravo daily scrim record placeholder awaiting a verified internal import.",
      registeredTeamIds: [],
      dayNumber,
      matchCount: 0,
      seasonId: BRAVO_SEASON_SLUG,
      seasonTitle: BRAVO_SEASON_SERIES_TITLE,
      seasonNumber: BRAVO_SEASON_NUMBER,
      seasonDayNumber: dayNumber,
      sourceName: buildBravoTournamentTitle(dayNumber),
      sourceStatus: dayNumber === currentDay ? "pending" : "scheduled",
      sourceProvider: "bravo_season",
      createdAt: now,
    };

    const savedTournament = await saveTournament(placeholderTournament, tournamentId);
    seasonTournaments.push(savedTournament);
  }

  seasonTournaments.sort(
    (firstTournament, secondTournament) =>
      (firstTournament.seasonDayNumber ?? Number.POSITIVE_INFINITY) -
      (secondTournament.seasonDayNumber ?? Number.POSITIVE_INFINITY)
  );

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
      currentTournamentId: buildBravoTournamentSlug(currentDay),
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
      latestDay: number;
    }
  >();

  for (const snapshot of tournamentSnapshots) {
    const dayNumber = snapshot.tournament.seasonDayNumber ?? snapshot.tournament.dayNumber ?? 0;
    const standingByTeamName = new Map(snapshot.standings.map((standing) => [standing.teamName, standing]));

    for (const team of snapshot.teams) {
      const sourceTeamName = team.sourceTeamName ?? team.name;
      const seasonTeamId = buildSeasonTeamId(BRAVO_SEASON_SLUG, sourceTeamName);
      const metadata = teamMetadata.get(seasonTeamId) ?? {
        teamName: sourceTeamName,
        dayNumbers: new Set<number>(),
        sourceTeamNames: new Set<string>(),
      };

      metadata.slotNumber = metadata.slotNumber ?? team.slotNumber;
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
      mappedStandings.push({
        ...standing,
        teamId: seasonTeamId,
        seasonId: BRAVO_SEASON_SLUG,
        seasonTitle: BRAVO_SEASON_SERIES_TITLE,
        seasonDayNumber: dayNumber,
        scope: "tournament",
      });

      await saveFirestoreDocument(COLLECTIONS.standings, standing.id, {
        ...standing,
        teamId: seasonTeamId,
        seasonId: BRAVO_SEASON_SLUG,
        seasonTitle: BRAVO_SEASON_SERIES_TITLE,
        seasonDayNumber: dayNumber,
        scope: "tournament",
      });
    }

    for (const player of snapshot.players) {
      const seasonTeamId =
        player.teamName && player.teamName.trim().length > 0
          ? buildSeasonTeamId(BRAVO_SEASON_SLUG, player.teamName)
          : undefined;
      const sourcePlayerKey = player.sourcePlayerId ?? player.pubgId ?? player.pubgName ?? player.inGameName ?? player.name;
      const seasonPlayerId = buildSeasonPlayerId(BRAVO_SEASON_SLUG, sourcePlayerKey ?? "", player.name);
      const relatedStanding = player.teamName ? standingByTeamName.get(player.teamName) : undefined;
      const aggregate = playerAggregateMap.get(seasonPlayerId) ?? {
        id: seasonPlayerId,
        name: player.name,
        inGameName: player.inGameName ?? player.name,
        teamId: seasonTeamId,
        teamName: player.teamName,
        role: player.role,
        nationality: player.nationality,
        avatarUrl: existingSeasonPlayerById.get(seasonPlayerId)?.avatarUrl ?? player.avatarUrl ?? player.avatar,
        avatar: existingSeasonPlayerById.get(seasonPlayerId)?.avatar ?? player.avatar ?? player.avatarUrl,
        pubgId: player.pubgId,
        pubgName: player.pubgName ?? player.inGameName ?? player.name,
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
        latestDay: dayNumber,
      };

      if (dayNumber >= aggregate.latestDay) {
        aggregate.teamId = seasonTeamId;
        aggregate.teamName = player.teamName;
        aggregate.role = player.role ?? aggregate.role;
        aggregate.nationality = player.nationality ?? aggregate.nationality;
        aggregate.pubgId = player.pubgId ?? aggregate.pubgId;
        aggregate.pubgName = player.pubgName ?? aggregate.pubgName;
        aggregate.latestDay = dayNumber;
      }

      aggregate.assists += player.assists ?? 0;
      aggregate.knocks += player.knocks ?? 0;
      aggregate.placementPoints += player.placementPoints ?? 0;
      aggregate.totalPoints += player.totalPoints ?? player.rating ?? 0;
      aggregate.kills += player.kills;
      aggregate.damage += player.damage;
      aggregate.mvpCount += player.mvpCount;
      aggregate.chickenDinners += relatedStanding?.wins ?? 0;
      aggregate.matches += player.matches;
      aggregate.bestPlacement = Math.min(aggregate.bestPlacement, player.bestPlacement ?? Number.POSITIVE_INFINITY);
      aggregate.dayNumbers.add(dayNumber);

      playerAggregateMap.set(seasonPlayerId, aggregate);

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
    .map((playerAggregate) => ({
      ...playerAggregate,
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
    }))
    .sort(
      (firstPlayer, secondPlayer) =>
        secondPlayer.totalPoints - firstPlayer.totalPoints ||
        secondPlayer.kills - firstPlayer.kills ||
        firstPlayer.name.localeCompare(secondPlayer.name)
    );

  const seasonPlayerDocs = playerSummaries.map((playerSummary, index) =>
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
      isMvpOfWeek: index === 0,
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

  const seasonTeamDocs = leaderboardEntries.map((entry) => {
    const metadata = teamMetadata.get(entry.teamId);
    const existingSeasonTeam = existingSeasonTeamById.get(entry.teamId);

    return {
      id: entry.teamId,
      name: entry.teamName,
      tag: existingSeasonTeam?.tag ?? `S${BRAVO_SEASON_NUMBER}`,
      slotNumber: metadata?.slotNumber,
      logoUrl: existingSeasonTeam?.logoUrl ?? metadata?.logoUrl ?? metadata?.logo,
      logo: existingSeasonTeam?.logo ?? metadata?.logo ?? metadata?.logoUrl,
      country: existingSeasonTeam?.country ?? metadata?.country,
      rank: entry.rank,
      totalPoints: entry.totalPoints,
      kills: entry.kills,
      matches: entry.matches,
      killPoints: entry.killPoints,
      placementPoints: entry.placementPoints,
      averagePlacement: entry.averagePlacement,
      chickenDinners: entry.chickenDinners,
      status: existingSeasonTeam?.status ?? "active",
      registrationStatus: existingSeasonTeam?.registrationStatus ?? "approved",
      playerIds: playerIdsByTeamId.get(entry.teamId) ?? [],
      captainName: existingSeasonTeam?.captainName,
      captainDiscord: existingSeasonTeam?.captainDiscord,
      captainPhone: existingSeasonTeam?.captainPhone,
      captainEmail: existingSeasonTeam?.captainEmail,
      scope: "season" as const,
      seasonId: BRAVO_SEASON_SLUG,
      seasonTitle: BRAVO_SEASON_SERIES_TITLE,
      seasonDayNumbers: entry.dayNumbers,
      sourceTeamName: metadata?.teamName ?? entry.teamName,
      sourceProvider: "bravo_season",
    } satisfies Partial<Team> & { id: string; name: string };
  });

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
        : normalizeScrimPlaceholderStatus(dayNumber, currentDay);

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
      announcement:
        snapshot.matches.length === 0
          ? "Official results are not available in the source feed yet. This day has been created in Firestore as a persistent placeholder."
          : undefined,
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
    placeholders: seasonTournaments
      .filter((tournament) => tournament.sourceProvider === "bravo_season")
      .map((tournament) => ({
        id: tournament.id,
        title: tournament.title,
        seasonDayNumber: tournament.seasonDayNumber,
        status: tournament.status,
      })),
  };
}

export const BRAVO_DAILY_SCRIMS_SEASON = {
  id: BRAVO_SEASON_SLUG,
  seriesTitle: BRAVO_SEASON_SERIES_TITLE,
  seasonNumber: BRAVO_SEASON_NUMBER,
  startDate: BRAVO_SEASON_START_DATE,
};
