import { cache } from "react";
import { getAnnouncements, getLiveStreamFeed, getSponsors, getVideos } from "./data";
import { getManagedPlatformEvents, getManagedPlatformGames } from "./platform-cms";
import { getHomepageContent, getPublishedManagedNewsArticles, type HomepageHeroSlideRecord } from "./platform-content";
import { getPubgHubDataset } from "./pubg-hub";
import { hasPublicDemoMarker, isInternalOnlyCategory, sanitizePublicAssetUrl, sanitizePublicCopy } from "./public-content";
import type { SponsorItem, SponsorKind } from "./types";

type PlatformGameStatus = "flagship" | "active" | "building" | "planned";
type PlatformEventStatus = "live" | "upcoming" | "completed" | "planned";
type PlatformMatchStatus = "live" | "upcoming" | "completed" | "planned";
type PlatformContentState = "published" | "planned" | "coming_soon";

export interface PlatformGame {
  slug: string;
  name: string;
  shortName: string;
  tagline: string;
  summary: string;
  status: PlatformGameStatus;
  flagship: boolean;
  heroLabel: string;
  primaryHref: string;
  analyticsHref?: string;
  sections: string[];
  activeEvents: number;
  trackedMatches: number;
  trackedTeams: number;
  trackedPlayers: number;
  featuredNewsCount: number;
  completionLabel: string;
}

export interface PlatformArticle {
  id: string;
  slug: string;
  title: string;
  summary: string;
  excerpt?: string;
  date: string;
  category: string;
  tags: string[];
  authorName: string;
  gameSlug?: string;
  featured: boolean;
  breaking: boolean;
  imageUrl?: string;
  seoTitle?: string;
  seoDescription?: string;
  ogImageUrl?: string;
  canonicalUrl?: string;
  body: string[];
  relatedSlugs: string[];
  publishedAt?: string;
  updatedAt?: string;
}

export interface PlatformEvent {
  id: string;
  slug: string;
  name: string;
  gameSlug: string;
  gameName: string;
  type: string;
  status: PlatformEventStatus;
  state: PlatformContentState;
  featured: boolean;
  region: string;
  organizerName: string;
  prizePool: string;
  teamsCount: number;
  matchesCount: number;
  startDate: string;
  endDate?: string | null;
  bannerUrl?: string | null;
  summary: string;
  analyticsHref?: string;
  streamHref?: string | null;
  topTeamName?: string | null;
  topPlayerName?: string | null;
  sponsorName?: string | null;
  pointSystemName?: string | null;
  tabs: string[];
  updatedAt?: string;
}

export interface PlatformMatch {
  id: string;
  gameSlug: string;
  gameName: string;
  eventSlug: string;
  eventName: string;
  status: PlatformMatchStatus;
  scheduledAt: string;
  stageLabel: string;
  format: string;
  mapLabel: string;
  teamA: string;
  teamB: string;
  scoreA?: number | null;
  scoreB?: number | null;
  winnerName?: string | null;
  mvpName?: string | null;
  analyticsHref?: string;
  vodHref?: string | null;
  viewerCount?: string | null;
  summary: string;
  updatedAt?: string;
}

interface PlatformCalendarItem {
  id: string;
  title: string;
  subtitle: string;
  date: string;
  type: string;
  status: PlatformEventStatus | PlatformMatchStatus;
  gameSlug: string;
  href: string;
}

export interface PlatformOrganization {
  slug: string;
  name: string;
  type: string;
  summary: string;
  description: string;
  headquarters: string;
  games: string[];
  teams: string[];
  eventsHosted: number;
  prizePools: string;
  sponsors: string[];
  achievements: string[];
  website?: string;
}

export interface PlatformSponsorProfile {
  id: string;
  slug: string;
  name: string;
  kind: SponsorKind;
  tier: string;
  logoUrl?: string | null;
  bannerUrl?: string | null;
  designAssetUrl?: string | null;
  description: string;
  websiteUrl?: string;
  socialUrl?: string;
  supportedEvents: string[];
  eventSlugs: string[];
  partnershipHistory: string[];
  visible: boolean;
  featured: boolean;
  showOnHomepage: boolean;
  showOnSponsorsPage: boolean;
  showOnEventPage: boolean;
  showOnPubgPage: boolean;
  updatedAt?: string;
}

export interface PlatformMediaItem {
  id: string;
  slug: string;
  title: string;
  kind: string;
  category: string;
  gameSlug: string;
  duration?: string;
  summary: string;
  imageUrl?: string;
  url?: string;
  featured: boolean;
  publishedAt?: string;
  updatedAt?: string;
}

export interface PlatformHubData {
  brand: {
    name: string;
    tagline: string;
    mission: string;
  };
  games: PlatformGame[];
  news: PlatformArticle[];
  events: PlatformEvent[];
  matches: PlatformMatch[];
  calendar: PlatformCalendarItem[];
  organizations: PlatformOrganization[];
  sponsors: PlatformSponsorProfile[];
  media: PlatformMediaItem[];
  home: {
    heroSlides: HomepageHeroSlideRecord[];
    breakingNews: PlatformArticle | null;
    featuredNews: PlatformArticle[];
    featuredEvents: PlatformEvent[];
    upcomingEvents: PlatformEvent[];
    featuredSponsors: PlatformSponsorProfile[];
    featuredMedia: PlatformMediaItem[];
    featuredTeamIds: string[];
    featuredPlayerIds: string[];
    liveMatches: PlatformMatch[];
    upcomingMatches: PlatformMatch[];
    recentMatches: PlatformMatch[];
    featuredGames: PlatformGame[];
    liveFeature: {
      title: string;
      subtitle: string;
      viewers: string;
      href: string;
    };
  };
}

const GAME_BLUEPRINTS = [
  {
    slug: "pubg-pc",
    name: "PUBG PC",
    shortName: "PUBG",
    tagline: "Flagship stats hub for Nepal PUBG coverage",
    summary: "Official Bravo PUBG coverage with events, teams, players, results, rankings, and public match data in one place.",
    status: "flagship",
    flagship: true,
    heroLabel: "Flagship Coverage",
    primaryHref: "/pubg",
    analyticsHref: "/pubg",
    sections: ["Overview", "Events", "Teams", "Players", "Matches", "Rankings", "Compare", "Media"],
    completionLabel: "Full analytics coverage live",
  },
  {
    slug: "valorant",
    name: "Valorant",
    shortName: "VAL",
    tagline: "Tournament-ready tactical FPS hub",
    summary: "Planned as the next full game hub with event listings, team profiles, match center, rankings, media, and organizer support.",
    status: "building",
    flagship: false,
    heroLabel: "Coming Soon",
    primaryHref: "/games/valorant",
    sections: ["Overview", "Events", "Teams", "Players", "Matches", "Rankings", "Media", "News"],
    completionLabel: "Coverage opening soon",
  },
  {
    slug: "cs2",
    name: "CS2",
    shortName: "CS2",
    tagline: "LAN and league ecosystem support",
    summary: "Prepared for Nepal CS2 circuits, LAN brackets, roster tracking, rankings, and match center coverage.",
    status: "building",
    flagship: false,
    heroLabel: "Coming Soon",
    primaryHref: "/games/cs2",
    sections: ["Overview", "Events", "Teams", "Players", "Matches", "Rankings", "Media", "News"],
    completionLabel: "Coverage opening soon",
  },
  {
    slug: "dota-2",
    name: "Dota 2",
    shortName: "Dota",
    tagline: "MOBA ecosystem and event directory",
    summary: "Ready for seasonal competition coverage, roster history, organizer profiles, and match archives once live data is added.",
    status: "planned",
    flagship: false,
    heroLabel: "Coming Soon",
    primaryHref: "/games/dota-2",
    sections: ["Overview", "Events", "Teams", "Players", "Matches", "Rankings", "Media", "News"],
    completionLabel: "Coverage opening soon",
  },
  {
    slug: "mobile-legends",
    name: "Mobile Legends",
    shortName: "MLBB",
    tagline: "Mobile circuit growth lane",
    summary: "Prepared for mobile competition calendars, team directories, match center views, and sponsor-facing event packages.",
    status: "planned",
    flagship: false,
    heroLabel: "Coming Soon",
    primaryHref: "/games/mobile-legends",
    sections: ["Overview", "Events", "Teams", "Players", "Matches", "Rankings", "Media", "News"],
    completionLabel: "Coverage opening soon",
  },
  {
    slug: "free-fire",
    name: "Free Fire",
    shortName: "FF",
    tagline: "Future mobile battle royale lane",
    summary:
      "The Bravo games hub is already structured so Free Fire can slot into the same public event, team, match, and media experience when coverage expands.",
    status: "planned",
    flagship: false,
    heroLabel: "Coming Soon",
    primaryHref: "/games/free-fire",
    sections: ["Overview", "Events", "Teams", "Players", "Matches", "Rankings", "Media", "News"],
    completionLabel: "Coverage opening soon",
  },
] as const satisfies ReadonlyArray<
  Omit<PlatformGame, "activeEvents" | "trackedMatches" | "trackedTeams" | "trackedPlayers" | "featuredNewsCount">
>;

const PLANNED_EVENTS: PlatformEvent[] = [];

const PLANNED_MATCHES: PlatformMatch[] = [];

const ARTICLE_SEEDS: PlatformArticle[] = [];

const ORGANIZATION_SEEDS: PlatformOrganization[] = [];

const MEDIA_SEEDS: PlatformMediaItem[] = [];

const PUBLIC_FALLBACK_EVENTS: PlatformEvent[] = [
  {
    id: "public-fallback-bravo-daily-scrims-day-4",
    slug: "bravo-daily-scrims-day-4",
    name: "Bravo Daily Scrims Day 4",
    gameSlug: "pubg-pc",
    gameName: "PUBG PC",
    type: "Daily Scrims",
    status: "completed",
    state: "published",
    featured: true,
    region: "Nepal",
    organizerName: "Bravo Gaming Esports",
    prizePool: "TBD",
    teamsCount: 20,
    matchesCount: 4,
    startDate: "2026-07-12",
    endDate: "2026-07-12",
    bannerUrl: null,
    summary:
      "Official Bravo Daily Scrims Day 4 event page with published match count, registration links for future events, and verified status updates.",
    analyticsHref: "/pubg/results",
    streamHref: "/live-stream",
    topTeamName: null,
    topPlayerName: null,
    sponsorName: "HUKUT Store",
    pointSystemName: "Bravo PUBG",
    tabs: ["Overview", "Schedule", "Registration", "Rules", "Sponsors"],
    updatedAt: "2026-07-16T00:00:00.000Z",
  },
  {
    id: "public-fallback-bravo-weekend-showdown",
    slug: "bravo-weekend-showdown",
    name: "Bravo Weekend Showdown",
    gameSlug: "pubg-pc",
    gameName: "PUBG PC",
    type: "Weekend Tournament",
    status: "completed",
    state: "published",
    featured: false,
    region: "Nepal",
    organizerName: "Bravo Gaming Esports",
    prizePool: "TBD",
    teamsCount: 16,
    matchesCount: 0,
    startDate: "2026-06-28",
    endDate: "2026-06-28",
    bannerUrl: null,
    summary:
      "Official Bravo Weekend Showdown page with results status, event rules, and registration guidance for the next Bravo competition window.",
    analyticsHref: undefined,
    streamHref: "/live-stream",
    topTeamName: null,
    topPlayerName: null,
    sponsorName: "HUKUT Store",
    pointSystemName: "Bravo PUBG",
    tabs: ["Overview", "Schedule", "Registration", "Rules", "Sponsors"],
    updatedAt: "2026-07-16T00:00:00.000Z",
  },
];

const PUBLIC_FALLBACK_SPONSOR_ITEMS: SponsorItem[] = [
  {
    id: "public-fallback-hukut-store",
    slug: "hukut-store",
    name: "HUKUT Store",
    kind: "partner",
    tier: "Official Partner",
    description: "Official partner supporting Bravo Gaming Esports broadcasts, scrims, and public tournament coverage.",
    supportedEvents: ["Bravo Gaming Esports Presents PUBG MAHASANGRAM", "Bravo Daily Scrims Day 4"],
    eventSlugs: ["pubg-mahasangram-53821", "bravo-daily-scrims-day-4", "bravo-weekend-showdown"],
    partnershipHistory: ["Official public event partner for Bravo Gaming Esports."],
    visible: true,
    featured: true,
    published: true,
    showOnHomepage: true,
    showOnSponsorsPage: true,
    showOnEventPage: true,
    showOnPubgPage: true,
    createdAt: "2026-07-16T00:00:00.000Z",
    updatedAt: "2026-07-16T00:00:00.000Z",
  },
];

const PUBLIC_FALLBACK_EVENTS_BY_SLUG = new Map(PUBLIC_FALLBACK_EVENTS.map((event) => [event.slug.toLowerCase(), event] as const));

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

const DEFAULT_PARTNER_DESCRIPTION = "Partner details will be updated soon.";

function normalizeSponsorKind(value?: string | null, tier?: string | null): SponsorKind {
  if (value === "sponsor" || value === "partner" || value === "design") {
    return value;
  }

  const normalizedTier = tier?.trim().toLowerCase() ?? "";
  if (normalizedTier.includes("design") || normalizedTier.includes("creative")) {
    return "design";
  }
  if (normalizedTier.includes("sponsor")) {
    return "sponsor";
  }
  return "partner";
}

function sortSponsorProfiles(firstSponsor: PlatformSponsorProfile, secondSponsor: PlatformSponsorProfile) {
  return (
    Number(secondSponsor.featured) - Number(firstSponsor.featured) ||
    Number(secondSponsor.showOnHomepage) - Number(firstSponsor.showOnHomepage) ||
    (secondSponsor.updatedAt ?? "").localeCompare(firstSponsor.updatedAt ?? "") ||
    firstSponsor.name.localeCompare(secondSponsor.name)
  );
}

function toTimestamp(value?: string) {
  if (!value) return Number.NaN;
  return Date.parse(value);
}

function inferArticleCategory(title: string, detail: string) {
  const haystack = `${title} ${detail}`.toLowerCase();
  if (haystack.includes("valorant")) return "Valorant";
  if (haystack.includes("cs2") || haystack.includes("counter-strike")) return "CS2";
  if (haystack.includes("dota")) return "Dota 2";
  if (haystack.includes("international")) return "International Esports";
  if (haystack.includes("sponsor")) return "Bravo Gaming";
  if (haystack.includes("pubg") || haystack.includes("scrim") || haystack.includes("mahasangram")) return "PUBG";
  return "Nepal Esports";
}

function pickArticleTags(category: string, title: string) {
  const tags = new Set<string>([category]);
  const haystack = title.toLowerCase();
  if (haystack.includes("sponsor")) tags.add("Sponsors");
  if (haystack.includes("roster")) tags.add("Roster");
  if (haystack.includes("winner")) tags.add("Results");
  if (haystack.includes("fantasy")) tags.add("Fantasy");
  if (haystack.includes("platform")) tags.add("Platform");
  if (haystack.includes("tournament") || haystack.includes("event")) tags.add("Events");
  return Array.from(tags);
}

function normalizeArticleBody(summary: string, detail: string) {
  return [summary, detail].filter(Boolean);
}

function compareByDateDesc<T extends { startDate?: string; scheduledAt?: string; date?: string }>(firstValue: T, secondValue: T) {
  const firstKey = firstValue.startDate ?? firstValue.scheduledAt ?? firstValue.date ?? "";
  const secondKey = secondValue.startDate ?? secondValue.scheduledAt ?? secondValue.date ?? "";

  const firstTimestamp = toTimestamp(firstKey);
  const secondTimestamp = toTimestamp(secondKey);

  if (Number.isFinite(firstTimestamp) && Number.isFinite(secondTimestamp) && firstTimestamp !== secondTimestamp) {
    return secondTimestamp - firstTimestamp;
  }

  return secondKey.localeCompare(firstKey);
}

function getEventStatusPriority(status: PlatformEventStatus) {
  if (status === "live") return 0;
  if (status === "upcoming") return 1;
  if (status === "completed") return 2;
  return 3;
}

function compareEventsForPublicDisplay(firstEvent: PlatformEvent, secondEvent: PlatformEvent) {
  const statusDelta = getEventStatusPriority(firstEvent.status) - getEventStatusPriority(secondEvent.status);
  if (statusDelta !== 0) {
    return statusDelta;
  }

  const featuredDelta = Number(secondEvent.featured) - Number(firstEvent.featured);
  if (featuredDelta !== 0) {
    return featuredDelta;
  }

  const flagshipDelta = Number(secondEvent.gameSlug === "pubg-pc") - Number(firstEvent.gameSlug === "pubg-pc");
  if (flagshipDelta !== 0) {
    return flagshipDelta;
  }

  return compareByDateDesc(firstEvent, secondEvent);
}

function mergeFallbackItems<T>(fallbackItems: T[], liveItems: T[], getKey: (item: T) => string) {
  const itemsByKey = new Map<string, T>();

  for (const item of fallbackItems) {
    itemsByKey.set(getKey(item), item);
  }

  for (const item of liveItems) {
    itemsByKey.set(getKey(item), item);
  }

  return Array.from(itemsByKey.values());
}

function selectOrderedItems<T>(items: T[], orderedKeys: string[], getKey: (item: T) => string) {
  if (orderedKeys.length === 0) {
    return [];
  }

  const itemByKey = new Map(items.map((item) => [getKey(item), item]));
  return orderedKeys.map((key) => itemByKey.get(key) ?? null).filter((item): item is NonNullable<typeof item> => item !== null);
}

function dedupeArticlesBySlug(articles: PlatformArticle[]) {
  const articleBySlug = new Map<string, PlatformArticle>();

  for (const article of articles) {
    if (!articleBySlug.has(article.slug)) {
      articleBySlug.set(article.slug, article);
    }
  }

  return Array.from(articleBySlug.values());
}

function sanitizeArticleForPublicDisplay(article: PlatformArticle): PlatformArticle | null {
  if (
    isInternalOnlyCategory(article.category) ||
    hasPublicDemoMarker(
      article.title,
      article.slug,
      article.summary,
      article.excerpt,
      article.category,
      article.imageUrl,
      article.ogImageUrl,
      ...article.tags,
      ...article.body,
    )
  ) {
    return null;
  }

  const summary =
    sanitizePublicCopy(article.summary) ??
    sanitizePublicCopy(article.excerpt) ??
    "Official Bravo coverage will appear here once the story is published.";
  const excerpt = sanitizePublicCopy(article.excerpt ?? article.summary, summary) ?? summary;
  const body = article.body
    .map((paragraph) => sanitizePublicCopy(paragraph))
    .filter((paragraph): paragraph is string => Boolean(paragraph));

  return {
    ...article,
    summary,
    excerpt,
    imageUrl: sanitizePublicAssetUrl(article.imageUrl) ?? undefined,
    ogImageUrl: sanitizePublicAssetUrl(article.ogImageUrl) ?? undefined,
    body: body.length > 0 ? body : [excerpt],
  };
}

function sanitizeEventForPublicDisplay(event: PlatformEvent): PlatformEvent | null {
  if (hasPublicDemoMarker(event.name, event.slug, event.type, event.region, event.organizerName, event.sponsorName ?? undefined)) {
    return null;
  }

  return {
    ...event,
    bannerUrl: sanitizePublicAssetUrl(event.bannerUrl ?? undefined) ?? null,
    summary:
      sanitizePublicCopy(
        event.summary,
        event.status === "completed"
          ? "Official event results and standings will appear here after publication."
          : "Official event details will appear here after publication.",
      ) ??
      (event.status === "completed"
        ? "Official event results and standings will appear here after publication."
        : "Official event details will appear here after publication."),
  };
}

function sanitizeSponsorProfileForPublicDisplay(sponsor: PlatformSponsorProfile): PlatformSponsorProfile | null {
  if (
    hasPublicDemoMarker(
      sponsor.name,
      sponsor.slug,
      sponsor.description,
      sponsor.logoUrl ?? undefined,
      sponsor.bannerUrl ?? undefined,
      sponsor.designAssetUrl ?? undefined,
      ...sponsor.supportedEvents,
      ...sponsor.partnershipHistory,
    )
  ) {
    return null;
  }

  return {
    ...sponsor,
    description: sanitizePublicCopy(sponsor.description, DEFAULT_PARTNER_DESCRIPTION) ?? DEFAULT_PARTNER_DESCRIPTION,
    logoUrl: sanitizePublicAssetUrl(sponsor.logoUrl ?? undefined) ?? null,
    bannerUrl: sanitizePublicAssetUrl(sponsor.bannerUrl ?? undefined) ?? null,
    designAssetUrl: sanitizePublicAssetUrl(sponsor.designAssetUrl ?? undefined) ?? null,
    supportedEvents: sponsor.supportedEvents.filter((eventName) => !hasPublicDemoMarker(eventName)),
    partnershipHistory: sponsor.partnershipHistory.filter((item) => !hasPublicDemoMarker(item)),
  };
}

function sanitizeMediaItemForPublicDisplay(item: PlatformMediaItem): PlatformMediaItem | null {
  if (hasPublicDemoMarker(item.title, item.slug, item.kind, item.category, item.summary, item.imageUrl, item.url)) {
    return null;
  }

  return {
    ...item,
    summary:
      sanitizePublicCopy(item.summary, "Published Bravo media coverage will appear here soon.") ??
      "Published Bravo media coverage will appear here soon.",
    imageUrl: sanitizePublicAssetUrl(item.imageUrl) ?? undefined,
  };
}

function buildSponsorProfiles(sponsorRows: Awaited<ReturnType<typeof getSponsors>>, eventRows: PlatformEvent[]): PlatformSponsorProfile[] {
  const eventBySlug = new Map(eventRows.map((eventRow) => [eventRow.slug, eventRow]));
  const eventByName = new Map(eventRows.map((eventRow) => [eventRow.name.toLowerCase(), eventRow]));

  const mappedRows = sponsorRows.map((row) => ({
    id: row.id,
    slug: row.slug ?? slugify(row.name),
    name: row.name,
    kind: normalizeSponsorKind(row.kind, row.tier),
    tier: row.tier,
    description: row.description ?? DEFAULT_PARTNER_DESCRIPTION,
    websiteUrl: row.websiteUrl ?? row.url,
    socialUrl: row.socialUrl,
    logoUrl: row.logoUrl ?? null,
    bannerUrl: row.bannerUrl ?? null,
    designAssetUrl: row.designAssetUrl ?? null,
    eventSlugs: Array.from(
      new Set([
        ...(row.eventSlugs ?? []),
        ...(row.supportedEvents ?? [])
          .map((eventName) => eventByName.get(eventName.toLowerCase())?.slug ?? null)
          .filter((eventSlug): eventSlug is string => Boolean(eventSlug)),
        ...eventRows.filter((eventRow) => eventRow.sponsorName && eventRow.sponsorName === row.name).map((eventRow) => eventRow.slug),
      ]),
    ),
    supportedEvents: row.supportedEvents ?? [],
    partnershipHistory: row.partnershipHistory?.length ? row.partnershipHistory : [],
    visible: row.visible !== false,
    featured: Boolean(row.featured),
    showOnHomepage: Boolean(row.showOnHomepage),
    showOnSponsorsPage: row.showOnSponsorsPage !== false,
    showOnEventPage: Boolean(row.showOnEventPage),
    showOnPubgPage: Boolean(row.showOnPubgPage),
    updatedAt: row.updatedAt ?? row.createdAt,
  }));

  const hydratedRows = mappedRows.map((row) => {
    const supportedEvents =
      row.eventSlugs.length > 0
        ? row.eventSlugs
            .map((eventSlug) => eventBySlug.get(eventSlug)?.name ?? null)
            .filter((eventName): eventName is string => Boolean(eventName))
        : row.supportedEvents;
    const includesPubgEvent = row.eventSlugs.some((eventSlug) => eventBySlug.get(eventSlug)?.gameSlug === "pubg-pc");

    return {
      ...row,
      supportedEvents: supportedEvents.length > 0 ? supportedEvents : row.supportedEvents?.length ? row.supportedEvents : [],
      showOnEventPage: row.showOnEventPage || row.eventSlugs.length > 0,
      showOnPubgPage: row.showOnPubgPage || includesPubgEvent,
    };
  });

  return hydratedRows.filter((row) => row.visible).sort(sortSponsorProfiles);
}

export const getPlatformHubData = cache(async (): Promise<PlatformHubData> => {
  const [pubg, announcements, liveStream, sponsors, videos, homepageContent, managedNewsArticles, managedGames, managedPlatformEvents] =
    await Promise.all([
      getPubgHubDataset(),
      getAnnouncements(),
      getLiveStreamFeed(),
      getSponsors(),
      getVideos(),
      getHomepageContent(),
      getPublishedManagedNewsArticles(),
      getManagedPlatformGames(),
      getManagedPlatformEvents(),
    ]);

  const managedNews: PlatformArticle[] = managedNewsArticles.map((article) => ({
    id: article.id,
    slug: article.slug,
    title: article.title,
    summary: article.summary,
    excerpt: article.excerpt ?? article.summary,
    date: article.publishedAt ?? article.publishAt ?? article.date,
    category: article.category,
    tags: [...article.tags],
    authorName: article.authorName,
    gameSlug: article.gameSlug,
    featured: article.featured,
    breaking: article.breaking,
    imageUrl: article.imageUrl,
    seoTitle: article.seoTitle,
    seoDescription: article.seoDescription,
    ogImageUrl: article.ogImageUrl,
    canonicalUrl: article.canonicalUrl,
    body: [...article.body],
    relatedSlugs: [],
    publishedAt: article.publishedAt ?? article.publishAt,
    updatedAt: article.updatedAt ?? article.date,
  }));

  const newsFromAnnouncements: PlatformArticle[] = announcements.map((announcement, index) => {
    const category = announcement.category?.trim() || inferArticleCategory(announcement.title, announcement.detail);
    const slug = slugify(`${announcement.title}-${announcement.date}`);

    return {
      id: announcement.id,
      slug,
      title: announcement.title,
      summary: announcement.detail,
      excerpt: announcement.detail,
      date: announcement.date,
      category,
      tags: pickArticleTags(category, announcement.title),
      authorName: "Bravo Editorial Desk",
      gameSlug: category === "PUBG" ? "pubg-pc" : undefined,
      featured: index < 2,
      breaking: index === 0,
      imageUrl: undefined,
      seoTitle: undefined,
      seoDescription: undefined,
      body: normalizeArticleBody(announcement.title, announcement.detail),
      relatedSlugs: [],
      publishedAt: announcement.date,
      updatedAt: announcement.date,
    };
  });

  const seededArticles: PlatformArticle[] = ARTICLE_SEEDS.map((item) => ({
    id: item.id,
    slug: slugify(item.title),
    title: item.title,
    summary: item.summary,
    excerpt: item.excerpt ?? item.summary,
    date: item.date,
    category: item.category,
    tags: [...item.tags],
    authorName: item.authorName,
    gameSlug: item.gameSlug,
    featured: item.featured,
    breaking: item.breaking,
    imageUrl: undefined,
    seoTitle: undefined,
    seoDescription: undefined,
    body: [...item.body],
    relatedSlugs: [],
    publishedAt: item.publishedAt,
    updatedAt: item.date,
  }));

  const news = dedupeArticlesBySlug([...managedNews, ...newsFromAnnouncements, ...seededArticles])
    .map((article) => sanitizeArticleForPublicDisplay(article))
    .filter((article): article is PlatformArticle => article !== null)
    .sort(compareByDateDesc)
    .map((article, _, allArticles) => ({
      ...article,
      relatedSlugs: allArticles
        .filter(
          (candidate) =>
            candidate.slug !== article.slug && (candidate.category === article.category || candidate.gameSlug === article.gameSlug),
        )
        .slice(0, 3)
        .map((candidate) => candidate.slug),
    }));

  const pubgEvents: PlatformEvent[] = pubg.events.map((event) => ({
    id: event.id,
    slug: event.slug,
    name: event.name,
    gameSlug: "pubg-pc",
    gameName: "PUBG PC",
    type: event.type,
    status: event.status === "ongoing" ? "live" : event.status === "finished" ? "completed" : "upcoming",
    state: event.state === "draft" ? "planned" : "published",
    featured: event.status !== "finished" || event.slug === "pubg-mahasangram-2026",
    region: event.region,
    organizerName: "Bravo Gaming Esports",
    prizePool: event.prizePool,
    teamsCount: event.teamCount,
    matchesCount: event.matchCount,
    startDate: event.startDate,
    endDate: event.endDate,
    bannerUrl: event.bannerUrl ?? null,
    summary:
      event.description ??
      "Bravo PUBG event coverage with standings, player stats, match activity, sponsor context, and deeper analytics from the flagship game hub.",
    analyticsHref: `/pubg/events/${event.slug}`,
    streamHref: event.streamUrl ?? "/live-stream",
    topTeamName: event.standings[0]?.teamName ?? null,
    topPlayerName: event.playerTable[0]?.pubgName ?? null,
    sponsorName: null,
    pointSystemName: "Bravo PUBG",
    tabs: ["Overview", "Standings", "Teams", "Players", "Matches", "Schedule", "Statistics", "Media", "Sponsors", "Rules"],
    updatedAt: event.startDate,
  }));

  const managedEvents: PlatformEvent[] = managedPlatformEvents.map((event) => ({
    id: event.id,
    slug: event.slug,
    name: event.name,
    gameSlug: event.gameSlug,
    gameName: event.gameName,
    type: event.type,
    status: event.status,
    state: event.state,
    featured: event.featured,
    region: event.region,
    organizerName: event.organizerName,
    prizePool: event.prizePool,
    teamsCount: event.teamsCount,
    matchesCount: event.matchesCount,
    startDate: event.startDate,
    endDate: event.endDate,
    bannerUrl: event.bannerUrl ?? null,
    summary: event.summary,
    analyticsHref: event.analyticsHref,
    streamHref: event.streamHref,
    topTeamName: event.topTeamName,
    topPlayerName: event.topPlayerName,
    sponsorName: event.sponsorName,
    pointSystemName: event.pointSystemName ?? null,
    tabs: event.tabs.length > 0 ? event.tabs : ["Overview", "Teams", "Matches", "Schedule", "Statistics", "Sponsors", "Rules"],
    updatedAt: event.updatedAt ?? event.startDate,
  }));

  const baseEvents = [...pubgEvents, ...(managedEvents.length > 0 ? managedEvents : PLANNED_EVENTS)]
    .map((event) => sanitizeEventForPublicDisplay(event))
    .filter((event): event is PlatformEvent => event !== null);
  const events = mergeFallbackItems(PUBLIC_FALLBACK_EVENTS, baseEvents, (event) => event.slug.toLowerCase()).sort(
    compareEventsForPublicDisplay,
  );
  const sponsorProfiles = buildSponsorProfiles(
    mergeFallbackItems(PUBLIC_FALLBACK_SPONSOR_ITEMS, sponsors, (sponsor) => (sponsor.slug ?? sponsor.name).trim().toLowerCase()),
    events,
  )
    .map((sponsor) => sanitizeSponsorProfileForPublicDisplay(sponsor))
    .filter((sponsor): sponsor is PlatformSponsorProfile => sponsor !== null);

  const pubgMatches: PlatformMatch[] = pubg.matches.map((match) => {
    const orderedTeams = [...match.teamResults].sort(
      (firstValue, secondValue) => firstValue.placement - secondValue.placement || secondValue.totalPoints - firstValue.totalPoints,
    );
    const topFragger = [...match.playerResults].sort(
      (firstValue, secondValue) => secondValue.kills - firstValue.kills || secondValue.damage - firstValue.damage,
    )[0];

    return {
      id: match.id,
      gameSlug: "pubg-pc",
      gameName: "PUBG PC",
      eventSlug: match.eventSlug,
      eventName: match.eventName,
      status: match.status === "published" ? (match.eventStatus === "ongoing" ? "live" : "completed") : "upcoming",
      scheduledAt: match.startTime,
      stageLabel: `Match ${match.matchNumber}`,
      format: "Squad TPP",
      mapLabel: match.mapName,
      teamA: orderedTeams[0]?.teamName ?? "Winner Pending",
      teamB: orderedTeams[1]?.teamName ?? "Second Pending",
      scoreA: orderedTeams[0]?.totalPoints ?? null,
      scoreB: orderedTeams[1]?.totalPoints ?? null,
      winnerName: match.winnerTeamName ?? null,
      mvpName: topFragger?.pubgName ?? null,
      analyticsHref: `/pubg/events/${match.eventSlug}?tab=matches`,
      vodHref: match.vodUrl ?? null,
      viewerCount: liveStream.isLive && match.eventStatus === "ongoing" ? (liveStream.viewers ?? "Live") : null,
      summary:
        match.status === "published"
          ? `Published ${match.mapName} result from ${match.eventName} with ${match.totalKills} total kills tracked.`
          : `Result waiting on approval for ${match.eventName} match ${match.matchNumber}.`,
      updatedAt: match.startTime,
    };
  });

  const matches = [...pubgMatches, ...PLANNED_MATCHES].sort(compareByDateDesc);

  const gameBlueprints =
    managedGames.length > 0
      ? managedGames.map((game) => ({
          slug: game.slug,
          name: game.name,
          shortName: game.shortName,
          tagline: game.tagline,
          summary: game.summary,
          status: game.status,
          flagship: game.flagship,
          heroLabel: game.heroLabel,
          primaryHref: game.slug === "pubg-pc" ? "/pubg" : game.primaryHref,
          analyticsHref: game.slug === "pubg-pc" ? "/pubg" : game.analyticsHref,
          sections: game.slug === "pubg-pc" ? game.sections.filter((section) => section.toLowerCase() !== "fantasy") : game.sections,
          completionLabel: game.completionLabel,
          activeEvents: game.activeEvents,
          trackedMatches: game.trackedMatches,
          trackedTeams: game.trackedTeams,
          trackedPlayers: game.trackedPlayers,
          featuredNewsCount: game.featuredNewsCount,
        }))
      : GAME_BLUEPRINTS;

  const games: PlatformGame[] = gameBlueprints.map((gameBlueprint) => {
    const relatedEvents = events.filter((event) => event.gameSlug === gameBlueprint.slug);
    const relatedMatches = matches.filter((match) => match.gameSlug === gameBlueprint.slug);
    const relatedArticles = news.filter(
      (article) =>
        article.gameSlug === gameBlueprint.slug || article.category === gameBlueprint.name || article.category === gameBlueprint.shortName,
    );

    if (gameBlueprint.slug === "pubg-pc") {
      return {
        ...gameBlueprint,
        activeEvents: pubg.summary.activeEvents,
        trackedMatches: pubg.summary.trackedMatches,
        trackedTeams: pubg.teams.length,
        trackedPlayers: pubg.players.length,
        featuredNewsCount: relatedArticles.length,
      };
    }

    return {
      ...gameBlueprint,
      activeEvents:
        "activeEvents" in gameBlueprint && typeof gameBlueprint.activeEvents === "number"
          ? gameBlueprint.activeEvents
          : relatedEvents.filter((event) => event.status === "live" || event.status === "upcoming").length,
      trackedMatches:
        "trackedMatches" in gameBlueprint && typeof gameBlueprint.trackedMatches === "number"
          ? gameBlueprint.trackedMatches
          : relatedMatches.filter((match) => match.status !== "planned").length,
      trackedTeams:
        "trackedTeams" in gameBlueprint && typeof gameBlueprint.trackedTeams === "number"
          ? gameBlueprint.trackedTeams
          : relatedEvents.reduce((sum, event) => Math.max(sum, event.teamsCount), 0),
      trackedPlayers:
        "trackedPlayers" in gameBlueprint && typeof gameBlueprint.trackedPlayers === "number" ? gameBlueprint.trackedPlayers : 0,
      featuredNewsCount:
        "featuredNewsCount" in gameBlueprint && typeof gameBlueprint.featuredNewsCount === "number"
          ? gameBlueprint.featuredNewsCount
          : relatedArticles.length,
    };
  });

  const calendar: PlatformCalendarItem[] = [
    ...events.map((event) => ({
      id: `event-${event.id}`,
      title: event.name,
      subtitle: `${event.gameName} | ${event.type}`,
      date: event.startDate,
      type: "Event",
      status: event.status,
      gameSlug: event.gameSlug,
      href: event.gameSlug === "pubg-pc" ? `/pubg/events/${event.slug}` : `/events/${event.slug}`,
    })),
    ...matches.map((match) => ({
      id: `match-${match.id}`,
      title: `${match.teamA} vs ${match.teamB}`,
      subtitle: `${match.gameName} | ${match.stageLabel}`,
      date: match.scheduledAt,
      type: "Match",
      status: match.status,
      gameSlug: match.gameSlug,
      href:
        match.gameSlug === "pubg-pc"
          ? match.eventSlug
            ? `/pubg/events/${match.eventSlug}?tab=matches`
            : "/pubg/results"
          : `/matches/${match.id}`,
    })),
  ].sort(compareByDateDesc);

  const managedMedia: PlatformMediaItem[] = videos.map((video, index) => ({
    id: video.id,
    slug: video.slug ?? slugify(video.title),
    title: video.title,
    kind: video.kind ?? "Video",
    category: video.category,
    gameSlug: video.gameSlug ?? "pubg-pc",
    duration: video.duration,
    summary: video.summary ?? "Published Bravo media content ready for event, sponsor, and community distribution.",
    imageUrl: video.imageUrl,
    url: video.url,
    featured: video.featured ?? index < 2,
    publishedAt: video.publishedAt,
    updatedAt: video.updatedAt ?? video.publishedAt ?? video.createdAt,
  }));

  const media: PlatformMediaItem[] = (managedMedia.length > 0 ? managedMedia : MEDIA_SEEDS)
    .map((item) => sanitizeMediaItemForPublicDisplay(item))
    .filter((item): item is PlatformMediaItem => item !== null);

  const curatedFeaturedNews = selectOrderedItems(news, homepageContent.featuredNewsSlugs, (article) => article.slug) ?? [];
  const curatedFeaturedEvents = selectOrderedItems(events, homepageContent.featuredEventSlugs, (event) => event.slug);
  const homepageSponsorProfiles = sponsorProfiles.filter((sponsor) => sponsor.showOnHomepage);
  const curatedFeaturedSponsors = selectOrderedItems(
    homepageSponsorProfiles,
    homepageContent.featuredSponsorSlugs,
    (sponsor) => sponsor.slug,
  );
  const curatedFeaturedMedia = selectOrderedItems(media, homepageContent.featuredMediaIds, (item) => item.id);
  const configuredBreakingNews = homepageContent.breakingNewsSlug
    ? (news.find((article) => article.slug === homepageContent.breakingNewsSlug) ?? null)
    : null;

  return {
    brand: {
      name: "Bravo Gaming Esports",
      tagline: "Nepal's Premier Esports Platform",
      mission:
        "Build the central hub of Nepal esports where players, teams, organizers, sponsors, casters, communities, and fans can access everything from one platform.",
    },
    games,
    news,
    events,
    matches,
    calendar,
    organizations: ORGANIZATION_SEEDS,
    sponsors: sponsorProfiles,
    media,
    home: {
      heroSlides: homepageContent.heroSlides,
      breakingNews: configuredBreakingNews ?? news.find((article) => article.breaking) ?? news[0] ?? null,
      featuredNews:
        curatedFeaturedNews.length > 0 ? curatedFeaturedNews.slice(0, 4) : news.filter((article) => article.featured).slice(0, 4),
      featuredEvents:
        curatedFeaturedEvents.length > 0 ? curatedFeaturedEvents.slice(0, 4) : events.filter((event) => event.featured).slice(0, 4),
      upcomingEvents: events.filter((event) => event.status === "upcoming" || event.status === "planned").slice(0, 5),
      featuredSponsors:
        curatedFeaturedSponsors.length > 0
          ? curatedFeaturedSponsors.slice(0, 4)
          : homepageSponsorProfiles.filter((sponsor) => sponsor.featured).slice(0, 4).length > 0
            ? homepageSponsorProfiles.filter((sponsor) => sponsor.featured).slice(0, 4)
            : homepageSponsorProfiles.slice(0, 4),
      featuredMedia: curatedFeaturedMedia.length > 0 ? curatedFeaturedMedia.slice(0, 4) : media.slice(0, 4),
      featuredTeamIds: homepageContent.featuredTeamIds,
      featuredPlayerIds: homepageContent.featuredPlayerIds,
      liveMatches: matches.filter((match) => match.status === "live").slice(0, 3),
      upcomingMatches: matches.filter((match) => match.status === "upcoming" || match.status === "planned").slice(0, 4),
      recentMatches: matches.filter((match) => match.status === "completed").slice(0, 4),
      featuredGames: games.slice(0, 6),
      liveFeature: {
        title: homepageContent.liveTitle || liveStream.title || "Bravo Gaming Broadcast",
        subtitle: homepageContent.liveSubtitle || liveStream.description || "Current live coverage and event broadcast window.",
        viewers: homepageContent.liveViewers || liveStream.viewers || (liveStream.isLive ? "Live now" : "Broadcast scheduled"),
        href: homepageContent.liveHref || liveStream.channelUrl || "/live-stream",
      },
    },
  };
});

export async function getPlatformGameBySlug(slug: string) {
  const hub = await getPlatformHubData();
  return hub.games.find((game) => game.slug === slug) ?? null;
}

export async function getPlatformArticleBySlug(slug: string) {
  const hub = await getPlatformHubData();
  return hub.news.find((article) => article.slug === slug) ?? null;
}

export async function getPlatformEventBySlug(slug: string) {
  const hub = await getPlatformHubData();
  return hub.events.find((event) => event.slug === slug) ?? getPlatformFallbackEventBySlug(slug);
}

export function getPlatformFallbackEventBySlug(slug: string) {
  return PUBLIC_FALLBACK_EVENTS_BY_SLUG.get(slug.trim().toLowerCase()) ?? null;
}

export async function getPlatformOrganizationBySlug(slug: string) {
  const hub = await getPlatformHubData();
  return hub.organizations.find((organization) => organization.slug === slug) ?? null;
}

export async function getPlatformSponsorBySlug(slug: string) {
  const hub = await getPlatformHubData();
  return hub.sponsors.find((sponsor) => sponsor.slug === slug) ?? null;
}

export async function getPlatformMediaBySlug(slug: string) {
  const hub = await getPlatformHubData();
  return hub.media.find((item) => item.slug === slug) ?? null;
}
