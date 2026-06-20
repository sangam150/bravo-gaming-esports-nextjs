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
import { getSiteUrl } from "@/lib/site";
import {
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
  return (
    <Link href={`/events/${event.slug}`} className="block rounded-card border border-white/[0.08] bg-bg-card p-5 transition hover:border-accent-blue/30 hover:bg-bg-hover">
      {event.bannerUrl ? (
        <div className="mb-4 overflow-hidden rounded-card border border-white/[0.08]">
          <img src={event.bannerUrl} alt={event.name} className="h-44 w-full object-cover" />
        </div>
      ) : null}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-accent-blue">{event.gameName}</p>
          <h3 className="mt-2 font-display text-lg font-black uppercase text-white">{event.name}</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          <PlatformStatusPill status={event.status} />
          <ContentStatePill state={event.state} />
        </div>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.16em] text-text-muted">Type</p>
          <p className="mt-1 text-sm text-white">{event.type}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-[0.16em] text-text-muted">Date</p>
          <p className="mt-1 text-sm text-white">{formatDateRange(event.startDate, event.endDate)}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-[0.16em] text-text-muted">Prize</p>
          <p className="mt-1 text-sm text-white">{event.prizePool}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-[0.16em] text-text-muted">Teams</p>
          <p className="mt-1 font-mono-stat text-white">{formatNumber(event.teamsCount)}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-[0.16em] text-text-muted">Matches</p>
          <p className="mt-1 font-mono-stat text-white">{formatNumber(event.matchesCount)}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-[0.16em] text-text-muted">Region</p>
          <p className="mt-1 text-sm text-white">{event.region}</p>
        </div>
      </div>
      <p className="mt-4 text-sm text-text-muted">{event.summary}</p>
    </Link>
  );
}

function MatchCard({ match }: { match: PlatformMatch }) {
  return (
    <Link href={`/matches/${match.id}`} className="block rounded-card border border-white/[0.08] bg-bg-card p-5 transition hover:border-accent-blue/30 hover:bg-bg-hover">
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
          <p className="mt-1 text-white">{match.viewerCount ?? "Audience pending"}</p>
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

  return (
    <Link href={`/sponsors/${sponsor.slug}`} className="block rounded-card border border-white/[0.08] bg-bg-card p-5 transition hover:border-accent-blue/30 hover:bg-bg-hover">
      {primaryAsset ? (
        <div className="mb-4 overflow-hidden rounded-card border border-white/[0.08] bg-bg-primary">
          <img src={primaryAsset} alt={sponsor.name} className="h-40 w-full object-cover" />
        </div>
      ) : null}
      <div className="flex items-center gap-4">
        {sponsor.logoUrl ? (
          <img src={sponsor.logoUrl} alt={sponsor.name} className="h-16 w-16 rounded-card border border-white/10 bg-bg-primary object-contain p-2" />
        ) : null}
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
        <p className="mt-3 text-xs uppercase tracking-[0.14em] text-text-muted">{sponsor.supportedEvents.slice(0, 2).join(" | ")}</p>
      ) : null}
    </Link>
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
    teamName: player.currentTeamName ?? "Team pending",
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
  const breakingNews = hub.home.breakingNews;
  const homepageSponsors = hub.home.featuredSponsors.length > 0 ? hub.home.featuredSponsors : hub.sponsors.filter((sponsor) => sponsor.showOnHomepage);
  const sponsorHighlight = homepageSponsors[0] ?? null;
  const heroSlides = hub.home.heroSlides.slice(0, 3);
  const primaryHeroSlide = heroSlides[0] ?? null;
  const secondaryHeroSlides = heroSlides.slice(1);
  const topTeams = resolveFeaturedTeamCards(pubg, hub.home.featuredTeamIds);
  const topPlayers = resolveFeaturedPlayerCards(pubg, hub.home.featuredPlayerIds);
  const leadStory = hub.home.featuredNews[0] ?? breakingNews ?? null;
  const supportingStories = hub.home.featuredNews.filter((article) => article.slug !== leadStory?.slug).slice(0, 3);
  const spotlightMatches =
    (hub.home.liveMatches.length > 0 ? hub.home.liveMatches : hub.home.upcomingMatches.length > 0 ? hub.home.upcomingMatches : hub.home.recentMatches).slice(0, 4);
  const communityCount = new Set(pubg.teams.map((team) => team.region).filter(Boolean)).size;
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
          <div className="relative grid gap-6 xl:grid-cols-[1.15fr,0.85fr]">
            <div className="space-y-6">
              <div className="max-w-4xl">
                <span className="brand-badge">{primaryHeroSlide?.badge ?? hub.brand.tagline}</span>
                <h1 className="mt-5 font-display text-5xl font-black uppercase leading-[0.9] text-white sm:text-6xl xl:text-7xl">
                  {primaryHeroSlide?.title ?? "Nepal's premier esports platform"}
                </h1>
                <p className="mt-5 max-w-3xl text-base leading-8 text-slate-300">
                  {primaryHeroSlide?.description ??
                    "Bravo Gaming Esports brings tournaments, news, rankings, teams, players, sponsors, media, and community coverage together in one public home for Nepal esports."}
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                {primaryHeroSlide?.primaryLabel && primaryHeroSlide.primaryHref ? (
                  <HeroActionLink href={primaryHeroSlide.primaryHref} label={primaryHeroSlide.primaryLabel} className="btn-watch-live" />
                ) : null}
                {primaryHeroSlide?.secondaryLabel && primaryHeroSlide.secondaryHref ? (
                  <HeroActionLink href={primaryHeroSlide.secondaryHref} label={primaryHeroSlide.secondaryLabel} className="btn-primary" />
                ) : null}
                {primaryHeroSlide?.tertiaryLabel && primaryHeroSlide.tertiaryHref ? (
                  <HeroActionLink href={primaryHeroSlide.tertiaryHref} label={primaryHeroSlide.tertiaryLabel} className="btn-discord" />
                ) : null}
              </div>

              {secondaryHeroSlides.length > 0 ? (
                <div className="grid gap-3 lg:grid-cols-2">
                  {secondaryHeroSlides.map((slide) => (
                    <div key={slide.id} className="rounded-[28px] border border-white/[0.08] bg-black/25 p-5">
                      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-accent-blue">{slide.badge}</p>
                      <h2 className="mt-3 font-display text-2xl font-black uppercase text-white">{slide.title}</h2>
                      <p className="mt-3 text-sm leading-7 text-slate-300">{slide.description}</p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        {slide.primaryLabel && slide.primaryHref ? (
                          <HeroActionLink href={slide.primaryHref} label={slide.primaryLabel} className="btn-primary" />
                        ) : null}
                        {slide.secondaryLabel && slide.secondaryHref ? (
                          <HeroActionLink href={slide.secondaryHref} label={slide.secondaryLabel} className="btn-secondary" />
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <MetricCard label="Games Covered" value={hub.games.length} tone="blue" compact />
                <MetricCard label="Events Live" value={hub.events.filter((event) => event.status === "live").length} tone="red" compact />
                <MetricCard label="Tracked Matches" value={hub.matches.length} tone="green" compact />
                <MetricCard label="News Stories" value={hub.news.length} tone="yellow" compact />
              </div>

              {featuredTournament ? (
                <div className="overflow-hidden rounded-[30px] border border-white/[0.08] bg-black/30">
                  {featuredTournament.bannerUrl ? (
                    <img src={featuredTournament.bannerUrl} alt={featuredTournament.name} className="h-56 w-full object-cover sm:h-64" />
                  ) : null}
                  <div className="grid gap-5 p-5 lg:grid-cols-[1fr,auto] lg:items-end">
                    <div>
                      <div className="flex flex-wrap gap-2">
                        <PlatformStatusPill status={featuredTournament.status} />
                        <ContentStatePill state={featuredTournament.state} />
                        <CategoryPill label={featuredTournament.gameName} />
                      </div>
                      <h2 className="mt-4 font-display text-3xl font-black uppercase text-white sm:text-4xl">{featuredTournament.name}</h2>
                      <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300">{featuredTournament.summary}</p>
                      <div className="mt-5 grid gap-3 sm:grid-cols-4">
                        <MetricCard label="Teams" value={featuredTournament.teamsCount} compact tone="blue" />
                        <MetricCard label="Matches" value={featuredTournament.matchesCount} compact tone="green" />
                        <MetricCard label="Region" value={featuredTournament.region} compact tone="yellow" />
                        <MetricCard label="Prize" value={featuredTournament.prizePool} compact tone="red" />
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 lg:justify-end">
                      <Link href={`/events/${featuredTournament.slug}`} className="btn-primary">
                        Open Event
                      </Link>
                      {featuredTournament.analyticsHref ? (
                        <Link href={featuredTournament.analyticsHref} className="btn-secondary">
                          Analytics
                        </Link>
                      ) : null}
                    </div>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="space-y-4">
              <div className="rounded-[30px] border border-white/[0.08] bg-black/25 p-5">
                <p className="section-title">Live Platform Signal</p>
                <h2 className="mt-3 font-display text-2xl font-black uppercase text-white">{hub.home.liveFeature.title}</h2>
                <p className="mt-3 text-sm leading-7 text-slate-300">{hub.home.liveFeature.subtitle}</p>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <MetricCard label="Viewers" value={hub.home.liveFeature.viewers} compact tone="red" />
                  <MetricCard label="Live Matches" value={hub.home.liveMatches.length} compact tone="blue" />
                  <MetricCard label="Upcoming" value={hub.home.upcomingMatches.length} compact tone="green" />
                </div>
                <div className="mt-4">
                  <a href={hub.home.liveFeature.href} target={hub.home.liveFeature.href.startsWith("http") ? "_blank" : undefined} rel="noreferrer" className="btn-watch-live">
                    Watch Broadcast
                  </a>
                </div>
              </div>

              {leadStory ? (
                <div className="rounded-[30px] border border-white/[0.08] bg-black/25 p-5">
                  <div className="flex flex-wrap gap-2">
                    <CategoryPill label="Breaking News" />
                    <CategoryPill label={leadStory.category} />
                  </div>
                  <h2 className="mt-4 font-display text-2xl font-black uppercase text-white">{leadStory.title}</h2>
                  <p className="mt-3 text-sm leading-7 text-slate-300">{leadStory.summary}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {leadStory.tags.slice(0, 3).map((tag) => (
                      <CategoryPill key={tag} label={tag} />
                    ))}
                  </div>
                  <div className="mt-5">
                    <Link href={`/news/${leadStory.slug}`} className="btn-primary">
                      Read Story
                    </Link>
                  </div>
                </div>
              ) : null}

              {supportingStories.length > 0 ? (
                <div className="rounded-[30px] border border-white/[0.08] bg-black/25 p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="section-title">Featured News</p>
                      <h2 className="mt-2 font-display text-2xl font-black uppercase text-white">Editorial pulse</h2>
                    </div>
                    <Link href="/news" className="text-xs font-bold uppercase tracking-[0.18em] text-accent-blue hover:text-white">
                      All news
                    </Link>
                  </div>
                  <div className="mt-4 space-y-3">
                    {supportingStories.map((article) => (
                      <Link key={article.slug} href={`/news/${article.slug}`} className="block rounded-2xl border border-white/[0.08] bg-bg-primary/70 p-4 transition hover:border-accent-blue/30 hover:bg-bg-hover">
                        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-accent-blue">{article.category}</p>
                        <p className="mt-2 font-semibold text-white">{article.title}</p>
                        <p className="mt-2 text-sm text-text-muted">{article.summary}</p>
                      </Link>
                    ))}
                  </div>
                </div>
              ) : null}

              {sponsorHighlight ? (
                <div className="rounded-[30px] border border-white/[0.08] bg-black/25 p-5">
                  <p className="section-title">Sponsor Showcase</p>
                  {sponsorHighlight.bannerUrl ?? sponsorHighlight.designAssetUrl ? (
                    <div className="mt-4 overflow-hidden rounded-card border border-white/[0.08] bg-bg-primary">
                      <img
                        src={sponsorHighlight.bannerUrl ?? sponsorHighlight.designAssetUrl ?? undefined}
                        alt={sponsorHighlight.name}
                        className="h-40 w-full object-cover"
                      />
                    </div>
                  ) : null}
                  <div className="mt-3 flex items-center gap-4">
                    {sponsorHighlight.logoUrl ? (
                      <img src={sponsorHighlight.logoUrl} alt={sponsorHighlight.name} className="h-16 w-16 rounded-2xl border border-white/10 bg-bg-primary p-2 object-contain" />
                    ) : null}
                    <div>
                      <h2 className="font-display text-2xl font-black uppercase text-white">{sponsorHighlight.name}</h2>
                      <p className="mt-1 text-xs font-bold uppercase tracking-[0.18em] text-accent-blue">
                        {sponsorHighlight.tier} | {sponsorKindLabel(sponsorHighlight.kind)}
                      </p>
                    </div>
                  </div>
                  <p className="mt-3 text-sm leading-7 text-slate-300">{sponsorHighlight.description}</p>
                  <div className="mt-4">
                    <div className="flex flex-wrap gap-3">
                      <Link href={`/sponsors/${sponsorHighlight.slug}`} className="btn-secondary">
                        Open Profile
                      </Link>
                      {sponsorHighlight.websiteUrl ? (
                        <HeroActionLink href={sponsorHighlight.websiteUrl} label="Visit Website" className="btn-primary" />
                      ) : null}
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.15fr,0.85fr]">
          <div className="esports-card p-6">
            <SectionHeader eyebrow="Live Now" title="Match center spotlight" description="Live streams, upcoming series, and recent results should feel like the front page of a real esports destination." action={<a href={hub.home.liveFeature.href} target={hub.home.liveFeature.href.startsWith("http") ? "_blank" : undefined} rel="noreferrer" className="btn-watch-live">Watch Broadcast</a>} />
            <div className="mt-5 grid gap-3 md:grid-cols-3">
              <MetricCard label="Viewer Count" value={hub.home.liveFeature.viewers} compact />
              <MetricCard label="Live Matches" value={hub.home.liveMatches.length} compact tone="red" />
              <MetricCard label="Upcoming Matches" value={hub.home.upcomingMatches.length} compact tone="blue" />
            </div>
            <div className="mt-5 grid gap-3">
              {spotlightMatches.map((match) => (
                <Link key={match.id} href={`/matches/${match.id}`} className="block rounded-card border border-white/[0.08] bg-bg-primary p-4 transition hover:border-accent-blue/30 hover:bg-bg-hover">
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
                <EmptyState title="Event publishing is quiet" description="Publish or feature a live event and it will appear here with its full tournament banner." />
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
                <EmptyState title="News publishing is quiet" description="Publish featured or breaking stories to turn the homepage into a real editorial surface." />
              </div>
            ) : null}
          </div>
        </section>

        <section className="esports-card p-6">
          <SectionHeader eyebrow="Platform Pulse" title="The public pulse of Bravo Gaming" description="Strong public signals keep the homepage feeling like a real esports destination: stories, competition, rankings, sponsors, and community momentum." />
          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {platformPulse.map((item) => (
              <MetricCard key={item.label} label={item.label} value={item.value} detail={item.detail} tone={item.tone} />
            ))}
          </div>
        </section>

        <section className="esports-card p-6">
          <SectionHeader eyebrow="Featured Events" title="Ongoing, upcoming, and recently finished competitions" description="The platform event layer is multi-game by design, while PUBG remains the most data-rich experience." />
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
                <Link key={team.id} href={`/teams/${team.slug ?? team.id}`} className="block rounded-[26px] border border-white/[0.08] bg-bg-primary p-4 transition hover:border-accent-blue/30 hover:bg-bg-hover">
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
                <Link key={player.id} href={`/players/${player.slug ?? player.id}`} className="block rounded-[26px] border border-white/[0.08] bg-bg-primary p-4 transition hover:border-accent-blue/30 hover:bg-bg-hover">
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
                  <EmptyState title="Homepage partner slots are quiet" description="Assign sponsor or partner entries to the homepage from admin and they will appear here automatically." />
                </div>
              ) : null}
            </div>
          </div>

          <div className="esports-card p-6">
            <SectionHeader eyebrow="Game Hubs" title="One platform, many esports lanes" description="PUBG is the strongest section today, with additional game hubs ready for broader Bravo coverage." />
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
                { title: "Discord", detail: "Join Bravo's live community hub for scrims, event updates, and ecosystem chatter.", href: "https://kamaucha.me/bravo" },
                { title: "Rules", detail: "Unified competition, conduct, and event rule references as the platform expands.", href: "/community" },
                { title: "Support", detail: "Support lanes for players, teams, organizers, and sponsors.", href: "/contact" },
                { title: "Announcements", detail: "Editorial and operational updates from the platform desk.", href: "/news" },
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
          description="The news lane now supports categories, article detail routes, featured stories, and platform-wide framing instead of isolated announcements."
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
              <EmptyState title="No stories match this filter" description="Try clearing the category or search term to widen the news board again." />
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
          <SectionHeader eyebrow="Related Articles" title="Keep reading" description="Editorial routes now connect into the wider platform instead of leaving readers at a dead end." />
          <div className="mt-6 grid gap-4 xl:grid-cols-3">
            {relatedArticles.map((relatedArticle) => (
              <NewsCard key={relatedArticle.id} article={relatedArticle} />
            ))}
            {relatedArticles.length === 0 ? (
              <div className="xl:col-span-3">
                <EmptyState title="No related stories yet" description="Related editorial coverage will appear here as the platform news volume grows." />
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
              a real home here
            </>
          }
          description="PUBG leads today, but every Bravo game hub follows the same clean public structure: overview, events, teams, players, matches, rankings, media, and news."
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
                {game.slug === "pubg-pc" ? "Open flagship analytics" : "Open game lane"}
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

        {game.slug === "pubg-pc" && topTeam && topPlayer ? (
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

        <section className="grid gap-6 xl:grid-cols-[1fr,1fr]">
          <div className="esports-card p-6">
            <SectionHeader eyebrow="Events" title="Game event lane" description="Every game plugs into the same event model and can grow from planned to fully tracked without a redesign." />
            <div className="mt-5 grid gap-3">
              {relatedEvents.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
              {relatedEvents.length === 0 ? (
                <EmptyState title="No events in this game lane yet" description="The game hub is live, but its first event set has not been published yet." />
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
                <EmptyState title="No matches in this lane yet" description="The game hub is ready for match center coverage as soon as live operations begin." />
              ) : null}
            </div>
          </div>
        </section>

        <section className="esports-card p-6">
          <SectionHeader eyebrow="News" title="Game-specific editorial coverage" description="Game hubs can collect their own event stories, roster updates, scene coverage, and platform announcements." />
          <div className="mt-6 grid gap-4 xl:grid-cols-3">
            {relatedNews.map((article) => (
              <NewsCard key={article.id} article={article} />
            ))}
            {relatedNews.length === 0 ? (
              <div className="xl:col-span-3">
                <EmptyState title="No game-specific stories yet" description="Editorial coverage will populate here once this game lane starts receiving regular content." />
              </div>
            ) : null}
          </div>
        </section>
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
  const events = hub.events.filter((event) => {
    if (game !== "all" && event.gameSlug !== game) return false;
    if (status !== "all" && event.status !== status) return false;
    return true;
  });

  return (
    <main className="page-shell pb-12 pt-6">
      <div className="page-stack">
        <PageHero
          badge="Events System"
          title={
            <>
              Universal event pages
              <br />
              for every game lane
            </>
          }
          description="The public event system now works as a platform module instead of a tournament-only lane: scrims, tournaments, leagues, seasons, and invitationals all fit here."
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
            { label: "Live", value: hub.events.filter((event) => event.status === "live").length, tone: "green" },
            { label: "Upcoming", value: hub.events.filter((event) => event.status === "upcoming").length, tone: "yellow" },
            { label: "Planned", value: hub.events.filter((event) => event.status === "planned").length, tone: "red" },
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
              <Link href="/events" className="btn-secondary h-11">
                Reset
              </Link>
            </div>
          </form>
        </section>

        <section className="grid gap-4 xl:grid-cols-2">
          {events.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
          {events.length === 0 ? (
            <div className="xl:col-span-2">
              <EmptyState title="No events match this filter" description="Try widening the game or status filter to bring more events back into the board." />
            </div>
          ) : null}
        </section>
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
              <br />
              event overview
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
                <p className="section-title">Event State</p>
                <h2 className="mt-2 font-display text-2xl font-black uppercase text-white">Tabs and public structure ready</h2>
              </div>
              <div className="flex flex-wrap gap-2">
                <PlatformStatusPill status={event.status} />
                <ContentStatePill state={event.state} />
              </div>
              <div className="rounded-card border border-white/[0.08] bg-black/20 p-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-text-muted">Tabs</p>
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
            <SectionHeader eyebrow="Overview" title="Event summary and schedule" description="The universal detail route gives every event a complete public shell, even before a game has its own full analytics surface." />
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
                <EmptyState title="No match schedule yet" description="The event exists, but its match schedule is not published or tracked yet." />
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
                      {row.teamName ?? "Team pending"} | {formatNumber(row.assists)} assists | {formatNumber(row.damage)} damage
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        ) : (
          <section className="esports-card p-6">
            <SectionHeader eyebrow="Event Modules" title="Statistics, media, sponsors, and rules" description="This event route already exposes the public structure every future game lane will need." />
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
              <EmptyState title="No matches match this filter" description="Try widening the status or game lens to bring the match board back." />
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
              <MetricCard label="Winner" value={match.winnerName ?? "Pending"} compact tone="green" />
              <MetricCard label="MVP" value={match.mvpName ?? "Pending"} compact tone="yellow" />
              <MetricCard label="Viewer Count" value={match.viewerCount ?? "Pending"} compact tone="blue" />
            </div>
          </div>

          <div className="esports-card p-6">
            <SectionHeader eyebrow="Match Context" title="Event, schedule, and VOD links" description="Universal details that work for every game lane." />
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
                <p className="mt-2 text-sm text-white">{match.vodHref ? "Linked" : "Will appear when broadcast VOD is published"}</p>
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
            <SectionHeader eyebrow="Detail Modules" title="Results, statistics, VOD, and MVP" description="This route already provides the right shell for every game lane as match data expands." />
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
          description="Bravo's team database is platform-shaped from day one. PUBG supplies the live flagship profiles today, while future game lanes can plug into the same searchable directory and profile model."
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
              <option value="all">All game lanes</option>
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
                    {team.tag ? `[${team.tag}]` : "TEAM"} | {team.region ?? "Region pending"}
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
                    ? "That game lane is already wired into the platform, but public team profiles will show up after live event and roster data is published."
                    : "Try broadening the search or switching back to all game lanes."
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
                  <p className="mt-2 text-sm text-text-muted">{player.currentTeamName ?? "Team pending"}</p>
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
              <option value="all">All game lanes</option>
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
                  <p className="text-xs uppercase tracking-[0.16em] text-text-muted">{player.currentTeamName ?? "Team pending"}</p>
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
                    ? "That game lane is already modeled into the platform, but player cards will surface when public results and roster data are published."
                    : "Try broadening the search or switching back to all game lanes."
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
                        <Link href={`/teams/${team.slug ?? team.id}`} className="font-semibold text-white hover:text-accent-blue">
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
                        <Link href={`/players/${player.slug ?? player.id}`} className="font-semibold text-white hover:text-accent-blue">
                          {player.pubgName}
                        </Link>
                      </td>
                      <td>
                        {player.currentTeamId ? (
                          <Link href={`/teams/${player.currentTeamId}`} className="text-white hover:text-accent-blue">
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
  const media = hub.media.filter((item) => category === "all" || item.category === category || item.kind === category);
  const categories = Array.from(new Set(hub.media.map((item) => item.category))).sort((firstValue, secondValue) => firstValue.localeCompare(secondValue));

  return (
    <main className="page-shell pb-12 pt-6">
      <div className="page-stack">
        <PageHero
          badge="Media Center"
          title={
            <>
              Videos, highlights,
              <br />
              posters, and VODs
            </>
          }
          description="The media center gives the Bravo ecosystem one public place for long-form videos, short clips, interviews, posters, and featured broadcasts."
          actions={
            <>
              <Link href="/videos" className="btn-secondary">
                Videos
              </Link>
              <Link href="/highlights" className="btn-primary">
                Highlights
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
            <div key={item.id} className="esports-card p-5">
              {item.imageUrl ? (
                <div className="mb-4 overflow-hidden rounded-card border border-white/[0.08]">
                  <img src={item.imageUrl} alt={item.title} loading="lazy" className="h-44 w-full object-cover" />
                </div>
              ) : null}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <CategoryPill label={item.kind} />
                {item.duration ? <p className="font-mono-stat text-text-muted">{item.duration}</p> : null}
              </div>
              <h2 className="mt-4 font-display text-xl font-black uppercase text-white">{item.title}</h2>
              <p className="mt-3 text-sm text-text-muted">{item.summary}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <CategoryPill label={item.category} />
                <CategoryPill label={item.gameSlug} />
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
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
        </section>
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
              <br />
              media detail
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
                <EmptyState title="No related media yet" description="Media will appear here once more published items are connected to this category or game lane." />
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
                <Link href={organization.website} className="btn-primary">
                  Open linked route
                </Link>
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
          badge="Sponsor Hub"
          title={
            <>
              Sponsor, partner,
              <br />
              and design profiles
            </>
          }
          description="Sponsor, partner, and design profiles are now first-class public pages with event association, asset support, and route-level visibility."
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
              <EmptyState title="No sponsor profiles are published here yet" description="Assign sponsor, partner, or design entries to the sponsors page from admin and they will appear here automatically." />
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
            <SectionHeader eyebrow="Assets and Placement" title="Managed logo, banner, and design support" description="These assets now come from editable admin records instead of hardcoded sponsor blocks." />
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
            <SectionHeader eyebrow="Supported Events" title="Where this profile shows up" description="Event association gives partners real public surface area across the ecosystem." />
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
          <SectionHeader eyebrow="Partnership History" title="Relationship timeline" description="A better sponsor page than a logo wall helps sell the platform as serious infrastructure." />
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {sponsor.partnershipHistory.map((item) => (
              <div key={item} className="rounded-card border border-white/[0.08] bg-bg-primary px-4 py-3 text-sm text-white">
                {item}
              </div>
            ))}
          </div>
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
          description="The platform dashboard model is built around players, team IGLs, admins, and future caster or coach roles instead of one generic panel."
          actions={
            <>
              <Link href="/dashboard/player" className="btn-primary">
                Player Dashboard
              </Link>
              <Link href="/team" className="btn-secondary">
                Team IGL Panel
              </Link>
            </>
          }
          stats={[
            { label: "Live Roles", value: 2, tone: "green" },
            { label: "Preview Roles", value: 2, tone: "yellow" },
            { label: "Auth", value: "Supabase", tone: "blue" },
            { label: "Scope", value: "Platform", tone: "red" },
          ]}
        />

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            { title: "Player Dashboard", detail: "Claim profile, view stats, match history, and fantasy in the future.", href: "/dashboard/player" },
            { title: "Team IGL Panel", detail: "Manage roster, uploads, MOSS, and team operations.", href: "/team" },
            { title: "Admin Panel", detail: "Run platform operations, content, matches, and event publishing.", href: "/admin" },
            { title: "Login Hub", detail: "Enter through Discord, Google, email, and role-aware access routes.", href: "/login" },
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
          description="The player dashboard route is ready as a first-class platform lane for profile claims, stats, match history, and future fantasy participation."
          actions={
            <>
              <Link href="/login" className="btn-primary">
                Login to Continue
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
            <SectionHeader eyebrow="Player Features" title="What players will unlock here" description="This dashboard is reserved for personal stats, match history, profile claims, and fantasy access once player accounts are enabled." />
            <div className="mt-5 grid gap-3">
              {[
                "Claim public player profile",
                "View personal stats and form",
                "Track match and event history",
                "Join future fantasy systems",
              ].map((item) => (
                <div key={item} className="rounded-card border border-white/[0.08] bg-bg-primary px-4 py-3 text-sm text-white">
                  {item}
                </div>
              ))}
            </div>
          </div>
          <div className="esports-card p-6">
            <SectionHeader eyebrow="Flagship Example" title={spotlightPlayer?.pubgName ?? "Top player pending"} description="A flagship player profile preview makes the dashboard direction feel grounded in real data." />
            {spotlightPlayer ? (
              <div className="mt-5 grid gap-3 sm:grid-cols-4">
                <MetricCard label="Kills" value={spotlightPlayer.kills} compact tone="blue" />
                <MetricCard label="Damage" value={spotlightPlayer.damage} compact tone="green" />
                <MetricCard label="Matches" value={spotlightPlayer.matches} compact />
                <MetricCard label="Form" value={spotlightPlayer.formLabel} compact tone="yellow" />
              </div>
            ) : (
              <div className="mt-5">
                <EmptyState title="Player preview pending" description="A flagship player preview will appear here when tracked data is available." />
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

export function PlatformLoginPage() {
  return (
    <main className="page-shell pb-12 pt-6">
      <div className="page-stack">
        <PageHero
          badge="Login"
          title={
            <>
              Enter the platform
              <br />
              through the right role
            </>
          }
          description="Bravo is being structured around Supabase Auth with Discord, Google, and email entry points, while preserving clear route-level access for admins, team IGLs, and future player roles."
          actions={
            <>
              <Link href="/dashboard" className="btn-primary">
                Dashboard Index
              </Link>
              <Link href="/pubg/access" className="btn-secondary">
                PUBG Access
              </Link>
            </>
          }
          stats={[
            { label: "Auth Provider", value: "Supabase Auth", tone: "blue" },
            { label: "Discord", value: "Planned", tone: "yellow" },
            { label: "Google", value: "Planned", tone: "green" },
            { label: "Email", value: "Planned", tone: "red" },
          ]}
        />

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            { title: "Discord Login", detail: "Future low-friction player and community sign-in flow." },
            { title: "Google Login", detail: "Broad user onboarding for players, staff, and partners." },
            { title: "Email Login", detail: "Baseline universal auth path for serious platform operations." },
            { title: "Role Routing", detail: "Admins, IGLs, and players all get clear post-login destinations." },
          ].map((item) => (
            <div key={item.title} className="rounded-card border border-white/[0.08] bg-bg-card p-5">
              <p className="font-display text-lg font-black uppercase text-white">{item.title}</p>
              <p className="mt-3 text-sm text-text-muted">{item.detail}</p>
            </div>
          ))}
        </section>

        <section className="grid gap-6 xl:grid-cols-[1fr,1fr]">
          <div className="esports-card p-6">
            <SectionHeader eyebrow="Current Access" title="Routes already in use" description="These are live today and should remain easy to discover." />
            <div className="mt-5 grid gap-3">
              <Link href="/admin" className="rounded-card border border-white/[0.08] bg-bg-primary p-4 transition hover:border-accent-blue/30 hover:bg-bg-hover">
                <p className="font-display text-sm font-black uppercase text-white">Admin Panel</p>
              </Link>
              <Link href="/team" className="rounded-card border border-white/[0.08] bg-bg-primary p-4 transition hover:border-accent-blue/30 hover:bg-bg-hover">
                <p className="font-display text-sm font-black uppercase text-white">Team IGL Panel</p>
              </Link>
              <Link href="/dashboard/player" className="rounded-card border border-white/[0.08] bg-bg-primary p-4 transition hover:border-accent-blue/30 hover:bg-bg-hover">
                <p className="font-display text-sm font-black uppercase text-white">Player Dashboard</p>
              </Link>
            </div>
          </div>

          <div className="esports-card p-6">
            <SectionHeader eyebrow="Future Access" title="Role expansion map" description="Future roles stay visible so the platform expansion feels deliberate." />
            <div className="mt-5 grid gap-3">
              {["Coach", "Caster", "Organizer", "Sponsor Contact"].map((item) => (
                <div key={item} className="rounded-card border border-dashed border-white/10 bg-bg-primary px-4 py-3 text-sm text-white">
                  {item}
                </div>
              ))}
            </div>
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
              <Link href="/dashboard/player" className="btn-secondary">
                Player Dashboard
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
