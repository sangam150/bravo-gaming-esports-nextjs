import Image from "next/image";
import Link from "next/link";
import {
  CalendarDays,
  ChevronRight,
  Crosshair,
  Newspaper,
  Play,
  Radio,
  Trophy,
  Users,
} from "lucide-react";
import BravoLogo from "@/components/ui/BravoLogo";
import ManagedImage from "@/components/ui/ManagedImage";
import TeamAvatar from "@/components/ui/TeamAvatar";
import { BRAVO_DISCORD_URL } from "@/lib/brand-links";
import {
  getPublicPubgPlayers,
  getPublicPubgTeams,
  type PubgHubDataset,
  type PubgHubPlayer,
  type PubgHubTeam,
} from "@/lib/pubg-hub";
import type {
  PlatformArticle,
  PlatformEvent,
  PlatformHubData,
  PlatformMediaItem,
  PlatformSponsorProfile,
} from "@/lib/platform-hub";
import { formatDate, formatDateRange, formatNumber } from "@/components/pubg/PubgHubUI";

function cx(...values: Array<string | false | null | undefined>) {
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
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "watch";
  className?: string;
}) {
  const resolvedClassName =
    variant === "secondary" ? "btn-secondary" : variant === "watch" ? "btn-watch-live" : "btn-primary";

  if (isExternalHref(href)) {
    return (
      <a href={href} target="_blank" rel="noreferrer" className={cx(resolvedClassName, className)}>
        {children}
      </a>
    );
  }

  return (
    <Link href={href} className={cx(resolvedClassName, className)}>
      {children}
    </Link>
  );
}

function SectionHeading({
  title,
  icon,
  href,
  hrefLabel = "View All",
}: {
  title: string;
  icon?: React.ReactNode;
  href?: string;
  hrefLabel?: string;
}) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2.5">
        {icon ? <span className="text-accent-blue-light">{icon}</span> : null}
        <h2 className="font-display text-xl font-black uppercase tracking-[0.08em] text-white">{title}</h2>
      </div>
      {href ? (
        <Link
          href={href}
          className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-[0.18em] text-accent-blue-light transition hover:text-white"
        >
          {hrefLabel}
          <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      ) : null}
    </div>
  );
}

function getEventDetailHref(event?: PlatformEvent | null) {
  return event ? `/events/${event.slug}` : "/events";
}

function canRegisterForEvent(event?: PlatformEvent | null) {
  return Boolean(event && (event.status === "upcoming" || event.status === "planned"));
}

function getEventRegistrationHref(event?: PlatformEvent | null) {
  return event && canRegisterForEvent(event) ? `/teams/register?tournament=${event.id}` : "/teams/register";
}

function getEventDateLabel(event?: PlatformEvent | null) {
  if (!event) {
    return "Schedule Pending";
  }

  return formatDateRange(event.startDate, event.endDate);
}

function getEventFormatLabel(event?: PlatformEvent | null) {
  const value = event?.type?.trim();
  return value ? value : "Schedule Pending";
}

function getEventSlotsLabel(event?: PlatformEvent | null) {
  if (!event) {
    return "Slots Pending";
  }

  return event.teamsCount > 0 ? `${formatNumber(event.teamsCount)} Teams` : "Slots Pending";
}

function getEventRegistrationLabel(event?: PlatformEvent | null) {
  if (!event) {
    return "Registration Opening Soon";
  }

  if (event.status === "completed") {
    return "Results Pending";
  }

  if (event.status === "live") {
    return "Registration Closed";
  }

  if (event.status === "planned") {
    return "Registration Opening Soon";
  }

  return "Registration Open";
}

function getEventStatusTone(event?: PlatformEvent | null) {
  if (!event) {
    return "border-accent-yellow/25 bg-accent-yellow/10 text-accent-yellow";
  }

  if (event.status === "completed") {
    return "border-white/15 bg-white/[0.04] text-text-muted";
  }

  if (event.status === "live") {
    return "border-accent-red/30 bg-accent-red/10 text-white";
  }

  if (event.status === "planned") {
    return "border-accent-yellow/25 bg-accent-yellow/10 text-accent-yellow";
  }

  return "border-accent-green/25 bg-accent-green/10 text-accent-green";
}

function getMediaHref(item: PlatformMediaItem) {
  return item.url ?? `/media/${item.slug}`;
}

function getSponsorHref(sponsor: PlatformSponsorProfile) {
  return sponsor.websiteUrl ?? `/sponsors/${sponsor.slug}`;
}

function getSponsorVisualUrl(sponsor: PlatformSponsorProfile) {
  return sponsor.logoUrl ?? sponsor.designAssetUrl ?? sponsor.bannerUrl ?? null;
}

function resolveHomepageEvents(hub: PlatformHubData) {
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

function resolveHomepageSponsors(hub: PlatformHubData) {
  const source =
    hub.home.featuredSponsors.length > 0
      ? hub.home.featuredSponsors
      : hub.sponsors.filter((sponsor) => sponsor.showOnHomepage);

  return source
    .filter((sponsor) => sponsor.visible)
    .filter((sponsor, index, sponsors) => sponsors.findIndex((value) => value.id === sponsor.id) === index)
    .slice(0, 5);
}

type HomepageUpdateCard =
  | {
      id: string;
      kind: "News" | "Announcement";
      title: string;
      summary: string;
      meta: string;
      href: string;
      imageUrl?: string;
    }
  | {
      id: string;
      kind: "Video";
      title: string;
      summary: string;
      meta: string;
      href: string;
      imageUrl?: string;
    };

function getArticleKind(article: PlatformArticle) {
  return /announcement/i.test(article.category) || /announce/i.test(article.title) ? "Announcement" : "News";
}

function resolveHomepageUpdates(hub: PlatformHubData): HomepageUpdateCard[] {
  const updates: HomepageUpdateCard[] = [];
  const seen = new Set<string>();

  const articles = [...hub.home.featuredNews, ...hub.news].filter(
    (article, index, list) => list.findIndex((value) => value.id === article.id) === index
  );
  const mediaItems = [...hub.home.featuredMedia, ...hub.media].filter(
    (item, index, list) => list.findIndex((value) => value.id === item.id) === index
  );

  for (const article of articles) {
    if (updates.length >= 2) {
      break;
    }

    if (seen.has(article.id)) {
      continue;
    }

    seen.add(article.id);
    updates.push({
      id: article.id,
      kind: getArticleKind(article),
      title: article.title,
      summary: article.summary,
      meta: formatDate(article.date),
      href: `/news/${article.slug}`,
      imageUrl: article.imageUrl,
    });
  }

  const featuredVideo = mediaItems[0] ?? null;

  if (featuredVideo) {
    updates.push({
      id: featuredVideo.id,
      kind: "Video",
      title: featuredVideo.title,
      summary: featuredVideo.summary,
      meta: featuredVideo.publishedAt ? formatDate(featuredVideo.publishedAt) : featuredVideo.duration ?? "Media Update",
      href: getMediaHref(featuredVideo),
      imageUrl: featuredVideo.imageUrl,
    });
  }

  return updates.slice(0, 3);
}

function HeroSection({ featuredEvent }: { featuredEvent: PlatformEvent | null }) {
  return (
    <section className="relative overflow-hidden rounded-[30px] border border-white/[0.08] bg-[#050910] shadow-[0_28px_90px_rgba(0,0,0,0.4)]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_14%_20%,rgba(30,123,255,0.18),transparent_28%),radial-gradient(circle_at_88%_22%,rgba(30,123,255,0.1),transparent_24%),linear-gradient(180deg,rgba(4,8,14,0.94),rgba(6,10,18,0.98))]" />
      <div className="absolute inset-x-0 bottom-0 top-0 hidden lg:block">
        <div className="relative mx-auto h-full max-w-[26rem] opacity-[0.22]">
          <Image
            src="/images/hero-character.svg"
            alt=""
            aria-hidden="true"
            fill
            unoptimized
            className="object-contain object-center"
          />
        </div>
      </div>

      <div className="relative grid gap-5 px-5 py-6 sm:px-7 sm:py-7 xl:grid-cols-[1.1fr,0.9fr]">
        <div className="min-w-0 xl:pr-8">
          <span className="inline-flex rounded-full border border-accent-green/25 bg-accent-green/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-accent-green">
            Represent Nepal
          </span>
          <h1 className="mt-5 max-w-[12ch] font-display text-[2.9rem] font-black uppercase leading-[0.9] tracking-[0.01em] text-white sm:text-[3.5rem] xl:text-[4.25rem]">
            Nepal&apos;s Home of Competitive <span className="text-accent-blue-light">PUBG PC</span> Esports
          </h1>
          <p className="mt-5 max-w-[42rem] text-base leading-8 text-text-secondary">
            Compete in the best scrims and tournaments, track standings, earn glory, and become part of Nepal&apos;s growing PUBG PC esports community.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <ActionLink href={getEventRegistrationHref(featuredEvent)} className="min-w-[11rem] justify-center">
              Register Team
            </ActionLink>
            <ActionLink href="/events" variant="secondary" className="min-w-[11rem] justify-center">
              View Schedule
            </ActionLink>
            <ActionLink href="/pubg/results" variant="secondary" className="min-w-[11rem] justify-center">
              View Results
            </ActionLink>
          </div>
        </div>

        <div className="min-w-0">
          <div className="rounded-[26px] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(7,12,24,0.98),rgba(5,9,18,0.98))] p-5 shadow-[0_24px_70px_rgba(0,0,0,0.36)] sm:p-6">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-accent-blue-light">Next Featured Event</p>
            <div className="mt-4 flex items-center gap-3">
              <BravoLogo size={48} />
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-text-muted">
                PUBG PC
              </span>
            </div>
            <h2 className="mt-5 font-display text-3xl font-black uppercase leading-tight text-white">
              {featuredEvent?.name ?? "PUBG Mahasangram 2.0"}
            </h2>

            <div className="mt-6 grid gap-3">
              <div className="flex items-center justify-between gap-4 rounded-[18px] border border-white/[0.08] bg-white/[0.03] px-4 py-3">
                <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-text-muted">Date</span>
                <span className="text-right text-sm text-white">{getEventDateLabel(featuredEvent)}</span>
              </div>
              <div className="flex items-center justify-between gap-4 rounded-[18px] border border-white/[0.08] bg-white/[0.03] px-4 py-3">
                <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-text-muted">Format</span>
                <span className="text-right text-sm text-white">{getEventFormatLabel(featuredEvent)}</span>
              </div>
              <div className="flex items-center justify-between gap-4 rounded-[18px] border border-white/[0.08] bg-white/[0.03] px-4 py-3">
                <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-text-muted">Slots</span>
                <span className="text-right text-sm text-white">{getEventSlotsLabel(featuredEvent)}</span>
              </div>
            </div>

            <div className="mt-5 rounded-[18px] border border-white/[0.08] bg-white/[0.03] px-4 py-3">
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-text-muted">Registration Status</p>
              <span className={cx("mt-3 inline-flex rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em]", getEventStatusTone(featuredEvent))}>
                {getEventRegistrationLabel(featuredEvent)}
              </span>
            </div>

            <ActionLink href={getEventDetailHref(featuredEvent)} className="mt-6 w-full justify-center">
              View Details
            </ActionLink>
          </div>
        </div>
      </div>
    </section>
  );
}

function SponsorLogoStrip({ sponsors }: { sponsors: PlatformSponsorProfile[] }) {
  if (sponsors.length === 0) {
    return null;
  }

  return (
    <section className="overflow-hidden rounded-[26px] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(10,16,30,0.96),rgba(6,10,20,0.96))] px-4 py-4 shadow-[0_14px_40px_rgba(0,0,0,0.2)] sm:px-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="shrink-0 text-center lg:text-left">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-text-muted">Official Partners</p>
        </div>
        <div className={cx("grid flex-1 gap-3", sponsors.length === 1 ? "grid-cols-1" : "grid-cols-2 lg:grid-cols-5")}>
          {sponsors.map((sponsor) => {
            const visualUrl = getSponsorVisualUrl(sponsor);
            const href = getSponsorHref(sponsor);
            const cardClassName =
              "flex min-h-[74px] items-center justify-center rounded-[18px] border border-white/[0.08] bg-black/20 px-4 py-3 transition hover:border-accent-blue/30 hover:bg-accent-blue/5";
            const content = visualUrl ? (
              <ManagedImage
                src={visualUrl}
                alt={sponsor.name}
                sizes="180px"
                wrapperClassName="flex h-10 w-full items-center justify-center"
                className="max-h-10 w-auto object-contain"
              />
            ) : (
              <span className="font-display text-xl font-black uppercase tracking-[0.1em] text-white">
                {sponsor.name}
              </span>
            );

            if (isExternalHref(href)) {
              return (
                <a key={sponsor.id} href={href} target="_blank" rel="noreferrer" className={cardClassName}>
                  {content}
                </a>
              );
            }

            return (
              <Link key={sponsor.id} href={href} className={cardClassName}>
                {content}
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function CompetitionPulseSection({
  pubg,
  teamCount,
  playerCount,
}: {
  pubg: PubgHubDataset;
  teamCount: number;
  playerCount: number;
}) {
  const publishedMatches = pubg.matches.filter((match) => match.status === "published");
  const totalKills = publishedMatches.reduce((sum, match) => sum + match.totalKills, 0);
  const hasCompetitionData =
    publishedMatches.length > 0 || teamCount > 0 || playerCount > 0 || totalKills > 0;

  if (!hasCompetitionData) {
    return (
      <section className="light-card p-5">
        <SectionHeading icon={<Radio className="h-4 w-4" />} title="Competition Pulse" />
        <div className="rounded-[22px] border border-dashed border-white/10 bg-black/15 px-5 py-8 text-center">
          <p className="mx-auto max-w-3xl text-sm leading-7 text-text-muted">
            Official competition stats will appear after verified match results are published.
          </p>
        </div>
      </section>
    );
  }

  const cards = [
    {
      title: "Published Matches",
      value: publishedMatches.length > 0 ? formatNumber(publishedMatches.length) : "Pending",
      icon: <CalendarDays className="h-4 w-4" />,
    },
    {
      title: "Registered Teams",
      value: teamCount > 0 ? formatNumber(teamCount) : "Pending",
      icon: <Users className="h-4 w-4" />,
    },
    {
      title: "Active Players",
      value: playerCount > 0 ? formatNumber(playerCount) : "Pending",
      icon: <Crosshair className="h-4 w-4" />,
    },
    {
      title: "Total Kills",
      value: totalKills > 0 ? formatNumber(totalKills) : "Pending",
      icon: <Trophy className="h-4 w-4" />,
    },
  ];

  return (
    <section className="light-card p-5">
      <SectionHeading icon={<Radio className="h-4 w-4" />} title="Competition Pulse" />
      <div className="grid gap-3 lg:grid-cols-4">
        {cards.map((card) => (
          <div
            key={card.title}
            className="rounded-[22px] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(13,20,36,0.98),rgba(8,12,24,0.98))] px-4 py-4"
          >
            <div className="flex items-center gap-3">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-[14px] border border-accent-blue/25 bg-accent-blue/10 text-accent-blue-light">
                {card.icon}
              </span>
              <div>
                <p className="font-mono-stat text-3xl text-white">{card.value}</p>
                <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.16em] text-text-muted">{card.title}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function CurrentStandings({ teams }: { teams: PubgHubTeam[] }) {
  const rankedTeams = teams.slice(0, 5);

  return (
    <section className="light-card p-5 xl:col-span-1">
      <SectionHeading icon={<Trophy className="h-4 w-4" />} title="Current Standings" href="/pubg/leaderboards?view=teams" hrefLabel="View Full Leaderboard" />
      {rankedTeams.length === 0 ? (
        <div className="rounded-[22px] border border-dashed border-white/10 bg-black/15 px-5 py-8 text-center">
          <p className="text-sm leading-7 text-text-muted">
            Official standings will appear after verified match results are published.
          </p>
        </div>
      ) : (
        <>
          <div className="grid gap-3 md:hidden">
            {rankedTeams.map((team, index) => (
              <div key={team.id} className="rounded-[20px] border border-white/[0.08] bg-black/20 p-4">
                <div className="flex items-start gap-3">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-[14px] border border-accent-blue/20 bg-accent-blue/10 font-mono-stat text-sm text-accent-blue-light">
                    {index + 1}
                  </span>
                  <TeamAvatar name={team.name} imageUrl={team.logoUrl ?? undefined} size="md" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-display text-lg font-black uppercase text-white">{team.name}</p>
                    <p className="mt-1 text-xs uppercase tracking-[0.16em] text-text-muted">{team.tag ? `[${team.tag}]` : "PUBG Team"}</p>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="stat-pill !p-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-text-muted">Matches</p>
                    <p className="mt-2 font-mono-stat text-base text-white">{formatNumber(team.matches)}</p>
                  </div>
                  <div className="stat-pill !p-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-text-muted">WWCD</p>
                    <p className="mt-2 font-mono-stat text-base text-white">{formatNumber(team.wins)}</p>
                  </div>
                  <div className="stat-pill !p-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-text-muted">Placement</p>
                    <p className="mt-2 font-mono-stat text-base text-white">{formatNumber(team.placementPoints)}</p>
                  </div>
                  <div className="stat-pill !p-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-text-muted">Total</p>
                    <p className="mt-2 font-mono-stat text-base text-accent-blue-light">{formatNumber(team.totalPoints)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="hidden overflow-hidden rounded-[22px] border border-white/[0.08] md:block">
            <div className="grid grid-cols-[68px,minmax(0,2fr),92px,78px,108px,80px,90px] gap-3 border-b border-white/[0.08] bg-white/[0.03] px-4 py-3 text-[10px] font-black uppercase tracking-[0.18em] text-text-muted">
              <span>Rank</span>
              <span>Team</span>
              <span className="text-right">Matches</span>
              <span className="text-right">WWCD</span>
              <span className="text-right">Placement</span>
              <span className="text-right">Kills</span>
              <span className="text-right">Total</span>
            </div>
            <div className="divide-y divide-white/[0.06]">
              {rankedTeams.map((team, index) => (
                <Link
                  key={team.id}
                  href={`/pubg/teams/${team.slug ?? team.id}`}
                  className="grid grid-cols-[68px,minmax(0,2fr),92px,78px,108px,80px,90px] items-center gap-3 px-4 py-3.5 transition hover:bg-accent-blue/5"
                >
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-[14px] border border-accent-blue/20 bg-accent-blue/10 font-mono-stat text-sm text-accent-blue-light">
                    {index + 1}
                  </span>
                  <div className="flex min-w-0 items-center gap-3">
                    <TeamAvatar name={team.name} imageUrl={team.logoUrl ?? undefined} size="sm" />
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-white">{team.name}</p>
                      <p className="text-xs uppercase tracking-[0.16em] text-text-muted">{team.tag ? `[${team.tag}]` : "PUBG Team"}</p>
                    </div>
                  </div>
                  <span className="text-right font-mono-stat text-white">{formatNumber(team.matches)}</span>
                  <span className="text-right font-mono-stat text-white">{formatNumber(team.wins)}</span>
                  <span className="text-right font-mono-stat text-white">{formatNumber(team.placementPoints)}</span>
                  <span className="text-right font-mono-stat text-white">{formatNumber(team.kills)}</span>
                  <span className="text-right font-mono-stat text-accent-blue-light">{formatNumber(team.totalPoints)}</span>
                </Link>
              ))}
            </div>
          </div>
        </>
      )}
    </section>
  );
}

function TopTeamsCard({ teams }: { teams: PubgHubTeam[] }) {
  const topTeams = teams.slice(0, 5);

  return (
    <section className="light-card p-5">
      <SectionHeading icon={<Users className="h-4 w-4" />} title="Top Teams" href="/pubg/teams" hrefLabel="View All Teams" />
      {topTeams.length === 0 ? (
        <div className="rounded-[22px] border border-dashed border-white/10 bg-black/15 px-5 py-8 text-center">
          <p className="text-sm leading-7 text-text-muted">Top team rankings will appear after official standings are published.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {topTeams.map((team, index) => (
            <Link
              key={team.id}
              href={`/pubg/teams/${team.slug ?? team.id}`}
              className="flex items-center justify-between gap-3 rounded-[18px] border border-white/[0.08] bg-black/20 px-4 py-3 transition hover:border-accent-blue/30 hover:bg-accent-blue/5"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-[12px] border border-accent-blue/20 bg-accent-blue/10 font-mono-stat text-sm text-accent-blue-light">
                  {index + 1}
                </span>
                <TeamAvatar name={team.name} imageUrl={team.logoUrl ?? undefined} size="sm" />
                <div className="min-w-0">
                  <p className="truncate font-semibold text-white">{team.name}</p>
                  <p className="text-xs uppercase tracking-[0.16em] text-text-muted">{team.tag ? `[${team.tag}]` : "PUBG Team"}</p>
                </div>
              </div>
              <span className="font-mono-stat text-base text-white">{formatNumber(team.totalPoints)} PTS</span>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}

function TopPlayersCard({ players }: { players: PubgHubPlayer[] }) {
  const topPlayers = players.slice(0, 5);

  return (
    <section className="light-card p-5">
      <SectionHeading icon={<Crosshair className="h-4 w-4" />} title="Top Players" href="/pubg/players" hrefLabel="View All Players" />
      {topPlayers.length === 0 ? (
        <div className="rounded-[22px] border border-dashed border-white/10 bg-black/15 px-5 py-8 text-center">
          <p className="text-sm leading-7 text-text-muted">Player rankings will appear after official match stats are published.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {topPlayers.map((player, index) => (
            <Link
              key={player.id}
              href={`/pubg/players/${player.slug ?? player.id}`}
              className="flex items-center justify-between gap-3 rounded-[18px] border border-white/[0.08] bg-black/20 px-4 py-3 transition hover:border-accent-blue/30 hover:bg-accent-blue/5"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-[12px] border border-accent-blue/20 bg-accent-blue/10 font-mono-stat text-sm text-accent-blue-light">
                  {index + 1}
                </span>
                <TeamAvatar name={player.pubgName} imageUrl={player.avatarUrl ?? undefined} size="sm" />
                <div className="min-w-0">
                  <p className="truncate font-semibold text-white">{player.pubgName}</p>
                  <p className="truncate text-xs uppercase tracking-[0.16em] text-text-muted">{player.currentTeamName ?? "Team TBD"}</p>
                </div>
              </div>
              <span className="font-mono-stat text-base text-white">{formatNumber(player.kills)} KILLS</span>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}

function UpcomingEventsSection({ events }: { events: PlatformEvent[] }) {
  const visibleEvents = (events.filter((event) => event.status !== "completed").slice(0, 3).length > 0
    ? events.filter((event) => event.status !== "completed").slice(0, 3)
    : events.slice(0, 3));

  return (
    <section className="light-card p-5">
      <SectionHeading icon={<CalendarDays className="h-4 w-4" />} title="Upcoming Events" href="/events" hrefLabel="View All Events" />
      {visibleEvents.length === 0 ? (
        <div className="rounded-[22px] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(12,18,34,0.96),rgba(8,13,26,0.96))] p-6">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-accent-blue-light">Next Registration Window</p>
          <h3 className="mt-3 font-display text-2xl font-black uppercase text-white">PUBG Mahasangram 2.0</h3>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-text-muted">
            Registration will appear here as soon as the next official Bravo event is published.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <ActionLink href="/teams/register">Register Team</ActionLink>
            <ActionLink href="/events" variant="secondary">
              View Events
            </ActionLink>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-3">
          {visibleEvents.map((event) => (
            <div
              key={event.id}
              className="overflow-hidden rounded-[24px] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(12,18,34,0.96),rgba(8,13,26,0.96))] p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-accent-blue-light">{event.gameName || "PUBG PC"}</p>
                  <h3 className="mt-3 font-display text-2xl font-black uppercase leading-tight text-white">{event.name}</h3>
                </div>
                <BravoLogo size={42} />
              </div>

              <div className="mt-5 grid gap-3">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-text-muted">Format</span>
                  <span className="text-right text-sm text-white">{getEventFormatLabel(event)}</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-text-muted">Date</span>
                  <span className="text-right text-sm text-white">{getEventDateLabel(event)}</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-text-muted">Registration</span>
                  <span className={cx("rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em]", getEventStatusTone(event))}>
                    {getEventRegistrationLabel(event)}
                  </span>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                {canRegisterForEvent(event) ? (
                  <ActionLink href={getEventRegistrationHref(event)} className="flex-1 justify-center">
                    Register Now
                  </ActionLink>
                ) : null}
                <ActionLink
                  href={getEventDetailHref(event)}
                  variant={canRegisterForEvent(event) ? "secondary" : "primary"}
                  className="flex-1 justify-center"
                >
                  View Details
                </ActionLink>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function HowItWorksSection() {
  const steps = [
    {
      number: "1",
      title: "Register Team",
      detail: "Create your team and complete the registration.",
      icon: <Users className="h-6 w-6" />,
    },
    {
      number: "2",
      title: "Play Matches",
      detail: "Compete in official matches and earn points.",
      icon: <Crosshair className="h-6 w-6" />,
    },
    {
      number: "3",
      title: "Climb Leaderboards",
      detail: "Top the standings and become legends.",
      icon: <Trophy className="h-6 w-6" />,
    },
  ];

  return (
    <section className="light-card p-5">
      <SectionHeading icon={<Trophy className="h-4 w-4" />} title="How It Works" />
      <div className="grid gap-3 xl:grid-cols-3">
        {steps.map((step) => (
          <div key={step.number} className="rounded-[22px] border border-white/[0.08] bg-black/20 p-5">
            <div className="flex items-center gap-4">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-accent-blue/25 bg-accent-blue/10 font-display text-lg font-black text-white">
                {step.number}
              </span>
              <span className="text-accent-blue-light">{step.icon}</span>
            </div>
            <h3 className="mt-5 font-display text-xl font-black uppercase text-white">{step.title}</h3>
            <p className="mt-3 text-sm leading-7 text-text-muted">{step.detail}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function UpdateCard({ item }: { item: HomepageUpdateCard }) {
  const external = isExternalHref(item.href);
  const cardContent = (
    <>
      <div className="relative">
        {item.imageUrl ? (
          <ManagedImage
            src={item.imageUrl}
            alt={item.title}
            sizes="(min-width: 1280px) 33vw, (min-width: 768px) 50vw, 100vw"
            wrapperClassName="h-52 w-full"
            className="object-cover"
          />
        ) : (
          <div className="h-52 bg-[radial-gradient(circle_at_18%_20%,rgba(30,123,255,0.18),transparent_26%),linear-gradient(180deg,rgba(12,18,34,0.96),rgba(8,13,26,0.96))]" />
        )}
        {item.kind === "Video" ? (
          <span className="absolute left-4 top-4 inline-flex h-12 w-12 items-center justify-center rounded-full border border-white/15 bg-black/45 text-white">
            <Play className="ml-0.5 h-4 w-4 fill-current" />
          </span>
        ) : null}
      </div>
      <div className="p-5">
        <span
          className={cx(
            "inline-flex rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em]",
            item.kind === "Video"
              ? "bg-violet-500/15 text-violet-200"
              : item.kind === "Announcement"
                ? "bg-accent-yellow/12 text-accent-yellow"
                : "bg-accent-blue/12 text-accent-blue-light"
          )}
        >
          {item.kind}
        </span>
        <h3 className="mt-4 font-display text-2xl font-black uppercase leading-tight text-white">{item.title}</h3>
        <p className="mt-3 text-sm leading-7 text-text-muted">{item.summary}</p>
        <p className="mt-4 text-sm text-text-muted">{item.meta}</p>
      </div>
    </>
  );

  if (external) {
    return (
      <a
        href={item.href}
        target="_blank"
        rel="noreferrer"
        className="block overflow-hidden rounded-[24px] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(12,18,34,0.96),rgba(8,13,26,0.96))] transition hover:border-accent-blue/30 hover:bg-accent-blue/5"
      >
        {cardContent}
      </a>
    );
  }

  return (
    <Link
      href={item.href}
      className="block overflow-hidden rounded-[24px] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(12,18,34,0.96),rgba(8,13,26,0.96))] transition hover:border-accent-blue/30 hover:bg-accent-blue/5"
    >
      {cardContent}
    </Link>
  );
}

function LatestUpdatesSection({ updates }: { updates: HomepageUpdateCard[] }) {
  return (
    <section className="light-card p-5">
      <SectionHeading icon={<Newspaper className="h-4 w-4" />} title="Latest Updates" href="/news" hrefLabel="View All News" />
      {updates.length === 0 ? (
        <div className="rounded-[22px] border border-dashed border-white/10 bg-black/15 px-5 py-8 text-center">
          <p className="mx-auto max-w-3xl text-sm leading-7 text-text-muted">
            Official news, highlights, and announcements will appear here after publication.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-3">
          {updates.map((update) => (
            <UpdateCard key={update.id} item={update} />
          ))}
        </div>
      )}
    </section>
  );
}

function CommunityBanner() {
  return (
    <section className="overflow-hidden rounded-[28px] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(10,18,36,0.98),rgba(8,13,26,0.98))] shadow-[0_24px_80px_rgba(0,0,0,0.34)]">
      <div className="relative px-5 py-6 sm:px-7">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_16%_20%,rgba(30,123,255,0.22),transparent_30%),radial-gradient(circle_at_88%_20%,rgba(30,123,255,0.1),transparent_24%)]" />
        <div className="relative flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div className="max-w-3xl">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-accent-blue-light">Community</p>
            <h2 className="mt-3 font-display text-3xl font-black uppercase text-white">
              Be Part of Nepal&apos;s PUBG PC Esports Community
            </h2>
            <p className="mt-3 text-sm leading-7 text-text-secondary">
              Join our Discord server, register your team, get updates, and never miss a match.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <ActionLink href={BRAVO_DISCORD_URL} className="min-w-[11rem] justify-center">
              Join Discord
            </ActionLink>
            <ActionLink href="/teams/register" variant="secondary" className="min-w-[11rem] justify-center">
              Register Team
            </ActionLink>
          </div>
        </div>
      </div>
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
  const homepageEvents = resolveHomepageEvents(hub);
  const homepageSponsors = resolveHomepageSponsors(hub);
  const featuredEvent = homepageEvents.find((event) => canRegisterForEvent(event)) ?? homepageEvents[0] ?? null;
  const publicTeams = getPublicPubgTeams(pubg);
  const publicPlayers = getPublicPubgPlayers(pubg, publicTeams);
  const updates = resolveHomepageUpdates(hub);

  return (
    <main className="page-shell pb-16 sm:pb-20">
      <div className="page-stack gap-4 sm:gap-5">
        <HeroSection featuredEvent={featuredEvent} />
        <SponsorLogoStrip sponsors={homepageSponsors} />
        <CompetitionPulseSection pubg={pubg} teamCount={publicTeams.length} playerCount={publicPlayers.length} />

        <section className="grid gap-4 xl:grid-cols-[1.5fr,1fr,1fr]">
          <CurrentStandings teams={publicTeams} />
          <TopTeamsCard teams={publicTeams} />
          <TopPlayersCard players={publicPlayers} />
        </section>

        <UpcomingEventsSection events={homepageEvents} />
        <HowItWorksSection />
        <LatestUpdatesSection updates={updates} />
        <CommunityBanner />
      </div>
    </main>
  );
}
