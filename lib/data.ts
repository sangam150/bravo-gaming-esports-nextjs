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
  seedStats,
  seedStreams,
  seedTeams,
  seedTournaments,
  seedVideos,
} from "./seed-data";
import type {
  Announcement,
  LeaderboardRow,
  Player,
  Scrim,
  ScrimDayResult,
  ScrimDayStanding,
  SiteStats,
  StreamSchedule,
  Team,
  TeamRegistration,
  Tournament,
  TournamentMatch,
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
    description: cleanString(data.description),
    rules: cleanString(data.rules),
    schedule: cleanString(data.schedule),
    mapRotation: cleanStringArray(data.mapRotation),
    bannerUrl: cleanString(data.bannerUrl),
    registeredTeamIds,
    createdAt: cleanString(data.createdAt),
  } satisfies Partial<Tournament> & { title: string };
}

function normalizeTeamPayload(data: Partial<Team> & { name: string }) {
  const canonicalLogo = cleanString(data.logoUrl ?? data.logo);

  return {
    name: data.name.trim(),
    tag: cleanString(data.tag),
    slotNumber: toOptionalNumber(data.slotNumber),
    logo: canonicalLogo,
    logoUrl: canonicalLogo,
    country: cleanString(data.country),
    rank: toOptionalNumber(data.rank),
    totalPoints: toNumber(data.totalPoints),
    kills: toNumber(data.kills),
    matches: toNumber(data.matches),
    placementPoints: toOptionalNumber(data.placementPoints),
    status: data.status ?? "active",
    registrationStatus: data.registrationStatus ?? "approved",
    playerIds: cleanStringArray(data.playerIds),
    captainName: cleanString(data.captainName),
    captainDiscord: cleanString(data.captainDiscord),
    captainPhone: cleanString(data.captainPhone),
    captainEmail: cleanString(data.captainEmail),
    createdAt: cleanString(data.createdAt),
  } satisfies Partial<Team> & { name: string };
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
    kills: toNumber(data.kills),
    damage: toNumber(data.damage),
    mvpCount: toNumber(data.mvpCount),
    chickenDinners: toNumber(data.chickenDinners),
    matches: toNumber(data.matches),
    rating: toOptionalNumber(data.rating),
    winRate: toOptionalNumber(data.winRate),
    isMvpOfWeek: Boolean(data.isMvpOfWeek),
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

function aggregateScrimDayLeaderboard(matches: TournamentMatch[]): ScrimDayStanding[] {
  const standingsMap = new Map<
    string,
    ScrimDayStanding & {
      placementTotal: number;
    }
  >();

  for (const match of matches) {
    for (const teamResult of match.teamResults ?? []) {
      const teamKey = teamResult.teamId ?? teamResult.teamName.toLowerCase();
      const currentStanding = standingsMap.get(teamKey) ?? {
        teamId: teamResult.teamId,
        teamName: teamResult.teamName,
        matches: 0,
        wins: 0,
        kills: 0,
        killPoints: 0,
        placementPoints: 0,
        totalPoints: 0,
        bestPlacement: Number.POSITIVE_INFINITY,
        averagePlacement: 0,
        placementTotal: 0,
      };

      currentStanding.matches += 1;
      currentStanding.wins += teamResult.placement === 1 ? 1 : 0;
      currentStanding.kills += teamResult.kills;
      currentStanding.killPoints += teamResult.killPoints ?? teamResult.kills;
      currentStanding.placementPoints += teamResult.placementPoints ?? 0;
      currentStanding.totalPoints += teamResult.totalPoints;
      currentStanding.bestPlacement = Math.min(currentStanding.bestPlacement, teamResult.placement);
      currentStanding.placementTotal += teamResult.placement;

      standingsMap.set(teamKey, currentStanding);
    }
  }

  return Array.from(standingsMap.values())
    .map(({ placementTotal, ...standing }) => ({
      ...standing,
      averagePlacement: Number((placementTotal / standing.matches).toFixed(2)),
    }))
    .sort(
      (firstStanding, secondStanding) =>
        secondStanding.totalPoints - firstStanding.totalPoints ||
        secondStanding.kills - firstStanding.kills ||
        firstStanding.averagePlacement - secondStanding.averagePlacement ||
        firstStanding.teamName.localeCompare(secondStanding.teamName)
    );
}

async function fromFirestoreOrSeed<T>(collection: string, seed: T[], sortFn?: (a: T & { id: string }, b: T & { id: string }) => number): Promise<(T & { id: string })[]> {
  if (!isFirebaseConfigured()) return seed as (T & { id: string })[];
  try {
    const docs = await fetchFirestoreCollection<T>(collection);
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
    return doc ?? seedStats;
  } catch {
    return seedStats;
  }
}

export async function getTournaments(status?: string): Promise<Tournament[]> {
  const all = await fromFirestoreOrSeed<Tournament>(COLLECTIONS.tournaments, seedTournaments);
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
    const matches = await queryFirestoreCollection<TournamentMatch>(COLLECTIONS.tournamentMatches, "tournamentId", tournamentId);
    return matches.filter((m) => m.dataSource === "pubg_api" || m.syncedAt);
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
      matchResults = await fetchFirestoreCollection<TournamentMatch>(COLLECTIONS.matchResults, 500);
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
      (firstMatch.playedAt ?? firstMatch.syncedAt ?? "").localeCompare(
        secondMatch.playedAt ?? secondMatch.syncedAt ?? ""
      )
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

    return {
      id: `scrim-day-${dateKey}`,
      dayNumber: dayIndex + 1,
      label: `Day ${dayIndex + 1}`,
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

  return dayResults.sort((firstDay, secondDay) => secondDay.date.localeCompare(firstDay.date));
}

export async function saveTournamentMatch(data: TournamentMatch) {
  if (isFirebaseConfigured()) {
    await saveFirestoreDocument(COLLECTIONS.tournamentMatches, data.id, data as unknown as Record<string, unknown>);
  }
  return data;
}

export async function getTeams(): Promise<Team[]> {
  return fromFirestoreOrSeed<Team>(COLLECTIONS.teams, seedTeams, (a, b) => {
    const firstSlot = a.slotNumber ?? Number.POSITIVE_INFINITY;
    const secondSlot = b.slotNumber ?? Number.POSITIVE_INFINITY;
    if (firstSlot !== secondSlot) return firstSlot - secondSlot;
    return (a.rank ?? 99) - (b.rank ?? 99);
  });
}

export async function getTeam(id: string): Promise<Team | null> {
  return oneFromFirestoreOrSeed(COLLECTIONS.teams, id, seedTeams);
}

export async function saveTeam(data: Partial<Team> & { name: string }, id?: string) {
  const payload = normalizeTeamPayload(data);
  const docId = id ?? slugify(payload.name);
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
  return fromFirestoreOrSeed<Player>(COLLECTIONS.players, seedPlayers, (a, b) => (b.rating ?? 0) - (a.rating ?? 0));
}

export async function getPlayer(id: string): Promise<Player | null> {
  return oneFromFirestoreOrSeed(COLLECTIONS.players, id, seedPlayers);
}

export async function getMvpOfWeek(): Promise<Player | null> {
  const players = await getPlayers();
  return players.find((p) => p.isMvpOfWeek) ?? players[0] ?? null;
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
  if (!isFirebaseConfigured()) return [];
  try {
    const teams = await fetchFirestoreCollection<Team>(COLLECTIONS.teams, 200);
    const withLiveData = teams.filter((t) => (t.matches ?? 0) > 0);
    if (withLiveData.length === 0) return [];
    return [...withLiveData]
      .sort((a, b) => (b.totalPoints ?? 0) - (a.totalPoints ?? 0))
      .map((t, i) => ({
        rank: i + 1,
        teamId: t.id,
        team: t.name,
        matches: t.matches,
        kills: t.kills,
        placement: t.placementPoints ?? 0,
        points: t.totalPoints,
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
    time: activeStream?.time ?? "Live updates",
    title: activeStream?.title ?? "Bravo Gaming Nepal Live",
    platform: activeStream?.platform ?? "YouTube",
    isLive: activeStream?.isLive ?? false,
    description: activeStream?.description ?? "PUBG PC Daily Scrims & Tournament Finals",
    viewers: activeStream?.viewers,
    embedUrl: activeStream?.embedUrl ?? buildLiveEmbedUrl(),
    channelUrl: activeStream?.channelUrl ?? buildYouTubeChannelUrl(),
    supportUrl: activeStream?.supportUrl ?? "https://kamaucha.me/bravo",
  };
}

export async function getVideos(): Promise<VideoItem[]> {
  return fromFirestoreOrSeed(COLLECTIONS.videos, seedVideos);
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
  const [teams, players, tournaments, registrations, scrims] = await Promise.all([
    getTeams(),
    getPlayers(),
    getTournaments(),
    getRegistrations(),
    getScrims(),
  ]);

  const completedTournaments = tournaments.filter((t) => t.status === "COMPLETED").length;
  const liveTournaments = tournaments.filter((t) => t.status === "LIVE").length;
  const totalMatches = teams.reduce((sum, t) => sum + (t.matches ?? 0), 0);
  const pendingRegistrations = registrations.filter((r) => r.status === "pending").length;

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
  };
}
