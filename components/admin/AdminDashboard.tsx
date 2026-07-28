"use client";

import { useDiscordProviderEnabled } from "@/components/auth/DiscordLoginButton";
import StatusBadge from "@/components/ui/StatusBadge";
import { adminFetch } from "@/lib/admin-api";
import type { AuditLogRecord } from "@/lib/audit-logs";
import { BRAVO_DISCORD_URL, BRAVO_INSTAGRAM_URL } from "@/lib/brand-links";
import { formatAnnouncementDate, formatDisplayDate, formatDisplayDateTime } from "@/lib/display-format";
import { scheduleEffectTask } from "@/lib/effect-task";
import { formatKathmanduDateTimeInput, isManagedNewsArticlePublic } from "@/lib/news-publishing";
import type { FooterLinkRecord, HomepageContentRecord, HomepageHeroSlideRecord, ManagedNewsArticleRecord } from "@/lib/platform-content";
import { compareTeamLeaderboardPerformance } from "@/lib/ranking-sort";
import type {
  Announcement,
  ContactMessage,
  ErrorLogRecord,
  Player,
  PlayerRole,
  PlayerStatus,
  PubgImportBatch,
  RegistrationStatus,
  Scrim,
  ScrimStatus,
  Season,
  SeasonStatus,
  Team,
  TeamRegistration,
  Tournament,
  TournamentMatch,
  TournamentStatus,
  UploadRecord,
} from "@/lib/types";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import AdminDiscordLinkManager from "./AdminDiscordLinkManager";
import AdminDiscordRoleMappingManager from "./AdminDiscordRoleMappingManager";
import HomepageFeaturedEventsManager, { type HomepageFeatureEventOption } from "./HomepageFeaturedEventsManager";
import AdminMatchManager from "./AdminMatchManager";
import AdminPlayerTeamLinkingManager from "./AdminPlayerTeamLinkingManager";
import AdminRegisteredTeamsManager from "./AdminRegisteredTeamsManager";
import AdminSidebar, { ADMIN_SECTION_ROUTES, getAdminSectionLabel, type AdminSection } from "./AdminSidebar";
import AdminTeamRequestsManager from "./AdminTeamRequestsManager";
import { useAdminAuth } from "./AuthProvider";
import BulkTeamLogoUpload from "./BulkTeamLogoUpload";
import FileUpload from "./FileUpload";
import { AdminGamesManager, AdminMediaManager, AdminPlatformEventsManager, AdminSponsorsManager } from "./PlatformCatalogManagers";
import PubgImportManager from "./PubgImportManager";

type DashboardStats = {
  totalTeams: number;
  totalPlayers: number;
  totalScrims: number;
  matchesPlayed: number;
  totalTournaments: number;
  pendingRegistrations: number;
  recentRegistrations: TeamRegistration[];
  recentUploads: UploadRecord[];
  dataConnected: boolean;
  dataAdminConnected?: boolean;
  dataBackend?: string | null;
  totalSeasons?: number;
  activeSeasonTitle?: string;
  activeSeasonDay?: number;
  activeSeasonLength?: number;
};

type ManagedNewsFormState = Partial<ManagedNewsArticleRecord> & {
  bodyText: string;
};

async function fetchApiData<T>(href: string, resourceLabel: string): Promise<T> {
  const response = await fetch(href, {
    credentials: "same-origin",
    headers: { Accept: "application/json" },
  });
  const payload = (await response.json().catch(() => null)) as { data?: T; error?: unknown } | null;
  if (!response.ok) {
    throw new Error(`${resourceLabel} could not be loaded (${response.status}).`);
  }
  if (!payload || !Object.prototype.hasOwnProperty.call(payload, "data")) {
    throw new Error(`${resourceLabel} returned an incomplete response.`);
  }
  return payload.data as T;
}

const inputClass = "input-esports";
const btnPrimary = "btn-primary disabled:opacity-60";
const btnDanger = "btn-watch-live !text-[11px] !py-1.5";
const ROLES: PlayerRole[] = ["IGL", "Assaulter", "Support", "Sniper", "Substitute"];
const defaultSeasonForm: Partial<Season> = {
  seasonNumber: 1,
  status: "planned",
  configuredDays: 15,
  currentDay: 0,
  game: "PUBG PC",
  format: "Squad",
  region: "Nepal",
  perspective: "TPP",
};
const defaultScrimForm: Partial<Scrim> = {
  status: "scheduled",
  teamIds: [],
  mapRotation: [],
  pubgMatchIds: [],
  published: false,
};

function buildDefaultTournamentForm(season?: Season | null): Partial<Tournament> {
  return {
    status: "UPCOMING",
    maxTeams: 32,
    teamCount: 0,
    mapRotation: [],
    registeredTeamIds: [],
    seasonId: season?.id,
    seasonTitle: season?.seriesTitle ?? season?.title,
    seasonNumber: season?.seasonNumber,
  };
}

const defaultHomepageForm: HomepageContentRecord = {
  id: "main",
  heroSlides: [
    {
      id: "hero-slide-1",
      badge: "Nepal Esports Platform",
      title: "Published matches, rankings, news, and events in one home",
      description:
        "Bravo Gaming Esports brings together real match coverage, verified standings, news, and community updates for Nepal esports.",
      imageUrl: "",
      videoUrl: "",
      sponsorSlug: "",
      promoText: "",
      primaryLabel: "Watch Live",
      primaryHref: "/live-stream",
      secondaryLabel: "Explore Events",
      secondaryHref: "/events",
      tertiaryLabel: "Join Community",
      tertiaryHref: BRAVO_DISCORD_URL,
    },
    {
      id: "hero-slide-2",
      badge: "Flagship PUBG Coverage",
      title: "PUBG PC remains the flagship competitive hub",
      description:
        "Published seasons, events, teams, players, matches, and standings will appear here automatically as results are approved.",
      imageUrl: "",
      videoUrl: "",
      sponsorSlug: "",
      promoText: "",
      primaryLabel: "Open PUBG",
      primaryHref: "/pubg",
      secondaryLabel: "Leaderboards",
      secondaryHref: "/pubg/leaderboards",
      tertiaryLabel: "Latest Results",
      tertiaryHref: "/pubg/results",
    },
    {
      id: "hero-slide-3",
      badge: "Sponsors, Media, and Community",
      title: "Sponsors, media, and community stay connected",
      description:
        "Sponsor profiles, media coverage, and community touchpoints stay aligned with official Bravo updates as content goes live.",
      imageUrl: "",
      videoUrl: "",
      sponsorSlug: "",
      promoText: "",
      primaryLabel: "Open Community",
      primaryHref: "/pubg/community",
      secondaryLabel: "Read News",
      secondaryHref: "/news",
      tertiaryLabel: "Sponsor Hub",
      tertiaryHref: "/sponsors",
    },
  ],
  breakingNewsSlug: "",
  featuredNewsSlugs: [],
  featuredEventSlugs: [],
  featuredEvents: [],
  featuredSponsorSlugs: [],
  featuredMediaIds: [],
  featuredTeamIds: [],
  featuredPlayerIds: [],
  liveTitle: "Bravo Gaming Esports Live Feed",
  liveSubtitle: "Published broadcasts and live coverage will appear here automatically once a stream is active.",
  liveViewers: undefined,
  liveHref: "/live-stream",
  footerTitle: "Bravo Gaming Esports",
  footerTagline: "Nepal Esports Platform",
  footerDescription:
    "Bravo Gaming Esports is building a clean, trustworthy home for Nepal esports with published match data, verified standings, and community-first coverage.",
  footerPrimaryLabel: "Watch Live",
  footerPrimaryHref: "/live-stream",
  footerSecondaryLabel: "Join Discord",
  footerSecondaryHref: BRAVO_DISCORD_URL,
  footerColumns: [
    {
      id: "footer-main",
      title: "Main",
      links: [
        { label: "Home", href: "/" },
        { label: "PUBG", href: "/pubg" },
        { label: "Events", href: "/events" },
        { label: "Community", href: "/pubg/community" },
        { label: "Media", href: "/media" },
        { label: "News", href: "/news" },
      ],
    },
    {
      id: "footer-discover",
      title: "Discover",
      links: [
        { label: "Leaderboards", href: "/pubg/leaderboards" },
        { label: "Teams", href: "/pubg/teams" },
        { label: "Players", href: "/pubg/players" },
        { label: "Search", href: "/search" },
        { label: "Watch Live", href: "/live-stream" },
      ],
    },
    {
      id: "footer-community",
      title: "Community",
      links: [
        { label: "Sponsors", href: "/sponsors" },
        { label: "About", href: "/about" },
        { label: "Contact", href: "/contact" },
        { label: "Instagram", href: BRAVO_INSTAGRAM_URL },
        { label: "Discord", href: BRAVO_DISCORD_URL },
      ],
    },
    {
      id: "footer-platform",
      title: "Platform",
      links: [
        { label: "Login", href: "/login" },
        { label: "Privacy", href: "/privacy" },
        { label: "Terms", href: "/terms" },
      ],
    },
  ],
  footerHighlights: [
    { id: "footer-highlight-flagship", label: "Flagship", value: "PUBG" },
    {
      id: "footer-highlight-coverage",
      label: "Coverage",
      value: "News + Results",
    },
    {
      id: "footer-highlight-community",
      label: "Community",
      value: "Nepal First",
    },
  ],
  footerBottomPrimary: "Copyright 2026 Bravo Gaming Esports Nepal",
  footerBottomSecondary: "Published events, results, rankings, media, sponsors, and community coverage for Nepal esports.",
  updatedAt: "",
};
const defaultNewsForm: ManagedNewsFormState = {
  title: "",
  slug: "",
  summary: "",
  excerpt: "",
  bodyText: "",
  date: new Date().toISOString().slice(0, 10),
  category: "Bravo Gaming",
  tags: [],
  authorName: "Bravo Editorial Desk",
  gameSlug: "",
  featured: false,
  breaking: false,
  state: "draft",
  imageUrl: "",
  seoTitle: "",
  seoDescription: "",
  ogImageUrl: "",
  canonicalUrl: "",
  publishAt: "",
  publishedAt: "",
};

function splitDelimitedValues(value?: string | null) {
  return Array.from(
    new Set(
      (value ?? "")
        .split(/[\n,]+/g)
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  );
}

function joinDelimitedValues(values?: string[] | null) {
  return values?.join(", ") ?? "";
}

function serializeFooterLinks(links?: FooterLinkRecord[] | null) {
  return (links ?? []).map((link) => `${link.label} | ${link.href}`).join("\n");
}

function parseFooterLinks(value: string) {
  return value
    .split(/\r?\n/g)
    .map((row) => row.trim())
    .filter(Boolean)
    .map((row) => {
      const [label = "", href = ""] = row.split("|").map((part) => part.trim());
      return label && href ? ({ label, href } satisfies FooterLinkRecord) : null;
    })
    .filter((link): link is FooterLinkRecord => Boolean(link));
}

function normalizeHomepageFormInput(data?: HomepageContentRecord | null): HomepageContentRecord {
  const heroSlides = Array.isArray(data?.heroSlides) && data.heroSlides.length > 0 ? data.heroSlides : defaultHomepageForm.heroSlides;
  const footerColumns =
    Array.isArray(data?.footerColumns) && data.footerColumns.length > 0 ? data.footerColumns : defaultHomepageForm.footerColumns;
  const footerHighlights =
    Array.isArray(data?.footerHighlights) && data.footerHighlights.length > 0
      ? data.footerHighlights
      : defaultHomepageForm.footerHighlights;

  return {
    ...defaultHomepageForm,
    ...data,
    heroSlides: heroSlides.slice(0, 3).map((slide, index) => ({
      ...defaultHomepageForm.heroSlides[index],
      ...slide,
      id: slide.id ?? defaultHomepageForm.heroSlides[index]?.id ?? `hero-slide-${index + 1}`,
    })),
    featuredNewsSlugs: data?.featuredNewsSlugs ?? [],
    featuredEventSlugs: data?.featuredEventSlugs ?? [],
    featuredEvents: data?.featuredEvents ?? [],
    featuredSponsorSlugs: data?.featuredSponsorSlugs ?? [],
    featuredMediaIds: data?.featuredMediaIds ?? [],
    featuredTeamIds: data?.featuredTeamIds ?? [],
    featuredPlayerIds: data?.featuredPlayerIds ?? [],
    footerColumns: footerColumns.slice(0, 4).map((column, index) => ({
      ...defaultHomepageForm.footerColumns[index],
      ...column,
      id: column.id ?? defaultHomepageForm.footerColumns[index]?.id ?? `footer-column-${index + 1}`,
      links:
        Array.isArray(column.links) && column.links.length > 0 ? column.links : (defaultHomepageForm.footerColumns[index]?.links ?? []),
    })),
    footerHighlights: footerHighlights.slice(0, 3).map((highlight, index) => ({
      ...defaultHomepageForm.footerHighlights[index],
      ...highlight,
      id: highlight.id ?? defaultHomepageForm.footerHighlights[index]?.id ?? `footer-highlight-${index + 1}`,
    })),
  };
}

function buildNewsFormState(article?: ManagedNewsArticleRecord | null): ManagedNewsFormState {
  if (!article) {
    return { ...defaultNewsForm };
  }

  return {
    ...article,
    bodyText: article.body.join("\n\n"),
    excerpt: article.excerpt ?? "",
    gameSlug: article.gameSlug ?? "",
    imageUrl: article.imageUrl ?? "",
    seoTitle: article.seoTitle ?? "",
    seoDescription: article.seoDescription ?? "",
    ogImageUrl: article.ogImageUrl ?? "",
    canonicalUrl: article.canonicalUrl ?? "",
    publishAt: formatKathmanduDateTimeInput(article.publishAt),
    publishedAt: article.publishedAt ?? "",
  };
}

function normalizeMatchIds(value?: string) {
  return Array.from(
    new Set(
      (value ?? "")
        .split(/[\n,]+/g)
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  );
}

function getScrimMatchIds(scrim?: Partial<Scrim>) {
  return Array.from(new Set([...(scrim?.pubgMatchIds ?? []), scrim?.pubgMatchId].filter((matchId): matchId is string => Boolean(matchId))));
}

function formatScrimMatchIds(scrim?: Partial<Scrim>) {
  return getScrimMatchIds(scrim).join("\n");
}

function sortSeasonTournamentsByDay(firstTournament: Tournament, secondTournament: Tournament) {
  return (
    (firstTournament.seasonDayNumber ?? firstTournament.dayNumber ?? Number.POSITIVE_INFINITY) -
      (secondTournament.seasonDayNumber ?? secondTournament.dayNumber ?? Number.POSITIVE_INFINITY) ||
    (firstTournament.startDate ?? "").localeCompare(secondTournament.startDate ?? "") ||
    firstTournament.title.localeCompare(secondTournament.title)
  );
}

function sortSeasonScrimsByDay(firstScrim: Scrim, secondScrim: Scrim) {
  return (
    (firstScrim.seasonDayNumber ?? Number.POSITIVE_INFINITY) - (secondScrim.seasonDayNumber ?? Number.POSITIVE_INFINITY) ||
    (firstScrim.date ?? "").localeCompare(secondScrim.date ?? "") ||
    firstScrim.title.localeCompare(secondScrim.title)
  );
}

export default function AdminDashboard({
  initialSection = "dashboard",
  focusImportBatchId = null,
}: {
  initialSection?: AdminSection;
  focusImportBatchId?: string | null;
}) {
  const demoSeedTag = "bravo_demo_seed_2026";
  const discordAuthEnabled = useDiscordProviderEnabled();
  const { user, role, logout } = useAdminAuth();
  const canManageCanonicalTeams = role === "super_admin" || role === "admin";
  const canManagePlatformAdmin = canManageCanonicalTeams;
  const [section, setSection] = useState<AdminSection>(initialSection);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [scrims, setScrims] = useState<Scrim[]>([]);
  const [registrations, setRegistrations] = useState<TeamRegistration[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [liveMatches, setLiveMatches] = useState<TournamentMatch[]>([]);
  const [importBatches, setImportBatches] = useState<PubgImportBatch[]>([]);
  const [recentUploads, setRecentUploads] = useState<UploadRecord[]>([]);
  const [errorLogs, setErrorLogs] = useState<ErrorLogRecord[]>([]);
  const [homepageForm, setHomepageForm] = useState<HomepageContentRecord>(defaultHomepageForm);
  const [homepageEventOptions, setHomepageEventOptions] = useState<HomepageFeatureEventOption[]>([]);
  const [newsArticles, setNewsArticles] = useState<ManagedNewsArticleRecord[]>([]);
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resourceWarnings, setResourceWarnings] = useState<string[]>([]);
  const [savingHomepage, setSavingHomepage] = useState(false);
  const [savingNews, setSavingNews] = useState(false);

  const [tournamentForm, setTournamentForm] = useState<Partial<Tournament>>(() => buildDefaultTournamentForm());
  const [teamForm, setTeamForm] = useState<Partial<Team>>({
    status: "active",
  });
  const [playerForm, setPlayerForm] = useState<Partial<Player>>({
    kills: 0,
    damage: 0,
    mvpCount: 0,
    chickenDinners: 0,
    matches: 0,
    playerStatus: "active",
  });
  const [scrimForm, setScrimForm] = useState<Partial<Scrim>>(defaultScrimForm);
  const [seasonForm, setSeasonForm] = useState<Partial<Season>>(defaultSeasonForm);
  const [announcementForm, setAnnouncementForm] = useState<Partial<Announcement>>({ published: true });
  const [newsForm, setNewsForm] = useState<ManagedNewsFormState>(defaultNewsForm);
  const [editingSeason, setEditingSeason] = useState<string | null>(null);
  const [editingTournament, setEditingTournament] = useState<string | null>(null);
  const [editingTeam, setEditingTeam] = useState<string | null>(null);
  const [editingPlayer, setEditingPlayer] = useState<string | null>(null);
  const [editingScrim, setEditingScrim] = useState<string | null>(null);
  const [editingNewsId, setEditingNewsId] = useState<string | null>(null);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [registrationActionId, setRegistrationActionId] = useState<string | null>(null);

  const [matchId, setMatchId] = useState("");
  const [importTournamentId, setImportTournamentId] = useState("");
  const [importScrimId, setImportScrimId] = useState("");
  const [importAutoPreviewKey, setImportAutoPreviewKey] = useState("");
  const [tournamentImportMatchIds, setTournamentImportMatchIds] = useState("");
  const [importingBravoFeed, setImportingBravoFeed] = useState(false);
  const [syncingSeason, setSyncingSeason] = useState(false);
  const [creatingNextDay, setCreatingNextDay] = useState(false);
  const [processingImportBatchId, setProcessingImportBatchId] = useState<string | null>(null);
  const [resettingData, setResettingData] = useState(false);

  const leaderboardRows = useMemo(
    () =>
      [...teams]
        .filter((t) => (t.matches ?? 0) > 0)
        .sort((firstTeam, secondTeam) => compareTeamLeaderboardPerformance(firstTeam, secondTeam))
        .map((t, i) => ({ ...t, rank: i + 1 })),
    [teams],
  );

  const teamPlayers = useMemo(() => (selectedTeamId ? players.filter((p) => p.teamId === selectedTeamId) : []), [players, selectedTeamId]);
  const activeSeason = useMemo(() => seasons.find((season) => season.status === "active") ?? seasons[0] ?? null, [seasons]);
  const activeSeasonTournaments = useMemo(
    () =>
      activeSeason ? tournaments.filter((tournament) => tournament.seasonId === activeSeason.id).sort(sortSeasonTournamentsByDay) : [],
    [activeSeason, tournaments],
  );
  const activeSeasonScrims = useMemo(
    () => (activeSeason ? scrims.filter((scrim) => scrim.seasonId === activeSeason.id).sort(sortSeasonScrimsByDay) : []),
    [activeSeason, scrims],
  );
  const pendingImportBatches = useMemo(() => importBatches.filter((batch) => batch.status === "pending"), [importBatches]);
  const processedImportBatches = useMemo(() => importBatches.filter((batch) => batch.status !== "pending"), [importBatches]);
  const focusedImportBatch = useMemo(
    () => (focusImportBatchId ? (importBatches.find((batch) => batch.id === focusImportBatchId) ?? null) : null),
    [focusImportBatchId, importBatches],
  );
  const visiblePendingImportBatches = useMemo(
    () => (focusImportBatchId ? (focusedImportBatch?.status === "pending" ? [focusedImportBatch] : []) : pendingImportBatches),
    [focusImportBatchId, focusedImportBatch, pendingImportBatches],
  );
  const dashboardOverview = useMemo(() => {
    const publishedArticles = newsArticles.filter((article) => article.state === "published").length;
    const draftArticles = newsArticles.filter((article) => article.state === "draft").length;
    const newInboxItems = messages.filter((message) => message.status === "new").length;
    const pendingRegistrations = registrations.filter((registration) => registration.status === "pending").length;
    const totalPlatformEvents = tournaments.length + scrims.length;
    const pendingApprovals = pendingRegistrations + pendingImportBatches.length + newInboxItems;

    return {
      cards: [
        {
          label: "Total Events",
          value: totalPlatformEvents,
          tone: "text-accent-blue",
        },
        {
          label: "Total Teams",
          value: stats?.totalTeams ?? teams.length,
          tone: "text-white",
        },
        {
          label: "Total Players",
          value: stats?.totalPlayers ?? players.length,
          tone: "text-white",
        },
        {
          label: "Published Articles",
          value: publishedArticles,
          tone: "text-accent-green",
        },
        {
          label: "Pending Requests",
          value: pendingApprovals,
          tone: "text-accent-yellow",
        },
        {
          label: "Published Matches",
          value: liveMatches.length,
          tone: "text-accent-blue",
        },
        { label: "Inbox Messages", value: messages.length, tone: "text-white" },
        {
          label: "Recent Uploads",
          value: recentUploads.length,
          tone: "text-accent-red",
        },
      ],
      publishedArticles,
      draftArticles,
      newInboxItems,
      pendingRegistrations,
    };
  }, [
    liveMatches.length,
    messages,
    newsArticles,
    pendingImportBatches.length,
    players.length,
    recentUploads.length,
    registrations,
    scrims.length,
    stats?.totalPlayers,
    stats?.totalTeams,
    teams.length,
    tournaments.length,
  ]);

  const hasDemoSeededData = useMemo(
    () =>
      Boolean(activeSeason?.notes?.includes(demoSeedTag)) ||
      tournaments.some((tournament) => tournament.description?.includes(demoSeedTag)) ||
      scrims.some((scrim) => scrim.announcement?.includes(demoSeedTag)),
    [activeSeason?.notes, demoSeedTag, scrims, tournaments],
  );

  useEffect(() => {
    return scheduleEffectTask(() => setSection(initialSection));
  }, [initialSection]);

  const handleSectionChange = useCallback((nextSection: AdminSection) => {
    setError(null);
    setMessage(null);
    setSection(nextSection);

    const route = ADMIN_SECTION_ROUTES[nextSection];
    const nextPath = route ? `/admin/${route}` : "/admin";
    if (window.location.pathname !== nextPath) {
      window.history.replaceState(window.history.state, "", nextPath);
    }
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    setResourceWarnings([]);
    try {
      const [statsRes, seasonsData, tournamentsData, publicTeams, playersData, announcementsData] = await Promise.all([
        adminFetch("/api/stats?admin=true"),
        fetchApiData<Season[]>("/api/seasons", "Seasons"),
        fetchApiData<Tournament[]>("/api/tournaments", "Tournaments"),
        fetchApiData<Team[]>("/api/teams", "Public teams"),
        fetchApiData<Player[]>("/api/players", "Players"),
        fetchApiData<Announcement[]>("/api/announcements", "Announcements"),
      ]);
      setStats(statsRes.data);
      setSeasons(seasonsData);
      setTournaments(tournamentsData);
      setTeams(publicTeams);
      setPlayers(playersData);
      setAnnouncements(announcementsData);

      const optionalWarnings: string[] = [];
      try {
        const canonicalTeamsResponse = await adminFetch("/api/admin/teams");
        const publicTeamById = new Map(publicTeams.map((team) => [team.id, team] as const));
        const canonicalTeams = (canonicalTeamsResponse.data?.teams ?? []) as Array<{
          aliases?: Array<string | { alias: string }>;
          createdAt?: string;
          id: string;
          logoUrl?: string | null;
          name: string;
          region?: string | null;
          slug?: string | null;
          slotNumber?: number | null;
          status?: string;
          tag?: string | null;
          updatedAt?: string;
        }>;
        setTeams(
          canonicalTeams.map((canonicalTeam) => {
            const publicTeam = publicTeamById.get(canonicalTeam.id);
            return {
              ...publicTeam,
              ...canonicalTeam,
              country: canonicalTeam.region ?? publicTeam?.country,
              createdAt: canonicalTeam.createdAt ?? publicTeam?.createdAt,
              id: canonicalTeam.id,
              kills: publicTeam?.kills ?? 0,
              logo: canonicalTeam.logoUrl ?? publicTeam?.logo,
              logoUrl: canonicalTeam.logoUrl ?? publicTeam?.logoUrl,
              matches: publicTeam?.matches ?? 0,
              name: canonicalTeam.name,
              slug: canonicalTeam.slug ?? publicTeam?.slug,
              slotNumber: canonicalTeam.slotNumber ?? publicTeam?.slotNumber,
              status:
                canonicalTeam.status === "active" || canonicalTeam.status === "pending"
                  ? canonicalTeam.status
                  : canonicalTeam.status
                    ? "inactive"
                    : publicTeam?.status,
              tag: canonicalTeam.tag ?? publicTeam?.tag,
              totalPoints: publicTeam?.totalPoints ?? 0,
              updatedAt: canonicalTeam.updatedAt ?? publicTeam?.updatedAt,
            } satisfies Team;
          }),
        );
      } catch {
        optionalWarnings.push("Official team registry unavailable; the public team view is shown instead.");
      }

      const [
        homepageResult,
        eventOptionsResult,
        newsResult,
        messagesResult,
        registrationsResult,
        scrimsResult,
        matchesResult,
        errorsResult,
        importsResult,
        auditResult,
      ] = await Promise.allSettled([
        adminFetch("/api/admin/homepage"),
        adminFetch("/api/admin/platform-event-options"),
        adminFetch("/api/admin/news"),
        adminFetch("/api/admin/messages"),
        adminFetch("/api/registrations"),
        adminFetch("/api/admin/scrims"),
        adminFetch("/api/admin/matches"),
        adminFetch("/api/admin/errors?limit=10"),
        adminFetch("/api/admin/pending-imports"),
        adminFetch("/api/admin/audit-logs?limit=12"),
      ]);

      if (homepageResult.status === "fulfilled") {
        setHomepageForm(normalizeHomepageFormInput(homepageResult.value.data));
      } else {
        optionalWarnings.push("Homepage content could not be loaded.");
      }
      if (eventOptionsResult.status === "fulfilled") {
        setHomepageEventOptions(eventOptionsResult.value.data ?? []);
      } else {
        optionalWarnings.push("Homepage event options could not be loaded.");
      }
      if (newsResult.status === "fulfilled") {
        setNewsArticles(newsResult.value.data ?? []);
      } else {
        optionalWarnings.push("News management data could not be loaded.");
      }
      if (messagesResult.status === "fulfilled") {
        setMessages(messagesResult.value.data ?? []);
      } else {
        optionalWarnings.push("Inbox messages could not be loaded.");
      }
      if (registrationsResult.status === "fulfilled") {
        setRegistrations(registrationsResult.value.data ?? []);
      } else {
        optionalWarnings.push("Team registrations could not be loaded.");
      }
      if (scrimsResult.status === "fulfilled") {
        setScrims(scrimsResult.value.data ?? []);
      } else {
        optionalWarnings.push("Scrim management data could not be loaded.");
      }
      if (matchesResult.status === "fulfilled") {
        setLiveMatches(matchesResult.value.data?.matches ?? []);
        setRecentUploads(matchesResult.value.data?.uploads ?? []);
      } else {
        optionalWarnings.push("Published matches and recent uploads could not be loaded.");
      }
      if (errorsResult.status === "fulfilled") {
        setErrorLogs(errorsResult.value.data ?? []);
      } else {
        optionalWarnings.push("Server error logs could not be loaded.");
      }
      if (importsResult.status === "fulfilled") {
        setImportBatches(importsResult.value.data ?? []);
      } else {
        optionalWarnings.push("PUBG import history could not be loaded.");
      }
      if (auditResult.status === "fulfilled") {
        setAuditLogs(auditResult.value.data ?? []);
      } else {
        optionalWarnings.push("Audit logs could not be loaded.");
      }
      setResourceWarnings(optionalWarnings);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    return scheduleEffectTask(loadData);
  }, [loadData]);

  useEffect(() => {
    if (!activeSeason) return;

    return scheduleEffectTask(() => {
      setTournamentForm((currentForm) =>
        currentForm.seasonId
          ? currentForm
          : {
              ...currentForm,
              seasonId: activeSeason.id,
              seasonTitle: activeSeason.seriesTitle ?? activeSeason.title,
              seasonNumber: activeSeason.seasonNumber,
            },
      );

      setScrimForm((currentForm) =>
        currentForm.seasonId
          ? currentForm
          : {
              ...currentForm,
              seasonId: activeSeason.id,
              seasonTitle: activeSeason.seriesTitle ?? activeSeason.title,
            },
      );
    });
  }, [activeSeason]);

  function findTournamentScrim(tournamentId?: string | null) {
    if (!tournamentId) return undefined;
    return scrims.find((scrim) => scrim.tournamentId === tournamentId);
  }

  function resetTournamentEditor() {
    setEditingTournament(null);
    setTournamentForm(buildDefaultTournamentForm(activeSeason));
    setTournamentImportMatchIds("");
  }

  function openAdminTeamEditor(teamId: string | null) {
    setSelectedTeamId(teamId);
    if (!teamId) {
      setEditingTeam(null);
      setTeamForm({
        status: "active",
      });
      handleSectionChange("teams");
      return;
    }

    const team = teams.find((candidate) => candidate.id === teamId);
    if (!team) {
      handleSectionChange("teams");
      setError("That team is not in the current registry view. Refresh the canonical team list and try again.");
      return;
    }

    setEditingTeam(team.id);
    setTeamForm(team);
    handleSectionChange("teams");
  }

  function openAdminTeamRoster(teamId: string) {
    setSelectedTeamId(teamId);
    handleSectionChange("players");
  }

  async function archiveAdminTeam(teamId: string) {
    const team = teams.find((candidate) => candidate.id === teamId);
    if (!window.confirm(`Archive ${team?.name ?? "this official team"}? Historical records will be preserved.`)) {
      return false;
    }

    setError(null);
    try {
      await adminFetch(`/api/admin/teams/${encodeURIComponent(teamId)}`, {
        method: "DELETE",
      });
      setMessage(`${team?.name ?? "Team"} archived. Historical match and roster records were preserved.`);
      await loadData();
      return true;
    } catch (archiveError) {
      setError(archiveError instanceof Error ? archiveError.message : "The team could not be archived.");
      return false;
    }
  }

  function openTournamentEditor(tournament: Tournament) {
    setEditingTournament(tournament.id);
    setTournamentForm(tournament);
    setTournamentImportMatchIds(formatScrimMatchIds(findTournamentScrim(tournament.id)));
  }

  function openTournamentImportWorkflow(tournamentId: string, directMatchIds: string) {
    const linkedScrim = findTournamentScrim(tournamentId);
    setMatchId(directMatchIds);
    setImportTournamentId(tournamentId);
    setImportScrimId(linkedScrim?.id ?? "");
    setImportAutoPreviewKey(`${tournamentId}:${Date.now()}`);
    handleSectionChange("pubg");
  }

  function handleTournamentMatchPull() {
    if (!editingTournament) {
      setError("Create the tournament first, then pull PUBG match JSONs into its editor.");
      return;
    }

    const normalizedMatchIds = normalizeMatchIds(tournamentImportMatchIds);
    if (normalizedMatchIds.length === 0) {
      setError("Paste at least one PUBG match ID before pulling JSONs.");
      return;
    }

    const selectedTournament = tournaments.find((tournament) => tournament.id === editingTournament);
    const selectedDayNumber = selectedTournament?.seasonDayNumber ?? selectedTournament?.dayNumber;
    if (!selectedTournament?.seasonId || typeof selectedDayNumber !== "number" || selectedDayNumber < 1) {
      setError("Set the tournament season and season day number before pulling PUBG match JSONs.");
      return;
    }

    setError(null);
    setMessage("Opening PUBG import workflow. Stored raw JSON will be reused first, then missing matches will be fetched from PUBG.");
    openTournamentImportWorkflow(editingTournament, normalizedMatchIds.join("\n"));
  }

  function updateHomepageSlide(index: number, patch: Partial<HomepageHeroSlideRecord>) {
    setHomepageForm((currentForm) => ({
      ...currentForm,
      heroSlides: currentForm.heroSlides.map((slide, slideIndex) =>
        slideIndex === index
          ? {
              ...slide,
              ...patch,
            }
          : slide,
      ),
    }));
  }

  function updateFooterColumn(index: number, patch: Partial<HomepageContentRecord["footerColumns"][number]>) {
    setHomepageForm((currentForm) => ({
      ...currentForm,
      footerColumns: currentForm.footerColumns.map((column, columnIndex) =>
        columnIndex === index
          ? {
              ...column,
              ...patch,
            }
          : column,
      ),
    }));
  }

  function updateFooterHighlight(index: number, patch: Partial<HomepageContentRecord["footerHighlights"][number]>) {
    setHomepageForm((currentForm) => ({
      ...currentForm,
      footerHighlights: currentForm.footerHighlights.map((highlight, highlightIndex) =>
        highlightIndex === index
          ? {
              ...highlight,
              ...patch,
            }
          : highlight,
      ),
    }));
  }

  function resetNewsEditor() {
    setEditingNewsId(null);
    setNewsForm({
      ...defaultNewsForm,
      date: new Date().toISOString().slice(0, 10),
    });
  }

  function startNewsEdit(article: ManagedNewsArticleRecord) {
    setEditingNewsId(article.id);
    setNewsForm(buildNewsFormState(article));
    handleSectionChange("news");
  }

  async function handleHomepageSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSavingHomepage(true);
    setError(null);

    try {
      const response = await adminFetch("/api/admin/homepage", {
        method: "PUT",
        body: JSON.stringify(homepageForm),
      });
      setHomepageForm(normalizeHomepageFormInput(response.data));
      setMessage("Homepage content saved");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSavingHomepage(false);
    }
  }

  async function handleNewsSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!newsForm.title || !newsForm.summary) return;
    if (newsForm.state === "scheduled" && !(newsForm.publishAt ?? "").trim()) {
      setError("Scheduled articles need a publish date and time in Nepal time.");
      return;
    }

    setSavingNews(true);
    setError(null);

    try {
      const payload = {
        ...newsForm,
        body: newsForm.bodyText,
        tags: newsForm.tags ?? [],
        excerpt: newsForm.excerpt || undefined,
        gameSlug: newsForm.gameSlug || undefined,
        imageUrl: newsForm.imageUrl || undefined,
        seoTitle: newsForm.seoTitle || undefined,
        seoDescription: newsForm.seoDescription || undefined,
        ogImageUrl: newsForm.ogImageUrl || undefined,
        canonicalUrl: newsForm.canonicalUrl || undefined,
        publishAt: newsForm.publishAt || undefined,
        publishedAt: newsForm.publishedAt || undefined,
      };
      const response = await adminFetch(editingNewsId ? `/api/admin/news/${editingNewsId}` : "/api/admin/news", {
        method: editingNewsId ? "PUT" : "POST",
        body: JSON.stringify(payload),
      });

      const savedArticle = response.data as ManagedNewsArticleRecord;
      setNewsArticles((currentArticles) => {
        const remainingArticles = currentArticles.filter((article) => article.id !== savedArticle.id);
        return [savedArticle, ...remainingArticles].sort((firstArticle, secondArticle) =>
          (secondArticle.date ?? "").localeCompare(firstArticle.date ?? ""),
        );
      });
      setMessage(editingNewsId ? "News article updated" : "News article created");
      resetNewsEditor();
      await loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSavingNews(false);
    }
  }

  async function handleDeleteNews(article: ManagedNewsArticleRecord) {
    if (!window.confirm(`Delete "${article.title}"?`)) {
      return;
    }

    try {
      await adminFetch(`/api/admin/news/${article.id}`, { method: "DELETE" });
      setNewsArticles((currentArticles) => currentArticles.filter((currentArticle) => currentArticle.id !== article.id));
      if (editingNewsId === article.id) {
        resetNewsEditor();
      }
      setMessage("News article deleted");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function handleMessageStatusChange(messageId: string, status: ContactMessage["status"]) {
    try {
      const response = await adminFetch("/api/admin/messages", {
        method: "PATCH",
        body: JSON.stringify({ id: messageId, status }),
      });
      const updatedMessage = response.data as ContactMessage;
      setMessages((currentMessages) => currentMessages.map((message) => (message.id === updatedMessage.id ? updatedMessage : message)));
      setMessage(status === "reviewed" ? "Inbox item marked reviewed" : "Inbox item reopened");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function handleSeasonSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!seasonForm.title) return;

    try {
      const payload = {
        ...seasonForm,
        configuredDays: Number(seasonForm.configuredDays ?? 15),
        currentDay: Number(seasonForm.currentDay ?? 0),
        seasonNumber: Number(seasonForm.seasonNumber ?? 1),
      };

      if (editingSeason) {
        await adminFetch(`/api/seasons/${editingSeason}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
        setMessage("Season updated");
      } else {
        await adminFetch("/api/seasons", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        setMessage("Season created");
      }

      setSeasonForm(defaultSeasonForm);
      setEditingSeason(null);
      loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function handleSeasonStatusChange(season: Season, status: SeasonStatus) {
    try {
      await adminFetch(`/api/seasons/${season.id}`, {
        method: "PUT",
        body: JSON.stringify({
          ...season,
          title: season.title,
          status,
          endedEarly: status === "completed" ? season.currentDay! < season.configuredDays! : season.endedEarly,
          completedAt: status === "completed" ? new Date().toISOString() : season.completedAt,
          archivedAt: status === "archived" ? new Date().toISOString() : season.archivedAt,
        }),
      });
      setMessage(`Season marked as ${status}`);
      loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function handleSeasonSync(targetSeason?: Partial<Season>) {
    setSyncingSeason(true);
    setError(null);

    try {
      const response = await adminFetch("/api/admin/seasons/sync-bravo-daily-scrims", {
        method: "POST",
        body: JSON.stringify({
          configuredDays: Number(targetSeason?.configuredDays ?? activeSeason?.configuredDays ?? seasonForm.configuredDays ?? 15),
          currentDay: Number(targetSeason?.currentDay ?? activeSeason?.currentDay ?? seasonForm.currentDay ?? 6),
        }),
      });

      setMessage(response.message ?? "Bravo season synced");
      loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSyncingSeason(false);
    }
  }

  async function handleCreateNextDay(targetSeason?: Season | null) {
    if (!targetSeason?.id) {
      setError("Select or create a season before creating the next scrim day.");
      return;
    }

    setCreatingNextDay(true);
    setError(null);

    try {
      const response = await adminFetch("/api/admin/seasons/create-next-day", {
        method: "POST",
        body: JSON.stringify({ seasonId: targetSeason.id }),
      });
      setMessage(response.message ?? "Created the next scrim day.");
      await loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setCreatingNextDay(false);
    }
  }

  async function handleImportBatchAction(batchId: string, action: "approve" | "reject") {
    setProcessingImportBatchId(batchId);
    setError(null);

    try {
      const response = await adminFetch(`/api/admin/pending-imports/${batchId}`, {
        method: "PATCH",
        body: JSON.stringify({ action }),
      });
      setMessage(
        response.message ?? (action === "approve" ? "Pending import approved and imported to draft." : "Pending import rejected."),
      );
      await loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setProcessingImportBatchId(null);
    }
  }

  async function handleDeleteImportBatch(batchId: string) {
    setProcessingImportBatchId(batchId);
    setError(null);

    try {
      const response = await adminFetch(`/api/admin/pending-imports/${batchId}`, {
        method: "DELETE",
      });
      setMessage(response.message ?? "Import batch deleted.");
      await loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setProcessingImportBatchId(null);
    }
  }

  async function handleTournamentSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!tournamentForm.title) return;
    try {
      const selectedSeason = seasons.find((season) => season.id === tournamentForm.seasonId) ?? activeSeason ?? null;
      const payload = {
        ...tournamentForm,
        seasonId: tournamentForm.seasonId ?? selectedSeason?.id,
        seasonTitle: tournamentForm.seasonTitle ?? selectedSeason?.seriesTitle ?? selectedSeason?.title,
        seasonNumber: tournamentForm.seasonNumber ?? selectedSeason?.seasonNumber,
        teamCount: tournamentForm.registeredTeamIds?.length ?? tournamentForm.teamCount ?? 0,
        createdAt: tournamentForm.createdAt ?? new Date().toISOString(),
      };
      const response = editingTournament
        ? await adminFetch(`/api/tournaments/${editingTournament}`, {
            method: "PUT",
            body: JSON.stringify(payload),
          })
        : await adminFetch("/api/tournaments", {
            method: "POST",
            body: JSON.stringify(payload),
          });
      const savedTournament = response.data as Tournament;

      setTournamentForm(savedTournament);
      setEditingTournament(savedTournament.id);
      setTournamentImportMatchIds((currentValue) => currentValue || formatScrimMatchIds(findTournamentScrim(savedTournament.id)));
      setMessage(
        editingTournament
          ? "Tournament updated. Match pulls will keep using this editor context."
          : "Tournament created. Paste PUBG match IDs below, then pull JSONs into the import workflow.",
      );
      await loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function handleTeamSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!teamForm.name) return;
    try {
      const canonicalStatus = teamForm.status ?? "active";
      const payload = {
        name: teamForm.name.trim(),
        tag: teamForm.tag?.trim() || null,
        region: teamForm.country?.trim() || null,
        slotNumber: teamForm.slotNumber ?? null,
        status: canonicalStatus,
        isActive: canonicalStatus === "active" || canonicalStatus === "pending",
      };
      if (editingTeam) {
        await adminFetch(`/api/admin/teams/${editingTeam}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
        setMessage("Team updated");
      } else {
        await adminFetch("/api/admin/teams", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        setMessage("Team created");
      }
      setTeamForm({
        status: "active",
      });
      setEditingTeam(null);
      loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function handlePlayerSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!playerForm.name && !playerForm.inGameName) return;
    try {
      const payload = {
        ...playerForm,
        name: playerForm.name || playerForm.inGameName,
        avatar: playerForm.avatarUrl ?? playerForm.avatar,
      };
      if (editingPlayer) {
        await adminFetch(`/api/players/${editingPlayer}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
        setMessage("Player updated");
      } else {
        await adminFetch("/api/players", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        setMessage("Player created");
      }
      setPlayerForm({
        kills: 0,
        damage: 0,
        mvpCount: 0,
        chickenDinners: 0,
        matches: 0,
        playerStatus: "active",
      });
      setEditingPlayer(null);
      loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function handleRegistrationStatusChange(registrationId: string, status: RegistrationStatus) {
    setRegistrationActionId(registrationId);
    setError(null);

    try {
      const response = await adminFetch("/api/registrations", {
        method: "PATCH",
        body: JSON.stringify({ id: registrationId, status }),
      });
      setMessage(response.message ?? (status === "approved" ? "Registration approved and team published." : "Registration updated."));
      await loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setRegistrationActionId(null);
    }
  }

  async function handleScrimSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!scrimForm.title || !scrimForm.date || !scrimForm.map) return;
    try {
      const selectedSeason = seasons.find((season) => season.id === scrimForm.seasonId) ?? activeSeason ?? null;
      const pubgMatchIds = getScrimMatchIds(scrimForm);
      const payload = {
        ...scrimForm,
        seasonId: scrimForm.seasonId ?? selectedSeason?.id,
        seasonTitle: scrimForm.seasonTitle ?? selectedSeason?.seriesTitle ?? selectedSeason?.title,
        pubgMatchId: pubgMatchIds[0],
        pubgMatchIds,
      };

      if (editingScrim) {
        await adminFetch("/api/admin/scrims", {
          method: "PUT",
          body: JSON.stringify({ ...payload, id: editingScrim }),
        });
        setMessage("Scrim updated");
      } else {
        await adminFetch("/api/admin/scrims", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        setMessage("Scrim created");
      }
      setScrimForm({
        ...defaultScrimForm,
        seasonId: activeSeason?.id,
        seasonTitle: activeSeason?.seriesTitle ?? activeSeason?.title,
      });
      setEditingScrim(null);
      loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function handleAnnouncementSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!announcementForm.title || !announcementForm.detail) return;
    try {
      await adminFetch("/api/announcements", {
        method: "POST",
        body: JSON.stringify({
          ...announcementForm,
          date: announcementForm.date ?? formatAnnouncementDate(),
        }),
      });
      setMessage("Announcement published");
      setAnnouncementForm({ published: true });
      loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function resetCompetitionData() {
    const confirmed = window.confirm(
      "This will permanently delete seasons, tournaments, scrims, imported matches, standings, team/player competition records, and cached PUBG imports. Continue?",
    );
    if (!confirmed) return;

    setResettingData(true);
    setError(null);

    try {
      const res = await adminFetch("/api/admin/reset", { method: "POST" });
      setMessage(res.message ?? res.data?.message ?? "Competition data reset");
      await loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setResettingData(false);
    }
  }

  async function handleImportBravoFeed() {
    setImportingBravoFeed(true);
    setError(null);

    try {
      const response = await adminFetch("/api/admin/tournaments/import-bravo-feed", {
        method: "POST",
        body: JSON.stringify({
          configuredDays: Number(activeSeason?.configuredDays ?? seasonForm.configuredDays ?? 15),
          currentDay: Number(activeSeason?.currentDay ?? seasonForm.currentDay ?? 6),
        }),
      });
      setMessage(response.message ?? "Imported Bravo Gaming feed data.");
      loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setImportingBravoFeed(false);
    }
  }

  function toggleTournamentTeam(teamId: string) {
    const current = tournamentForm.registeredTeamIds ?? [];
    const next = current.includes(teamId) ? current.filter((id) => id !== teamId) : [...current, teamId];
    setTournamentForm({
      ...tournamentForm,
      registeredTeamIds: next,
      teamCount: next.length,
    });
  }

  function toggleScrimTeam(teamId: string) {
    const current = scrimForm.teamIds ?? [];
    const next = current.includes(teamId) ? current.filter((id) => id !== teamId) : [...current, teamId];
    setScrimForm({ ...scrimForm, teamIds: next });
  }

  return (
    <div className="flex flex-col gap-6 xl:flex-row">
      <AdminSidebar
        active={section}
        onChange={handleSectionChange}
        dataConnected={stats?.dataConnected ?? false}
        dataBackend={stats?.dataBackend}
        onLogout={() => void logout()}
        adminEmail={user?.email ?? undefined}
        canManagePlatformAdmin={canManagePlatformAdmin}
      />

      <div className="min-w-0 flex-1 space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <nav
              aria-label="Breadcrumb"
              className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-text-muted"
            >
              <Link href="/" className="hover:text-white">
                Bravo Gaming
              </Link>
              <span aria-hidden="true">/</span>
              <button type="button" onClick={() => handleSectionChange("dashboard")} className="hover:text-white">
                Admin
              </button>
              {section !== "dashboard" ? (
                <>
                  <span aria-hidden="true">/</span>
                  <span aria-current="page" className="text-accent-blue">
                    {getAdminSectionLabel(section)}
                  </span>
                </>
              ) : null}
            </nav>
            <h1 className="font-display text-3xl font-black uppercase text-white">{getAdminSectionLabel(section)}</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-text-muted">
            <span className="rounded-full border border-white/10 px-3 py-1">Production data</span>
            <span>Published PUBG results only</span>
          </div>
        </div>

        {(message || error) && (
          <div
            role={error ? "alert" : "status"}
            aria-live={error ? "assertive" : "polite"}
            className={`rounded-2xl border px-4 py-3 text-sm ${error ? "border-bravoRed/30 bg-bravoRed/10 text-red-300" : "border-bravoGreen/30 bg-bravoGreen/10 text-bravoGreen"}`}
          >
            {error ?? message}
            <button
              type="button"
              onClick={() => {
                setMessage(null);
                setError(null);
              }}
              className="ml-4 text-xs underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {resourceWarnings.length > 0 ? (
          <div
            role="status"
            aria-live="polite"
            className="rounded-2xl border border-accent-yellow/30 bg-accent-yellow/10 px-4 py-3 text-sm text-amber-100"
          >
            <p className="font-semibold">Some admin resources are temporarily unavailable:</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {resourceWarnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          </div>
        ) : null}

        {hasDemoSeededData && (
          <div className="rounded-2xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
            <span className="mr-3 inline-flex rounded-full border border-amber-300/40 bg-amber-300/15 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.18em] text-amber-200">
              Demo
            </span>
            Launch preview data is currently seeded. Run <code>npm run clear:demo</code> before final production launch.
          </div>
        )}

        {loading && <p className="text-sm text-slate-400">Loading data...</p>}

        {section === "dashboard" && stats && (
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {dashboardOverview.cards.map((card) => (
                <div key={card.label} className="stat-pill p-5">
                  <p className="text-label uppercase text-text-muted">{card.label}</p>
                  <p className={`mt-1 font-mono-stat text-3xl font-extrabold ${card.tone}`}>{card.value}</p>
                </div>
              ))}
            </div>

            {activeSeason && (
              <div className="esports-card p-5">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="section-heading !text-sm">Active Season</p>
                    <h2 className="mt-2 text-2xl font-black text-white">{activeSeason.seriesTitle ?? activeSeason.title}</h2>
                    <p className="mt-2 text-sm text-text-muted">
                      Started {activeSeason.startDate} | Day {activeSeason.currentDay} of {activeSeason.configuredDays}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <div className="rounded-card border border-white/10 bg-bg-primary px-4 py-3">
                      <p className="text-label uppercase text-text-muted">Status</p>
                      <p className="mt-2 font-mono-stat text-white">{activeSeason.status}</p>
                    </div>
                    <div className="rounded-card border border-white/10 bg-bg-primary px-4 py-3">
                      <p className="text-label uppercase text-text-muted">Length</p>
                      <p className="mt-2 font-mono-stat text-accent-blue">{activeSeason.configuredDays} Days</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="grid gap-6 lg:grid-cols-[1.1fr,0.9fr]">
              <div className="esports-card p-5">
                <p className="section-heading !text-sm">Platform Snapshot</p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-card border border-white/10 bg-bg-primary p-4">
                    <p className="text-label uppercase text-text-muted">Scrims</p>
                    <p className="mt-2 font-mono-stat text-white">{stats.totalScrims}</p>
                  </div>
                  <div className="rounded-card border border-white/10 bg-bg-primary p-4">
                    <p className="text-label uppercase text-text-muted">Tournaments</p>
                    <p className="mt-2 font-mono-stat text-white">{stats.totalTournaments}</p>
                  </div>
                  <div className="rounded-card border border-white/10 bg-bg-primary p-4">
                    <p className="text-label uppercase text-text-muted">Matches Played</p>
                    <p className="mt-2 font-mono-stat text-accent-blue">{stats.matchesPlayed}</p>
                  </div>
                  <div className="rounded-card border border-white/10 bg-bg-primary p-4">
                    <p className="text-label uppercase text-text-muted">Data Backend</p>
                    <p className="mt-2 font-mono-stat text-accent-green">{stats.dataBackend ?? "Supabase"}</p>
                  </div>
                </div>
              </div>

              <div className="esports-card p-5">
                <p className="section-heading !text-sm">Approval Queue</p>
                <div className="mt-4 space-y-3 text-sm">
                  {[
                    {
                      label: "Pending registrations",
                      value: dashboardOverview.pendingRegistrations,
                    },
                    {
                      label: "Pending PUBG imports",
                      value: pendingImportBatches.length,
                    },
                    {
                      label: "New inbox messages",
                      value: dashboardOverview.newInboxItems,
                    },
                    {
                      label: "Published news",
                      value: dashboardOverview.publishedArticles,
                    },
                    {
                      label: "Draft articles",
                      value: dashboardOverview.draftArticles,
                    },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="flex items-center justify-between rounded-card border border-white/10 bg-bg-primary px-4 py-3"
                    >
                      <span className="text-white">{item.label}</span>
                      <span className="font-mono-stat text-accent-yellow">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="esports-card overflow-hidden !p-0">
              <div className="border-b border-white/[0.08] px-4 py-3">
                <p className="section-heading !text-sm">Recent Live Matches</p>
              </div>
              {liveMatches.length === 0 ? (
                <p className="p-6 text-center text-sm text-text-muted">Match data will appear once results are published.</p>
              ) : (
                <div className="table-scroll" tabIndex={0}>
                  <table className="data-table min-w-full">
                    <caption className="sr-only">Recently published live matches</caption>
                    <thead>
                      <tr>
                        <th scope="col">Map</th>
                        <th scope="col">Winner</th>
                        <th scope="col">KOs</th>
                        <th scope="col">Synced</th>
                        <th scope="col">Source</th>
                      </tr>
                    </thead>
                    <tbody>
                      {liveMatches.slice(0, 8).map((m) => (
                        <tr key={m.id}>
                          <td className="text-accent-blue">{m.map}</td>
                          <td className="font-semibold">{m.winner}</td>
                          <td>{m.knockouts}</td>
                          <td className="text-text-muted">{m.syncedAt ? formatDisplayDateTime(m.syncedAt) : "-"}</td>
                          <td className="text-accent-green">{m.dataSource}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
              <div className="esports-card p-5">
                <p className="section-heading !text-sm">Recent Registrations</p>
                {stats.recentRegistrations?.length ? (
                  <ul className="mt-3 space-y-2 text-sm">
                    {stats.recentRegistrations.map((r) => (
                      <li key={r.id} className="flex justify-between border-b border-white/5 py-2">
                        <span className="text-white">{r.teamName}</span>
                        <span className="text-text-muted">{r.status}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-3 text-sm text-text-muted">No registrations yet</p>
                )}
              </div>
              <div className="esports-card p-5">
                <p className="section-heading !text-sm">Recent Uploads</p>
                {stats.recentUploads?.length || recentUploads.length ? (
                  <ul className="mt-3 space-y-2 text-sm">
                    {(stats.recentUploads ?? recentUploads).map((u) => (
                      <li key={u.id} className="flex justify-between border-b border-white/5 py-2">
                        <span className="text-white">{u.type.replace(/_/g, " ")}</span>
                        <span className="text-text-muted">{formatDisplayDate(u.uploadedAt)}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-3 text-sm text-text-muted">No uploads yet</p>
                )}
              </div>
              <div className="esports-card p-5">
                <p className="section-heading !text-sm">Recent Admin Activity</p>
                {auditLogs.length > 0 ? (
                  <ul className="mt-3 space-y-2 text-sm">
                    {auditLogs.map((log) => (
                      <li key={log.id} className="border-b border-white/5 py-2">
                        <p className="text-white">
                          {log.actorName ?? log.actorEmail ?? "Admin"} | {log.action.replace(/_/g, " ")} {log.entity_type}
                        </p>
                        <p className="text-xs text-text-muted">
                          {formatDisplayDateTime(log.created_at)} {log.entity_id ? `| ${log.entity_id}` : ""}
                        </p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-3 text-sm text-text-muted">Audit entries will appear here after admin actions are recorded.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {section === "homepage" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-black text-white">Homepage CMS</h2>
              <p className="mt-1 text-sm text-text-muted">
                Control the premium homepage hero, live module, featured content rows, and flagship spotlight ordering from Supabase-backed
                content.
              </p>
            </div>

            <form onSubmit={handleHomepageSubmit} className="space-y-6">
              <div className="grid gap-4 xl:grid-cols-3">
                {homepageForm.heroSlides.map((slide, index) => (
                  <div key={slide.id} className="esports-card space-y-4 p-5">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-display text-sm font-black uppercase text-white">Hero Slide {index + 1}</p>
                      <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-text-muted">
                        Editable
                      </span>
                    </div>
                    <input
                      className={inputClass}
                      aria-label="Badge"
                      placeholder="Badge"
                      value={slide.badge}
                      onChange={(e) => updateHomepageSlide(index, { badge: e.target.value })}
                    />
                    <input
                      className={inputClass}
                      aria-label="Title"
                      placeholder="Title"
                      value={slide.title}
                      onChange={(e) => updateHomepageSlide(index, { title: e.target.value })}
                    />
                    <textarea
                      className={inputClass}
                      aria-label="Description"
                      placeholder="Description"
                      rows={4}
                      value={slide.description}
                      onChange={(e) =>
                        updateHomepageSlide(index, {
                          description: e.target.value,
                        })
                      }
                    />
                    <FileUpload
                      type="hero_slide_asset"
                      entityId={slide.id || `hero-slide-${index + 1}`}
                      label="Hero image / poster"
                      currentUrl={slide.imageUrl ?? undefined}
                      onUploaded={(url) => updateHomepageSlide(index, { imageUrl: url })}
                    />
                    <input
                      className={inputClass}
                      aria-label="Video URL (YouTube, Vimeo, or direct file)"
                      placeholder="Video URL (YouTube, Vimeo, or direct file)"
                      value={slide.videoUrl ?? ""}
                      onChange={(e) => updateHomepageSlide(index, { videoUrl: e.target.value })}
                    />
                    <input
                      className={inputClass}
                      aria-label="Sponsor slug (optional)"
                      placeholder="Sponsor slug (optional)"
                      value={slide.sponsorSlug ?? ""}
                      onChange={(e) =>
                        updateHomepageSlide(index, {
                          sponsorSlug: e.target.value,
                        })
                      }
                    />
                    <textarea
                      className={inputClass}
                      aria-label="Promo/support text (optional)"
                      placeholder="Promo/support text (optional)"
                      rows={3}
                      value={slide.promoText ?? ""}
                      onChange={(e) =>
                        updateHomepageSlide(index, {
                          promoText: e.target.value,
                        })
                      }
                    />
                    <input
                      className={inputClass}
                      aria-label="Primary button label"
                      placeholder="Primary button label"
                      value={slide.primaryLabel}
                      onChange={(e) =>
                        updateHomepageSlide(index, {
                          primaryLabel: e.target.value,
                        })
                      }
                    />
                    <input
                      className={inputClass}
                      aria-label="Primary button href"
                      placeholder="Primary button href"
                      value={slide.primaryHref}
                      onChange={(e) =>
                        updateHomepageSlide(index, {
                          primaryHref: e.target.value,
                        })
                      }
                    />
                    <input
                      className={inputClass}
                      aria-label="Secondary button label"
                      placeholder="Secondary button label"
                      value={slide.secondaryLabel ?? ""}
                      onChange={(e) =>
                        updateHomepageSlide(index, {
                          secondaryLabel: e.target.value,
                        })
                      }
                    />
                    <input
                      className={inputClass}
                      aria-label="Secondary button href"
                      placeholder="Secondary button href"
                      value={slide.secondaryHref ?? ""}
                      onChange={(e) =>
                        updateHomepageSlide(index, {
                          secondaryHref: e.target.value,
                        })
                      }
                    />
                    <input
                      className={inputClass}
                      aria-label="Tertiary button label"
                      placeholder="Tertiary button label"
                      value={slide.tertiaryLabel ?? ""}
                      onChange={(e) =>
                        updateHomepageSlide(index, {
                          tertiaryLabel: e.target.value,
                        })
                      }
                    />
                    <input
                      className={inputClass}
                      aria-label="Tertiary button href"
                      placeholder="Tertiary button href"
                      value={slide.tertiaryHref ?? ""}
                      onChange={(e) =>
                        updateHomepageSlide(index, {
                          tertiaryHref: e.target.value,
                        })
                      }
                    />
                  </div>
                ))}
              </div>

              <HomepageFeaturedEventsManager
                value={homepageForm.featuredEvents}
                eventOptions={homepageEventOptions}
                disabled={savingHomepage}
                onChange={(featuredEvents) =>
                  setHomepageForm((currentForm) => ({
                    ...currentForm,
                    featuredEvents,
                    featuredEventSlugs: featuredEvents.map((feature) => feature.eventSlug),
                  }))
                }
              />

              <div className="grid gap-6 xl:grid-cols-[1fr,1fr]">
                <div className="esports-card grid gap-4 p-6">
                  <div>
                    <p className="font-display text-sm font-black uppercase text-white">Live Module</p>
                    <p className="mt-1 text-sm text-text-muted">Override the live-now block without breaking the stream fallback.</p>
                  </div>
                  <input
                    className={inputClass}
                    aria-label="Live title"
                    placeholder="Live title"
                    value={homepageForm.liveTitle ?? ""}
                    onChange={(e) =>
                      setHomepageForm({
                        ...homepageForm,
                        liveTitle: e.target.value,
                      })
                    }
                  />
                  <textarea
                    className={inputClass}
                    aria-label="Live subtitle"
                    placeholder="Live subtitle"
                    rows={3}
                    value={homepageForm.liveSubtitle ?? ""}
                    onChange={(e) =>
                      setHomepageForm({
                        ...homepageForm,
                        liveSubtitle: e.target.value,
                      })
                    }
                  />
                  <input
                    className={inputClass}
                    aria-label="Viewer label"
                    placeholder="Viewer label"
                    value={homepageForm.liveViewers ?? ""}
                    onChange={(e) =>
                      setHomepageForm({
                        ...homepageForm,
                        liveViewers: e.target.value,
                      })
                    }
                  />
                  <input
                    className={inputClass}
                    aria-label="Live href"
                    placeholder="Live href"
                    value={homepageForm.liveHref ?? ""}
                    onChange={(e) =>
                      setHomepageForm({
                        ...homepageForm,
                        liveHref: e.target.value,
                      })
                    }
                  />
                  <input
                    className={inputClass}
                    aria-label="Breaking news slug"
                    placeholder="Breaking news slug"
                    value={homepageForm.breakingNewsSlug ?? ""}
                    onChange={(e) =>
                      setHomepageForm({
                        ...homepageForm,
                        breakingNewsSlug: e.target.value,
                      })
                    }
                  />
                </div>

                <div className="esports-card grid gap-4 p-6">
                  <div>
                    <p className="font-display text-sm font-black uppercase text-white">Featured Content Ordering</p>
                    <p className="mt-1 text-sm text-text-muted">
                      Order the remaining editorial, sponsor, media, team, and player highlights.
                    </p>
                  </div>
                  <textarea
                    className={inputClass}
                    aria-label="Featured news slugs"
                    placeholder="Featured news slugs"
                    rows={2}
                    value={joinDelimitedValues(homepageForm.featuredNewsSlugs)}
                    onChange={(e) =>
                      setHomepageForm({
                        ...homepageForm,
                        featuredNewsSlugs: splitDelimitedValues(e.target.value),
                      })
                    }
                  />
                  <textarea
                    className={inputClass}
                    aria-label="Featured sponsor slugs"
                    placeholder="Featured sponsor slugs"
                    rows={2}
                    value={joinDelimitedValues(homepageForm.featuredSponsorSlugs)}
                    onChange={(e) =>
                      setHomepageForm({
                        ...homepageForm,
                        featuredSponsorSlugs: splitDelimitedValues(e.target.value),
                      })
                    }
                  />
                  <textarea
                    className={inputClass}
                    aria-label="Featured media ids"
                    placeholder="Featured media ids"
                    rows={2}
                    value={joinDelimitedValues(homepageForm.featuredMediaIds)}
                    onChange={(e) =>
                      setHomepageForm({
                        ...homepageForm,
                        featuredMediaIds: splitDelimitedValues(e.target.value),
                      })
                    }
                  />
                  <textarea
                    className={inputClass}
                    aria-label="Featured team ids"
                    placeholder="Featured team ids"
                    rows={2}
                    value={joinDelimitedValues(homepageForm.featuredTeamIds)}
                    onChange={(e) =>
                      setHomepageForm({
                        ...homepageForm,
                        featuredTeamIds: splitDelimitedValues(e.target.value),
                      })
                    }
                  />
                  <textarea
                    className={inputClass}
                    aria-label="Featured player ids"
                    placeholder="Featured player ids"
                    rows={2}
                    value={joinDelimitedValues(homepageForm.featuredPlayerIds)}
                    onChange={(e) =>
                      setHomepageForm({
                        ...homepageForm,
                        featuredPlayerIds: splitDelimitedValues(e.target.value),
                      })
                    }
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <button type="submit" disabled={savingHomepage} className={btnPrimary}>
                  {savingHomepage ? "Saving..." : "Save Homepage"}
                </button>
                <button type="button" onClick={() => setHomepageForm(defaultHomepageForm)} className="btn-secondary">
                  Reset Local Form
                </button>
              </div>
            </form>
          </div>
        )}

        {section === "footer" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-black text-white">Footer Settings</h2>
              <p className="mt-1 text-sm text-text-muted">
                Manage footer messaging, calls to action, link groups, and legal text from the same Supabase-backed content layer.
              </p>
            </div>

            <form onSubmit={handleHomepageSubmit} className="space-y-6">
              <div className="grid gap-6 xl:grid-cols-[1.05fr,0.95fr]">
                <div className="esports-card grid gap-4 p-6">
                  <div>
                    <p className="font-display text-sm font-black uppercase text-white">Footer Intro</p>
                    <p className="mt-1 text-sm text-text-muted">This content drives the left side of the public footer card.</p>
                  </div>
                  <input
                    className={inputClass}
                    aria-label="Footer title"
                    placeholder="Footer title"
                    value={homepageForm.footerTitle}
                    onChange={(event) =>
                      setHomepageForm({
                        ...homepageForm,
                        footerTitle: event.target.value,
                      })
                    }
                  />
                  <input
                    className={inputClass}
                    aria-label="Footer tagline"
                    placeholder="Footer tagline"
                    value={homepageForm.footerTagline}
                    onChange={(event) =>
                      setHomepageForm({
                        ...homepageForm,
                        footerTagline: event.target.value,
                      })
                    }
                  />
                  <textarea
                    className={inputClass}
                    rows={4}
                    aria-label="Footer description"
                    placeholder="Footer description"
                    value={homepageForm.footerDescription}
                    onChange={(event) =>
                      setHomepageForm({
                        ...homepageForm,
                        footerDescription: event.target.value,
                      })
                    }
                  />
                  <div className="grid gap-4 sm:grid-cols-2">
                    <input
                      className={inputClass}
                      aria-label="Primary button label"
                      placeholder="Primary button label"
                      value={homepageForm.footerPrimaryLabel}
                      onChange={(event) =>
                        setHomepageForm({
                          ...homepageForm,
                          footerPrimaryLabel: event.target.value,
                        })
                      }
                    />
                    <input
                      className={inputClass}
                      aria-label="Primary button href"
                      placeholder="Primary button href"
                      value={homepageForm.footerPrimaryHref}
                      onChange={(event) =>
                        setHomepageForm({
                          ...homepageForm,
                          footerPrimaryHref: event.target.value,
                        })
                      }
                    />
                    <input
                      className={inputClass}
                      aria-label="Secondary button label"
                      placeholder="Secondary button label"
                      value={homepageForm.footerSecondaryLabel}
                      onChange={(event) =>
                        setHomepageForm({
                          ...homepageForm,
                          footerSecondaryLabel: event.target.value,
                        })
                      }
                    />
                    <input
                      className={inputClass}
                      aria-label="Secondary button href"
                      placeholder="Secondary button href"
                      value={homepageForm.footerSecondaryHref}
                      onChange={(event) =>
                        setHomepageForm({
                          ...homepageForm,
                          footerSecondaryHref: event.target.value,
                        })
                      }
                    />
                  </div>
                </div>

                <div className="esports-card grid gap-4 p-6">
                  <div>
                    <p className="font-display text-sm font-black uppercase text-white">Footer Bottom Bar</p>
                    <p className="mt-1 text-sm text-text-muted">
                      Short ownership and platform summary copy shown beneath the footer columns.
                    </p>
                  </div>
                  <input
                    className={inputClass}
                    aria-label="Bottom primary text"
                    placeholder="Bottom primary text"
                    value={homepageForm.footerBottomPrimary}
                    onChange={(event) =>
                      setHomepageForm({
                        ...homepageForm,
                        footerBottomPrimary: event.target.value,
                      })
                    }
                  />
                  <textarea
                    className={inputClass}
                    rows={3}
                    aria-label="Bottom secondary text"
                    placeholder="Bottom secondary text"
                    value={homepageForm.footerBottomSecondary}
                    onChange={(event) =>
                      setHomepageForm({
                        ...homepageForm,
                        footerBottomSecondary: event.target.value,
                      })
                    }
                  />
                  <div className="grid gap-4 sm:grid-cols-3">
                    {homepageForm.footerHighlights.map((highlight, index) => (
                      <div key={highlight.id} className="rounded-card border border-white/10 bg-bg-primary p-4">
                        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-text-muted">Highlight {index + 1}</p>
                        <div className="space-y-3">
                          <input
                            className={inputClass}
                            aria-label="Label"
                            placeholder="Label"
                            value={highlight.label}
                            onChange={(event) =>
                              updateFooterHighlight(index, {
                                label: event.target.value,
                              })
                            }
                          />
                          <input
                            className={inputClass}
                            aria-label="Value"
                            placeholder="Value"
                            value={highlight.value}
                            onChange={(event) =>
                              updateFooterHighlight(index, {
                                value: event.target.value,
                              })
                            }
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid gap-4 xl:grid-cols-2">
                {homepageForm.footerColumns.map((column, index) => (
                  <div key={column.id} className="esports-card grid gap-4 p-6">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-display text-sm font-black uppercase text-white">Footer Column {index + 1}</p>
                      <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-text-muted">
                        `Label | Href`
                      </span>
                    </div>
                    <input
                      className={inputClass}
                      aria-label="Column title"
                      placeholder="Column title"
                      value={column.title}
                      onChange={(event) => updateFooterColumn(index, { title: event.target.value })}
                    />
                    <textarea
                      className={inputClass}
                      rows={6}
                      aria-label="Footer column links"
                      placeholder="Home | /&#10;News | /news"
                      value={serializeFooterLinks(column.links)}
                      onChange={(event) =>
                        updateFooterColumn(index, {
                          links: parseFooterLinks(event.target.value),
                        })
                      }
                    />
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap gap-3">
                <button type="submit" disabled={savingHomepage} className={btnPrimary}>
                  {savingHomepage ? "Saving..." : "Save Footer"}
                </button>
                <button type="button" onClick={() => setHomepageForm(defaultHomepageForm)} className="btn-secondary">
                  Reset Local Form
                </button>
              </div>
            </form>
          </div>
        )}

        {section === "games" && <AdminGamesManager />}

        {section === "platformEvents" && <AdminPlatformEventsManager />}

        {section === "news" && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-2xl font-black text-white">News CMS</h2>
                <p className="mt-1 text-sm text-text-muted">
                  Publish full articles with categories, tags, featured and breaking state, SEO fields, and Cloudflare R2 images.
                </p>
              </div>
              {editingNewsId ? (
                <button type="button" onClick={resetNewsEditor} className="btn-secondary">
                  New Article
                </button>
              ) : null}
            </div>

            <div className="grid gap-6 xl:grid-cols-[1.05fr,0.95fr]">
              <form onSubmit={handleNewsSubmit} className="esports-card grid gap-4 p-6">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-display text-sm font-black uppercase text-white">
                    {editingNewsId ? "Edit article" : "Create article"}
                  </p>
                  <span
                    className={`rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] ${
                      newsForm.state === "published"
                        ? "border-accent-green/30 bg-accent-green/10 text-accent-green"
                        : newsForm.state === "scheduled"
                          ? "border-accent-blue/30 bg-accent-blue/10 text-accent-blue"
                          : "border-accent-yellow/30 bg-accent-yellow/10 text-accent-yellow"
                    }`}
                  >
                    {newsForm.state ?? "draft"}
                  </span>
                </div>
                <input
                  className={inputClass}
                  aria-label="Title"
                  placeholder="Title"
                  value={newsForm.title ?? ""}
                  onChange={(e) => setNewsForm({ ...newsForm, title: e.target.value })}
                  required
                />
                <input
                  className={inputClass}
                  aria-label="Slug"
                  placeholder="Slug"
                  value={newsForm.slug ?? ""}
                  onChange={(e) => setNewsForm({ ...newsForm, slug: e.target.value })}
                />
                <textarea
                  className={inputClass}
                  aria-label="Summary"
                  placeholder="Summary"
                  rows={3}
                  value={newsForm.summary ?? ""}
                  onChange={(e) => setNewsForm({ ...newsForm, summary: e.target.value })}
                  required
                />
                <textarea
                  className={inputClass}
                  aria-label="Excerpt (optional card + SEO fallback)"
                  placeholder="Excerpt (optional card + SEO fallback)"
                  rows={2}
                  value={newsForm.excerpt ?? ""}
                  onChange={(e) => setNewsForm({ ...newsForm, excerpt: e.target.value })}
                />
                <textarea
                  className={inputClass}
                  aria-label="Body paragraphs separated by blank lines"
                  placeholder="Body paragraphs separated by blank lines"
                  rows={10}
                  value={newsForm.bodyText}
                  onChange={(e) => setNewsForm({ ...newsForm, bodyText: e.target.value })}
                />
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <input
                    className={inputClass}
                    aria-label="Category"
                    placeholder="Category"
                    value={newsForm.category ?? ""}
                    onChange={(e) => setNewsForm({ ...newsForm, category: e.target.value })}
                  />
                  <input
                    className={inputClass}
                    aria-label="Tags (comma separated)"
                    placeholder="Tags (comma separated)"
                    value={joinDelimitedValues(newsForm.tags)}
                    onChange={(e) =>
                      setNewsForm({
                        ...newsForm,
                        tags: splitDelimitedValues(e.target.value),
                      })
                    }
                  />
                  <input
                    className={inputClass}
                    aria-label="Author"
                    placeholder="Author"
                    value={newsForm.authorName ?? ""}
                    onChange={(e) => setNewsForm({ ...newsForm, authorName: e.target.value })}
                  />
                  <input
                    className={inputClass}
                    aria-label="Game slug (optional)"
                    placeholder="Game slug (optional)"
                    value={newsForm.gameSlug ?? ""}
                    onChange={(e) => setNewsForm({ ...newsForm, gameSlug: e.target.value })}
                  />
                  <input
                    className={inputClass}
                    aria-label="Article date"
                    type="date"
                    value={newsForm.date ?? ""}
                    onChange={(e) => setNewsForm({ ...newsForm, date: e.target.value })}
                  />
                  <select
                    className={inputClass}
                    aria-label="Article publication state"
                    value={newsForm.state ?? "draft"}
                    onChange={(e) =>
                      setNewsForm({
                        ...newsForm,
                        state: e.target.value as ManagedNewsArticleRecord["state"],
                      })
                    }
                  >
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                    <option value="scheduled">Scheduled</option>
                  </select>
                  <div className="space-y-2 sm:col-span-2 lg:col-span-3">
                    <label className="px-1 text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">Publish At (NPT)</label>
                    <input
                      className={inputClass}
                      aria-label="Publish date and time in Nepal time"
                      type="datetime-local"
                      value={typeof newsForm.publishAt === "string" ? newsForm.publishAt : ""}
                      onChange={(e) => setNewsForm({ ...newsForm, publishAt: e.target.value })}
                    />
                    <p className="px-1 text-xs text-text-muted">
                      Use this only for scheduled stories. The saved timestamp is normalized to Nepal time.
                    </p>
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="flex items-center gap-3 rounded-card border border-white/10 bg-bg-primary px-4 py-3 text-sm text-white">
                    <input
                      type="checkbox"
                      checked={Boolean(newsForm.featured)}
                      onChange={(e) => setNewsForm({ ...newsForm, featured: e.target.checked })}
                    />
                    Featured article
                  </label>
                  <label className="flex items-center gap-3 rounded-card border border-white/10 bg-bg-primary px-4 py-3 text-sm text-white">
                    <input
                      type="checkbox"
                      checked={Boolean(newsForm.breaking)}
                      onChange={(e) => setNewsForm({ ...newsForm, breaking: e.target.checked })}
                    />
                    Breaking article
                  </label>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <input
                    className={inputClass}
                    aria-label="SEO title"
                    placeholder="SEO title"
                    value={newsForm.seoTitle ?? ""}
                    onChange={(e) => setNewsForm({ ...newsForm, seoTitle: e.target.value })}
                  />
                  <input
                    className={inputClass}
                    aria-label="SEO description"
                    placeholder="SEO description"
                    value={newsForm.seoDescription ?? ""}
                    onChange={(e) =>
                      setNewsForm({
                        ...newsForm,
                        seoDescription: e.target.value,
                      })
                    }
                  />
                  <input
                    className={inputClass}
                    aria-label="Canonical URL (optional)"
                    placeholder="Canonical URL (optional)"
                    value={newsForm.canonicalUrl ?? ""}
                    onChange={(e) => setNewsForm({ ...newsForm, canonicalUrl: e.target.value })}
                  />
                  <input
                    className={inputClass}
                    aria-label="OG image URL (optional)"
                    placeholder="OG image URL (optional)"
                    value={newsForm.ogImageUrl ?? ""}
                    onChange={(e) => setNewsForm({ ...newsForm, ogImageUrl: e.target.value })}
                  />
                </div>
                <FileUpload
                  type="announcement_image"
                  entityId={editingNewsId ?? newsForm.slug ?? newsForm.title ?? "news-draft"}
                  label="Article Cover Image"
                  currentUrl={newsForm.imageUrl ?? undefined}
                  onUploaded={(url) => setNewsForm({ ...newsForm, imageUrl: url })}
                />
                <FileUpload
                  type="announcement_image"
                  entityId={`${editingNewsId ?? newsForm.slug ?? newsForm.title ?? "news-draft"}-og`}
                  label="Open Graph Image"
                  currentUrl={newsForm.ogImageUrl ?? undefined}
                  onUploaded={(url) => setNewsForm({ ...newsForm, ogImageUrl: url })}
                />
                {newsForm.publishedAt ? (
                  <p className="text-xs text-text-muted">First published {formatDisplayDateTime(newsForm.publishedAt)}</p>
                ) : null}
                <div className="flex flex-wrap gap-3">
                  <button type="submit" disabled={savingNews} className={btnPrimary}>
                    {savingNews ? "Saving..." : editingNewsId ? "Update Article" : "Create Article"}
                  </button>
                  <button type="button" onClick={resetNewsEditor} className="btn-secondary">
                    Clear Form
                  </button>
                </div>
              </form>

              <div className="space-y-4">
                {newsArticles.length === 0 ? (
                  <div className="esports-card p-8 text-center text-text-muted">
                    No CMS news articles yet. Published admin articles will flow into the public news platform.
                  </div>
                ) : (
                  newsArticles.map((article) => (
                    <div key={article.id} className="esports-card p-5">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-semibold text-white">{article.title}</p>
                          <p className="mt-1 text-sm text-text-muted">
                            {article.category} | {article.date} | {article.authorName}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <span
                            className={`rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] ${
                              article.state === "published"
                                ? "border-accent-green/30 bg-accent-green/10 text-accent-green"
                                : article.state === "scheduled"
                                  ? "border-accent-blue/30 bg-accent-blue/10 text-accent-blue"
                                  : "border-accent-yellow/30 bg-accent-yellow/10 text-accent-yellow"
                            }`}
                          >
                            {article.state}
                          </span>
                          {article.featured ? (
                            <span className="rounded-full border border-accent-blue/30 bg-accent-blue/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-accent-blue">
                              Featured
                            </span>
                          ) : null}
                          {article.breaking ? (
                            <span className="rounded-full border border-accent-red/30 bg-accent-red/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-accent-red">
                              Breaking
                            </span>
                          ) : null}
                        </div>
                      </div>
                      <p className="mt-3 text-sm text-text-muted">{article.summary}</p>
                      {article.state === "scheduled" && article.publishAt ? (
                        <p className="mt-3 text-xs uppercase tracking-[0.16em] text-accent-blue">
                          Scheduled for {formatDisplayDateTime(article.publishAt)}
                        </p>
                      ) : article.publishedAt ? (
                        <p className="mt-3 text-xs uppercase tracking-[0.16em] text-text-muted">
                          Published {formatDisplayDateTime(article.publishedAt)}
                        </p>
                      ) : null}
                      {article.tags.length > 0 ? (
                        <p className="mt-3 text-xs uppercase tracking-[0.16em] text-text-muted">{article.tags.join(" | ")}</p>
                      ) : null}
                      <div className="mt-4 flex flex-wrap gap-3">
                        <button type="button" onClick={() => startNewsEdit(article)} className="btn-secondary !py-2 !text-[11px]">
                          Edit
                        </button>
                        <button type="button" onClick={() => void handleDeleteNews(article)} className={btnDanger}>
                          Delete
                        </button>
                        {isManagedNewsArticlePublic(article) ? (
                          <a
                            href={`/news/${article.slug}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-sm text-accent-blue hover:underline"
                          >
                            Open Public Story
                          </a>
                        ) : (
                          <span className="text-sm text-text-muted">Not public yet</span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {section === "media" && <AdminMediaManager />}

        {section === "sponsors" && <AdminSponsorsManager />}

        {section === "teamRequests" && (
          <div className="space-y-10">
            {discordAuthEnabled ? (
              <AdminDiscordLinkManager readOnly={!canManageCanonicalTeams} />
            ) : (
              <div className="esports-card border border-white/10 bg-white/[0.03] p-6 text-sm text-text-muted">
                Discord OAuth is disabled for first launch. Team login stays on email/password until provider credentials are configured.
              </div>
            )}
            <AdminTeamRequestsManager readOnly={!canManagePlatformAdmin} />
          </div>
        )}
        {section === "discordRoles" && <AdminDiscordRoleMappingManager embedded />}
        {section === "registeredTeams" && (
          <AdminRegisteredTeamsManager
            onNavigate={handleSectionChange}
            onEditTeam={canManageCanonicalTeams ? openAdminTeamEditor : undefined}
            onManageRoster={openAdminTeamRoster}
            onOpenLogoUpload={canManageCanonicalTeams ? () => handleSectionChange("teams") : undefined}
            onArchiveTeam={canManageCanonicalTeams ? archiveAdminTeam : undefined}
          />
        )}

        {section === "playerTeamLinking" &&
          (canManagePlatformAdmin ? (
            <AdminPlayerTeamLinkingManager />
          ) : (
            <div role="alert" className="esports-card border border-accent-yellow/30 p-5 text-sm text-text-muted">
              Player-team linking is available only to a protected platform administrator.
            </div>
          ))}

        {section === "inbox" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-black text-white">Inbox</h2>
              <p className="mt-1 text-sm text-text-muted">
                Contact and feedback submissions from public pages are stored in Supabase and reviewed here.
              </p>
            </div>

            {messages.length === 0 ? (
              <div className="esports-card p-8 text-center text-text-muted">No inbox submissions yet.</div>
            ) : (
              <div className="space-y-4">
                {messages.map((messageItem) => (
                  <div key={messageItem.id} className="esports-card p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-white">
                          {messageItem.subject || (messageItem.kind === "feedback" ? "Community feedback" : "Contact request")}
                        </p>
                        <p className="mt-1 text-sm text-text-muted">
                          {messageItem.name} | {messageItem.email} | {formatDisplayDateTime(messageItem.createdAt)}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <span className="rounded-full border border-accent-blue/30 bg-accent-blue/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-accent-blue">
                          {messageItem.kind}
                        </span>
                        <span
                          className={`rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] ${
                            messageItem.status === "reviewed"
                              ? "border-accent-green/30 bg-accent-green/10 text-accent-green"
                              : "border-accent-yellow/30 bg-accent-yellow/10 text-accent-yellow"
                          }`}
                        >
                          {messageItem.status}
                        </span>
                      </div>
                    </div>
                    <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-slate-200">{messageItem.message}</p>
                    <div className="mt-4 flex flex-wrap gap-3">
                      <a
                        href={`mailto:${messageItem.email}?subject=${encodeURIComponent(messageItem.subject || "Bravo Gaming reply")}`}
                        className="btn-secondary !py-2 !text-[11px]"
                      >
                        Reply by Email
                      </a>
                      <button
                        type="button"
                        onClick={() =>
                          void handleMessageStatusChange(messageItem.id, messageItem.status === "reviewed" ? "new" : "reviewed")
                        }
                        className={btnPrimary}
                      >
                        {messageItem.status === "reviewed" ? "Mark New" : "Mark Reviewed"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {section === "seasons" && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-2xl font-black text-white">{editingSeason ? "Edit Season" : "Season Manager"}</h2>
                <p className="mt-1 text-sm text-text-muted">
                  Configure the active Bravo daily scrim season, extend it, or rebuild stored day data from the imported feed.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => void handleCreateNextDay(activeSeason)}
                  disabled={creatingNextDay || !activeSeason}
                  className={btnPrimary}
                >
                  {creatingNextDay ? "Creating Day..." : `Create Day ${(activeSeason?.currentDay ?? 0) + 1}`}
                </button>
                <button
                  type="button"
                  onClick={() => void handleSeasonSync(activeSeason ?? seasonForm)}
                  disabled={syncingSeason}
                  className="btn-secondary"
                >
                  {syncingSeason ? "Syncing Season..." : "Sync Bravo Season (Day 1-3 + Day 6)"}
                </button>
              </div>
            </div>

            <form onSubmit={handleSeasonSubmit} className="esports-card grid gap-4 p-6 sm:grid-cols-2">
              <input
                className={inputClass}
                aria-label="Season title"
                placeholder="Season title"
                value={seasonForm.title ?? ""}
                onChange={(e) => setSeasonForm({ ...seasonForm, title: e.target.value })}
                required
              />
              <input
                className={inputClass}
                aria-label="Series title"
                placeholder="Series title"
                value={seasonForm.seriesTitle ?? ""}
                onChange={(e) => setSeasonForm({ ...seasonForm, seriesTitle: e.target.value })}
              />
              <input
                className={inputClass}
                type="number"
                min={1}
                aria-label="Season number"
                placeholder="Season number"
                value={seasonForm.seasonNumber ?? 1}
                onChange={(e) =>
                  setSeasonForm({
                    ...seasonForm,
                    seasonNumber: Number(e.target.value),
                  })
                }
              />
              <select
                className={inputClass}
                aria-label="Season status"
                value={seasonForm.status ?? "active"}
                onChange={(e) =>
                  setSeasonForm({
                    ...seasonForm,
                    status: e.target.value as SeasonStatus,
                  })
                }
              >
                {(["active", "planned", "completed", "archived"] as const).map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
              <input
                className={inputClass}
                aria-label="Season start date"
                type="date"
                value={seasonForm.startDate ?? ""}
                onChange={(e) => setSeasonForm({ ...seasonForm, startDate: e.target.value })}
              />
              <select
                className={inputClass}
                aria-label="Configured season days"
                value={Number(seasonForm.configuredDays ?? 15)}
                onChange={(e) =>
                  setSeasonForm({
                    ...seasonForm,
                    configuredDays: Number(e.target.value),
                  })
                }
              >
                <option value={15}>15 Days</option>
                <option value={30}>30 Days</option>
              </select>
              <input
                className={inputClass}
                type="number"
                min={0}
                aria-label="Current day"
                placeholder="Current day"
                value={seasonForm.currentDay ?? 0}
                onChange={(e) =>
                  setSeasonForm({
                    ...seasonForm,
                    currentDay: Number(e.target.value),
                  })
                }
              />
              <input
                className={inputClass}
                aria-label="Current tournament ID"
                placeholder="Current tournament ID"
                value={seasonForm.currentTournamentId ?? ""}
                onChange={(e) =>
                  setSeasonForm({
                    ...seasonForm,
                    currentTournamentId: e.target.value,
                  })
                }
              />
              <textarea
                className={`${inputClass} sm:col-span-2`}
                aria-label="Notes"
                placeholder="Notes"
                rows={3}
                value={seasonForm.notes ?? ""}
                onChange={(e) => setSeasonForm({ ...seasonForm, notes: e.target.value })}
              />
              <div className="flex flex-wrap gap-3 sm:col-span-2">
                <button type="submit" className={btnPrimary}>
                  {editingSeason ? "Update" : "Create"} Season
                </button>
                {editingSeason && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingSeason(null);
                      setSeasonForm(defaultSeasonForm);
                    }}
                    className="rounded-full border border-white/10 px-5 py-2.5 text-sm text-slate-300"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>

            <div className="grid gap-4 xl:grid-cols-3">
              {seasons.length === 0 ? (
                <div className="esports-card p-6 text-sm text-text-muted xl:col-span-3">
                  No seasons saved yet. Use the sync button to create the active Bravo season in the Bravo data hub.
                </div>
              ) : (
                seasons.map((season) => (
                  <div key={season.id} className="esports-card p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-label uppercase text-accent-blue">Season {season.seasonNumber}</p>
                        <h3 className="mt-2 break-words font-display text-sm font-bold uppercase text-white">
                          {season.seriesTitle ?? season.title}
                        </h3>
                      </div>
                      <span className="rounded-full border border-white/10 px-3 py-1 text-[10px] uppercase text-text-muted">
                        {season.status}
                      </span>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-label uppercase text-text-muted">Start</p>
                        <p className="font-mono-stat text-white">{season.startDate}</p>
                      </div>
                      <div>
                        <p className="text-label uppercase text-text-muted">Length</p>
                        <p className="font-mono-stat text-white">{season.configuredDays} Days</p>
                      </div>
                      <div>
                        <p className="text-label uppercase text-text-muted">Current Day</p>
                        <p className="font-mono-stat text-accent-blue">Day {season.currentDay}</p>
                      </div>
                      <div>
                        <p className="text-label uppercase text-text-muted">Tournaments</p>
                        <p className="font-mono-stat text-white">{season.tournamentIds?.length ?? 0}</p>
                      </div>
                    </div>

                    <div className="mt-5 flex flex-wrap gap-3 text-xs">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingSeason(season.id);
                          setSeasonForm(season);
                          handleSectionChange("seasons");
                        }}
                        className="text-bravoBlue hover:underline"
                      >
                        Edit
                      </button>
                      <button type="button" onClick={() => void handleCreateNextDay(season)} className="text-accent-blue hover:underline">
                        Create Day {(season.currentDay ?? 0) + 1}
                      </button>
                      <button type="button" onClick={() => void handleSeasonSync(season)} className="text-accent-green hover:underline">
                        Rebuild
                      </button>
                      {season.status !== "completed" && (
                        <button
                          type="button"
                          onClick={() => void handleSeasonStatusChange(season, "completed")}
                          className="text-amber-300 hover:underline"
                        >
                          End Season
                        </button>
                      )}
                      {season.status !== "archived" && (
                        <button
                          type="button"
                          onClick={() => void handleSeasonStatusChange(season, "archived")}
                          className="text-text-muted hover:underline"
                        >
                          Archive
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {section === "tournaments" && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-2xl font-black text-white">{editingTournament ? "Tournament Editor" : "Create Tournament"}</h2>
              <button type="button" onClick={handleImportBravoFeed} disabled={importingBravoFeed} className={btnPrimary}>
                {importingBravoFeed ? "Importing Feed..." : "Import Reference Day 1-3 Data"}
              </button>
            </div>
            <form onSubmit={handleTournamentSubmit} className="esports-card grid gap-4 p-6 sm:grid-cols-2">
              <input
                className={inputClass}
                aria-label="Title"
                placeholder="Title"
                value={tournamentForm.title ?? ""}
                onChange={(e) =>
                  setTournamentForm({
                    ...tournamentForm,
                    title: e.target.value,
                  })
                }
                required
              />
              <input
                className={inputClass}
                aria-label="Tier"
                placeholder="Tier"
                value={tournamentForm.tier ?? ""}
                onChange={(e) => setTournamentForm({ ...tournamentForm, tier: e.target.value })}
              />
              <select
                className={inputClass}
                aria-label="Tournament status"
                value={tournamentForm.status ?? "UPCOMING"}
                onChange={(e) =>
                  setTournamentForm({
                    ...tournamentForm,
                    status: e.target.value as TournamentStatus,
                  })
                }
              >
                {(["LIVE", "OPEN", "REGISTERING", "UPCOMING", "COMPLETED"] as const).map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <select
                className={inputClass}
                aria-label="Tournament season"
                value={tournamentForm.seasonId ?? activeSeason?.id ?? ""}
                onChange={(e) => {
                  const season = seasons.find((item) => item.id === e.target.value);
                  setTournamentForm({
                    ...tournamentForm,
                    seasonId: e.target.value || undefined,
                    seasonTitle: season?.seriesTitle ?? season?.title,
                    seasonNumber: season?.seasonNumber,
                  });
                }}
              >
                <option value="">No season</option>
                {seasons.map((season) => (
                  <option key={season.id} value={season.id}>
                    {season.seriesTitle ?? season.title}
                  </option>
                ))}
              </select>
              <input
                className={inputClass}
                aria-label="Prize Pool"
                placeholder="Prize Pool"
                value={tournamentForm.prizePool ?? ""}
                onChange={(e) =>
                  setTournamentForm({
                    ...tournamentForm,
                    prizePool: e.target.value,
                  })
                }
              />
              <input
                className={inputClass}
                type="number"
                aria-label="Max Teams"
                placeholder="Max Teams"
                value={tournamentForm.maxTeams ?? 32}
                onChange={(e) =>
                  setTournamentForm({
                    ...tournamentForm,
                    maxTeams: Number(e.target.value),
                  })
                }
              />
              <input
                className={inputClass}
                aria-label="Tournament start date"
                type="date"
                value={tournamentForm.startDate ?? ""}
                onChange={(e) =>
                  setTournamentForm({
                    ...tournamentForm,
                    startDate: e.target.value,
                  })
                }
              />
              <input
                className={inputClass}
                type="number"
                min={1}
                aria-label="Season Day Number"
                placeholder="Season Day Number"
                value={tournamentForm.seasonDayNumber ?? tournamentForm.dayNumber ?? ""}
                onChange={(e) =>
                  setTournamentForm({
                    ...tournamentForm,
                    seasonDayNumber: e.target.value ? Number(e.target.value) : undefined,
                    dayNumber: e.target.value ? Number(e.target.value) : undefined,
                  })
                }
              />
              <input
                className={`${inputClass} sm:col-span-2`}
                aria-label="Map rotation (comma separated)"
                placeholder="Map rotation (comma separated)"
                value={(tournamentForm.mapRotation ?? []).join(", ")}
                onChange={(e) =>
                  setTournamentForm({
                    ...tournamentForm,
                    mapRotation: e.target.value
                      .split(",")
                      .map((s) => s.trim())
                      .filter(Boolean),
                  })
                }
              />
              <textarea
                className={`${inputClass} sm:col-span-2`}
                aria-label="Rules"
                placeholder="Rules"
                rows={3}
                value={tournamentForm.rules ?? ""}
                onChange={(e) =>
                  setTournamentForm({
                    ...tournamentForm,
                    rules: e.target.value,
                  })
                }
              />
              <textarea
                className={`${inputClass} sm:col-span-2`}
                aria-label="Schedule"
                placeholder="Schedule"
                rows={2}
                value={tournamentForm.schedule ?? ""}
                onChange={(e) =>
                  setTournamentForm({
                    ...tournamentForm,
                    schedule: e.target.value,
                  })
                }
              />
              <textarea
                className={`${inputClass} sm:col-span-2`}
                aria-label="Description"
                placeholder="Description"
                rows={2}
                value={tournamentForm.description ?? ""}
                onChange={(e) =>
                  setTournamentForm({
                    ...tournamentForm,
                    description: e.target.value,
                  })
                }
              />
              <div className="sm:col-span-2">
                <FileUpload
                  type="tournament_banner"
                  entityId={editingTournament ?? tournamentForm.title ?? "new"}
                  label="Tournament Banner"
                  currentUrl={tournamentForm.bannerUrl}
                  onUploaded={(url) => setTournamentForm({ ...tournamentForm, bannerUrl: url })}
                />
              </div>
              <div className="sm:col-span-2">
                <p className="mb-2 text-xs font-semibold uppercase text-text-muted">Registered Teams</p>
                <div className="flex flex-wrap gap-2">
                  {teams.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => toggleTournamentTeam(t.id)}
                      className={`rounded-full px-3 py-1 text-xs ${(tournamentForm.registeredTeamIds ?? []).includes(t.id) ? "bg-accent-blue text-white" : "border border-white/10 text-text-muted"}`}
                    >
                      {t.name}
                    </button>
                  ))}
                </div>
              </div>
              <div className="sm:col-span-2 rounded-card border border-white/10 bg-bg-primary p-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="max-w-3xl">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-text-muted">PUBG Match Pull</p>
                    <p className="mt-2 text-sm text-slate-300">
                      Save the tournament, paste PUBG match IDs, then pull JSONs. The backend checks stored raw payloads first, fetches
                      missing matches from PUBG only when needed, saves raw JSON, normalizes teams and players, auto-assigns match numbers,
                      and prepares standings for publish.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleTournamentMatchPull}
                    disabled={
                      !editingTournament ||
                      normalizeMatchIds(tournamentImportMatchIds).length === 0 ||
                      !tournamentForm.seasonId ||
                      !Number.isFinite(tournamentForm.seasonDayNumber ?? tournamentForm.dayNumber)
                    }
                    className={btnPrimary}
                  >
                    Pull Match JSONs
                  </button>
                </div>
                <textarea
                  className={`${inputClass} mt-4`}
                  rows={5}
                  value={tournamentImportMatchIds}
                  onChange={(e) => setTournamentImportMatchIds(e.target.value)}
                  aria-label="Paste one PUBG match ID per line or comma-separated."
                  placeholder="Paste one PUBG match ID per line or comma-separated."
                />
                <div className="mt-3 grid gap-3 text-xs text-slate-300 sm:grid-cols-3">
                  <div className="rounded-card border border-white/10 bg-slate-950/50 p-3">
                    <p className="uppercase tracking-[0.14em] text-text-muted">Match IDs Ready</p>
                    <p className="mt-2 font-mono-stat text-lg text-white">{normalizeMatchIds(tournamentImportMatchIds).length}</p>
                  </div>
                  <div className="rounded-card border border-white/10 bg-slate-950/50 p-3">
                    <p className="uppercase tracking-[0.14em] text-text-muted">Tournament Day</p>
                    <p className="mt-2 font-semibold text-white">
                      {tournamentForm.seasonId
                        ? `Day ${tournamentForm.seasonDayNumber ?? tournamentForm.dayNumber ?? "not set"}`
                        : "Season not set"}
                    </p>
                  </div>
                  <div className="rounded-card border border-white/10 bg-slate-950/50 p-3">
                    <p className="uppercase tracking-[0.14em] text-text-muted">Import Target</p>
                    <p className="mt-2 font-semibold text-white">
                      {editingTournament ? "Tournament standings + published day" : "Save tournament first"}
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex gap-3 sm:col-span-2">
                <button type="submit" className={btnPrimary}>
                  {editingTournament ? "Update" : "Create"} Tournament
                </button>
                {editingTournament && (
                  <button
                    type="button"
                    onClick={resetTournamentEditor}
                    className="rounded-full border border-white/10 px-5 py-2.5 text-sm text-slate-300"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
            <div className="esports-card overflow-hidden">
              <div className="table-scroll" tabIndex={0}>
                <table className="min-w-full text-left text-sm">
                  <caption className="sr-only">Tournaments available for administration</caption>
                  <thead className="border-b border-white/10 bg-slate-950/80 text-slate-400">
                    <tr>
                      <th scope="col" className="px-4 py-3">
                        Tournament
                      </th>
                      <th scope="col" className="px-4 py-3">
                        Status
                      </th>
                      <th scope="col" className="px-4 py-3">
                        Teams
                      </th>
                      <th scope="col" className="px-4 py-3">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {tournaments.map((t) => (
                      <tr key={t.id} className="border-b border-white/5">
                        <td className="px-4 py-3 font-semibold text-white">{t.title}</td>
                        <td className="px-4 py-3">
                          <StatusBadge status={t.status} />
                        </td>
                        <td className="px-4 py-3 text-slate-300">
                          {t.teamCount}/{t.maxTeams}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-3">
                            <button
                              type="button"
                              aria-label={`Open editor for ${t.title}`}
                              onClick={() => openTournamentEditor(t)}
                              className="text-bravoBlue hover:underline"
                            >
                              Open Tournament Editor
                            </button>
                            <button
                              type="button"
                              aria-label={`Delete ${t.title}`}
                              onClick={async () => {
                                await adminFetch(`/api/tournaments/${t.id}`, {
                                  method: "DELETE",
                                });
                                loadData();
                              }}
                              className="text-bravoRed hover:underline"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
        {section === "teams" && (
          <div className="space-y-6">
            {canManageCanonicalTeams ? (
              <>
                <BulkTeamLogoUpload teams={teams} onComplete={loadData} />
                <h2 className="text-2xl font-black text-white">{editingTeam ? "Edit Team" : "Add Team"}</h2>
                <form onSubmit={handleTeamSubmit} className="esports-card grid gap-4 p-6 sm:grid-cols-2">
                  <input
                    className={inputClass}
                    aria-label="Team Name"
                    placeholder="Team Name"
                    value={teamForm.name ?? ""}
                    onChange={(e) => setTeamForm({ ...teamForm, name: e.target.value })}
                    required
                  />
                  <input
                    className={inputClass}
                    aria-label="Tag"
                    placeholder="Tag"
                    value={teamForm.tag ?? ""}
                    onChange={(e) => setTeamForm({ ...teamForm, tag: e.target.value })}
                  />
                  <input
                    className={inputClass}
                    aria-label="Region"
                    placeholder="Region"
                    value={teamForm.country ?? ""}
                    onChange={(e) => setTeamForm({ ...teamForm, country: e.target.value })}
                  />
                  <input
                    className={inputClass}
                    type="number"
                    aria-label="Slot Number"
                    placeholder="Slot Number"
                    value={teamForm.slotNumber ?? ""}
                    onChange={(e) =>
                      setTeamForm({
                        ...teamForm,
                        slotNumber: e.target.value ? Number(e.target.value) : undefined,
                      })
                    }
                  />
                  <select
                    className={inputClass}
                    aria-label="Official team status"
                    value={teamForm.status ?? "active"}
                    onChange={(e) =>
                      setTeamForm({
                        ...teamForm,
                        status: e.target.value as Team["status"],
                      })
                    }
                  >
                    <option value="active">Active</option>
                    <option value="pending">Pending</option>
                    <option value="inactive">Inactive</option>
                  </select>
                  <div className="sm:col-span-2">
                    {editingTeam ? (
                      <FileUpload
                        type="team_logo"
                        entityId={editingTeam}
                        label="Team Logo"
                        currentUrl={teamForm.logoUrl ?? teamForm.logo}
                        onUploaded={(url) => setTeamForm({ ...teamForm, logoUrl: url })}
                      />
                    ) : (
                      <div className="rounded-card border border-white/10 bg-bg-primary p-4 text-sm text-text-muted">
                        Create the official team first, then upload its logo to the team’s versioned asset path.
                      </div>
                    )}
                  </div>
                  <p className="sm:col-span-2 text-xs text-text-muted">
                    This editor persists only the official team identity, region, slot, status, and approved logo. Registration contacts and
                    captain access are managed from Registrations and Registered Teams; match statistics come from published PUBG imports.
                  </p>
                  <div className="flex gap-3 sm:col-span-2">
                    <button type="submit" className={btnPrimary}>
                      {editingTeam ? "Update" : "Create"} Team
                    </button>
                    {editingTeam && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingTeam(null);
                          setTeamForm({
                            status: "active",
                          });
                        }}
                        className="rounded-full border border-white/10 px-5 py-2.5 text-sm text-slate-300"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </form>
              </>
            ) : (
              <div className="esports-card p-5 text-sm text-text-muted">
                Team records are read-only for your role. A protected admin must approve identity, logo, and archive changes.
              </div>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              {teams.map((team) => (
                <div key={team.id} className="esports-card p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3">
                      {team.logoUrl || team.logo ? (
                        <Image
                          src={team.logoUrl ?? team.logo ?? ""}
                          alt={team.name}
                          width={56}
                          height={56}
                          loading="lazy"
                          decoding="async"
                          className="h-14 w-14 rounded-xl border border-white/10 object-cover"
                        />
                      ) : (
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-dashed border-white/15 text-[10px] uppercase text-text-muted">
                          No Logo
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="font-semibold text-white">
                          {team.name} {team.tag && <span className="text-accent-blue">[{team.tag}]</span>}
                        </p>
                        <p className="text-sm text-slate-400">
                          {team.country ?? "—"} · Official status: {team.status ?? "—"}
                        </p>
                        <p className="mt-1 text-xs text-text-muted">
                          Slot #{team.slotNumber ?? "—"} · Rank #{team.rank ?? "—"} · {team.totalPoints ?? 0} pts · {team.matches ?? 0}{" "}
                          matches
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingTeam(team.id);
                          setTeamForm(team);
                          setSelectedTeamId(team.id);
                          handleSectionChange("players");
                        }}
                        className="text-bravoBlue text-sm hover:underline"
                      >
                        Players
                      </button>
                      {canManageCanonicalTeams ? (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingTeam(team.id);
                              setTeamForm(team);
                            }}
                            className="text-bravoBlue text-sm hover:underline"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => void archiveAdminTeam(team.id)}
                            className="text-bravoRed text-sm hover:underline"
                          >
                            Archive
                          </button>
                        </>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {section === "players" && (
          <div className="space-y-6">
            <h2 className="text-2xl font-black text-white">{editingPlayer ? "Edit Player" : "Add Player"}</h2>
            {selectedTeamId && (
              <p className="text-sm text-accent-blue">Managing players for: {teams.find((t) => t.id === selectedTeamId)?.name}</p>
            )}
            <form onSubmit={handlePlayerSubmit} className="esports-card grid gap-4 p-6 sm:grid-cols-2">
              <input
                className={inputClass}
                aria-label="Real Name"
                placeholder="Real Name"
                value={playerForm.realName ?? ""}
                onChange={(e) => setPlayerForm({ ...playerForm, realName: e.target.value })}
              />
              <input
                className={inputClass}
                aria-label="In-Game Name"
                placeholder="In-Game Name"
                value={playerForm.inGameName ?? playerForm.name ?? ""}
                onChange={(e) =>
                  setPlayerForm({
                    ...playerForm,
                    inGameName: e.target.value,
                    name: e.target.value,
                  })
                }
                required
              />
              <input
                className={inputClass}
                aria-label="PUBG ID"
                placeholder="PUBG ID"
                value={playerForm.pubgId ?? ""}
                onChange={(e) => setPlayerForm({ ...playerForm, pubgId: e.target.value })}
              />
              <select
                className={inputClass}
                aria-label="Player role"
                value={playerForm.role ?? ""}
                onChange={(e) =>
                  setPlayerForm({
                    ...playerForm,
                    role: e.target.value as PlayerRole,
                  })
                }
              >
                <option value="">Role</option>
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
              <select
                className={inputClass}
                aria-label="Player team"
                value={playerForm.teamId ?? selectedTeamId ?? ""}
                onChange={(e) => {
                  const team = teams.find((t) => t.id === e.target.value);
                  setPlayerForm({
                    ...playerForm,
                    teamId: e.target.value,
                    teamName: team?.name,
                  });
                }}
              >
                <option value="">Select Team</option>
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
              <select
                className={inputClass}
                aria-label="Player status"
                value={playerForm.playerStatus ?? "active"}
                onChange={(e) =>
                  setPlayerForm({
                    ...playerForm,
                    playerStatus: e.target.value as PlayerStatus,
                  })
                }
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
              <input
                className={inputClass}
                aria-label="Discord"
                placeholder="Discord"
                value={playerForm.discord ?? ""}
                onChange={(e) => setPlayerForm({ ...playerForm, discord: e.target.value })}
              />
              <input
                className={inputClass}
                aria-label="Phone / Email"
                placeholder="Phone / Email"
                value={playerForm.phone ?? playerForm.email ?? ""}
                onChange={(e) =>
                  setPlayerForm({
                    ...playerForm,
                    phone: e.target.value,
                    email: e.target.value,
                  })
                }
              />
              <input
                className={inputClass}
                aria-label="Nationality"
                placeholder="Nationality"
                value={playerForm.nationality ?? ""}
                onChange={(e) => setPlayerForm({ ...playerForm, nationality: e.target.value })}
              />
              <div className="sm:col-span-2">
                <FileUpload
                  type="player_avatar"
                  entityId={editingPlayer ?? playerForm.inGameName ?? "new"}
                  label="Profile Picture"
                  currentUrl={playerForm.avatarUrl ?? playerForm.avatar}
                  onUploaded={(url) => setPlayerForm({ ...playerForm, avatarUrl: url })}
                />
              </div>
              <div className="flex gap-3 sm:col-span-2">
                <button type="submit" className={btnPrimary}>
                  {editingPlayer ? "Update" : "Create"} Player
                </button>
                {editingPlayer && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingPlayer(null);
                      setPlayerForm({
                        kills: 0,
                        damage: 0,
                        mvpCount: 0,
                        chickenDinners: 0,
                        matches: 0,
                        playerStatus: "active",
                      });
                    }}
                    className="rounded-full border border-white/10 px-5 py-2.5 text-sm text-slate-300"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
            <div className="esports-card overflow-hidden">
              <div className="table-scroll" tabIndex={0}>
                <table className="min-w-full text-left text-sm">
                  <caption className="sr-only">Players available for administration</caption>
                  <thead className="border-b border-white/10 text-slate-400">
                    <tr>
                      <th scope="col" className="px-4 py-3">
                        Player
                      </th>
                      <th scope="col" className="px-4 py-3">
                        Team
                      </th>
                      <th scope="col" className="px-4 py-3">
                        Role
                      </th>
                      <th scope="col" className="px-4 py-3">
                        Kills
                      </th>
                      <th scope="col" className="px-4 py-3">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {(selectedTeamId ? teamPlayers : players).map((p) => (
                      <tr key={p.id} className="border-b border-white/5">
                        <td className="px-4 py-3 font-semibold text-white">{p.inGameName ?? p.name}</td>
                        <td className="px-4 py-3 text-slate-300">{p.teamName ?? "-"}</td>
                        <td className="px-4 py-3 text-slate-300">{p.role ?? "-"}</td>
                        <td className="px-4 py-3 text-slate-300">{p.kills}</td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-3">
                            <button
                              type="button"
                              aria-label={`Edit ${p.inGameName ?? p.name}`}
                              onClick={() => {
                                setEditingPlayer(p.id);
                                setPlayerForm(p);
                              }}
                              className="text-bravoBlue hover:underline"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              aria-label={`Delete ${p.inGameName ?? p.name}`}
                              onClick={async () => {
                                await adminFetch(`/api/players/${p.id}`, {
                                  method: "DELETE",
                                });
                                loadData();
                              }}
                              className="text-bravoRed hover:underline"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {section === "scrims" && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-2xl font-black text-white">Day Manager</h2>
                <p className="mt-1 text-sm text-text-muted">
                  Daily workflow: create the next day, import PUBG matches, verify them, then approve and publish.
                </p>
              </div>
              <button
                type="button"
                onClick={() => void handleCreateNextDay(activeSeason)}
                disabled={creatingNextDay || !activeSeason}
                className={btnPrimary}
              >
                {creatingNextDay ? "Creating Day..." : `Create New Day (${(activeSeason?.currentDay ?? 0) + 1})`}
              </button>
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
              {activeSeasonTournaments.length === 0 ? (
                <div className="esports-card p-6 text-sm text-text-muted xl:col-span-2">
                  Create a season and then create the first day to start the tournament workflow.
                </div>
              ) : (
                activeSeasonTournaments.map((tournament) => {
                  const linkedScrim =
                    activeSeasonScrims.find((scrim) => scrim.tournamentId === tournament.id) ??
                    activeSeasonScrims.find((scrim) => scrim.seasonDayNumber === (tournament.seasonDayNumber ?? tournament.dayNumber));
                  const dayNumber = tournament.seasonDayNumber ?? tournament.dayNumber ?? "-";

                  return (
                    <div key={tournament.id} className="esports-card p-5">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent-blue">Day {dayNumber}</p>
                          <p className="mt-2 font-semibold text-white">{tournament.title}</p>
                          <p className="mt-1 text-sm text-text-muted">
                            {linkedScrim?.date ?? tournament.startDate} | {linkedScrim?.map ?? "Map pending"} |{" "}
                            {linkedScrim?.lobbyTime ?? "8:00 PM NPT"}
                          </p>
                        </div>
                        <StatusBadge status={tournament.status} />
                      </div>
                      <div className="mt-4 grid gap-3 sm:grid-cols-3">
                        <div className="rounded-card border border-white/10 bg-bg-primary p-3">
                          <p className="text-xs uppercase tracking-[0.14em] text-text-muted">Match IDs</p>
                          <p className="mt-2 font-mono-stat text-white">{getScrimMatchIds(linkedScrim).length}</p>
                        </div>
                        <div className="rounded-card border border-white/10 bg-bg-primary p-3">
                          <p className="text-xs uppercase tracking-[0.14em] text-text-muted">Teams</p>
                          <p className="mt-2 font-mono-stat text-white">{linkedScrim?.teamIds?.length ?? 0}</p>
                        </div>
                        <div className="rounded-card border border-white/10 bg-bg-primary p-3">
                          <p className="text-xs uppercase tracking-[0.14em] text-text-muted">Import Status</p>
                          <p className="mt-2 text-sm font-semibold text-white">
                            {linkedScrim?.status === "waiting_for_data"
                              ? "Waiting for match imports"
                              : (linkedScrim?.status ?? "Not created")}
                          </p>
                        </div>
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setMatchId(formatScrimMatchIds(linkedScrim));
                            setImportScrimId(linkedScrim?.id ?? "");
                            setImportTournamentId(tournament.id);
                            handleSectionChange("pubg");
                          }}
                          className="btn-secondary !text-[11px]"
                        >
                          Open Import Workflow
                        </button>
                        {linkedScrim && (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingScrim(linkedScrim.id);
                              setScrimForm({
                                ...linkedScrim,
                                pubgMatchIds: getScrimMatchIds(linkedScrim),
                                pubgMatchId: getScrimMatchIds(linkedScrim)[0],
                              });
                            }}
                            className="text-bravoBlue text-sm hover:underline"
                          >
                            Edit Day
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <h3 className="text-xl font-black text-white">{editingScrim ? "Edit Day Record" : "Manual Day Record"}</h3>
            <form onSubmit={handleScrimSubmit} className="esports-card grid gap-4 p-6 sm:grid-cols-2">
              <input
                className={inputClass}
                aria-label="Title"
                placeholder="Title"
                value={scrimForm.title ?? ""}
                onChange={(e) => setScrimForm({ ...scrimForm, title: e.target.value })}
                required
              />
              <input
                className={inputClass}
                aria-label="Scrim date"
                type="date"
                value={scrimForm.date ?? ""}
                onChange={(e) => setScrimForm({ ...scrimForm, date: e.target.value })}
                required
              />
              <select
                className={inputClass}
                aria-label="Scrim season"
                value={scrimForm.seasonId ?? activeSeason?.id ?? ""}
                onChange={(e) => {
                  const season = seasons.find((item) => item.id === e.target.value);
                  setScrimForm({
                    ...scrimForm,
                    seasonId: e.target.value || undefined,
                    seasonTitle: season?.seriesTitle ?? season?.title,
                  });
                }}
              >
                <option value="">No season</option>
                {seasons.map((season) => (
                  <option key={season.id} value={season.id}>
                    {season.seriesTitle ?? season.title}
                  </option>
                ))}
              </select>
              <input
                className={inputClass}
                aria-label="Map"
                placeholder="Map"
                value={scrimForm.map ?? ""}
                onChange={(e) => setScrimForm({ ...scrimForm, map: e.target.value })}
                required
              />
              <input
                className={inputClass}
                aria-label="Lobby Time"
                placeholder="Lobby Time"
                value={scrimForm.lobbyTime ?? ""}
                onChange={(e) => setScrimForm({ ...scrimForm, lobbyTime: e.target.value })}
              />
              <input
                className={inputClass}
                aria-label="Room ID"
                placeholder="Room ID"
                value={scrimForm.roomId ?? ""}
                onChange={(e) => setScrimForm({ ...scrimForm, roomId: e.target.value })}
              />
              <input
                className={inputClass}
                aria-label="Room Password"
                placeholder="Room Password"
                value={scrimForm.roomPassword ?? ""}
                onChange={(e) => setScrimForm({ ...scrimForm, roomPassword: e.target.value })}
              />
              <input
                className={inputClass}
                type="number"
                min={1}
                aria-label="Season Day Number"
                placeholder="Season Day Number"
                value={scrimForm.seasonDayNumber ?? ""}
                onChange={(e) =>
                  setScrimForm({
                    ...scrimForm,
                    seasonDayNumber: e.target.value ? Number(e.target.value) : undefined,
                  })
                }
              />
              <select
                className={inputClass}
                aria-label="Scrim status"
                value={scrimForm.status ?? "scheduled"}
                onChange={(e) =>
                  setScrimForm({
                    ...scrimForm,
                    status: e.target.value as ScrimStatus,
                  })
                }
              >
                {(["scheduled", "live", "completed", "waiting_for_data"] as const).map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <select
                className={inputClass}
                aria-label="Linked tournament"
                value={scrimForm.tournamentId ?? ""}
                onChange={(e) =>
                  setScrimForm({
                    ...scrimForm,
                    tournamentId: e.target.value || undefined,
                  })
                }
              >
                <option value="">Linked tournament (optional)</option>
                {tournaments.map((tournament) => (
                  <option key={tournament.id} value={tournament.id}>
                    {tournament.title}
                  </option>
                ))}
              </select>
              <textarea
                className={`${inputClass} sm:col-span-2`}
                aria-label="PUBG Match IDs (one per line or comma separated)"
                placeholder="PUBG Match IDs (one per line or comma separated)"
                rows={3}
                value={formatScrimMatchIds(scrimForm)}
                onChange={(e) => {
                  const pubgMatchIds = normalizeMatchIds(e.target.value);
                  setScrimForm({
                    ...scrimForm,
                    pubgMatchIds,
                    pubgMatchId: pubgMatchIds[0],
                  });
                }}
              />
              <input
                className={`${inputClass} sm:col-span-2`}
                aria-label="Map rotation (comma separated)"
                placeholder="Map rotation (comma separated)"
                value={(scrimForm.mapRotation ?? []).join(", ")}
                onChange={(e) =>
                  setScrimForm({
                    ...scrimForm,
                    mapRotation: e.target.value
                      .split(",")
                      .map((s) => s.trim())
                      .filter(Boolean),
                  })
                }
              />
              <textarea
                className={`${inputClass} sm:col-span-2`}
                aria-label="Announcement"
                placeholder="Announcement"
                rows={2}
                value={scrimForm.announcement ?? ""}
                onChange={(e) => setScrimForm({ ...scrimForm, announcement: e.target.value })}
              />
              <label className="flex items-center gap-3 rounded-card border border-white/10 px-4 py-3 text-sm text-white sm:col-span-2">
                <input
                  type="checkbox"
                  checked={scrimForm.published === true}
                  onChange={(event) => setScrimForm({ ...scrimForm, published: event.target.checked })}
                />
                Publish this scrim schedule and its verified results on the public website
              </label>
              <div className="sm:col-span-2">
                <p className="mb-2 text-xs font-semibold uppercase text-text-muted">Assigned Teams</p>
                <div className="flex flex-wrap gap-2">
                  {teams.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => toggleScrimTeam(t.id)}
                      className={`rounded-full px-3 py-1 text-xs ${(scrimForm.teamIds ?? []).includes(t.id) ? "bg-accent-green text-black" : "border border-white/10 text-text-muted"}`}
                    >
                      {t.name}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-3 sm:col-span-2">
                <button type="submit" className={btnPrimary}>
                  {editingScrim ? "Update" : "Create"} Scrim
                </button>
                {editingScrim && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingScrim(null);
                      setScrimForm({
                        ...defaultScrimForm,
                        seasonId: activeSeason?.id,
                        seasonTitle: activeSeason?.seriesTitle ?? activeSeason?.title,
                      });
                    }}
                    className="rounded-full border border-white/10 px-5 py-2.5 text-sm text-slate-300"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
            <div className="space-y-3">
              {scrims.map((s) => (
                <div key={s.id} className="esports-card flex flex-wrap items-center justify-between gap-4 p-5">
                  <div>
                    <p className="font-semibold text-white">{s.title}</p>
                    <p className="text-sm text-text-muted">
                      {s.date} - {s.map} - {s.lobbyTime}
                    </p>
                    <p className="text-xs text-text-muted">
                      Room: {s.roomId ?? "-"} - Match IDs: {getScrimMatchIds(s).join(", ") || "-"}
                    </p>
                    <span className="mt-2 inline-block rounded-full bg-white/5 px-2 py-0.5 text-[10px] uppercase text-accent-blue">
                      {s.status}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    {getScrimMatchIds(s).length > 0 && (
                      <button
                        type="button"
                        onClick={async () => {
                          setMatchId(formatScrimMatchIds(s));
                          setImportScrimId(s.id);
                          setImportTournamentId(s.tournamentId ?? "");
                          handleSectionChange("pubg");
                        }}
                        className="btn-secondary !text-[11px]"
                      >
                        Import Data
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setEditingScrim(s.id);
                        setScrimForm({
                          ...s,
                          pubgMatchIds: getScrimMatchIds(s),
                          pubgMatchId: getScrimMatchIds(s)[0],
                        });
                      }}
                      className="text-bravoBlue text-sm hover:underline"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        await adminFetch(`/api/admin/scrims?id=${s.id}`, {
                          method: "DELETE",
                        });
                        loadData();
                      }}
                      className="text-bravoRed text-sm hover:underline"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {section === "pendingImports" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-black text-white">{focusImportBatchId ? "Import Review" : "Pending Imports"}</h2>
              <p className="mt-1 text-sm text-text-muted">
                {focusImportBatchId
                  ? "Review this saved PUBG batch, approve it when ready, and publish standings from the same screen."
                  : "Reviewed PUBG match batches stay here until you approve and publish them."}
              </p>
            </div>
            {focusImportBatchId && focusedImportBatch && focusedImportBatch.status !== "pending" ? (
              <div className="esports-card space-y-4 p-6">
                <p className="text-sm text-text-muted">
                  This batch is already <span className="font-semibold text-white">{focusedImportBatch.status}</span>. Open the audit
                  history below to inspect the final result.
                </p>
                <button type="button" onClick={() => handleSectionChange("approvedImports")} className="btn-secondary w-fit">
                  Open Approved Imports
                </button>
              </div>
            ) : visiblePendingImportBatches.length === 0 ? (
              <div className="esports-card p-8 text-center text-text-muted">
                {focusImportBatchId
                  ? "This pending import review link no longer points to an active pending batch."
                  : "No pending imports right now. Save a reviewed preview from the PUBG import workflow to see it here."}
              </div>
            ) : (
              <div className="space-y-4">
                {visiblePendingImportBatches.map((batch) => (
                  <div key={batch.id} className="esports-card p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent-blue">
                          Day {batch.seasonDayNumber ?? "-"} Pending Review
                        </p>
                        <p className="mt-2 font-semibold text-white">
                          {batch.dayTitle ?? batch.scrimTitle ?? batch.tournamentTitle ?? "Pending PUBG Import"}
                        </p>
                        <p className="mt-1 text-sm text-text-muted">
                          {batch.dayDate ?? "Date pending"} | {batch.dayMap ?? "Map pending"} | {batch.previews?.length ?? 0} match
                          {(batch.previews?.length ?? 0) === 1 ? "" : "es"}
                        </p>
                      </div>
                      <span className="rounded-full border border-accent-yellow/30 bg-accent-yellow/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-accent-yellow">
                        Pending
                      </span>
                    </div>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                      {(batch.previews ?? []).map((preview) => (
                        <div key={`${batch.id}-${preview.sourceMatchId}`} className="rounded-card border border-white/10 bg-bg-primary p-3">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-xs uppercase tracking-[0.14em] text-text-muted">Match {preview.matchNumber ?? "-"}</p>
                              <p className="mt-2 font-mono text-xs text-white">{preview.matchId}</p>
                              <p className="mt-1 text-sm text-text-muted">{preview.map ?? preview.summary.mapName ?? "Map pending"}</p>
                              <p className="mt-1 text-xs text-text-muted">
                                {preview.matchDate ?? "Date pending"} {preview.matchTime ?? ""}
                              </p>
                            </div>
                            <div className="text-right text-xs text-text-muted">
                              <p>{preview.teamResults.length} teams</p>
                              <p>{preview.playerResults.length} players</p>
                            </div>
                          </div>

                          {preview.teamResults.length > 0 && (
                            <div className="mt-3 table-scroll" tabIndex={0}>
                              <table className="data-table min-w-full text-xs">
                                <caption className="sr-only">
                                  Team import preview for match {preview.matchNumber ?? preview.matchId}
                                </caption>
                                <thead>
                                  <tr>
                                    <th scope="col">Slot</th>
                                    <th scope="col">Team</th>
                                    <th scope="col">Place</th>
                                    <th scope="col">K</th>
                                    <th scope="col">Pts</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {preview.teamResults.slice(0, 6).map((teamResult) => (
                                    <tr key={`${preview.matchId}-${teamResult.teamName}`}>
                                      <td>{teamResult.slotNumber ? `#${teamResult.slotNumber}` : "-"}</td>
                                      <td>{teamResult.teamName}</td>
                                      <td>#{teamResult.placement}</td>
                                      <td>{teamResult.kills}</td>
                                      <td>{teamResult.totalPoints}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}

                          {preview.playerResults.length > 0 && (
                            <div className="mt-3 table-scroll" tabIndex={0}>
                              <table className="data-table min-w-full text-xs">
                                <caption className="sr-only">
                                  Player import preview for match {preview.matchNumber ?? preview.matchId}
                                </caption>
                                <thead>
                                  <tr>
                                    <th scope="col">Player</th>
                                    <th scope="col">Team</th>
                                    <th scope="col">K</th>
                                    <th scope="col">Dmg</th>
                                    <th scope="col">A</th>
                                    <th scope="col">Pts</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {preview.playerResults.slice(0, 8).map((playerResult) => (
                                    <tr key={`${preview.matchId}-${playerResult.pubgPlayerId ?? playerResult.playerName}`}>
                                      <td>{playerResult.playerName}</td>
                                      <td>{playerResult.teamName}</td>
                                      <td>{playerResult.kills}</td>
                                      <td>{playerResult.damage}</td>
                                      <td>{playerResult.assists}</td>
                                      <td>{playerResult.totalPoints}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}

                          {preview.conflicts?.length > 0 && (
                            <div className="mt-3 rounded-card border border-accent-yellow/25 bg-accent-yellow/10 px-3 py-2 text-xs text-white">
                              {preview.conflicts.length} player-team mismatch
                              {preview.conflicts.length === 1 ? "" : "es"} detected
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {!focusImportBatchId && (
                        <Link href={`/admin/matches/${batch.id}/review`} className="btn-secondary !text-[11px]">
                          Open Review Route
                        </Link>
                      )}
                      <button
                        type="button"
                        onClick={() => void handleImportBatchAction(batch.id, "approve")}
                        disabled={processingImportBatchId === batch.id}
                        className={btnPrimary}
                      >
                        {processingImportBatchId === batch.id ? "Importing..." : "Approve & Import Draft"}
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleImportBatchAction(batch.id, "reject")}
                        disabled={processingImportBatchId === batch.id}
                        className="btn-secondary"
                      >
                        Reject
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setMatchId((batch.matchIds ?? []).join("\n"));
                          setImportTournamentId(batch.tournamentId ?? "");
                          setImportScrimId(batch.scrimId ?? "");
                          handleSectionChange("pubg");
                        }}
                        className="text-bravoBlue text-sm hover:underline"
                      >
                        Open In Importer
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDeleteImportBatch(batch.id)}
                        disabled={processingImportBatchId === batch.id}
                        className="text-bravoRed text-sm hover:underline"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {section === "approvedImports" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-black text-white">Approved Imports</h2>
              <p className="mt-1 text-sm text-text-muted">Approved and rejected PUBG import batches stay here as the admin audit trail.</p>
            </div>
            {processedImportBatches.length === 0 ? (
              <div className="esports-card p-8 text-center text-text-muted">No approved or rejected import batches yet.</div>
            ) : (
              <div className="space-y-4">
                {processedImportBatches.map((batch) => (
                  <div key={batch.id} className="esports-card p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent-blue">
                          Day {batch.seasonDayNumber ?? "-"} Import History
                        </p>
                        <p className="mt-2 font-semibold text-white">
                          {batch.dayTitle ?? batch.scrimTitle ?? batch.tournamentTitle ?? "PUBG Import Batch"}
                        </p>
                        <p className="mt-1 text-sm text-text-muted">
                          {batch.previews?.length ?? 0} match
                          {(batch.previews?.length ?? 0) === 1 ? "" : "es"} |{" "}
                          {batch.approvedAt
                            ? `Published ${formatDisplayDateTime(batch.approvedAt)}`
                            : batch.rejectedAt
                              ? `Rejected ${formatDisplayDateTime(batch.rejectedAt)}`
                              : "Awaiting timestamp"}
                        </p>
                      </div>
                      <span
                        className={`rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] ${
                          batch.status === "approved"
                            ? "border-accent-green/30 bg-accent-green/10 text-accent-green"
                            : "border-accent-red/30 bg-accent-red/10 text-accent-red"
                        }`}
                      >
                        {batch.status}
                      </span>
                    </div>
                    <div className="mt-4 grid gap-3 sm:grid-cols-3">
                      <div className="rounded-card border border-white/10 bg-bg-primary p-3">
                        <p className="text-xs uppercase tracking-[0.14em] text-text-muted">Match Count</p>
                        <p className="mt-2 font-mono-stat text-white">{batch.matchIds?.length ?? 0}</p>
                      </div>
                      <div className="rounded-card border border-white/10 bg-bg-primary p-3">
                        <p className="text-xs uppercase tracking-[0.14em] text-text-muted">Imported</p>
                        <p className="mt-2 font-mono-stat text-white">{batch.importResult?.importedCount ?? 0}</p>
                      </div>
                      <div className="rounded-card border border-white/10 bg-bg-primary p-3">
                        <p className="text-xs uppercase tracking-[0.14em] text-text-muted">Failed</p>
                        <p className="mt-2 font-mono-stat text-white">{batch.importResult?.failedCount ?? 0}</p>
                      </div>
                    </div>
                    {batch.rejectedReason && <p className="mt-4 text-sm text-text-muted">Rejected reason: {batch.rejectedReason}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {section === "matches" && (
          <div className="space-y-6">
            <h2 className="text-2xl font-black text-white">Statistics</h2>
            <p className="text-sm text-text-muted">Live published match results and the current overall team leaderboard.</p>
            {leaderboardRows.length > 0 && (
              <div className="esports-card overflow-hidden">
                <div className="border-b border-white/10 px-5 py-4">
                  <p className="font-semibold text-white">Overall Leaderboard</p>
                </div>
                <div className="table-scroll" tabIndex={0}>
                  <table className="data-table min-w-full">
                    <caption className="sr-only">Overall team leaderboard for published matches</caption>
                    <thead>
                      <tr>
                        <th scope="col">#</th>
                        <th scope="col">Slot</th>
                        <th scope="col">Team</th>
                        <th scope="col">M</th>
                        <th scope="col">K</th>
                        <th scope="col">Place Pts</th>
                        <th scope="col">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {leaderboardRows.map((team) => (
                        <tr key={team.id}>
                          <td className="font-mono-stat text-accent-blue">#{team.rank}</td>
                          <td>{team.slotNumber ? `#${team.slotNumber}` : "-"}</td>
                          <td className="font-semibold">{team.name}</td>
                          <td>{team.matches}</td>
                          <td>{team.kills}</td>
                          <td>{team.placementPoints ?? 0}</td>
                          <td className="points-cell">{team.totalPoints}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            {liveMatches.length === 0 ? (
              <div className="esports-card p-8 text-center text-text-muted">Match data will appear once results are published.</div>
            ) : (
              <div className="esports-card overflow-hidden">
                <div className="table-scroll" tabIndex={0}>
                  <table className="data-table min-w-full">
                    <caption className="sr-only">Published live match statistics</caption>
                    <thead>
                      <tr>
                        <th scope="col">Match ID</th>
                        <th scope="col">Map</th>
                        <th scope="col">Winner</th>
                        <th scope="col">Points</th>
                        <th scope="col">KOs</th>
                        <th scope="col">Synced</th>
                      </tr>
                    </thead>
                    <tbody>
                      {liveMatches.map((m) => (
                        <tr key={m.id}>
                          <td className="font-mono text-xs">{m.pubgMatchId}</td>
                          <td>{m.map}</td>
                          <td className="font-semibold">{m.winner}</td>
                          <td className="points-cell">{m.points}</td>
                          <td>{m.knockouts}</td>
                          <td className="text-text-muted">{m.syncedAt ? formatDisplayDateTime(m.syncedAt) : "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {section === "leaderboard" && (
          <div className="space-y-6">
            <h2 className="text-2xl font-black text-white">Points Table</h2>
            <p className="text-sm text-text-muted">Rankings auto-update when live PUBG match data is imported.</p>
            {leaderboardRows.length === 0 ? (
              <div className="esports-card p-8 text-center text-text-muted">Results will be published after admin approval.</div>
            ) : (
              <div className="esports-card overflow-hidden">
                <div className="table-scroll" tabIndex={0}>
                  <table className="data-table min-w-full">
                    <caption className="sr-only">Current points table for published match results</caption>
                    <thead>
                      <tr>
                        <th scope="col">#</th>
                        <th scope="col">Team</th>
                        <th scope="col">M</th>
                        <th scope="col">K</th>
                        <th scope="col">Place Pts</th>
                        <th scope="col">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {leaderboardRows.map((t) => (
                        <tr key={t.id}>
                          <td className="font-mono-stat text-accent-blue">#{t.rank}</td>
                          <td className="font-semibold">{t.name}</td>
                          <td>{t.matches}</td>
                          <td>{t.kills}</td>
                          <td>{t.placementPoints ?? 0}</td>
                          <td className="points-cell">{t.totalPoints}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {section === "registrations" && (
          <div className="space-y-6">
            <h2 className="text-2xl font-black text-white">Team Registrations</h2>
            {registrations.length === 0 ? (
              <div className="esports-card p-8 text-center text-slate-400">No registrations yet.</div>
            ) : (
              <div className="space-y-4">
                {registrations.map((r) => (
                  <div key={r.id} className="esports-card p-5">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="flex min-w-0 items-start gap-4">
                        {r.logoUrl ? (
                          <Image
                            src={r.logoUrl}
                            alt={`${r.teamName} logo`}
                            width={64}
                            height={64}
                            className="h-16 w-16 rounded-2xl border border-white/10 object-cover"
                          />
                        ) : (
                          <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-dashed border-white/15 text-[10px] uppercase tracking-[0.14em] text-text-muted">
                            No Logo
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="font-semibold text-white">{r.teamName}</p>
                          <p className="mt-1 text-sm text-slate-400">Captain: {r.captainName}</p>
                          <p className="text-sm text-slate-400">Discord: {r.captainDiscord}</p>
                          <p className="mt-2 text-xs uppercase tracking-[0.14em] text-text-muted">
                            Submitted {formatDisplayDateTime(r.createdAt)}
                          </p>
                          {r.playerNames.length > 0 ? (
                            <p className="mt-2 text-sm text-slate-300">Roster: {r.playerNames.join(", ")}</p>
                          ) : null}
                          {r.tournamentId ? (
                            <p className="mt-1 text-sm text-slate-300">Tournament: {r.tournamentTitle ?? "Published event linked"}</p>
                          ) : null}
                          {r.approvedTeamId ? <p className="mt-1 text-sm text-accent-green">Published team: {r.approvedTeamId}</p> : null}
                          <span
                            className={`mt-3 inline-block rounded-full px-3 py-1 text-xs uppercase ${
                              r.status === "pending"
                                ? "bg-amber-500/20 text-amber-300"
                                : r.status === "approved"
                                  ? "bg-bravoGreen/20 text-bravoGreen"
                                  : "bg-bravoRed/20 text-bravoRed"
                            }`}
                          >
                            {r.status}
                          </span>
                        </div>
                      </div>

                      {r.status === "pending" && (
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => void handleRegistrationStatusChange(r.id, "approved")}
                            disabled={registrationActionId === r.id}
                            className={btnPrimary}
                          >
                            {registrationActionId === r.id ? "Processing..." : "Approve"}
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleRegistrationStatusChange(r.id, "rejected")}
                            disabled={registrationActionId === r.id}
                            className={btnDanger}
                          >
                            Reject
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {section === "announcements" && (
          <div className="space-y-6">
            <h2 className="text-2xl font-black text-white">Announcements</h2>
            <form onSubmit={handleAnnouncementSubmit} className="esports-card grid gap-4 p-6">
              <input
                className={inputClass}
                aria-label="Title"
                placeholder="Title"
                value={announcementForm.title ?? ""}
                onChange={(e) =>
                  setAnnouncementForm({
                    ...announcementForm,
                    title: e.target.value,
                  })
                }
                required
              />
              <textarea
                className={inputClass}
                aria-label="Detail"
                placeholder="Detail"
                rows={3}
                value={announcementForm.detail ?? ""}
                onChange={(e) =>
                  setAnnouncementForm({
                    ...announcementForm,
                    detail: e.target.value,
                  })
                }
                required
              />
              <button type="submit" className={`${btnPrimary} w-fit`}>
                Publish
              </button>
            </form>
            <div className="space-y-3">
              {announcements.map((a) => (
                <div key={a.id} className="esports-card flex items-center justify-between p-5">
                  <div>
                    <p className="font-semibold text-white">{a.title}</p>
                    <p className="text-sm text-slate-400">{a.date}</p>
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      await adminFetch(`/api/announcements?id=${a.id}`, {
                        method: "DELETE",
                      });
                      loadData();
                    }}
                    className={btnDanger}
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {section === "pubg" && (
          <PubgImportManager
            seasons={seasons}
            tournaments={tournaments}
            scrims={scrims}
            activeSeasonId={activeSeason?.id}
            initialMatchIds={matchId}
            initialTournamentId={importTournamentId}
            initialScrimId={importScrimId}
            autoPreviewRequestKey={importAutoPreviewKey}
            onImported={loadData}
          />
        )}

        {section === "matchManager" && <AdminMatchManager tournaments={tournaments} scrims={scrims} onChanged={loadData} />}

        {section === "settings" && (
          <div className="space-y-6">
            <h2 className="text-2xl font-black text-white">Settings</h2>
            <div className="esports-card space-y-4 p-6">
              <p className="font-semibold text-white">Data Backend Status</p>
              <p className="text-sm text-slate-400">
                {stats?.dataConnected
                  ? `Connected - ${stats?.dataBackend ?? "configured"} data backend active`
                  : "Not configured - add the Supabase environment variables and run the schema SQL first."}
              </p>
            </div>
            <div className="esports-card space-y-4 p-6">
              <p className="font-semibold text-white">Recent Error Logs</p>
              {errorLogs.length === 0 ? (
                <p className="text-sm text-slate-400">No recent server errors logged.</p>
              ) : (
                <div className="space-y-3">
                  {errorLogs.map((log) => (
                    <div key={log.id} className="rounded-card border border-white/10 bg-bg-primary p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="text-sm font-semibold text-white">{log.scope}</p>
                        <p className="text-xs text-text-muted">{formatDisplayDateTime(log.createdAt)}</p>
                      </div>
                      <p className="mt-2 text-sm text-slate-300">{log.message}</p>
                      {log.pathname && (
                        <p className="mt-1 text-xs text-text-muted">
                          {log.method ?? "REQUEST"} {log.pathname}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="esports-card space-y-4 p-6">
              <p className="font-semibold text-white">Reset Competition Data</p>
              <p className="text-sm text-slate-400">
                Clears imported seasons, tournaments, scrims, teams, players, standings, match history, and cached PUBG import records.
                Announcements, registrations, and uploaded media stay untouched.
              </p>
              <button
                type="button"
                onClick={resetCompetitionData}
                disabled={!stats?.dataConnected || resettingData}
                className={`${btnDanger} disabled:cursor-not-allowed disabled:opacity-60`}
              >
                {resettingData ? "Resetting..." : "Reset Imported Data"}
              </button>
            </div>
            <div className="esports-card space-y-4 p-6">
              <p className="font-semibold text-white">Auto-Sync Cron</p>
              <p className="text-sm text-slate-400">
                Configure Vercel Cron to GET /api/cron/sync-matches with Authorization: Bearer CRON_SECRET
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
