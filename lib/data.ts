import {
  COLLECTIONS,
  createFirestoreDocument,
  deleteFirestoreDocument,
  fetchFirestoreCollection,
  getFirestoreDocument,
  isFirebaseConfigured,
  queryFirestoreCollection,
  saveFirestoreDocument,
} from "./firebase";
import {
  seedAnnouncements,
  seedPlayers,
  seedSponsors,
  seedStats,
  seedStreams,
  seedTeams,
  seedTournaments,
  seedVideos,
} from "./seed-data";
import { buildFallbackTeamNameFromSlot, canonicalizeBravoTeamName, compareBravoTeamSlotOrder, parseBravoSlotNumber, resolveBravoTeamIdentity } from "./bravo-teams";
import {
  compareMatchSequenceOrder,
  comparePlayerLeaderboardPerformance,
  compareTeamLeaderboardPerformance,
  sortMvpRanking,
  sortTournamentStandings,
} from "./ranking-sort";
import { buildSeasonLeaderboard, seasonLeaderboardToRows } from "./season-standings";
import type {
  Announcement,
  LeaderboardRow,
  MatchPlayerRecord,
  Player,
  Scrim,
  ScrimDayResult,
  ScrimDayStanding,
  Season,
  SiteStats,
  SponsorItem,
  StreamSchedule,
  Team,
  TeamRegistration,
  Tournament,
  TournamentMatch,
  TournamentStanding,
  VideoItem,
} from "./types";

const DEFAULT_YOUTUBE_HANDLE = "bravogamingnepal7981";
const DEFAULT_YOUTUBE_CHANNEL_URL = "https://www.youtube.com/@bravogamingnepal7981";
const DEFAULT_YOUTUBE_CHANNEL_ID = "UCiQ0gllz6KLTRs-6ma4Fhjw";

const kathmanduDateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Kathmandu",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const kathmanduDayFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: "Asia/Kathmandu",
  weekday: "short",
  month: "short",
  day: "numeric",
  year: "numeric",
});

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function cleanString(value?: string | null) {
  const normalizedValue = value?.trim();
  return normalizedValue ? normalizedValue : undefined;
}

function cleanStringArray(values?: string[] | null) {
  if (!values?.length) return undefined;

  const normalizedValues = Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
  return normalizedValues.length > 0 ? normalizedValues : undefined;
}

function toNumber(value: number | undefined, fallback = 0) {
  return Number.isFinite(value) ? Number(value) : fallback;
}

function toOptionalNumber(value: number | undefined) {
  return Number.isFinite(value) ? Number(value) : undefined;
}

function compareIsoDateDesc(firstValue?: string, secondValue?: string) {
  return (secondValue ?? "").localeCompare(firstValue ?? "");
}

function normalizeSeasonPayload(data: Partial<Season> & { title: string; slug?: string }) {
  return {
    title: data.title.trim(),
    slug: cleanString(data.slug) ?? slugify(data.title),
    seriesTitle: cleanString(data.seriesTitle) ?? data.title.trim(),
    seasonNumber: Math.max(1, toNumber(data.seasonNumber, 1)),
    status: data.status ?? "planned",
    startDate: cleanString(data.startDate) ?? new Date().toISOString().slice(0, 10),
    configuredDays: Math.max(1, toNumber(data.configuredDays, 15)),
    currentDay: Math.max(0, toNumber(data.currentDay, 0)),
    currentTournamentId: cleanString(data.currentTournamentId),
    endDate: cleanString(data.endDate),
    completedAt: cleanString(data.completedAt),
    archivedAt: cleanString(data.archivedAt),
    endedEarly: Boolean(data.endedEarly),
    notes: cleanString(data.notes),
    description: cleanString(data.description),
    tournamentIds: cleanStringArray(data.tournamentIds),
    game: cleanString(data.game) ?? "PUBG PC",
    format: cleanString(data.format) ?? "Squad",
    region: cleanString(data.region) ?? "Global",
    perspective: cleanString(data.perspective) ?? "TPP",
    sourceProvider: cleanString(data.sourceProvider),
    createdAt: cleanString(data.createdAt),
  } satisfies Partial<Season> & { title: string; slug: string };
}

function normalizeTournamentPayload(data: Partial<Tournament> & { title: string }) {
  const registeredTeamIds = cleanStringArray(data.registeredTeamIds) ?? [];

  return {
    title: data.title.trim(),
    tier: cleanString(data.tier) ?? "OPEN",
    status: data.status ?? "UPCOMING",
    prizePool: cleanString(data.prizePool) ?? "TBD",
    teamCount: Math.max(toNumber(data.teamCount, registeredTeamIds.length), registeredTeamIds.length),
    maxTeams: Math.max(1, toNumber(data.maxTeams, 32)),
    startDate: cleanString(data.startDate) ?? new Date().toISOString().slice(0, 10),
    endDate: cleanString(data.endDate),
    format: cleanString(data.format) ?? "TPP Squad",
    mode: cleanString(data.mode) ?? "PUBG PC",
    server: cleanString(data.server) ?? "Asia",
    perspective: cleanString(data.perspective),
    description: cleanString(data.description),
    rules: cleanString(data.rules),
    schedule: cleanString(data.schedule),
    mapRotation: cleanStringArray(data.mapRotation),
    bannerUrl: cleanString(data.bannerUrl),
    registeredTeamIds,
    seasonId: cleanString(data.seasonId),
    seasonTitle: cleanString(data.seasonTitle),
    seasonNumber: toOptionalNumber(data.seasonNumber),
    seasonDayNumber: toOptionalNumber(data.seasonDayNumber),
    dayNumber: toOptionalNumber(data.dayNumber),
    matchCount: toOptionalNumber(data.matchCount),
    sourceId: cleanString(data.sourceId),
    sourceName: cleanString(data.sourceName),
    sourceStatus: cleanString(data.sourceStatus),
    sourceUrl: cleanString(data.sourceUrl),
    sourceProvider: cleanString(data.sourceProvider),
    createdAt: cleanString(data.createdAt),
  } satisfies Partial<Tournament> & { title: string };
}

function normalizeTeamPayload(data: Partial<Team> & { name: string }) {
  const canonicalLogo = cleanString(data.logoUrl ?? data.logo);
  const resolvedTeam = resolveBravoTeamIdentity(data.name);
  const inferredSlotNumber = resolvedTeam?.slotNumber ?? parseBravoSlotNumber(data.name) ?? toOptionalNumber(data.slotNumber);
  const normalizedName =
    resolvedTeam?.name ??
    buildFallbackTeamNameFromSlot(inferredSlotNumber) ??
    data.name.trim();

  return {
    name: normalizedName,
    tag: resolvedTeam?.tag ?? cleanString(data.tag),
    slotNumber: inferredSlotNumber,
    logo: canonicalLogo,
    logoUrl: canonicalLogo,
    country: cleanString(data.country),
    rank: toOptionalNumber(data.rank),
    totalPoints: toNumber(data.totalPoints),
    kills: toNumber(data.kills),
    matches: toNumber(data.matches),
    killPoints: toOptionalNumber(data.killPoints),
    placementPoints: toOptionalNumber(data.placementPoints),
    averagePlacement: toOptionalNumber(data.averagePlacement),
    chickenDinners: toOptionalNumber(data.chickenDinners),
    status: data.status ?? "active",
    registrationStatus: data.registrationStatus ?? "approved",
    playerIds: cleanStringArray(data.playerIds),
    captainName: cleanString(data.captainName),
    captainDiscord: cleanString(data.captainDiscord),
    captainPhone: cleanString(data.captainPhone),
    captainEmail: cleanString(data.captainEmail),
    scope: data.scope,
    seasonId: cleanString(data.seasonId),
    seasonTitle: cleanString(data.seasonTitle),
    seasonDayNumbers: Array.isArray(data.seasonDayNumbers)
      ? data.seasonDayNumbers.filter((value): value is number => Number.isFinite(value))
      : undefined,
    sourceTournamentId: cleanString(data.sourceTournamentId),
    sourceTournamentTitle: cleanString(data.sourceTournamentTitle),
    sourceTeamName: cleanString(data.sourceTeamName),
    sourceProvider: cleanString(data.sourceProvider),
    createdAt: cleanString(data.createdAt),
  } satisfies Partial<Team> & { name: string };
}

function normalizeStoredTeam(team: Team): Team {
  const resolvedTeam = resolveBravoTeamIdentity(team.name ?? team.id ?? team.sourceTeamName);
  const inferredSlotNumber =
    resolvedTeam?.slotNumber ?? team.slotNumber ?? parseBravoSlotNumber(team.name) ?? parseBravoSlotNumber(team.sourceTeamName);

  return {
    ...team,
    name: resolvedTeam?.name ?? buildFallbackTeamNameFromSlot(inferredSlotNumber) ?? team.name,
    tag: resolvedTeam?.tag ?? team.tag,
    slotNumber: inferredSlotNumber,
  };
}

function normalizeStoredMatchPlayers(matchPlayers: MatchPlayerRecord[]) {
  return matchPlayers.map((matchPlayer) => {
    const resolvedTeam = resolveBravoTeamIdentity(matchPlayer.teamName);
    const inferredSlotNumber =
      resolvedTeam?.slotNumber ?? matchPlayer.slotNumber ?? parseBravoSlotNumber(matchPlayer.teamName);

    return {
      ...matchPlayer,
      teamId: resolvedTeam?.id ?? matchPlayer.teamId,
      teamName: resolvedTeam?.name ?? buildFallbackTeamNameFromSlot(inferredSlotNumber) ?? matchPlayer.teamName,
      slotNumber: inferredSlotNumber,
    };
  });
}

function normalizeStoredTournamentMatch(match: TournamentMatch): TournamentMatch {
  return {
    ...match,
    winner: canonicalizeBravoTeamName(match.winner),
    teamResults: (match.teamResults ?? []).map((teamResult) => {
      const resolvedTeam = resolveBravoTeamIdentity(teamResult.teamName);
      const inferredSlotNumber =
        resolvedTeam?.slotNumber ?? teamResult.slotNumber ?? parseBravoSlotNumber(teamResult.teamName);

      return {
        ...teamResult,
        teamId: resolvedTeam?.id ?? teamResult.teamId,
        teamName: resolvedTeam?.name ?? buildFallbackTeamNameFromSlot(inferredSlotNumber) ?? teamResult.teamName,
        slotNumber: inferredSlotNumber,
      };
    }),
    playerResults: (match.playerResults ?? []).map((playerResult) => {
      const resolvedTeam = resolveBravoTeamIdentity(playerResult.teamName);
      const inferredSlotNumber =
        resolvedTeam?.slotNumber ?? playerResult.slotNumber ?? parseBravoSlotNumber(playerResult.teamName);

      return {
        ...playerResult,
        teamId: resolvedTeam?.id ?? playerResult.teamId,
        teamName:
          resolvedTeam?.name ?? buildFallbackTeamNameFromSlot(inferredSlotNumber) ?? playerResult.teamName,
        slotNumber: inferredSlotNumber,
      };
    }),
  };
}

function normalizePlayerPayload(data: Partial<Player> & { name: string }) {
  const canonicalName = (cleanString(data.name) ?? cleanString(data.inGameName) ?? "Unknown").trim();
  const canonicalAvatar = cleanString(data.avatarUrl ?? data.avatar);

  return {
    name: canonicalName,
    realName: cleanString(data.realName),
    inGameName: cleanString(data.inGameName) ?? canonicalName,
    teamId: cleanString(data.teamId),
    teamName: cleanString(data.teamName),
    avatar: canonicalAvatar,
    avatarUrl: canonicalAvatar,
    pubgId: cleanString(data.pubgId),
    pubgName: cleanString(data.pubgName) ?? canonicalName,
    role: data.role,
    discord: cleanString(data.discord),
    phone: cleanString(data.phone),
    email: cleanString(data.email),
    nationality: cleanString(data.nationality),
    playerStatus: data.playerStatus ?? "active",
    assists: toOptionalNumber(data.assists),
    knocks: toOptionalNumber(data.knocks),
    placementPoints: toOptionalNumber(data.placementPoints),
    totalPoints: toOptionalNumber(data.totalPoints),
    averageDamage: toOptionalNumber(data.averageDamage),
    bestPlacement: toOptionalNumber(data.bestPlacement),
    kills: toNumber(data.kills),
    damage: toNumber(data.damage),
    mvpCount: toNumber(data.mvpCount),
    chickenDinners: toNumber(data.chickenDinners),
    matches: toNumber(data.matches),
    rating: toOptionalNumber(data.rating),
    winRate: toOptionalNumber(data.winRate),
    isMvpOfWeek: Boolean(data.isMvpOfWeek),
    scope: data.scope,
    seasonId: cleanString(data.seasonId),
    seasonTitle: cleanString(data.seasonTitle),
    seasonDayNumbers: Array.isArray(data.seasonDayNumbers)
      ? data.seasonDayNumbers.filter((value): value is number => Number.isFinite(value))
      : undefined,
    sourceTournamentId: cleanString(data.sourceTournamentId),
    sourceTournamentTitle: cleanString(data.sourceTournamentTitle),
    sourcePlayerId: cleanString(data.sourcePlayerId),
    sourceProvider: cleanString(data.sourceProvider),
    createdAt: cleanString(data.createdAt),
  } satisfies Partial<Player> & { name: string };
}

function normalizeAnnouncementPayload(data: Partial<Announcement> & { title: string; detail: string }) {
  return {
    title: data.title.trim(),
    detail: data.detail.trim(),
    date:
      cleanString(data.date) ??
      new Date().toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }).toUpperCase(),
    category: cleanString(data.category),
    published: data.published !== false,
  } satisfies Partial<Announcement> & { title: string; detail: string };
}

function toKathmanduDateKey(value?: string) {
  if (!value) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;

  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) return null;

  const dateParts = kathmanduDateFormatter.formatToParts(parsedDate);
  const year = dateParts.find((part) => part.type === "year")?.value;
  const month = dateParts.find((part) => part.type === "month")?.value;
  const day = dateParts.find((part) => part.type === "day")?.value;

  if (!year || !month || !day) return null;
  return `${year}-${month}-${day}`;
}

function formatKathmanduDate(value: string) {
  const parsedDate = new Date(`${value}T00:00:00+05:45`);
  if (Number.isNaN(parsedDate.getTime())) return value;
  return kathmanduDayFormatter.format(parsedDate);
}

function getScrimLinkedMatchIds(scrim: Pick<Scrim, "pubgMatchId" | "pubgMatchIds">) {
  return Array.from(
    new Set([...(scrim.pubgMatchIds ?? []), scrim.pubgMatchId].filter((matchId): matchId is string => Boolean(matchId)))
  );
}

function buildScrimDayStatus(scrims: Scrim[]): ScrimDayResult["status"] {
  const uniqueStatuses = Array.from(new Set(scrims.map((scrim) => scrim.status)));

  if (uniqueStatuses.length === 1) {
    return uniqueStatuses[0] ?? "scheduled";
  }

  if (uniqueStatuses.includes("live")) return "live";
  if (uniqueStatuses.includes("waiting_for_data")) return "waiting_for_data";
  return "mixed";
}

function resolveScrimDayNumber(scrims: Scrim[], fallbackDayNumber: number) {
  const explicitDayNumbers = scrims
    .map((scrim) => scrim.seasonDayNumber)
    .filter((dayNumber): dayNumber is number => Number.isFinite(dayNumber));

  if (explicitDayNumbers.length === 0) {
    return fallbackDayNumber;
  }

  return Math.max(...explicitDayNumbers);
}

function aggregateScrimDayLeaderboard(matches: TournamentMatch[]): ScrimDayStanding[] {
  const standingsMap = new Map<
    string,
    ScrimDayStanding & {
      placementTotal: number;
      latestPlayedAt?: string;
      sequenceNumber?: number;
    }
  >();

  for (const match of matches) {
    for (const teamResult of match.teamResults ?? []) {
      const teamKey = teamResult.teamId ?? teamResult.teamName.toLowerCase();
      const currentStanding = standingsMap.get(teamKey) ?? {
        teamId: teamResult.teamId,
        teamName: teamResult.teamName,
        slotNumber: teamResult.slotNumber ?? resolveBravoTeamIdentity(teamResult.teamName)?.slotNumber,
        matches: 0,
        wins: 0,
        kills: 0,
        killPoints: 0,
        placementPoints: 0,
        totalPoints: 0,
        bestPlacement: Number.POSITIVE_INFINITY,
        averagePlacement: 0,
        placementTotal: 0,
        latestPlayedAt: match.playedAt,
        sequenceNumber: match.sequenceNumber,
      };

      currentStanding.matches += 1;
      currentStanding.wins += teamResult.placement === 1 ? 1 : 0;
      currentStanding.kills += teamResult.kills;
      currentStanding.killPoints += teamResult.killPoints ?? teamResult.kills;
      currentStanding.placementPoints += teamResult.placementPoints ?? 0;
      currentStanding.totalPoints += teamResult.totalPoints;
      currentStanding.bestPlacement = Math.min(currentStanding.bestPlacement, teamResult.placement);
      currentStanding.placementTotal += teamResult.placement;
      if ((match.playedAt ?? "").localeCompare(currentStanding.latestPlayedAt ?? "") >= 0) {
        currentStanding.latestPlayedAt = match.playedAt;
      }
      if ((match.sequenceNumber ?? Number.NEGATIVE_INFINITY) >= (currentStanding.sequenceNumber ?? Number.NEGATIVE_INFINITY)) {
        currentStanding.sequenceNumber = match.sequenceNumber;
      }

      standingsMap.set(teamKey, currentStanding);
    }
  }

  return Array.from(standingsMap.values())
    .map(({ placementTotal, ...standing }) => ({
      ...standing,
      averagePlacement: Number((placementTotal / standing.matches).toFixed(2)),
    }))
    .sort((firstStanding, secondStanding) => compareTeamLeaderboardPerformance(firstStanding, secondStanding));
}

async function fromFirestoreOrSeed<T>(
  collection: string,
  seed: T[],
  sortFn?: (a: T & { id: string }, b: T & { id: string }) => number,
  limit = 100
): Promise<(T & { id: string })[]> {
  if (!isFirebaseConfigured()) return seed as (T & { id: string })[];
  try {
    const docs = await fetchFirestoreCollection<T>(collection, limit);
    if (docs.length === 0) return seed as (T & { id: string })[];
    return sortFn ? [...docs].sort(sortFn) : docs;
  } catch {
    return seed as (T & { id: string })[];
  }
}

async function oneFromFirestoreOrSeed<T extends { id: string }>(collection: string, id: string, seed: T[]): Promise<T | null> {
  if (!isFirebaseConfigured()) return seed.find((item) => item.id === id) ?? null;
  try {
    const doc = await getFirestoreDocument<T>(collection, id);
    if (doc) return doc;
    return seed.find((item) => item.id === id) ?? null;
  } catch {
    return seed.find((item) => item.id === id) ?? null;
  }
}

export async function getSiteStats(): Promise<SiteStats> {
  if (!isFirebaseConfigured()) return seedStats;
  try {
    const doc = await getFirestoreDocument<SiteStats>(COLLECTIONS.siteStats, "main");
    const mergedStats = { ...seedStats, ...(doc ?? {}) };
    const currentSeason = await getCurrentSeason();

    if (!currentSeason) {
      return mergedStats;
    }

    return {
      ...mergedStats,
      currentSeasonId: currentSeason.id,
      currentSeasonTitle: currentSeason.seriesTitle ?? currentSeason.title,
      currentSeasonStatus: currentSeason.status,
      currentSeasonStart: currentSeason.startDate,
      currentSeasonLength: currentSeason.configuredDays,
      currentDay: currentSeason.currentDay,
    };
  } catch {
    return seedStats;
  }
}

export async function getSeasons(): Promise<Season[]> {
  return fromFirestoreOrSeed<Season>(COLLECTIONS.seasons, [], (a, b) => {
    const dateComparison = compareIsoDateDesc(a.startDate, b.startDate);
    if (dateComparison !== 0) return dateComparison;
    return (b.seasonNumber ?? 0) - (a.seasonNumber ?? 0);
  });
}

export async function getSeason(id: string): Promise<Season | null> {
  return oneFromFirestoreOrSeed(COLLECTIONS.seasons, id, []);
}

export async function getCurrentSeason(): Promise<Season | null> {
  const seasons = await getSeasons();
  return (
    seasons.find((season) => season.status === "active") ??
    seasons.find((season) => season.status === "planned") ??
    seasons[0] ??
    null
  );
}

export async function saveSeason(data: Partial<Season> & { title: string }, id?: string) {
  const payload = normalizeSeasonPayload(data);
  const docId = id ?? payload.slug;
  if (isFirebaseConfigured()) {
    await saveFirestoreDocument(COLLECTIONS.seasons, docId, payload as Record<string, unknown>);
  }
  return { id: docId, ...payload };
}

export async function deleteSeason(id: string) {
  if (isFirebaseConfigured()) {
    await deleteFirestoreDocument(COLLECTIONS.seasons, id);
  }
  return { id, deleted: true };
}

export async function getSeasonTournaments(seasonId: string): Promise<Tournament[]> {
  if (!isFirebaseConfigured()) return [];
  try {
    const tournaments = await queryFirestoreCollection<Tournament>(COLLECTIONS.tournaments, "seasonId", seasonId, 200);
    return tournaments.sort(
      (firstTournament, secondTournament) =>
        (firstTournament.seasonDayNumber ?? Number.POSITIVE_INFINITY) -
          (secondTournament.seasonDayNumber ?? Number.POSITIVE_INFINITY) ||
        firstTournament.startDate.localeCompare(secondTournament.startDate)
    );
  } catch {
    return [];
  }
}

export async function getSeasonStandings(seasonId: string): Promise<TournamentStanding[]> {
  if (!isFirebaseConfigured()) return [];
  try {
    const standings = await queryFirestoreCollection<TournamentStanding>(COLLECTIONS.standings, "seasonId", seasonId, 500);
    return standings
      .filter((standing) => standing.scope !== "season")
      .map((standing) => ({
        ...standing,
        teamName: canonicalizeBravoTeamName(standing.teamName),
        slotNumber: standing.slotNumber ?? resolveBravoTeamIdentity(standing.teamName)?.slotNumber,
      }));
  } catch {
    return [];
  }
}

export async function getSeasonLeaderboard(seasonId: string): Promise<LeaderboardRow[]> {
  const [standings, teams] = await Promise.all([getSeasonStandings(seasonId), getTeams()]);
  const seasonTeams = teams.filter((team) => team.seasonId === seasonId && team.scope !== "tournament");
  const teamsById = new Map(seasonTeams.map((team) => [team.id, team]));
  const builtEntries = buildSeasonLeaderboard(standings, teamsById);
  const entryByTeamId = new Set(builtEntries.map((entry) => entry.teamId));

  const paddedEntries = [
    ...builtEntries,
    ...seasonTeams
      .filter((team) => !entryByTeamId.has(team.id))
      .map((team) => ({
        teamId: team.id,
        teamName: team.name,
        matches: team.matches ?? 0,
        kills: team.kills ?? 0,
        killPoints: team.killPoints ?? 0,
        placementPoints: team.placementPoints ?? 0,
        totalPoints: team.totalPoints ?? 0,
        averagePlacement: team.averagePlacement ?? 0,
        chickenDinners: team.chickenDinners ?? 0,
        bestPlacement: 0,
        dayNumbers: team.seasonDayNumbers ?? [],
        latestDayNumber: Math.max(...(team.seasonDayNumbers ?? [0])),
        rank: 0,
        slotNumber: team.slotNumber,
        logoUrl: team.logoUrl ?? team.logo,
      })),
  ]
    .sort(
      (firstEntry, secondEntry) => compareTeamLeaderboardPerformance(firstEntry, secondEntry)
    )
    .map((entry, index) => ({ ...entry, rank: index + 1 }));

  return seasonLeaderboardToRows(paddedEntries);
}

export async function getSeasonTeams(seasonId: string): Promise<Team[]> {
  if (!isFirebaseConfigured()) return [];
  try {
    const teams = await queryFirestoreCollection<Team>(COLLECTIONS.teams, "seasonId", seasonId, 500);
    return teams
      .filter((team) => team.scope === "season")
      .map(normalizeStoredTeam)
      .sort((firstTeam, secondTeam) => compareBravoTeamSlotOrder(firstTeam, secondTeam));
  } catch {
    return [];
  }
}

export async function getSeasonPlayers(seasonId: string): Promise<Player[]> {
  if (!isFirebaseConfigured()) return [];
  try {
    const players = await queryFirestoreCollection<Player>(COLLECTIONS.players, "seasonId", seasonId, 1500);
    return players
      .filter((player) => player.scope === "season")
      .sort((firstPlayer, secondPlayer) => comparePlayerLeaderboardPerformance(firstPlayer, secondPlayer));
  } catch {
    return [];
  }
}

export async function getCurrentSeasonOverview() {
  const currentSeason = await getCurrentSeason();
  if (!currentSeason) return null;

  const [seasonTournaments, seasonLeaderboard, seasonTeams, seasonPlayers] = await Promise.all([
    getSeasonTournaments(currentSeason.id),
    getSeasonLeaderboard(currentSeason.id),
    getSeasonTeams(currentSeason.id),
    getSeasonPlayers(currentSeason.id),
  ]);

  const orderedTournaments = [...seasonTournaments].sort(
    (firstTournament, secondTournament) =>
      (firstTournament.seasonDayNumber ?? Number.POSITIVE_INFINITY) -
        (secondTournament.seasonDayNumber ?? Number.POSITIVE_INFINITY) ||
      firstTournament.startDate.localeCompare(secondTournament.startDate)
  );
  const currentTournament =
    orderedTournaments.find((tournament) => tournament.id === currentSeason.currentTournamentId) ??
    orderedTournaments.find((tournament) => tournament.seasonDayNumber === currentSeason.currentDay) ??
    null;
  const matchesPlayed = orderedTournaments.reduce(
    (totalMatches, tournament) => totalMatches + (tournament.matchCount ?? 0),
    0
  );
  const completedDays = orderedTournaments.filter((tournament) => (tournament.matchCount ?? 0) > 0).length;

  return {
    season: currentSeason,
    tournaments: orderedTournaments,
    leaderboard: seasonLeaderboard,
    teams: seasonTeams,
    players: seasonPlayers,
    currentTournament,
    registeredTeams: seasonTeams.length,
    matchesPlayed,
    completedDays,
    recentResults: orderedTournaments.filter((tournament) => (tournament.matchCount ?? 0) > 0).slice(-3).reverse(),
  };
}

export async function getTournaments(status?: string): Promise<Tournament[]> {
  const all = await fromFirestoreOrSeed<Tournament>(COLLECTIONS.tournaments, seedTournaments, (a, b) => {
    const dateComparison = compareIsoDateDesc(a.startDate, b.startDate);
    if (dateComparison !== 0) return dateComparison;
    return a.title.localeCompare(b.title);
  });
  if (!status) return all;
  return all.filter((t) => t.status === status);
}

export async function getTournament(id: string): Promise<Tournament | null> {
  return oneFromFirestoreOrSeed(COLLECTIONS.tournaments, id, seedTournaments);
}

export async function saveTournament(data: Partial<Tournament> & { title: string }, id?: string) {
  const payload = normalizeTournamentPayload(data);
  const docId = id ?? slugify(payload.title);
  if (isFirebaseConfigured()) {
    await saveFirestoreDocument(COLLECTIONS.tournaments, docId, payload as Record<string, unknown>);
  }
  return { id: docId, ...payload };
}

export async function deleteTournament(id: string) {
  if (isFirebaseConfigured()) {
    await deleteFirestoreDocument(COLLECTIONS.tournaments, id);
  }
  return { id, deleted: true };
}

export async function getTournamentMatches(tournamentId: string): Promise<TournamentMatch[]> {
  if (!isFirebaseConfigured()) return [];
  try {
    let matches = await queryFirestoreCollection<TournamentMatch>(COLLECTIONS.matches, "tournamentId", tournamentId, 200);
    if (matches.length === 0) {
      matches = await queryFirestoreCollection<TournamentMatch>(COLLECTIONS.tournamentMatches, "tournamentId", tournamentId, 200);
    }
    return matches
      .map(normalizeStoredTournamentMatch)
      .filter((m) => m.dataSource === "pubg_api" || m.syncedAt)
      .sort((firstMatch, secondMatch) => compareMatchSequenceOrder(firstMatch, secondMatch));
  } catch {
    return [];
  }
}

export async function getTournamentStandings(tournamentId: string): Promise<TournamentStanding[]> {
  if (!isFirebaseConfigured()) return [];
  try {
    const standings = await queryFirestoreCollection<TournamentStanding>(COLLECTIONS.standings, "tournamentId", tournamentId, 100);
    return sortTournamentStandings(standings).map((standing) => ({
      ...standing,
      teamName: canonicalizeBravoTeamName(standing.teamName),
      slotNumber: standing.slotNumber ?? resolveBravoTeamIdentity(standing.teamName)?.slotNumber,
    }));
  } catch {
    return [];
  }
}

export async function getTournamentTeams(tournamentId: string): Promise<Team[]> {
  if (!isFirebaseConfigured()) return [];
  try {
    const teams = await queryFirestoreCollection<Team>(COLLECTIONS.teams, "sourceTournamentId", tournamentId, 100);
    return teams.map(normalizeStoredTeam).sort((firstTeam, secondTeam) => compareBravoTeamSlotOrder(firstTeam, secondTeam));
  } catch {
    return [];
  }
}

export async function getTournamentPlayers(tournamentId: string): Promise<Player[]> {
  if (!isFirebaseConfigured()) return [];
  try {
    const players = await queryFirestoreCollection<Player>(COLLECTIONS.players, "sourceTournamentId", tournamentId, 500);
    return players.sort((firstPlayer, secondPlayer) => comparePlayerLeaderboardPerformance(firstPlayer, secondPlayer));
  } catch {
    return [];
  }
}

export async function getScrims(): Promise<Scrim[]> {
  if (!isFirebaseConfigured()) return [];
  try {
    const scrims = await fetchFirestoreCollection<Scrim>(COLLECTIONS.scrims, 100);
    return scrims.sort(
      (firstScrim, secondScrim) =>
        secondScrim.date.localeCompare(firstScrim.date) ||
        (secondScrim.lobbyTime ?? "").localeCompare(firstScrim.lobbyTime ?? "") ||
        secondScrim.title.localeCompare(firstScrim.title)
    );
  } catch {
    return [];
  }
}

export async function getScrimDayResults(): Promise<ScrimDayResult[]> {
  const scrims = await getScrims();
  if (scrims.length === 0) return [];

  let matchResults: TournamentMatch[] = [];
  if (isFirebaseConfigured()) {
    try {
      const [liveResults, storedMatches, legacyTournamentMatches] = await Promise.all([
        fetchFirestoreCollection<TournamentMatch>(COLLECTIONS.matchResults, 500),
        fetchFirestoreCollection<TournamentMatch>(COLLECTIONS.matches, 500),
        fetchFirestoreCollection<TournamentMatch>(COLLECTIONS.tournamentMatches, 500),
      ]);

      const uniqueMatches = new Map<string, TournamentMatch>();
      for (const match of [...storedMatches, ...legacyTournamentMatches, ...liveResults]) {
        uniqueMatches.set(match.id, match);
      }

      matchResults = Array.from(uniqueMatches.values()).map(normalizeStoredTournamentMatch);
    } catch {
      matchResults = [];
    }
  }

  const scrimsByDate = new Map<string, Scrim[]>();
  for (const scrim of scrims) {
    const dateKey = toKathmanduDateKey(scrim.date) ?? scrim.date;
    const existingScrims = scrimsByDate.get(dateKey) ?? [];
    existingScrims.push(scrim);
    scrimsByDate.set(dateKey, existingScrims);
  }

  const orderedDateKeys = Array.from(scrimsByDate.keys()).sort((firstDate, secondDate) =>
    firstDate.localeCompare(secondDate)
  );

  const dayResults = orderedDateKeys.map((dateKey, dayIndex) => {
    const dayScrims = [...(scrimsByDate.get(dateKey) ?? [])].sort(
      (firstScrim, secondScrim) =>
        firstScrim.date.localeCompare(secondScrim.date) ||
        (firstScrim.lobbyTime ?? "").localeCompare(secondScrim.lobbyTime ?? "") ||
        firstScrim.title.localeCompare(secondScrim.title)
    );

    const scrimIds = new Set(dayScrims.map((scrim) => scrim.id));
    const linkedMatchIds = new Set(dayScrims.flatMap((scrim) => getScrimLinkedMatchIds(scrim)));

    const dayMatchesMap = new Map<string, TournamentMatch>();
    for (const matchResult of matchResults) {
      const playedAtDateKey = toKathmanduDateKey(matchResult.playedAt);
      const isStandaloneScrimMatch =
        playedAtDateKey === dateKey && !matchResult.tournamentId && !matchResult.scrimId;
      const belongsToDay =
        (matchResult.scrimId ? scrimIds.has(matchResult.scrimId) : false) ||
        linkedMatchIds.has(matchResult.pubgMatchId) ||
        isStandaloneScrimMatch;

      if (belongsToDay) {
        dayMatchesMap.set(matchResult.id, matchResult);
      }
    }

    const dayMatches = Array.from(dayMatchesMap.values()).sort((firstMatch, secondMatch) =>
      compareMatchSequenceOrder(firstMatch, secondMatch)
    );

    const announcements = dayScrims
      .map((scrim) => scrim.announcement?.trim())
      .filter((announcement): announcement is string => Boolean(announcement));

    const syncedScrimIds = new Set(
      dayMatches.map((match) => match.scrimId).filter((scrimId): scrimId is string => Boolean(scrimId))
    );
    const syncedMatchIds = new Set(dayMatches.map((match) => match.pubgMatchId));
    const pendingMatches = dayScrims.reduce((pendingTotal, scrim) => {
      const configuredMatchIds = getScrimLinkedMatchIds(scrim);
      const expectedMatches = configuredMatchIds.length > 0 ? configuredMatchIds.length : 1;
      const syncedConfiguredMatches = configuredMatchIds.filter((matchId) => syncedMatchIds.has(matchId)).length;
      const syncedStandaloneMatch = syncedScrimIds.has(scrim.id) && configuredMatchIds.length === 0 ? 1 : 0;
      return pendingTotal + Math.max(expectedMatches - syncedConfiguredMatches - syncedStandaloneMatch, 0);
    }, 0);

    const latestUpdatedAt = [...dayMatches.map((match) => match.syncedAt), ...dayScrims.map((scrim) => scrim.updatedAt)]
      .filter((timestamp): timestamp is string => Boolean(timestamp))
      .sort((firstTimestamp, secondTimestamp) => firstTimestamp.localeCompare(secondTimestamp))
      .at(-1);
    const resolvedDayNumber = resolveScrimDayNumber(dayScrims, dayIndex + 1);

    return {
      id: `scrim-day-${dateKey}`,
      dayNumber: resolvedDayNumber,
      seasonDayNumber: resolvedDayNumber,
      label: `Day ${resolvedDayNumber}`,
      date: dateKey,
      displayDate: formatKathmanduDate(dateKey),
      status: buildScrimDayStatus(dayScrims),
      scrimCount: dayScrims.length,
      completedMatches: dayMatches.length,
      pendingMatches,
      matchIds: Array.from(new Set(dayMatches.map((match) => match.pubgMatchId))),
      scrims: dayScrims,
      matches: dayMatches,
      leaderboard: aggregateScrimDayLeaderboard(dayMatches),
      announcements,
      lastUpdatedAt: latestUpdatedAt,
    } satisfies ScrimDayResult;
  });

  return dayResults.sort(
    (firstDay, secondDay) =>
      secondDay.dayNumber - firstDay.dayNumber || secondDay.date.localeCompare(firstDay.date)
  );
}

export async function saveTournamentMatch(data: TournamentMatch) {
  if (isFirebaseConfigured()) {
    await saveFirestoreDocument(COLLECTIONS.matches, data.id, data as unknown as Record<string, unknown>);
    await saveFirestoreDocument(COLLECTIONS.tournamentMatches, data.id, data as unknown as Record<string, unknown>);
  }
  return data;
}

export async function getTeams(): Promise<Team[]> {
  const teams = (
    await fromFirestoreOrSeed<Team>(COLLECTIONS.teams, [], (a, b) => compareBravoTeamSlotOrder(a, b), 500)
  ).map(normalizeStoredTeam);

  const visibleTeams = teams.filter((team) => team.scope !== "tournament");
  const currentSeason = await getCurrentSeason();
  if (currentSeason) {
    const currentSeasonTeams = visibleTeams.filter((team) => team.scope === "season" && team.seasonId === currentSeason.id);
    if (currentSeasonTeams.length > 0) {
      return currentSeasonTeams.sort((firstTeam, secondTeam) => compareBravoTeamSlotOrder(firstTeam, secondTeam));
    }
  }

  return visibleTeams;
}

export async function getTeam(id: string): Promise<Team | null> {
  const team = await oneFromFirestoreOrSeed(COLLECTIONS.teams, id, []);
  return team ? normalizeStoredTeam(team) : null;
}

export async function getTeamMatchPlayers(teamName: string): Promise<MatchPlayerRecord[]> {
  if (!isFirebaseConfigured()) return [];
  try {
    const matchPlayers = await queryFirestoreCollection<MatchPlayerRecord>(COLLECTIONS.matchPlayers, "teamName", teamName, 2000);
    return normalizeStoredMatchPlayers(matchPlayers);
  } catch {
    return [];
  }
}

export async function saveTeam(data: Partial<Team> & { name: string }, id?: string) {
  const payload = normalizeTeamPayload(data);
  const docId = id ?? resolveBravoTeamIdentity(payload.name)?.id ?? slugify(payload.name);
  if (isFirebaseConfigured()) {
    await saveFirestoreDocument(COLLECTIONS.teams, docId, payload as Record<string, unknown>);
  }
  return { id: docId, ...payload };
}

export async function deleteTeam(id: string) {
  if (isFirebaseConfigured()) {
    await deleteFirestoreDocument(COLLECTIONS.teams, id);
  }
  return { id, deleted: true };
}

export async function getPlayers(): Promise<Player[]> {
  const players = await fromFirestoreOrSeed<Player>(
    COLLECTIONS.players,
    [],
    (firstPlayer, secondPlayer) => comparePlayerLeaderboardPerformance(firstPlayer, secondPlayer),
    1500
  );
  const visiblePlayers = players.filter((player) => player.scope !== "tournament");
  const currentSeason = await getCurrentSeason();
  if (currentSeason) {
    const currentSeasonPlayers = visiblePlayers.filter(
      (player) => player.scope === "season" && player.seasonId === currentSeason.id
    );
    if (currentSeasonPlayers.length > 0) {
      return currentSeasonPlayers.sort(
        (firstPlayer, secondPlayer) => comparePlayerLeaderboardPerformance(firstPlayer, secondPlayer)
      );
    }
  }

  return visiblePlayers.sort((firstPlayer, secondPlayer) => comparePlayerLeaderboardPerformance(firstPlayer, secondPlayer));
}

export async function getPlayer(id: string): Promise<Player | null> {
  return oneFromFirestoreOrSeed(COLLECTIONS.players, id, []);
}

export async function getPlayerMatchPlayers(sourcePlayerId: string): Promise<MatchPlayerRecord[]> {
  if (!isFirebaseConfigured()) return [];
  try {
    const matchPlayers = await queryFirestoreCollection<MatchPlayerRecord>(
      COLLECTIONS.matchPlayers,
      "sourcePlayerId",
      sourcePlayerId,
      2000
    );
    return normalizeStoredMatchPlayers(matchPlayers);
  } catch {
    return [];
  }
}

export async function getMvpOfWeek(): Promise<Player | null> {
  const players = await getPlayers();
  return players.find((player) => player.isMvpOfWeek) ?? sortMvpRanking(players)[0] ?? null;
}

export async function savePlayer(data: Partial<Player> & { name: string }, id?: string) {
  const payload = normalizePlayerPayload(data);
  const docId = id ?? slugify(payload.name);
  if (isFirebaseConfigured()) {
    await saveFirestoreDocument(COLLECTIONS.players, docId, payload as Record<string, unknown>);
  }
  return { id: docId, ...payload };
}

export async function deletePlayer(id: string) {
  if (isFirebaseConfigured()) {
    await deleteFirestoreDocument(COLLECTIONS.players, id);
  }
  return { id, deleted: true };
}

export async function getLeaderboard(): Promise<LeaderboardRow[]> {
  const currentSeason = await getCurrentSeason();
  if (currentSeason) {
    const seasonLeaderboard = await getSeasonLeaderboard(currentSeason.id);
    if (seasonLeaderboard.length > 0) return seasonLeaderboard;
  }

  if (!isFirebaseConfigured()) return [];
  try {
    const teams = await fetchFirestoreCollection<Team>(COLLECTIONS.teams, 400);
    const visibleTeams = teams.filter((team) => team.scope !== "tournament" && (team.matches ?? 0) > 0);
    if (visibleTeams.length === 0) return [];
    return [...visibleTeams]
      .sort((firstTeam, secondTeam) => compareTeamLeaderboardPerformance(firstTeam, secondTeam))
      .map((team, index) => ({
        rank: index + 1,
        teamId: team.id,
        team: team.name,
        slotNumber: team.slotNumber,
        matches: team.matches,
        kills: team.kills,
        killPoints: team.killPoints ?? team.kills,
        placement: team.placementPoints ?? 0,
        points: team.totalPoints,
        averagePlacement: team.averagePlacement,
        chickenDinners: team.chickenDinners,
        logoUrl: team.logoUrl ?? team.logo,
        scope: team.scope ?? "season",
      }));
  } catch {
    return [];
  }
}

export async function getAnnouncements(): Promise<Announcement[]> {
  const all = await fromFirestoreOrSeed<Announcement>(COLLECTIONS.announcements, seedAnnouncements);
  return all.filter((a) => a.published !== false);
}

export async function saveAnnouncement(data: Partial<Announcement> & { title: string; detail: string }, id?: string) {
  const payload = normalizeAnnouncementPayload(data);
  const docId = id ?? `ann-${Date.now()}`;
  if (isFirebaseConfigured()) {
    await saveFirestoreDocument(COLLECTIONS.announcements, docId, payload as Record<string, unknown>);
  }
  return { id: docId, ...payload };
}

export async function deleteAnnouncement(id: string) {
  if (isFirebaseConfigured()) {
    await deleteFirestoreDocument(COLLECTIONS.announcements, id);
  }
  return { id, deleted: true };
}

export async function getStreams(): Promise<StreamSchedule[]> {
  return fromFirestoreOrSeed(COLLECTIONS.streams, seedStreams);
}

function normalizeYouTubeHandle(value?: string) {
  const rawValue = value?.trim();
  if (!rawValue) return DEFAULT_YOUTUBE_HANDLE;
  return rawValue.replace(/^https?:\/\/(www\.)?youtube\.com\//i, "").replace(/^@/, "").replace(/\/$/, "");
}

function buildYouTubeChannelUrl() {
  const configuredChannelUrl = process.env.NEXT_PUBLIC_YOUTUBE_CHANNEL_URL || process.env.YOUTUBE_CHANNEL_URL;
  if (configuredChannelUrl) return configuredChannelUrl;
  return DEFAULT_YOUTUBE_CHANNEL_URL;
}

function buildLiveEmbedUrl() {
  const configuredEmbedUrl = process.env.NEXT_PUBLIC_YOUTUBE_EMBED_URL || process.env.YOUTUBE_EMBED_URL;
  if (configuredEmbedUrl) return configuredEmbedUrl;

  const channelId =
    process.env.NEXT_PUBLIC_YOUTUBE_CHANNEL_ID || process.env.YOUTUBE_CHANNEL_ID || DEFAULT_YOUTUBE_CHANNEL_ID;
  if (channelId) {
    return `https://www.youtube.com/embed/live_stream?channel=${channelId}&autoplay=1`;
  }

  return `https://www.youtube.com/embed?listType=user_uploads&list=${normalizeYouTubeHandle(
    process.env.NEXT_PUBLIC_YOUTUBE_HANDLE || process.env.YOUTUBE_HANDLE
  )}`;
}

export async function getLiveStreamFeed(): Promise<StreamSchedule> {
  const streams = await getStreams();
  const activeStream = streams.find((stream) => stream.isLive) ?? streams[0];

  return {
    id: activeStream?.id ?? "stream-default",
    time: activeStream?.time ?? "Data not imported yet",
    title: activeStream?.title ?? "Data not imported yet",
    platform: activeStream?.platform ?? "YouTube",
    isLive: activeStream?.isLive ?? false,
    description: activeStream?.description ?? "Create a live stream entry in Firestore to publish the broadcast feed here.",
    viewers: activeStream?.viewers,
    embedUrl: activeStream?.embedUrl ?? buildLiveEmbedUrl(),
    channelUrl: activeStream?.channelUrl ?? buildYouTubeChannelUrl(),
    supportUrl: activeStream?.supportUrl ?? "https://kamaucha.me/bravo",
  };
}

export async function getVideos(): Promise<VideoItem[]> {
  return fromFirestoreOrSeed(COLLECTIONS.videos, seedVideos);
}

export async function getSponsors(): Promise<SponsorItem[]> {
  const sponsors = await fromFirestoreOrSeed<SponsorItem>(COLLECTIONS.sponsors, seedSponsors);
  return sponsors.filter((sponsor) => sponsor.published !== false);
}

export async function getRegistrations(): Promise<TeamRegistration[]> {
  if (!isFirebaseConfigured()) return [];
  try {
    return await fetchFirestoreCollection<TeamRegistration>(COLLECTIONS.registrations);
  } catch {
    return [];
  }
}

export async function createRegistration(data: Omit<TeamRegistration, "id" | "createdAt" | "status">) {
  const payload = {
    teamName: data.teamName.trim(),
    captainName: data.captainName.trim(),
    captainDiscord: data.captainDiscord.trim(),
    captainPhone: cleanString(data.captainPhone),
    captainEmail: cleanString(data.captainEmail),
    playerNames: cleanStringArray(data.playerNames) ?? [],
    tournamentId: cleanString(data.tournamentId),
    status: "pending" as const,
    createdAt: new Date().toISOString(),
  };
  if (isFirebaseConfigured()) {
    const result = await createFirestoreDocument(COLLECTIONS.registrations, payload);
    return { id: result.id, ...payload };
  }
  return { id: `reg-${Date.now()}`, ...payload };
}

export async function updateRegistrationStatus(id: string, status: TeamRegistration["status"]) {
  if (isFirebaseConfigured()) {
    await saveFirestoreDocument(COLLECTIONS.registrations, id, { status });
  }
  return { id, status };
}

export async function registerTeamForTournament(tournamentId: string, teamId: string) {
  const tournament = await getTournament(tournamentId);
  if (!tournament) throw new Error("Tournament not found");
  if (tournament.teamCount >= tournament.maxTeams) throw new Error("Tournament is full");
  const registered = Array.from(new Set([...(tournament.registeredTeamIds ?? []), teamId]));
  const updated = {
    ...tournament,
    registeredTeamIds: registered,
    teamCount: registered.length,
  };
  await saveTournament(updated, tournamentId);
  return updated;
}

export async function seedFirestore() {
  if (!isFirebaseConfigured()) {
    return { seeded: false, message: "Firebase not configured — using local seed data" };
  }

  await saveFirestoreDocument(COLLECTIONS.siteStats, "main", seedStats as unknown as Record<string, unknown>);

  for (const t of seedTournaments) {
    const { id, ...rest } = t;
    await saveFirestoreDocument(COLLECTIONS.tournaments, id, rest as unknown as Record<string, unknown>);
  }
  for (const t of seedTeams) {
    const { id, ...rest } = t;
    await saveFirestoreDocument(COLLECTIONS.teams, id, rest as unknown as Record<string, unknown>);
  }
  for (const p of seedPlayers) {
    const { id, ...rest } = p;
    await saveFirestoreDocument(COLLECTIONS.players, id, rest as unknown as Record<string, unknown>);
  }
  for (const a of seedAnnouncements) {
    const { id, ...rest } = a;
    await saveFirestoreDocument(COLLECTIONS.announcements, id, rest as unknown as Record<string, unknown>);
  }
  return { seeded: true, message: "Firestore seeded with teams, players, and tournaments. Match results import from live PUBG API only." };
}

export async function getAdminDashboardStats() {
  const [teams, players, tournaments, registrations, scrims, seasons] = await Promise.all([
    getTeams(),
    getPlayers(),
    getTournaments(),
    getRegistrations(),
    getScrims(),
    getSeasons(),
  ]);

  const completedTournaments = tournaments.filter((t) => t.status === "COMPLETED").length;
  const liveTournaments = tournaments.filter((t) => t.status === "LIVE").length;
  const totalMatches = tournaments.reduce((sum, tournament) => sum + (tournament.matchCount ?? 0), 0);
  const pendingRegistrations = registrations.filter((r) => r.status === "pending").length;
  const activeSeason = seasons.find((season) => season.status === "active") ?? seasons[0];

  let recentUploads: { id: string; type: string; uploadedAt: string }[] = [];
  if (isFirebaseConfigured()) {
    try {
      const uploads = await fetchFirestoreCollection<{ id: string; type: string; uploadedAt: string }>(COLLECTIONS.uploads, 5);
      recentUploads = uploads.sort((a, b) => (b.uploadedAt ?? "").localeCompare(a.uploadedAt ?? ""));
    } catch {
      recentUploads = [];
    }
  }

  return {
    totalTeams: teams.length,
    totalPlayers: players.length,
    totalScrims: scrims.length,
    matchesPlayed: totalMatches,
    totalTournaments: tournaments.length,
    completedTournaments,
    liveTournaments,
    pendingRegistrations,
    recentRegistrations: registrations.slice(0, 5),
    recentUploads,
    firebaseConnected: isFirebaseConfigured(),
    totalSeasons: seasons.length,
    activeSeasonTitle: activeSeason?.seriesTitle ?? activeSeason?.title,
    activeSeasonDay: activeSeason?.currentDay,
    activeSeasonLength: activeSeason?.configuredDays,
  };
}
