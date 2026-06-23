import type { ReactNode } from "react";
import Link from "next/link";
import TeamAvatar from "@/components/ui/TeamAvatar";
import BravoLogo from "@/components/ui/BravoLogo";
import { EmptyState, TrendBars, formatDate, formatDateRange, formatDateTime, formatNumber } from "@/components/pubg/PubgHubUI";
import { BRAVO_DISCORD_URL } from "@/lib/brand-links";
import type { PubgHubDataset, PubgHubPlayer, PubgHubTeam } from "@/lib/pubg-hub";
import type { HomepageHeroSlideRecord } from "@/lib/platform-content";
import type {
  PlatformArticle,
  PlatformEvent,
  PlatformHubData,
  PlatformMatch,
  PlatformMediaItem,
  PlatformSponsorProfile,
} from "@/lib/platform-hub";

type FeaturedTeamCard = {
  id: string;
  slug: string;
  name: string;
  logoUrl: string | undefined;
  region: string | null | undefined;
  matches: number;
  points: number;
  kills: number;
  form: string;
  trend: number[];
  rosterSize: number;
};

type FeaturedPlayerCard = {
  id: string;
  slug: string;
  name: string;
  avatarUrl: string | undefined;
  teamName: string;
  matches: number;
  kills: number;
  avgDamage: number;
  wins: number;
  form: string;
  trend: number[];
};

type PillTone = "neutral" | "green" | "red";

const DEFAULT_SPONSOR_DESCRIPTION = "Partner details will be updated soon.";

function joinClasses(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

function isExternalHref(href: string) {
  return /^https?:\/\//i.test(href);
}

function ActionLink({
  href,
  children,
  variant = "primary",
  className,
}: {
  href: string;
  children: ReactNode;
  variant?: "primary" | "secondary" | "danger";
  className?: string;
}) {
  const sharedClassName =
    variant === "danger"
      ? "inline-flex items-center justify-center rounded-full bg-accent-red px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#ff5b4f]"
      : variant === "secondary"
        ? "inline-flex items-center justify-center rounded-full border border-white/14 bg-white/[0.03] px-4 py-2 text-sm font-semibold text-white transition hover:border-white/24 hover:bg-white/[0.05]"
        : "inline-flex items-center justify-center rounded-full bg-accent-green px-4 py-2 text-sm font-semibold text-black transition hover:bg-[#35f89d]";

  if (isExternalHref(href)) {
    return (
      <a href={href} target="_blank" rel="noreferrer" className={joinClasses(sharedClassName, className)}>
        {children}
      </a>
    );
  }

  return (
    <Link href={href} className={joinClasses(sharedClassName, className)}>
      {children}
    </Link>
  );
}

function HomeSectionHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-accent-green">{eyebrow}</p>
        <h2 className="mt-2 font-display text-[1.65rem] font-black tracking-tight text-white sm:text-[1.9rem]">{title}</h2>
        {description ? <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

function HomeMetricCard({
  label,
  value,
  detail,
  tone = "neutral",
}: {
  label: string;
  value: string | number;
  detail?: string;
  tone?: PillTone;
}) {
  const valueClassName =
    tone === "red" ? "text-accent-red" : tone === "green" ? "text-accent-green" : "text-white";

  return (
    <div className="rounded-[22px] border border-white/10 bg-white/[0.03] p-4">
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-text-muted">{label}</p>
      <p className={joinClasses("mt-3 font-mono-stat text-2xl", valueClassName)}>
        {typeof value === "number" ? formatNumber(value) : value}
      </p>
      {detail ? <p className="mt-2 text-xs leading-6 text-slate-300">{detail}</p> : null}
    </div>
  );
}

function TonePill({ label, tone = "neutral" }: { label: string; tone?: PillTone }) {
  const className =
    tone === "red"
      ? "border-accent-red/30 bg-accent-red/10 text-accent-red"
      : tone === "green"
        ? "border-accent-green/30 bg-accent-green/10 text-accent-green"
        : "border-white/10 bg-white/[0.04] text-slate-200";

  return <span className={joinClasses("inline-flex items-center rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em]", className)}>{label}</span>;
}

function StatusPill({ status }: { status: PlatformEvent["status"] | PlatformMatch["status"] }) {
  if (status === "live") {
    return (
      <span className="inline-flex items-center gap-2 rounded-full border border-accent-red/30 bg-accent-red/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-accent-red">
        <span className="h-2 w-2 rounded-full bg-accent-red shadow-[0_0_10px_rgba(244,67,54,0.9)]" />
        Live
      </span>
    );
  }

  if (status === "upcoming") {
    return <TonePill label="Upcoming" tone="green" />;
  }

  if (status === "completed") {
    return <TonePill label="Completed" />;
  }

  return <TonePill label="Planned" />;
}

function ContentStatePill({ state }: { state: PlatformEvent["state"] }) {
  if (state === "published") return <TonePill label="Published" tone="green" />;
  if (state === "coming_soon") return <TonePill label="Coming Soon" />;
  return <TonePill label="Planned" />;
}

function sponsorKindLabel(kind: PlatformSponsorProfile["kind"]) {
  return kind === "design" ? "Design Partner" : kind === "sponsor" ? "Sponsor" : "Partner";
}

function sponsorPrimaryAsset(sponsor: PlatformSponsorProfile) {
  return sponsor.bannerUrl ?? sponsor.designAssetUrl ?? sponsor.logoUrl ?? null;
}

function hasSponsorDescription(sponsor: PlatformSponsorProfile) {
  const description = sponsor.description.trim();
  return description.length > 0 && description !== DEFAULT_SPONSOR_DESCRIPTION;
}

function buildFeaturedTeamCards(pubg: PubgHubDataset) {
  return pubg.teams.slice(0, 6).map((team) => ({
    id: team.id,
    slug: team.slug,
    name: team.name,
    logoUrl: team.logoUrl ?? undefined,
    region: team.region,
    matches: team.matches,
    points: team.totalPoints,
    kills: team.kills,
    form: team.formLabel,
    trend: team.recentPoints,
    rosterSize: team.currentRoster.length,
  })) satisfies FeaturedTeamCard[];
}

function buildFeaturedPlayerCards(pubg: PubgHubDataset) {
  return pubg.players.slice(0, 6).map((player) => ({
    id: player.id,
    slug: player.slug,
    name: player.pubgName,
    avatarUrl: player.avatarUrl ?? undefined,
    teamName: player.currentTeamName ?? "Team TBD",
    matches: player.matches,
    kills: player.kills,
    avgDamage: player.avgDamage,
    wins: player.wins,
    form: player.formLabel,
    trend: player.recentTrend,
  })) satisfies FeaturedPlayerCard[];
}

function resolveFeaturedTeamCards(pubg: PubgHubDataset, featuredTeamIds: string[]) {
  const defaultCards = buildFeaturedTeamCards(pubg);
  if (featuredTeamIds.length === 0) {
    return defaultCards;
  }

  const teamById = new Map(defaultCards.map((team) => [team.id, team]));
  const ordered = featuredTeamIds.map((teamId) => teamById.get(teamId) ?? null).filter((team): team is FeaturedTeamCard => Boolean(team));

  return ordered.length > 0 ? ordered : defaultCards;
}

function resolveFeaturedPlayerCards(pubg: PubgHubDataset, featuredPlayerIds: string[]) {
  const defaultCards = buildFeaturedPlayerCards(pubg);
  if (featuredPlayerIds.length === 0) {
    return defaultCards;
  }

  const playerById = new Map(defaultCards.map((player) => [player.id, player]));
  const ordered = featuredPlayerIds
    .map((playerId) => playerById.get(playerId) ?? null)
    .filter((player): player is FeaturedPlayerCard => Boolean(player));

  return ordered.length > 0 ? ordered : defaultCards;
}

function getTeamHref(team: FeaturedTeamCard | PubgHubTeam) {
  return `/pubg/teams/${team.slug ?? team.id}`;
}

function getPlayerHref(player: FeaturedPlayerCard | PubgHubPlayer) {
  return `/pubg/players/${player.slug ?? player.id}`;
}

function getEventHref(event: PlatformEvent) {
  return event.analyticsHref ?? (event.gameSlug === "pubg-pc" ? `/pubg/events/${event.slug}` : `/events/${event.slug}`);
}

function getMatchHref(match: PlatformMatch) {
  return match.gameSlug === "pubg-pc" ? `/pubg/matches/${match.id}` : `/matches/${match.id}`;
}

function resolveYouTubeEmbedUrl(value: string) {
  try {
    const url = new URL(value);
    if (url.hostname.includes("youtu.be")) {
      const id = url.pathname.replace(/^\/+/, "");
      return id ? `https://www.youtube.com/embed/${id}?autoplay=1&mute=1&controls=0&loop=1&playlist=${id}&rel=0&modestbranding=1` : null;
    }

    if (url.hostname.includes("youtube.com")) {
      const watchId = url.searchParams.get("v");
      const embedId = watchId || url.pathname.split("/").filter(Boolean).pop();
      return embedId ? `https://www.youtube.com/embed/${embedId}?autoplay=1&mute=1&controls=0&loop=1&playlist=${embedId}&rel=0&modestbranding=1` : null;
    }

    if (url.hostname.includes("vimeo.com")) {
      const id = url.pathname.split("/").filter(Boolean).pop();
      return id ? `https://player.vimeo.com/video/${id}?background=1&autoplay=1&muted=1&loop=1` : null;
    }
  } catch {
    return null;
  }

  return null;
}

function isDirectVideoUrl(value: string) {
  return /\.(mp4|webm|ogg|m3u8)(\?.*)?$/i.test(value);
}

function renderSponsorInitials(name: string) {
  const initials = name.replace(/[^a-zA-Z0-9]/g, "").slice(0, 2).toUpperCase() || "BG";
  return (
    <div className="flex h-16 w-16 items-center justify-center rounded-[22px] border border-accent-green/20 bg-accent-green/10 font-display text-lg font-black text-accent-green">
      {initials}
    </div>
  );
}

function HeroMediaPanel({
  slide,
  sponsor,
  featuredEvent,
  liveHref,
}: {
  slide: HomepageHeroSlideRecord | null;
  sponsor: PlatformSponsorProfile | null;
  featuredEvent: PlatformEvent | null;
  liveHref: string;
}) {
  const directVideoUrl = slide?.videoUrl && isDirectVideoUrl(slide.videoUrl) ? slide.videoUrl : null;
  const embeddedVideoUrl = slide?.videoUrl && !directVideoUrl ? resolveYouTubeEmbedUrl(slide.videoUrl) : null;
  const fallbackImageUrl = slide?.imageUrl ?? (sponsor ? sponsorPrimaryAsset(sponsor) : null) ?? featuredEvent?.bannerUrl ?? null;
  const panelTitle = sponsor?.name ?? featuredEvent?.name ?? "Featured coverage";
  const panelSummary =
    slide?.promoText?.trim() ||
    (sponsor
      ? hasSponsorDescription(sponsor)
        ? sponsor.description
        : "Published sponsor placement and approved assets are now live on the Bravo homepage."
      : "") ||
    featuredEvent?.summary ||
    "Featured broadcasts, event banners, and sponsor campaigns appear here as soon as they are published.";
  const sponsorHref = sponsor ? `/sponsors/${sponsor.slug}` : null;
  const panelActionHref = sponsor?.websiteUrl ?? sponsorHref ?? (featuredEvent ? getEventHref(featuredEvent) : liveHref);
  const panelActionLabel = sponsor ? (sponsor.websiteUrl ? "Visit Partner" : "Open Sponsor") : featuredEvent ? "Open Event" : "Watch Live";

  return (
    <div className="overflow-hidden rounded-[28px] border border-white/10 bg-black/30 shadow-[0_24px_80px_rgba(0,0,0,0.34)]">
      {directVideoUrl ? (
        <video
          src={directVideoUrl}
          poster={fallbackImageUrl ?? undefined}
          autoPlay
          muted
          loop
          playsInline
          className="aspect-[16/10] w-full bg-black object-cover"
        />
      ) : embeddedVideoUrl ? (
        <iframe
          src={embeddedVideoUrl}
          title={slide?.title ?? "Hero promo video"}
          allow="autoplay; encrypted-media; picture-in-picture"
          className="aspect-[16/10] w-full bg-black"
        />
      ) : fallbackImageUrl ? (
        <img src={fallbackImageUrl} alt={slide?.title ?? panelTitle} className="aspect-[16/10] w-full bg-black object-cover" />
      ) : (
        <div className="relative flex aspect-[16/10] items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_20%_18%,rgba(0,230,118,0.18),transparent_34%),radial-gradient(circle_at_82%_16%,rgba(244,67,54,0.15),transparent_28%),linear-gradient(135deg,rgba(7,10,18,0.98),rgba(13,18,31,0.94))]">
          <div className="absolute inset-0 opacity-60 [background-image:linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] [background-size:22px_22px]" />
          <div className="relative flex flex-col items-center px-6 text-center">
            <BravoLogo size={64} />
            <p className="mt-5 text-sm font-semibold uppercase tracking-[0.2em] text-accent-green">Bravo Front Page</p>
            <p className="mt-3 max-w-sm text-sm leading-7 text-slate-300">
              Live visuals, sponsor campaigns, and featured event media appear here once they are published.
            </p>
          </div>
        </div>
      )}

      <div className="border-t border-white/10 bg-[linear-gradient(180deg,rgba(8,11,19,0.92),rgba(6,8,15,0.94))] p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                {sponsor ? <TonePill label={sponsorKindLabel(sponsor.kind)} tone="green" /> : featuredEvent ? <StatusPill status={featuredEvent.status} /> : <TonePill label="Featured" tone="green" />}
                {!sponsor && featuredEvent ? <ContentStatePill state={featuredEvent.state} /> : null}
              </div>
            <h2 className="mt-3 font-display text-2xl font-black tracking-tight text-white">{panelTitle}</h2>
            <p className="mt-3 text-sm leading-7 text-slate-300">{panelSummary}</p>
          </div>
          <ActionLink href={panelActionHref} variant={sponsor ? "secondary" : "primary"} className="shrink-0">
            {panelActionLabel}
          </ActionLink>
        </div>
      </div>
    </div>
  );
}

function HeroSection({
  hub,
  slide,
  sponsor,
  featuredEvent,
  registerHref,
  rankedTeamsCount,
}: {
  hub: PlatformHubData;
  slide: HomepageHeroSlideRecord | null;
  sponsor: PlatformSponsorProfile | null;
  featuredEvent: PlatformEvent | null;
  registerHref: string;
  rankedTeamsCount: number;
}) {
  const actions = [
    slide?.primaryLabel && slide?.primaryHref ? { label: slide.primaryLabel, href: slide.primaryHref, variant: "primary" as const } : null,
    slide?.secondaryLabel && slide?.secondaryHref ? { label: slide.secondaryLabel, href: slide.secondaryHref, variant: "secondary" as const } : null,
    slide?.tertiaryLabel && slide?.tertiaryHref ? { label: slide.tertiaryLabel, href: slide.tertiaryHref, variant: "secondary" as const } : null,
  ].filter((item): item is { label: string; href: string; variant: "primary" | "secondary" } => Boolean(item));

  const heroStats = [
      { label: "Active Events", value: hub.events.filter((event) => event.status === "live" || event.status === "upcoming").length, tone: "green" as const },
      { label: "Published Results", value: hub.matches.filter((match) => match.status === "completed").length, tone: "neutral" as const },
      { label: "Teams Ranked", value: rankedTeamsCount, tone: "neutral" as const },
      { label: "Videos Live", value: hub.media.length, tone: "neutral" as const },
    ];
  const hasHeroStats = heroStats.some((item) => item.value > 0);
  const breakingNews = hub.home.breakingNews;

  return (
    <section className="relative overflow-hidden rounded-[34px] border border-white/[0.08] bg-[linear-gradient(135deg,rgba(6,10,18,0.98),rgba(9,14,24,0.96))] px-5 py-6 shadow-[0_40px_120px_rgba(0,0,0,0.42)] sm:px-7 sm:py-8 lg:px-8">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_10%_12%,rgba(0,230,118,0.15),transparent_30%),radial-gradient(circle_at_90%_14%,rgba(244,67,54,0.12),transparent_24%),radial-gradient(circle_at_84%_88%,rgba(255,255,255,0.04),transparent_32%)]" />
      <div className="relative grid gap-6 xl:grid-cols-[1.02fr,0.98fr] xl:gap-8">
        <div className="min-w-0">
          <span className="inline-flex items-center rounded-full border border-accent-green/20 bg-accent-green/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-accent-green">
            {slide?.badge ?? hub.brand.tagline}
          </span>
          <h1 className="mt-5 max-w-4xl font-display text-[2rem] font-black leading-[0.95] tracking-tight text-white sm:text-[2.7rem] lg:text-[3.4rem]">
            {slide?.title ?? "Nepal's live esports dashboard"}
          </h1>
          <p className="mt-5 max-w-3xl text-sm leading-7 text-slate-300 sm:text-base sm:leading-8">
            {slide?.description ?? hub.brand.mission}
          </p>

          {actions.length > 0 ? (
            <div className="mt-6 flex flex-wrap gap-3">
              {actions.map((action) => (
                <ActionLink key={`${action.label}-${action.href}`} href={action.href} variant={action.variant}>
                  {action.label}
                </ActionLink>
              ))}
              <ActionLink href={registerHref} variant="secondary">
                Register Team
              </ActionLink>
            </div>
          ) : null}

          {breakingNews ? (
            <Link
              href={`/news/${breakingNews.slug}`}
              className="mt-6 block rounded-[24px] border border-white/10 bg-white/[0.03] p-4 transition hover:border-accent-green/30 hover:bg-white/[0.05]"
            >
              <div className="flex flex-wrap items-center gap-2">
                <TonePill label={breakingNews.breaking ? "Latest Update" : "News"} tone={breakingNews.breaking ? "red" : "green"} />
                <p className="text-xs uppercase tracking-[0.14em] text-text-muted">{formatDate(breakingNews.date)}</p>
              </div>
              <p className="mt-3 font-semibold text-white">{breakingNews.title}</p>
              <p className="mt-2 text-sm leading-7 text-slate-300">{breakingNews.summary}</p>
            </Link>
          ) : null}

          <div className="mt-6">
            {hasHeroStats ? (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {heroStats.map((item) => (
                  <HomeMetricCard key={item.label} label={item.label} value={item.value} tone={item.tone} />
                ))}
              </div>
            ) : (
              <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <TonePill label="Awaiting Published Data" />
                  <TonePill label="Public Safe Mode" tone="green" />
                </div>
                <p className="mt-4 text-base font-semibold text-white">The front page is ready for live coverage.</p>
                <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-300">
                  Match results, standings, events, media, and sponsors will surface here automatically once they are officially published.
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="min-w-0">
          <HeroMediaPanel slide={slide} sponsor={sponsor} featuredEvent={featuredEvent} liveHref={hub.home.liveFeature.href} />
        </div>
      </div>
    </section>
  );
}

function CompactStandingsSection({ teams }: { teams: FeaturedTeamCard[] }) {
  return (
    <section className="rounded-[30px] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(8,11,19,0.95),rgba(7,10,17,0.95))] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.28)] sm:p-6">
      <HomeSectionHeader
        eyebrow="Current Standings"
        title="Leaderboard pressure at a glance"
        description="The homepage keeps the board visible without forcing teams and fans to dig through multiple pages."
        action={
          <ActionLink href="/pubg/leaderboards" variant="secondary">
            Full Leaderboard
          </ActionLink>
        }
      />

      {teams.length > 0 ? (
        <div className="mt-5 space-y-3">
          {teams.slice(0, 5).map((team, index) => (
            <Link
              key={team.id}
              href={getTeamHref(team)}
              className="flex min-w-0 items-center gap-3 rounded-[22px] border border-white/10 bg-white/[0.03] p-3 transition hover:border-accent-green/25 hover:bg-white/[0.05]"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-black/20 font-mono-stat text-sm text-white">
                #{index + 1}
              </div>
              <TeamAvatar name={team.name} imageUrl={team.logoUrl} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-display text-base font-black text-white">{team.name}</p>
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
        <div className="mt-5">
          <EmptyState
            title="No leaderboard published yet"
            description="Standings appear here once official match results have been published."
            action={<ActionLink href="/pubg/leaderboards" variant="secondary">Open PUBG Leaderboards</ActionLink>}
          />
        </div>
      )}
    </section>
  );
}

function LivePulseSection({ hub }: { hub: PlatformHubData }) {
  const liveMatchesCount = hub.matches.filter((match) => match.status === "live").length;
  const upcomingMatchesCount = hub.matches.filter((match) => match.status === "upcoming").length;
  const publishedResultsCount = hub.matches.filter((match) => match.status === "completed").length;
  const pulseItems = [
    { label: "Live Matches", value: liveMatchesCount, tone: "red" as const },
    { label: "Upcoming Matches", value: upcomingMatchesCount, tone: "green" as const },
    { label: "Recent Results", value: publishedResultsCount, tone: "neutral" as const },
    { label: "Published Videos", value: hub.media.length, tone: "neutral" as const },
  ];
  const hasPulseActivity = pulseItems.some((item) => item.value > 0);
  const spotlightMatches =
    (hub.home.liveMatches.length > 0 ? hub.home.liveMatches : hub.home.upcomingMatches.length > 0 ? hub.home.upcomingMatches : hub.home.recentMatches).slice(0, 3);
  const liveFeatureIsHot = hub.home.liveMatches.length > 0;

  return (
    <section className="grid gap-6 xl:grid-cols-[1.08fr,0.92fr]">
      <div className="rounded-[30px] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(8,11,19,0.95),rgba(7,10,17,0.95))] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.28)] sm:p-6">
        <HomeSectionHeader
          eyebrow="Live Pulse"
          title={hub.home.liveFeature.title}
          description={hub.home.liveFeature.subtitle}
          action={
            <ActionLink href={hub.home.liveFeature.href} variant={liveFeatureIsHot ? "danger" : "primary"}>
              {liveFeatureIsHot ? "Watch Live" : "Open Broadcast"}
            </ActionLink>
          }
        />

        {spotlightMatches.length > 0 ? (
          <div className="mt-5 space-y-3">
            {spotlightMatches.map((match) => (
              <Link
                key={match.id}
                href={getMatchHref(match)}
                className="block rounded-[22px] border border-white/10 bg-white/[0.03] p-4 transition hover:border-accent-green/25 hover:bg-white/[0.05]"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusPill status={match.status} />
                      {match.viewerCount ? <TonePill label={match.viewerCount} tone={match.status === "live" ? "red" : "green"} /> : null}
                    </div>
                    <p className="mt-3 font-display text-xl font-black tracking-tight text-white">
                      {match.teamA} vs {match.teamB}
                    </p>
                    <p className="mt-2 text-sm text-text-muted">
                      {match.eventName} | {match.stageLabel} | {match.mapLabel}
                    </p>
                    <p className="mt-3 text-sm leading-7 text-slate-300">{match.summary}</p>
                  </div>
                  <p className="text-xs uppercase tracking-[0.16em] text-text-muted">{formatDateTime(match.scheduledAt)}</p>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="mt-5">
            <EmptyState
              title="No live pulse yet"
              description="Broadcast status, match movement, and fresh result activity will appear here once public coverage is active."
              action={<ActionLink href={hub.home.liveFeature.href} variant="secondary">Open Live Stream</ActionLink>}
            />
          </div>
        )}
      </div>

      <div className="rounded-[30px] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(8,11,19,0.95),rgba(7,10,17,0.95))] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.28)] sm:p-6">
        <HomeSectionHeader
          eyebrow="Pulse Board"
          title="What changed most recently"
          description="The right rail stays compact on mobile and gives the front page its dashboard feel."
        />

        {hasPulseActivity ? (
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {pulseItems.map((item) => (
              <HomeMetricCard key={item.label} label={item.label} value={item.value} tone={item.tone} />
            ))}
          </div>
        ) : (
          <div className="mt-5">
            <EmptyState
              title="No public activity yet"
              description="Once matches, events, or videos are published, this pulse board will update automatically."
              action={<ActionLink href="/pubg" variant="secondary">Open PUBG Hub</ActionLink>}
            />
          </div>
        )}
      </div>
    </section>
  );
}

function EventCard({ event }: { event: PlatformEvent }) {
  return (
    <Link
      href={getEventHref(event)}
      className="block rounded-[24px] border border-white/10 bg-white/[0.03] p-4 transition hover:border-accent-green/25 hover:bg-white/[0.05]"
    >
      {event.bannerUrl ? (
        <div className="mb-4 overflow-hidden rounded-[18px] border border-white/10">
          <img src={event.bannerUrl} alt={event.name} className="h-40 w-full object-cover" />
        </div>
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        <StatusPill status={event.status} />
        <ContentStatePill state={event.state} />
      </div>
      <h3 className="mt-4 font-display text-xl font-black tracking-tight text-white">{event.name}</h3>
      <p className="mt-2 text-sm text-text-muted">
        {event.gameName} | {event.type}
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <HomeMetricCard label="Dates" value={formatDateRange(event.startDate, event.endDate)} />
        <HomeMetricCard label="Teams" value={event.teamsCount} tone="green" />
      </div>
      <p className="mt-4 text-sm leading-7 text-slate-300">{event.summary}</p>
    </Link>
  );
}

function UpcomingEventsSection({ events }: { events: PlatformEvent[] }) {
  return (
    <section className="rounded-[30px] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(8,11,19,0.95),rgba(7,10,17,0.95))] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.28)] sm:p-6">
      <HomeSectionHeader
        eyebrow="Upcoming Events"
        title="The next public competition windows"
        description="Upcoming events stay close to the standings so teams can move from leaderboard context into registration and schedule planning."
        action={
          <ActionLink href="/events" variant="secondary">
            All Events
          </ActionLink>
        }
      />

      {events.length > 0 ? (
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          {events.slice(0, 4).map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      ) : (
        <div className="mt-5">
          <EmptyState
            title="No upcoming events published yet"
            description="The schedule will populate here as soon as future events are published."
            action={<ActionLink href={BRAVO_DISCORD_URL} variant="secondary">Join Discord</ActionLink>}
          />
        </div>
      )}
    </section>
  );
}

function RegisterTeamSection({ featuredEvent, registerHref }: { featuredEvent: PlatformEvent | null; registerHref: string }) {
  return (
    <section className="overflow-hidden rounded-[30px] border border-accent-green/18 bg-[linear-gradient(135deg,rgba(0,230,118,0.09),rgba(8,11,19,0.98))] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.28)] sm:p-6">
      <div className="grid gap-5 lg:grid-cols-[1.2fr,0.8fr] lg:items-center">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-accent-green">Register Team</p>
          <h2 className="mt-3 font-display text-[1.8rem] font-black tracking-tight text-white sm:text-[2.1rem]">
            {featuredEvent ? `Register early for ${featuredEvent.name}` : "Get your roster ready for the next Bravo room"}
          </h2>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-300">
            Teams can register once, follow published results, and keep event-day movement visible from the same public surface. When there is no active event yet, the CTA stays focused on the next competitive window instead of showing filler.
          </p>
        </div>

        <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <TonePill label={featuredEvent ? "Event Ready" : "Always On"} tone="green" />
            {featuredEvent ? <StatusPill status={featuredEvent.status} /> : null}
          </div>
          <p className="mt-4 font-semibold text-white">{featuredEvent ? featuredEvent.name : "Bravo Gaming registration lane"}</p>
          <p className="mt-2 text-sm leading-7 text-slate-300">
            {featuredEvent
              ? `${formatDateRange(featuredEvent.startDate, featuredEvent.endDate)} | ${featuredEvent.teamsCount} team slots currently mapped in the public event layer.`
              : "Jump into the next official registration window and keep your team connected to Bravo event updates."}
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <ActionLink href={registerHref} variant="primary">
              Register Team
            </ActionLink>
            <ActionLink href={BRAVO_DISCORD_URL} variant="secondary">
              Join Discord
            </ActionLink>
          </div>
        </div>
      </div>
    </section>
  );
}

function RecentResultsSection({ matches }: { matches: PlatformMatch[] }) {
  return (
    <section className="rounded-[30px] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(8,11,19,0.95),rgba(7,10,17,0.95))] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.28)] sm:p-6">
      <HomeSectionHeader
        eyebrow="Recent Results"
        title="Published results, cleanly surfaced"
        description="The homepage should make it obvious when official results are live, without leaking draft or unpublished data."
        action={
          <ActionLink href="/pubg/results" variant="secondary">
            Latest Results
          </ActionLink>
        }
      />

      {matches.length > 0 ? (
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          {matches.slice(0, 4).map((match) => (
            <Link
              key={match.id}
              href={getMatchHref(match)}
              className="block rounded-[24px] border border-white/10 bg-white/[0.03] p-4 transition hover:border-accent-green/25 hover:bg-white/[0.05]"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <StatusPill status={match.status} />
                <p className="text-xs uppercase tracking-[0.16em] text-text-muted">{formatDateTime(match.scheduledAt)}</p>
              </div>
              <h3 className="mt-4 font-display text-xl font-black tracking-tight text-white">
                {match.teamA} vs {match.teamB}
              </h3>
              <p className="mt-2 text-sm text-text-muted">
                {match.eventName} | {match.stageLabel} | {match.mapLabel}
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <HomeMetricCard label="Winner" value={match.winnerName ?? "Pending"} tone={match.winnerName ? "green" : "neutral"} />
                <HomeMetricCard label="MVP" value={match.mvpName ?? "Pending"} />
                <HomeMetricCard label="Game" value={match.gameName} />
              </div>
              <p className="mt-4 text-sm leading-7 text-slate-300">{match.summary}</p>
            </Link>
          ))}
        </div>
      ) : (
        <div className="mt-5">
          <EmptyState
            title="No match results published yet"
            description="Results will appear here after they have been officially reviewed and published."
            action={<ActionLink href="/pubg" variant="secondary">Open PUBG Hub</ActionLink>}
          />
        </div>
      )}
    </section>
  );
}

function TeamFeatureCard({ team, rank }: { team: FeaturedTeamCard; rank: number }) {
  return (
    <Link
      href={getTeamHref(team)}
      className="block rounded-[24px] border border-white/10 bg-white/[0.03] p-4 transition hover:border-accent-green/25 hover:bg-white/[0.05]"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-black/20 font-mono-stat text-sm text-white">
          #{rank}
        </div>
        <TeamAvatar name={team.name} imageUrl={team.logoUrl} size="lg" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-display text-xl font-black tracking-tight text-white">{team.name}</p>
            <TonePill label={team.form} tone="green" />
          </div>
          <p className="mt-2 text-sm text-text-muted">{team.region ?? "Region pending"} | {team.rosterSize} active roster spots</p>
        </div>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <HomeMetricCard label="Points" value={team.points} tone="green" />
        <HomeMetricCard label="Kills" value={team.kills} />
        <HomeMetricCard label="Matches" value={team.matches} />
      </div>
      {team.trend.length > 0 ? (
        <div className="mt-4">
          <TrendBars values={team.trend} tone="green" />
        </div>
      ) : null}
    </Link>
  );
}

function TopTeamsSection({ teams }: { teams: FeaturedTeamCard[] }) {
  return (
    <section className="rounded-[30px] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(8,11,19,0.95),rgba(7,10,17,0.95))] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.28)] sm:p-6">
      <HomeSectionHeader
        eyebrow="Top Teams"
        title="Featured teams with real momentum"
        description="This layer turns the board into something more readable than a table by surfacing roster scale, recent pressure, and current output."
      />

      {teams.length > 0 ? (
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          {teams.slice(0, 4).map((team, index) => (
            <TeamFeatureCard key={team.id} team={team} rank={index + 1} />
          ))}
        </div>
      ) : (
        <div className="mt-5">
          <EmptyState
            title="No featured team data yet"
            description="Top teams will appear after official standings have been published."
            action={<ActionLink href="/pubg/teams" variant="secondary">Browse Teams</ActionLink>}
          />
        </div>
      )}
    </section>
  );
}

function PlayerFeatureCard({ player, rank }: { player: FeaturedPlayerCard; rank: number }) {
  return (
    <Link
      href={getPlayerHref(player)}
      className="block rounded-[24px] border border-white/10 bg-white/[0.03] p-4 transition hover:border-accent-green/25 hover:bg-white/[0.05]"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-black/20 font-mono-stat text-sm text-white">
          #{rank}
        </div>
        <TeamAvatar name={player.name} imageUrl={player.avatarUrl} size="lg" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-display text-xl font-black tracking-tight text-white">{player.name}</p>
            <TonePill label={player.form} tone="green" />
          </div>
          <p className="mt-2 text-sm text-text-muted">{player.teamName}</p>
        </div>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <HomeMetricCard label="Kills" value={player.kills} tone="green" />
        <HomeMetricCard label="Avg Damage" value={player.avgDamage.toFixed(1)} />
        <HomeMetricCard label="Wins" value={player.wins} />
      </div>
      {player.trend.length > 0 ? (
        <div className="mt-4">
          <TrendBars values={player.trend} tone="blue" />
        </div>
      ) : null}
    </Link>
  );
}

function TopPlayersSection({ players }: { players: FeaturedPlayerCard[] }) {
  return (
    <section className="rounded-[30px] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(8,11,19,0.95),rgba(7,10,17,0.95))] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.28)] sm:p-6">
      <HomeSectionHeader
        eyebrow="Top Players"
        title="Player names, not anonymous stat rows"
        description="The front page highlights real player output and keeps the jump into deeper player pages one tap away."
      />

      {players.length > 0 ? (
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          {players.slice(0, 4).map((player, index) => (
            <PlayerFeatureCard key={player.id} player={player} rank={index + 1} />
          ))}
        </div>
      ) : (
        <div className="mt-5">
          <EmptyState
            title="No player leaderboard published yet"
            description="Top players will appear once player output is tied to published match results."
            action={<ActionLink href="/pubg/players" variant="secondary">Browse Players</ActionLink>}
          />
        </div>
      )}
    </section>
  );
}

function NewsCard({ article }: { article: PlatformArticle }) {
  return (
    <Link
      href={`/news/${article.slug}`}
      className="block rounded-[24px] border border-white/10 bg-white/[0.03] p-4 transition hover:border-accent-green/25 hover:bg-white/[0.05]"
    >
      {article.imageUrl ? (
        <div className="mb-4 overflow-hidden rounded-[18px] border border-white/10">
          <img src={article.imageUrl} alt={article.title} className="h-40 w-full object-cover" />
        </div>
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        <TonePill label={article.category} tone="green" />
        <p className="text-xs uppercase tracking-[0.16em] text-text-muted">{formatDate(article.date)}</p>
      </div>
      <h3 className="mt-4 font-display text-xl font-black tracking-tight text-white">{article.title}</h3>
      <p className="mt-3 text-sm leading-7 text-slate-300">{article.summary}</p>
    </Link>
  );
}

function LatestNewsSection({ articles }: { articles: PlatformArticle[] }) {
  return (
    <section className="rounded-[30px] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(8,11,19,0.95),rgba(7,10,17,0.95))] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.28)] sm:p-6">
      <HomeSectionHeader
        eyebrow="Latest News"
        title="Scene updates and editorial coverage"
        description="News keeps the homepage alive between match days without inventing activity that has not actually been published."
        action={
          <ActionLink href="/news" variant="secondary">
            News Hub
          </ActionLink>
        }
      />

      {articles.length > 0 ? (
        <div className="mt-5 grid gap-4 lg:grid-cols-3">
          {articles.slice(0, 3).map((article) => (
            <NewsCard key={article.id} article={article} />
          ))}
        </div>
      ) : (
        <div className="mt-5">
          <EmptyState
            title="No news published yet"
            description="Latest news will appear here when editorial updates or announcements go live."
            action={<ActionLink href={BRAVO_DISCORD_URL} variant="secondary">Follow Updates</ActionLink>}
          />
        </div>
      )}
    </section>
  );
}

function MediaCard({ item }: { item: PlatformMediaItem }) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-4">
      {item.imageUrl ? (
        <div className="mb-4 overflow-hidden rounded-[18px] border border-white/10">
          <img src={item.imageUrl} alt={item.title} className="h-40 w-full object-cover" />
        </div>
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        <TonePill label={item.kind} tone="green" />
        <p className="text-xs uppercase tracking-[0.16em] text-text-muted">{item.duration ?? "Duration TBA"}</p>
      </div>
      <h3 className="mt-4 font-display text-xl font-black tracking-tight text-white">{item.title}</h3>
      <p className="mt-2 text-sm text-text-muted">{item.category}</p>
      <p className="mt-3 text-sm leading-7 text-slate-300">{item.summary}</p>
      <div className="mt-5 flex flex-wrap gap-3">
        <ActionLink href={`/media/${item.slug}`} variant="primary">
          View Details
        </ActionLink>
        {item.url ? (
          <ActionLink href={item.url} variant="secondary">
            Open Media
          </ActionLink>
        ) : null}
      </div>
    </div>
  );
}

function LatestVideosSection({ media }: { media: PlatformMediaItem[] }) {
  return (
    <section className="rounded-[30px] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(8,11,19,0.95),rgba(7,10,17,0.95))] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.28)] sm:p-6">
      <HomeSectionHeader
        eyebrow="Latest Videos"
        title="Published videos, clips, and coverage"
        description="Only real published media records belong here. If nothing is live yet, the section stays clean and honest."
        action={
          <ActionLink href="/media" variant="secondary">
            Media Hub
          </ActionLink>
        }
      />

      {media.length > 0 ? (
        <div className="mt-5 grid gap-4 lg:grid-cols-3">
          {media.slice(0, 3).map((item) => (
            <MediaCard key={item.id} item={item} />
          ))}
        </div>
      ) : (
        <div className="mt-5">
          <EmptyState
            title="No videos published yet"
            description="Highlights, VODs, and clips will appear once published from the Bravo media center."
            action={<ActionLink href="/media" variant="secondary">Open Media Center</ActionLink>}
          />
        </div>
      )}
    </section>
  );
}

function SponsorCard({ sponsor }: { sponsor: PlatformSponsorProfile }) {
  const primaryAsset = sponsorPrimaryAsset(sponsor);

  return (
    <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-4">
      {primaryAsset ? (
        <div className="mb-4 overflow-hidden rounded-[18px] border border-white/10 bg-black/20">
          <img src={primaryAsset} alt={sponsor.name} className="h-40 w-full object-cover" />
        </div>
      ) : null}
      <div className="flex items-start gap-4">
        {sponsor.logoUrl ? (
          <img src={sponsor.logoUrl} alt={sponsor.name} className="h-16 w-16 rounded-[22px] border border-white/10 bg-black/20 object-contain p-2" />
        ) : (
          renderSponsorInitials(sponsor.name)
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap gap-2">
            <TonePill label={sponsor.tier} tone="green" />
            <TonePill label={sponsorKindLabel(sponsor.kind)} />
          </div>
          <h3 className="mt-3 font-display text-xl font-black tracking-tight text-white">{sponsor.name}</h3>
          {hasSponsorDescription(sponsor) ? <p className="mt-3 text-sm leading-7 text-slate-300">{sponsor.description}</p> : null}
          {sponsor.supportedEvents.length > 0 ? (
            <p className="mt-3 text-xs uppercase tracking-[0.14em] text-text-muted">{sponsor.supportedEvents.slice(0, 2).join(" | ")}</p>
          ) : null}
        </div>
      </div>
      <div className="mt-5 flex flex-wrap gap-3">
        <ActionLink href={`/sponsors/${sponsor.slug}`} variant="primary">
          View Profile
        </ActionLink>
        {sponsor.websiteUrl ? (
          <ActionLink href={sponsor.websiteUrl} variant="secondary">
            Visit Website
          </ActionLink>
        ) : null}
      </div>
    </div>
  );
}

function SponsorsSection({ sponsors }: { sponsors: PlatformSponsorProfile[] }) {
  return (
    <section className="rounded-[30px] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(8,11,19,0.95),rgba(7,10,17,0.95))] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.28)] sm:p-6">
      <HomeSectionHeader
        eyebrow="Sponsors"
        title="Published partner visibility only"
        description="The homepage only shows real sponsor records and real assets. If nothing is published for homepage placement, the section stays empty instead of inventing partner content."
        action={
          <ActionLink href="/sponsors" variant="secondary">
            Sponsors Hub
          </ActionLink>
        }
      />

      {sponsors.length > 0 ? (
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          {sponsors.slice(0, 4).map((sponsor) => (
            <SponsorCard key={sponsor.id} sponsor={sponsor} />
          ))}
        </div>
      ) : (
        <div className="mt-5">
          <EmptyState
            title="No homepage sponsors published yet"
            description="Sponsor cards will appear here only after real partner records and assets are published for homepage placement."
            action={<ActionLink href="/sponsors" variant="secondary">Open Sponsors Hub</ActionLink>}
          />
        </div>
      )}
    </section>
  );
}

export default function HomeDashboard({
  hub,
  pubg,
}: {
  hub: PlatformHubData;
  pubg: PubgHubDataset;
}) {
  const featuredEvent = hub.home.featuredEvents[0] ?? hub.home.upcomingEvents[0] ?? null;
  const homepageSponsors = hub.home.featuredSponsors.length > 0 ? hub.home.featuredSponsors : hub.sponsors.filter((sponsor) => sponsor.showOnHomepage);
  const heroSlide = hub.home.heroSlides[0] ?? null;
  const referencedHeroSponsor = heroSlide?.sponsorSlug ? hub.sponsors.find((sponsor) => sponsor.slug === heroSlide.sponsorSlug) ?? null : null;
  const heroSponsor = referencedHeroSponsor || homepageSponsors[0] || null;
  const topTeams = resolveFeaturedTeamCards(pubg, hub.home.featuredTeamIds);
  const topPlayers = resolveFeaturedPlayerCards(pubg, hub.home.featuredPlayerIds);
  const registerHref = featuredEvent ? `/teams/register?tournament=${featuredEvent.id}` : "/teams/register";

  return (
    <main className="w-full px-4 pb-14 pt-5 sm:px-6 lg:px-8 lg:pb-16">
      <div className="mx-auto flex w-full max-w-[1480px] flex-col gap-6 sm:gap-8">
        <HeroSection
          hub={hub}
          slide={heroSlide}
          sponsor={heroSponsor}
          featuredEvent={featuredEvent}
          registerHref={registerHref}
          rankedTeamsCount={pubg.teams.length}
        />
        <LivePulseSection hub={hub} />
        <CompactStandingsSection teams={topTeams} />
        <UpcomingEventsSection events={hub.home.upcomingEvents} />
        <RegisterTeamSection featuredEvent={featuredEvent} registerHref={registerHref} />
        <RecentResultsSection matches={hub.home.recentMatches} />
        <TopTeamsSection teams={topTeams} />
        <TopPlayersSection players={topPlayers} />
        <LatestNewsSection articles={hub.home.featuredNews} />
        <LatestVideosSection media={hub.home.featuredMedia} />
        <SponsorsSection sponsors={homepageSponsors} />
      </div>
    </main>
  );
}
