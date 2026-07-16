import Link from "next/link";
import ManagedImage from "@/components/ui/ManagedImage";
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
import { getRankedPlayers, getRankedTeams } from "@/lib/pubg-rankings";
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
      ? "Ongoing"
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

function getEventDetailHref(event: PlatformEvent) {
  return `/events/${event.slug}`;
}

function canRegisterForEvent(event?: PlatformEvent | null) {
  return Boolean(event && (event.status === "upcoming" || event.status === "planned"));
}

function getEventRegistrationHref(event?: PlatformEvent | null) {
  return event && canRegisterForEvent(event) ? `/teams/register?tournament=${event.id}` : "/teams/register";
}

function getEventRulesHref(_event?: PlatformEvent | null) {
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

function resolvePublicEventBoardEvents(hub: PlatformHubData) {
  const seen = new Set<string>();
  const events: PlatformEvent[] = [];

  for (const event of [...hub.home.featuredEvents, ...hub.home.upcomingEvents, ...hub.events]) {
    const key = event.id || event.slug;
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    events.push(event);
  }

  return events;
}

function normalizeSponsorLabel(value?: string | null) {
  if (!value) {
    return null;
  }

  const words = value
    .trim()
    .split(/\s+/)
    .filter(Boolean);
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
    <Link href={`/news/${article.slug}`} className="block rounded-card border border-white/[0.08] bg-bg-card p-5 transition hover:border-accent-blue/30 hover:bg-bg-hover">
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
          <span key={tag} className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-text-muted">
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
          <span className={joinClasses("inline-flex items-center rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em]", eventTypeClass)}>
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
        <Link href={getEventRulesHref(event)} className="btn-secondary">
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
          <ManagedImage
            src={primaryAsset}
            alt={sponsor.name}
            sizes="(min-width: 1280px) 320px, (min-width: 768px) 45vw, 100vw"
            wrapperClassName="h-40 w-full"
            className="object-cover"
          />
        ) : (
          <div className="flex h-40 items-center justify-center bg-[radial-gradient(circle_at_top_left,rgba(47,152,255,0.18),transparent_30%),linear-gradient(180deg,rgba(16,24,43,0.96),rgba(8,14,28,0.96))] font-display text-4xl font-black uppercase tracking-[0.14em] text-white">
            {initials}
          </div>
        )}
      </div>
      <div className="flex items-center gap-4">
        {sponsor.logoUrl ? (
          <ManagedImage
            src={sponsor.logoUrl}
            alt={sponsor.name}
            sizes="64px"
            wrapperClassName="h-16 w-16 rounded-card border border-white/10 bg-bg-primary"
            className="object-contain p-2"
          />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-card border border-white/10 bg-bg-primary font-display text-lg font-black uppercase text-white">
            {initials}
          </div>
        )}
        <div>
          <div className="flex flex-wrap gap-2">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-accent-blue">{sponsorTierLabel(sponsor)}</p>
            {sponsorSupportingLabel(sponsor) ? (
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-text-muted">{sponsorSupportingLabel(sponsor)}</p>
            ) : null}
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
            Visit Website
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
  return getRankedTeams(pubg.teams).slice(0, 5).map((team) => ({
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
  return getRankedPlayers(pubg.players).slice(0, 5).map((player) => ({
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

  const featuredTeamIdSet = new Set(featuredTeamIds);
  const orderedTeams = defaultCards.filter((team) => featuredTeamIdSet.has(team.id));

  return orderedTeams.length > 0 ? orderedTeams : defaultCards;
}

function resolveFeaturedPlayerCards(pubg: PubgHubDataset, featuredPlayerIds: string[]) {
  const defaultCards = buildTopPlayerCards(pubg);
  if (featuredPlayerIds.length === 0) {
    return defaultCards;
  }

  const featuredPlayerIdSet = new Set(featuredPlayerIds);
  const orderedPlayers = defaultCards.filter((player) => featuredPlayerIdSet.has(player.id));

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
    { label: "Partner Profiles", value: hub.sponsors.filter((sponsor) => sponsor.showOnSponsorsPage).length, detail: "Official partners supporting Bravo events, media, and competitive coverage.", tone: "green" as const },
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
                  <EmptyState title="No events scheduled right now" description="Upcoming tournaments and registration windows will be posted here soon." />
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
            <SectionHeader eyebrow="Match Center" title="Match center spotlight" description="Broadcasts, upcoming series, and recent results from across Bravo competitions." action={<a href={hub.home.liveFeature.href} target={hub.home.liveFeature.href.startsWith("http") ? "_blank" : undefined} rel="noreferrer" className="btn-secondary">Open Broadcast</a>} />
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
            <SectionHeader eyebrow="Featured Event" title={featuredTournament?.name ?? "Next Bravo event"} description={featuredTournament?.summary ?? "The next Bravo event will headline this block once it is announced."} />
            {featuredTournament ? (
              <div className="mt-5 space-y-4">
                {featuredTournament.bannerUrl ? (
                  <ManagedImage
                    src={featuredTournament.bannerUrl}
                    alt={featuredTournament.name}
                    sizes="(min-width: 1280px) 40vw, 100vw"
                    wrapperClassName="h-52 rounded-card border border-white/[0.08]"
                    className="object-cover"
                  />
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
                <EmptyState title="No events scheduled right now" description="Upcoming tournaments and registration windows will be posted here soon." />
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
            <SectionHeader eyebrow="Sponsor Showcase" title="Premium partner visibility" description="Sponsors, partners, and design collaborators should feel like part of the Bravo ecosystem, not an afterthought." />
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {homepageSponsors.map((sponsor) => (
                <SponsorCard key={sponsor.id} sponsor={sponsor} />
              ))}
              {homepageSponsors.length === 0 ? (
                <div className="sm:col-span-2">
                  <EmptyState title="Partner lineup coming soon" description="Official sponsors and partners will be listed here once announcements go live." />
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
                    <ManagedImage
                      src={item.imageUrl}
                      alt={item.title}
                      sizes="(min-width: 1280px) 30vw, (min-width: 768px) 45vw, 100vw"
                      wrapperClassName="mb-4 h-36 rounded-card border border-white/[0.08]"
                      className="object-cover"
                    />
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
            <ManagedImage
              src={article.imageUrl}
              alt={article.title}
              priority
              sizes="(min-width: 1280px) 960px, 100vw"
              wrapperClassName="mb-6 h-72 rounded-card border border-white/[0.08]"
              className="object-cover"
            />
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
                  <EmptyState title="No events scheduled right now" description="Upcoming tournaments and registration windows will be posted here soon." />
              ) : null}
            </div>
          </div>
          <div className="esports-card p-6">
            <SectionHeader eyebrow="Matches" title="Game match center lane" description="Upcoming, live, completed, and planned matches all stay in one official match center." />
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
  const publicEvents = resolvePublicEventBoardEvents(hub);
  const game = readSearchParam(searchParams.game, "all");
  const status = readSearchParam(searchParams.status, "all");
  const hasEvents = publicEvents.length > 0;
  const hasMultipleEvents = publicEvents.length > 1;
  const pageParam = Number.parseInt(readSearchParam(searchParams.page, "1"), 10);
  const page = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1;
  const pageSize = 12;
  const filteredEvents = publicEvents.filter((event) => {
    if (game !== "all" && event.gameSlug !== game) return false;
    if (status === "upcoming" && event.status !== "upcoming" && event.status !== "planned") return false;
    if (status !== "all" && status !== "upcoming" && event.status !== status) return false;
    return true;
  });
  const totalPages = Math.max(1, Math.ceil(filteredEvents.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paginatedEvents = filteredEvents.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const featuredEvent =
    paginatedEvents.find((event) => canRegisterForEvent(event)) ??
    paginatedEvents.find((event) => event.status === "live") ??
    paginatedEvents.find((event) => event.status === "upcoming" || event.status === "planned") ??
    paginatedEvents[0] ??
    null;
  const spotlightQueue = featuredEvent
    ? paginatedEvents.filter(
        (event) =>
          event.id !== featuredEvent.id && (event.status === "live" || event.status === "upcoming" || event.status === "planned")
      )
    : [];
  const completedArchive = featuredEvent
    ? paginatedEvents.filter((event) => event.id !== featuredEvent.id && event.status === "completed")
    : paginatedEvents.filter((event) => event.status === "completed");
  const liveCount = publicEvents.filter((event) => event.status === "live").length;
  const upcomingCount = publicEvents.filter((event) => event.status === "upcoming" || event.status === "planned").length;
  const completedCount = publicEvents.filter((event) => event.status === "completed").length;
  const heroStats = hasEvents
    ? [
        { label: "Events", value: publicEvents.length, tone: "blue" as const },
        ...(upcomingCount > 0 ? [{ label: "Upcoming", value: upcomingCount, tone: "yellow" as const }] : []),
        ...(liveCount > 0 ? [{ label: "Ongoing", value: liveCount, tone: "green" as const }] : []),
        ...(completedCount > 0 ? [{ label: "Completed", value: completedCount, tone: "red" as const }] : []),
      ].slice(0, 4)
    : undefined;
  const featuredEventCanRegister = canRegisterForEvent(featuredEvent);
  const featuredEventResultsHref = featuredEvent?.status === "completed" ? featuredEvent.analyticsHref ?? getEventDetailHref(featuredEvent) : null;

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
          description={
            hasEvents
              ? "Official Bravo event board for tournaments, scrims, schedules, results, and team registration."
              : "No official events are published yet. Tournament registration and scrim schedules will appear here soon."
          }
          actions={
            hasEvents && featuredEvent ? (
              featuredEventCanRegister ? (
                <>
                  <Link href={getEventRegistrationHref(featuredEvent)} className="btn-primary">
                    Register Team
                  </Link>
                  <Link href={getEventDetailHref(featuredEvent)} className="btn-secondary">
                    View Schedule
                  </Link>
                  <Link href={getEventRulesHref(featuredEvent)} className="btn-secondary">
                    View Rules
                  </Link>
                </>
              ) : (
                <>
                  <Link href={featuredEventResultsHref ?? getEventDetailHref(featuredEvent)} className="btn-primary">
                    {featuredEvent.status === "completed" ? "View Results" : "View Event"}
                  </Link>
                  <Link href={getEventDetailHref(featuredEvent)} className="btn-secondary">
                    View Schedule
                  </Link>
                  <Link href={getEventRulesHref(featuredEvent)} className="btn-secondary">
                    View Rules
                  </Link>
                </>
              )
            ) : (
              <>
                <a href={BRAVO_DISCORD_URL} target="_blank" rel="noreferrer" className="btn-secondary">
                  Join Discord
                </a>
                <Link href="/teams/register" className="btn-primary">
                  Register Team
                </Link>
              </>
            )
          }
          stats={heroStats}
        />

        {featuredEvent ? (
          <section className="overflow-hidden rounded-[32px] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(9,15,29,0.96),rgba(7,11,21,0.98))]">
            <div className="grid gap-0 xl:grid-cols-[0.92fr,1.08fr]">
              {featuredEvent.bannerUrl ? (
                <ManagedImage
                  src={featuredEvent.bannerUrl}
                  alt={featuredEvent.name}
                  priority
                  sizes="(min-width: 1280px) 40vw, 100vw"
                  wrapperClassName="h-72 w-full xl:h-full"
                  className="object-cover"
                />
              ) : (
                <div className="h-72 bg-[radial-gradient(circle_at_top_left,rgba(47,152,255,0.22),transparent_30%),linear-gradient(180deg,rgba(16,24,43,0.96),rgba(8,14,28,0.96))] xl:h-full" />
              )}
              <div className="p-6 sm:p-7">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="max-w-3xl">
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-accent-blue-light">Featured Tournament</p>
                    <h2 className="mt-3 font-display text-3xl font-black uppercase text-white">{featuredEvent.name}</h2>
                    <p className="mt-4 text-sm leading-7 text-text-muted">{featuredEvent.summary}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <PlatformStatusPill status={featuredEvent.status} />
                    <CategoryPill label={featuredEvent.gameName} />
                  </div>
                </div>
                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  <MetricCard label="Date" value={formatDateRange(featuredEvent.startDate, featuredEvent.endDate)} compact tone="blue" />
                  <MetricCard label="Format" value={featuredEvent.gameName} compact tone="green" />
                  <MetricCard label="Slots" value={getEventSlotsLabel(featuredEvent)} compact tone="yellow" />
                  <MetricCard label="Registration" value={getEventRegistrationLabel(featuredEvent)} compact tone="red" />
                  <MetricCard label="Prize Pool" value={getEventPrizeLabel(featuredEvent)} compact tone="blue" />
                  <MetricCard label="Status" value={getEventStatusLabel(featuredEvent.status)} compact tone="green" />
                </div>
                <div className="mt-6 flex flex-wrap gap-3">
                  {featuredEventCanRegister ? (
                    <Link href={getEventRegistrationHref(featuredEvent)} className="btn-primary">
                      Register Team
                    </Link>
                  ) : (
                    <Link href={featuredEventResultsHref ?? getEventDetailHref(featuredEvent)} className="btn-primary">
                      {featuredEvent.status === "completed" ? "View Results" : "View Event"}
                    </Link>
                  )}
                  <Link href={getEventDetailHref(featuredEvent)} className="btn-secondary">
                    View Schedule
                  </Link>
                  <Link href={getEventRulesHref(featuredEvent)} className="btn-secondary">
                    View Rules
                  </Link>
                </div>
                <p className="mt-4 max-w-2xl text-xs uppercase tracking-[0.16em] text-text-muted">
                  After registration, our admin team reviews your team details and confirms your slot through official channels.
                </p>
              </div>
            </div>
          </section>
        ) : null}

        {hasEvents && hasMultipleEvents ? (
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
                <option value="live">Ongoing</option>
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
        ) : null}

        {!hasEvents ? (
          <section className="rounded-[28px] border border-white/[0.08] bg-[radial-gradient(circle_at_top_left,rgba(20,126,245,0.18),transparent_34%),linear-gradient(180deg,rgba(11,21,33,0.96),rgba(7,11,21,0.96))] p-6">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-accent-blue-light">Event Board</p>
            <h2 className="mt-3 font-display text-2xl font-black uppercase text-white">No official events are published yet</h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-text-muted">
              Tournament registration and scrim schedules will appear here soon.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <a href={BRAVO_DISCORD_URL} target="_blank" rel="noreferrer" className="btn-secondary">
                Join Discord
              </a>
              <Link href="/teams/register" className="btn-primary">
                Register Team
              </Link>
            </div>
          </section>
        ) : paginatedEvents.length === 0 ? (
          <section className="grid gap-4 xl:grid-cols-2">
            <div className="xl:col-span-2">
              <EmptyState title="No events match this view" description="Try adjusting the game or status filters to browse the public event board." />
            </div>
          </section>
        ) : (
          <>
            {spotlightQueue.length > 0 ? (
              <section className="space-y-4">
                <SectionHeader
                  eyebrow="Event Board"
                  title="Upcoming Scrims / Tournaments"
                  description="Current public event cards stay registration-ready and link safely into the event detail flow."
                />
                <div className="grid gap-4 xl:grid-cols-2">
                  {spotlightQueue.map((event) => (
                    <EventCard key={event.id} event={event} />
                  ))}
                </div>
              </section>
            ) : null}

            {completedArchive.length > 0 ? (
              <section className="space-y-4">
                <SectionHeader
                  eyebrow="Event Archive"
                  title="Completed Events"
                  description="Published tournament and scrim history remains accessible without burying the next registration window."
                />
                <div className="grid gap-4 xl:grid-cols-2">
                  {completedArchive.map((event) => (
                    <EventCard key={event.id} event={event} />
                  ))}
                </div>
              </section>
            ) : null}
          </>
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
  const eventQuickLinks = [
    { label: "Overview", href: "#overview" },
    { label: "Schedule", href: "#schedule" },
    { label: "Registration", href: "#registration" },
    { label: "Trust", href: "#trust" },
    pubgEvent ? { label: "Standings", href: "#standings" } : null,
    relatedSponsors.length > 0 ? { label: "Sponsors", href: "#sponsors" } : null,
  ].filter((item): item is { label: string; href: string } => Boolean(item));

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
              <Link href={getEventRulesHref(event)} className="btn-secondary">
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
            { label: "Date", value: formatDateRange(event.startDate, event.endDate), tone: "blue" },
            { label: "Format", value: event.gameName, tone: "green" },
            { label: "Registration", value: getEventRegistrationLabel(event), tone: "yellow" },
            { label: "Status", value: getEventStatusLabel(event.status), tone: "red" },
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
            <SectionHeader eyebrow="Overview" title="Event summary and schedule" description="Schedule, status, and public event context stay visible in one place." />
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <MetricCard label="Start" value={formatDate(event.startDate)} compact tone="blue" />
              <MetricCard label="End" value={event.endDate ? formatDate(event.endDate) : "TBD"} compact tone="green" />
              <MetricCard label="Organizer" value={event.organizerName} compact tone="yellow" />
              <MetricCard label="Point System" value={event.pointSystemName ?? "Pending"} compact tone="red" />
            </div>
            <p className="mt-5 text-sm leading-relaxed text-text-muted">{event.summary}</p>
          </div>

          <div id="schedule" className="esports-card scroll-mt-32 p-6">
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

        <section className="grid gap-6 xl:grid-cols-[1.1fr,0.9fr]">
          <div id="registration" className="esports-card scroll-mt-32 p-6">
            <SectionHeader eyebrow="Registration" title="Register and stay tournament-ready" description="Public registration stays simple, visible, and linked to the same event promoted across the homepage and event board." />
            <div className="mt-5 rounded-card border border-white/[0.08] bg-bg-primary p-5">
              <p className="text-sm leading-7 text-text-muted">
                After registration, our admin team reviews your team details and confirms your slot through official channels.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link href={getEventRegistrationHref(event)} className="btn-primary">
                  Register Team
                </Link>
                <Link href={getEventRulesHref(event)} className="btn-secondary">
                  View Rules
                </Link>
                <Link href="/contact" className="btn-secondary">
                  Contact Bravo
                </Link>
              </div>
            </div>
          </div>

          <div id="trust" className="esports-card scroll-mt-32 p-6">
            <SectionHeader eyebrow="Trust" title="Rules, support, and official channels" description="Teams should not have to hunt for the core trust and support links around a tournament detail page." />
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

        {pubgEvent ? (
          <section id="standings" className="grid scroll-mt-32 gap-6 xl:grid-cols-[1fr,1fr]">
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
          <section id="sponsors" className="esports-card scroll-mt-32 p-6">
            <SectionHeader eyebrow="Sponsor Context" title="Assigned sponsors and partners" description="Event-level sponsor visibility is now part of the core public information model." />
            <div className="mt-5 grid gap-4 xl:grid-cols-2">
              {relatedSponsors.map((sponsor) => (
                <div key={sponsor.id} className="rounded-card border border-white/[0.08] bg-bg-primary p-4">
                  {sponsor.bannerUrl ?? sponsor.designAssetUrl ? (
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
                        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-accent-blue">
                          {sponsorTierLabel(sponsor)}
                        </p>
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
  const hasMedia = hub.media.length > 0;
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
          description={
            hasMedia
              ? "Published highlights, broadcasts, and video coverage from the Bravo public media library."
              : "Published highlights, broadcasts, and video coverage from the Bravo public media library."
          }
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
          stats={
            hasMedia
              ? [
                  { label: "Media Items", value: hub.media.length, tone: "blue" as const },
                  { label: "Featured", value: hub.media.filter((item) => item.featured).length, tone: "green" as const },
                  { label: "Categories", value: categories.length, tone: "yellow" as const },
                  { label: "Games", value: new Set(hub.media.map((item) => item.gameSlug)).size, tone: "red" as const },
                ]
              : undefined
          }
        />

        {hasMedia ? (
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
        ) : null}

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {media.map((item) => (
            <div key={item.id} className="esports-card flex h-full flex-col p-5">
              <div className="mb-4 overflow-hidden rounded-card border border-white/[0.08]">
                {item.imageUrl ? (
                  <ManagedImage
                    src={item.imageUrl}
                    alt={item.title}
                    sizes="(min-width: 1280px) 30vw, (min-width: 768px) 45vw, 100vw"
                    wrapperClassName="h-44 w-full"
                    className="object-cover"
                  />
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
          {!hasMedia ? (
            <div className="md:col-span-2 xl:col-span-3">
              <div className="rounded-[28px] border border-white/[0.08] bg-[radial-gradient(circle_at_top_left,rgba(20,126,245,0.18),transparent_34%),linear-gradient(180deg,rgba(11,21,33,0.96),rgba(7,11,21,0.96))] p-6">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-accent-blue-light">Media Queue</p>
                <h2 className="mt-3 font-display text-2xl font-black uppercase text-white">No official media has been published yet</h2>
                <p className="mt-3 max-w-3xl text-sm leading-7 text-text-muted">
                  Highlights, broadcasts, clips, and featured coverage will appear here after publication.
                </p>
                <div className="mt-5 flex flex-wrap gap-3">
                  <Link href="/news" className="btn-secondary">
                    Browse News
                  </Link>
                  <a href={BRAVO_DISCORD_URL} target="_blank" rel="noreferrer" className="btn-primary">
                    Join Discord
                  </a>
                </div>
              </div>
            </div>
          ) : media.length === 0 ? (
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
              <ManagedImage
                src={item.imageUrl}
                alt={item.title}
                priority
                sizes="(min-width: 1280px) 60vw, 100vw"
                wrapperClassName="mb-5 h-72 rounded-card border border-white/[0.08]"
                className="object-cover"
              />
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
  const leadSponsor = publicSponsors[0] ?? null;
  const supportingSponsors = publicSponsors.slice(1);

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
          description="Official partners supporting Bravo Gaming Esports, PUBG PC scrims, tournaments, broadcasts, and community events."
          actions={
            <>
              <Link href="/sponsor-kit" className="btn-primary">
                View Sponsor Kit
              </Link>
              <Link href="/tournament-partners" className="btn-secondary">
                Tournament Partners
              </Link>
              <Link href="/contact" className="btn-secondary">
                Contact Bravo
              </Link>
            </>
          }
        />

        {leadSponsor ? (
          <section className="overflow-hidden rounded-[32px] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(9,15,29,0.96),rgba(7,11,21,0.98))]">
            <div className="grid gap-0 xl:grid-cols-[0.92fr,1.08fr]">
              {sponsorPrimaryAsset(leadSponsor) ? (
                <ManagedImage
                  src={sponsorPrimaryAsset(leadSponsor) ?? ""}
                  alt={leadSponsor.name}
                  priority
                  sizes="(min-width: 1280px) 40vw, 100vw"
                  wrapperClassName="h-72 w-full xl:h-full"
                  className="object-cover"
                />
              ) : (
                <div className="flex h-72 items-center justify-center bg-[radial-gradient(circle_at_top_left,rgba(47,152,255,0.22),transparent_30%),linear-gradient(180deg,rgba(16,24,43,0.96),rgba(8,14,28,0.96))] font-display text-4xl font-black uppercase tracking-[0.14em] text-white xl:h-full">
                  {buildInitials(leadSponsor.name)}
                </div>
              )}
              <div className="p-6 sm:p-7">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="max-w-3xl">
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-accent-blue-light">
                      {sponsorTierLabel(leadSponsor)}
                    </p>
                    <h2 className="mt-3 font-display text-3xl font-black uppercase text-white">{leadSponsor.name}</h2>
                    <p className="mt-4 text-sm leading-7 text-text-muted">{leadSponsor.description}</p>
                  </div>
                  {sponsorSupportingLabel(leadSponsor) ? (
                    <CategoryPill label={sponsorSupportingLabel(leadSponsor) ?? ""} />
                  ) : null}
                </div>
                <div className="mt-6 flex flex-wrap gap-3">
                  {leadSponsor.websiteUrl ? (
                    <HeroActionLink href={leadSponsor.websiteUrl} label="Visit Website" className="btn-primary" />
                  ) : null}
                  <Link href={`/sponsors/${leadSponsor.slug}`} className="btn-secondary">
                    View Profile
                  </Link>
                </div>
              </div>
            </div>
          </section>
        ) : null}

        {supportingSponsors.length > 0 ? (
          <section className="space-y-4">
            <SectionHeader eyebrow="Official Partners" title="Published partner profiles" description="Official partner cards stay visible, credible, and linked to real profiles instead of hidden footer-only mentions." />
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {supportingSponsors.map((sponsor) => (
                <SponsorCard key={sponsor.id} sponsor={sponsor} />
              ))}
            </div>
          </section>
        ) : null}

        {publicSponsors.length === 0 ? (
          <section className="mx-auto max-w-4xl">
            <EmptyState
              title="Partner lineup coming soon"
              description="Official partner cards will include website and profile links once announcements go live."
            />
          </section>
        ) : null}

        <section className="grid gap-6 xl:grid-cols-[1fr,1fr]">
          <div className="esports-card p-6">
            <SectionHeader eyebrow="Why Partner With Bravo?" title="Why Partner With Bravo?" description="The sponsor page should explain the real tournament value without inventing numbers." />
            <div className="mt-5 grid gap-3">
              {[
                "Brand exposure on live streams",
                "Logo placement on event graphics",
                "Social media recognition",
                "Discord and community promotion",
                "Tournament partnership opportunities",
              ].map((item) => (
                <div key={item} className="rounded-card border border-white/[0.08] bg-bg-primary px-4 py-3 text-sm text-white">
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="esports-card p-6">
            <SectionHeader eyebrow="Sponsor Inquiry" title="Start a sponsor conversation" description="Contact Bravo through the public channels below to discuss stream, event, and community partnership options." />
            <div className="mt-5 flex flex-wrap gap-3">
              <Link href="/contact" className="btn-primary">
                Contact Bravo
              </Link>
              <Link href="/sponsor-kit" className="btn-secondary">
                Sponsor Kit
              </Link>
              <Link href="/tournament-partners" className="btn-secondary">
                Tournament Partners
              </Link>
              <a href={BRAVO_DISCORD_URL} target="_blank" rel="noreferrer" className="btn-secondary">
                Official Discord
              </a>
            </div>
          </div>
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
