import Link from "next/link";
import TeamAvatar from "@/components/ui/TeamAvatar";
import type { PubgHubDataset } from "@/lib/pubg-hub";
import type {
  PlatformArticle,
  PlatformEvent,
  PlatformGame,
  PlatformHubData,
  PlatformMediaItem,
  PlatformMatch,
  PlatformOrganization,
  PlatformSponsorProfile,
} from "@/lib/platform-hub";
import { buildInitials } from "@/lib/public-content";
import { BRAVO_DISCORD_URL, BRAVO_INSTAGRAM_URL } from "@/lib/brand-links";
import { getSiteUrl } from "@/lib/site";
import {
  buildHref,
  EmptyState,
  formatDate,
  formatDateRange,
  formatDateTime,
  formatNumber,
  MetricCard,
  PageHero,
  SectionHeader,
  TrendBars,
} from "@/components/pubg/PubgHubUI";

type SearchParamDictionary = Record<string, string | string[] | undefined>;

function readSearchParam(value: string | string[] | undefined, fallback = "") {
  if (Array.isArray(value)) {
    return value[0] ?? fallback;
  }

  return value ?? fallback;
}

function joinClasses(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

function formatContentDate(value: string) {
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

type BreadcrumbItem = {
  label: string;
  href?: string;
};

function formatUpdatedTimestamp(value?: string) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Kathmandu",
  }).format(parsed);
}

function buildAbsoluteUrl(path: string) {
  return new URL(path, getSiteUrl()).toString();
}

function HeroActionLink({
  href,
  label,
  className,
}: {
  href: string;
  label: string;
  className: string;
}) {
  if (href.startsWith("http")) {
    return (
      <a href={href} target="_blank" rel="noreferrer" className={className}>
        {label}
      </a>
    );
  }

  return (
    <Link href={href} className={className}>
      {label}
    </Link>
  );
}

function DetailBreadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-text-muted">
      {items.map((item, index) => (
        <div key={`${item.label}-${index}`} className="flex items-center gap-2">
          {item.href ? (
            <Link href={item.href} className="transition hover:text-white">
              {item.label}
            </Link>
          ) : (
            <span className="text-white">{item.label}</span>
          )}
          {index < items.length - 1 ? <span className="text-white/30">/</span> : null}
        </div>
      ))}
    </nav>
  );
}

function DetailTrustBar({
  items,
  title,
  path,
  updatedAt,
}: {
  items: BreadcrumbItem[];
  title: string;
  path: string;
  updatedAt?: string;
}) {
  const absoluteUrl = buildAbsoluteUrl(path);
  const updatedLabel = formatUpdatedTimestamp(updatedAt);
  const shareText = `${title} | Bravo Gaming Esports`;

  return (
    <section className="rounded-card border border-white/[0.08] bg-bg-card px-5 py-4">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="space-y-2">
          <DetailBreadcrumbs items={items} />
          {updatedLabel ? (
            <p className="text-xs text-text-muted">
              Last updated {updatedLabel}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(absoluteUrl)}`}
            target="_blank"
            rel="noreferrer"
            className="btn-secondary !px-3 !py-2 !text-[11px]"
          >
            Share on X
          </a>
          <a
            href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(absoluteUrl)}`}
            target="_blank"
            rel="noreferrer"
            className="btn-secondary !px-3 !py-2 !text-[11px]"
          >
            Share on Facebook
          </a>
          <a
            href={`https://wa.me/?text=${encodeURIComponent(`${shareText} ${absoluteUrl}`)}`}
            target="_blank"
            rel="noreferrer"
            className="btn-secondary !px-3 !py-2 !text-[11px]"
          >
            Share on WhatsApp
          </a>
        </div>
      </div>
    </section>
  );
}

function PlatformStatusPill({
  status,
}: {
  status: PlatformEvent["status"] | PlatformMatch["status"];
}) {
  const className =
    status === "live"
      ? "border-accent-red/30 bg-accent-red/10 text-accent-red"
      : status === "completed"
        ? "border-accent-green/30 bg-accent-green/10 text-accent-green"
        : status === "planned"
          ? "border-accent-yellow/30 bg-accent-yellow/10 text-accent-yellow"
          : "border-accent-blue/30 bg-accent-blue/10 text-accent-blue";

  const label =
    status === "live"
      ? "Live"
      : status === "completed"
        ? "Completed"
        : status === "planned"
          ? "Planned"
          : "Upcoming";

  return <span className={joinClasses("inline-flex items-center rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em]", className)}>{label}</span>;
}

function ContentStatePill({ state }: { state: PlatformEvent["state"] }) {
  const className =
    state === "published"
      ? "border-accent-green/30 bg-accent-green/10 text-accent-green"
      : state === "planned"
        ? "border-accent-yellow/30 bg-accent-yellow/10 text-accent-yellow"
        : "border-white/10 bg-white/5 text-text-muted";

  const label = state === "published" ? "Published" : state === "planned" ? "Planned" : "Draft";

  return <span className={joinClasses("inline-flex items-center rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em]", className)}>{label}</span>;
}

function GameStatusPill({ status }: { status: PlatformGame["status"] }) {
  const className =
    status === "flagship"
      ? "border-accent-green/30 bg-accent-green/10 text-accent-green"
      : status === "active"
        ? "border-accent-blue/30 bg-accent-blue/10 text-accent-blue"
        : status === "building"
          ? "border-accent-yellow/30 bg-accent-yellow/10 text-accent-yellow"
          : "border-white/10 bg-white/5 text-text-muted";

  const label =
    status === "flagship"
      ? "Flagship"
      : status === "active"
        ? "Active"
        : status === "building"
          ? "Building"
          : "Planned";

  return <span className={joinClasses("inline-flex items-center rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em]", className)}>{label}</span>;
}

function CategoryPill({ label }: { label: string }) {
  return <span className="rounded-full border border-white/10 bg-bg-primary px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-text-muted">{label}</span>;
}

function formatGameSlugLabel(value: string) {
  if (value === "pubg-pc") {
    return "PUBG PC";
  }

  return value
    .split(/[-_]/g)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function NewsCard({ article }: { article: PlatformArticle }) {
  return (
    <Link href={`/news/${article.slug}`} className="block rounded-card border border-white/[0.08] bg-bg-card p-5 transition hover:border-accent-blue/30 hover:bg-bg-hover">
      {article.imageUrl ? (
        <div className="mb-4 overflow-hidden rounded-card border border-white/[0.08]">
          <img src={article.imageUrl} alt={article.title} className="h-44 w-full object-cover" />
        </div>
      ) : null}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <CategoryPill label={article.category} />
        <p className="text-xs uppercase tracking-[0.16em] text-text-muted">{formatContentDate(article.date)}</p>
      </div>
      <h3 className="mt-4 font-display text-xl font-black uppercase text-white">{article.title}</h3>
      <p className="mt-3 text-sm leading-relaxed text-text-muted">{article.summary}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {article.tags.slice(0, 3).map((tag) => (
          <span key={tag} className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-text-muted">
            {tag}
          </span>
        ))}
      </div>
    </Link>
  );
}

function EventCard({ event }: { event: PlatformEvent }) {
  const showPrize = Boolean(event.prizePool && event.prizePool !== "TBD");
  const eventTypeClass = /tournament|cup|championship|league|final/i.test(event.type)
    ? "border-accent-yellow/30 bg-accent-yellow/10 text-accent-yellow"
    : "border-accent-blue/30 bg-accent-blue/10 text-accent-blue-light";

  return (
    <Link href={`/events/${event.slug}`} className="flex h-full flex-col rounded-card border border-white/[0.08] bg-bg-card p-5 transition hover:border-accent-blue/30 hover:bg-bg-hover">
      <div className="mb-4 overflow-hidden rounded-card border border-white/[0.08] bg-bg-primary">
        {event.bannerUrl ? (
          <img src={event.bannerUrl} alt={event.name} className="h-36 w-full object-cover" />
        ) : (
          <div className="h-36 bg-[radial-gradient(circle_at_top_left,rgba(47,152,255,0.2),transparent_30%),linear-gradient(180deg,rgba(16,24,43,0.96),rgba(8,14,28,0.96))]" />
        )}
      </div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-accent-blue">{event.gameName}</p>
          <h3 className="mt-2 font-display text-lg font-black uppercase text-white">{event.name}</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className={joinClasses("inline-flex items-center rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em]", eventTypeClass)}>
            {event.type}
          </span>
          <PlatformStatusPill status={event.status} />
        </div>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div>
          <p className="text-[10px] uppercase tracking-[0.16em] text-text-muted">Date</p>
          <p className="mt-1 text-sm text-white">{formatDateRange(event.startDate, event.endDate)}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-[0.16em] text-text-muted">Teams</p>
          <p className="mt-1 font-mono-stat text-white">{formatNumber(event.teamsCount)}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-[0.16em] text-text-muted">Matches</p>
          <p className="mt-1 font-mono-stat text-white">{formatNumber(event.matchesCount)}</p>
        </div>
        {showPrize ? (
          <div>
            <p className="text-[10px] uppercase tracking-[0.16em] text-text-muted">Prize Pool</p>
            <p className="mt-1 text-sm text-white">{event.prizePool}</p>
          </div>
        ) : null}
      </div>
      <div className="mt-auto flex flex-wrap gap-2 pt-5">
        <span className="btn-primary">View Details</span>
      </div>
    </Link>
  );
}

function MatchCard({ match }: { match: PlatformMatch }) {
  const href = match.gameSlug === "pubg-pc" ? `/pubg/matches/${match.id}` : `/matches/${match.id}`;

  return (
    <Link href={href} className="block rounded-card border border-white/[0.08] bg-bg-card p-5 transition hover:border-accent-blue/30 hover:bg-bg-hover">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-accent-blue">{match.gameName}</p>
          <h3 className="mt-2 font-display text-lg font-black uppercase text-white">
            {match.teamA} vs {match.teamB}
          </h3>
        </div>
        <PlatformStatusPill status={match.status} />
      </div>
      <p className="mt-3 text-sm text-text-muted">{match.eventName} | {match.stageLabel}</p>
      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-[10px] uppercase tracking-[0.16em] text-text-muted">Format</p>
          <p className="mt-1 text-white">{match.format}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-[0.16em] text-text-muted">Map / Pool</p>
          <p className="mt-1 text-white">{match.mapLabel}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-[0.16em] text-text-muted">Schedule</p>
          <p className="mt-1 text-white">{formatDateTime(match.scheduledAt)}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-[0.16em] text-text-muted">Viewer Count</p>
          <p className="mt-1 text-white">{match.viewerCount ?? "Audience TBA"}</p>
        </div>
      </div>
    </Link>
  );
}

function GameCard({ game }: { game: PlatformGame }) {
  return (
    <Link href={game.primaryHref} className="block rounded-card border border-white/[0.08] bg-bg-card p-5 transition hover:border-accent-blue/30 hover:bg-bg-hover">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-accent-blue">{game.heroLabel}</p>
          <h3 className="mt-2 font-display text-xl font-black uppercase text-white">{game.name}</h3>
        </div>
        <GameStatusPill status={game.status} />
      </div>
      <p className="mt-4 text-sm text-text-muted">{game.summary}</p>
      <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-card border border-white/[0.08] bg-bg-primary p-3">
          <p className="text-[10px] uppercase tracking-[0.16em] text-text-muted">Events</p>
          <p className="mt-1 font-mono-stat text-white">{formatNumber(game.activeEvents)}</p>
        </div>
        <div className="rounded-card border border-white/[0.08] bg-bg-primary p-3">
          <p className="text-[10px] uppercase tracking-[0.16em] text-text-muted">Matches</p>
          <p className="mt-1 font-mono-stat text-white">{formatNumber(game.trackedMatches)}</p>
        </div>
        <div className="rounded-card border border-white/[0.08] bg-bg-primary p-3">
          <p className="text-[10px] uppercase tracking-[0.16em] text-text-muted">Teams</p>
          <p className="mt-1 font-mono-stat text-white">{formatNumber(game.trackedTeams)}</p>
        </div>
        <div className="rounded-card border border-white/[0.08] bg-bg-primary p-3">
          <p className="text-[10px] uppercase tracking-[0.16em] text-text-muted">Players</p>
          <p className="mt-1 font-mono-stat text-white">{formatNumber(game.trackedPlayers)}</p>
        </div>
      </div>
      <p className="mt-4 text-xs uppercase tracking-[0.16em] text-text-muted">{game.completionLabel}</p>
    </Link>
  );
}

function sponsorKindLabel(kind: PlatformSponsorProfile["kind"]) {
  return kind === "design" ? "Design" : kind === "sponsor" ? "Sponsor" : "Partner";
}

function sponsorPrimaryAsset(sponsor: PlatformSponsorProfile) {
  return sponsor.bannerUrl ?? sponsor.designAssetUrl ?? sponsor.logoUrl ?? null;
}

function SponsorCard({ sponsor }: { sponsor: PlatformSponsorProfile }) {
  const primaryAsset = sponsorPrimaryAsset(sponsor);
  const initials = buildInitials(sponsor.name);

  return (
    <article className="flex h-full flex-col rounded-card border border-white/[0.08] bg-bg-card p-5 transition hover:border-accent-blue/30 hover:bg-bg-hover">
      <div className="mb-4 overflow-hidden rounded-card border border-white/[0.08] bg-bg-primary">
        {primaryAsset ? (
          <img src={primaryAsset} alt={sponsor.name} className="h-40 w-full object-cover" />
        ) : (
          <div className="flex h-40 items-center justify-center bg-[radial-gradient(circle_at_top_left,rgba(47,152,255,0.18),transparent_30%),linear-gradient(180deg,rgba(16,24,43,0.96),rgba(8,14,28,0.96))] font-display text-4xl font-black uppercase tracking-[0.14em] text-white">
            {initials}
          </div>
        )}
      </div>
      <div className="flex items-center gap-4">
        {sponsor.logoUrl ? (
          <img src={sponsor.logoUrl} alt={sponsor.name} className="h-16 w-16 rounded-card border border-white/10 bg-bg-primary object-contain p-2" />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-card border border-white/10 bg-bg-primary font-display text-lg font-black uppercase text-white">
            {initials}
          </div>
        )}
        <div>
          <div className="flex flex-wrap gap-2">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-accent-blue">{sponsor.tier}</p>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-text-muted">{sponsorKindLabel(sponsor.kind)}</p>
          </div>
          <h3 className="mt-2 font-display text-xl font-black uppercase text-white">{sponsor.name}</h3>
        </div>
      </div>
      <p className="mt-4 text-sm text-text-muted">{sponsor.description}</p>
      {sponsor.supportedEvents.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {sponsor.supportedEvents.slice(0, 2).map((eventName) => (
            <CategoryPill key={eventName} label={eventName} />
          ))}
        </div>
      ) : null}
      <div className="mt-auto flex flex-wrap gap-2 pt-5">
        {sponsor.websiteUrl ? (
          <a href={sponsor.websiteUrl} target="_blank" rel="noreferrer" className="btn-primary">
            Website
          </a>
        ) : null}
        <Link href={`/sponsors/${sponsor.slug}`} className="btn-secondary">
          View Profile
        </Link>
      </div>
    </article>
  );
}

function OrganizationCard({ organization }: { organization: PlatformOrganization }) {
  return (
    <Link href={`/organizations/${organization.slug}`} className="block rounded-card border border-white/[0.08] bg-bg-card p-5 transition hover:border-accent-blue/30 hover:bg-bg-hover">
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-accent-blue">{organization.type}</p>
      <h3 className="mt-2 font-display text-xl font-black uppercase text-white">{organization.name}</h3>
      <p className="mt-4 text-sm text-text-muted">{organization.summary}</p>
      <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-card border border-white/[0.08] bg-bg-primary p-3">
          <p className="text-[10px] uppercase tracking-[0.16em] text-text-muted">Events Hosted</p>
          <p className="mt-1 font-mono-stat text-white">{formatNumber(organization.eventsHosted)}</p>
        </div>
        <div className="rounded-card border border-white/[0.08] bg-bg-primary p-3">
          <p className="text-[10px] uppercase tracking-[0.16em] text-text-muted">Prize Pools</p>
          <p className="mt-1 text-white">{organization.prizePools}</p>
        </div>
      </div>
    </Link>
  );
}

function buildTopTeamCards(pubg: PubgHubDataset) {
  return pubg.teams.slice(0, 5).map((team) => ({
    id: team.id,
    slug: team.slug,
    name: team.name,
    logoUrl: team.logoUrl ?? undefined,
    points: team.totalPoints,
    kills: team.kills,
    form: team.formLabel,
    trend: team.recentPoints,
  }));
}

function buildTopPlayerCards(pubg: PubgHubDataset) {
  return pubg.players.slice(0, 5).map((player) => ({
    id: player.id,
    slug: player.slug,
    name: player.pubgName,
    avatarUrl: player.avatarUrl ?? undefined,
    teamName: player.currentTeamName ?? "Team TBD",
    kills: player.kills,
    damage: player.damage,
    form: player.formLabel,
    trend: player.recentTrend,
  }));
}

function resolveFeaturedTeamCards(pubg: PubgHubDataset, featuredTeamIds: string[]) {
  const defaultCards = buildTopTeamCards(pubg);
  if (featuredTeamIds.length === 0) {
    return defaultCards;
  }

  const teamById = new Map(defaultCards.map((team) => [team.id, team]));
  const orderedTeams = featuredTeamIds.map((teamId) => teamById.get(teamId) ?? null).filter((team): team is NonNullable<typeof defaultCards[number]> => Boolean(team));

  return orderedTeams.length > 0 ? orderedTeams : defaultCards;
}

function resolveFeaturedPlayerCards(pubg: PubgHubDataset, featuredPlayerIds: string[]) {
  const defaultCards = buildTopPlayerCards(pubg);
  if (featuredPlayerIds.length === 0) {
    return defaultCards;
  }

  const playerById = new Map(defaultCards.map((player) => [player.id, player]));
  const orderedPlayers = featuredPlayerIds
    .map((playerId) => playerById.get(playerId) ?? null)
    .filter((player): player is NonNullable<typeof defaultCards[number]> => Boolean(player));

  return orderedPlayers.length > 0 ? orderedPlayers : defaultCards;
}

export function PlatformHomePage({
  hub,
  pubg,
}: {
  hub: PlatformHubData;
  pubg: PubgHubDataset;
}) {
  const liveTournament = hub.events.find((event) => event.status === "live") ?? null;
  const featuredTournament = liveTournament ?? hub.home.featuredEvents[0] ?? hub.events[0] ?? null;
  const homepageSponsors = hub.home.featuredSponsors.length > 0 ? hub.home.featuredSponsors : hub.sponsors.filter((sponsor) => sponsor.showOnHomepage);
  const primaryHeroSlide = hub.home.heroSlides[0] ?? null;
  const topTeams = resolveFeaturedTeamCards(pubg, hub.home.featuredTeamIds);
  const topPlayers = resolveFeaturedPlayerCards(pubg, hub.home.featuredPlayerIds);
  const spotlightMatches =
    (hub.home.liveMatches.length > 0 ? hub.home.liveMatches : hub.home.upcomingMatches.length > 0 ? hub.home.upcomingMatches : hub.home.recentMatches).slice(0, 4);
  const heroHeadline = primaryHeroSlide?.title ?? "Nepal's esports home for live standings, teams, players, and results";
  const heroSummary =
    primaryHeroSlide?.description ??
    "Bravo Gaming Esports keeps PUBG results, leaderboards, teams, players, media, sponsors, and event coverage connected in one public platform.";
  const homeStandings = topTeams.slice(0, 5);
  const featuredPlayer = topPlayers[0] ?? null;
  const registerForScrimsHref = featuredTournament ? `/teams/register?tournament=${featuredTournament.id}` : "/teams/register";
  const communityCount = new Set(pubg.teams.map((team) => team.region).filter(Boolean)).size;
  const liveEventCount = hub.events.filter((event) => event.status === "live").length;
  const platformPulse = [
    { label: "Tracked Teams", value: pubg.teams.length, detail: "Verified public profiles with roster, form, and event history.", tone: "green" as const },
    { label: "Tracked Players", value: pubg.players.length, detail: "Fraggers, IGLs, support players, and rising talent in one hub.", tone: "blue" as const },
    { label: "Tracked Matches", value: pubg.matches.length, detail: "Real match cards, standings, and player output powering the flagship section.", tone: "yellow" as const },
    { label: "Communities Active", value: communityCount, detail: "Kathmandu, Pokhara, Chitwan, and more scenes represented in the hub.", tone: "red" as const },
    { label: "Published News", value: hub.news.length, detail: "Editorial coverage makes the platform feel alive beyond tournament operations.", tone: "blue" as const },
    { label: "Sponsors Live", value: hub.sponsors.filter((sponsor) => sponsor.showOnSponsorsPage).length, detail: "Commercial partners now have dedicated public surface area and campaign value.", tone: "green" as const },
  ];

  return (
    <main className="page-shell pb-12 pt-6">
      <div className="page-stack">
        <section className="relative overflow-hidden rounded-[38px] border border-white/[0.08] bg-[linear-gradient(135deg,rgba(8,12,20,0.98),rgba(7,12,22,0.92))] p-6 shadow-[0_40px_120px_rgba(0,0,0,0.4)] sm:p-8 xl:p-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_16%,rgba(0,198,255,0.2),transparent_28%),radial-gradient(circle_at_88%_18%,rgba(255,82,47,0.16),transparent_26%),radial-gradient(circle_at_80%_82%,rgba(0,230,118,0.14),transparent_28%)]" />
          <div className="relative grid gap-6 xl:grid-cols-[1.1fr,0.9fr]">
            <div className="min-w-0 space-y-6">
              <div className="max-w-4xl">
                <span className="brand-badge">{primaryHeroSlide?.badge ?? "Bravo Gaming Esports"}</span>
                <h1 className="mt-5 max-w-4xl font-display text-[38px] font-black uppercase leading-[0.92] text-white sm:text-5xl xl:text-6xl">
                  {heroHeadline}
                </h1>
                <p className="mt-5 max-w-3xl text-sm leading-7 text-slate-300 sm:text-base sm:leading-8">
                  {heroSummary}
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link href="/pubg/leaderboards" className="btn-primary">
                  View Leaderboards
                </Link>
                <Link href="/pubg/results" className="btn-secondary">
                  Latest Results
                </Link>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <MetricCard label="Active Events" value={liveEventCount} tone="red" compact />
                <MetricCard label="Matches Tracked" value={pubg.matches.length} tone="green" compact />
                <MetricCard label="Teams" value={pubg.teams.length} tone="blue" compact />
                <MetricCard label="Players" value={pubg.players.length} tone="yellow" compact />
              </div>

              {featuredTournament ? (
                <div className="rounded-[30px] border border-white/[0.08] bg-black/30 p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="section-title">Featured Event</p>
                      <h2 className="mt-2 font-display text-2xl font-black uppercase text-white sm:text-3xl">{featuredTournament.name}</h2>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <PlatformStatusPill status={featuredTournament.status} />
                      <ContentStatePill state={featuredTournament.state} />
                      <CategoryPill label={featuredTournament.gameName} />
                    </div>
                  </div>
                  <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-300">{featuredTournament.summary}</p>
                  <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <MetricCard label="Teams" value={featuredTournament.teamsCount} compact tone="blue" />
                    <MetricCard label="Matches" value={featuredTournament.matchesCount} compact tone="green" />
                    <MetricCard label="Region" value={featuredTournament.region} compact tone="yellow" />
                    <MetricCard label="Prize" value={featuredTournament.prizePool} compact tone="red" />
                  </div>
                  <div className="mt-5 flex flex-wrap gap-3">
                    <Link href={`/events/${featuredTournament.slug}`} className="btn-secondary">
                      Open Event
                    </Link>
                    <Link href="/pubg" className="btn-primary">
                      Open PUBG Hub
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="rounded-[30px] border border-white/[0.08] bg-black/30 p-5">
                  <EmptyState title="No upcoming tournaments" description="There are currently no upcoming tournaments. New events will be announced soon." />
                </div>
              )}
            </div>

            <div className="min-w-0 space-y-4">
              <div className="rounded-[30px] border border-white/[0.08] bg-black/25 p-5">
                <div className="flex items-end justify-between gap-3">
                  <div>
                    <p className="section-title">Live Standings</p>
                    <h2 className="mt-2 font-display text-2xl font-black uppercase text-white">Current top teams</h2>
                  </div>
                  <Link href="/pubg/leaderboards" className="text-xs font-bold uppercase tracking-[0.18em] text-accent-blue transition hover:text-white">
                    Full board
                  </Link>
                </div>
                {homeStandings.length > 0 ? (
                  <div className="mt-4 space-y-3">
                    {homeStandings.map((team, index) => (
                      <Link
                        key={team.id}
                        href={`/pubg/teams/${team.slug ?? team.id}`}
                        className="flex min-w-0 items-center gap-3 rounded-[22px] border border-white/[0.08] bg-bg-primary/70 p-3 transition hover:border-accent-blue/30 hover:bg-bg-hover"
                      >
                        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 font-mono-stat text-xs text-white">
                          #{index + 1}
                        </span>
                        <TeamAvatar name={team.name} imageUrl={team.logoUrl} size="sm" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-display text-base font-black uppercase text-white">{team.name}</p>
                          <p className="truncate text-xs uppercase tracking-[0.16em] text-text-muted">{team.form}</p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="font-mono-stat text-accent-green">{formatNumber(team.points)} pts</p>
                          <p className="text-xs text-text-muted">{formatNumber(team.kills)} kills</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="mt-4">
                    <EmptyState title="Leaderboard data is not available yet" description="Leaderboard data will be available once matches have been completed and officially published." />
                  </div>
                )}
              </div>

              <div className="rounded-[30px] border border-white/[0.08] bg-black/25 p-5">
                <p className="section-title">Daily Scrims</p>
                <h2 className="mt-2 font-display text-2xl font-black uppercase text-white">Register for the next room</h2>
                <p className="mt-3 text-sm leading-7 text-slate-300">
                  Need a faster path into the next Bravo lobby? Register your team once, then use the public PUBG hub to track results, standings,
                  and player output as soon as they are published.
                </p>
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <MetricCard label="Upcoming Matches" value={hub.home.upcomingMatches.length} compact tone="yellow" />
                  <MetricCard
                    label="Top Fragger"
                    value={featuredPlayer?.name ?? "Pending"}
                    detail={featuredPlayer ? `${formatNumber(featuredPlayer.kills)} kills` : "Player stats will appear after results are published."}
                    compact
                    tone="blue"
                  />
                </div>
                <div className="mt-5 flex flex-wrap gap-3">
                  <Link href={registerForScrimsHref} className="btn-primary">
                    Register for Scrims
                  </Link>
                  <a href={BRAVO_DISCORD_URL} target="_blank" rel="noreferrer" className="btn-discord">
                    Join Discord
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.15fr,0.85fr]">
          <div className="esports-card p-6">
            <SectionHeader eyebrow="Live Now" title="Match center spotlight" description="Live streams, upcoming series, and recent results from across Bravo competitions." action={<a href={hub.home.liveFeature.href} target={hub.home.liveFeature.href.startsWith("http") ? "_blank" : undefined} rel="noreferrer" className="btn-watch-live">Watch Broadcast</a>} />
            <div className="mt-5 grid gap-3 md:grid-cols-3">
              <MetricCard label="Viewer Count" value={hub.home.liveFeature.viewers} compact />
              <MetricCard label="Live Matches" value={hub.home.liveMatches.length} compact tone="red" />
              <MetricCard label="Upcoming Matches" value={hub.home.upcomingMatches.length} compact tone="blue" />
            </div>
            <div className="mt-5 grid gap-3">
              {spotlightMatches.map((match) => (
                <Link
                  key={match.id}
                  href={match.gameSlug === "pubg-pc" ? `/pubg/matches/${match.id}` : `/matches/${match.id}`}
                  className="block rounded-card border border-white/[0.08] bg-bg-primary p-4 transition hover:border-accent-blue/30 hover:bg-bg-hover"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-white">
                        {match.teamA} vs {match.teamB}
                      </p>
                      <p className="text-sm text-text-muted">
                        {match.gameName} | {match.eventName} | {match.stageLabel}
                      </p>
                    </div>
                    <PlatformStatusPill status={match.status} />
                  </div>
                </Link>
              ))}
            </div>
          </div>

          <div className="esports-card p-6">
            <SectionHeader eyebrow="Featured Event" title={featuredTournament?.name ?? "Next Bravo event"} description={featuredTournament?.summary ?? "The next published event will headline this block automatically."} />
            {featuredTournament ? (
              <div className="mt-5 space-y-4">
                {featuredTournament.bannerUrl ? (
                  <div className="overflow-hidden rounded-card border border-white/[0.08]">
                    <img src={featuredTournament.bannerUrl} alt={featuredTournament.name} className="h-52 w-full object-cover" />
                  </div>
                ) : null}
                <div className="grid gap-3 sm:grid-cols-2">
                  <MetricCard label="Date" value={formatDateRange(featuredTournament.startDate, featuredTournament.endDate)} compact tone="yellow" />
                  <MetricCard label="Prize" value={featuredTournament.prizePool} compact tone="green" />
                  <MetricCard label="Teams" value={featuredTournament.teamsCount} compact tone="blue" />
                  <MetricCard label="Region" value={featuredTournament.region} compact tone="red" />
                </div>
                <div className="flex flex-wrap gap-2">
                  <PlatformStatusPill status={featuredTournament.status} />
                  <ContentStatePill state={featuredTournament.state} />
                  <CategoryPill label={featuredTournament.gameName} />
                  <CategoryPill label={featuredTournament.type} />
                </div>
                <div className="flex flex-wrap gap-3">
                  <Link href={`/events/${featuredTournament.slug}`} className="btn-primary">
                    Open Event
                  </Link>
                  <Link href="/calendar" className="btn-secondary">
                    Open Calendar
                  </Link>
                </div>
              </div>
            ) : (
              <div className="mt-5">
                <EmptyState title="No upcoming tournaments" description="There are currently no upcoming tournaments. New events will be announced soon." />
              </div>
            )}
          </div>
        </section>

        <section className="esports-card p-6">
          <SectionHeader eyebrow="Featured News" title="Stories, updates, and scene coverage" description="News is what makes the platform feel alive between match days, and it should be visible on the homepage." action={<Link href="/news" className="btn-secondary">Open News Hub</Link>} />
          <div className="mt-6 grid gap-4 xl:grid-cols-4">
            {hub.home.featuredNews.slice(0, 4).map((article) => (
              <NewsCard key={article.slug} article={article} />
            ))}
            {hub.home.featuredNews.length === 0 ? (
              <div className="xl:col-span-4">
                <EmptyState title="No articles have been published yet" description="Stay tuned for upcoming announcements and updates." />
              </div>
            ) : null}
          </div>
        </section>

        <section className="esports-card p-6">
          <SectionHeader eyebrow="Bravo Snapshot" title="The current Bravo ecosystem" description="Stories, competition, rankings, sponsors, and community momentum should all feel visible at a glance." />
          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {platformPulse.map((item) => (
              <MetricCard key={item.label} label={item.label} value={item.value} detail={item.detail} tone={item.tone} />
            ))}
          </div>
        </section>

        <section className="esports-card p-6">
          <SectionHeader eyebrow="Featured Events" title="Ongoing, upcoming, and recently finished competitions" description="Featured events across Bravo competitions, with PUBG as the flagship section." />
          <div className="mt-6 grid gap-4 xl:grid-cols-2">
            {hub.home.featuredEvents.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1fr,1fr]">
          <div className="esports-card p-6">
            <SectionHeader eyebrow="Rankings Preview" title="Featured teams and leaderboard pressure" description="Team logos, recent form, and current scoreboard pressure should be visible at a glance." />
            <div className="mt-5 space-y-3">
              {topTeams.map((team, index) => (
                <Link key={team.id} href={`/pubg/teams/${team.slug ?? team.id}`} className="block rounded-[26px] border border-white/[0.08] bg-bg-primary p-4 transition hover:border-accent-blue/30 hover:bg-bg-hover">
                  <div className="flex items-center gap-3">
                    <span className="inline-flex min-w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 px-2.5 py-1 font-mono-stat text-xs text-white">
                      #{index + 1}
                    </span>
                    <TeamAvatar name={team.name} imageUrl={team.logoUrl} size="lg" />
                    <div className="min-w-0">
                      <p className="font-display text-lg font-black uppercase text-white">{team.name}</p>
                      <p className="text-xs uppercase tracking-[0.16em] text-text-muted">{team.form}</p>
                    </div>
                    <div className="ml-auto text-right">
                      <p className="font-mono-stat text-accent-green">{formatNumber(team.points)} pts</p>
                      <p className="text-xs text-text-muted">{formatNumber(team.kills)} kills</p>
                    </div>
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <MetricCard label="Points" value={team.points} compact tone="green" />
                    <MetricCard label="Kills" value={team.kills} compact tone="blue" />
                    <MetricCard label="Form" value={team.form} compact tone="yellow" />
                  </div>
                  <div className="mt-4">
                    <TrendBars values={team.trend} tone="green" />
                  </div>
                </Link>
              ))}
            </div>
          </div>

          <div className="esports-card p-6">
            <SectionHeader eyebrow="Featured Player" title="Top fragger and player spotlight" description="Player presentation needs to feel like personalities and stars, not just rows in a stat table." />
            <div className="mt-5 space-y-3">
              {topPlayers.map((player, index) => (
                <Link key={player.id} href={`/pubg/players/${player.slug ?? player.id}`} className="block rounded-[26px] border border-white/[0.08] bg-bg-primary p-4 transition hover:border-accent-blue/30 hover:bg-bg-hover">
                  <div className="flex items-center gap-3">
                    <span className="inline-flex min-w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 px-2.5 py-1 font-mono-stat text-xs text-white">
                      #{index + 1}
                    </span>
                    <TeamAvatar name={player.name} imageUrl={player.avatarUrl} size="lg" />
                    <div className="min-w-0">
                      <p className="font-display text-lg font-black uppercase text-white">{player.name}</p>
                      <p className="text-xs uppercase tracking-[0.16em] text-text-muted">{player.teamName}</p>
                    </div>
                    <div className="ml-auto text-right">
                      <p className="font-mono-stat text-accent-blue">{formatNumber(player.kills)} K</p>
                      <p className="text-xs text-text-muted">{formatNumber(player.damage)} dmg</p>
                    </div>
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <MetricCard label="Kills" value={player.kills} compact tone="blue" />
                    <MetricCard label="Damage" value={player.damage} compact tone="green" />
                    <MetricCard label="Form" value={player.form} compact tone="yellow" />
                  </div>
                  <div className="mt-4">
                    <TrendBars values={player.trend} tone="blue" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1fr,1fr]">
          <div className="esports-card p-6">
            <SectionHeader eyebrow="Sponsor Showcase" title="Premium partner visibility" description="A premium esports homepage should surface sponsors, partners, and design collaborators as part of the ecosystem, not as an afterthought." />
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {homepageSponsors.map((sponsor) => (
                <SponsorCard key={sponsor.id} sponsor={sponsor} />
              ))}
              {homepageSponsors.length === 0 ? (
                <div className="sm:col-span-2">
                  <EmptyState title="No sponsors or partners announced yet" description="Our sponsors and partners will be featured here once officially announced." />
                </div>
              ) : null}
            </div>
          </div>

          <div className="esports-card p-6">
            <SectionHeader eyebrow="Game Hubs" title="One platform, many esports titles" description="PUBG leads today, with additional game hubs expanding over time." />
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {hub.home.featuredGames.slice(0, 4).map((game) => (
                <GameCard key={game.slug} game={game} />
              ))}
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1fr,1fr]">
          <div className="esports-card p-6">
            <SectionHeader eyebrow="Media / Highlights" title="Media and content distribution" description="Videos, highlights, posters, interviews, clips, and VODs all have a natural home in the platform media center." />
            <div className="mt-5 grid gap-3">
              {hub.home.featuredMedia.map((item) => (
                <div key={item.id} className="rounded-card border border-white/[0.08] bg-bg-primary p-4">
                  {item.imageUrl ? (
                    <div className="mb-4 overflow-hidden rounded-card border border-white/[0.08]">
                      <img src={item.imageUrl} alt={item.title} loading="lazy" className="h-36 w-full object-cover" />
                    </div>
                  ) : null}
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-accent-blue">{item.kind}</p>
                      <p className="mt-2 font-semibold text-white">{item.title}</p>
                    </div>
                    {item.duration ? <p className="font-mono-stat text-text-muted">{item.duration}</p> : null}
                  </div>
                  <p className="mt-3 text-sm text-text-muted">{item.summary}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Link href={`/media/${item.slug}`} className="btn-primary">
                      View Details
                    </Link>
                    {item.url ? (
                      <a href={item.url} target="_blank" rel="noreferrer" className="btn-secondary">
                        Open Media
                      </a>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="esports-card p-6">
            <SectionHeader eyebrow="Community" title="The public home of Nepal esports" description="Discord, rules, support, announcements, and ecosystem access are treated like core platform features, not side links." />
            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-2">
              {[
                { title: "Discord", detail: "Join Bravo's official community hub for scrims, event updates, and ecosystem chatter.", href: BRAVO_DISCORD_URL },
                { title: "Instagram", detail: "Follow official Bravo posters, clips, and platform updates.", href: BRAVO_INSTAGRAM_URL },
                { title: "Rules", detail: "Unified competition, conduct, and event rule references as the platform expands.", href: "/pubg/community" },
                { title: "Support", detail: "Help for players, teams, organizers, and sponsors.", href: "/contact" },
                { title: "Announcements", detail: "Official Bravo updates and announcements.", href: "/news" },
              ].map((item) => (
                <Link
                  key={item.title}
                  href={item.href}
                  className="rounded-card border border-white/[0.08] bg-bg-primary p-4 transition hover:border-accent-blue/30 hover:bg-bg-hover"
                  target={item.href.startsWith("http") ? "_blank" : undefined}
                  rel={item.href.startsWith("http") ? "noreferrer" : undefined}
                >
                  <p className="font-display text-sm font-black uppercase text-white">{item.title}</p>
                  <p className="mt-2 text-sm text-text-muted">{item.detail}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

export function PlatformNewsPage({
  hub,
  searchParams,
}: {
  hub: PlatformHubData;
  searchParams: SearchParamDictionary;
}) {
  const query = readSearchParam(searchParams.q).trim().toLowerCase();
  const category = readSearchParam(searchParams.category, "all");
  const categories = Array.from(new Set(hub.news.map((article) => article.category))).sort((firstValue, secondValue) => firstValue.localeCompare(secondValue));
  const articles = hub.news.filter((article) => {
    if (category !== "all" && article.category !== category) return false;
    if (query && !`${article.title} ${article.summary} ${article.tags.join(" ")}`.toLowerCase().includes(query)) return false;
    return true;
  });

  return (
    <main className="page-shell pb-12 pt-6">
      <div className="page-stack">
        <PageHero
          badge="News Platform"
          title={
            <>
              Editorial, breaking,
              <br />
              and platform updates
            </>
          }
          description="Browse categories, featured stories, and full article coverage in one news hub."
          actions={
            <>
              <Link href="/events" className="btn-secondary">
                Explore Events
              </Link>
              <Link href="/media" className="btn-primary">
                Media Center
              </Link>
            </>
          }
          stats={[
            { label: "Articles", value: hub.news.length, tone: "blue" },
            { label: "Featured", value: hub.news.filter((article) => article.featured).length, tone: "green" },
            { label: "Categories", value: categories.length, tone: "yellow" },
            { label: "Breaking", value: hub.news.filter((article) => article.breaking).length, tone: "red" },
          ]}
          aside={
            <div className="space-y-4">
              <div>
                <p className="section-title">Editorial Focus</p>
                <h2 className="mt-2 font-display text-2xl font-black uppercase text-white">More than platform announcements</h2>
              </div>
              {categories.map((item) => (
                <div key={item} className="rounded-card border border-white/[0.08] bg-black/20 px-4 py-3 text-sm text-white">
                  {item}
                </div>
              ))}
            </div>
          }
        />

        <section className="rounded-card border border-white/[0.08] bg-bg-card p-4">
          <form method="get" className="grid gap-3 xl:grid-cols-[1.2fr,0.8fr,auto]">
            <input name="q" defaultValue={query} className="input-esports h-11" placeholder="Search news, tags, or topics" />
            <select name="category" defaultValue={category} className="input-esports h-11">
              <option value="all">All categories</option>
              {categories.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
            <div className="flex items-end gap-2">
              <button type="submit" className="btn-primary h-11">
                Apply
              </button>
              <Link href="/news" className="btn-secondary h-11">
                Reset
              </Link>
            </div>
          </form>
        </section>

        <section className="grid gap-4 xl:grid-cols-2">
          {articles.map((article) => (
            <NewsCard key={article.id} article={article} />
          ))}
          {articles.length === 0 ? (
            <div className="xl:col-span-2">
              <EmptyState title="No results found" description="Try adjusting your search or browse available categories." />
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}

export function PlatformNewsDetailPage({
  hub,
  article,
}: {
  hub: PlatformHubData;
  article: PlatformArticle;
}) {
  const relatedArticles = article.relatedSlugs
    .map((slug) => hub.news.find((candidate) => candidate.slug === slug) ?? null)
    .filter((candidate): candidate is PlatformArticle => Boolean(candidate));

  return (
    <main className="page-shell pb-12 pt-6">
      <div className="page-stack">
        <PageHero
          badge={article.category}
          title={
            <>
              {article.title}
              <br />
              editorial detail
            </>
          }
          description={article.summary}
          actions={
            <>
              <Link href="/news" className="btn-secondary">
                Back to news
              </Link>
              <Link href="/events" className="btn-primary">
                Explore events
              </Link>
            </>
          }
          stats={[
            { label: "Category", value: article.category, tone: "blue" },
            { label: "Tags", value: article.tags.length, tone: "green" },
            { label: "Author", value: article.authorName, tone: "yellow" },
            { label: "Date", value: formatContentDate(article.date), tone: "red" },
          ]}
        />

        <DetailTrustBar
          items={[
            { label: "Home", href: "/" },
            { label: "News", href: "/news" },
            { label: article.title },
          ]}
          title={article.title}
          path={`/news/${article.slug}`}
          updatedAt={article.updatedAt ?? article.date}
        />

        <section className="esports-card p-8">
          {article.imageUrl ? (
            <div className="mb-6 overflow-hidden rounded-card border border-white/[0.08]">
              <img src={article.imageUrl} alt={article.title} className="h-72 w-full object-cover" />
            </div>
          ) : null}
          <div className="flex flex-wrap gap-2">
            {article.tags.map((tag) => (
              <CategoryPill key={tag} label={tag} />
            ))}
          </div>
          <div className="mt-6 space-y-5 text-base leading-8 text-slate-200">
            {article.body.map((paragraph, index) => (
              <p key={`${article.id}-${index}`}>{paragraph}</p>
            ))}
          </div>
        </section>

        <section className="esports-card p-6">
          <SectionHeader eyebrow="Related Articles" title="Keep reading" description="More published stories and updates from Bravo." />
          <div className="mt-6 grid gap-4 xl:grid-cols-3">
            {relatedArticles.map((relatedArticle) => (
              <NewsCard key={relatedArticle.id} article={relatedArticle} />
            ))}
            {relatedArticles.length === 0 ? (
              <div className="xl:col-span-3">
                  <EmptyState title="No related articles are available yet" description="Stay tuned for upcoming announcements and updates." />
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </main>
  );
}

export function PlatformGamesPage({ hub }: { hub: PlatformHubData }) {
  return (
    <main className="page-shell pb-12 pt-6">
      <div className="page-stack">
        <PageHero
          badge="Games Hub"
          title={
            <>
              Every game gets
              <br />
              a scalable Bravo home
            </>
          }
          description="PUBG PC is the active flagship today. Additional Bravo game hubs will open as coverage expands, without fragmenting the platform."
          actions={
            <>
              <Link href="/pubg" className="btn-primary">
                Open PUBG flagship
              </Link>
              <Link href="/events" className="btn-secondary">
                Event system
              </Link>
            </>
          }
          stats={[
            { label: "Games", value: hub.games.length, tone: "blue" },
            { label: "Flagship Titles", value: hub.games.filter((game) => game.flagship).length, tone: "green" },
            { label: "Building Lanes", value: hub.games.filter((game) => game.status === "building").length, tone: "yellow" },
            { label: "Planned Lanes", value: hub.games.filter((game) => game.status === "planned").length, tone: "red" },
          ]}
        />

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {hub.games.map((game) => (
            <GameCard key={game.slug} game={game} />
          ))}
        </section>
      </div>
    </main>
  );
}

export function PlatformGameDetailPage({
  hub,
  game,
  pubg,
}: {
  hub: PlatformHubData;
  game: PlatformGame;
  pubg?: PubgHubDataset | null;
}) {
  const relatedEvents = hub.events.filter((event) => event.gameSlug === game.slug).slice(0, 4);
  const relatedNews = hub.news.filter((article) => article.gameSlug === game.slug || article.category === game.name || article.category === game.shortName).slice(0, 3);
  const relatedMatches = hub.matches.filter((match) => match.gameSlug === game.slug).slice(0, 4);
  const topTeam = game.slug === "pubg-pc" ? pubg?.teams[0] ?? null : null;
  const topPlayer = game.slug === "pubg-pc" ? pubg?.players[0] ?? null : null;
  const futureTitle = game.slug !== "pubg-pc";

  return (
    <main className="page-shell pb-12 pt-6">
      <div className="page-stack">
        <PageHero
          badge={game.heroLabel}
          title={
            <>
              {game.name}
              <br />
              game hub
            </>
          }
          description={game.summary}
          actions={
            <>
              <Link href="/games" className="btn-secondary">
                Back to games
              </Link>
              <Link href={game.analyticsHref ?? game.primaryHref} className="btn-primary">
                {game.slug === "pubg-pc" ? "Open flagship analytics" : "Open game hub"}
              </Link>
            </>
          }
          stats={[
            { label: "Active Events", value: game.activeEvents, tone: "blue" },
            { label: "Tracked Matches", value: game.trackedMatches, tone: "green" },
            { label: "Teams", value: game.trackedTeams, tone: "yellow" },
            { label: "Players", value: game.trackedPlayers, tone: "red" },
          ]}
          aside={
            <div className="space-y-4">
              <div>
                <p className="section-title">Coverage Status</p>
                <h2 className="mt-2 font-display text-2xl font-black uppercase text-white">{game.completionLabel}</h2>
              </div>
              <div className="flex flex-wrap gap-2">
                <GameStatusPill status={game.status} />
              </div>
              <div className="rounded-card border border-white/[0.08] bg-black/20 p-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-text-muted">Sections</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {game.sections.map((section) => (
                    <CategoryPill key={section} label={section} />
                  ))}
                </div>
              </div>
            </div>
          }
        />

        {futureTitle ? (
          <section className="esports-card p-8">
            <SectionHeader
              eyebrow="Coming Soon"
              title="Coverage for this title is opening soon."
              description="Bravo will expand into this title with the same competition, stats, media, and team infrastructure once live coverage begins."
            />
            <div className="mt-6 grid gap-4 xl:grid-cols-[1.1fr,0.9fr]">
              <div className="rounded-card border border-white/[0.08] bg-bg-primary p-5">
                <p className="text-sm leading-7 text-slate-300">
                  Join the Bravo community now to follow launch announcements, register interest, and help shape which events, teams, and storylines open this title first.
                </p>
                <div className="mt-5 flex flex-wrap gap-3">
                  <a href={BRAVO_DISCORD_URL} target="_blank" rel="noreferrer" className="btn-primary">
                    Join Discord
                  </a>
                  <Link href="/feedback" className="btn-secondary">
                    Request Coverage
                  </Link>
                </div>
              </div>
              <div className="rounded-card border border-white/[0.08] bg-bg-primary p-5">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-text-muted">Launch Plan</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <CategoryPill label="Teams" />
                  <CategoryPill label="Players" />
                  <CategoryPill label="Matches" />
                  <CategoryPill label="Standings" />
                  <CategoryPill label="Media" />
                  <CategoryPill label="News" />
                </div>
                <p className="mt-4 text-sm leading-7 text-slate-300">
                  This hub will stay intentionally lightweight until real Bravo coverage begins. No fake stats, empty tables, or filler standings will be shown here.
                </p>
              </div>
            </div>
          </section>
        ) : null}

        {!futureTitle && game.slug === "pubg-pc" && topTeam && topPlayer ? (
          <section className="grid gap-6 xl:grid-cols-[1fr,1fr]">
            <div className="esports-card p-6">
              <SectionHeader eyebrow="Top Team" title={topTeam.name} description="The current flagship leaderboard leader across tracked PUBG coverage." />
              <div className="mt-5 grid gap-3 sm:grid-cols-4">
                <MetricCard label="Points" value={topTeam.totalPoints} compact tone="green" />
                <MetricCard label="Kills" value={topTeam.kills} compact tone="blue" />
                <MetricCard label="Matches" value={topTeam.matches} compact />
                <MetricCard label="Form" value={topTeam.formLabel} compact tone="yellow" />
              </div>
            </div>
            <div className="esports-card p-6">
              <SectionHeader eyebrow="Top Player" title={topPlayer.pubgName} description="The highest-output player currently leading the flagship public player market." />
              <div className="mt-5 grid gap-3 sm:grid-cols-4">
                <MetricCard label="Kills" value={topPlayer.kills} compact tone="blue" />
                <MetricCard label="Damage" value={topPlayer.damage} compact tone="green" />
                <MetricCard label="Matches" value={topPlayer.matches} compact />
                <MetricCard label="Form" value={topPlayer.formLabel} compact tone="yellow" />
              </div>
            </div>
          </section>
        ) : null}

        {!futureTitle ? (
        <section className="grid gap-6 xl:grid-cols-[1fr,1fr]">
          <div className="esports-card p-6">
            <SectionHeader eyebrow="Events" title="Game event lane" description="Every game plugs into the same event model and can grow from planned to fully tracked without a redesign." />
            <div className="mt-5 grid gap-3">
              {relatedEvents.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
              {relatedEvents.length === 0 ? (
                  <EmptyState title="No upcoming tournaments" description="There are currently no upcoming tournaments. New events will be announced soon." />
              ) : null}
            </div>
          </div>
          <div className="esports-card p-6">
            <SectionHeader eyebrow="Matches" title="Game match center lane" description="Upcoming, live, completed, and planned matches can all sit in the same public surface." />
            <div className="mt-5 grid gap-3">
              {relatedMatches.map((match) => (
                <MatchCard key={match.id} match={match} />
              ))}
              {relatedMatches.length === 0 ? (
                  <EmptyState title="No match results have been published yet" description="Results will appear once they are officially verified." />
              ) : null}
            </div>
          </div>
        </section>
        ) : null}

        {!futureTitle ? (
        <section className="esports-card p-6">
          <SectionHeader eyebrow="News" title="Game-specific editorial coverage" description="Game hubs can collect their own event stories, roster updates, scene coverage, and platform announcements." />
          <div className="mt-6 grid gap-4 xl:grid-cols-3">
            {relatedNews.map((article) => (
              <NewsCard key={article.id} article={article} />
            ))}
            {relatedNews.length === 0 ? (
              <div className="xl:col-span-3">
                  <EmptyState title="No articles have been published yet" description="Stay tuned for upcoming announcements and updates." />
              </div>
            ) : null}
          </div>
        </section>
        ) : null}
      </div>
    </main>
  );
}

export function PlatformEventsPage({
  hub,
  searchParams,
}: {
  hub: PlatformHubData;
  searchParams: SearchParamDictionary;
}) {
  const game = readSearchParam(searchParams.game, "all");
  const status = readSearchParam(searchParams.status, "all");
  const pageParam = Number.parseInt(readSearchParam(searchParams.page, "1"), 10);
  const page = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1;
  const pageSize = 12;
  const filteredEvents = hub.events.filter((event) => {
    if (game !== "all" && event.gameSlug !== game) return false;
    if (status !== "all" && event.status !== status) return false;
    return true;
  });
  const totalPages = Math.max(1, Math.ceil(filteredEvents.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paginatedEvents = filteredEvents.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const groupedEvents = [
    { key: "live", title: "Live", items: paginatedEvents.filter((event) => event.status === "live") },
    { key: "upcoming", title: "Upcoming", items: paginatedEvents.filter((event) => event.status === "upcoming" || event.status === "planned") },
    { key: "completed", title: "Recently Completed", items: paginatedEvents.filter((event) => event.status === "completed") },
  ].filter((group) => group.items.length > 0);

  return (
    <main className="page-shell pb-12 pt-6">
      <div className="page-stack">
        <PageHero
          badge="Events"
          title={
            <>
              Events
            </>
          }
          description="Live, upcoming, and recently completed competitions from the Bravo public schedule."
          actions={
            <>
              <Link href="/calendar" className="btn-secondary">
                Calendar
              </Link>
              <Link href="/matches" className="btn-primary">
                Match Center
              </Link>
            </>
          }
          stats={[
            { label: "Events", value: hub.events.length, tone: "blue" },
            { label: "Ongoing", value: hub.events.filter((event) => event.status === "live").length, tone: "green" },
            { label: "Upcoming", value: hub.events.filter((event) => event.status === "upcoming").length, tone: "yellow" },
            { label: "Completed", value: hub.events.filter((event) => event.status === "completed").length, tone: "red" },
          ]}
        />

        <section className="rounded-card border border-white/[0.08] bg-bg-card p-4">
          <div className="tab-bar mb-3">
            <Link href="/events" className={`tab-item ${status === "all" ? "tab-item-active" : ""}`}>
              All
            </Link>
            <Link href="/events?status=upcoming" className={`tab-item ${status === "upcoming" ? "tab-item-active" : ""}`}>
              Upcoming
            </Link>
            <Link href="/events?status=live" className={`tab-item ${status === "live" ? "tab-item-active" : ""}`}>
              Ongoing
            </Link>
            <Link href="/events?status=completed" className={`tab-item ${status === "completed" ? "tab-item-active" : ""}`}>
              Completed
            </Link>
          </div>
          <form method="get" className="grid gap-3 xl:grid-cols-[1fr,1fr,auto]">
            <select name="game" defaultValue={game} className="input-esports h-11">
              <option value="all">All games</option>
              {hub.games.map((gameRow) => (
                <option key={gameRow.slug} value={gameRow.slug}>
                  {gameRow.name}
                </option>
              ))}
            </select>
            <select name="status" defaultValue={status} className="input-esports h-11">
              <option value="all">All statuses</option>
              <option value="live">Live</option>
              <option value="upcoming">Upcoming</option>
              <option value="completed">Completed</option>
              <option value="planned">Planned</option>
            </select>
            <div className="flex items-end gap-2">
              <button type="submit" className="btn-primary h-11">
                Apply
              </button>
              <Link href="/events" className="btn-secondary h-11">
                Reset
              </Link>
            </div>
          </form>
        </section>

        {paginatedEvents.length === 0 ? (
          <section className="grid gap-4 xl:grid-cols-2">
            <div className="xl:col-span-2">
              <EmptyState title="No events match this view" description="Try adjusting the game or status filters to browse the public event board." />
            </div>
          </section>
        ) : (
          groupedEvents.map((group) => (
            <section key={group.key} className="space-y-4">
              <SectionHeader
                eyebrow="Event Board"
                title={group.title}
                description={`${group.items.length} public event${group.items.length === 1 ? "" : "s"} on this page.`}
              />
              <div className="grid gap-4 xl:grid-cols-2">
                {group.items.map((event) => (
                  <EventCard key={event.id} event={event} />
                ))}
              </div>
            </section>
          ))
        )}

        {filteredEvents.length > pageSize ? (
          <section className="rounded-card border border-white/[0.08] bg-bg-card p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-text-muted">
                Showing {(currentPage - 1) * pageSize + 1}-{Math.min(currentPage * pageSize, filteredEvents.length)} of {filteredEvents.length} events.
              </p>
              <div className="flex flex-wrap gap-2">
                {currentPage > 1 ? (
                  <Link
                    href={buildHref("/events", {
                      game: game === "all" ? undefined : game,
                      status: status === "all" ? undefined : status,
                      page: String(currentPage - 1),
                    })}
                    className="btn-secondary"
                  >
                    Previous
                  </Link>
                ) : null}
                {currentPage < totalPages ? (
                  <Link
                    href={buildHref("/events", {
                      game: game === "all" ? undefined : game,
                      status: status === "all" ? undefined : status,
                      page: String(currentPage + 1),
                    })}
                    className="btn-primary"
                  >
                    Load More
                  </Link>
                ) : null}
              </div>
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}

export function PlatformEventDetailPage({
  hub,
  event,
  pubg,
}: {
  hub: PlatformHubData;
  event: PlatformEvent;
  pubg?: PubgHubDataset | null;
}) {
  const relatedMatches = hub.matches.filter((match) => match.eventSlug === event.slug);
  const pubgEvent = event.gameSlug === "pubg-pc" ? pubg?.events.find((candidate) => candidate.slug === event.slug) ?? null : null;
  const relatedSponsors = hub.sponsors.filter(
    (sponsor) =>
      (sponsor.eventSlugs.includes(event.slug) || (event.sponsorName ? sponsor.name === event.sponsorName : false)) &&
      (sponsor.showOnEventPage || (event.sponsorName ? sponsor.name === event.sponsorName : false))
  );

  return (
    <main className="page-shell pb-12 pt-6">
      <div className="page-stack">
        <PageHero
          badge={`${event.gameName} | ${event.type}`}
          title={
            <>
              {event.name}
            </>
          }
          description={event.summary}
          actions={
            <>
              <Link href="/events" className="btn-secondary">
                Back to events
              </Link>
              {event.analyticsHref ? (
                <Link href={event.analyticsHref} className="btn-primary">
                  {event.gameSlug === "pubg-pc" ? "Open full analytics" : "Open game hub"}
                </Link>
              ) : null}
            </>
          }
          stats={[
            { label: "Teams", value: event.teamsCount, tone: "blue" },
            { label: "Matches", value: event.matchesCount, tone: "green" },
            { label: "Prize", value: event.prizePool, tone: "yellow" },
            { label: "Region", value: event.region, tone: "red" },
          ]}
          aside={
            <div className="space-y-4">
              {event.bannerUrl ? (
                <div className="overflow-hidden rounded-card border border-white/[0.08] bg-black/20">
                  <img src={event.bannerUrl} alt={event.name} className="h-40 w-full object-cover" />
                </div>
              ) : null}
              <div>
                <p className="section-title">Event Status</p>
                <h2 className="mt-2 font-display text-2xl font-black uppercase text-white">Public event board</h2>
              </div>
              <div className="flex flex-wrap gap-2">
                <PlatformStatusPill status={event.status} />
              </div>
              <div className="rounded-card border border-white/[0.08] bg-black/20 p-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-text-muted">Available sections</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {event.tabs.map((tab) => (
                    <CategoryPill key={tab} label={tab} />
                  ))}
                </div>
              </div>
            </div>
          }
        />

        <DetailTrustBar
          items={[
            { label: "Home", href: "/" },
            { label: "Events", href: "/events" },
            { label: event.name },
          ]}
          title={event.name}
          path={`/events/${event.slug}`}
          updatedAt={event.updatedAt ?? event.startDate}
        />

        <section className="grid gap-6 xl:grid-cols-[1fr,1fr]">
          <div className="esports-card p-6">
            <SectionHeader eyebrow="Overview" title="Event summary and schedule" description="Schedule, status, and public event context stay visible in one place." />
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <MetricCard label="Start" value={formatDate(event.startDate)} compact tone="blue" />
              <MetricCard label="End" value={event.endDate ? formatDate(event.endDate) : "TBD"} compact tone="green" />
              <MetricCard label="Organizer" value={event.organizerName} compact tone="yellow" />
              <MetricCard label="Point System" value={event.pointSystemName ?? "Pending"} compact tone="red" />
            </div>
            <p className="mt-5 text-sm leading-relaxed text-text-muted">{event.summary}</p>
          </div>

          <div className="esports-card p-6">
            <SectionHeader eyebrow="Schedule" title="Match and broadcast context" description="These details anchor the event even when some deeper modules are still planned." />
            <div className="mt-5 space-y-3">
              {relatedMatches.slice(0, 4).map((match) => (
                <div key={match.id} className="rounded-card border border-white/[0.08] bg-bg-primary p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="font-semibold text-white">
                      {match.teamA} vs {match.teamB}
                    </p>
                    <PlatformStatusPill status={match.status} />
                  </div>
                  <p className="mt-2 text-sm text-text-muted">
                    {match.stageLabel} | {match.mapLabel} | {formatDateTime(match.scheduledAt)}
                  </p>
                </div>
              ))}
              {relatedMatches.length === 0 ? (
                  <EmptyState title="Match schedule information is not available yet" description="Please check back later for official timing updates." />
              ) : null}
            </div>
          </div>
        </section>

        {pubgEvent ? (
          <section className="grid gap-6 xl:grid-cols-[1fr,1fr]">
            <div className="esports-card p-6">
              <SectionHeader eyebrow="Standings Preview" title="Flagship event standings" description="PUBG events link back into the deeper Bravo analytics layer while still showing key public context here." />
              <div className="mt-5 space-y-3">
                {pubgEvent.standings.slice(0, 5).map((row) => (
                  <div key={row.teamId} className="rounded-card border border-white/[0.08] bg-bg-primary p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-semibold text-white">
                        #{row.rank} {row.teamName}
                      </p>
                      <p className="font-mono-stat text-accent-green">{formatNumber(row.totalPoints)} pts</p>
                    </div>
                    <p className="mt-2 text-sm text-text-muted">
                      {formatNumber(row.matches)} matches | {formatNumber(row.kills)} kills | avg place {row.avgPlacement.toFixed(2)}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="esports-card p-6">
              <SectionHeader eyebrow="Player Preview" title="Flagship event player table" description="Top player rows are visible here while the full event analytics live deeper in the PUBG hub." />
              <div className="mt-5 space-y-3">
                {pubgEvent.playerTable.slice(0, 5).map((row) => (
                  <div key={row.playerId} className="rounded-card border border-white/[0.08] bg-bg-primary p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-semibold text-white">
                        #{row.rank} {row.pubgName}
                      </p>
                      <p className="font-mono-stat text-accent-blue">{formatNumber(row.kills)} K</p>
                    </div>
                    <p className="mt-2 text-sm text-text-muted">
                      {row.teamName ?? "Team TBD"} | {formatNumber(row.assists)} assists | {formatNumber(row.damage)} damage
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        ) : (
          <section className="esports-card p-6">
            <SectionHeader eyebrow="Event Modules" title="Statistics, media, sponsors, and rules" description="This event route already exposes the public structure every future game hub will need." />
            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {[
                "Standings and rankings",
                "Teams and players",
                "Matches and schedule",
                "Statistics, media, sponsors, and rules",
              ].map((item) => (
                <div key={item} className="rounded-card border border-white/[0.08] bg-bg-primary p-4 text-sm text-white">
                  {item}
                </div>
              ))}
            </div>
          </section>
        )}

        {relatedSponsors.length > 0 ? (
          <section className="esports-card p-6">
            <SectionHeader eyebrow="Sponsor Context" title="Assigned sponsors and partners" description="Event-level sponsor visibility is now part of the core public information model." />
            <div className="mt-5 grid gap-4 xl:grid-cols-2">
              {relatedSponsors.map((sponsor) => (
                <div key={sponsor.id} className="rounded-card border border-white/[0.08] bg-bg-primary p-4">
                  {sponsor.bannerUrl ?? sponsor.designAssetUrl ? (
                    <div className="mb-4 overflow-hidden rounded-card border border-white/[0.08]">
                      <img src={sponsor.bannerUrl ?? sponsor.designAssetUrl ?? undefined} alt={sponsor.name} className="h-36 w-full object-cover" />
                    </div>
                  ) : null}
                  <div className="flex items-center gap-3">
                    {sponsor.logoUrl ? (
                      <img src={sponsor.logoUrl} alt={sponsor.name} className="h-14 w-14 rounded-card border border-white/10 bg-black/20 object-contain p-2" />
                    ) : null}
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-accent-blue">
                        {sponsor.tier} | {sponsorKindLabel(sponsor.kind)}
                      </p>
                      <p className="mt-1 font-display text-lg font-black uppercase text-white">{sponsor.name}</p>
                    </div>
                  </div>
                  <p className="mt-4 text-sm leading-relaxed text-text-muted">{sponsor.description}</p>
                  <div className="mt-4 flex flex-wrap gap-3">
                    <Link href={`/sponsors/${sponsor.slug}`} className="btn-secondary">
                      Open Profile
                    </Link>
                    {sponsor.websiteUrl ? (
                      <HeroActionLink href={sponsor.websiteUrl} label="Visit Website" className="btn-primary" />
                    ) : null}
                    {sponsor.socialUrl ? (
                      <HeroActionLink href={sponsor.socialUrl} label="Open Social" className="btn-secondary" />
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}

export function PlatformCalendarPage({ hub }: { hub: PlatformHubData }) {
  const monthly = [...hub.calendar]
    .sort((firstValue, secondValue) => firstValue.date.localeCompare(secondValue.date))
    .slice(0, 12);

  return (
    <main className="page-shell pb-12 pt-6">
      <div className="page-stack">
        <PageHero
          badge="Calendar"
          title={
            <>
              Monthly and weekly
              <br />
              esports schedule view
            </>
          }
          description="Upcoming tournaments, scrim schedules, registration deadlines, match timings, and community events now share one calendar-facing route."
          actions={
            <>
              <Link href="/events" className="btn-secondary">
                Events
              </Link>
              <Link href="/matches" className="btn-primary">
                Match Center
              </Link>
            </>
          }
          stats={[
            { label: "Calendar Items", value: hub.calendar.length, tone: "blue" },
            { label: "Events", value: hub.calendar.filter((item) => item.type === "Event").length, tone: "green" },
            { label: "Matches", value: hub.calendar.filter((item) => item.type === "Match").length, tone: "yellow" },
            { label: "Games", value: new Set(hub.calendar.map((item) => item.gameSlug)).size, tone: "red" },
          ]}
        />

        <section className="grid gap-6 xl:grid-cols-[1fr,1fr]">
          <div className="esports-card p-6">
            <SectionHeader eyebrow="Monthly View" title="Next major schedule blocks" description="A practical monthly-style list while the visual calendar system continues to mature." />
            <div className="mt-5 space-y-3">
              {monthly.map((item) => (
                <Link key={item.id} href={item.href} className="block rounded-card border border-white/[0.08] bg-bg-primary p-4 transition hover:border-accent-blue/30 hover:bg-bg-hover">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-white">{item.title}</p>
                      <p className="text-sm text-text-muted">
                        {item.subtitle} | {formatDateTime(item.date)}
                      </p>
                    </div>
                    <PlatformStatusPill status={item.status} />
                  </div>
                </Link>
              ))}
            </div>
          </div>

          <div className="esports-card p-6">
            <SectionHeader eyebrow="Weekly Focus" title="Immediate upcoming windows" description="Useful for teams, players, organizers, and fans who just need the next live cluster." />
            <div className="mt-5 space-y-3">
              {[...hub.calendar]
                .sort((firstValue, secondValue) => firstValue.date.localeCompare(secondValue.date))
                .slice(0, 7)
                .map((item) => (
                  <div key={item.id} className="rounded-card border border-white/[0.08] bg-bg-primary p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold text-white">{item.title}</p>
                        <p className="text-sm text-text-muted">{item.subtitle}</p>
                      </div>
                      <p className="text-xs uppercase tracking-[0.16em] text-text-muted">{formatDate(item.date)}</p>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

export function PlatformMatchesPage({
  hub,
  searchParams,
}: {
  hub: PlatformHubData;
  searchParams: SearchParamDictionary;
}) {
  const game = readSearchParam(searchParams.game, "all");
  const status = readSearchParam(searchParams.status, "all");
  const matches = hub.matches.filter((match) => {
    if (game !== "all" && match.gameSlug !== game) return false;
    if (status !== "all" && match.status !== status) return false;
    return true;
  });

  return (
    <main className="page-shell pb-12 pt-6">
      <div className="page-stack">
        <PageHero
          badge="Match Center"
          title={
            <>
              Upcoming, live,
              <br />
              and completed matches
            </>
          }
          description="The match center now belongs to the whole platform, not only one tournament flow. Every game can slot into the same structure."
          actions={
            <>
              <Link href="/events" className="btn-secondary">
                Events
              </Link>
              <Link href="/calendar" className="btn-primary">
                Calendar
              </Link>
            </>
          }
          stats={[
            { label: "Matches", value: hub.matches.length, tone: "blue" },
            { label: "Live", value: hub.matches.filter((match) => match.status === "live").length, tone: "green" },
            { label: "Upcoming", value: hub.matches.filter((match) => match.status === "upcoming").length, tone: "yellow" },
            { label: "Completed", value: hub.matches.filter((match) => match.status === "completed").length, tone: "red" },
          ]}
        />

        <section className="rounded-card border border-white/[0.08] bg-bg-card p-4">
          <form method="get" className="grid gap-3 xl:grid-cols-[1fr,1fr,auto]">
            <select name="game" defaultValue={game} className="input-esports h-11">
              <option value="all">All games</option>
              {hub.games.map((gameRow) => (
                <option key={gameRow.slug} value={gameRow.slug}>
                  {gameRow.name}
                </option>
              ))}
            </select>
            <select name="status" defaultValue={status} className="input-esports h-11">
              <option value="all">All statuses</option>
              <option value="live">Live</option>
              <option value="upcoming">Upcoming</option>
              <option value="completed">Completed</option>
              <option value="planned">Planned</option>
            </select>
            <div className="flex items-end gap-2">
              <button type="submit" className="btn-primary h-11">
                Apply
              </button>
              <Link href="/matches" className="btn-secondary h-11">
                Reset
              </Link>
            </div>
          </form>
        </section>

        <section className="grid gap-4 xl:grid-cols-2">
          {matches.map((match) => (
            <MatchCard key={match.id} match={match} />
          ))}
          {matches.length === 0 ? (
            <div className="xl:col-span-2">
              <EmptyState title="No results found" description="Try adjusting your search or browse available categories." />
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}

export function PlatformMatchDetailPage({
  hub,
  match,
  pubg,
}: {
  hub: PlatformHubData;
  match: PlatformMatch;
  pubg?: PubgHubDataset | null;
}) {
  const relatedEvent = hub.events.find((event) => event.slug === match.eventSlug) ?? null;
  const pubgMatch = match.gameSlug === "pubg-pc" ? pubg?.matches.find((candidate) => candidate.id === match.id) ?? null : null;

  return (
    <main className="page-shell pb-12 pt-6">
      <div className="page-stack">
        <PageHero
          badge={`${match.gameName} | Match Center`}
          title={
            <>
              {match.teamA} vs {match.teamB}
              <br />
              match detail
            </>
          }
          description={match.summary}
          actions={
            <>
              <Link href="/matches" className="btn-secondary">
                Back to matches
              </Link>
              {match.analyticsHref ? (
                <Link href={match.analyticsHref} className="btn-primary">
                  Open analytics
                </Link>
              ) : null}
            </>
          }
          stats={[
            { label: "Status", value: match.status, tone: "blue" },
            { label: "Stage", value: match.stageLabel, tone: "green" },
            { label: "Format", value: match.format, tone: "yellow" },
            { label: "Map Pool", value: match.mapLabel, tone: "red" },
          ]}
        />

        <DetailTrustBar
          items={[
            { label: "Home", href: "/" },
            { label: "Matches", href: "/matches" },
            ...(relatedEvent ? [{ label: relatedEvent.name, href: `/events/${relatedEvent.slug}` }] : []),
            { label: `${match.teamA} vs ${match.teamB}` },
          ]}
          title={`${match.teamA} vs ${match.teamB}`}
          path={`/matches/${match.id}`}
          updatedAt={match.updatedAt ?? match.scheduledAt}
        />

        <section className="grid gap-6 xl:grid-cols-[1fr,1fr]">
          <div className="esports-card p-6">
            <SectionHeader eyebrow="Scoreboard" title="Core match state" description="Every match detail page carries the same scoreboard, event, VOD, and MVP structure across games." />
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div className="rounded-card border border-white/[0.08] bg-bg-primary p-5 text-center">
                <p className="font-display text-xl font-black uppercase text-white">{match.teamA}</p>
                <p className="mt-3 font-mono-stat text-4xl text-accent-blue">{match.scoreA ?? "-"}</p>
              </div>
              <div className="rounded-card border border-white/[0.08] bg-bg-primary p-5 text-center">
                <p className="font-display text-xl font-black uppercase text-white">{match.teamB}</p>
                <p className="mt-3 font-mono-stat text-4xl text-accent-green">{match.scoreB ?? "-"}</p>
              </div>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <MetricCard label="Winner" value={match.winnerName ?? "Winner TBA"} compact tone="green" />
              <MetricCard label="MVP" value={match.mvpName ?? "MVP TBA"} compact tone="yellow" />
              <MetricCard label="Viewer Count" value={match.viewerCount ?? "Audience TBA"} compact tone="blue" />
            </div>
          </div>

          <div className="esports-card p-6">
            <SectionHeader eyebrow="Match Context" title="Event, schedule, and VOD links" description="Universal details that work for every game hub." />
            <div className="mt-5 space-y-3">
              <div className="rounded-card border border-white/[0.08] bg-bg-primary p-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-text-muted">Event</p>
                <p className="mt-2 font-semibold text-white">{match.eventName}</p>
              </div>
              <div className="rounded-card border border-white/[0.08] bg-bg-primary p-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-text-muted">Schedule</p>
                <p className="mt-2 font-semibold text-white">{formatDateTime(match.scheduledAt)}</p>
              </div>
              <div className="rounded-card border border-white/[0.08] bg-bg-primary p-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-text-muted">VOD</p>
                <p className="mt-2 text-sm text-white">{match.vodHref ? "Linked" : "Broadcast replay will appear here once it is officially published."}</p>
              </div>
            </div>
          </div>
        </section>

        {pubgMatch ? (
          <section className="esports-card overflow-hidden !p-0">
            <div className="border-b border-white/[0.08] px-5 py-4">
              <SectionHeader eyebrow="PUBG Scoreboard" title="Team and player results" description="Flagship PUBG matches unlock deeper scoreboard context inside the generic match route too." />
            </div>
            <div className="table-scroll">
              <table className="data-table min-w-full">
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Team</th>
                    <th>Kills</th>
                    <th>Total</th>
                    <th>WWCD</th>
                  </tr>
                </thead>
                <tbody>
                  {pubgMatch.teamResults.slice(0, 10).map((row) => (
                    <tr key={row.teamId}>
                      <td>#{row.placement}</td>
                      <td>{row.teamName}</td>
                      <td>{formatNumber(row.kills)}</td>
                      <td className="points-cell">{formatNumber(row.totalPoints)}</td>
                      <td>{row.wwcd ? "Yes" : "No"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ) : (
          <section className="esports-card p-6">
            <SectionHeader eyebrow="Detail Modules" title="Results, statistics, VOD, and MVP" description="This route already provides the right shell for every game hub as match data expands." />
            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {["Scoreboard", "Results", "Statistics", "VOD / MVP"].map((item) => (
                <div key={item} className="rounded-card border border-white/[0.08] bg-bg-primary p-4 text-sm text-white">
                  {item}
                </div>
              ))}
            </div>
          </section>
        )}

        {relatedEvent ? (
          <section className="esports-card p-6">
            <SectionHeader eyebrow="Parent Event" title={relatedEvent.name} description="Every match detail stays connected to its event so the user always has context." />
            <div className="mt-5">
              <Link href={`/events/${relatedEvent.slug}`} className="btn-secondary">
                Open event page
              </Link>
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}

export function PlatformTeamsPage({
  hub,
  pubg,
  searchParams,
}: {
  hub: PlatformHubData;
  pubg: PubgHubDataset;
  searchParams: SearchParamDictionary;
}) {
  const query = readSearchParam(searchParams.q).trim().toLowerCase();
  const game = readSearchParam(searchParams.game, "all");
  const sort = readSearchParam(searchParams.sort, "form");

  const filteredTeams = pubg.teams
    .filter((team) => {
      if (game !== "all" && game !== "pubg-pc") return false;
      if (query && !`${team.name} ${team.tag ?? ""} ${team.region ?? ""}`.toLowerCase().includes(query)) return false;
      return true;
    })
    .sort((firstTeam, secondTeam) => {
      if (sort === "kills") return secondTeam.kills - firstTeam.kills || secondTeam.totalPoints - firstTeam.totalPoints;
      if (sort === "matches") return secondTeam.matches - firstTeam.matches || secondTeam.totalPoints - firstTeam.totalPoints;
      if (sort === "points") return secondTeam.totalPoints - firstTeam.totalPoints || secondTeam.kills - firstTeam.kills;
      return secondTeam.formScore - firstTeam.formScore || secondTeam.totalPoints - firstTeam.totalPoints;
    });

  return (
    <main className="page-shell pb-12 pt-6">
      <div className="page-stack">
        <PageHero
          badge="Team Database"
          title={
            <>
              Verified teams,
              <br />
              flagship form, and rosters
            </>
          }
          description="Bravo's team database is platform-shaped from day one. PUBG supplies the live flagship profiles today, while future game titles can plug into the same searchable directory and profile model."
          actions={
            <>
              <Link href="/pubg/teams" className="btn-primary">
                Open PUBG teams
              </Link>
              <Link href="/rankings" className="btn-secondary">
                Rankings
              </Link>
            </>
          }
          stats={[
            { label: "Live Teams", value: pubg.teams.length, tone: "blue" },
            { label: "Active Rosters", value: pubg.teams.filter((team) => team.currentRoster.length > 0).length, tone: "green" },
            { label: "Regions", value: new Set(pubg.teams.map((team) => team.region).filter(Boolean)).size, tone: "yellow" },
            { label: "Game Lanes", value: hub.games.length, tone: "red" },
          ]}
          aside={
            <div className="space-y-4">
              <div>
                <p className="section-title">Coverage State</p>
                <h2 className="mt-2 font-display text-2xl font-black uppercase text-white">Game hubs feeding the team directory</h2>
              </div>
              {hub.games.slice(0, 4).map((item) => (
                <div key={item.slug} className="rounded-card border border-white/[0.08] bg-black/20 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold text-white">{item.name}</p>
                    <GameStatusPill status={item.status} />
                  </div>
                  <p className="mt-2 text-sm text-text-muted">{item.completionLabel}</p>
                </div>
              ))}
            </div>
          }
        />

        <section className="rounded-card border border-white/[0.08] bg-bg-card p-4">
          <form method="get" className="grid gap-3 xl:grid-cols-[1.1fr,0.8fr,0.8fr,auto]">
            <input name="q" defaultValue={query} className="input-esports h-11" placeholder="Search team, tag, or region" />
            <select name="game" defaultValue={game} className="input-esports h-11">
              <option value="all">All game titles</option>
              {hub.games.map((item) => (
                <option key={item.slug} value={item.slug}>
                  {item.name}
                </option>
              ))}
            </select>
            <select name="sort" defaultValue={sort} className="input-esports h-11">
              <option value="form">Sort by form</option>
              <option value="points">Sort by points</option>
              <option value="kills">Sort by kills</option>
              <option value="matches">Sort by matches</option>
            </select>
            <div className="flex items-end gap-2">
              <button type="submit" className="btn-primary h-11">
                Apply
              </button>
              <Link href="/teams" className="btn-secondary h-11">
                Reset
              </Link>
            </div>
          </form>
        </section>

        <section className="grid gap-4 xl:grid-cols-2">
          {filteredTeams.map((team) => (
            <div key={team.id} className="esports-card p-6">
              <div className="flex flex-wrap items-center gap-3">
                <TeamAvatar name={team.name} imageUrl={team.logoUrl ?? undefined} size="lg" />
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-accent-blue">PUBG PC</p>
                  <h2 className="mt-2 font-display text-2xl font-black uppercase text-white">{team.name}</h2>
                  <p className="text-sm uppercase tracking-[0.16em] text-text-muted">
                    {team.tag ? `[${team.tag}]` : "TEAM"} | {team.region ?? "Region TBA"}
                  </p>
                </div>
                <div className="ml-auto">
                  <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-white">
                    {team.formLabel}
                  </span>
                </div>
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-4">
                <MetricCard label="Points" value={team.totalPoints} compact tone="green" />
                <MetricCard label="Kills" value={team.kills} compact tone="blue" />
                <MetricCard label="Matches" value={team.matches} compact />
                <MetricCard label="Avg Place" value={team.avgPlacement.toFixed(2)} compact tone="yellow" />
              </div>
              <div className="mt-5 grid gap-4 xl:grid-cols-[1fr,0.95fr]">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-text-muted">Current roster</p>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    {team.currentRoster.slice(0, 4).map((member) => (
                      <div key={member.playerId} className="rounded-card border border-white/[0.08] bg-bg-primary p-3">
                        <p className="font-semibold text-white">{member.pubgName}</p>
                        <p className="text-xs uppercase tracking-[0.16em] text-text-muted">{member.role}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-text-muted">Recent form</p>
                  <div className="mt-3">
                    <TrendBars values={team.recentPoints} tone="green" />
                  </div>
                </div>
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                <Link href={`/pubg/teams/${team.slug ?? team.id}`} className="btn-primary">
                  Open Team Profile
                </Link>
                <Link href={`/compare?mode=teams&sideA=${team.id}`} className="btn-secondary">
                  Compare Team
                </Link>
              </div>
            </div>
          ))}
          {filteredTeams.length === 0 ? (
            <div className="xl:col-span-2">
              <EmptyState
                title={game !== "all" && game !== "pubg-pc" ? "Teams will appear after registration is approved." : "No teams match this filter"}
                description={
                  game !== "all" && game !== "pubg-pc"
                    ? "That title already has platform support, but public team profiles will show up after live event and roster data are published."
                    : "Try broadening the search or switching back to all game titles."
                }
              />
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}

export function PlatformPlayersPage({
  hub,
  pubg,
  searchParams,
}: {
  hub: PlatformHubData;
  pubg: PubgHubDataset;
  searchParams: SearchParamDictionary;
}) {
  const query = readSearchParam(searchParams.q).trim().toLowerCase();
  const game = readSearchParam(searchParams.game, "all");
  const sort = readSearchParam(searchParams.sort, "kills");

  const filteredPlayers = pubg.players
    .filter((player) => {
      if (game !== "all" && game !== "pubg-pc") return false;
      if (query && !`${player.pubgName} ${player.currentTeamName ?? ""}`.toLowerCase().includes(query)) return false;
      return true;
    })
    .sort((firstPlayer, secondPlayer) => {
      if (sort === "damage") return secondPlayer.damage - firstPlayer.damage || secondPlayer.kills - firstPlayer.kills;
      if (sort === "form") return secondPlayer.formScore - firstPlayer.formScore || secondPlayer.kills - firstPlayer.kills;
      if (sort === "avg") return secondPlayer.avgKills - firstPlayer.avgKills || secondPlayer.kills - firstPlayer.kills;
      return secondPlayer.kills - firstPlayer.kills || secondPlayer.damage - firstPlayer.damage;
    });

  return (
    <main className="page-shell pb-12 pt-6">
      <div className="page-stack">
        <PageHero
          badge="Player Database"
          title={
            <>
              Player profiles,
              <br />
              output, and form tracking
            </>
          }
          description="Players get public database treatment, not just leaderboard rows. PUBG provides the live flagship lane now, with room for every future Bravo game hub to plug into the same profile system."
          actions={
            <>
              <Link href="/pubg/players" className="btn-primary">
                Open PUBG players
              </Link>
              <Link href="/compare" className="btn-secondary">
                Compare players
              </Link>
            </>
          }
          stats={[
            { label: "Live Players", value: pubg.players.length, tone: "blue" },
            { label: "Teams Represented", value: new Set(pubg.players.map((player) => player.currentTeamId).filter(Boolean)).size, tone: "green" },
            { label: "MVP Count", value: pubg.players.reduce((sum, player) => sum + player.mvpCount, 0), tone: "yellow" },
            { label: "Game Lanes", value: hub.games.length, tone: "red" },
          ]}
          aside={
            <div className="space-y-4">
              <div>
                <p className="section-title">Flagship Lens</p>
                <h2 className="mt-2 font-display text-2xl font-black uppercase text-white">Current player market leaders</h2>
              </div>
              {pubg.players.slice(0, 4).map((player) => (
                <div key={player.id} className="rounded-card border border-white/[0.08] bg-black/20 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold text-white">{player.pubgName}</p>
                    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-white">
                      {player.formLabel}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-text-muted">{player.currentTeamName ?? "Team TBD"}</p>
                  <div className="mt-3">
                    <TrendBars values={player.recentTrend} tone="blue" />
                  </div>
                </div>
              ))}
            </div>
          }
        />

        <section className="rounded-card border border-white/[0.08] bg-bg-card p-4">
          <form method="get" className="grid gap-3 xl:grid-cols-[1.1fr,0.8fr,0.8fr,auto]">
            <input name="q" defaultValue={query} className="input-esports h-11" placeholder="Search player or team" />
            <select name="game" defaultValue={game} className="input-esports h-11">
              <option value="all">All game titles</option>
              {hub.games.map((item) => (
                <option key={item.slug} value={item.slug}>
                  {item.name}
                </option>
              ))}
            </select>
            <select name="sort" defaultValue={sort} className="input-esports h-11">
              <option value="kills">Sort by kills</option>
              <option value="damage">Sort by damage</option>
              <option value="form">Sort by form</option>
              <option value="avg">Sort by average kills</option>
            </select>
            <div className="flex items-end gap-2">
              <button type="submit" className="btn-primary h-11">
                Apply
              </button>
              <Link href="/players" className="btn-secondary h-11">
                Reset
              </Link>
            </div>
          </form>
        </section>

        <section className="grid gap-4 xl:grid-cols-2">
          {filteredPlayers.map((player, index) => (
            <div key={player.id} className="esports-card p-6">
              <div className="flex flex-wrap items-center gap-3">
                <span className="inline-flex min-w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 px-2.5 py-1 font-mono-stat text-xs text-white">
                  #{index + 1}
                </span>
                <TeamAvatar name={player.pubgName} imageUrl={player.avatarUrl ?? undefined} size="sm" />
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-accent-blue">PUBG PC</p>
                  <p className="font-semibold text-white">{player.pubgName}</p>
                  <p className="text-xs uppercase tracking-[0.16em] text-text-muted">{player.currentTeamName ?? "Team TBD"}</p>
                </div>
                <div className="ml-auto">
                  <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-white">
                    {player.formLabel}
                  </span>
                </div>
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-5">
                <MetricCard label="Kills" value={player.kills} compact tone="blue" />
                <MetricCard label="Assists" value={player.assists} compact tone="yellow" />
                <MetricCard label="Knocks" value={player.knocks} compact tone="green" />
                <MetricCard label="Damage" value={player.damage} compact tone="red" />
                <MetricCard label="Avg K" value={player.avgKills.toFixed(2)} compact />
              </div>
              <div className="mt-5 grid gap-4 xl:grid-cols-[1fr,0.95fr]">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-text-muted">Recent form</p>
                  <div className="mt-3">
                    <TrendBars values={player.recentTrend} tone="blue" />
                  </div>
                </div>
                <div className="rounded-card border border-white/[0.08] bg-bg-primary p-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-text-muted">Best match</p>
                  {player.bestMatch ? (
                    <>
                      <p className="mt-2 font-semibold text-white">
                        {player.bestMatch.eventName} | Match {player.bestMatch.matchNumber}
                      </p>
                      <p className="mt-2 text-sm text-text-muted">
                        {player.bestMatch.kills} kills | {player.bestMatch.damage ?? 0} damage | {player.bestMatch.mapName}
                      </p>
                    </>
                  ) : (
                    <p className="mt-2 text-sm text-text-muted">Match data will appear once results are published.</p>
                  )}
                </div>
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                <Link href={`/pubg/players/${player.slug ?? player.id}`} className="btn-primary">
                  Open Player Profile
                </Link>
                <Link href={`/compare?mode=players&sideA=${player.id}`} className="btn-secondary">
                  Compare Player
                </Link>
              </div>
            </div>
          ))}
          {filteredPlayers.length === 0 ? (
            <div className="xl:col-span-2">
              <EmptyState
                title={game !== "all" && game !== "pubg-pc" ? "Match data will appear once results are published." : "No players match this filter"}
                description={
                  game !== "all" && game !== "pubg-pc"
                    ? "That title is already modeled into the platform, but player cards will surface when public results and roster data are published."
                    : "Try broadening the search or switching back to all game titles."
                }
              />
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}

export function PlatformRankingsPage({
  hub,
  pubg,
  searchParams,
}: {
  hub: PlatformHubData;
  pubg: PubgHubDataset;
  searchParams: SearchParamDictionary;
}) {
  const timeframe = readSearchParam(searchParams.timeframe, "seasonal");
  const view = readSearchParam(searchParams.view, "teams");

  return (
    <main className="page-shell pb-12 pt-6">
      <div className="page-stack">
        <PageHero
          badge="Rankings System"
          title={
            <>
              Team, player, game,
              <br />
              and Nepal rankings
            </>
          }
          description="The long-term ranking system is designed to become a trusted public reference for Nepal esports across multiple games and time windows."
          actions={
            <>
              <Link href="/pubg/leaderboards" className="btn-primary">
                PUBG live board
              </Link>
              <Link href="/games" className="btn-secondary">
                Games hub
              </Link>
            </>
          }
          stats={[
            { label: "Timeframe", value: timeframe, tone: "blue" },
            { label: "Live PUBG Teams", value: pubg.teams.length, tone: "green" },
            { label: "Live PUBG Players", value: pubg.players.length, tone: "yellow" },
            { label: "Games In Model", value: hub.games.length, tone: "red" },
          ]}
        />

        <section className="rounded-card border border-white/[0.08] bg-bg-card p-4">
          <form method="get" className="grid gap-3 xl:grid-cols-[1fr,1fr,auto]">
            <select name="view" defaultValue={view} className="input-esports h-11">
              <option value="teams">Team Rankings</option>
              <option value="players">Player Rankings</option>
              <option value="games">Game Rankings</option>
              <option value="nepal">Nepal Rankings</option>
            </select>
            <select name="timeframe" defaultValue={timeframe} className="input-esports h-11">
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="seasonal">Seasonal</option>
              <option value="all-time">All-Time</option>
            </select>
            <div className="flex items-end gap-2">
              <button type="submit" className="btn-primary h-11">
                Apply
              </button>
              <Link href="/rankings" className="btn-secondary h-11">
                Reset
              </Link>
            </div>
          </form>
        </section>

        {view === "teams" ? (
          <section className="esports-card overflow-hidden !p-0">
            <div className="border-b border-white/[0.08] px-5 py-4">
              <SectionHeader eyebrow="Team Rankings" title="Current flagship team board" description="PUBG supplies the first live ranking board while the structure scales outward." />
            </div>
            <div className="table-scroll">
              <table className="data-table min-w-full">
                <thead>
                  <tr>
                    <th>Logo</th>
                    <th>Rank</th>
                    <th>Team</th>
                    <th>WWCD</th>
                    <th>Matches</th>
                    <th>Kills</th>
                    <th>Points</th>
                    <th>Form</th>
                  </tr>
                </thead>
                <tbody>
                  {pubg.teams.slice(0, 10).map((team, index) => (
                    <tr key={team.id}>
                      <td>
                        <TeamAvatar name={team.name} imageUrl={team.logoUrl ?? undefined} size="sm" />
                      </td>
                      <td>#{index + 1}</td>
                      <td>
                        <Link href={`/pubg/teams/${team.slug ?? team.id}`} className="font-semibold text-white hover:text-accent-blue">
                          {team.name}
                        </Link>
                      </td>
                      <td>{formatNumber(team.wins)}</td>
                      <td>{formatNumber(team.matches)}</td>
                      <td>{formatNumber(team.kills)}</td>
                      <td className="points-cell">{formatNumber(team.totalPoints)}</td>
                      <td>{team.formLabel}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}

        {view === "players" ? (
          <section className="esports-card overflow-hidden !p-0">
            <div className="border-b border-white/[0.08] px-5 py-4">
              <SectionHeader eyebrow="Player Rankings" title="Current flagship player board" description="Kills, damage, and form anchor the first live player ranking view." />
            </div>
            <div className="table-scroll">
              <table className="data-table min-w-full">
                <thead>
                  <tr>
                    <th>Avatar</th>
                    <th>Rank</th>
                    <th>Player</th>
                    <th>Team</th>
                    <th>Kills</th>
                    <th>Damage</th>
                    <th>Matches</th>
                    <th>Form</th>
                  </tr>
                </thead>
                <tbody>
                  {pubg.players.slice(0, 10).map((player, index) => (
                    <tr key={player.id}>
                      <td>
                        <TeamAvatar name={player.pubgName} imageUrl={player.avatarUrl ?? undefined} size="sm" />
                      </td>
                      <td>#{index + 1}</td>
                      <td>
                        <Link href={`/pubg/players/${player.slug ?? player.id}`} className="font-semibold text-white hover:text-accent-blue">
                          {player.pubgName}
                        </Link>
                      </td>
                      <td>
                        {player.currentTeamId ? (
                          <Link href={`/pubg/teams/${player.currentTeamId}`} className="text-white hover:text-accent-blue">
                            {player.currentTeamName ?? "Pending"}
                          </Link>
                        ) : (
                          player.currentTeamName ?? "Pending"
                        )}
                      </td>
                      <td>{formatNumber(player.kills)}</td>
                      <td>{formatNumber(player.damage)}</td>
                      <td>{formatNumber(player.matches)}</td>
                      <td>{player.formLabel}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}

        {view === "games" ? (
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {hub.games.map((game) => (
              <GameCard key={game.slug} game={game} />
            ))}
          </section>
        ) : null}

        {view === "nepal" ? (
          <section className="grid gap-6 xl:grid-cols-[1fr,1fr]">
            <div className="esports-card p-6">
              <SectionHeader eyebrow="Nepal Rankings" title="Platform-wide ecosystem status" description="A public-facing ranking model that can evolve into a national reference." />
              <div className="mt-5 grid gap-3">
                {hub.games.map((game, index) => (
                  <div key={game.slug} className="rounded-card border border-white/[0.08] bg-bg-primary p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-semibold text-white">
                        #{index + 1} {game.name}
                      </p>
                      <GameStatusPill status={game.status} />
                    </div>
                    <p className="mt-2 text-sm text-text-muted">{game.completionLabel}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="esports-card p-6">
              <SectionHeader eyebrow="Why It Matters" title="Toward an official ecosystem ranking" description="The goal is bigger than a single game leaderboard." />
              <div className="mt-5 grid gap-3">
                {[
                  "Give teams and players a public reference point",
                  "Help organizers and sponsors evaluate scene momentum",
                  "Create continuity across seasons and multiple titles",
                  "Position Bravo as the most complete esports hub in Nepal",
                ].map((item) => (
                  <div key={item} className="rounded-card border border-white/[0.08] bg-bg-primary px-4 py-3 text-sm text-white">
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}

export function PlatformMediaPage({
  hub,
  searchParams,
}: {
  hub: PlatformHubData;
  searchParams: SearchParamDictionary;
}) {
  const category = readSearchParam(searchParams.category, "all");
  const pageParam = Number.parseInt(readSearchParam(searchParams.page, "1"), 10);
  const page = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1;
  const pageSize = 9;
  const filteredMedia = hub.media.filter((item) => category === "all" || item.category === category || item.kind === category);
  const categories = Array.from(new Set(hub.media.map((item) => item.category))).sort((firstValue, secondValue) => firstValue.localeCompare(secondValue));
  const totalPages = Math.max(1, Math.ceil(filteredMedia.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const media = filteredMedia.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <main className="page-shell pb-12 pt-6">
      <div className="page-stack">
        <PageHero
          badge="Media"
          title={
            <>
              Media Center
            </>
          }
          description="Published highlights, broadcasts, and video coverage from the Bravo public media library."
          actions={
            <>
              <Link href="/news" className="btn-secondary">
                Latest News
              </Link>
              <Link href="/live-stream" className="btn-primary">
                Watch Live
              </Link>
            </>
          }
          stats={[
            { label: "Media Items", value: hub.media.length, tone: "blue" },
            { label: "Featured", value: hub.media.filter((item) => item.featured).length, tone: "green" },
            { label: "Categories", value: categories.length, tone: "yellow" },
            { label: "Games", value: new Set(hub.media.map((item) => item.gameSlug)).size, tone: "red" },
          ]}
        />

        <section className="rounded-card border border-white/[0.08] bg-bg-card p-4">
          <form method="get" className="grid gap-3 xl:grid-cols-[1fr,auto]">
            <select name="category" defaultValue={category} className="input-esports h-11">
              <option value="all">All categories</option>
              {categories.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
            <div className="flex items-end gap-2">
              <button type="submit" className="btn-primary h-11">
                Apply
              </button>
              <Link href="/media" className="btn-secondary h-11">
                Reset
              </Link>
            </div>
          </form>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {media.map((item) => (
            <div key={item.id} className="esports-card flex h-full flex-col p-5">
              <div className="mb-4 overflow-hidden rounded-card border border-white/[0.08]">
                {item.imageUrl ? (
                  <img src={item.imageUrl} alt={item.title} loading="lazy" className="h-44 w-full object-cover" />
                ) : (
                  <div className="h-44 bg-[radial-gradient(circle_at_top_left,rgba(47,152,255,0.2),transparent_30%),linear-gradient(180deg,rgba(16,24,43,0.96),rgba(8,14,28,0.96))]" />
                )}
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <CategoryPill label={item.kind} />
                {item.duration ? <p className="font-mono-stat text-text-muted">{item.duration}</p> : null}
              </div>
              <h2 className="mt-4 font-display text-xl font-black uppercase text-white">{item.title}</h2>
              <p className="mt-3 text-sm text-text-muted">{item.summary}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <CategoryPill label={item.category} />
                <CategoryPill label={formatGameSlugLabel(item.gameSlug)} />
              </div>
              <div className="mt-auto flex flex-wrap gap-2 pt-5">
                <Link href={`/media/${item.slug}`} className="btn-primary">
                  View Details
                </Link>
                {item.url ? (
                  <a href={item.url} target="_blank" rel="noreferrer" className="btn-secondary">
                    Open Media
                  </a>
                ) : null}
              </div>
            </div>
          ))}
          {media.length === 0 ? (
            <div className="md:col-span-2 xl:col-span-3">
              <EmptyState
                title="No published media yet"
                description="New highlights, broadcasts, and community videos will appear here after they are published."
              />
            </div>
          ) : null}
        </section>

        {filteredMedia.length > pageSize ? (
          <section className="rounded-card border border-white/[0.08] bg-bg-card p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-text-muted">
                Showing {(currentPage - 1) * pageSize + 1}-{Math.min(currentPage * pageSize, filteredMedia.length)} of {filteredMedia.length} media items.
              </p>
              <div className="flex flex-wrap gap-2">
                {currentPage > 1 ? (
                  <Link
                    href={buildHref("/media", {
                      category: category === "all" ? undefined : category,
                      page: String(currentPage - 1),
                    })}
                    className="btn-secondary"
                  >
                    Previous
                  </Link>
                ) : null}
                {currentPage < totalPages ? (
                  <Link
                    href={buildHref("/media", {
                      category: category === "all" ? undefined : category,
                      page: String(currentPage + 1),
                    })}
                    className="btn-primary"
                  >
                    Load More
                  </Link>
                ) : null}
              </div>
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}

export function PlatformMediaDetailPage({
  hub,
  item,
}: {
  hub: PlatformHubData;
  item: PlatformMediaItem;
}) {
  const relatedMedia = hub.media
    .filter((candidate) => candidate.slug !== item.slug && (candidate.category === item.category || candidate.gameSlug === item.gameSlug))
    .slice(0, 3);

  return (
    <main className="page-shell pb-12 pt-6">
      <div className="page-stack">
        <PageHero
          badge={`${item.kind} | ${item.category}`}
          title={
            <>
              {item.title}
            </>
          }
          description={item.summary}
          actions={
            <>
              <Link href="/media" className="btn-secondary">
                Back to media
              </Link>
              {item.url ? (
                <a href={item.url} target="_blank" rel="noreferrer" className="btn-primary">
                  Open source
                </a>
              ) : null}
            </>
          }
          stats={[
            { label: "Kind", value: item.kind, tone: "blue" },
            { label: "Category", value: item.category, tone: "green" },
            { label: "Game", value: item.gameSlug, tone: "yellow" },
            { label: "Duration", value: item.duration ?? "TBD", tone: "red" },
          ]}
        />

        <DetailTrustBar
          items={[
            { label: "Home", href: "/" },
            { label: "Media", href: "/media" },
            { label: item.title },
          ]}
          title={item.title}
          path={`/media/${item.slug}`}
          updatedAt={item.updatedAt ?? item.publishedAt}
        />

        <section className="grid gap-6 xl:grid-cols-[1.05fr,0.95fr]">
          <div className="esports-card p-6">
            {item.imageUrl ? (
              <div className="mb-5 overflow-hidden rounded-card border border-white/[0.08]">
                <img src={item.imageUrl} alt={item.title} className="h-72 w-full object-cover" />
              </div>
            ) : null}
            <SectionHeader eyebrow="Summary" title="Published media context" description="Media detail pages keep clips, posters, highlights, and VODs easy to follow." />
            <p className="mt-5 text-sm leading-relaxed text-text-muted">{item.summary}</p>
          </div>

          <div className="esports-card p-6">
            <SectionHeader eyebrow="Details" title="Media details" description="Useful context for sponsors, teams, organizers, and the community." />
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <MetricCard label="Kind" value={item.kind} compact tone="blue" />
              <MetricCard label="Category" value={item.category} compact tone="green" />
              <MetricCard label="Game" value={item.gameSlug} compact tone="yellow" />
              <MetricCard label="Duration" value={item.duration ?? "TBD"} compact tone="red" />
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              <CategoryPill label={item.kind} />
              <CategoryPill label={item.category} />
              <CategoryPill label={item.gameSlug} />
            </div>
          </div>
        </section>

        <section className="esports-card p-6">
          <SectionHeader eyebrow="Related Media" title="Keep exploring" description="Related Bravo content keeps the public media center connected instead of leaving viewers at a dead end." />
          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {relatedMedia.map((relatedItem) => (
              <Link key={relatedItem.id} href={`/media/${relatedItem.slug}`} className="block rounded-card border border-white/[0.08] bg-bg-primary p-4 transition hover:border-accent-blue/30 hover:bg-bg-hover">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-accent-blue">{relatedItem.kind}</p>
                <h3 className="mt-2 font-display text-lg font-black uppercase text-white">{relatedItem.title}</h3>
                <p className="mt-3 text-sm text-text-muted">{relatedItem.summary}</p>
              </Link>
            ))}
            {relatedMedia.length === 0 ? (
              <div className="md:col-span-2 xl:col-span-3">
                  <EmptyState title="No media is currently available" description="Check back later for new published content." />
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </main>
  );
}

export function PlatformOrganizationsPage({ hub }: { hub: PlatformHubData }) {
  return (
    <main className="page-shell pb-12 pt-6">
      <div className="page-stack">
        <PageHero
          badge="Organizations"
          title={
            <>
              Teams, operators,
              <br />
              and ecosystem builders
            </>
          }
          description="Organization profiles make room for Bravo itself, partner tournament hosts, and future multi-org ecosystem listings."
          actions={
            <>
              <Link href="/sponsors" className="btn-secondary">
                Sponsor Hub
              </Link>
              <Link href="/events" className="btn-primary">
                Event System
              </Link>
            </>
          }
          stats={[
            { label: "Organizations", value: hub.organizations.length, tone: "blue" },
            { label: "Games Covered", value: new Set(hub.organizations.flatMap((organization) => organization.games)).size, tone: "green" },
            { label: "Featured Teams", value: new Set(hub.organizations.flatMap((organization) => organization.teams)).size, tone: "yellow" },
            { label: "Sponsor Links", value: new Set(hub.organizations.flatMap((organization) => organization.sponsors)).size, tone: "red" },
          ]}
        />

        <section className="grid gap-4 xl:grid-cols-2">
          {hub.organizations.map((organization) => (
            <OrganizationCard key={organization.slug} organization={organization} />
          ))}
          {hub.organizations.length === 0 ? (
            <div className="xl:col-span-2">
              <EmptyState title="No organization profiles are available yet" description="Organization profiles will be featured here once officially announced." />
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}

export function PlatformOrganizationDetailPage({
  organization,
}: {
  hub: PlatformHubData;
  organization: PlatformOrganization;
}) {
  return (
    <main className="page-shell pb-12 pt-6">
      <div className="page-stack">
        <PageHero
          badge={organization.type}
          title={
            <>
              {organization.name}
              <br />
              organization profile
            </>
          }
          description={organization.description}
          actions={
            <>
              <Link href="/organizations" className="btn-secondary">
                Back to organizations
              </Link>
              {organization.website ? (
                <HeroActionLink href={organization.website} label="Visit Website" className="btn-primary" />
              ) : null}
            </>
          }
          stats={[
            { label: "Events Hosted", value: organization.eventsHosted, tone: "blue" },
            { label: "Prize Pools", value: organization.prizePools, tone: "green" },
            { label: "Games", value: organization.games.length, tone: "yellow" },
            { label: "Teams", value: organization.teams.length, tone: "red" },
          ]}
        />

        <section className="grid gap-6 xl:grid-cols-[1fr,1fr]">
          <div className="esports-card p-6">
            <SectionHeader eyebrow="Coverage" title="Games and team footprint" description="Organization profiles now have a natural public home in the ecosystem." />
            <div className="mt-5 flex flex-wrap gap-2">
              {organization.games.map((game) => (
                <CategoryPill key={game} label={game} />
              ))}
            </div>
            <div className="mt-5 grid gap-3">
              {organization.teams.map((team) => (
                <div key={team} className="rounded-card border border-white/[0.08] bg-bg-primary px-4 py-3 text-sm text-white">
                  {team}
                </div>
              ))}
            </div>
          </div>

          <div className="esports-card p-6">
            <SectionHeader eyebrow="Achievements" title="Why this profile matters" description="These fields position organizations as ecosystem actors instead of hidden admin-side references." />
            <div className="mt-5 grid gap-3">
              {organization.achievements.map((achievement) => (
                <div key={achievement} className="rounded-card border border-white/[0.08] bg-bg-primary px-4 py-3 text-sm text-white">
                  {achievement}
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

export function PlatformSponsorsPage({ hub }: { hub: PlatformHubData }) {
  const publicSponsors = hub.sponsors.filter((sponsor) => sponsor.showOnSponsorsPage);

  return (
    <main className="page-shell pb-12 pt-6">
      <div className="page-stack">
        <PageHero
          badge="Sponsors"
          title={
            <>
              Sponsors & Partners
            </>
          }
          description="Official partners supporting Bravo Gaming Esports and Nepal PUBG competition coverage."
          actions={
            <>
              <Link href="/about/sponsor-us" className="btn-primary">
                Sponsor Us
              </Link>
              <Link href="/media" className="btn-secondary">
                Media Center
              </Link>
            </>
          }
          stats={[
            { label: "Profiles", value: publicSponsors.length, tone: "blue" },
            { label: "Event Links", value: publicSponsors.reduce((sum, sponsor) => sum + sponsor.supportedEvents.length, 0), tone: "green" },
            { label: "Partner Tiers", value: new Set(publicSponsors.map((sponsor) => sponsor.tier)).size, tone: "yellow" },
            { label: "Kinds", value: new Set(publicSponsors.map((sponsor) => sponsor.kind)).size, tone: "red" },
          ]}
        />

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {publicSponsors.map((sponsor) => (
            <SponsorCard key={sponsor.id} sponsor={sponsor} />
          ))}
          {publicSponsors.length === 0 ? (
            <div className="md:col-span-2 xl:col-span-3">
              <EmptyState
                title="No sponsors or partners announced yet"
                description="Sponsor cards will show Website and View Profile actions once official partners are published."
              />
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}

export function PlatformSponsorDetailPage({
  hub,
  sponsor,
}: {
  hub: PlatformHubData;
  sponsor: PlatformSponsorProfile;
}) {
  const relatedEvents = hub.events.filter(
    (event) => sponsor.eventSlugs.includes(event.slug) || sponsor.supportedEvents.includes(event.name)
  );
  const placements = [
    sponsor.showOnHomepage ? "Homepage" : null,
    sponsor.showOnSponsorsPage ? "Sponsors page" : null,
    sponsor.showOnEventPage ? "Event pages" : null,
    sponsor.showOnPubgPage ? "PUBG page" : null,
  ].filter((item): item is string => Boolean(item));

  return (
    <main className="page-shell pb-12 pt-6">
      <div className="page-stack">
        <PageHero
          badge={`${sponsor.tier} | ${sponsorKindLabel(sponsor.kind)}`}
          title={
            <>
              {sponsor.name}
              <br />
              {sponsorKindLabel(sponsor.kind).toLowerCase()} profile
            </>
          }
          description={sponsor.description}
          actions={
            <>
              <Link href="/sponsors" className="btn-secondary">
                Back to sponsors
              </Link>
              {sponsor.websiteUrl ? (
                <HeroActionLink href={sponsor.websiteUrl} label="Visit Website" className="btn-primary" />
              ) : null}
              {sponsor.socialUrl ? (
                <HeroActionLink href={sponsor.socialUrl} label="Open Social" className="btn-secondary" />
              ) : null}
            </>
          }
          stats={[
            { label: "Kind", value: sponsorKindLabel(sponsor.kind), tone: "blue" },
            { label: "Supported Events", value: sponsor.supportedEvents.length, tone: "green" },
            { label: "Placements", value: placements.length, tone: "yellow" },
            { label: "History Items", value: sponsor.partnershipHistory.length, tone: "red" },
          ]}
        />

        <DetailTrustBar
          items={[
            { label: "Home", href: "/" },
            { label: "Sponsors", href: "/sponsors" },
            { label: sponsor.name },
          ]}
          title={sponsor.name}
          path={`/sponsors/${sponsor.slug}`}
          updatedAt={sponsor.updatedAt}
        />

        <section className="grid gap-6 xl:grid-cols-[1fr,1fr]">
          <div className="esports-card p-6">
            <SectionHeader eyebrow="Assets and Placement" title="Brand assets and placement" description="Official logos, banners, and design visuals used across Bravo public coverage." />
            <div className="mt-5 space-y-4">
              {sponsor.bannerUrl ? (
                <div className="overflow-hidden rounded-card border border-white/[0.08] bg-bg-primary">
                  <img src={sponsor.bannerUrl} alt={`${sponsor.name} banner`} className="h-44 w-full object-cover" />
                </div>
              ) : null}
              {sponsor.designAssetUrl ? (
                <div className="overflow-hidden rounded-card border border-white/[0.08] bg-bg-primary">
                  <img src={sponsor.designAssetUrl} alt={`${sponsor.name} design asset`} className="h-44 w-full object-cover" />
                </div>
              ) : null}
              {sponsor.logoUrl ? (
                <div className="overflow-hidden rounded-card border border-white/[0.08] bg-bg-primary p-4">
                  <img src={sponsor.logoUrl} alt={sponsor.name} className="h-24 w-full object-contain" />
                </div>
              ) : null}
              <div className="flex flex-wrap gap-2">
                {placements.map((placement) => (
                  <CategoryPill key={placement} label={placement} />
                ))}
                {placements.length === 0 ? <CategoryPill label="Profile only" /> : null}
              </div>
            </div>
          </div>

          <div className="esports-card p-6">
            <SectionHeader eyebrow="Supported Events" title="Where this profile shows up" description="Published event connections and public placements for this partner." />
            <div className="mt-5 grid gap-3">
              {relatedEvents.map((event) => (
                <Link key={event.id} href={`/events/${event.slug}`} className="rounded-card border border-white/[0.08] bg-bg-primary px-4 py-3 text-sm text-white transition hover:border-accent-blue/30 hover:bg-bg-hover">
                  <p className="font-semibold text-white">{event.name}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.14em] text-text-muted">{event.gameName} | {formatDateRange(event.startDate, event.endDate)}</p>
                </Link>
              ))}
              {relatedEvents.length === 0 && sponsor.supportedEvents.length > 0
                ? sponsor.supportedEvents.map((item) => (
                    <div key={item} className="rounded-card border border-white/[0.08] bg-bg-primary px-4 py-3 text-sm text-white">
                      {item}
                    </div>
                  ))
                : null}
              {relatedEvents.length === 0 && sponsor.supportedEvents.length === 0 ? (
                <div className="rounded-card border border-dashed border-white/10 bg-bg-primary px-4 py-5 text-sm text-text-muted">
                  No specific events are attached yet.
                </div>
              ) : null}
            </div>
          </div>
        </section>

        <section className="esports-card p-6">
          <SectionHeader eyebrow="Partnership History" title="Relationship timeline" description="Key milestones and public partnership highlights for this partner." />
          {sponsor.partnershipHistory.length > 0 ? (
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {sponsor.partnershipHistory.map((item) => (
                <div key={item} className="rounded-card border border-white/[0.08] bg-bg-primary px-4 py-3 text-sm text-white">
                  {item}
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-5 rounded-card border border-dashed border-white/10 bg-bg-primary px-4 py-5 text-sm text-text-muted">
              Partner details will be updated soon.
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

export function PlatformDashboardIndexPage() {
  return (
    <main className="page-shell pb-12 pt-6">
      <div className="page-stack">
        <PageHero
          badge="Dashboard"
          title={
            <>
              Role-aware dashboards
              <br />
              for the Bravo ecosystem
            </>
          }
          description="Bravo uses Supabase-backed dashboards for admins and team staff instead of one generic panel."
          actions={
            <>
              <Link href="/admin/login" className="btn-primary">
                Admin Login
              </Link>
              <Link href="/team/login" className="btn-secondary">
                Team Login
              </Link>
            </>
          }
          stats={[
            { label: "Live Roles", value: 2, tone: "green" },
            { label: "Team Roles", value: 3, tone: "yellow" },
            { label: "Auth", value: "Supabase", tone: "blue" },
            { label: "Scope", value: "Platform", tone: "red" },
          ]}
        />

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[
            { title: "Admin Login", detail: "Run platform operations, content, matches, audits, and event publishing.", href: "/admin/login" },
            { title: "Team Login", detail: "Manage roster, uploads, MOSS, and team operations for your own team.", href: "/team/login" },
            { title: "Login Hub", detail: "Choose the right Bravo role before you enter the platform.", href: "/login" },
          ].map((item) => (
            <Link key={item.href} href={item.href} className="rounded-card border border-white/[0.08] bg-bg-card p-5 transition hover:border-accent-blue/30 hover:bg-bg-hover">
              <p className="font-display text-lg font-black uppercase text-white">{item.title}</p>
              <p className="mt-3 text-sm text-text-muted">{item.detail}</p>
            </Link>
          ))}
        </section>
      </div>
    </main>
  );
}

export function PlatformPlayerDashboardPage({ pubg }: { pubg: PubgHubDataset }) {
  const spotlightPlayer = pubg.players[0] ?? null;

  return (
    <main className="page-shell pb-12 pt-6">
      <div className="page-stack">
        <PageHero
          badge="Player Dashboard"
          title={
            <>
              Claim profile,
              <br />
              stats, and fantasy
            </>
          }
          description="Bravo keeps player profile media and public stats in admin and team workflows rather than a separate player-login product lane."
          actions={
            <>
              <Link href="/team/login" className="btn-primary">
                Team Login
              </Link>
              <Link href="/pubg/players" className="btn-secondary">
                Browse players
              </Link>
            </>
          }
          stats={[
            { label: "Claim Flow", value: "Planned", tone: "yellow" },
            { label: "Fantasy Lane", value: "Hidden", tone: "yellow" },
            { label: "Flagship Players", value: pubg.players.length, tone: "blue" },
            { label: "History Scope", value: "Events + Matches", tone: "red" },
          ]}
        />

        <section className="grid gap-6 xl:grid-cols-[1fr,1fr]">
          <div className="esports-card p-6">
            <SectionHeader eyebrow="Player Profiles" title="How player data is managed today" description="Player images and profile updates flow through team staff and admin review instead of a separate player-login workspace." />
            <div className="mt-5 grid gap-3">
              {[
                "Team staff can upload player profile images for their own roster",
                "Admins can approve, replace, or remove player media",
                "Published player cards still power standings, MVP blocks, and feature rails",
                "Future player self-service can be added later without changing public routes",
              ].map((item) => (
                <div key={item} className="rounded-card border border-white/[0.08] bg-bg-primary px-4 py-3 text-sm text-white">
                  {item}
                </div>
              ))}
            </div>
          </div>
          <div className="esports-card p-6">
            <SectionHeader eyebrow="Flagship Example" title={spotlightPlayer?.pubgName ?? "Featured player"} description="A flagship player profile preview makes the dashboard direction feel grounded in real data." />
            {spotlightPlayer ? (
              <div className="mt-5 grid gap-3 sm:grid-cols-4">
                <MetricCard label="Kills" value={spotlightPlayer.kills} compact tone="blue" />
                <MetricCard label="Damage" value={spotlightPlayer.damage} compact tone="green" />
                <MetricCard label="Matches" value={spotlightPlayer.matches} compact />
                <MetricCard label="Form" value={spotlightPlayer.formLabel} compact tone="yellow" />
              </div>
            ) : (
              <div className="mt-5">
                <EmptyState title="Player statistics are currently unavailable" description="Please check back after upcoming matches are completed." />
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

export function PlatformFantasyPage({ hub }: { hub: PlatformHubData }) {
  return (
    <main className="page-shell pb-12 pt-6">
      <div className="page-stack">
        <PageHero
          badge="Fantasy"
          title={
            <>
              Cross-game fantasy
              <br />
              starts with PUBG
            </>
          }
          description="Fantasy is being built as a platform feature, not a one-off mode. PUBG provides the first strong data model, while other titles can join once their event and player stats mature."
          actions={
            <>
              <Link href="/pubg/fantasy" className="btn-primary">
                Open PUBG Fantasy
              </Link>
              <Link href="/team/login" className="btn-secondary">
                Team Login
              </Link>
            </>
          }
          stats={[
            { label: "Active Fantasy Games", value: 1, tone: "green" },
            { label: "Future Games", value: hub.games.length - 1, tone: "yellow" },
            { label: "Monetization Ready", value: "Yes", tone: "blue" },
            { label: "Leaderboard Mode", value: "Planned", tone: "red" },
          ]}
        />

        <section className="grid gap-6 xl:grid-cols-[1fr,1fr]">
          <div className="esports-card p-6">
            <SectionHeader eyebrow="Current Lane" title="PUBG flagship fantasy" description="The first fantasy lane grows out of the strongest current data foundation." />
            <div className="mt-5 grid gap-3">
              {[
                "Pick five-player squads from real event pools",
                "Lock entries automatically once the event starts",
                "Score from actual tracked player results",
                "Expand later into rewards and monetization",
              ].map((item) => (
                <div key={item} className="rounded-card border border-white/[0.08] bg-bg-primary px-4 py-3 text-sm text-white">
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="esports-card p-6">
            <SectionHeader eyebrow="Future Lane" title="Multi-game expansion path" description="Once game hubs gain event and player depth, fantasy can grow without rebuilding the platform." />
            <div className="mt-5 grid gap-3">
              {hub.games
                .filter((game) => game.slug !== "pubg-pc")
                .map((game) => (
                  <div key={game.slug} className="rounded-card border border-white/[0.08] bg-bg-primary p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-semibold text-white">{game.name}</p>
                      <GameStatusPill status={game.status} />
                    </div>
                    <p className="mt-2 text-sm text-text-muted">{game.completionLabel}</p>
                  </div>
                ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
