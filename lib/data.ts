import { BRAVO_DISCORD_URL } from "./brand-links";
import { canonicalPlayerMetadata } from "./player-profile-input";
import { buildScrimDayResultsFromCollections } from "./bravo-live-derivations";
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
  getCompetitionEvent,
  competitionEventIdentityExists,
  getCompetitionPlayer,
  saveCompetitionPlayer,
  archiveCompetitionPlayer,
  getCompetitionMatchesForEvent,
  getCompetitionSeason,
  getCompetitionSeasonLeaderboardRows,
  getCompetitionSeasonPlayers,
  getCompetitionSeasonTeams,
  getCurrentCompetitionSeason,
  listCompetitionEvents,
  listCompetitionPlayers,
  listCompetitionSeasons,
  listCompetitionTeams,
  saveCompetitionEvent,
  saveCompetitionSeason,
} from "./competition-relational";
import { formatAnnouncementDate } from "./display-format";
import { ensureUniqueDocumentSlug, filterSoftDeleted, getDocumentByIdOrSlug, softDeleteDocumentEntity } from "./document-entities";
import { createEventRegistrationTransaction } from "./event-registration-transaction";
import { parseEventSchedule, publicEventSchedule } from "./event-schedule";
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
  saveDocumentIfFieldsMatch,
} from "./document-store";
import { hasPublicDemoMarker, sanitizePublicAssetUrl, sanitizePublicCopy } from "./public-content";
import { claimStagedAdminPublicAssets } from "./public-asset-cleanup";
import { resolvePublicEventPolicy } from "./public-event-policy";
import { isExplicitlyPublishedMatch, sanitizePublicMatch } from "./public-match";
import { selectPublicScrims } from "./public-scrims";
import { normalizeSponsorClickDestination, normalizeSponsorExternalUrl, validateSponsorDestinations } from "./sponsor-links";
import { compareMatchSequenceOrder, comparePlayerLeaderboardPerformance, sortMvpRanking, sortTournamentStandings } from "./ranking-sort";
import { buildSeasonLeaderboard, seasonLeaderboardToRows } from "./season-standings";
import { slugify } from "./slug-utils";
import { buildTournamentStandings } from "./tournament-standings";
import type {
  Announcement,
  LeaderboardRow,
  Player,
  Scrim,
  ScrimDayResult,
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
import { getRecentUploadRecords } from "./upload-records";

const DEFAULT_YOUTUBE_CHANNEL_URL = "https://www.youtube.com/@bravogamingnepal7981";

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

type ExplicitPublicationRecord = {
  published?: boolean;
  publishedAt?: string | null;
};

export function isExplicitlyPublishedContent(
  record: ExplicitPublicationRecord,
  options: { requirePublishedAt?: boolean; now?: number } = {},
) {
  if (record.published !== true) {
    return false;
  }

  const publishedAt = cleanString(record.publishedAt);
  if (!publishedAt) {
    return options.requirePublishedAt !== true;
  }

  const publicationTime = Date.parse(publishedAt);
  return Number.isFinite(publicationTime) && publicationTime <= (options.now ?? Date.now());
}

function isValidReachedDate(value?: string | null, now = Date.now()) {
  const normalizedValue = cleanString(value);
  if (!normalizedValue) return false;

  const date = Date.parse(normalizedValue);
  return Number.isFinite(date) && date <= now;
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
  return Boolean((team.playerIds?.length ?? 0) > 0 || cleanString(team.logoUrl ?? team.logo) || cleanString(team.country));
}

function isPubliclyVisibleTeamEntity(team: Team) {
  if (team.deletedAt || team.status !== "active") return false;
  if (
    hasPublicDemoMarker(
      team.id,
      team.name,
      team.tag,
      team.seasonTitle,
      team.sourceTournamentTitle,
      team.sourceTeamName,
      team.sourceProvider,
    )
  ) {
    return false;
  }
  if ((team.sourceProvider ?? "").trim() !== "season_bootstrap") return true;
  return hasTrackedTeamActivity(team) || hasManagedTeamProfile(team);
}

function isPubliclyVisibleTeam(team: Team) {
  return team.scope !== "tournament" && isPubliclyVisibleTeamEntity(team);
}

function filterPublicTeams(teams: Team[]) {
  return teams.filter((team) => isPubliclyVisibleTeam(team));
}

export function sanitizePublicTeam(team: Team): Team {
  const logoUrl = sanitizePublicAssetUrl(team.logoUrl ?? team.logo) ?? undefined;

  return {
    id: team.id,
    slug: team.slug,
    name: team.name,
    tag: team.tag,
    slotNumber: team.slotNumber,
    logo: logoUrl,
    logoUrl,
    country: team.country,
    rank: team.rank,
    totalPoints: team.totalPoints,
    kills: team.kills,
    matches: team.matches,
    killPoints: team.killPoints,
    placementPoints: team.placementPoints,
    averagePlacement: team.averagePlacement,
    chickenDinners: team.chickenDinners,
    status: team.status,
    registrationStatus: team.registrationStatus,
    playerIds: team.playerIds ? [...team.playerIds] : undefined,
    scope: team.scope,
    seasonId: team.seasonId,
    seasonTitle: hasPublicDemoMarker(team.seasonTitle) ? undefined : team.seasonTitle,
    seasonDayNumbers: team.seasonDayNumbers ? [...team.seasonDayNumbers] : undefined,
  };
}

function isPubliclyVisibleSeason(season: Season) {
  return (
    (season.status === "active" || season.status === "completed") &&
    !hasPublicDemoMarker(season.title, season.slug, season.seriesTitle, season.notes, season.description, season.sourceProvider)
  );
}

function filterPublicSeasons(seasons: Season[]) {
  return seasons.filter((season) => isPubliclyVisibleSeason(season));
}

function sanitizePublicSeason(season: Season): Season {
  return {
    id: season.id,
    title: season.title,
    slug: season.slug,
    seriesTitle: season.seriesTitle,
    seasonNumber: season.seasonNumber,
    status: season.status,
    startDate: season.startDate,
    configuredDays: season.configuredDays,
    currentDay: season.currentDay,
    endDate: season.endDate,
    completedAt: season.completedAt,
    endedEarly: season.endedEarly,
    description: sanitizePublicCopy(season.description),
    game: season.game,
    format: season.format,
    region: season.region,
    perspective: season.perspective,
  };
}

function isPubliclyVisibleTournament(tournament: Tournament) {
  const policy = resolvePublicEventPolicy({
    status: tournament.status,
    state: tournament.state,
    published: tournament.published,
    startDate: tournament.startDate,
    endDate: tournament.endDate,
    registrationStatus: tournament.registrationStatus,
    registrationStartDate: tournament.registrationStartDate,
    registrationEndDate: tournament.registrationEndDate,
    teamCount: tournament.teamCount,
    maxTeams: tournament.maxTeams,
  });

  return (
    isExplicitlyPublishedContent(tournament, { requirePublishedAt: true }) &&
    policy.published &&
    policy.lifecycle !== "draft" &&
    policy.lifecycle !== "cancelled" &&
    policy.lifecycle !== "archived" &&
    !hasPublicDemoMarker(
      tournament.id,
      tournament.title,
      tournament.seasonTitle,
      tournament.description,
      tournament.rules,
      tournament.schedule,
      tournament.sourceProvider,
      tournament.sourceUrl,
    )
  );
}

function sanitizePublicTournament(tournament: Tournament): Tournament {
  return {
    id: tournament.id,
    slug: tournament.slug,
    state: "published",
    published: true,
    publishedAt: tournament.publishedAt,
    title: tournament.title,
    tier: tournament.tier,
    status: tournament.status,
    prizePool: tournament.prizePool,
    teamCount: tournament.teamCount,
    maxTeams: tournament.maxTeams,
    startDate: tournament.startDate,
    endDate: tournament.endDate,
    registrationStatus: tournament.registrationStatus,
    registrationStartDate: tournament.registrationStartDate,
    registrationEndDate: tournament.registrationEndDate,
    format: tournament.format,
    mode: tournament.mode,
    server: tournament.server,
    perspective: tournament.perspective,
    description:
      sanitizePublicCopy(
        tournament.description,
        tournament.status === "COMPLETED"
          ? "Official event results and standings will appear here after publication."
          : "Official event details will appear here after publication.",
      ) ?? undefined,
    rules: hasPublicDemoMarker(tournament.rules) ? undefined : (tournament.rules ?? undefined),
    schedule: hasPublicDemoMarker(tournament.schedule) ? undefined : publicEventSchedule(tournament.schedule),
    mapRotation: tournament.mapRotation?.filter(Boolean),
    bannerUrl: sanitizePublicAssetUrl(tournament.bannerUrl ?? undefined) ?? undefined,
    registeredTeamIds: tournament.registeredTeamIds,
    seasonId: tournament.seasonId,
    seasonTitle: hasPublicDemoMarker(tournament.seasonTitle) ? undefined : (tournament.seasonTitle ?? undefined),
    seasonNumber: tournament.seasonNumber,
    seasonDayNumber: tournament.seasonDayNumber,
    dayNumber: tournament.dayNumber,
    matchCount: tournament.matchCount,
    createdAt: tournament.createdAt,
    updatedAt: tournament.updatedAt,
  };
}

function isPubliclyVisiblePlayer(player: Player, options: { allowTournamentScoped?: boolean } = {}) {
  return (
    (options.allowTournamentScoped || player.scope !== "tournament") &&
    !player.deletedAt &&
    player.playerStatus === "active" &&
    !hasPublicDemoMarker(
      player.id,
      player.name,
      player.realName,
      player.inGameName,
      player.pubgName,
      player.teamName,
      player.seasonTitle,
      player.sourceTournamentTitle,
      player.sourceProvider,
    )
  );
}

function sanitizePublicPlayer(player: Player): Player {
  return {
    id: player.id,
    slug: player.slug,
    name: player.name,
    realName: hasPublicDemoMarker(player.realName) ? undefined : (player.realName ?? undefined),
    inGameName: player.inGameName,
    teamId: player.teamId,
    teamName: player.teamName,
    avatar: sanitizePublicAssetUrl(player.avatar ?? undefined) ?? undefined,
    avatarUrl: sanitizePublicAssetUrl(player.avatarUrl ?? undefined) ?? undefined,
    pubgName: hasPublicDemoMarker(player.pubgName) ? undefined : (player.pubgName ?? undefined),
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
    seasonTitle: hasPublicDemoMarker(player.seasonTitle) ? undefined : (player.seasonTitle ?? undefined),
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
  if (
    announcement.published !== true ||
    !isValidReachedDate(announcement.date) ||
    hasPublicDemoMarker(announcement.id, announcement.title, announcement.detail, announcement.category)
  ) {
    return null;
  }

  const detail = sanitizePublicCopy(announcement.detail, "Official update details will appear here after publication.");
  if (!detail) {
    return null;
  }

  return {
    id: announcement.id,
    title: sanitizePublicCopy(announcement.title, "Bravo Update") ?? "Bravo Update",
    detail,
    date: announcement.date,
    category: hasPublicDemoMarker(announcement.category) ? undefined : announcement.category,
    published: true,
  };
}

type StoredStreamSchedule = StreamSchedule & {
  deletedAt?: string;
  published?: boolean;
  publishedAt?: string;
  state?: string;
};

export function isPublicStreamSchedule(stream: StoredStreamSchedule, now = Date.now()) {
  const state = cleanString(stream.state)?.toLowerCase();

  return (
    !cleanString(stream.deletedAt) &&
    isExplicitlyPublishedContent(stream, { now }) &&
    (!state || state === "published") &&
    Boolean(cleanString(stream.title)) &&
    Boolean(cleanString(stream.time))
  );
}

function sanitizePublicStream(stream: StoredStreamSchedule): StreamSchedule | null {
  if (!isPublicStreamSchedule(stream) || hasPublicDemoMarker(stream.id, stream.title, stream.time, stream.description, stream.platform)) {
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
  if (
    !isExplicitlyPublishedContent(video, { requirePublishedAt: true }) ||
    hasPublicDemoMarker(video.id, video.slug, video.title, video.category, video.source)
  ) {
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
    imageUrl: sanitizePublicAssetUrl(video.imageUrl) ?? undefined,
    featured: Boolean(video.featured),
    published: true,
    youtubeVideoId: video.youtubeVideoId,
    publishedAt: video.publishedAt,
    createdAt: video.createdAt,
    updatedAt: video.updatedAt,
  };
}

function sanitizePublicSponsor(sponsor: SponsorItem): SponsorItem | null {
  if (
    sponsor.published !== true ||
    sponsor.visible !== true ||
    hasPublicDemoMarker(sponsor.id, sponsor.slug, sponsor.name, sponsor.tier, sponsor.description)
  ) {
    return null;
  }

  return {
    id: sponsor.id,
    name: sponsor.name,
    kind: sponsor.kind,
    tier: sponsor.tier,
    url: normalizeSponsorExternalUrl(sponsor.websiteUrl ?? sponsor.url),
    websiteUrl: normalizeSponsorExternalUrl(sponsor.websiteUrl ?? sponsor.url),
    campaignUrl: normalizeSponsorExternalUrl(sponsor.campaignUrl),
    socialUrl: normalizeSponsorExternalUrl(sponsor.socialUrl),
    homepageClickDestination: normalizeSponsorClickDestination(sponsor.homepageClickDestination),
    openInNewTab: true,
    logoUrl: sanitizePublicAssetUrl(sponsor.logoUrl) ?? undefined,
    bannerUrl: sanitizePublicAssetUrl(sponsor.bannerUrl) ?? undefined,
    designAssetUrl: sanitizePublicAssetUrl(sponsor.designAssetUrl) ?? undefined,
    slug: hasPublicDemoMarker(sponsor.slug) ? undefined : sponsor.slug,
    description: sanitizePublicCopy(sponsor.description),
    supportedEvents: sponsor.supportedEvents,
    eventSlugs: sponsor.eventSlugs,
    partnershipHistory: sponsor.partnershipHistory,
    visible: true,
    featured: Boolean(sponsor.featured),
    published: true,
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
  const requestedState = cleanString(data.state)?.toLowerCase();
  const published = data.published === true && requestedState === "published";

  return {
    title: data.title.trim(),
    state: published ? "published" : "draft",
    published,
    publishedAt: published ? (cleanString(data.publishedAt) ?? new Date().toISOString()) : undefined,
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
  const normalizedName = resolvedTeam?.name ?? buildFallbackTeamNameFromSlot(inferredSlotNumber) ?? data.name.trim();

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
    sourceTeamId: cleanString(data.sourceTeamId),
    sourceTeamName: cleanString(data.sourceTeamName),
    sourceRank: toOptionalNumber(data.sourceRank),
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

function normalizeStoredTournamentMatch(match: TournamentMatch): TournamentMatch {
  return {
    ...match,
    winner: canonicalizeBravoTeamName(match.winner),
    teamResults: (match.teamResults ?? []).map((teamResult) => {
      const resolvedTeam = resolveBravoTeamIdentity(teamResult.teamName);
      const inferredSlotNumber = resolvedTeam?.slotNumber ?? teamResult.slotNumber ?? parseBravoSlotNumber(teamResult.teamName);

      return {
        ...teamResult,
        teamId: resolvedTeam?.id ?? teamResult.teamId,
        teamName: resolvedTeam?.name ?? buildFallbackTeamNameFromSlot(inferredSlotNumber) ?? teamResult.teamName,
        slotNumber: inferredSlotNumber,
      };
    }),
    playerResults: (match.playerResults ?? []).map((playerResult) => {
      const resolvedTeam = resolveBravoTeamIdentity(playerResult.teamName);
      const inferredSlotNumber = resolvedTeam?.slotNumber ?? playerResult.slotNumber ?? parseBravoSlotNumber(playerResult.teamName);

      return {
        ...playerResult,
        teamId: resolvedTeam?.id ?? playerResult.teamId,
        teamName: resolvedTeam?.name ?? buildFallbackTeamNameFromSlot(inferredSlotNumber) ?? playerResult.teamName,
        slotNumber: inferredSlotNumber,
      };
    }),
  };
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
    sourceRank: toOptionalNumber(data.sourceRank),
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
    published: data.published === true,
  } satisfies Partial<Announcement> & { title: string; detail: string };
}

function normalizeVideoPayload(data: Partial<VideoItem> & { title: string }) {
  const published = data.published === true;

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
    published,
    source: cleanString(data.source),
    youtubeVideoId: cleanString(data.youtubeVideoId),
    publishedAt: cleanString(data.publishedAt) ?? (published ? new Date().toISOString() : undefined),
    deletedAt: cleanString(data.deletedAt),
    createdAt: cleanString(data.createdAt),
  } satisfies Partial<VideoItem> & { title: string };
}

function normalizeSponsorPayload(data: Partial<SponsorItem> & { name: string }) {
  const { websiteUrl, campaignUrl, socialUrl } = validateSponsorDestinations(data);

  return {
    name: data.name.trim(),
    kind: data.kind ?? "partner",
    tier: cleanString(data.tier) ?? "Partner",
    url: websiteUrl,
    websiteUrl,
    campaignUrl,
    socialUrl,
    homepageClickDestination: normalizeSponsorClickDestination(data.homepageClickDestination),
    openInNewTab: true,
    logoUrl: cleanString(data.logoUrl),
    bannerUrl: cleanString(data.bannerUrl),
    designAssetUrl: cleanString(data.designAssetUrl),
    slug: cleanString(data.slug) ?? slugify(data.name),
    description: cleanString(data.description),
    supportedEvents: cleanStringArray(data.supportedEvents),
    eventSlugs: cleanStringArray(data.eventSlugs),
    partnershipHistory: cleanStringArray(data.partnershipHistory),
    visible: data.visible === true,
    featured: Boolean(data.featured),
    published: data.published === true,
    showOnHomepage: Boolean(data.showOnHomepage),
    showOnSponsorsPage: data.showOnSponsorsPage !== false,
    showOnEventPage: Boolean(data.showOnEventPage),
    showOnPubgPage: Boolean(data.showOnPubgPage),
    deletedAt: cleanString(data.deletedAt),
    createdAt: cleanString(data.createdAt),
  } satisfies Partial<SponsorItem> & { name: string };
}

async function fromDocumentStore<T>(
  collection: string,
  sortFn?: (a: T & { id: string }, b: T & { id: string }) => number,
  limit = 100,
): Promise<(T & { id: string })[]> {
  if (!isDocumentStoreConfigured()) return [];
  try {
    const docs = await fetchDocumentCollection<T>(collection, limit);
    return sortFn ? [...docs].sort(sortFn) : docs;
  } catch {
    return [];
  }
}

async function oneFromDocumentStore<T extends { id: string }>(collection: string, id: string): Promise<T | null> {
  if (!isDocumentStoreConfigured()) return null;
  try {
    return await getDocument<T>(collection, id);
  } catch {
    return null;
  }
}

export async function getSiteStats(): Promise<SiteStats> {
  const emptyStats: SiteStats = {
    teamsRegistered: null,
    matchesHosted: null,
    tournamentsCompleted: null,
    prizePoolsAwarded: null,
    communityMembers: null,
    youtubeViews: null,
  };
  if (!isDocumentStoreConfigured()) return emptyStats;
  try {
    const doc = await getDocument<SiteStats>(COLLECTIONS.siteStats, "main");
    const mergedStats = {
      teamsRegistered: doc?.teamsRegistered ?? null,
      matchesHosted: doc?.matchesHosted ?? null,
      tournamentsCompleted: doc?.tournamentsCompleted ?? null,
      prizePoolsAwarded: doc?.prizePoolsAwarded ? sanitizePublicStatText(doc.prizePoolsAwarded, "") || null : null,
      communityMembers: doc?.communityMembers ?? null,
      youtubeViews: doc?.youtubeViews ? sanitizePublicStatText(doc.youtubeViews, "") || null : null,
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
    return emptyStats;
  }
}

export async function getSeasons(options: { includeInternal?: boolean } = {}): Promise<Season[]> {
  if (options.includeInternal) {
    const seasons = await listCompetitionSeasons({ includeInternal: true });
    if (seasons.length) return seasons;
    return fromDocumentStore<Season>(COLLECTIONS.seasons, (first, second) => compareIsoDateDesc(first.startDate, second.startDate));
  }
  try {
    const seasons = await listCompetitionSeasons();
    if (seasons.length > 0) {
      return filterPublicSeasons(seasons)
        .sort((a, b) => {
          const dateComparison = compareIsoDateDesc(a.startDate, b.startDate);
          if (dateComparison !== 0) return dateComparison;
          const createdAtComparison = (b.createdAt ?? "").localeCompare(a.createdAt ?? "");
          if (createdAtComparison !== 0) return createdAtComparison;
          return (b.seasonNumber ?? 0) - (a.seasonNumber ?? 0);
        })
        .map((season) => sanitizePublicSeason(season));
    }
  } catch {
    // Fall back to the document compatibility layer when relational data is unavailable.
  }

  return filterPublicSeasons(
    await fromDocumentStore<Season>(COLLECTIONS.seasons, (a, b) => {
      const dateComparison = compareIsoDateDesc(a.startDate, b.startDate);
      if (dateComparison !== 0) return dateComparison;
      const createdAtComparison = (b.createdAt ?? "").localeCompare(a.createdAt ?? "");
      if (createdAtComparison !== 0) return createdAtComparison;
      return (b.seasonNumber ?? 0) - (a.seasonNumber ?? 0);
    }),
  ).map((season) => sanitizePublicSeason(season));
}

export async function getSeason(id: string, options: { includeInternal?: boolean } = {}): Promise<Season | null> {
  try {
    const season = await getCompetitionSeason(id, options);
    if (season) {
      return options.includeInternal ? season : isPubliclyVisibleSeason(season) ? sanitizePublicSeason(season) : null;
    }
  } catch {
    // Fall back to the document compatibility layer when relational data is unavailable.
  }

  const season = await oneFromDocumentStore<Season>(COLLECTIONS.seasons, id);
  if (!season || options.includeInternal) {
    return season;
  }
  return isPubliclyVisibleSeason(season) ? sanitizePublicSeason(season) : null;
}

export async function getCurrentSeason(): Promise<Season | null> {
  try {
    const season = await getCurrentCompetitionSeason();
    if (season) {
      return isPubliclyVisibleSeason(season) ? sanitizePublicSeason(season) : null;
    }
  } catch {
    // Fall back to the document compatibility layer when relational data is unavailable.
  }

  const seasons = await getSeasons();
  return seasons.find((season) => season.status === "active") ?? seasons.find((season) => season.status === "completed") ?? null;
}

async function ensureSeasonTeamSlots(seasonId: string, seasonTitle: string) {
  if (!isDocumentStoreConfigured()) {
    return;
  }

  const existingSeasonTeams = await queryDocumentCollection<Team>(COLLECTIONS.teams, "seasonId", seasonId, 500).catch(() => []);
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
    operations.map((operation) => saveDocument(operation.collectionName, operation.docId, operation.data as Record<string, unknown>)),
  );
}

export async function saveSeason(data: Partial<Season> & { title: string }, id?: string) {
  const savedSeason = await saveCompetitionSeason(data, id);
  const compatibilityPayload = normalizeSeasonPayload(savedSeason);

  if (isDocumentStoreConfigured()) {
    await saveDocument(COLLECTIONS.seasons, savedSeason.id, compatibilityPayload as unknown as Record<string, unknown>);
    await ensureSeasonTeamSlots(savedSeason.id, savedSeason.seriesTitle ?? savedSeason.title);
  }

  return savedSeason;
}

export async function deleteSeason(id: string) {
  await deleteCompetitionSeason(id);
  if (isDocumentStoreConfigured()) {
    await deleteDocument(COLLECTIONS.seasons, id);
  }
  return { id, deleted: true };
}

export async function getSeasonTournaments(seasonId: string, options: { includeInternal?: boolean } = {}): Promise<Tournament[]> {
  try {
    const [season, tournaments] = await Promise.all([
      getCompetitionSeason(seasonId, { includeInternal: options.includeInternal }),
      listCompetitionEvents(undefined, { includeUnpublished: options.includeInternal }),
    ]);
    if (season) {
      const seasonTournaments = tournaments.filter((tournament) => tournament.seasonId === season.id);
      const scopedTournaments = options.includeInternal
        ? seasonTournaments
        : seasonTournaments
            .filter((tournament) => isPubliclyVisibleTournament(tournament))
            .map((tournament) => sanitizePublicTournament(tournament));
      return scopedTournaments.sort(
        (firstTournament, secondTournament) =>
          (firstTournament.seasonDayNumber ?? Number.POSITIVE_INFINITY) - (secondTournament.seasonDayNumber ?? Number.POSITIVE_INFINITY) ||
          firstTournament.startDate.localeCompare(secondTournament.startDate),
      );
    }
  } catch {
    // Fall back to the document compatibility layer when relational data is unavailable.
  }

  if (!isDocumentStoreConfigured()) return [];
  try {
    const tournaments = await queryDocumentCollection<Tournament>(COLLECTIONS.tournaments, "seasonId", seasonId, 200);
    const scopedTournaments = options.includeInternal
      ? tournaments
      : tournaments
          .filter((tournament) => isPubliclyVisibleTournament(tournament))
          .map((tournament) => sanitizePublicTournament(tournament));
    return scopedTournaments.sort(
      (firstTournament, secondTournament) =>
        (firstTournament.seasonDayNumber ?? Number.POSITIVE_INFINITY) - (secondTournament.seasonDayNumber ?? Number.POSITIVE_INFINITY) ||
        firstTournament.startDate.localeCompare(secondTournament.startDate),
    );
  } catch {
    return [];
  }
}

async function getSeasonStandings(seasonId: string): Promise<TournamentStanding[]> {
  const tournaments = await getSeasonTournaments(seasonId);
  const standings = await Promise.all(tournaments.map((tournament) => getTournamentStandings(tournament.id)));
  return standings.flat();
}

async function getSeasonLeaderboard(seasonId: string): Promise<LeaderboardRow[]> {
  try {
    const [season, leaderboard] = await Promise.all([getCompetitionSeason(seasonId), getCompetitionSeasonLeaderboardRows(seasonId)]);
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

export async function getSeasonTeams(seasonId: string, options: { includeInternal?: boolean } = {}): Promise<Team[]> {
  if (options.includeInternal) {
    if (!isDocumentStoreConfigured()) return [];
    try {
      const teams = await queryDocumentCollection<Team>(COLLECTIONS.teams, "seasonId", seasonId, 500);
      return filterSoftDeleted(teams)
        .filter((team) => team.scope === "season")
        .map(normalizeStoredTeam)
        .sort((firstTeam, secondTeam) => compareBravoTeamSlotOrder(firstTeam, secondTeam));
    } catch {
      return [];
    }
  }

  try {
    const [season, teams] = await Promise.all([getCompetitionSeason(seasonId), getCompetitionSeasonTeams(seasonId)]);
    if (season) {
      return filterPublicTeams(teams)
        .map((team) => sanitizePublicTeam(team))
        .sort((firstTeam, secondTeam) => compareBravoTeamSlotOrder(firstTeam, secondTeam));
    }
  } catch {
    // Fall back to the document compatibility layer when relational data is unavailable.
  }

  if (!isDocumentStoreConfigured()) return [];
  try {
    const teams = await queryDocumentCollection<Team>(COLLECTIONS.teams, "seasonId", seasonId, 500);
    return filterPublicTeams(
      filterSoftDeleted(teams)
        .filter((team) => team.scope === "season")
        .map(normalizeStoredTeam),
    )
      .map((team) => sanitizePublicTeam(team))
      .sort((firstTeam, secondTeam) => compareBravoTeamSlotOrder(firstTeam, secondTeam));
  } catch {
    return [];
  }
}

async function getSeasonPlayers(seasonId: string, options: { includeInternal?: boolean } = {}): Promise<Player[]> {
  if (options.includeInternal) {
    if (!isDocumentStoreConfigured()) return [];
    try {
      const players = await queryDocumentCollection<Player>(COLLECTIONS.players, "seasonId", seasonId, 1500);
      return filterSoftDeleted(players)
        .filter((player) => player.scope === "season")
        .sort((firstPlayer, secondPlayer) => comparePlayerLeaderboardPerformance(firstPlayer, secondPlayer));
    } catch {
      return [];
    }
  }

  try {
    const [season, players] = await Promise.all([getCompetitionSeason(seasonId), getCompetitionSeasonPlayers(seasonId)]);
    if (season) {
      return players
        .filter((player) => isPubliclyVisiblePlayer(player))
        .map((player) => sanitizePublicPlayer(player))
        .sort((firstPlayer, secondPlayer) => comparePlayerLeaderboardPerformance(firstPlayer, secondPlayer));
    }
  } catch {
    // Fall back to the document compatibility layer when relational data is unavailable.
  }

  if (!isDocumentStoreConfigured()) return [];
  try {
    const players = await queryDocumentCollection<Player>(COLLECTIONS.players, "seasonId", seasonId, 1500);
    return filterSoftDeleted(players)
      .filter((player) => player.scope === "season" && isPubliclyVisiblePlayer(player))
      .map((player) => sanitizePublicPlayer(player))
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
      (firstTournament.seasonDayNumber ?? Number.POSITIVE_INFINITY) - (secondTournament.seasonDayNumber ?? Number.POSITIVE_INFINITY) ||
      firstTournament.startDate.localeCompare(secondTournament.startDate),
  );
  const currentTournament =
    orderedTournaments.find((tournament) => tournament.id === season.currentTournamentId) ??
    orderedTournaments.find((tournament) => tournament.seasonDayNumber === season.currentDay) ??
    null;
  const matchesPlayed = orderedTournaments.reduce((totalMatches, tournament) => totalMatches + (tournament.matchCount ?? 0), 0);
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
    recentResults: orderedTournaments
      .filter((tournament) => (tournament.matchCount ?? 0) > 0)
      .slice(-3)
      .reverse(),
  };
}

async function getSeasonBySlug(seasonIdOrSlug: string) {
  try {
    const season = await getCompetitionSeason(seasonIdOrSlug);
    if (season) {
      return isPubliclyVisibleSeason(season) ? sanitizePublicSeason(season) : null;
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

export async function getTournaments(status?: string, options: { includeInternal?: boolean } = {}): Promise<Tournament[]> {
  try {
    const [tournaments, seasons] = await Promise.all([
      listCompetitionEvents(undefined, { includeUnpublished: options.includeInternal }),
      listCompetitionSeasons(),
    ]);
    if (tournaments.length > 0 || seasons.length > 0) {
      const scopedTournaments = options.includeInternal
        ? tournaments
        : tournaments
            .filter((tournament) => isPubliclyVisibleTournament(tournament))
            .map((tournament) => sanitizePublicTournament(tournament));
      if (!status) {
        return scopedTournaments;
      }

      return scopedTournaments.filter((tournament) => tournament.status === status);
    }
  } catch {
    // Fall back to the document compatibility layer when relational data is unavailable.
  }

  const all = await fromDocumentStore<Tournament>(COLLECTIONS.tournaments, (a, b) => {
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

export async function getTournament(id: string, options: { includeInternal?: boolean } = {}): Promise<Tournament | null> {
  try {
    const tournament = await getCompetitionEvent(id, { includeUnpublished: options.includeInternal });
    if (tournament) {
      return options.includeInternal ? tournament : isPubliclyVisibleTournament(tournament) ? sanitizePublicTournament(tournament) : null;
    }
    if (await competitionEventIdentityExists(id)) return null;
  } catch {
    // Fall back to the document compatibility layer when relational data is unavailable.
  }

  const tournament = await oneFromDocumentStore<Tournament>(COLLECTIONS.tournaments, id);
  if (!tournament || options.includeInternal) {
    return tournament;
  }
  return isPubliclyVisibleTournament(tournament) ? sanitizePublicTournament(tournament) : null;
}

export async function getPublicTournament(id: string): Promise<Tournament | null> {
  return getTournament(id);
}

export async function saveTournament(data: Partial<Tournament> & { title: string }, id?: string) {
  parseEventSchedule(data.schedule);
  const savedTournament = await saveCompetitionEvent(data, id);
  const compatibilityPayload = normalizeTournamentPayload(savedTournament);
  if (isDocumentStoreConfigured()) {
    const current = await getDocument<Record<string, unknown>>(COLLECTIONS.tournaments, savedTournament.id);
    if (current)
      await saveDocumentIfFieldsMatch(
        COLLECTIONS.tournaments,
        savedTournament.id,
        compatibilityPayload as unknown as Record<string, unknown>,
        { productionRevision: typeof current.productionRevision === "number" ? current.productionRevision : null },
      );
    else await saveDocument(COLLECTIONS.tournaments, savedTournament.id, compatibilityPayload as unknown as Record<string, unknown>);
  }
  await claimStagedAdminPublicAssets({
    relatedId: savedTournament.id,
    relatedType: "tournament",
    urls: [savedTournament.bannerUrl],
  });
  return savedTournament;
}

export async function deleteTournament(id: string) {
  await deleteCompetitionEvent(id);
  if (isDocumentStoreConfigured()) {
    await deleteDocument(COLLECTIONS.tournaments, id);
  }
  return { id, deleted: true };
}

export async function getTournamentMatches(
  tournamentId: string,
  options: { includeDrafts?: boolean; preserveResultIdentity?: boolean } = {},
): Promise<TournamentMatch[]> {
  // preserveResultIdentity is for server-side broadcast selection only. The
  // snapshot builder still sanitizes every public result before serialization.
  let relationalOwner = false;
  try {
    const tournament = await getCompetitionEvent(tournamentId, { includeUnpublished: options.includeDrafts });
    if (tournament) {
      relationalOwner = true;
      const matches = await getCompetitionMatchesForEvent(tournament.id, options);
      const scopedMatches = options.includeDrafts
        ? matches
        : matches.filter(isExplicitlyPublishedMatch).map((match) => (options.preserveResultIdentity ? match : sanitizePublicMatch(match)));
      return scopedMatches.sort((firstMatch, secondMatch) => compareMatchSequenceOrder(firstMatch, secondMatch));
    }
    if (await competitionEventIdentityExists(tournamentId)) return [];
  } catch (error) {
    if (relationalOwner) throw error;
    // Fall back to the document compatibility layer when relational data is unavailable.
  }

  if (!isDocumentStoreConfigured()) return [];
  try {
    if (!options.includeDrafts) {
      const storedTournament = await oneFromDocumentStore<Tournament>(COLLECTIONS.tournaments, tournamentId);
      if (!storedTournament || !isPubliclyVisibleTournament(storedTournament)) {
        return [];
      }
    }

    let matches = await queryDocumentCollection<TournamentMatch>(COLLECTIONS.matches, "tournamentId", tournamentId, 200);
    if (matches.length === 0) {
      matches = await queryDocumentCollection<TournamentMatch>(COLLECTIONS.tournamentMatches, "tournamentId", tournamentId, 200);
    }
    const visibleMatches = filterSoftDeleted(matches)
      .map(normalizeStoredTournamentMatch)
      .filter((m) => m.dataSource === "pubg_api" || m.syncedAt);

    return (
      options.includeDrafts
        ? visibleMatches
        : visibleMatches
            .filter(isExplicitlyPublishedMatch)
            .map((match) => (options.preserveResultIdentity ? match : sanitizePublicMatch(match)))
    ).sort((firstMatch, secondMatch) => compareMatchSequenceOrder(firstMatch, secondMatch));
  } catch {
    return [];
  }
}

export async function getTournamentStandings(
  tournamentId: string,
  options: { includeDrafts?: boolean } = {},
): Promise<TournamentStanding[]> {
  let relationalOwner = false;
  try {
    const tournament = await getCompetitionEvent(tournamentId, { includeUnpublished: options.includeDrafts });
    if (tournament) {
      relationalOwner = true;
      const matches = await getCompetitionMatchesForEvent(tournament.id, { includeDrafts: options.includeDrafts });
      return buildTournamentStandings(tournament.id, tournament.title, matches);
    }
    if (await competitionEventIdentityExists(tournamentId)) return [];
  } catch (error) {
    if (relationalOwner) throw error;
    // Fall back to the document compatibility layer when relational data is unavailable.
  }

  if (!isDocumentStoreConfigured()) return [];
  try {
    if (!options.includeDrafts) {
      const storedTournament = await oneFromDocumentStore<Tournament>(COLLECTIONS.tournaments, tournamentId);
      if (!storedTournament || !isPubliclyVisibleTournament(storedTournament)) {
        return [];
      }

      const matches = await getTournamentMatches(tournamentId);
      return buildTournamentStandings(tournamentId, storedTournament.title, matches);
    }

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

export async function getTournamentTeams(tournamentId: string, options: { includeInternal?: boolean } = {}): Promise<Team[]> {
  let relationalOwner = false;
  try {
    const tournament = await getCompetitionEvent(tournamentId, { includeUnpublished: options.includeInternal });
    if (tournament) {
      relationalOwner = true;
      const [matches, seasonTeams] = await Promise.all([
        getCompetitionMatchesForEvent(tournament.id, { includeDrafts: options.includeInternal }),
        tournament.seasonId
          ? options.includeInternal
            ? getSeasonTeams(tournament.seasonId, { includeInternal: true })
            : getCompetitionSeasonTeams(tournament.seasonId)
          : listCompetitionTeams(),
      ]);
      const teamIds = new Set<string>(tournament.registeredTeamIds ?? []);
      const fallbackTeams = new Map<string, Team>();

      for (const match of matches) {
        for (const teamResult of match.teamResults ?? []) {
          if (teamResult.teamId) {
            teamIds.add(teamResult.teamId);
          }

          const fallbackId = teamResult.teamId ?? slugify(teamResult.teamName);
          if (options.includeInternal && !fallbackTeams.has(fallbackId)) {
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
      const knownTeamIds = new Set(teams.map((team) => team.id));
      const scopedTeams = options.includeInternal
        ? [...teams, ...Array.from(fallbackTeams.values()).filter((team) => !knownTeamIds.has(team.id))]
        : teams.map((team) => sanitizePublicTeam(team));
      return scopedTeams.sort((firstTeam, secondTeam) => compareBravoTeamSlotOrder(firstTeam, secondTeam));
    }
    if (await competitionEventIdentityExists(tournamentId)) return [];
  } catch (error) {
    if (relationalOwner) throw error;
    // Fall back to the document compatibility layer when relational data is unavailable.
  }

  if (!isDocumentStoreConfigured()) return [];
  try {
    if (!options.includeInternal) {
      const storedTournament = await oneFromDocumentStore<Tournament>(COLLECTIONS.tournaments, tournamentId);
      if (!storedTournament || !isPubliclyVisibleTournament(storedTournament)) {
        return [];
      }
    }

    const teams = await queryDocumentCollection<Team>(COLLECTIONS.teams, "sourceTournamentId", tournamentId, 100);
    const normalizedTeams = filterSoftDeleted(teams).map(normalizeStoredTeam);
    const scopedTeams = options.includeInternal
      ? normalizedTeams
      : normalizedTeams.filter((team) => isPubliclyVisibleTeamEntity(team)).map((team) => sanitizePublicTeam(team));
    return scopedTeams.sort((firstTeam, secondTeam) => compareBravoTeamSlotOrder(firstTeam, secondTeam));
  } catch {
    return [];
  }
}

export async function getTournamentPlayers(tournamentId: string, options: { includeInternal?: boolean } = {}): Promise<Player[]> {
  let relationalOwner = false;
  try {
    const tournament = await getCompetitionEvent(tournamentId, { includeUnpublished: options.includeInternal });
    if (tournament) {
      relationalOwner = true;
      const [matches, seasonPlayers] = await Promise.all([
        getCompetitionMatchesForEvent(tournament.id, { includeDrafts: options.includeInternal }),
        tournament.seasonId
          ? options.includeInternal
            ? getSeasonPlayers(tournament.seasonId, { includeInternal: true })
            : getCompetitionSeasonPlayers(tournament.seasonId)
          : listCompetitionPlayers(),
      ]);
      const playerIds = new Set<string>();
      const fallbackPlayers = new Map<string, Player>();

      for (const match of matches) {
        for (const playerResult of match.playerResults ?? []) {
          if (playerResult.playerId) {
            playerIds.add(playerResult.playerId);
          }

          const fallbackId = playerResult.playerId || playerResult.pubgPlayerId || slugify(playerResult.playerName);
          if (options.includeInternal && !fallbackPlayers.has(fallbackId)) {
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
      const knownPlayerIds = new Set(players.map((player) => player.id));
      const scopedPlayers = options.includeInternal
        ? [...players, ...Array.from(fallbackPlayers.values()).filter((player) => !knownPlayerIds.has(player.id))]
        : players.map((player) => sanitizePublicPlayer(player));
      return scopedPlayers.sort((firstPlayer, secondPlayer) => comparePlayerLeaderboardPerformance(firstPlayer, secondPlayer));
    }
    if (await competitionEventIdentityExists(tournamentId)) return [];
  } catch (error) {
    if (relationalOwner) throw error;
    // Fall back to the document compatibility layer when relational data is unavailable.
  }

  if (!isDocumentStoreConfigured()) return [];
  try {
    if (!options.includeInternal) {
      const storedTournament = await oneFromDocumentStore<Tournament>(COLLECTIONS.tournaments, tournamentId);
      if (!storedTournament || !isPubliclyVisibleTournament(storedTournament)) {
        return [];
      }
    }

    const players = await queryDocumentCollection<Player>(COLLECTIONS.players, "sourceTournamentId", tournamentId, 500);
    const visiblePlayers = filterSoftDeleted(players);
    const scopedPlayers = options.includeInternal
      ? visiblePlayers
      : visiblePlayers
          .filter((player) => isPubliclyVisiblePlayer(player, { allowTournamentScoped: true }))
          .map((player) => sanitizePublicPlayer(player));
    return scopedPlayers.sort((firstPlayer, secondPlayer) => comparePlayerLeaderboardPerformance(firstPlayer, secondPlayer));
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
        secondScrim.title.localeCompare(firstScrim.title),
    );
  } catch {
    return [];
  }
}

export async function getScrimDayResults(options: { includeDrafts?: boolean } = {}): Promise<ScrimDayResult[]> {
  const storedScrims = await getScrims();
  const scrims = options.includeDrafts ? storedScrims : selectPublicScrims(storedScrims);
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
      matchResults = options.includeDrafts
        ? normalizedMatches
        : normalizedMatches.filter(isExplicitlyPublishedMatch).map((match) => sanitizePublicMatch(match));
    } catch {
      matchResults = [];
    }
  }

  return buildScrimDayResultsFromCollections(scrims, [matchResults]);
}

export async function saveTournamentMatch(data: TournamentMatch) {
  if (isDocumentStoreConfigured()) {
    await saveDocument(COLLECTIONS.matches, data.id, data as unknown as Record<string, unknown>);
    await saveDocument(COLLECTIONS.tournamentMatches, data.id, data as unknown as Record<string, unknown>);
    await claimStagedAdminPublicAssets({
      relatedId: data.id,
      relatedType: "match",
      urls: [data.resultScreenshotUrl, data.scoreboardImageUrl, data.resultImageUrl, ...(data.screenshotUrls ?? [])],
    });
  }
  return data;
}

async function getVisibleTeamRecords(): Promise<Team[]> {
  try {
    const teams = await listCompetitionTeams();
    return filterPublicTeams(teams.filter((team) => team.scope !== "tournament")).sort((firstTeam, secondTeam) =>
      compareBravoTeamSlotOrder(firstTeam, secondTeam),
    );
  } catch {
    // Fall back to the document compatibility layer when relational data is unavailable.
  }

  const teams = filterSoftDeleted(
    (await fromDocumentStore<Team>(COLLECTIONS.teams, (a, b) => compareBravoTeamSlotOrder(a, b), 500)).map(normalizeStoredTeam),
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

export async function getTeams(): Promise<Team[]> {
  return (await getVisibleTeamRecords()).map((team) => sanitizePublicTeam(team));
}

export async function getRegistrationTeamCandidates(): Promise<Team[]> {
  return getVisibleTeamRecords();
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

export async function getPlayers(options: { includeInternal?: boolean } = {}): Promise<Player[]> {
  if (options.includeInternal) {
    const players = await listCompetitionPlayers({ includeInternal: true });
    const metadata = await fromDocumentStore<Player>(COLLECTIONS.players, () => 0, 1500);
    if (!players.length) return filterSoftDeleted(metadata);
    const metadataById = new Map(metadata.map((player) => [player.id, player]));
    return players.map((player) => ({ ...metadataById.get(player.id), ...player }));
  }
  try {
    const players = await listCompetitionPlayers();
    return players
      .filter((player) => isPubliclyVisiblePlayer(player))
      .map((player) => sanitizePublicPlayer(player))
      .sort((firstPlayer, secondPlayer) => comparePlayerLeaderboardPerformance(firstPlayer, secondPlayer));
  } catch {
    // Fall back to the document compatibility layer when relational data is unavailable.
  }

  const players = filterSoftDeleted(
    await fromDocumentStore<Player>(
      COLLECTIONS.players,
      (firstPlayer, secondPlayer) => comparePlayerLeaderboardPerformance(firstPlayer, secondPlayer),
      1500,
    ),
  );
  const visiblePlayers = players.filter((player) => isPubliclyVisiblePlayer(player));
  const currentSeason = await getCurrentSeason();
  if (currentSeason) {
    const currentSeasonPlayers = visiblePlayers.filter((player) => player.scope === "season" && player.seasonId === currentSeason.id);
    if (currentSeasonPlayers.length > 0) {
      return currentSeasonPlayers
        .map((player) => sanitizePublicPlayer(player))
        .sort((firstPlayer, secondPlayer) => comparePlayerLeaderboardPerformance(firstPlayer, secondPlayer));
    }
  }

  return visiblePlayers
    .map((player) => sanitizePublicPlayer(player))
    .sort((firstPlayer, secondPlayer) => comparePlayerLeaderboardPerformance(firstPlayer, secondPlayer));
}

export async function getPlayer(id: string): Promise<Player | null> {
  const canonical = await getCompetitionPlayer(id);
  if (canonical) {
    const metadata = await oneFromDocumentStore<Player>(COLLECTIONS.players, canonical.id);
    return { ...metadata, ...canonical };
  }
  return (
    (await getDocumentByIdOrSlug<Player & { id: string }>(COLLECTIONS.players, id)) ?? (await oneFromDocumentStore(COLLECTIONS.players, id))
  );
}

export async function getPublicPlayer(id: string): Promise<Player | null> {
  const normalizedId = id.trim().toLowerCase();
  const players = await getPlayers();
  return players.find((player) => player.id === id || (player.slug ?? "").toLowerCase() === normalizedId) ?? null;
}

export async function getMvpOfWeek(): Promise<Player | null> {
  const players = await getPlayers();
  return players.find((player) => player.isMvpOfWeek) ?? sortMvpRanking(players)[0] ?? null;
}

export async function savePlayer(data: Partial<Player> & { name: string }, id?: string, options: { canonicalProfile?: boolean } = {}) {
  const payload = normalizePlayerPayload(data);
  if (options.canonicalProfile && (!id || /^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(id))) {
    const saved = await saveCompetitionPlayer(payload, id);
    // Private/legacy profile fields remain in the existing compatibility store
    // under the canonical UUID, never in a second identity or collection.
    await saveDocument(COLLECTIONS.players, saved.id, canonicalPlayerMetadata(payload, saved));
    return { ...payload, ...saved };
  }
  const docId = id ?? payload.slug ?? slugify(payload.name);
  const now = new Date().toISOString();
  const slug = await ensureUniqueDocumentSlug(
    COLLECTIONS.players,
    payload.slug ?? payload.inGameName ?? payload.pubgName ?? payload.name,
    docId,
    payload.name,
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
  await archiveCompetitionPlayer(id);
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
  return [];
}

export async function getAnnouncements(): Promise<Announcement[]> {
  const all = await fromDocumentStore<Announcement>(COLLECTIONS.announcements);
  return all
    .filter((announcement) => announcement.published === true)
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
  const streams = filterSoftDeleted(await fromDocumentStore<StoredStreamSchedule>(COLLECTIONS.streams));
  return streams.map((stream) => sanitizePublicStream(stream)).filter((stream): stream is StreamSchedule => Boolean(stream));
}

function buildYouTubeChannelUrl() {
  const configuredChannelUrl = process.env.NEXT_PUBLIC_YOUTUBE_CHANNEL_URL || process.env.YOUTUBE_CHANNEL_URL;
  if (configuredChannelUrl) return configuredChannelUrl;
  return DEFAULT_YOUTUBE_CHANNEL_URL;
}

export function buildSafeLiveStreamFeed(activeStream?: StreamSchedule): StreamSchedule {
  if (activeStream) {
    return activeStream;
  }

  return {
    id: "bravo-youtube-channel",
    time: "",
    title: "Bravo Gaming Esports",
    platform: "YouTube",
    isLive: false,
    channelUrl: buildYouTubeChannelUrl(),
    supportUrl: BRAVO_DISCORD_URL,
  };
}

export async function getLiveStreamFeed(): Promise<StreamSchedule> {
  const streams = await getStreams();
  const activeStream = streams.find((stream) => stream.isLive);
  return buildSafeLiveStreamFeed(activeStream);
}

export async function getVideos(options: { includeUnpublished?: boolean } = {}): Promise<VideoItem[]> {
  const videos = await fromDocumentStore<VideoItem>(COLLECTIONS.videos);
  const visibleVideos = filterSoftDeleted(videos);
  if (options.includeUnpublished) {
    return visibleVideos;
  }

  return visibleVideos
    .filter((video) => isExplicitlyPublishedContent(video, { requirePublishedAt: true }))
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
    publishedAt: payload.published === true ? (payload.publishedAt ?? now) : payload.publishedAt,
  };
  if (isDocumentStoreConfigured()) {
    await saveDocument(COLLECTIONS.videos, docId, nextPayload as Record<string, unknown>);
    await claimStagedAdminPublicAssets({
      relatedId: docId,
      relatedType: "video",
      urls: [nextPayload.imageUrl],
    });
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
  const sponsors = await fromDocumentStore<SponsorItem>(COLLECTIONS.sponsors);
  const visibleSponsors = filterSoftDeleted(sponsors);
  if (options.includeUnpublished) {
    return visibleSponsors;
  }

  return visibleSponsors
    .filter((sponsor) => sponsor.published === true && sponsor.visible === true)
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
    await claimStagedAdminPublicAssets({
      relatedId: docId,
      relatedType: "sponsor",
      urls: [nextPayload.logoUrl, nextPayload.bannerUrl, nextPayload.designAssetUrl],
    });
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
      compareIsoDateDesc(firstRegistration.createdAt, secondRegistration.createdAt),
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

export async function createRegistration(data: Omit<TeamRegistration, "id" | "createdAt" | "status">, options: { id?: string } = {}) {
  const registrationId = options.id ?? `reg-${Date.now()}`;
  const payload = {
    teamName: data.teamName.trim(),
    teamTag: cleanString(data.teamTag),
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
    if (payload.tournamentId) {
      return createEventRegistrationTransaction({ id: registrationId, ...payload });
    }
    const result = await createDocument(COLLECTIONS.registrations, payload, options.id);
    return { id: result.id, ...payload };
  }
  return { id: registrationId, ...payload };
}

export async function updateRegistrationStatus(
  id: string,
  status: TeamRegistration["status"],
  updates: Partial<Omit<TeamRegistration, "id" | "status" | "createdAt">> = {},
  options: { expectedRegistration: TeamRegistration },
): Promise<TeamRegistration> {
  const payload = {
    status,
    updatedAt: new Date().toISOString(),
    approvedTeamId: cleanString(updates.approvedTeamId),
    logoPath: cleanString(updates.logoPath),
    logoUploadId: cleanString(updates.logoUploadId),
    logoUrl: cleanString(updates.logoUrl),
    approvalClaimToken: cleanString(updates.approvalClaimToken),
    approvalClaimedAt: cleanString(updates.approvalClaimedAt),
    approvalClaimedBy: cleanString(updates.approvalClaimedBy),
    tournamentId: cleanString(updates.tournamentId),
    tournamentTitle: cleanString(updates.tournamentTitle),
  } satisfies Partial<TeamRegistration>;

  if (isDocumentStoreConfigured()) {
    const expected = options.expectedRegistration;
    return saveDocumentIfFieldsMatch<TeamRegistration>(COLLECTIONS.registrations, id, payload as Record<string, unknown>, {
      approvedTeamId: cleanString(expected.approvedTeamId),
      approvalClaimToken: cleanString(expected.approvalClaimToken),
      approvalClaimedAt: cleanString(expected.approvalClaimedAt),
      approvalClaimedBy: cleanString(expected.approvalClaimedBy),
      logoPath: cleanString(expected.logoPath),
      logoUploadId: cleanString(expected.logoUploadId),
      logoUrl: cleanString(expected.logoUrl),
      status: expected.status,
      tournamentId: cleanString(expected.tournamentId),
      tournamentTitle: cleanString(expected.tournamentTitle),
    });
  }
  return { ...options.expectedRegistration, ...payload, id };
}

export async function getAdminDashboardStats() {
  const [teams, players, tournaments, registrations, scrims, seasons, dataBackend] = await Promise.all([
    getTeams(),
    getPlayers(),
    getTournaments(undefined, { includeInternal: true }),
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
    dataConnected: dataBackend !== null,
    dataAdminConnected: dataBackend !== null && isDocumentStoreAdminConfigured(),
    dataBackend,
    totalSeasons: seasons.length,
    activeSeasonTitle: activeSeason?.seriesTitle ?? activeSeason?.title,
    activeSeasonDay: activeSeason?.currentDay,
    activeSeasonLength: activeSeason?.configuredDays,
  };
}
