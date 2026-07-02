import {
  COLLECTIONS,
  createDocument,
  deleteDocument,
  fetchDocumentCollection,
  getConfiguredDataBackend,
  getDocument,
  isDocumentStoreAdminConfigured,
  isDocumentStoreConfigured,
  queryDocumentCollection,
  saveDocument,
} from "./document-store";
import {
  ensureUniqueDocumentSlug,
  filterSoftDeleted,
  getDocumentByIdOrSlug,
  softDeleteDocumentEntity,
} from "./document-entities";
import { BRAVO_DISCORD_URL } from "./brand-links";
import { formatAnnouncementDate } from "./display-format";
import {
  seedAnnouncements,
  seedSponsors,
  seedStats,
  seedStreams,
  seedTournaments,
  seedVideos,
} from "./seed-data";
import {
  buildFallbackTeamNameFromSlot,
  canonicalizeBravoTeamName,
  compareBravoTeamSlotOrder,
  getBravoCanonicalTeams,
  parseBravoSlotNumber,
  resolveBravoTeamIdentity,
} from "./bravo-teams";
import {
  deleteCompetitionEvent,
  deleteCompetitionSeason,
  getCurrentCompetitionSeason,
  getCompetitionEvent,
  getCompetitionMatchesForEvent,
  getCompetitionSeason,
  getCompetitionSeasonLeaderboardRows,
  getCompetitionSeasonPlayers,
  getCompetitionSeasonTeams,
  listCompetitionEvents,
  listCompetitionPlayers,
  listCompetitionSeasons,
  listCompetitionTeams,
  saveCompetitionEvent,
  saveCompetitionSeason,
} from "./competition-relational";
import { hasPublicDemoMarker, sanitizePublicAssetUrl, sanitizePublicCopy } from "./public-content";
import {
  compareMatchSequenceOrder,
  comparePlayerLeaderboardPerformance,
  compareTeamLeaderboardPerformance,
  sortMvpRanking,
  sortTournamentStandings,
} from "./ranking-sort";
import { buildSeasonLeaderboard, seasonLeaderboardToRows } from "./season-standings";
import { buildTournamentStandings } from "./tournament-standings";
import { getRecentUploadRecords } from "./upload-records";
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

function cleanLinkUrl(value?: string | null) {
  const normalizedValue = cleanString(value);
  if (!normalizedValue) return undefined;

  if (normalizedValue.startsWith("/")) {
    return normalizedValue;
  }

  if (/^https?:\/\//i.test(normalizedValue)) {
    return normalizedValue;
  }

  return undefined;
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

function hasTrackedTeamActivity(team: Team) {
  return (
    (team.matches ?? 0) > 0 ||
    (team.totalPoints ?? 0) > 0 ||
    (team.kills ?? 0) > 0 ||
    (team.killPoints ?? 0) > 0 ||
    (team.placementPoints ?? 0) > 0 ||
    (team.chickenDinners ?? 0) > 0 ||
    (team.seasonDayNumbers?.length ?? 0) > 0
  );
}

function hasManagedTeamProfile(team: Team) {
  return Boolean(
    (team.playerIds?.length ?? 0) > 0 ||
    cleanString(team.logoUrl ?? team.logo) ||
    cleanString(team.country) ||
    cleanString(team.captainName) ||
    cleanString(team.captainDiscord) ||
    cleanString(team.captainEmail) ||
    cleanString(team.captainPhone)
  );
}

function isPubliclyVisibleTeam(team: Team) {
  if (team.scope === "tournament") return false;
  if ((team.sourceProvider ?? "").trim() !== "season_bootstrap") return true;
  return hasTrackedTeamActivity(team) || hasManagedTeamProfile(team);
}

function filterPublicTeams(teams: Team[]) {
  return teams.filter((team) => isPubliclyVisibleTeam(team));
}

function isPubliclyVisibleSeason(season: Season) {
  return !hasPublicDemoMarker(
    season.title,
    season.slug,
    season.seriesTitle,
    season.notes,
    season.description,
    season.sourceProvider
  );
}

function filterPublicSeasons(seasons: Season[]) {
  return seasons.filter((season) => isPubliclyVisibleSeason(season));
}

function isPubliclyVisibleTournament(tournament: Tournament) {
  return !hasPublicDemoMarker(tournament.title, tournament.seasonTitle);
}

function sanitizePublicTournament(tournament: Tournament): Tournament {
  return {
    id: tournament.id,
    title: tournament.title,
    tier: tournament.tier,
    status: tournament.status,
    prizePool: tournament.prizePool,
    teamCount: tournament.teamCount,
    maxTeams: tournament.maxTeams,
    startDate: tournament.startDate,
    endDate: tournament.endDate,
    format: tournament.format,
    mode: tournament.mode,
    server: tournament.server,
    perspective: tournament.perspective,
    description:
      sanitizePublicCopy(
        tournament.description,
        tournament.status === "COMPLETED"
          ? "Official event results and standings will appear here after publication."
          : "Official event details will appear here after publication."
      ) ?? undefined,
    rules: hasPublicDemoMarker(tournament.rules) ? undefined : tournament.rules,
    schedule: hasPublicDemoMarker(tournament.schedule) ? undefined : tournament.schedule,
    mapRotation: tournament.mapRotation?.filter(Boolean),
    bannerUrl: sanitizePublicAssetUrl(tournament.bannerUrl ?? undefined),
    registeredTeamIds: tournament.registeredTeamIds,
    seasonId: tournament.seasonId,
    seasonTitle: hasPublicDemoMarker(tournament.seasonTitle) ? undefined : tournament.seasonTitle,
    seasonNumber: tournament.seasonNumber,
    seasonDayNumber: tournament.seasonDayNumber,
    dayNumber: tournament.dayNumber,
    matchCount: tournament.matchCount,
    createdAt: tournament.createdAt,
    updatedAt: tournament.updatedAt,
  };
}

function sanitizePublicPlayer(player: Player): Player {
  return {
    id: player.id,
    slug: player.slug,
    name: player.name,
    realName: hasPublicDemoMarker(player.realName) ? undefined : player.realName,
    inGameName: player.inGameName,
    teamId: player.teamId,
    teamName: player.teamName,
    avatar: sanitizePublicAssetUrl(player.avatar ?? undefined),
    avatarUrl: sanitizePublicAssetUrl(player.avatarUrl ?? undefined),
    pubgName: hasPublicDemoMarker(player.pubgName) ? undefined : player.pubgName,
    role: player.role,
    nationality: player.nationality,
    playerStatus: player.playerStatus,
    assists: player.assists,
    knocks: player.knocks,
    placementPoints: player.placementPoints,
    totalPoints: player.totalPoints,
    averageDamage: player.averageDamage,
    bestPlacement: player.bestPlacement,
    kills: player.kills,
    damage: player.damage,
    mvpCount: player.mvpCount,
    chickenDinners: player.chickenDinners,
    matches: player.matches,
    rating: player.rating,
    winRate: player.winRate,
    isMvpOfWeek: player.isMvpOfWeek,
    scope: player.scope,
    seasonId: player.seasonId,
    seasonTitle: hasPublicDemoMarker(player.seasonTitle) ? undefined : player.seasonTitle,
    seasonDayNumbers: player.seasonDayNumbers,
    createdAt: player.createdAt,
    updatedAt: player.updatedAt,
  };
}

function sanitizePublicStatText(value: string, fallback: string) {
  const sanitized = value
    .replace(/\bpreview pool\b/gi, "")
    .replace(/\blaunch preview\b/gi, "")
    .replace(/\bpreview\b/gi, "")
    .replace(/\blaunch\b/gi, "")
    .replace(/\bqa\b/gi, "")
    .replace(/\btest\b/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();

  if (!sanitized || hasPublicDemoMarker(sanitized)) {
    return fallback;
  }

  return sanitized;
}

function sanitizePublicAnnouncement(announcement: Announcement): Announcement | null {
  if (hasPublicDemoMarker(announcement.id, announcement.title, announcement.detail, announcement.category)) {
    return null;
  }

  const detail = sanitizePublicCopy(
    announcement.detail,
    "Official update details will appear here after publication."
  );
  if (!detail) {
    return null;
  }

  return {
    id: announcement.id,
    title: sanitizePublicCopy(announcement.title, "Bravo Update") ?? "Bravo Update",
    detail,
    date: announcement.date,
    category: hasPublicDemoMarker(announcement.category) ? undefined : announcement.category,
    published: announcement.published !== false,
  };
}

function sanitizePublicStream(stream: StreamSchedule): StreamSchedule | null {
  if (hasPublicDemoMarker(stream.id, stream.title, stream.time, stream.description, stream.platform)) {
    return null;
  }

  return {
    id: stream.id,
    time: stream.time,
    title: stream.title,
    platform: hasPublicDemoMarker(stream.platform) ? undefined : stream.platform,
    isLive: Boolean(stream.isLive),
    description: sanitizePublicCopy(stream.description),
    viewers: stream.viewers ? sanitizePublicStatText(stream.viewers, "") || undefined : undefined,
    embedUrl: stream.embedUrl,
    channelUrl: stream.channelUrl,
    supportUrl: stream.supportUrl,
  };
}

function sanitizePublicVideo(video: VideoItem): VideoItem | null {
  if (hasPublicDemoMarker(video.id, video.slug, video.title, video.category, video.source)) {
    return null;
  }

  return {
    id: video.id,
    slug: hasPublicDemoMarker(video.slug) ? undefined : video.slug,
    title: video.title,
    category: video.category,
    duration: video.duration,
    url: video.url,
    kind: video.kind,
    gameSlug: hasPublicDemoMarker(video.gameSlug) ? undefined : video.gameSlug,
    summary: sanitizePublicCopy(video.summary),
    imageUrl: sanitizePublicAssetUrl(video.imageUrl),
    featured: Boolean(video.featured),
    published: video.published !== false,
    youtubeVideoId: video.youtubeVideoId,
    publishedAt: video.publishedAt,
    createdAt: video.createdAt,
    updatedAt: video.updatedAt,
  };
}

function sanitizePublicSponsor(sponsor: SponsorItem): SponsorItem | null {
  if (hasPublicDemoMarker(sponsor.id, sponsor.slug, sponsor.name, sponsor.tier, sponsor.description)) {
    return null;
  }

  return {
    id: sponsor.id,
    name: sponsor.name,
    kind: sponsor.kind,
    tier: sponsor.tier,
    url: sponsor.url,
    websiteUrl: sponsor.websiteUrl,
    socialUrl: sponsor.socialUrl,
    logoUrl: sanitizePublicAssetUrl(sponsor.logoUrl),
    bannerUrl: sanitizePublicAssetUrl(sponsor.bannerUrl),
    designAssetUrl: sanitizePublicAssetUrl(sponsor.designAssetUrl),
    slug: hasPublicDemoMarker(sponsor.slug) ? undefined : sponsor.slug,
    description: sanitizePublicCopy(sponsor.description),
    supportedEvents: sponsor.supportedEvents,
    eventSlugs: sponsor.eventSlugs,
    partnershipHistory: sponsor.partnershipHistory,
    visible: sponsor.visible !== false,
    featured: Boolean(sponsor.featured),
    published: sponsor.published !== false,
    showOnHomepage: Boolean(sponsor.showOnHomepage),
    showOnSponsorsPage: sponsor.showOnSponsorsPage !== false,
    showOnEventPage: Boolean(sponsor.showOnEventPage),
    showOnPubgPage: Boolean(sponsor.showOnPubgPage),
    createdAt: sponsor.createdAt,
    updatedAt: sponsor.updatedAt,
  };
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
    slug: cleanString(data.slug) ?? slugify(normalizedName),
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
    deletedAt: cleanString(data.deletedAt),
    createdAt: cleanString(data.createdAt),
  } satisfies Partial<Team> & { name: string };
}

function normalizeStoredTeam(team: Team): Team {
  const resolvedTeam = resolveBravoTeamIdentity(team.name ?? team.id ?? team.sourceTeamName);
  const inferredSlotNumber =
    resolvedTeam?.slotNumber ?? team.slotNumber ?? parseBravoSlotNumber(team.name) ?? parseBravoSlotNumber(team.sourceTeamName);

  return {
    ...team,
    slug: cleanString(team.slug) ?? slugify(resolvedTeam?.name ?? buildFallbackTeamNameFromSlot(inferredSlotNumber) ?? team.name),
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

function isPublishedTournamentMatch(match: Pick<TournamentMatch, "status">) {
  return (match.status ?? "published") !== "draft";
}

function normalizePlayerPayload(data: Partial<Player> & { name: string }) {
  const canonicalName = (cleanString(data.name) ?? cleanString(data.inGameName) ?? "Unknown").trim();
  const canonicalAvatar = cleanString(data.avatarUrl ?? data.avatar);

  return {
    slug: cleanString(data.slug) ?? slugify(cleanString(data.inGameName) ?? cleanString(data.pubgName) ?? canonicalName),
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
    deletedAt: cleanString(data.deletedAt),
    createdAt: cleanString(data.createdAt),
  } satisfies Partial<Player> & { name: string };
}

function normalizeAnnouncementPayload(data: Partial<Announcement> & { title: string; detail: string }) {
  return {
    title: data.title.trim(),
    detail: data.detail.trim(),
    date: cleanString(data.date) ?? formatAnnouncementDate(),
    category: cleanString(data.category),
    published: data.published !== false,
  } satisfies Partial<Announcement> & { title: string; detail: string };
}

function normalizeVideoPayload(data: Partial<VideoItem> & { title: string }) {
  return {
    slug: cleanString(data.slug) ?? slugify(data.title),
    title: data.title.trim(),
    category: cleanString(data.category) ?? "Highlights",
    duration: cleanString(data.duration) ?? "00:00",
    url: cleanString(data.url),
    kind: cleanString(data.kind) ?? "Video",
    gameSlug: cleanString(data.gameSlug) ?? "pubg-pc",
    summary: cleanString(data.summary),
    imageUrl: cleanString(data.imageUrl),
    featured: Boolean(data.featured),
    published: data.published !== false,
    source: cleanString(data.source),
    youtubeVideoId: cleanString(data.youtubeVideoId),
    publishedAt: cleanString(data.publishedAt) ?? (data.published !== false ? new Date().toISOString() : undefined),
    deletedAt: cleanString(data.deletedAt),
    createdAt: cleanString(data.createdAt),
  } satisfies Partial<VideoItem> & { title: string };
}

function normalizeSponsorPayload(data: Partial<SponsorItem> & { name: string }) {
  const websiteUrl = cleanLinkUrl(data.websiteUrl ?? data.url);

  return {
    name: data.name.trim(),
    kind: data.kind ?? "partner",
    tier: cleanString(data.tier) ?? "Partner",
    url: websiteUrl,
    websiteUrl,
    socialUrl: cleanLinkUrl(data.socialUrl),
    logoUrl: cleanString(data.logoUrl),
    bannerUrl: cleanString(data.bannerUrl),
    designAssetUrl: cleanString(data.designAssetUrl),
    slug: cleanString(data.slug) ?? slugify(data.name),
    description: cleanString(data.description),
    supportedEvents: cleanStringArray(data.supportedEvents),
    eventSlugs: cleanStringArray(data.eventSlugs),
    partnershipHistory: cleanStringArray(data.partnershipHistory),
    visible: data.visible !== false,
    featured: Boolean(data.featured),
    published: data.published !== false,
    showOnHomepage: Boolean(data.showOnHomepage),
    showOnSponsorsPage: data.showOnSponsorsPage !== false,
    showOnEventPage: Boolean(data.showOnEventPage),
    showOnPubgPage: Boolean(data.showOnPubgPage),
    deletedAt: cleanString(data.deletedAt),
    createdAt: cleanString(data.createdAt),
  } satisfies Partial<SponsorItem> & { name: string };
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

async function fromDocumentStoreOrSeed<T>(
  collection: string,
  seed: T[],
  sortFn?: (a: T & { id: string }, b: T & { id: string }) => number,
  limit = 100
): Promise<(T & { id: string })[]> {
  if (!isDocumentStoreConfigured()) return seed as (T & { id: string })[];
  try {
    const docs = await fetchDocumentCollection<T>(collection, limit);
    if (docs.length === 0) return seed as (T & { id: string })[];
    return sortFn ? [...docs].sort(sortFn) : docs;
  } catch {
    return seed as (T & { id: string })[];
  }
}

async function oneFromDocumentStoreOrSeed<T extends { id: string }>(collection: string, id: string, seed: T[]): Promise<T | null> {
  if (!isDocumentStoreConfigured()) return seed.find((item) => item.id === id) ?? null;
  try {
    const doc = await getDocument<T>(collection, id);
    if (doc) return doc;
    return seed.find((item) => item.id === id) ?? null;
  } catch {
    return seed.find((item) => item.id === id) ?? null;
  }
}

export async function getSiteStats(): Promise<SiteStats> {
  if (!isDocumentStoreConfigured()) return seedStats;
  try {
    const doc = await getDocument<SiteStats>(COLLECTIONS.siteStats, "main");
    const mergedStats = {
      teamsRegistered: doc?.teamsRegistered ?? seedStats.teamsRegistered,
      matchesHosted: doc?.matchesHosted ?? seedStats.matchesHosted,
      tournamentsCompleted: doc?.tournamentsCompleted ?? seedStats.tournamentsCompleted,
      prizePoolsAwarded: sanitizePublicStatText(
        doc?.prizePoolsAwarded ?? seedStats.prizePoolsAwarded,
        "Prize pool announced"
      ),
      communityMembers: doc?.communityMembers ?? seedStats.communityMembers,
      youtubeViews: doc?.youtubeViews ?? seedStats.youtubeViews,
    } satisfies SiteStats;
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
  try {
    const seasons = await listCompetitionSeasons();
    if (seasons.length > 0) {
      return filterPublicSeasons(seasons).sort((a, b) => {
        const dateComparison = compareIsoDateDesc(a.startDate, b.startDate);
        if (dateComparison !== 0) return dateComparison;
        const createdAtComparison = (b.createdAt ?? "").localeCompare(a.createdAt ?? "");
        if (createdAtComparison !== 0) return createdAtComparison;
        return (b.seasonNumber ?? 0) - (a.seasonNumber ?? 0);
      });
    }
  } catch {
    // Fall back to the document compatibility layer when relational data is unavailable.
  }

  return filterPublicSeasons(await fromDocumentStoreOrSeed<Season>(COLLECTIONS.seasons, [], (a, b) => {
    const dateComparison = compareIsoDateDesc(a.startDate, b.startDate);
    if (dateComparison !== 0) return dateComparison;
    const createdAtComparison = (b.createdAt ?? "").localeCompare(a.createdAt ?? "");
    if (createdAtComparison !== 0) return createdAtComparison;
    return (b.seasonNumber ?? 0) - (a.seasonNumber ?? 0);
  }));
}

export async function getSeason(id: string): Promise<Season | null> {
  try {
    const season = await getCompetitionSeason(id);
    if (season) {
      return season;
    }
  } catch {
    // Fall back to the document compatibility layer when relational data is unavailable.
  }

  return oneFromDocumentStoreOrSeed(COLLECTIONS.seasons, id, []);
}

export async function getCurrentSeason(): Promise<Season | null> {
  try {
    const season = await getCurrentCompetitionSeason();
    if (season) {
      return season;
    }
  } catch {
    // Fall back to the document compatibility layer when relational data is unavailable.
  }

  const seasons = await getSeasons();
  return (
    seasons.find((season) => season.status === "active") ??
    seasons.find((season) => season.status === "planned") ??
    seasons[0] ??
    null
  );
}

async function ensureSeasonTeamSlots(seasonId: string, seasonTitle: string) {
  if (!isDocumentStoreConfigured()) {
    return;
  }

  const existingSeasonTeams = await queryDocumentCollection<Team>(COLLECTIONS.teams, "seasonId", seasonId, 500).catch(
    () => []
  );
  const hasScopedSeasonTeams = existingSeasonTeams.some((team) => team.scope === "season");

  if (hasScopedSeasonTeams) {
    return;
  }

  const now = new Date().toISOString();
  const operations = getBravoCanonicalTeams().map((team) => ({
    type: "set" as const,
    collectionName: COLLECTIONS.teams,
    docId: `${seasonId}--${team.id}`,
    data: {
      name: team.name,
      tag: team.tag,
      slotNumber: team.slotNumber,
      totalPoints: 0,
      kills: 0,
      matches: 0,
      killPoints: 0,
      placementPoints: 0,
      averagePlacement: 0,
      chickenDinners: 0,
      status: "active",
      registrationStatus: "approved",
      scope: "season",
      seasonId,
      seasonTitle,
      seasonDayNumbers: [],
      sourceProvider: "season_bootstrap",
      createdAt: now,
    } satisfies Partial<Team> & { name: string },
    merge: true,
  }));

  await Promise.all(
    operations.map((operation) =>
      saveDocument(operation.collectionName, operation.docId, operation.data as Record<string, unknown>)
    )
  );
}

export async function saveSeason(data: Partial<Season> & { title: string }, id?: string) {
  const savedSeason = await saveCompetitionSeason(data, id);
  const compatibilityPayload = normalizeSeasonPayload(savedSeason);

  if (isDocumentStoreConfigured()) {
    await saveDocument(
      COLLECTIONS.seasons,
      savedSeason.id,
      compatibilityPayload as unknown as Record<string, unknown>
    );
    await ensureSeasonTeamSlots(savedSeason.id, savedSeason.seriesTitle ?? savedSeason.title);
  }

  return savedSeason;
}

export async function deleteSeason(id: string) {
  await deleteCompetitionSeason(id).catch(() => null);
  if (isDocumentStoreConfigured()) {
    await deleteDocument(COLLECTIONS.seasons, id);
  }
  return { id, deleted: true };
}

export async function getSeasonTournaments(seasonId: string): Promise<Tournament[]> {
  try {
    const [season, tournaments] = await Promise.all([getCompetitionSeason(seasonId), listCompetitionEvents()]);
    if (season) {
      return tournaments
        .filter((tournament) => tournament.seasonId === season.id)
        .sort(
          (firstTournament, secondTournament) =>
            (firstTournament.seasonDayNumber ?? Number.POSITIVE_INFINITY) -
              (secondTournament.seasonDayNumber ?? Number.POSITIVE_INFINITY) ||
            firstTournament.startDate.localeCompare(secondTournament.startDate)
        );
    }
  } catch {
    // Fall back to the document compatibility layer when relational data is unavailable.
  }

  if (!isDocumentStoreConfigured()) return [];
  try {
    const tournaments = await queryDocumentCollection<Tournament>(COLLECTIONS.tournaments, "seasonId", seasonId, 200);
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
  if (!isDocumentStoreConfigured()) return [];
  try {
    const standings = await queryDocumentCollection<TournamentStanding>(COLLECTIONS.standings, "seasonId", seasonId, 500);
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
  try {
    const [season, leaderboard] = await Promise.all([
      getCompetitionSeason(seasonId),
      getCompetitionSeasonLeaderboardRows(seasonId),
    ]);
    if (season) {
      return leaderboard;
    }
  } catch {
    // Fall back to the document compatibility layer when relational data is unavailable.
  }

  const [standings, teams] = await Promise.all([getSeasonStandings(seasonId), getTeams()]);
  const seasonTeams = filterPublicTeams(teams.filter((team) => team.seasonId === seasonId && team.scope !== "tournament"));
  const teamsById = new Map(seasonTeams.map((team) => [team.id, team]));
  return seasonLeaderboardToRows(buildSeasonLeaderboard(standings, teamsById));
}

export async function getSeasonTeams(seasonId: string): Promise<Team[]> {
  try {
    const [season, teams] = await Promise.all([getCompetitionSeason(seasonId), getCompetitionSeasonTeams(seasonId)]);
    if (season) {
      return filterPublicTeams(teams).sort((firstTeam, secondTeam) => compareBravoTeamSlotOrder(firstTeam, secondTeam));
    }
  } catch {
    // Fall back to the document compatibility layer when relational data is unavailable.
  }

  if (!isDocumentStoreConfigured()) return [];
  try {
    const teams = await queryDocumentCollection<Team>(COLLECTIONS.teams, "seasonId", seasonId, 500);
    return teams
      .filter((team) => team.scope === "season")
      .map(normalizeStoredTeam)
      .sort((firstTeam, secondTeam) => compareBravoTeamSlotOrder(firstTeam, secondTeam));
  } catch {
    return [];
  }
}

export async function getSeasonPlayers(seasonId: string): Promise<Player[]> {
  try {
    const [season, players] = await Promise.all([getCompetitionSeason(seasonId), getCompetitionSeasonPlayers(seasonId)]);
    if (season) {
      return players.sort((firstPlayer, secondPlayer) => comparePlayerLeaderboardPerformance(firstPlayer, secondPlayer));
    }
  } catch {
    // Fall back to the document compatibility layer when relational data is unavailable.
  }

  if (!isDocumentStoreConfigured()) return [];
  try {
    const players = await queryDocumentCollection<Player>(COLLECTIONS.players, "seasonId", seasonId, 1500);
    return players
      .filter((player) => player.scope === "season")
      .sort((firstPlayer, secondPlayer) => comparePlayerLeaderboardPerformance(firstPlayer, secondPlayer));
  } catch {
    return [];
  }
}

async function buildSeasonOverview(season: Season | null) {
  if (!season || !isPubliclyVisibleSeason(season)) return null;

  const [seasonTournaments, seasonLeaderboard, seasonTeams, seasonPlayers] = await Promise.all([
    getSeasonTournaments(season.id),
    getSeasonLeaderboard(season.id),
    getSeasonTeams(season.id),
    getSeasonPlayers(season.id),
  ]);
  const publicSeasonTeams = filterPublicTeams(seasonTeams);

  const orderedTournaments = [...seasonTournaments].sort(
    (firstTournament, secondTournament) =>
      (firstTournament.seasonDayNumber ?? Number.POSITIVE_INFINITY) -
        (secondTournament.seasonDayNumber ?? Number.POSITIVE_INFINITY) ||
      firstTournament.startDate.localeCompare(secondTournament.startDate)
  );
  const currentTournament =
    orderedTournaments.find((tournament) => tournament.id === season.currentTournamentId) ??
    orderedTournaments.find((tournament) => tournament.seasonDayNumber === season.currentDay) ??
    null;
  const matchesPlayed = orderedTournaments.reduce(
    (totalMatches, tournament) => totalMatches + (tournament.matchCount ?? 0),
    0
  );
  const completedDays = orderedTournaments.filter((tournament) => (tournament.matchCount ?? 0) > 0).length;

  return {
    season,
    tournaments: orderedTournaments,
    leaderboard: seasonLeaderboard,
    teams: publicSeasonTeams,
    players: seasonPlayers,
    currentTournament,
    registeredTeams: publicSeasonTeams.length,
    matchesPlayed,
    completedDays,
    recentResults: orderedTournaments.filter((tournament) => (tournament.matchCount ?? 0) > 0).slice(-3).reverse(),
  };
}

export async function getSeasonBySlug(seasonIdOrSlug: string) {
  try {
    const season = await getCompetitionSeason(seasonIdOrSlug);
    if (season) {
      return season;
    }
  } catch {
    // Fall back to the document compatibility layer when relational data is unavailable.
  }

  const seasons = await getSeasons();
  const normalizedSeasonIdOrSlug = seasonIdOrSlug.trim().toLowerCase();
  return seasons.find((season) => season.id === seasonIdOrSlug || season.slug.toLowerCase() === normalizedSeasonIdOrSlug) ?? null;
}

export async function getSeasonOverviewBySlug(seasonIdOrSlug: string) {
  return buildSeasonOverview(await getSeasonBySlug(seasonIdOrSlug));
}

export async function getCurrentSeasonOverview() {
  return buildSeasonOverview(await getCurrentSeason());
}

export async function getTournaments(
  status?: string,
  options: { includeInternal?: boolean } = {}
): Promise<Tournament[]> {
  try {
    const [tournaments, seasons] = await Promise.all([listCompetitionEvents(), listCompetitionSeasons()]);
    if (tournaments.length > 0 || seasons.length > 0) {
      const scopedTournaments = options.includeInternal
        ? tournaments
        : tournaments.filter((tournament) => isPubliclyVisibleTournament(tournament)).map((tournament) => sanitizePublicTournament(tournament));
      if (!status) {
        return scopedTournaments;
      }

      return scopedTournaments.filter((tournament) => tournament.status === status);
    }
  } catch {
    // Fall back to the document compatibility layer when relational data is unavailable.
  }

  const all = await fromDocumentStoreOrSeed<Tournament>(COLLECTIONS.tournaments, seedTournaments, (a, b) => {
    const dateComparison = compareIsoDateDesc(a.startDate, b.startDate);
    if (dateComparison !== 0) return dateComparison;
    return a.title.localeCompare(b.title);
  });
  const scopedTournaments = options.includeInternal
    ? all
    : all.filter((tournament) => isPubliclyVisibleTournament(tournament)).map((tournament) => sanitizePublicTournament(tournament));
  if (!status) return scopedTournaments;
  return scopedTournaments.filter((t) => t.status === status);
}

export async function getTournament(id: string): Promise<Tournament | null> {
  try {
    const tournament = await getCompetitionEvent(id);
    if (tournament) {
      return tournament;
    }
  } catch {
    // Fall back to the document compatibility layer when relational data is unavailable.
  }

  return oneFromDocumentStoreOrSeed(COLLECTIONS.tournaments, id, seedTournaments);
}

export async function getPublicTournament(id: string): Promise<Tournament | null> {
  const tournament = await getTournament(id);
  if (!tournament || !isPubliclyVisibleTournament(tournament)) {
    return null;
  }

  return sanitizePublicTournament(tournament);
}

export async function saveTournament(data: Partial<Tournament> & { title: string }, id?: string) {
  const savedTournament = await saveCompetitionEvent(data, id);
  const compatibilityPayload = normalizeTournamentPayload(savedTournament);
  if (isDocumentStoreConfigured()) {
    await saveDocument(
      COLLECTIONS.tournaments,
      savedTournament.id,
      compatibilityPayload as unknown as Record<string, unknown>
    );
  }
  return savedTournament;
}

export async function deleteTournament(id: string) {
  await deleteCompetitionEvent(id).catch(() => null);
  if (isDocumentStoreConfigured()) {
    await deleteDocument(COLLECTIONS.tournaments, id);
  }
  return { id, deleted: true };
}

export async function getTournamentMatches(
  tournamentId: string,
  options: { includeDrafts?: boolean } = {}
): Promise<TournamentMatch[]> {
  try {
    const tournament = await getCompetitionEvent(tournamentId);
    if (tournament) {
      const matches = await getCompetitionMatchesForEvent(tournament.id, options);
      return matches.sort((firstMatch, secondMatch) => compareMatchSequenceOrder(firstMatch, secondMatch));
    }
  } catch {
    // Fall back to the document compatibility layer when relational data is unavailable.
  }

  if (!isDocumentStoreConfigured()) return [];
  try {
    let matches = await queryDocumentCollection<TournamentMatch>(COLLECTIONS.matches, "tournamentId", tournamentId, 200);
    if (matches.length === 0) {
      matches = await queryDocumentCollection<TournamentMatch>(COLLECTIONS.tournamentMatches, "tournamentId", tournamentId, 200);
    }
    const visibleMatches = filterSoftDeleted(matches)
      .map(normalizeStoredTournamentMatch)
      .filter((m) => m.dataSource === "pubg_api" || m.syncedAt);

    return (options.includeDrafts ? visibleMatches : visibleMatches.filter(isPublishedTournamentMatch))
      .sort((firstMatch, secondMatch) => compareMatchSequenceOrder(firstMatch, secondMatch));
  } catch {
    return [];
  }
}

export async function getTournamentStandings(tournamentId: string): Promise<TournamentStanding[]> {
  try {
    const tournament = await getCompetitionEvent(tournamentId);
    if (tournament) {
      const matches = await getCompetitionMatchesForEvent(tournament.id);
      return buildTournamentStandings(tournament.id, tournament.title, matches);
    }
  } catch {
    // Fall back to the document compatibility layer when relational data is unavailable.
  }

  if (!isDocumentStoreConfigured()) return [];
  try {
    const standings = await queryDocumentCollection<TournamentStanding>(COLLECTIONS.standings, "tournamentId", tournamentId, 100);
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
  try {
    const tournament = await getCompetitionEvent(tournamentId);
    if (tournament) {
      const [matches, seasonTeams] = await Promise.all([
        getCompetitionMatchesForEvent(tournament.id),
        tournament.seasonId ? getCompetitionSeasonTeams(tournament.seasonId) : listCompetitionTeams(),
      ]);
      const teamIds = new Set<string>(tournament.registeredTeamIds ?? []);
      const fallbackTeams = new Map<string, Team>();

      for (const match of matches) {
        for (const teamResult of match.teamResults ?? []) {
          if (teamResult.teamId) {
            teamIds.add(teamResult.teamId);
          }

          const fallbackId = teamResult.teamId ?? slugify(teamResult.teamName);
          if (!fallbackTeams.has(fallbackId)) {
            fallbackTeams.set(fallbackId, {
              id: fallbackId,
              slug: slugify(teamResult.teamName),
              name: teamResult.teamName,
              slotNumber: teamResult.slotNumber,
              totalPoints: 0,
              kills: 0,
              matches: 0,
              scope: "tournament",
              sourceTournamentId: tournament.id,
              sourceTournamentTitle: tournament.title,
            });
          }
        }
      }

      const teams = seasonTeams.filter((team) => teamIds.has(team.id));
      const knownTeamKeys = new Set(teams.map((team) => team.id));
      const supplementalTeams = Array.from(fallbackTeams.values()).filter((team) => !knownTeamKeys.has(team.id));
      return [...teams, ...supplementalTeams].sort((firstTeam, secondTeam) => compareBravoTeamSlotOrder(firstTeam, secondTeam));
    }
  } catch {
    // Fall back to the document compatibility layer when relational data is unavailable.
  }

  if (!isDocumentStoreConfigured()) return [];
  try {
    const teams = await queryDocumentCollection<Team>(COLLECTIONS.teams, "sourceTournamentId", tournamentId, 100);
    return teams.map(normalizeStoredTeam).sort((firstTeam, secondTeam) => compareBravoTeamSlotOrder(firstTeam, secondTeam));
  } catch {
    return [];
  }
}

export async function getTournamentPlayers(tournamentId: string): Promise<Player[]> {
  try {
    const tournament = await getCompetitionEvent(tournamentId);
    if (tournament) {
      const [matches, seasonPlayers] = await Promise.all([
        getCompetitionMatchesForEvent(tournament.id),
        tournament.seasonId ? getCompetitionSeasonPlayers(tournament.seasonId) : listCompetitionPlayers(),
      ]);
      const playerIds = new Set<string>();
      const fallbackPlayers = new Map<string, Player>();

      for (const match of matches) {
        for (const playerResult of match.playerResults ?? []) {
          if (playerResult.playerId) {
            playerIds.add(playerResult.playerId);
          }

          const fallbackId = playerResult.playerId || playerResult.pubgPlayerId || slugify(playerResult.playerName);
          if (!fallbackPlayers.has(fallbackId)) {
            fallbackPlayers.set(fallbackId, {
              id: fallbackId,
              slug: slugify(playerResult.playerName),
              name: playerResult.playerName,
              inGameName: playerResult.playerName,
              teamId: playerResult.teamId,
              teamName: playerResult.teamName,
              pubgId: playerResult.pubgPlayerId,
              pubgName: playerResult.playerName,
              kills: 0,
              damage: 0,
              mvpCount: 0,
              chickenDinners: 0,
              matches: 0,
              scope: "tournament",
              sourceTournamentId: tournament.id,
              sourceTournamentTitle: tournament.title,
            });
          }
        }
      }

      const players = seasonPlayers.filter((player) => playerIds.has(player.id));
      const knownPlayerKeys = new Set(players.map((player) => player.id));
      const supplementalPlayers = Array.from(fallbackPlayers.values()).filter((player) => !knownPlayerKeys.has(player.id));
      return [...players, ...supplementalPlayers].sort((firstPlayer, secondPlayer) =>
        comparePlayerLeaderboardPerformance(firstPlayer, secondPlayer)
      );
    }
  } catch {
    // Fall back to the document compatibility layer when relational data is unavailable.
  }

  if (!isDocumentStoreConfigured()) return [];
  try {
    const players = await queryDocumentCollection<Player>(COLLECTIONS.players, "sourceTournamentId", tournamentId, 500);
    return players.sort((firstPlayer, secondPlayer) => comparePlayerLeaderboardPerformance(firstPlayer, secondPlayer));
  } catch {
    return [];
  }
}

export async function getScrims(): Promise<Scrim[]> {
  if (!isDocumentStoreConfigured()) return [];
  try {
    const scrims = await fetchDocumentCollection<Scrim>(COLLECTIONS.scrims, 100);
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

export async function getScrimDayResults(options: { includeDrafts?: boolean } = {}): Promise<ScrimDayResult[]> {
  const scrims = await getScrims();
  if (scrims.length === 0) return [];

  let matchResults: TournamentMatch[] = [];
  if (isDocumentStoreConfigured()) {
    try {
      const [liveResults, storedMatches, legacyTournamentMatches] = await Promise.all([
        fetchDocumentCollection<TournamentMatch>(COLLECTIONS.matchResults, 500),
        fetchDocumentCollection<TournamentMatch>(COLLECTIONS.matches, 500),
        fetchDocumentCollection<TournamentMatch>(COLLECTIONS.tournamentMatches, 500),
      ]);

      const uniqueMatches = new Map<string, TournamentMatch>();
      for (const match of [...storedMatches, ...legacyTournamentMatches, ...liveResults]) {
        uniqueMatches.set(match.id, match);
      }

      const normalizedMatches = filterSoftDeleted(Array.from(uniqueMatches.values()).map(normalizeStoredTournamentMatch));
      matchResults = options.includeDrafts ? normalizedMatches : normalizedMatches.filter(isPublishedTournamentMatch);
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
  if (isDocumentStoreConfigured()) {
    await saveDocument(COLLECTIONS.matches, data.id, data as unknown as Record<string, unknown>);
    await saveDocument(COLLECTIONS.tournamentMatches, data.id, data as unknown as Record<string, unknown>);
  }
  return data;
}

export async function getTeams(): Promise<Team[]> {
  try {
    const [teams, currentSeason] = await Promise.all([listCompetitionTeams(), getCurrentCompetitionSeason().catch(() => null)]);
    if (teams.length > 0 || currentSeason) {
      return filterPublicTeams(teams.filter((team) => team.scope !== "tournament")).sort((firstTeam, secondTeam) =>
        compareBravoTeamSlotOrder(firstTeam, secondTeam)
      );
    }
  } catch {
    // Fall back to the document compatibility layer when relational data is unavailable.
  }

  const teams = filterSoftDeleted(
    (
    await fromDocumentStoreOrSeed<Team>(COLLECTIONS.teams, [], (a, b) => compareBravoTeamSlotOrder(a, b), 500)
    ).map(normalizeStoredTeam)
  );

  const visibleTeams = filterPublicTeams(teams.filter((team) => team.scope !== "tournament"));
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
  const team =
    (await getDocumentByIdOrSlug<Team & { id: string }>(COLLECTIONS.teams, id)) ??
    (await oneFromDocumentStoreOrSeed(COLLECTIONS.teams, id, []));
  return team ? normalizeStoredTeam(team) : null;
}

export async function getTeamMatchPlayers(teamName: string): Promise<MatchPlayerRecord[]> {
  if (!isDocumentStoreConfigured()) return [];
  try {
    const matchPlayers = await queryDocumentCollection<MatchPlayerRecord>(COLLECTIONS.matchPlayers, "teamName", teamName, 2000);
    return normalizeStoredMatchPlayers(matchPlayers);
  } catch {
    return [];
  }
}

export async function saveTeam(data: Partial<Team> & { name: string }, id?: string) {
  const payload = normalizeTeamPayload(data);
  const docId = id ?? resolveBravoTeamIdentity(payload.name)?.id ?? payload.slug ?? slugify(payload.name);
  const now = new Date().toISOString();
  const slug = await ensureUniqueDocumentSlug(COLLECTIONS.teams, payload.slug ?? payload.name, docId, payload.name);
  const nextPayload = {
    ...payload,
    slug,
    deletedAt: undefined,
    createdAt: payload.createdAt ?? now,
    updatedAt: now,
  };
  if (isDocumentStoreConfigured()) {
    await saveDocument(COLLECTIONS.teams, docId, nextPayload as Record<string, unknown>);
  }
  return { id: docId, ...nextPayload };
}

export async function deleteTeam(id: string) {
  if (isDocumentStoreConfigured()) {
    await softDeleteDocumentEntity(COLLECTIONS.teams, id);
  }
  return { id, deleted: true };
}

export async function getPlayers(): Promise<Player[]> {
  try {
    const [players, currentSeason] = await Promise.all([
      listCompetitionPlayers(),
      getCurrentCompetitionSeason().catch(() => null),
    ]);
    if (players.length > 0 || currentSeason) {
      return players
        .map((player) => sanitizePublicPlayer(player))
        .sort((firstPlayer, secondPlayer) => comparePlayerLeaderboardPerformance(firstPlayer, secondPlayer));
    }
  } catch {
    // Fall back to the document compatibility layer when relational data is unavailable.
  }

  const players = filterSoftDeleted(await fromDocumentStoreOrSeed<Player>(
    COLLECTIONS.players,
    [],
    (firstPlayer, secondPlayer) => comparePlayerLeaderboardPerformance(firstPlayer, secondPlayer),
    1500
  ));
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

  return visiblePlayers
    .map((player) => sanitizePublicPlayer(player))
    .sort((firstPlayer, secondPlayer) => comparePlayerLeaderboardPerformance(firstPlayer, secondPlayer));
}

export async function getPlayer(id: string): Promise<Player | null> {
  return (
    (await getDocumentByIdOrSlug<Player & { id: string }>(COLLECTIONS.players, id)) ??
    (await oneFromDocumentStoreOrSeed(COLLECTIONS.players, id, []))
  );
}

export async function getPublicPlayer(id: string): Promise<Player | null> {
  const normalizedId = id.trim().toLowerCase();
  const players = await getPlayers();
  return players.find((player) => player.id === id || (player.slug ?? "").toLowerCase() === normalizedId) ?? null;
}

export async function getPlayerMatchPlayers(sourcePlayerId: string): Promise<MatchPlayerRecord[]> {
  if (!isDocumentStoreConfigured()) return [];
  try {
    const matchPlayers = await queryDocumentCollection<MatchPlayerRecord>(
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
  const docId = id ?? payload.slug ?? slugify(payload.name);
  const now = new Date().toISOString();
  const slug = await ensureUniqueDocumentSlug(
    COLLECTIONS.players,
    payload.slug ?? payload.inGameName ?? payload.pubgName ?? payload.name,
    docId,
    payload.name
  );
  const nextPayload = {
    ...payload,
    slug,
    deletedAt: undefined,
    createdAt: payload.createdAt ?? now,
    updatedAt: now,
  };
  if (isDocumentStoreConfigured()) {
    await saveDocument(COLLECTIONS.players, docId, nextPayload as Record<string, unknown>);
  }
  return { id: docId, ...nextPayload };
}

export async function deletePlayer(id: string) {
  if (isDocumentStoreConfigured()) {
    await softDeleteDocumentEntity(COLLECTIONS.players, id);
  }
  return { id, deleted: true };
}

export async function getLeaderboard(): Promise<LeaderboardRow[]> {
  try {
    const currentSeason = await getCurrentCompetitionSeason();
    if (currentSeason) {
      return await getCompetitionSeasonLeaderboardRows(currentSeason.id);
    }
  } catch {
    // Fall back to the document compatibility layer when relational data is unavailable.
  }

  const currentSeason = await getCurrentSeason();
  if (currentSeason) {
    const seasonLeaderboard = await getSeasonLeaderboard(currentSeason.id);
    if (seasonLeaderboard.length > 0) return seasonLeaderboard;
  }

  if (!isDocumentStoreConfigured()) return [];
  try {
    const teams = await fetchDocumentCollection<Team>(COLLECTIONS.teams, 400);
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
  const all = await fromDocumentStoreOrSeed<Announcement>(COLLECTIONS.announcements, seedAnnouncements);
  return all
    .filter((announcement) => announcement.published !== false)
    .map((announcement) => sanitizePublicAnnouncement(announcement))
    .filter((announcement): announcement is Announcement => Boolean(announcement));
}

export async function saveAnnouncement(data: Partial<Announcement> & { title: string; detail: string }, id?: string) {
  const payload = normalizeAnnouncementPayload(data);
  const docId = id ?? `ann-${Date.now()}`;
  if (isDocumentStoreConfigured()) {
    await saveDocument(COLLECTIONS.announcements, docId, payload as Record<string, unknown>);
  }
  return { id: docId, ...payload };
}

export async function deleteAnnouncement(id: string) {
  if (isDocumentStoreConfigured()) {
    await deleteDocument(COLLECTIONS.announcements, id);
  }
  return { id, deleted: true };
}

export async function getStreams(): Promise<StreamSchedule[]> {
  const streams = await fromDocumentStoreOrSeed(COLLECTIONS.streams, seedStreams);
  return streams
    .map((stream) => sanitizePublicStream(stream))
    .filter((stream): stream is StreamSchedule => Boolean(stream));
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
    time: activeStream?.time ?? "Schedule to be announced",
    title: activeStream?.title ?? "Bravo Gaming Esports Live Feed",
    platform: activeStream?.platform ?? "YouTube",
    isLive: activeStream?.isLive ?? false,
    description:
      activeStream?.description ??
      "No featured broadcast is currently scheduled. Please check back later for upcoming live streams and featured broadcasts.",
    viewers: activeStream?.viewers,
    embedUrl: activeStream?.embedUrl ?? buildLiveEmbedUrl(),
    channelUrl: activeStream?.channelUrl ?? buildYouTubeChannelUrl(),
    supportUrl: activeStream?.supportUrl ?? BRAVO_DISCORD_URL,
  };
}

export async function getVideos(options: { includeUnpublished?: boolean } = {}): Promise<VideoItem[]> {
  const videos = await fromDocumentStoreOrSeed(COLLECTIONS.videos, seedVideos);
  const visibleVideos = filterSoftDeleted(videos);
  if (options.includeUnpublished) {
    return visibleVideos;
  }

  return visibleVideos
    .filter((video) => video.published !== false)
    .map((video) => sanitizePublicVideo(video))
    .filter((video): video is VideoItem => Boolean(video));
}

export async function saveVideo(data: Partial<VideoItem> & { title: string }, id?: string) {
  const payload = normalizeVideoPayload(data);
  const docId = id ?? payload.slug ?? slugify(payload.title);
  const now = new Date().toISOString();
  const slug = await ensureUniqueDocumentSlug(COLLECTIONS.videos, payload.slug ?? payload.title, docId, payload.title);
  const nextPayload = {
    ...payload,
    slug,
    deletedAt: undefined,
    createdAt: payload.createdAt ?? now,
    updatedAt: now,
    publishedAt: payload.published !== false ? payload.publishedAt ?? now : payload.publishedAt,
  };
  if (isDocumentStoreConfigured()) {
    await saveDocument(COLLECTIONS.videos, docId, nextPayload as Record<string, unknown>);
  }
  return { id: docId, ...nextPayload };
}

export async function deleteVideo(id: string) {
  if (isDocumentStoreConfigured()) {
    await softDeleteDocumentEntity(COLLECTIONS.videos, id);
  }
  return { id, deleted: true };
}

export async function getSponsors(options: { includeUnpublished?: boolean } = {}): Promise<SponsorItem[]> {
  const sponsors = await fromDocumentStoreOrSeed<SponsorItem>(COLLECTIONS.sponsors, seedSponsors);
  const visibleSponsors = filterSoftDeleted(sponsors);
  if (options.includeUnpublished) {
    return visibleSponsors;
  }

  return visibleSponsors
    .filter((sponsor) => sponsor.published !== false)
    .map((sponsor) => sanitizePublicSponsor(sponsor))
    .filter((sponsor): sponsor is SponsorItem => Boolean(sponsor));
}

export async function saveSponsor(data: Partial<SponsorItem> & { name: string }, id?: string) {
  const payload = normalizeSponsorPayload(data);
  const docId = id ?? payload.slug ?? slugify(payload.name);
  const now = new Date().toISOString();
  const slug = await ensureUniqueDocumentSlug(COLLECTIONS.sponsors, payload.slug ?? payload.name, docId, payload.name);
  const nextPayload = {
    ...payload,
    slug,
    deletedAt: undefined,
    createdAt: payload.createdAt ?? now,
    updatedAt: now,
  };
  if (isDocumentStoreConfigured()) {
    await saveDocument(COLLECTIONS.sponsors, docId, nextPayload as Record<string, unknown>);
  }
  return { id: docId, ...nextPayload };
}

export async function deleteSponsor(id: string) {
  if (isDocumentStoreConfigured()) {
    await softDeleteDocumentEntity(COLLECTIONS.sponsors, id);
  }
  return { id, deleted: true };
}

export async function getRegistrations(): Promise<TeamRegistration[]> {
  if (!isDocumentStoreConfigured()) return [];
  try {
    const registrations = await fetchDocumentCollection<TeamRegistration>(COLLECTIONS.registrations);
    return registrations.sort((firstRegistration, secondRegistration) =>
      compareIsoDateDesc(firstRegistration.createdAt, secondRegistration.createdAt)
    );
  } catch {
    return [];
  }
}

export async function getRegistration(id: string): Promise<TeamRegistration | null> {
  if (!isDocumentStoreConfigured()) return null;
  try {
    return await getDocument<TeamRegistration>(COLLECTIONS.registrations, id);
  } catch {
    return null;
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
    tournamentTitle: cleanString(data.tournamentTitle),
    logoUrl: cleanString(data.logoUrl),
    logoPath: cleanString(data.logoPath),
    logoUploadId: cleanString(data.logoUploadId),
    approvedTeamId: cleanString(data.approvedTeamId),
    status: "pending" as const,
    createdAt: new Date().toISOString(),
  };
  if (isDocumentStoreConfigured()) {
    const result = await createDocument(COLLECTIONS.registrations, payload);
    return { id: result.id, ...payload };
  }
  return { id: `reg-${Date.now()}`, ...payload };
}

export async function updateRegistrationStatus(
  id: string,
  status: TeamRegistration["status"],
  updates: Partial<Omit<TeamRegistration, "id" | "status" | "createdAt">> = {}
) {
  const payload = {
    status,
    updatedAt: new Date().toISOString(),
    approvedTeamId: cleanString(updates.approvedTeamId),
    logoPath: cleanString(updates.logoPath),
    logoUploadId: cleanString(updates.logoUploadId),
    logoUrl: cleanString(updates.logoUrl),
    tournamentId: cleanString(updates.tournamentId),
    tournamentTitle: cleanString(updates.tournamentTitle),
  } satisfies Partial<TeamRegistration>;

  if (isDocumentStoreConfigured()) {
    await saveDocument(COLLECTIONS.registrations, id, payload as Record<string, unknown>);
  }
  return { id, ...payload };
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

export async function seedDocumentStore() {
  if (!isDocumentStoreConfigured()) {
    return { seeded: false, message: "Supabase document store not configured." };
  }

  await saveDocument(COLLECTIONS.siteStats, "main", seedStats as unknown as Record<string, unknown>);

  for (const t of seedTournaments) {
    const { id, ...rest } = t;
    await saveDocument(COLLECTIONS.tournaments, id, rest as unknown as Record<string, unknown>);
  }
  for (const a of seedAnnouncements) {
    const { id, ...rest } = a;
    await saveDocument(COLLECTIONS.announcements, id, rest as unknown as Record<string, unknown>);
  }
  return { seeded: true, message: "Supabase document store seeded only with neutral platform defaults." };
}

export async function getAdminDashboardStats() {
  const [teams, players, tournaments, registrations, scrims, seasons, dataBackend] = await Promise.all([
    getTeams(),
    getPlayers(),
    getTournaments(),
    getRegistrations(),
    getScrims(),
    getSeasons(),
    getConfiguredDataBackend().catch(() => null),
  ]);

  const completedTournaments = tournaments.filter((t) => t.status === "COMPLETED").length;
  const liveTournaments = tournaments.filter((t) => t.status === "LIVE").length;
  const totalMatches = tournaments.reduce((sum, tournament) => sum + (tournament.matchCount ?? 0), 0);
  const pendingRegistrations = registrations.filter((r) => r.status === "pending").length;
  const activeSeason = seasons.find((season) => season.status === "active") ?? seasons[0];

  const recentUploads = await getRecentUploadRecords(5).catch(() => []);

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
    dataConnected: isDocumentStoreConfigured(),
    dataAdminConnected: isDocumentStoreAdminConfigured(),
    dataBackend: dataBackend ?? (isDocumentStoreConfigured() ? "supabase" : null),
    totalSeasons: seasons.length,
    activeSeasonTitle: activeSeason?.seriesTitle ?? activeSeason?.title,
    activeSeasonDay: activeSeason?.currentDay,
    activeSeasonLength: activeSeason?.configuredDays,
  };
}

