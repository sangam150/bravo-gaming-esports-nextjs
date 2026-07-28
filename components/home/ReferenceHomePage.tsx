import ManagedImage from "@/components/ui/ManagedImage";
import TeamAvatar from "@/components/ui/TeamAvatar";
import {
  PublicActionLink,
  PublicCommunityCta,
  PublicEmptyState,
  PublicInlineLink,
  PublicMetric,
  PublicPartnerStrip,
  PublicSectionHeader,
  PublicStatusBadge,
  formatPublicDate,
  formatPublicDateRange,
  formatPublicNumber,
} from "@/components/public/PublicDesignSystem";
import type { PlatformArticle, PlatformEvent, PlatformHubData, PlatformMediaItem, PlatformSponsorProfile } from "@/lib/platform-hub";
import {
  getPublicPubgPlayers,
  getPublicPubgTeams,
  isPublicPubgMatchStatus,
  type PubgHubDataset,
  type PubgHubPlayer,
  type PubgHubTeam,
} from "@/lib/pubg-hub";
import { resolveHomepageEventAction } from "@/lib/homepage-events";
import { getCanonicalPublicEventHref } from "@/lib/public-links";
import { BarChart3, CalendarDays, ChevronRight, Crosshair, Newspaper, Play, Swords, Trophy, UserRound, Users } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

type HomepageUpdate = {
  id: string;
  kind: string;
  title: string;
  summary: string;
  date?: string;
  publisher: string;
  href: string;
  imageUrl?: string;
  media: boolean;
};

function isExternalHref(href: string) {
  return /^https?:\/\//i.test(href);
}

function uniqueById<T extends { id: string }>(items: T[]) {
  return items.filter((item, index, values) => values.findIndex((candidate) => candidate.id === item.id) === index);
}

function resolveHomepageEvents(hub: PlatformHubData) {
  const featuredEvents = uniqueById(hub.home.featuredEvents).filter(
    (event) => event.state === "published" && (event.status === "live" || event.status === "upcoming"),
  );
  const featuredIds = new Set(featuredEvents.map((event) => event.id));
  const candidates = uniqueById([...hub.home.upcomingEvents, ...hub.events]).filter(
    (event) => !featuredIds.has(event.id) && event.state === "published" && (event.status === "live" || event.status === "upcoming"),
  );

  const fallbackEvents = candidates.sort((firstEvent, secondEvent) => {
    const statusDelta = Number(secondEvent.status === "live") - Number(firstEvent.status === "live");
    if (statusDelta !== 0) return statusDelta;

    const firstDate = Date.parse(firstEvent.startDate);
    const secondDate = Date.parse(secondEvent.startDate);
    if (Number.isFinite(firstDate) && Number.isFinite(secondDate)) return firstDate - secondDate;
    return firstEvent.name.localeCompare(secondEvent.name);
  });

  return [...featuredEvents, ...fallbackEvents];
}

function getHomepageEventAction(event: PlatformEvent) {
  return resolveHomepageEventAction(event, event.homepageFeature, {
    detailHref: getCanonicalPublicEventHref(event),
  });
}

function resolveHomepageSponsors(hub: PlatformHubData) {
  const source =
    hub.home.featuredSponsors.length > 0 ? hub.home.featuredSponsors : hub.sponsors.filter((sponsor) => sponsor.showOnHomepage);

  return uniqueById(source.filter((sponsor) => sponsor.visible)).slice(0, 6);
}

function articleKind(article: PlatformArticle) {
  return /announcement/i.test(article.category) || /announce/i.test(article.title) ? "Announcement" : "News";
}

function mediaHref(item: PlatformMediaItem) {
  return item.url ?? `/media/${item.slug}`;
}

function updateTimestamp(item: HomepageUpdate) {
  if (!item.date) return 0;
  const timestamp = Date.parse(item.date);
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function resolveLatestUpdates(hub: PlatformHubData): HomepageUpdate[] {
  const articles = uniqueById([...hub.home.featuredNews, ...hub.news]);
  const mediaItems = uniqueById([...hub.home.featuredMedia, ...hub.media]);
  const articleUpdates: HomepageUpdate[] = articles.map((article) => ({
    id: `article-${article.id}`,
    kind: articleKind(article),
    title: article.title,
    summary: article.summary,
    date: article.publishedAt ?? article.date,
    publisher: article.authorName,
    href: `/news/${article.slug}`,
    imageUrl: article.imageUrl,
    media: false,
  }));
  const mediaUpdates: HomepageUpdate[] = mediaItems.map((item) => ({
    id: `media-${item.id}`,
    kind: item.kind || "Media",
    title: item.title,
    summary: item.summary,
    date: item.publishedAt ?? item.updatedAt,
    publisher: item.category || "Bravo Gaming Esports",
    href: mediaHref(item),
    imageUrl: item.imageUrl,
    media: true,
  }));

  return [...articleUpdates, ...mediaUpdates]
    .sort((firstItem, secondItem) => updateTimestamp(secondItem) - updateTimestamp(firstItem))
    .slice(0, 3);
}

function getEventStatus(event: PlatformEvent) {
  if (event.status === "live") {
    return { label: "Event in progress", tone: "red" as const };
  }

  return { label: "Upcoming event", tone: "green" as const };
}

function HeroEventPanel({ event }: { event: PlatformEvent | null }) {
  if (!event) {
    return (
      <div className="public-panel bg-[#03101d]/90 p-5">
        <p className="public-kicker">Next Featured Event</p>
        <PublicEmptyState
          compact
          title="Schedule pending"
          description="The next published Bravo event will appear here after approval."
          action={
            <PublicActionLink href="/events" variant="secondary">
              View Events
            </PublicActionLink>
          }
        />
      </div>
    );
  }

  const status = getEventStatus(event);
  const action = getHomepageEventAction(event);

  return (
    <section aria-labelledby="featured-event-heading" className="public-panel bg-[#03101d]/90 p-5 sm:p-6">
      <p className="public-kicker">
        {event.homepageFeature?.label ?? (event.status === "live" ? "Current Featured Event" : "Next Featured Event")}
      </p>
      <h2 id="featured-event-heading" className="mt-3 font-display text-2xl font-bold uppercase leading-tight text-white">
        {event.name}
      </h2>
      <dl className="mt-5 grid gap-3 border-y border-white/10 py-4 text-sm">
        <div className="flex items-start justify-between gap-4">
          <dt className="inline-flex items-center gap-2 text-text-muted">
            <CalendarDays className="h-4 w-4" aria-hidden="true" />
            Date
          </dt>
          <dd className="text-right text-white">{formatPublicDateRange(event.startDate, event.endDate)}</dd>
        </div>
        <div className="flex items-start justify-between gap-4">
          <dt className="inline-flex items-center gap-2 text-text-muted">
            <Swords className="h-4 w-4" aria-hidden="true" />
            Format
          </dt>
          <dd className="text-right text-white">{event.type.trim() || "Pending"}</dd>
        </div>
        <div className="flex items-start justify-between gap-4">
          <dt className="inline-flex items-center gap-2 text-text-muted">
            <Users className="h-4 w-4" aria-hidden="true" />
            Teams
          </dt>
          <dd className="text-right text-white">{event.teamsCount > 0 ? formatPublicNumber(event.teamsCount) : "Pending"}</dd>
        </div>
      </dl>
      <div className="mt-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.05em] text-text-muted">Status</p>
        <PublicStatusBadge tone={status.tone} className="mt-2">
          {status.label}
        </PublicStatusBadge>
      </div>
      <PublicActionLink href={action.href} className="mt-5 w-full justify-center">
        {action.label}
      </PublicActionLink>
    </section>
  );
}

function HomepageHero({ featuredEvent, heroImageUrl }: { featuredEvent: PlatformEvent | null; heroImageUrl?: string | null }) {
  return (
    <section className="public-hero -mx-4 sm:-mx-6 lg:-mx-8">
      <div className="absolute inset-0 -z-10">
        {heroImageUrl ? (
          <ManagedImage
            src={heroImageUrl}
            alt=""
            priority
            sizes="100vw"
            wrapperClassName="h-full w-full"
            className="object-cover object-center opacity-50"
          />
        ) : (
          <Image
            src="/images/bravo-battleground-hero.webp"
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover object-[62%_top] opacity-80"
          />
        )}
      </div>
      <div className="public-container grid min-h-[360px] gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(13rem,0.54fr)_minmax(18rem,0.66fr)] lg:items-center lg:px-8 lg:py-9">
        <div className="relative z-10 min-w-0">
          <p className="public-eyebrow">Nepal&apos;s PUBG PC Esports Platform</p>
          <h1 className="mt-4 font-display text-[2.8rem] font-extrabold leading-[0.96] tracking-[-0.02em] text-white sm:text-[3.55rem] lg:text-[4rem]">
            <span className="block">Nepal&apos;s Home of</span>
            <span className="block">Competitive</span>
            <span className="block">
              <span className="text-accent-blue-light">PUBG PC</span> Esports
            </span>
          </h1>
          <p className="public-copy mt-5 max-w-[37rem]">
            Compete in official scrims and tournaments, follow published standings, and connect with Nepal&apos;s growing PUBG PC esports
            community.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <PublicActionLink href="/teams/register">
              <Users className="h-4 w-4" aria-hidden="true" />
              Register Team
            </PublicActionLink>
            <PublicActionLink href="/events" variant="secondary">
              <CalendarDays className="h-4 w-4" aria-hidden="true" />
              View Schedule
            </PublicActionLink>
            <PublicActionLink href="/pubg/results" variant="secondary">
              <BarChart3 className="h-4 w-4" aria-hidden="true" />
              View Results
            </PublicActionLink>
          </div>
        </div>

        <div className="relative hidden min-h-[330px] lg:block" aria-hidden="true" />

        <div className="relative z-10 min-w-0">
          <HeroEventPanel event={featuredEvent} />
        </div>
      </div>
    </section>
  );
}

function CompetitionPulse({ pubg, teamCount, playerCount }: { pubg: PubgHubDataset; teamCount: number; playerCount: number }) {
  const publishedMatches = pubg.matches.filter((match) => isPublicPubgMatchStatus(match.status));
  const totalKills = publishedMatches.reduce((sum, match) => sum + match.totalKills, 0);
  const metrics = [
    {
      label: "Published Matches",
      value: publishedMatches.length > 0 ? formatPublicNumber(publishedMatches.length) : "—",
      icon: <CalendarDays className="h-5 w-5" aria-hidden="true" />,
    },
    {
      label: "Registered Teams",
      value: teamCount > 0 ? formatPublicNumber(teamCount) : "—",
      icon: <Users className="h-5 w-5" aria-hidden="true" />,
    },
    {
      label: "Active Players",
      value: playerCount > 0 ? formatPublicNumber(playerCount) : "—",
      icon: <UserRound className="h-5 w-5" aria-hidden="true" />,
    },
    {
      label: "Total Kills",
      value: publishedMatches.length > 0 ? formatPublicNumber(totalKills) : "—",
      icon: <Crosshair className="h-5 w-5" aria-hidden="true" />,
    },
  ];

  return (
    <section aria-labelledby="competition-pulse-heading">
      <PublicSectionHeader title="Competition Pulse" className="mb-3" />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <PublicMetric key={metric.label} label={metric.label} value={metric.value} icon={metric.icon} />
        ))}
      </div>
    </section>
  );
}

function MobileStandingCards({ teams }: { teams: PubgHubTeam[] }) {
  return (
    <div className="grid gap-2 md:hidden">
      {teams.map((team, index) => (
        <Link key={team.id} href={`/pubg/teams/${team.slug || team.id}`} className="public-card flex items-center gap-3 p-3">
          <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[4px] border border-accent-blue/25 bg-accent-blue/10 font-mono-stat text-xs text-accent-blue-light">
            {index + 1}
          </span>
          <TeamAvatar name={team.name} imageUrl={team.logoUrl ?? undefined} size="sm" />
          <span className="min-w-0 flex-1 truncate font-semibold text-white">{team.name}</span>
          <span className="shrink-0 font-mono-stat text-sm font-semibold text-accent-blue-light">
            {formatPublicNumber(team.totalPoints)}
          </span>
        </Link>
      ))}
    </div>
  );
}

function CurrentStandings({ teams }: { teams: PubgHubTeam[] }) {
  const visibleTeams = teams.slice(0, 5);

  return (
    <section aria-labelledby="current-standings-heading" className="public-panel min-w-0 overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
        <h2 id="current-standings-heading" className="public-section-heading text-[1.1rem]">
          Current Standings
        </h2>
        <PublicInlineLink href="/pubg/leaderboards?view=teams">View Full Leaderboard</PublicInlineLink>
      </div>
      {visibleTeams.length === 0 ? (
        <div className="p-4">
          <PublicEmptyState
            compact
            title="Standings pending"
            description="Verified team rankings will appear after official results are published."
          />
        </div>
      ) : (
        <div className="p-3">
          <MobileStandingCards teams={visibleTeams} />
          <div className="public-table-wrap hidden md:block">
            <table className="public-table min-w-[660px]">
              <caption className="sr-only">Current published PUBG team standings</caption>
              <thead>
                <tr>
                  <th scope="col">#</th>
                  <th scope="col">Team</th>
                  <th scope="col" className="text-right">
                    Matches
                  </th>
                  <th scope="col" className="text-right">
                    WWCD
                  </th>
                  <th scope="col" className="text-right">
                    Placement
                  </th>
                  <th scope="col" className="text-right">
                    Kills
                  </th>
                  <th scope="col" className="text-right">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {visibleTeams.map((team, index) => (
                  <tr key={team.id}>
                    <td className="font-mono-stat text-white">{index + 1}</td>
                    <td>
                      <Link
                        href={`/pubg/teams/${team.slug || team.id}`}
                        className="flex min-w-40 items-center gap-2.5 font-semibold text-white transition hover:text-accent-blue-light"
                      >
                        <TeamAvatar name={team.name} imageUrl={team.logoUrl ?? undefined} size="sm" />
                        <span className="truncate">{team.name}</span>
                      </Link>
                    </td>
                    <td className="text-right font-mono-stat text-white">{formatPublicNumber(team.matches)}</td>
                    <td className="text-right font-mono-stat text-white">{formatPublicNumber(team.wins)}</td>
                    <td className="text-right font-mono-stat text-white">{formatPublicNumber(team.placementPoints)}</td>
                    <td className="text-right font-mono-stat text-white">{formatPublicNumber(team.kills)}</td>
                    <td className="text-right font-mono-stat font-semibold text-accent-blue-light">
                      {formatPublicNumber(team.totalPoints)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}

function CompactRankingCard({
  id,
  title,
  href,
  hrefLabel,
  children,
}: {
  id: string;
  title: string;
  href: string;
  hrefLabel: string;
  children: ReactNode;
}) {
  return (
    <section aria-labelledby={id} className="public-panel min-w-0 overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
        <h2 id={id} className="public-section-heading text-[1.1rem]">
          {title}
        </h2>
        <PublicInlineLink href={href}>{hrefLabel}</PublicInlineLink>
      </div>
      <div className="p-3">{children}</div>
    </section>
  );
}

function TopTeams({ teams }: { teams: PubgHubTeam[] }) {
  const visibleTeams = teams.slice(0, 5);

  return (
    <CompactRankingCard id="top-teams-heading" title="Top Teams" href="/pubg/teams" hrefLabel="View All">
      {visibleTeams.length === 0 ? (
        <PublicEmptyState compact title="Teams pending" description="Published team rankings will appear here." />
      ) : (
        <ol className="grid gap-1">
          {visibleTeams.map((team, index) => (
            <li key={team.id}>
              <Link
                href={`/pubg/teams/${team.slug || team.id}`}
                className="flex min-h-11 items-center gap-2 border-b border-white/[0.07] px-1 py-2 text-sm transition last:border-b-0 hover:bg-accent-blue/5"
              >
                <span className="w-5 shrink-0 text-center font-mono-stat text-xs text-text-muted">{index + 1}</span>
                <TeamAvatar name={team.name} imageUrl={team.logoUrl ?? undefined} size="sm" />
                <span className="min-w-0 flex-1 truncate font-semibold text-white">{team.name}</span>
                <span className="shrink-0 font-mono-stat text-xs text-text-secondary">{formatPublicNumber(team.totalPoints)} PTS</span>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </CompactRankingCard>
  );
}

function TopPlayers({ players }: { players: PubgHubPlayer[] }) {
  const visiblePlayers = players.slice(0, 5);

  return (
    <CompactRankingCard id="top-players-heading" title="Top Players" href="/pubg/players" hrefLabel="View All">
      {visiblePlayers.length === 0 ? (
        <PublicEmptyState compact title="Players pending" description="Published player rankings will appear here." />
      ) : (
        <ol className="grid gap-1">
          {visiblePlayers.map((player, index) => (
            <li key={player.id}>
              <Link
                href={`/pubg/players/${player.slug || player.id}`}
                className="flex min-h-11 items-center gap-2 border-b border-white/[0.07] px-1 py-2 text-sm transition last:border-b-0 hover:bg-accent-blue/5"
              >
                <span className="w-5 shrink-0 text-center font-mono-stat text-xs text-text-muted">{index + 1}</span>
                <TeamAvatar name={player.pubgName} imageUrl={player.avatarUrl ?? undefined} size="sm" />
                <span className="min-w-0 flex-1 truncate font-semibold text-white">{player.pubgName}</span>
                <span className="shrink-0 font-mono-stat text-xs text-text-secondary">{formatPublicNumber(player.kills)} KILLS</span>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </CompactRankingCard>
  );
}

function RankingsSection({ teams, players }: { teams: PubgHubTeam[]; players: PubgHubPlayer[] }) {
  return (
    <section className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)]">
      <CurrentStandings teams={teams} />
      <TopTeams teams={teams} />
      <TopPlayers players={players} />
    </section>
  );
}

function eventCardStatus(event: PlatformEvent) {
  return event.status === "live" ? { label: "Ongoing", tone: "red" as const } : { label: "Upcoming", tone: "green" as const };
}

function EventCard({ event }: { event: PlatformEvent }) {
  const status = eventCardStatus(event);

  return (
    <article className="public-card flex min-h-full flex-col overflow-hidden">
      {event.bannerUrl ? (
        <ManagedImage
          src={event.bannerUrl}
          alt=""
          sizes="(min-width: 1280px) 33vw, (min-width: 768px) 50vw, 100vw"
          wrapperClassName="h-32 w-full border-b border-white/10"
          className="object-cover"
        />
      ) : null}
      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="public-kicker">{event.gameName || "PUBG PC"}</p>
            <h3 className="mt-2 font-display text-xl font-bold uppercase leading-tight text-white">{event.name}</h3>
          </div>
          <PublicStatusBadge tone={status.tone}>{status.label}</PublicStatusBadge>
        </div>
        <dl className="mt-4 grid gap-2.5 border-y border-white/[0.08] py-3 text-xs">
          <div className="flex justify-between gap-3">
            <dt className="text-text-muted">Format</dt>
            <dd className="text-right text-white">{event.type.trim() || "Pending"}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-text-muted">Date</dt>
            <dd className="text-right text-white">{formatPublicDateRange(event.startDate, event.endDate)}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-text-muted">Teams</dt>
            <dd className="text-right text-white">{event.teamsCount > 0 ? formatPublicNumber(event.teamsCount) : "Pending"}</dd>
          </div>
        </dl>
        <div className="mt-auto flex flex-wrap gap-2 pt-4">
          {event.status === "live" && event.streamHref ? (
            <PublicActionLink href={event.streamHref} className="flex-1 justify-center">
              <Play className="h-4 w-4" aria-hidden="true" />
              Watch Live
            </PublicActionLink>
          ) : null}
          <PublicActionLink
            href={getCanonicalPublicEventHref(event)}
            variant={event.status === "live" && event.streamHref ? "secondary" : "primary"}
            className="flex-1 justify-center"
          >
            View Details
          </PublicActionLink>
        </div>
      </div>
    </article>
  );
}

function UpcomingEvents({ events }: { events: PlatformEvent[] }) {
  const visibleEvents = events.slice(0, 3);

  return (
    <section aria-labelledby="upcoming-events-heading">
      <PublicSectionHeader
        title="Upcoming Events"
        className="mb-3"
        action={<PublicInlineLink href="/events">View All Events</PublicInlineLink>}
      />
      {visibleEvents.length === 0 ? (
        <PublicEmptyState
          title="No current events published"
          description="Current and upcoming Bravo events will appear here after their schedules are approved."
          action={
            <PublicActionLink href="/events" variant="secondary">
              View Event Calendar
            </PublicActionLink>
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visibleEvents.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      )}
    </section>
  );
}

const HOW_IT_WORKS = [
  {
    title: "Register Team",
    description: "Create your team and complete the official registration flow.",
    href: "/teams/register",
    icon: <Users className="h-7 w-7" aria-hidden="true" />,
  },
  {
    title: "Play Matches",
    description: "Compete in published Bravo events and official match schedules.",
    href: "/events",
    icon: <Swords className="h-7 w-7" aria-hidden="true" />,
  },
  {
    title: "Climb Leaderboards",
    description: "Track verified results and rise through the published rankings.",
    href: "/pubg/leaderboards",
    icon: <Trophy className="h-7 w-7" aria-hidden="true" />,
  },
] as const;

function HowItWorks() {
  return (
    <section aria-labelledby="how-it-works-heading">
      <PublicSectionHeader title="How It Works" className="mb-3" />
      <div className="public-panel grid overflow-hidden md:grid-cols-3">
        {HOW_IT_WORKS.map((step, index) => (
          <Link
            key={step.title}
            href={step.href}
            className="group flex min-h-28 items-center gap-4 border-b border-white/10 p-4 transition hover:bg-accent-blue/5 md:border-b-0 md:border-r md:last:border-r-0"
          >
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent-blue text-lg font-bold text-white">
              {index + 1}
            </span>
            <span className="shrink-0 text-text-muted transition group-hover:text-white">{step.icon}</span>
            <span className="min-w-0">
              <span className="block font-display text-base font-bold uppercase text-white">{step.title}</span>
              <span className="mt-1 block text-xs leading-5 text-text-muted">{step.description}</span>
            </span>
            <ChevronRight className="ml-auto hidden h-5 w-5 shrink-0 text-text-muted lg:block" aria-hidden="true" />
          </Link>
        ))}
      </div>
    </section>
  );
}

function UpdateCard({ item }: { item: HomepageUpdate }) {
  const content = (
    <>
      <div className="relative h-40 border-b border-white/10">
        {item.imageUrl ? (
          <ManagedImage
            src={item.imageUrl}
            alt=""
            sizes="(min-width: 1280px) 33vw, (min-width: 768px) 50vw, 100vw"
            wrapperClassName="h-full w-full"
            className="object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-[radial-gradient(circle_at_30%_20%,rgba(11,108,255,0.2),transparent_35%),#040d18] text-accent-blue-light">
            {item.media ? <Play className="h-8 w-8" aria-hidden="true" /> : <Newspaper className="h-8 w-8" aria-hidden="true" />}
          </div>
        )}
        {item.media ? (
          <span className="absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-black/60 text-white">
            <Play className="ml-0.5 h-4 w-4 fill-current" aria-hidden="true" />
          </span>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col p-4">
        <PublicStatusBadge tone={item.media ? "purple" : "blue"} className="self-start">
          {item.kind}
        </PublicStatusBadge>
        <h3 className="mt-3 font-display text-xl font-bold leading-tight text-white">{item.title}</h3>
        <p className="mt-2 line-clamp-3 text-sm leading-6 text-text-muted">{item.summary}</p>
        <div className="mt-auto flex flex-wrap items-center gap-x-2 gap-y-1 pt-4 text-xs text-text-muted">
          <span>{item.date ? formatPublicDate(item.date) : "Publication date pending"}</span>
          <span aria-hidden="true">•</span>
          <span>{item.publisher}</span>
        </div>
      </div>
    </>
  );
  const className = "public-card flex min-h-full flex-col overflow-hidden transition hover:border-accent-blue/45";

  if (isExternalHref(item.href)) {
    return (
      <a href={item.href} target="_blank" rel="noreferrer" className={className}>
        {content}
        <span className="sr-only">Opens in a new tab</span>
      </a>
    );
  }

  return (
    <Link href={item.href} className={className}>
      {content}
    </Link>
  );
}

function LatestUpdates({ updates }: { updates: HomepageUpdate[] }) {
  return (
    <section aria-labelledby="latest-updates-heading">
      <PublicSectionHeader
        title="Latest Updates"
        className="mb-3"
        action={<PublicInlineLink href="/news">View All News</PublicInlineLink>}
      />
      {updates.length === 0 ? (
        <PublicEmptyState
          title="No updates published"
          description="Official news and media will appear here after publication."
          action={
            <PublicActionLink href="/media" variant="secondary">
              Browse Media
            </PublicActionLink>
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {updates.map((item) => (
            <UpdateCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </section>
  );
}

export default function ReferenceHomePage({ hub, pubg }: { hub: PlatformHubData; pubg: PubgHubDataset }) {
  const homepageEvents = resolveHomepageEvents(hub);
  const featuredEvent = homepageEvents[0] ?? null;
  const homepageSponsors: PlatformSponsorProfile[] = resolveHomepageSponsors(hub);
  const publicTeams = getPublicPubgTeams(pubg);
  const publicPlayers = getPublicPubgPlayers(pubg, publicTeams);
  const updates = resolveLatestUpdates(hub);
  const heroImageUrl = hub.home.heroSlides.find((slide) => Boolean(slide.imageUrl?.trim()))?.imageUrl ?? featuredEvent?.bannerUrl ?? null;

  return (
    <main className="public-page">
      <HomepageHero featuredEvent={featuredEvent} heroImageUrl={heroImageUrl} />
      <div className="public-container public-stack">
        <PublicPartnerStrip sponsors={homepageSponsors} />
        <CompetitionPulse pubg={pubg} teamCount={publicTeams.length} playerCount={publicPlayers.length} />
        <RankingsSection
          teams={publicTeams.filter((team) => team.statsTracked)}
          players={publicPlayers.filter((player) => player.statsTracked)}
        />
        <UpcomingEvents events={homepageEvents} />
        <HowItWorks />
        <LatestUpdates updates={updates} />
        <PublicCommunityCta />
      </div>
    </main>
  );
}
