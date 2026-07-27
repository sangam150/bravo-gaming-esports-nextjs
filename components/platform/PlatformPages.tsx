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
import ManagedImage from "@/components/ui/ManagedImage";
import TeamAvatar from "@/components/ui/TeamAvatar";
import { BRAVO_DISCORD_URL } from "@/lib/brand-links";
import type {
  PlatformArticle,
  PlatformEvent,
  PlatformGame,
  PlatformHubData,
  PlatformMatch,
  PlatformMediaItem,
  PlatformOrganization,
  PlatformSponsorProfile,
} from "@/lib/platform-hub";
import type { PubgHubDataset } from "@/lib/pubg-hub";
import { getSiteUrl } from "@/lib/site";
import Link from "next/link";

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

function HeroActionLink({ href, label, className }: { href: string; label: string; className: string }) {
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
    <nav
      aria-label="Breadcrumb"
      className="flex flex-wrap items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-text-muted"
    >
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

function DetailTrustBar({ items, title, path, updatedAt }: { items: BreadcrumbItem[]; title: string; path: string; updatedAt?: string }) {
  const absoluteUrl = buildAbsoluteUrl(path);
  const updatedLabel = formatUpdatedTimestamp(updatedAt);
  const shareText = `${title} | Bravo Gaming Esports`;

  return (
    <section className="rounded-card border border-white/[0.08] bg-bg-card px-5 py-4">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="space-y-2">
          <DetailBreadcrumbs items={items} />
          {updatedLabel ? <p className="text-xs text-text-muted">Last updated {updatedLabel}</p> : null}
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

function PlatformStatusPill({ status }: { status: PlatformEvent["status"] | PlatformMatch["status"] }) {
  const className =
    status === "live"
      ? "border-accent-red/30 bg-accent-red/10 text-accent-red"
      : status === "completed"
        ? "border-accent-green/30 bg-accent-green/10 text-accent-green"
        : status === "planned"
          ? "border-accent-yellow/30 bg-accent-yellow/10 text-accent-yellow"
          : "border-accent-blue/30 bg-accent-blue/10 text-accent-blue";

  const label = status === "live" ? "Ongoing" : status === "completed" ? "Completed" : status === "planned" ? "Planned" : "Upcoming";

  return (
    <span
      className={joinClasses(
        "inline-flex items-center rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em]",
        className,
      )}
    >
      {label}
    </span>
  );
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

  const label = status === "flagship" ? "Flagship" : status === "active" ? "Active" : status === "building" ? "Building" : "Planned";

  return (
    <span
      className={joinClasses(
        "inline-flex items-center rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em]",
        className,
      )}
    >
      {label}
    </span>
  );
}

function CategoryPill({ label }: { label: string }) {
  return (
    <span className="rounded-full border border-white/10 bg-bg-primary px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-text-muted">
      {label}
    </span>
  );
}

function getEventDetailHref(event: PlatformEvent) {
  return `/events/${event.slug}`;
}

function canRegisterForEvent(event?: PlatformEvent | null) {
  return Boolean(event && event.state === "published" && event.status === "upcoming");
}

function getEventRegistrationHref(event?: PlatformEvent | null) {
  return event && canRegisterForEvent(event) ? `/teams/register?tournament=${event.id}` : "/teams/register";
}

function getEventRulesHref() {
  return "/rules";
}

function getEventPrizeLabel(event: PlatformEvent) {
  const prizePool = event.prizePool.trim();
  return prizePool && prizePool.toLowerCase() !== "tbd" ? prizePool : "Prize Pool To Be Announced";
}

function getEventSlotsLabel(event: PlatformEvent) {
  return event.teamsCount > 0 ? `${formatNumber(event.teamsCount)} teams confirmed` : "Slots to be announced";
}

function getEventRegistrationLabel(event: PlatformEvent) {
  if (event.status === "live" || event.status === "completed") {
    return "Registration closed";
  }

  if (event.status === "planned") {
    return "Registration Opening Soon";
  }

  return "Registration through Bravo team registration";
}

function getEventStatusLabel(status: PlatformEvent["status"]) {
  return status === "live" ? "Ongoing" : status === "completed" ? "Completed" : "Upcoming";
}

function getEventMatchSummaryLabel(event: PlatformEvent) {
  if (event.matchesCount > 0) {
    return `${formatNumber(event.matchesCount)} ${event.matchesCount === 1 ? "Match" : "Matches"} Published`;
  }

  if (event.status === "completed") {
    return "Results Pending";
  }

  if (event.status === "live") {
    return "Live Updates Pending";
  }

  return "Schedule Pending";
}

function normalizeSponsorLabel(value?: string | null) {
  if (!value) {
    return null;
  }

  const words = value.trim().split(/\s+/).filter(Boolean);
  const dedupedWords: string[] = [];

  for (const word of words) {
    if (dedupedWords.at(-1)?.toLowerCase() === word.toLowerCase()) {
      continue;
    }

    dedupedWords.push(word);
  }

  return dedupedWords.join(" ");
}

function sponsorKindLabel(kind: PlatformSponsorProfile["kind"]) {
  return kind === "design" ? "Design Partner" : kind === "sponsor" ? "Official Sponsor" : "Official Partner";
}

function sponsorTierLabel(sponsor: PlatformSponsorProfile) {
  const normalizedTier = normalizeSponsorLabel(sponsor.tier);

  if (!normalizedTier || normalizedTier.toLowerCase() === "partner") {
    return sponsorKindLabel(sponsor.kind);
  }

  return normalizedTier;
}

function sponsorSupportingLabel(sponsor: PlatformSponsorProfile) {
  const roleLabel = sponsorKindLabel(sponsor.kind);
  const tierLabel = sponsorTierLabel(sponsor);

  return roleLabel.toLowerCase() === tierLabel.toLowerCase() ? null : roleLabel;
}

function NewsCard({ article }: { article: PlatformArticle }) {
  return (
    <Link
      href={`/news/${article.slug}`}
      className="block rounded-card border border-white/[0.08] bg-bg-card p-5 transition hover:border-accent-blue/30 hover:bg-bg-hover"
    >
      {article.imageUrl ? (
        <ManagedImage
          src={article.imageUrl}
          alt={article.title}
          sizes="(min-width: 1280px) 30vw, (min-width: 768px) 45vw, 100vw"
          wrapperClassName="mb-4 h-44 rounded-card border border-white/[0.08]"
          className="object-cover"
        />
      ) : null}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <CategoryPill label={article.category} />
        <p className="text-xs uppercase tracking-[0.16em] text-text-muted">{formatContentDate(article.date)}</p>
      </div>
      <h3 className="mt-4 font-display text-xl font-black uppercase text-white">{article.title}</h3>
      <p className="mt-3 text-sm leading-relaxed text-text-muted">{article.summary}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {article.tags.slice(0, 3).map((tag) => (
          <span
            key={tag}
            className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-text-muted"
          >
            {tag}
          </span>
        ))}
      </div>
    </Link>
  );
}

function EventCard({ event }: { event: PlatformEvent }) {
  const showResultsCta = event.status === "completed" && Boolean(event.analyticsHref);
  const eventTypeClass = /tournament|cup|championship|league|final/i.test(event.type)
    ? "border-accent-yellow/30 bg-accent-yellow/10 text-accent-yellow"
    : "border-accent-blue/30 bg-accent-blue/10 text-accent-blue-light";

  return (
    <article className="flex h-full flex-col rounded-card border border-white/[0.08] bg-bg-card p-5 transition hover:border-accent-blue/30 hover:bg-bg-hover">
      <div className="mb-4 overflow-hidden rounded-card border border-white/[0.08] bg-bg-primary">
        {event.bannerUrl ? (
          <ManagedImage
            src={event.bannerUrl}
            alt={event.name}
            sizes="(min-width: 1280px) 320px, (min-width: 768px) 45vw, 100vw"
            wrapperClassName="h-36 w-full"
            className="object-cover"
          />
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
          <span
            className={joinClasses(
              "inline-flex items-center rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em]",
              eventTypeClass,
            )}
          >
            {event.type}
          </span>
          <PlatformStatusPill status={event.status} />
        </div>
      </div>
      <p className="mt-4 text-sm leading-relaxed text-text-muted">{event.summary}</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div>
          <p className="text-[10px] uppercase tracking-[0.16em] text-text-muted">Date</p>
          <p className="mt-1 text-sm text-white">{formatDateRange(event.startDate, event.endDate)}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-[0.16em] text-text-muted">Location / Region</p>
          <p className="mt-1 text-sm text-white">{event.region}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-[0.16em] text-text-muted">Format</p>
          <p className="mt-1 text-sm text-white">{event.gameName}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-[0.16em] text-text-muted">Slots</p>
          <p className="mt-1 text-sm text-white">{getEventSlotsLabel(event)}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-[0.16em] text-text-muted">Registration</p>
          <p className="mt-1 text-sm text-white">{getEventRegistrationLabel(event)}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-[0.16em] text-text-muted">Prize Pool</p>
          <p className="mt-1 text-sm text-white">{getEventPrizeLabel(event)}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-[0.16em] text-text-muted">Status</p>
          <p className="mt-1 text-sm text-white">{getEventStatusLabel(event.status)}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-[0.16em] text-text-muted">Match Updates</p>
          <p className="mt-1 text-sm text-white">{getEventMatchSummaryLabel(event)}</p>
        </div>
      </div>
      <div className="mt-auto flex flex-wrap gap-2 pt-5">
        <Link href={getEventDetailHref(event)} className="btn-primary">
          View Event
        </Link>
        {canRegisterForEvent(event) ? (
          <Link href={getEventRegistrationHref(event)} className="btn-secondary">
            Register Team
          </Link>
        ) : null}
        <Link href={getEventRulesHref()} className="btn-secondary">
          View Rules
        </Link>
        {showResultsCta ? (
          <Link href={event.analyticsHref ?? getEventDetailHref(event)} className="btn-secondary">
            View Results
          </Link>
        ) : null}
      </div>
    </article>
  );
}

function MatchCard({ match }: { match: PlatformMatch }) {
  const href =
    match.gameSlug === "pubg-pc" && match.eventSlug
      ? buildHref(`/pubg/events/${match.eventSlug}`, { tab: "matches" })
      : match.gameSlug === "pubg-pc"
        ? "/pubg/results"
        : `/matches/${match.id}`;

  return (
    <Link
      href={href}
      className="block rounded-card border border-white/[0.08] bg-bg-card p-5 transition hover:border-accent-blue/30 hover:bg-bg-hover"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-accent-blue">{match.gameName}</p>
          <h3 className="mt-2 font-display text-lg font-black uppercase text-white">
            {match.teamA} vs {match.teamB}
          </h3>
        </div>
        <PlatformStatusPill status={match.status} />
      </div>
      <p className="mt-3 text-sm text-text-muted">
        {match.eventName} | {match.stageLabel}
      </p>
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
    <Link
      href={game.primaryHref}
      className="block rounded-card border border-white/[0.08] bg-bg-card p-5 transition hover:border-accent-blue/30 hover:bg-bg-hover"
    >
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

function OrganizationCard({ organization }: { organization: PlatformOrganization }) {
  return (
    <Link
      href={`/organizations/${organization.slug}`}
      className="block rounded-card border border-white/[0.08] bg-bg-card p-5 transition hover:border-accent-blue/30 hover:bg-bg-hover"
    >
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

export function PlatformGamesPage({ hub }: { hub: PlatformHubData }) {
  return (
    <main className="page-shell pb-12 pt-6">
      <div className="page-stack">
        <PageHero
          badge="Games Hub"
          title={
            <>
              Every game gets
              <br />a scalable Bravo home
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
            {
              label: "Flagship Titles",
              value: hub.games.filter((game) => game.flagship).length,
              tone: "green",
            },
            {
              label: "Building Lanes",
              value: hub.games.filter((game) => game.status === "building").length,
              tone: "yellow",
            },
            {
              label: "Planned Lanes",
              value: hub.games.filter((game) => game.status === "planned").length,
              tone: "red",
            },
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

export function PlatformGameDetailPage({ hub, game, pubg }: { hub: PlatformHubData; game: PlatformGame; pubg?: PubgHubDataset | null }) {
  const relatedEvents = hub.events.filter((event) => event.gameSlug === game.slug).slice(0, 4);
  const relatedNews = hub.news
    .filter((article) => article.gameSlug === game.slug || article.category === game.name || article.category === game.shortName)
    .slice(0, 3);
  const relatedMatches = hub.matches.filter((match) => match.gameSlug === game.slug).slice(0, 4);
  const topTeam = game.slug === "pubg-pc" ? (pubg?.teams[0] ?? null) : null;
  const topPlayer = game.slug === "pubg-pc" ? (pubg?.players[0] ?? null) : null;
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
            {
              label: "Tracked Matches",
              value: game.trackedMatches,
              tone: "green",
            },
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
                  Join the Bravo community now to follow launch announcements, register interest, and help shape which events, teams, and
                  storylines open this title first.
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
                  This hub will stay intentionally lightweight until real Bravo coverage begins. No fake stats, empty tables, or filler
                  standings will be shown here.
                </p>
              </div>
            </div>
          </section>
        ) : null}

        {!futureTitle && game.slug === "pubg-pc" && topTeam && topPlayer ? (
          <section className="grid gap-6 xl:grid-cols-[1fr,1fr]">
            <div className="esports-card p-6">
              <SectionHeader
                eyebrow="Top Team"
                title={topTeam.name}
                description="The current flagship leaderboard leader across tracked PUBG coverage."
              />
              <div className="mt-5 grid gap-3 sm:grid-cols-4">
                <MetricCard label="Points" value={topTeam.totalPoints} compact tone="green" />
                <MetricCard label="Kills" value={topTeam.kills} compact tone="blue" />
                <MetricCard label="Matches" value={topTeam.matches} compact />
                <MetricCard label="Form" value={topTeam.formLabel} compact tone="yellow" />
              </div>
            </div>
            <div className="esports-card p-6">
              <SectionHeader
                eyebrow="Top Player"
                title={topPlayer.pubgName}
                description="The highest-output player currently leading the flagship public player market."
              />
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
              <SectionHeader
                eyebrow="Events"
                title="Game event lane"
                description="Every game plugs into the same event model and can grow from planned to fully tracked without a redesign."
              />
              <div className="mt-5 grid gap-3">
                {relatedEvents.map((event) => (
                  <EventCard key={event.id} event={event} />
                ))}
                {relatedEvents.length === 0 ? (
                  <EmptyState
                    title="No events scheduled right now"
                    description="Upcoming tournaments and registration windows will be posted here soon."
                  />
                ) : null}
              </div>
            </div>
            <div className="esports-card p-6">
              <SectionHeader
                eyebrow="Matches"
                title="Game match center lane"
                description="Upcoming, live, completed, and planned matches all stay in one official match center."
              />
              <div className="mt-5 grid gap-3">
                {relatedMatches.map((match) => (
                  <MatchCard key={match.id} match={match} />
                ))}
                {relatedMatches.length === 0 ? (
                  <EmptyState
                    title="No match results have been published yet"
                    description="Results will appear once they are officially verified."
                  />
                ) : null}
              </div>
            </div>
          </section>
        ) : null}

        {!futureTitle ? (
          <section className="esports-card p-6">
            <SectionHeader
              eyebrow="News"
              title="Game-specific editorial coverage"
              description="Game hubs can collect their own event stories, roster updates, scene coverage, and platform announcements."
            />
            <div className="mt-6 grid gap-4 xl:grid-cols-3">
              {relatedNews.map((article) => (
                <NewsCard key={article.id} article={article} />
              ))}
              {relatedNews.length === 0 ? (
                <div className="xl:col-span-3">
                  <EmptyState
                    title="No articles have been published yet"
                    description="Stay tuned for upcoming announcements and updates."
                  />
                </div>
              ) : null}
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
  const pubgEvent = event.gameSlug === "pubg-pc" ? (pubg?.events.find((candidate) => candidate.slug === event.slug) ?? null) : null;
  const relatedSponsors = hub.sponsors.filter(
    (sponsor) =>
      (sponsor.eventSlugs.includes(event.slug) || (event.sponsorName ? sponsor.name === event.sponsorName : false)) &&
      (sponsor.showOnEventPage || (event.sponsorName ? sponsor.name === event.sponsorName : false)),
  );
  const eventQuickLinks = [
    { label: "Overview", href: "#overview" },
    { label: "Schedule", href: "#schedule" },
    pubgEvent ? { label: "Standings", href: "#standings" } : null,
    { label: "Teams", href: "#teams" },
    { label: "Rules", href: "#rules" },
    { label: "Stream", href: "#stream" },
  ].filter((item): item is { label: string; href: string } => Boolean(item));

  return (
    <main className="page-shell pb-12 pt-6">
      <div className="page-stack">
        <PageHero
          badge={`${event.gameName} | ${event.type}`}
          title={<>{event.name}</>}
          description={event.summary}
          actions={
            <>
              {canRegisterForEvent(event) ? (
                <Link href={getEventRegistrationHref(event)} className="btn-primary">
                  Register Team
                </Link>
              ) : event.analyticsHref ? (
                <Link href={event.analyticsHref} className="btn-primary">
                  {event.gameSlug === "pubg-pc" ? "View Results" : "Open Game Hub"}
                </Link>
              ) : (
                <Link href={getEventDetailHref(event)} className="btn-primary">
                  View Event
                </Link>
              )}
              <Link href={getEventRulesHref()} className="btn-secondary">
                View Rules
              </Link>
              <Link href="/events" className="btn-secondary">
                Back to events
              </Link>
              {event.analyticsHref && !canRegisterForEvent(event) ? (
                <Link href={event.analyticsHref} className="btn-secondary">
                  {event.gameSlug === "pubg-pc" ? "Open full analytics" : "Open game hub"}
                </Link>
              ) : null}
            </>
          }
          stats={[
            {
              label: "Date",
              value: formatDateRange(event.startDate, event.endDate),
              tone: "blue",
            },
            { label: "Format", value: event.gameName, tone: "green" },
            {
              label: "Registration",
              value: getEventRegistrationLabel(event),
              tone: "yellow",
            },
            {
              label: "Status",
              value: getEventStatusLabel(event.status),
              tone: "red",
            },
          ]}
          aside={
            <div className="space-y-4">
              {event.bannerUrl ? (
                <ManagedImage
                  src={event.bannerUrl}
                  alt={event.name}
                  sizes="(min-width: 1280px) 360px, 100vw"
                  wrapperClassName="h-40 rounded-card border border-white/[0.08] bg-black/20"
                  className="object-cover"
                />
              ) : null}
              <div>
                <p className="section-title">Tournament Overview</p>
                <h2 className="mt-2 font-display text-2xl font-black uppercase text-white">Clean public event page</h2>
              </div>
              <div className="flex flex-wrap gap-2">
                <PlatformStatusPill status={event.status} />
              </div>
              <div className="rounded-card border border-white/[0.08] bg-black/20 p-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-text-muted">Quick navigation</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {eventQuickLinks.map((item) => (
                    <CategoryPill key={item.label} label={item.label} />
                  ))}
                </div>
              </div>
            </div>
          }
        />

        <DetailTrustBar
          items={[{ label: "Home", href: "/" }, { label: "Events", href: "/events" }, { label: event.name }]}
          title={event.name}
          path={`/events/${event.slug}`}
          updatedAt={event.updatedAt ?? event.startDate}
        />

        <nav className="sticky top-20 z-20 xl:hidden">
          <div className="flex gap-2 overflow-x-auto rounded-[24px] border border-white/[0.08] bg-[#09111b]/95 p-2 shadow-[0_18px_60px_rgba(0,0,0,0.35)] backdrop-blur">
            {eventQuickLinks.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="shrink-0 rounded-full border border-white/10 bg-black/20 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.14em] text-text-muted transition hover:border-accent-blue/30 hover:bg-accent-blue/10 hover:text-accent-blue"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </nav>

        <section className="grid gap-6 xl:grid-cols-[1fr,1fr]">
          <div id="overview" className="esports-card scroll-mt-32 p-6">
            <SectionHeader
              eyebrow="Overview"
              title="Event summary and schedule"
              description="Schedule, status, and public event context stay visible in one place."
            />
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <MetricCard label="Start" value={formatDate(event.startDate)} compact tone="blue" />
              <MetricCard label="End" value={event.endDate ? formatDate(event.endDate) : "TBD"} compact tone="green" />
              <MetricCard label="Organizer" value={event.organizerName} compact tone="yellow" />
              <MetricCard label="Point System" value={event.pointSystemName ?? "Pending"} compact tone="red" />
            </div>
            <p className="mt-5 text-sm leading-relaxed text-text-muted">{event.summary}</p>
          </div>

          <div id="schedule" className="esports-card scroll-mt-32 p-6">
            <SectionHeader
              eyebrow="Schedule"
              title="Match and broadcast context"
              description="These details anchor the event even when some deeper modules are still planned."
            />
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
                <EmptyState
                  title={event.status === "completed" ? "Results are pending publication" : "Schedule details are pending"}
                  description={
                    event.status === "completed"
                      ? "Official match results will appear here after Bravo verification is complete."
                      : "Official room times, match order, and broadcast timing will appear here once they are confirmed."
                  }
                />
              ) : null}
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.1fr,0.9fr]">
          <div id="teams" className="esports-card scroll-mt-32 p-6">
            <SectionHeader
              eyebrow="Teams"
              title="Registration and team access"
              description="Registration, confirmed teams, and contact support stay visible in one clean tournament section."
            />
            <div className="mt-5 rounded-card border border-white/[0.08] bg-bg-primary p-5">
              <p className="text-sm leading-7 text-text-muted">
                After registration, our admin team reviews your team details and confirms your slot through official channels.
              </p>
              {pubgEvent?.standings.length ? (
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  {pubgEvent.standings.slice(0, 6).map((row) => (
                    <div key={row.teamId} className="rounded-card border border-white/[0.08] bg-black/20 px-4 py-3">
                      <p className="font-semibold text-white">
                        #{row.rank} {row.teamName}
                      </p>
                      <p className="mt-1 text-xs uppercase tracking-[0.16em] text-text-muted">
                        {formatNumber(row.totalPoints)} pts | {formatNumber(row.kills)} kills
                      </p>
                    </div>
                  ))}
                </div>
              ) : null}
              <div className="mt-5 flex flex-wrap gap-3">
                {canRegisterForEvent(event) ? (
                  <Link href={getEventRegistrationHref(event)} className="btn-primary">
                    Register Team
                  </Link>
                ) : null}
                <Link href={getEventRulesHref()} className="btn-secondary">
                  View Rules
                </Link>
                <Link href="/contact" className="btn-secondary">
                  Contact Bravo
                </Link>
              </div>
            </div>
          </div>

          <div id="rules" className="esports-card scroll-mt-32 p-6">
            <SectionHeader
              eyebrow="Rules"
              title="Rules, anti-cheat, and support"
              description="Core competition links stay visible without crowding the event page with internal-style labels."
            />
            <div className="mt-5 flex flex-wrap gap-2">
              <Link href="/rules" className="btn-secondary">
                Rules
              </Link>
              <Link href="/anti-cheat" className="btn-secondary">
                Anti-Cheat
              </Link>
              <Link href="/sponsor-kit" className="btn-secondary">
                Sponsor Inquiry
              </Link>
              <a href={BRAVO_DISCORD_URL} target="_blank" rel="noreferrer" className="btn-secondary">
                Official Discord
              </a>
            </div>
          </div>
        </section>

        <section id="stream" className="esports-card scroll-mt-32 p-6">
          <SectionHeader
            eyebrow="Stream"
            title="Watch live coverage and follow updates"
            description="Broadcast, Discord, and results links stay ready whether the lobby is upcoming, live, or completed."
          />
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href={event.streamHref ?? "/live-stream"} className="btn-primary">
              Watch Live
            </Link>
            {event.analyticsHref ? (
              <Link href={event.analyticsHref} className="btn-secondary">
                View Results
              </Link>
            ) : null}
            <a href={BRAVO_DISCORD_URL} target="_blank" rel="noreferrer" className="btn-secondary">
              Join Discord
            </a>
            <Link href="/events" className="btn-secondary">
              Browse Events
            </Link>
          </div>
        </section>

        {pubgEvent ? (
          <section id="standings" className="grid scroll-mt-32 gap-6 xl:grid-cols-[1fr,1fr]">
            <div className="esports-card p-6">
              <SectionHeader
                eyebrow="Standings Preview"
                title="Flagship event standings"
                description="PUBG events link back into the deeper Bravo analytics layer while still showing key public context here."
              />
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
              <SectionHeader
                eyebrow="Player Preview"
                title="Flagship event player table"
                description="Top player rows are visible here while the full event analytics live deeper in the PUBG hub."
              />
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
            <SectionHeader
              eyebrow="Event Modules"
              title="Statistics, media, sponsors, and rules"
              description="This event route already exposes the public structure every future game hub will need."
            />
            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {["Standings and rankings", "Teams and players", "Matches and schedule", "Statistics, media, sponsors, and rules"].map(
                (item) => (
                  <div key={item} className="rounded-card border border-white/[0.08] bg-bg-primary p-4 text-sm text-white">
                    {item}
                  </div>
                ),
              )}
            </div>
          </section>
        )}

        {relatedSponsors.length > 0 ? (
          <section id="sponsors" className="esports-card scroll-mt-32 p-6">
            <SectionHeader
              eyebrow="Sponsor Context"
              title="Assigned sponsors and partners"
              description="Event-level sponsor visibility is now part of the core public information model."
            />
            <div className="mt-5 grid gap-4 xl:grid-cols-2">
              {relatedSponsors.map((sponsor) => (
                <div key={sponsor.id} className="rounded-card border border-white/[0.08] bg-bg-primary p-4">
                  {(sponsor.bannerUrl ?? sponsor.designAssetUrl) ? (
                    <ManagedImage
                      src={sponsor.bannerUrl ?? sponsor.designAssetUrl ?? ""}
                      alt={sponsor.name}
                      sizes="(min-width: 1280px) 40vw, 100vw"
                      wrapperClassName="mb-4 h-36 rounded-card border border-white/[0.08]"
                      className="object-cover"
                    />
                  ) : null}
                  <div className="flex items-center gap-3">
                    {sponsor.logoUrl ? (
                      <ManagedImage
                        src={sponsor.logoUrl}
                        alt={sponsor.name}
                        sizes="56px"
                        wrapperClassName="h-14 w-14 rounded-card border border-white/10 bg-black/20"
                        className="object-contain p-2"
                      />
                    ) : null}
                    <div>
                      <div className="flex flex-wrap gap-2">
                        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-accent-blue">{sponsorTierLabel(sponsor)}</p>
                        {sponsorSupportingLabel(sponsor) ? (
                          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-text-muted">
                            {sponsorSupportingLabel(sponsor)}
                          </p>
                        ) : null}
                      </div>
                      <p className="mt-1 font-display text-lg font-black uppercase text-white">{sponsor.name}</p>
                    </div>
                  </div>
                  <p className="mt-4 text-sm leading-relaxed text-text-muted">{sponsor.description}</p>
                  <div className="mt-4 flex flex-wrap gap-3">
                    <Link href={`/sponsors/${sponsor.slug}`} className="btn-secondary">
                      Open Profile
                    </Link>
                    {sponsor.websiteUrl ? <HeroActionLink href={sponsor.websiteUrl} label="Visit Website" className="btn-primary" /> : null}
                    {sponsor.socialUrl ? <HeroActionLink href={sponsor.socialUrl} label="Open Social" className="btn-secondary" /> : null}
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
  const monthly = [...hub.calendar].sort((firstValue, secondValue) => firstValue.date.localeCompare(secondValue.date)).slice(0, 12);

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
            {
              label: "Calendar Items",
              value: hub.calendar.length,
              tone: "blue",
            },
            {
              label: "Events",
              value: hub.calendar.filter((item) => item.type === "Event").length,
              tone: "green",
            },
            {
              label: "Matches",
              value: hub.calendar.filter((item) => item.type === "Match").length,
              tone: "yellow",
            },
            {
              label: "Games",
              value: new Set(hub.calendar.map((item) => item.gameSlug)).size,
              tone: "red",
            },
          ]}
        />

        <section className="grid gap-6 xl:grid-cols-[1fr,1fr]">
          <div className="esports-card p-6">
            <SectionHeader
              eyebrow="Monthly View"
              title="Next major schedule blocks"
              description="A practical monthly-style list while the visual calendar system continues to mature."
            />
            <div className="mt-5 space-y-3">
              {monthly.map((item) => (
                <Link
                  key={item.id}
                  href={item.href}
                  className="block rounded-card border border-white/[0.08] bg-bg-primary p-4 transition hover:border-accent-blue/30 hover:bg-bg-hover"
                >
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
            <SectionHeader
              eyebrow="Weekly Focus"
              title="Immediate upcoming windows"
              description="Useful for teams, players, organizers, and fans who just need the next live cluster."
            />
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
            {
              label: "Active Rosters",
              value: pubg.teams.filter((team) => team.currentRoster.length > 0).length,
              tone: "green",
            },
            {
              label: "Regions",
              value: new Set(pubg.teams.map((team) => team.region).filter(Boolean)).size,
              tone: "yellow",
            },
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
            <input
              aria-label="Search teams"
              name="q"
              defaultValue={query}
              className="input-esports h-11"
              placeholder="Search team, tag, or region"
            />
            <select aria-label="Filter teams by game" name="game" defaultValue={game} className="input-esports h-11">
              <option value="all">All game titles</option>
              {hub.games.map((item) => (
                <option key={item.slug} value={item.slug}>
                  {item.name}
                </option>
              ))}
            </select>
            <select aria-label="Sort teams" name="sort" defaultValue={sort} className="input-esports h-11">
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
                title={
                  game !== "all" && game !== "pubg-pc" ? "Teams will appear after registration is approved." : "No teams match this filter"
                }
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
            {
              label: "Teams Represented",
              value: new Set(pubg.players.map((player) => player.currentTeamId).filter(Boolean)).size,
              tone: "green",
            },
            {
              label: "MVP Count",
              value: pubg.players.reduce((sum, player) => sum + player.mvpCount, 0),
              tone: "yellow",
            },
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
            <input
              aria-label="Search players"
              name="q"
              defaultValue={query}
              className="input-esports h-11"
              placeholder="Search player or team"
            />
            <select aria-label="Filter players by game" name="game" defaultValue={game} className="input-esports h-11">
              <option value="all">All game titles</option>
              {hub.games.map((item) => (
                <option key={item.slug} value={item.slug}>
                  {item.name}
                </option>
              ))}
            </select>
            <select aria-label="Sort players" name="sort" defaultValue={sort} className="input-esports h-11">
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
                title={
                  game !== "all" && game !== "pubg-pc"
                    ? "Match data will appear once results are published."
                    : "No players match this filter"
                }
                description={
                  game !== "all" && game !== "pubg-pc"
                    ? "That title is already part of the platform, and player cards will appear once public results and roster data are published."
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
            {
              label: "Live PUBG Teams",
              value: pubg.teams.length,
              tone: "green",
            },
            {
              label: "Live PUBG Players",
              value: pubg.players.length,
              tone: "yellow",
            },
            { label: "Games In Model", value: hub.games.length, tone: "red" },
          ]}
        />

        <section className="rounded-card border border-white/[0.08] bg-bg-card p-4">
          <form method="get" className="grid gap-3 xl:grid-cols-[1fr,1fr,auto]">
            <select aria-label="Ranking type" name="view" defaultValue={view} className="input-esports h-11">
              <option value="teams">Team Rankings</option>
              <option value="players">Player Rankings</option>
              <option value="games">Game Rankings</option>
              <option value="nepal">Nepal Rankings</option>
            </select>
            <select aria-label="Ranking timeframe" name="timeframe" defaultValue={timeframe} className="input-esports h-11">
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
              <SectionHeader
                eyebrow="Team Rankings"
                title="Current flagship team board"
                description="PUBG supplies the first live ranking board while the structure scales outward."
              />
            </div>
            <div className="table-scroll" tabIndex={0}>
              <table className="data-table min-w-full">
                <caption className="sr-only">Current team rankings across the Bravo platform</caption>
                <thead>
                  <tr>
                    <th scope="col">Logo</th>
                    <th scope="col">Rank</th>
                    <th scope="col">Team</th>
                    <th scope="col">WWCD</th>
                    <th scope="col">Matches</th>
                    <th scope="col">Kills</th>
                    <th scope="col">Points</th>
                    <th scope="col">Form</th>
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
              <SectionHeader
                eyebrow="Player Rankings"
                title="Current flagship player board"
                description="Kills, damage, and form anchor the first live player ranking view."
              />
            </div>
            <div className="table-scroll" tabIndex={0}>
              <table className="data-table min-w-full">
                <caption className="sr-only">Current player rankings across the Bravo platform</caption>
                <thead>
                  <tr>
                    <th scope="col">Avatar</th>
                    <th scope="col">Rank</th>
                    <th scope="col">Player</th>
                    <th scope="col">Team</th>
                    <th scope="col">Kills</th>
                    <th scope="col">Damage</th>
                    <th scope="col">Matches</th>
                    <th scope="col">Form</th>
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
                        <Link
                          href={`/pubg/players/${player.slug ?? player.id}`}
                          className="font-semibold text-white hover:text-accent-blue"
                        >
                          {player.pubgName}
                        </Link>
                      </td>
                      <td>
                        {player.currentTeamId ? (
                          <Link href={`/pubg/teams/${player.currentTeamId}`} className="text-white hover:text-accent-blue">
                            {player.currentTeamName ?? "Pending"}
                          </Link>
                        ) : (
                          (player.currentTeamName ?? "Pending")
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
              <SectionHeader
                eyebrow="Nepal Rankings"
                title="Platform-wide ecosystem status"
                description="A public-facing ranking model that can evolve into a national reference."
              />
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
              <SectionHeader
                eyebrow="Why It Matters"
                title="Toward an official ecosystem ranking"
                description="The goal is bigger than a single game leaderboard."
              />
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

export function PlatformMediaDetailPage({ hub, item }: { hub: PlatformHubData; item: PlatformMediaItem }) {
  const relatedMedia = hub.media
    .filter((candidate) => candidate.slug !== item.slug && (candidate.category === item.category || candidate.gameSlug === item.gameSlug))
    .slice(0, 3);

  return (
    <main className="page-shell pb-12 pt-6">
      <div className="page-stack">
        <PageHero
          badge={`${item.kind} | ${item.category}`}
          title={<>{item.title}</>}
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
          items={[{ label: "Home", href: "/" }, { label: "Media", href: "/media" }, { label: item.title }]}
          title={item.title}
          path={`/media/${item.slug}`}
          updatedAt={item.updatedAt ?? item.publishedAt}
        />

        <section className="grid gap-6 xl:grid-cols-[1.05fr,0.95fr]">
          <div className="esports-card p-6">
            {item.imageUrl ? (
              <ManagedImage
                src={item.imageUrl}
                alt={item.title}
                priority
                sizes="(min-width: 1280px) 60vw, 100vw"
                wrapperClassName="mb-5 h-72 rounded-card border border-white/[0.08]"
                className="object-cover"
              />
            ) : null}
            <SectionHeader
              eyebrow="Summary"
              title="Published media context"
              description="Media detail pages keep clips, posters, highlights, and VODs easy to follow."
            />
            <p className="mt-5 text-sm leading-relaxed text-text-muted">{item.summary}</p>
          </div>

          <div className="esports-card p-6">
            <SectionHeader
              eyebrow="Details"
              title="Media details"
              description="Useful context for sponsors, teams, organizers, and the community."
            />
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
          <SectionHeader
            eyebrow="Related Media"
            title="Keep exploring"
            description="Related Bravo content keeps the public media center connected instead of leaving viewers at a dead end."
          />
          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {relatedMedia.map((relatedItem) => (
              <Link
                key={relatedItem.id}
                href={`/media/${relatedItem.slug}`}
                className="block rounded-card border border-white/[0.08] bg-bg-primary p-4 transition hover:border-accent-blue/30 hover:bg-bg-hover"
              >
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
            {
              label: "Organizations",
              value: hub.organizations.length,
              tone: "blue",
            },
            {
              label: "Games Covered",
              value: new Set(hub.organizations.flatMap((organization) => organization.games)).size,
              tone: "green",
            },
            {
              label: "Featured Teams",
              value: new Set(hub.organizations.flatMap((organization) => organization.teams)).size,
              tone: "yellow",
            },
            {
              label: "Sponsor Links",
              value: new Set(hub.organizations.flatMap((organization) => organization.sponsors)).size,
              tone: "red",
            },
          ]}
        />

        <section className="grid gap-4 xl:grid-cols-2">
          {hub.organizations.map((organization) => (
            <OrganizationCard key={organization.slug} organization={organization} />
          ))}
          {hub.organizations.length === 0 ? (
            <div className="xl:col-span-2">
              <EmptyState
                title="No organization profiles are available yet"
                description="Organization profiles will be featured here once officially announced."
              />
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}

export function PlatformOrganizationDetailPage({ organization }: { hub: PlatformHubData; organization: PlatformOrganization }) {
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
              {organization.website ? <HeroActionLink href={organization.website} label="Visit Website" className="btn-primary" /> : null}
            </>
          }
          stats={[
            {
              label: "Events Hosted",
              value: organization.eventsHosted,
              tone: "blue",
            },
            {
              label: "Prize Pools",
              value: organization.prizePools,
              tone: "green",
            },
            {
              label: "Games",
              value: organization.games.length,
              tone: "yellow",
            },
            { label: "Teams", value: organization.teams.length, tone: "red" },
          ]}
        />

        <section className="grid gap-6 xl:grid-cols-[1fr,1fr]">
          <div className="esports-card p-6">
            <SectionHeader
              eyebrow="Coverage"
              title="Games and team footprint"
              description="Organization profiles now have a natural public home in the ecosystem."
            />
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
            <SectionHeader
              eyebrow="Achievements"
              title="Why this profile matters"
              description="These fields position organizations as ecosystem actors instead of hidden admin-side references."
            />
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

export function PlatformSponsorDetailPage({ hub, sponsor }: { hub: PlatformHubData; sponsor: PlatformSponsorProfile }) {
  const relatedEvents = hub.events.filter(
    (event) => sponsor.eventSlugs.includes(event.slug) || sponsor.supportedEvents.includes(event.name),
  );
  const placements = [
    sponsor.showOnHomepage ? "Homepage" : null,
    sponsor.showOnSponsorsPage ? "Sponsors page" : null,
    sponsor.showOnEventPage ? "Event pages" : null,
    sponsor.showOnPubgPage ? "PUBG page" : null,
  ].filter((item): item is string => Boolean(item));
  const tierLabel = sponsorTierLabel(sponsor);
  const supportingLabel = sponsorSupportingLabel(sponsor);

  return (
    <main className="page-shell pb-12 pt-6">
      <div className="page-stack">
        <PageHero
          badge={supportingLabel ? `${tierLabel} | ${supportingLabel}` : tierLabel}
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
              {sponsor.websiteUrl ? <HeroActionLink href={sponsor.websiteUrl} label="Visit Website" className="btn-primary" /> : null}
              {sponsor.socialUrl ? <HeroActionLink href={sponsor.socialUrl} label="Open Social" className="btn-secondary" /> : null}
            </>
          }
          stats={[
            {
              label: "Kind",
              value: sponsorKindLabel(sponsor.kind),
              tone: "blue",
            },
            {
              label: "Supported Events",
              value: sponsor.supportedEvents.length,
              tone: "green",
            },
            { label: "Placements", value: placements.length, tone: "yellow" },
            {
              label: "History Items",
              value: sponsor.partnershipHistory.length,
              tone: "red",
            },
          ]}
        />

        <DetailTrustBar
          items={[{ label: "Home", href: "/" }, { label: "Sponsors", href: "/sponsors" }, { label: sponsor.name }]}
          title={sponsor.name}
          path={`/sponsors/${sponsor.slug}`}
          updatedAt={sponsor.updatedAt}
        />

        <section className="grid gap-6 xl:grid-cols-[1fr,1fr]">
          <div className="esports-card p-6">
            <SectionHeader
              eyebrow="Assets and Placement"
              title="Brand assets and placement"
              description="Official logos, banners, and design visuals used across Bravo public coverage."
            />
            <div className="mt-5 space-y-4">
              {sponsor.bannerUrl ? (
                <ManagedImage
                  src={sponsor.bannerUrl}
                  alt={`${sponsor.name} banner`}
                  sizes="(min-width: 1280px) 50vw, 100vw"
                  wrapperClassName="h-44 rounded-card border border-white/[0.08] bg-bg-primary"
                  className="object-cover"
                />
              ) : null}
              {sponsor.designAssetUrl ? (
                <ManagedImage
                  src={sponsor.designAssetUrl}
                  alt={`${sponsor.name} design asset`}
                  sizes="(min-width: 1280px) 50vw, 100vw"
                  wrapperClassName="h-44 rounded-card border border-white/[0.08] bg-bg-primary"
                  className="object-cover"
                />
              ) : null}
              {sponsor.logoUrl ? (
                <ManagedImage
                  src={sponsor.logoUrl}
                  alt={sponsor.name}
                  sizes="320px"
                  wrapperClassName="h-24 rounded-card border border-white/[0.08] bg-bg-primary"
                  className="object-contain p-4"
                />
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
            <SectionHeader
              eyebrow="Supported Events"
              title="Where this profile shows up"
              description="Published event connections and public placements for this partner."
            />
            <div className="mt-5 grid gap-3">
              {relatedEvents.map((event) => (
                <Link
                  key={event.id}
                  href={`/events/${event.slug}`}
                  className="rounded-card border border-white/[0.08] bg-bg-primary px-4 py-3 text-sm text-white transition hover:border-accent-blue/30 hover:bg-bg-hover"
                >
                  <p className="font-semibold text-white">{event.name}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.14em] text-text-muted">
                    {event.gameName} | {formatDateRange(event.startDate, event.endDate)}
                  </p>
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
          <SectionHeader
            eyebrow="Partnership History"
            title="Relationship timeline"
            description="Key milestones and public partnership highlights for this partner."
          />
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
            {
              title: "Admin Login",
              detail: "Run platform operations, content, matches, audits, and event publishing.",
              href: "/admin/login",
            },
            {
              title: "Team Login",
              detail: "Manage roster, uploads, MOSS, and team operations for your own team.",
              href: "/team/login",
            },
            {
              title: "Login Hub",
              detail: "Choose the right Bravo role before you enter the platform.",
              href: "/login",
            },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-card border border-white/[0.08] bg-bg-card p-5 transition hover:border-accent-blue/30 hover:bg-bg-hover"
            >
              <p className="font-display text-lg font-black uppercase text-white">{item.title}</p>
              <p className="mt-3 text-sm text-text-muted">{item.detail}</p>
            </Link>
          ))}
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
            {
              label: "Future Games",
              value: hub.games.length - 1,
              tone: "yellow",
            },
            { label: "Monetization Ready", value: "Yes", tone: "blue" },
            { label: "Leaderboard Mode", value: "Planned", tone: "red" },
          ]}
        />

        <section className="grid gap-6 xl:grid-cols-[1fr,1fr]">
          <div className="esports-card p-6">
            <SectionHeader
              eyebrow="Current Lane"
              title="PUBG flagship fantasy"
              description="The first fantasy lane grows out of the strongest current data foundation."
            />
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
            <SectionHeader
              eyebrow="Future Lane"
              title="Multi-game expansion path"
              description="Once game hubs gain event and player depth, fantasy can grow without rebuilding the platform."
            />
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
