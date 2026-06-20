import { cache } from "react";
import { getAnnouncements, getLiveStreamFeed, getSponsors, getVideos } from "./data";
import { getHomepageContent, getPublishedManagedNewsArticles, type HomepageHeroSlideRecord } from "./platform-content";
import { getManagedPlatformEvents, getManagedPlatformGames } from "./platform-cms";
import { getPubgHubDataset } from "./pubg-hub";
import type { SponsorKind } from "./types";

export type PlatformGameStatus = "flagship" | "active" | "building" | "planned";
export type PlatformEventStatus = "live" | "upcoming" | "completed" | "planned";
export type PlatformMatchStatus = "live" | "upcoming" | "completed" | "planned";
export type PlatformContentState = "published" | "planned" | "coming_soon";

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
  body: string[];
  relatedSlugs: string[];
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

export interface PlatformCalendarItem {
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
    summary:
      "Bravo's strongest section today with events, teams, players, results, rankings, compare, and role-aware access routes.",
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
    summary:
      "Planned as the next full game hub with event listings, team profiles, match center, rankings, media, and organizer support.",
    status: "building",
    flagship: false,
    heroLabel: "Building Coverage",
    primaryHref: "/games/valorant",
    sections: ["Overview", "Events", "Teams", "Players", "Matches", "Rankings", "Media", "News"],
    completionLabel: "Scaffolding complete, live data next",
  },
  {
    slug: "cs2",
    name: "CS2",
    shortName: "CS2",
    tagline: "LAN and league ecosystem support",
    summary:
      "Prepared for Nepal CS2 circuits, LAN brackets, roster tracking, rankings, and match center coverage.",
    status: "building",
    flagship: false,
    heroLabel: "Building Coverage",
    primaryHref: "/games/cs2",
    sections: ["Overview", "Events", "Teams", "Players", "Matches", "Rankings", "Media", "News"],
    completionLabel: "Game hub foundation ready",
  },
  {
    slug: "dota-2",
    name: "Dota 2",
    shortName: "Dota",
    tagline: "MOBA ecosystem and event directory",
    summary:
      "Ready for seasonal competition coverage, roster history, organizer profiles, and match archives once live data is added.",
    status: "planned",
    flagship: false,
    heroLabel: "Planned Coverage",
    primaryHref: "/games/dota-2",
    sections: ["Overview", "Events", "Teams", "Players", "Matches", "Rankings", "Media", "News"],
    completionLabel: "Platform-ready for activation",
  },
  {
    slug: "mobile-legends",
    name: "Mobile Legends",
    shortName: "MLBB",
    tagline: "Mobile circuit growth lane",
    summary:
      "Prepared for mobile competition calendars, team directories, match center views, and sponsor-facing event packages.",
    status: "planned",
    flagship: false,
    heroLabel: "Planned Coverage",
    primaryHref: "/games/mobile-legends",
    sections: ["Overview", "Events", "Teams", "Players", "Matches", "Rankings", "Media", "News"],
    completionLabel: "Awaiting first live season",
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
    heroLabel: "Planned Coverage",
    primaryHref: "/games/free-fire",
    sections: ["Overview", "Events", "Teams", "Players", "Matches", "Rankings", "Media", "News"],
    completionLabel: "Future title support enabled",
  },
] as const satisfies ReadonlyArray<Omit<PlatformGame, "activeEvents" | "trackedMatches" | "trackedTeams" | "trackedPlayers" | "featuredNewsCount">>;

const PLANNED_EVENTS = [
  {
    id: "bravo-valorant-open",
    slug: "bravo-valorant-open",
    name: "Bravo Valorant Open",
    gameSlug: "valorant",
    gameName: "Valorant",
    type: "invitational",
    status: "planned",
    state: "planned",
    featured: true,
    region: "Nepal",
    organizerName: "Bravo Gaming Esports",
    prizePool: "NPR 75,000",
    teamsCount: 8,
    matchesCount: 0,
    startDate: "2026-07-06T18:00:00+05:45",
    endDate: "2026-07-08T22:00:00+05:45",
    summary:
      "Bravo's tactical FPS expansion lane with bracket-ready structure, sponsor slots, and the same premium public event shell used across the platform.",
    analyticsHref: "/games/valorant",
    streamHref: "/live-stream",
    topTeamName: null,
    topPlayerName: null,
    sponsorName: "Hukut",
    tabs: ["Overview", "Teams", "Matches", "Schedule", "Statistics", "Sponsors", "Rules"],
  },
  {
    id: "cs2-himalayan-masters",
    slug: "cs2-himalayan-masters",
    name: "CS2 Himalayan Masters",
    gameSlug: "cs2",
    gameName: "CS2",
    type: "league",
    status: "planned",
    state: "planned",
    featured: false,
    region: "Nepal",
    organizerName: "Bravo Gaming Esports",
    prizePool: "NPR 60,000",
    teamsCount: 6,
    matchesCount: 0,
    startDate: "2026-07-14T19:00:00+05:45",
    endDate: "2026-07-20T22:00:00+05:45",
    summary:
      "Prepared as a structured CS2 competition lane with league tables, match center support, and sponsor-ready LAN presentation.",
    analyticsHref: "/games/cs2",
    streamHref: "/live-stream",
    topTeamName: null,
    topPlayerName: null,
    sponsorName: "Hukut",
    tabs: ["Overview", "Teams", "Matches", "Schedule", "Statistics", "Sponsors", "Rules"],
  },
  {
    id: "dota-kathmandu-cup",
    slug: "dota-kathmandu-cup",
    name: "Dota 2 Kathmandu Cup",
    gameSlug: "dota-2",
    gameName: "Dota 2",
    type: "season",
    status: "planned",
    state: "coming_soon",
    featured: false,
    region: "Nepal",
    organizerName: "Bravo Gaming Esports",
    prizePool: "NPR 50,000",
    teamsCount: 8,
    matchesCount: 0,
    startDate: "2026-08-02T18:00:00+05:45",
    endDate: "2026-08-12T22:00:00+05:45",
    summary:
      "A future MOBA competition lane designed to plug into the same Bravo event, ranking, media, and sponsor systems once public registrations go live.",
    analyticsHref: "/games/dota-2",
    streamHref: "/live-stream",
    topTeamName: null,
    topPlayerName: null,
    sponsorName: "Hukut",
    tabs: ["Overview", "Teams", "Matches", "Schedule", "Statistics", "Sponsors", "Rules"],
  },
] satisfies PlatformEvent[];

const PLANNED_MATCHES = [
  {
    id: "bravo-valorant-open-upper-1",
    gameSlug: "valorant",
    gameName: "Valorant",
    eventSlug: "bravo-valorant-open",
    eventName: "Bravo Valorant Open",
    status: "planned",
    scheduledAt: "2026-07-06T19:00:00+05:45",
    stageLabel: "Upper Round 1",
    format: "BO3",
    mapLabel: "Ascent / Lotus / Haven",
    teamA: "M8",
    teamB: "Team HAKU",
    scoreA: null,
    scoreB: null,
    winnerName: null,
    mvpName: null,
    analyticsHref: "/games/valorant",
    vodHref: null,
    viewerCount: null,
    summary: "An opening showcase slot showing how Bravo's match center handles tactical FPS presentation, scheduling, and future scorelines.",
  },
  {
    id: "cs2-himalayan-masters-showmatch",
    gameSlug: "cs2",
    gameName: "CS2",
    eventSlug: "cs2-himalayan-masters",
    eventName: "CS2 Himalayan Masters",
    status: "planned",
    scheduledAt: "2026-07-14T20:30:00+05:45",
    stageLabel: "Opening Series",
    format: "BO3",
    mapLabel: "Mirage / Ancient / Inferno",
    teamA: "NPL",
    teamB: "FYB Esports",
    scoreA: null,
    scoreB: null,
    winnerName: null,
    mvpName: null,
    analyticsHref: "/games/cs2",
    vodHref: null,
    viewerCount: null,
    summary: "A cross-title opener showing the shared match center can support multi-map formats beyond PUBG without losing Bravo identity.",
  },
] satisfies PlatformMatch[];

const ARTICLE_SEEDS = [
  {
    id: "platform-vision-1",
    title: "M8 lead Bravo Gaming Daily PUBG PC Scrims heading into the next lobby",
    category: "PUBG",
    date: "2026-06-18",
    gameSlug: undefined,
    featured: true,
    breaking: true,
    authorName: "Bravo Editorial Desk",
    tags: ["PUBG", "M8", "Daily Scrims", "Nepal Esports"],
    summary:
      "M8 sit on top of the Bravo board while Team HAKU, N3P, FYB Esports, and NPL chase the next swing in the nightly PUBG PC lobby cycle.",
    body: [
      "The latest Bravo Gaming Daily PUBG PC Scrims stretch has M8 controlling the top of the table through cleaner finishes, stronger kill pressure, and better late-lobby stability.",
      "Team HAKU and N3P remain close enough to punish any slow night, while FYB Esports and NPL keep the chase group active across recent published match sets.",
      "This is the kind of day-to-day competitive pulse the Bravo platform is meant to surface publicly: current form, real standings pressure, and clear event context.",
    ],
  },
  {
    id: "platform-vision-2",
    title: "PUBG Mahasangram remains the flagship proof of Bravo event coverage",
    category: "Bravo Gaming",
    date: "2026-06-18",
    gameSlug: undefined,
    featured: true,
    breaking: false,
    authorName: "Bravo Editorial Desk",
    tags: ["PUBG Mahasangram", "Events", "Bravo Gaming"],
    summary:
      "Bravo's featured PUBG Mahasangram coverage shows how banners, standings, match cards, player stats, media, and sponsor visibility can live together on one public event shell.",
    body: [
      "PUBG Mahasangram is the clearest public example of what Bravo wants the platform to feel like: a proper esports event destination, not only an admin workflow.",
      "The event shell already supports standings, team and player visibility, map-aware match context, sponsor placement, and media distribution from the same route family.",
      "That flagship standard is what future Valorant, CS2, Dota 2, Mobile Legends, and Free Fire lanes are meant to inherit.",
    ],
  },
  {
    id: "platform-vision-3",
    title: "Team HAKU, N3P, LTG, and Loot Addicts keep the Bravo board honest",
    category: "PUBG",
    date: "2026-06-18",
    gameSlug: undefined,
    featured: false,
    breaking: false,
    authorName: "Bravo Editorial Desk",
    tags: ["Team HAKU", "N3P", "LTG", "Loot Addicts"],
    summary:
      "The chase pack behind M8 is still active, with Team HAKU, N3P, LTG, and Loot Addicts all producing enough pressure to keep the next scrim block relevant.",
    body: [
      "Team HAKU continue to trade steady placement for efficient points, while N3P stay dangerous whenever kill-heavy lobbies break open.",
      "LTG and Loot Addicts add enough volatility to keep the middle of the board interesting instead of static.",
      "That competitive variety is what makes the public leaderboard, compare, and player pages worth revisiting between major event windows.",
    ],
  },
  {
    id: "platform-vision-4",
    title: "Hukut and Gorkhali Roleplay headline sponsor visibility across Bravo broadcasts",
    category: "Bravo Gaming",
    date: "2026-06-18",
    gameSlug: undefined,
    featured: false,
    breaking: false,
    authorName: "Bravo Editorial Desk",
    tags: ["Sponsors", "Hukut", "Gorkhali Roleplay"],
    summary:
      "Bravo's sponsor hub now gives public space to Hukut and Gorkhali Roleplay so partner visibility feels like part of the platform, not an afterthought.",
    body: [
      "Hukut and Gorkhali Roleplay now have a stronger public presence across sponsor surfaces, featured event support, and supporting media placement.",
      "That matters because a serious Nepal esports platform needs sponsor storytelling, not only tournament administration.",
      "The result is a site that feels more useful to partners, more credible to audiences, and more complete for future commercial campaigns.",
    ],
  },
] as const;

const ORGANIZATION_SEEDS = [
  {
    slug: "bravo-gaming-esports",
    name: "Bravo Gaming Esports",
    type: "Platform Operator",
    summary: "Nepal's premier esports platform with flagship PUBG operations and expanding multi-game coverage.",
    description:
      "Bravo Gaming Esports is building a unified public home for Nepal esports, with events, rankings, game hubs, media, sponsors, and community coverage under one identity.",
    headquarters: "Kathmandu, Nepal",
    games: ["PUBG PC", "Valorant", "CS2", "Dota 2", "Mobile Legends", "Free Fire"],
    teams: ["M8", "Team HAKU", "N3P", "FYB Esports", "NPL", "LTG"],
    eventsHosted: 5,
    prizePools: "NPR 100,000+",
    sponsors: ["Hukut", "Gorkhali Roleplay", "Bravo Community Cup"],
    achievements: [
      "Flagship PUBG PC analytics coverage built",
      "Multi-game public hub foundation shipped",
      "Admin and Team IGL operational panels active",
    ],
    website: "/",
  },
  {
    slug: "nepal-esports-partner-network",
    name: "Nepal Esports Partner Network",
    type: "Organizer Network",
    summary: "A future-facing directory for tournament hosts, circuits, and community organizers across Nepal.",
    description:
      "The partner network route shows how Bravo can evolve into a home for multiple organizers, not only Bravo-run operations, while maintaining one consistent ecosystem design.",
    headquarters: "Nepal",
    games: ["Valorant", "CS2", "Dota 2", "Mobile Legends"],
    teams: ["Community circuits", "Campus squads", "Open qualifiers"],
    eventsHosted: 3,
    prizePools: "NPR 50,000+",
    sponsors: ["Hukut", "Community Partners"],
    achievements: [
      "Prepared for cross-organizer onboarding",
      "Supports universal event pages and match center coverage",
      "Creates space for non-Bravo competition listings",
    ],
    website: "/organizations",
  },
] satisfies PlatformOrganization[];

const MEDIA_SEEDS = [
  {
    id: "media-poster-mahasangram",
    slug: "pubg-mahasangram-event-poster-pack",
    title: "PUBG Mahasangram event poster pack",
    kind: "Poster",
    category: "Posters",
    gameSlug: "pubg-pc",
    duration: undefined,
    summary: "Tournament poster and key-art pack used across community promotion and sponsor surfaces.",
    url: "/pubg/events/pubg-mahasangram-2026",
    featured: true,
  },
  {
    id: "media-clips-bravo-finish",
    slug: "daily-scrims-endgame-clip-collection",
    title: "Daily scrims endgame clip collection",
    kind: "Clip",
    category: "Highlights",
    gameSlug: "pubg-pc",
    duration: "02:15",
    summary: "Short-form clip package ready for public match center and media hub distribution.",
    url: "/highlights",
    featured: false,
  },
  {
    id: "media-interview-expansion",
    slug: "bravo-scrims-and-mahasangram-interview",
    title: "Bravo scrims and Mahasangram interview",
    kind: "Interview",
    category: "Interviews",
    gameSlug: "pubg-pc",
    duration: "08:40",
    summary: "Editorial feature highlighting Bravo daily scrims, PUBG Mahasangram, leading teams, and sponsor-backed coverage plans.",
    url: "/videos",
    featured: false,
  },
] satisfies PlatformMediaItem[];

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

function formatIsoDate(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "Asia/Kathmandu",
  }).format(parsed);
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
  return [
    summary,
    detail,
    "Bravo is building a more complete esports ecosystem where this update can connect to games, events, teams, players, rankings, media, and sponsor visibility instead of living in isolation.",
  ];
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

function selectOrderedItems<T>(items: T[], orderedKeys: string[], getKey: (item: T) => string) {
  if (orderedKeys.length === 0) {
    return [];
  }

  const itemByKey = new Map(items.map((item) => [getKey(item), item]));
  return orderedKeys.map((key) => itemByKey.get(key) ?? null).filter((item): item is T => Boolean(item));
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

function buildSponsorProfiles(
  sponsorRows: Awaited<ReturnType<typeof getSponsors>>,
  eventRows: PlatformEvent[]
): PlatformSponsorProfile[] {
  const eventBySlug = new Map(eventRows.map((eventRow) => [eventRow.slug, eventRow]));
  const eventByName = new Map(eventRows.map((eventRow) => [eventRow.name.toLowerCase(), eventRow]));

  const mappedRows = sponsorRows.map((row) => ({
    id: row.id,
    slug: row.slug ?? slugify(row.name),
    name: row.name,
    kind: normalizeSponsorKind(row.kind, row.tier),
    tier: row.tier,
    description:
      row.description ??
      (row.name === "Hukut"
        ? "A premium partner with campaign-ready visibility across event, media, and community surfaces."
        : row.name === "Gorkhali Roleplay"
          ? "A community-facing partner that strengthens cross-scene reach and audience familiarity."
          : DEFAULT_PARTNER_DESCRIPTION),
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
        ...eventRows
          .filter((eventRow) => eventRow.sponsorName && eventRow.sponsorName === row.name)
          .map((eventRow) => eventRow.slug),
      ])
    ),
    supportedEvents: row.supportedEvents ?? [],
    partnershipHistory:
      row.partnershipHistory?.length
        ? row.partnershipHistory
        : [
            "Activated across Bravo public platform surfaces",
            "Visible in sponsor hub and campaign-ready event placements",
            "Positioned for future featured-news and media integrations",
          ],
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
      supportedEvents:
        supportedEvents.length > 0
          ? supportedEvents
          : row.supportedEvents?.length
            ? row.supportedEvents
            : [],
      showOnEventPage: row.showOnEventPage || row.eventSlugs.length > 0,
      showOnPubgPage: row.showOnPubgPage || includesPubgEvent,
    };
  });

  const ensuredRows = [...hydratedRows];

  if (!ensuredRows.some((row) => row.name === "Hukut")) {
    ensuredRows.push({
      id: "sponsor-hukut",
      slug: "hukut",
      name: "Hukut",
      kind: "sponsor",
      tier: "Title Sponsor",
      description: "A featured sponsor profile used to anchor premium partner presentation across the Bravo ecosystem.",
      websiteUrl: undefined,
      socialUrl: undefined,
      logoUrl: null,
      bannerUrl: null,
      designAssetUrl: null,
      supportedEvents: eventRows.slice(0, 3).map((eventRow) => eventRow.name),
      eventSlugs: eventRows.slice(0, 3).map((eventRow) => eventRow.slug),
      partnershipHistory: [
        "Featured in flagship platform messaging",
        "Aligned with premium esports campaign placement",
        "Ready for event-level activation packages",
      ],
      visible: true,
      featured: true,
      showOnHomepage: true,
      showOnSponsorsPage: true,
      showOnEventPage: true,
      showOnPubgPage: true,
      updatedAt: undefined,
    });
  }

  if (!ensuredRows.some((row) => row.name === "Gorkhali Roleplay")) {
    ensuredRows.push({
      id: "sponsor-gorkhali-roleplay",
      slug: "gorkhali-roleplay",
      name: "Gorkhali Roleplay",
      kind: "partner",
      tier: "Community Partner",
      description: "A Nepal-first community partner that helps Bravo widen reach beyond event operations into fandom and cultural identity.",
      websiteUrl: undefined,
      socialUrl: undefined,
      logoUrl: null,
      bannerUrl: null,
      designAssetUrl: null,
      supportedEvents: eventRows.filter((eventRow) => eventRow.gameSlug === "pubg-pc").slice(0, 2).map((eventRow) => eventRow.name),
      eventSlugs: eventRows.filter((eventRow) => eventRow.gameSlug === "pubg-pc").slice(0, 2).map((eventRow) => eventRow.slug),
      partnershipHistory: [
        "Visible in community-facing Bravo platform messaging",
        "Connected to public event and sponsor surfaces",
        "Ready for collaborative campaigns and community activations",
      ],
      visible: true,
      featured: false,
      showOnHomepage: true,
      showOnSponsorsPage: true,
      showOnEventPage: true,
      showOnPubgPage: true,
      updatedAt: undefined,
    });
  }

  return ensuredRows.filter((row) => row.visible).sort(sortSponsorProfiles);
}

export const getPlatformHubData = cache(async (): Promise<PlatformHubData> => {
  const [pubg, announcements, liveStream, sponsors, videos, homepageContent, managedNewsArticles, managedGames, managedPlatformEvents] = await Promise.all([
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
    date: article.date,
    category: article.category,
    tags: [...article.tags],
    authorName: article.authorName,
    gameSlug: article.gameSlug,
    featured: article.featured,
    breaking: article.breaking,
    imageUrl: article.imageUrl,
    seoTitle: article.seoTitle,
    seoDescription: article.seoDescription,
    body: [...article.body],
    relatedSlugs: [],
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
      updatedAt: announcement.date,
    };
  });

  const seededArticles: PlatformArticle[] = ARTICLE_SEEDS.map((item) => ({
    id: item.id,
    slug: slugify(item.title),
    title: item.title,
    summary: item.summary,
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
    updatedAt: item.date,
  }));

  const news = dedupeArticlesBySlug([...managedNews, ...newsFromAnnouncements, ...seededArticles])
    .sort(compareByDateDesc)
    .map((article, _, allArticles) => ({
      ...article,
      relatedSlugs: allArticles
        .filter((candidate) => candidate.slug !== article.slug && (candidate.category === article.category || candidate.gameSlug === article.gameSlug))
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
    sponsorName: "Hukut",
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

  const events = [...pubgEvents, ...(managedEvents.length > 0 ? managedEvents : PLANNED_EVENTS)].sort(compareEventsForPublicDisplay);
  const sponsorProfiles = buildSponsorProfiles(sponsors, events);

  const pubgMatches: PlatformMatch[] = pubg.matches.map((match) => {
    const orderedTeams = [...match.teamResults].sort(
      (firstValue, secondValue) => firstValue.placement - secondValue.placement || secondValue.totalPoints - firstValue.totalPoints
    );
    const topFragger = [...match.playerResults].sort(
      (firstValue, secondValue) => secondValue.kills - firstValue.kills || secondValue.damage - firstValue.damage
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
      viewerCount: liveStream.isLive && match.eventStatus === "ongoing" ? liveStream.viewers ?? "Live" : null,
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
    const relatedArticles = news.filter((article) => article.gameSlug === gameBlueprint.slug || article.category === gameBlueprint.name || article.category === gameBlueprint.shortName);

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
        "trackedPlayers" in gameBlueprint && typeof gameBlueprint.trackedPlayers === "number"
          ? gameBlueprint.trackedPlayers
          : 0,
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
      href: match.gameSlug === "pubg-pc" ? `/pubg/matches/${match.id}` : `/matches/${match.id}`,
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

  const media: PlatformMediaItem[] = managedMedia.length > 0 ? managedMedia : MEDIA_SEEDS;

  const curatedFeaturedNews =
    selectOrderedItems(news, homepageContent.featuredNewsSlugs, (article) => article.slug) ??
    [];
  const curatedFeaturedEvents = selectOrderedItems(events, homepageContent.featuredEventSlugs, (event) => event.slug);
  const homepageSponsorProfiles = sponsorProfiles.filter((sponsor) => sponsor.showOnHomepage);
  const curatedFeaturedSponsors = selectOrderedItems(homepageSponsorProfiles, homepageContent.featuredSponsorSlugs, (sponsor) => sponsor.slug);
  const curatedFeaturedMedia = selectOrderedItems(media, homepageContent.featuredMediaIds, (item) => item.id);
  const configuredBreakingNews =
    homepageContent.breakingNewsSlug
      ? news.find((article) => article.slug === homepageContent.breakingNewsSlug) ?? null
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
      featuredNews: curatedFeaturedNews.length > 0 ? curatedFeaturedNews.slice(0, 4) : news.filter((article) => article.featured).slice(0, 4),
      featuredEvents: curatedFeaturedEvents.length > 0 ? curatedFeaturedEvents.slice(0, 4) : events.filter((event) => event.featured).slice(0, 4),
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
  return hub.events.find((event) => event.slug === slug) ?? null;
}

export async function getPlatformMatchById(id: string) {
  const hub = await getPlatformHubData();
  return hub.matches.find((match) => match.id === id) ?? null;
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
