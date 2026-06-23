import Link from "next/link";
import {
  CalendarDays,
  ChevronRight,
  Clapperboard,
  Crosshair,
  Newspaper,
  Play,
  Radio,
  ShieldCheck,
  Trophy,
  Users,
} from "lucide-react";
import BravoLogo from "@/components/ui/BravoLogo";
import TeamAvatar from "@/components/ui/TeamAvatar";
import { BRAVO_DISCORD_URL, BRAVO_INSTAGRAM_URL } from "@/lib/brand-links";
import type { PubgHubDataset, PubgHubMatch, PubgHubPlayer, PubgHubTeam } from "@/lib/pubg-hub";
import type {
  PlatformArticle,
  PlatformEvent,
  PlatformHubData,
  PlatformMediaItem,
  PlatformSponsorProfile,
} from "@/lib/platform-hub";
import { formatDate, formatDateRange, formatNumber } from "@/components/pubg/PubgHubUI";

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
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "watch";
  className?: string;
}) {
  const buttonClassName =
    variant === "secondary" ? "btn-secondary" : variant === "watch" ? "btn-watch-live" : "btn-primary";

  if (isExternalHref(href)) {
    return (
      <a href={href} target="_blank" rel="noreferrer" className={joinClasses(buttonClassName, className)}>
        {children}
      </a>
    );
  }

  return (
    <Link href={href} className={joinClasses(buttonClassName, className)}>
      {children}
    </Link>
  );
}

function PanelHeader({
  icon,
  title,
  href,
  hrefLabel = "View All",
}: {
  icon?: React.ReactNode;
  title: string;
  href?: string;
  hrefLabel?: string;
}) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        {icon ? <span className="text-accent-blue">{icon}</span> : null}
        <h2 className="font-display text-lg font-black uppercase tracking-[0.08em] text-white">{title}</h2>
      </div>
      {href ? (
        <Link
          href={href}
          className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-[0.16em] text-accent-blue transition hover:text-white"
        >
          {hrefLabel}
          <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      ) : null}
    </div>
  );
}

function getEventHref(event: PlatformEvent) {
  return event.analyticsHref ?? (event.gameSlug === "pubg-pc" ? `/pubg/events/${event.slug}` : `/events/${event.slug}`);
}

function getMediaHref(item: PlatformMediaItem) {
  return item.url ?? `/media/${item.slug}`;
}

function getSponsorHref(sponsor: PlatformSponsorProfile) {
  return sponsor.websiteUrl ?? `/sponsors/${sponsor.slug}`;
}

function getMatchHref(match: PubgHubMatch) {
  return `/pubg/matches/${match.id}`;
}

function getHeroLiveCard(
  featuredEvent: PlatformEvent | null,
  liveMatch: PubgHubMatch | null,
  liveMatchCount: number,
  watchLiveHref: string
) {
  if (liveMatch) {
    return {
      eyebrow: "Live Now",
      title: liveMatch.eventName,
      detail: `Match ${liveMatch.matchNumber}/${Math.max(liveMatch.matchNumber, liveMatchCount)}`,
      subdetail: liveMatch.mapName,
      href: watchLiveHref,
      actionLabel: "Watch Live",
    };
  }

  return {
    eyebrow: "Up Next",
    title: featuredEvent?.name ?? "Bravo Daily Scrims",
    detail: featuredEvent ? formatDateRange(featuredEvent.startDate, featuredEvent.endDate) : "Schedule TBA",
    subdetail: featuredEvent?.gameName ?? "PUBG PC",
    href: featuredEvent ? getEventHref(featuredEvent) : "/events",
    actionLabel: featuredEvent ? "Open Event" : "Browse Events",
  };
}

function HeroSection({
  hub,
  pubg,
  featuredEvent,
  heroSponsor,
}: {
  hub: PlatformHubData;
  pubg: PubgHubDataset;
  featuredEvent: PlatformEvent | null;
  heroSponsor: PlatformSponsorProfile | null;
}) {
  const liveMatch = pubg.matches.find((match) => match.eventStatus === "ongoing") ?? null;
  const liveEvent = liveMatch ? pubg.events.find((event) => event.id === liveMatch.eventId) ?? null : null;
  const liveCard = getHeroLiveCard(featuredEvent, liveMatch, liveEvent?.matchCount ?? 0, hub.home.liveFeature.href);
  const heroEventHref = featuredEvent ? getEventHref(featuredEvent) : "/pubg/leaderboards";
  const sponsorHref = heroSponsor ? getSponsorHref(heroSponsor) : "/sponsors";

  return (
    <section className="hero-banner overflow-hidden !p-0">
      <div className="relative grid gap-6 px-5 py-6 sm:px-7 sm:py-8 xl:grid-cols-[1.05fr,0.95fr]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_26%,rgba(20,126,245,0.24),transparent_34%),radial-gradient(circle_at_80%_18%,rgba(47,152,255,0.12),transparent_20%)]" />
        <div className="absolute inset-y-0 right-[16%] hidden w-[34rem] opacity-[0.08] lg:block">
          <div className="flex h-full items-center justify-center">
            <BravoLogo size={220} />
          </div>
        </div>

        <div className="relative z-10 min-w-0">
          <p className="section-title">01. Homepage</p>
          <h1 className="hero-h1 mt-5 max-w-[12ch]">
            PUBG PC
            <br />
            Competitive Hub
            <br />
            For <span className="gradient-text">Nepal</span>
          </h1>
          <p className="mt-5 max-w-2xl text-sm leading-7 text-text-secondary sm:text-base sm:leading-8">
            Daily Scrims • Tournaments • Statistics
            <br />
            Bringing Nepal&apos;s PUBG community together with verified Bravo data, current standings, and live event context.
          </p>

          <div className="mt-7 flex flex-wrap gap-3">
            <ActionLink href="/pubg/leaderboards">View Leaderboards</ActionLink>
            <ActionLink href="/teams/register" variant="secondary">
              Join Scrims
            </ActionLink>
          </div>

          <div className="mt-8 grid max-w-3xl gap-3 sm:grid-cols-3">
            <div className="stat-pill">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-text-muted">Featured Event</p>
              <p className="mt-2 font-display text-lg font-black uppercase text-white">
                {featuredEvent?.name ?? "Awaiting next window"}
              </p>
              <p className="mt-2 text-xs leading-6 text-text-muted">
                {featuredEvent ? formatDateRange(featuredEvent.startDate, featuredEvent.endDate) : "As soon as an event is published, it surfaces here."}
              </p>
            </div>
            <div className="stat-pill">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-text-muted">Tracked Teams</p>
              <p className="mt-2 font-mono-stat text-2xl text-accent-blue-light">{formatNumber(pubg.teams.length)}</p>
              <p className="mt-2 text-xs leading-6 text-text-muted">Real roster-backed team profiles in the current PUBG hub.</p>
            </div>
            <div className="stat-pill">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-text-muted">Published Matches</p>
              <p className="mt-2 font-mono-stat text-2xl text-accent-blue-light">{formatNumber(pubg.matches.length)}</p>
              <p className="mt-2 text-xs leading-6 text-text-muted">Leaderboards and player output derive from the same public results.</p>
            </div>
          </div>
        </div>

        <div className="relative z-10 min-w-0">
          <div className="relative overflow-hidden rounded-[28px] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(9,15,29,0.94),rgba(7,11,21,0.94))] px-5 py-6 shadow-[0_24px_80px_rgba(0,0,0,0.34)] sm:px-6">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_36%_18%,rgba(47,152,255,0.16),transparent_26%),radial-gradient(circle_at_70%_88%,rgba(20,126,245,0.12),transparent_26%)]" />
            <div className="relative">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-accent-red">{liveCard.eyebrow}</p>
                  <h2 className="mt-3 font-display text-2xl font-black uppercase text-white">{liveCard.title}</h2>
                  <p className="mt-2 text-sm text-text-muted">{liveCard.detail}</p>
                  <p className="mt-1 text-sm text-text-muted">{liveCard.subdetail}</p>
                </div>
                <img
                  src="/images/hero-character.svg"
                  alt=""
                  aria-hidden="true"
                  className="hidden h-56 w-auto object-contain opacity-95 sm:block"
                />
              </div>

              <div className="mt-5 max-w-[16rem] rounded-[20px] border border-white/[0.08] bg-black/20 p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-text-muted">Daily Scrims</p>
                <p className="mt-2 font-display text-lg font-black uppercase text-white">
                  {liveMatch ? `Match ${liveMatch.matchNumber}` : featuredEvent?.gameName ?? "PUBG PC"}
                </p>
                <p className="mt-1 text-sm text-text-muted">{liveCard.detail}</p>
                <ActionLink href={liveCard.href} variant="watch" className="mt-4 w-full justify-center">
                  {liveCard.actionLabel}
                </ActionLink>
              </div>
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Link
              href={heroEventHref}
              className="esports-card block p-4 transition hover:border-accent-blue/30"
            >
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-accent-blue">Event Promotion</p>
              <h3 className="mt-2 font-display text-lg font-black uppercase text-white">
                {featuredEvent?.name ?? "Upcoming Bravo event"}
              </h3>
              <p className="mt-2 text-sm leading-6 text-text-muted">
                {featuredEvent?.summary ?? "The next published event surfaces here automatically."}
              </p>
            </Link>
            <Link
              href={sponsorHref}
              className="esports-card block p-4 transition hover:border-accent-blue/30"
            >
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-accent-blue">Sponsor Promotion</p>
              <h3 className="mt-2 font-display text-lg font-black uppercase text-white">
                {heroSponsor?.name ?? "Published sponsors"}
              </h3>
              <p className="mt-2 text-sm leading-6 text-text-muted">
                {heroSponsor?.description ?? "Real partners, real assets, and direct sponsor profile links only."}
              </p>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function SponsorStrip({
  sponsors,
}: {
  sponsors: PlatformSponsorProfile[];
}) {
  if (sponsors.length === 0) {
    return null;
  }

  return (
    <section className="sponsor-strip px-4 py-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {sponsors.slice(0, 4).map((sponsor) => (
          <a
            key={sponsor.id}
            href={getSponsorHref(sponsor)}
            target={isExternalHref(getSponsorHref(sponsor)) ? "_blank" : undefined}
            rel="noreferrer"
            className="flex min-h-[74px] items-center justify-center rounded-[18px] border border-white/[0.06] bg-black/15 px-4 py-3 transition hover:border-accent-blue/25 hover:bg-accent-blue/5"
          >
            {sponsor.logoUrl ? (
              <img
                src={sponsor.logoUrl}
                alt={sponsor.name}
                className="max-h-9 w-auto object-contain"
              />
            ) : (
              <span className="font-display text-lg font-black uppercase tracking-[0.12em] text-white">
                {sponsor.name}
              </span>
            )}
          </a>
        ))}
      </div>
    </section>
  );
}

function LivePulse({ pubg }: { pubg: PubgHubDataset }) {
  const totalKills = pubg.matches.reduce((sum, match) => sum + match.totalKills, 0);
  const liveMatches = pubg.matches.filter((match) => match.eventStatus === "ongoing").length;

  const cards = [
    { label: "Live Matches", value: liveMatches, detail: "Matches live", icon: <Radio className="h-4 w-4" /> },
    { label: "Players", value: pubg.players.length, detail: "Tracked players", icon: <Users className="h-4 w-4" /> },
    { label: "Teams", value: pubg.teams.length, detail: "Competing teams", icon: <ShieldCheck className="h-4 w-4" /> },
    { label: "Total Kills", value: totalKills, detail: "Across tracked lobbies", icon: <Crosshair className="h-4 w-4" /> },
  ];

  return (
    <section className="esports-card p-4">
      <PanelHeader icon={<Radio className="h-4 w-4" />} title="Live Pulse" />
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <div key={card.label} className="stat-pill flex items-start gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-[14px] border border-accent-blue/15 bg-accent-blue/10 text-accent-blue">
              {card.icon}
            </span>
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-text-muted">{card.label}</p>
              <p className="mt-2 font-mono-stat text-2xl text-white">{formatNumber(card.value)}</p>
              <p className="mt-1 text-xs text-text-muted">{card.detail}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function TodayScrims({
  pubg,
  watchLiveHref,
}: {
  pubg: PubgHubDataset;
  watchLiveHref: string;
}) {
  const eventById = new Map(pubg.events.map((event) => [event.id, event] as const));
  const matches = [...pubg.matches].slice(0, 3);

  return (
    <section className="esports-card p-4">
      <PanelHeader icon={<ShieldCheck className="h-4 w-4" />} title="Today&apos;s Scrims" href="/pubg/results" />
      <div className="space-y-3">
        {matches.length === 0 ? (
          <div className="rounded-[18px] border border-dashed border-white/10 bg-black/15 px-4 py-5 text-sm text-text-muted">
            Upcoming or recent scrim rows will surface here once match data is published.
          </div>
        ) : (
          matches.map((match) => {
            const event = eventById.get(match.eventId);
            const action =
              match.eventStatus === "ongoing"
                ? { label: "Watch", href: watchLiveHref, variant: "watch" as const }
                : event?.status === "upcoming"
                  ? { label: "Join", href: `/teams/register?tournament=${event.id}`, variant: "secondary" as const }
                  : { label: "View", href: getMatchHref(match), variant: "secondary" as const };

            return (
              <div
                key={match.id}
                className="rounded-[18px] border border-white/[0.06] bg-black/15 px-4 py-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-white">{match.eventName}</p>
                    <p className="mt-1 text-xs uppercase tracking-[0.16em] text-text-muted">
                      {match.mapName} | Match {match.matchNumber}
                    </p>
                  </div>
                  <span
                    className={joinClasses(
                      "rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em]",
                      match.eventStatus === "ongoing"
                        ? "border-accent-red/30 bg-accent-red/10 text-white"
                        : match.eventStatus === "upcoming"
                          ? "border-accent-blue/30 bg-accent-blue/10 text-accent-blue-light"
                          : "border-accent-green/30 bg-accent-green/10 text-accent-green"
                    )}
                  >
                    {match.eventStatus === "ongoing" ? "Live" : match.eventStatus === "upcoming" ? "Upcoming" : "Completed"}
                  </span>
                </div>
                <div className="mt-4 flex items-center justify-between gap-4">
                  <div className="grid flex-1 grid-cols-2 gap-3 text-xs text-text-muted sm:grid-cols-3">
                    <span>{formatDate(match.startTime)}</span>
                    <span>{formatNumber(match.totalKills)} kills</span>
                    <span>{formatNumber(match.teamResults.length)} teams</span>
                  </div>
                  <ActionLink href={action.href} variant={action.variant} className="!h-9 !px-3">
                    {action.label}
                  </ActionLink>
                </div>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}

function CurrentStandings({ teams }: { teams: PubgHubTeam[] }) {
  return (
    <section className="esports-card overflow-hidden !p-0">
      <div className="px-4 py-4">
        <PanelHeader icon={<Trophy className="h-4 w-4" />} title="Current Standings" href="/pubg/leaderboards" />
      </div>
      <div className="hidden px-4 pb-4 md:block">
        <div className="table-scroll rounded-[18px] border border-white/[0.06]">
          <table className="data-table min-w-full">
            <thead>
              <tr>
                <th>#</th>
                <th>Team</th>
                <th className="text-right">Matches</th>
                <th className="text-right">WWCD</th>
                <th className="text-right">Placement</th>
                <th className="text-right">Kills</th>
                <th className="text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {teams.slice(0, 5).map((team, index) => (
                <tr key={team.id}>
                  <td className="font-mono-stat text-accent-blue-light">#{index + 1}</td>
                  <td>
                    <Link href={`/pubg/teams/${team.slug}`} className="flex items-center gap-3 hover:text-accent-blue">
                      <TeamAvatar name={team.name} imageUrl={team.logoUrl ?? undefined} size="sm" />
                      <span className="font-semibold uppercase text-white">{team.name}</span>
                    </Link>
                  </td>
                  <td className="text-right text-text-secondary">{formatNumber(team.matches)}</td>
                  <td className="text-right text-text-secondary">{formatNumber(team.wins)}</td>
                  <td className="text-right text-text-secondary">{formatNumber(team.placementPoints)}</td>
                  <td className="text-right text-text-secondary">{formatNumber(team.kills)}</td>
                  <td className="points-cell text-right">{formatNumber(team.totalPoints)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid gap-3 px-4 pb-4 md:hidden">
        {teams.slice(0, 5).map((team, index) => (
          <Link
            key={team.id}
            href={`/pubg/teams/${team.slug}`}
            className="rounded-[18px] border border-white/[0.06] bg-black/15 p-4"
          >
            <div className="flex items-center gap-3">
              <span className="font-mono-stat text-sm text-accent-blue-light">#{index + 1}</span>
              <TeamAvatar name={team.name} imageUrl={team.logoUrl ?? undefined} size="sm" />
              <div>
                <p className="font-semibold uppercase text-white">{team.name}</p>
                <p className="text-xs uppercase tracking-[0.14em] text-text-muted">{team.formLabel}</p>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-3 text-xs text-text-muted">
              <span>{team.matches} M</span>
              <span>{team.kills} K</span>
              <span className="text-accent-blue-light">{team.totalPoints} PTS</span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

function UpcomingEvents({ events }: { events: PlatformEvent[] }) {
  return (
    <section className="esports-card p-4">
      <PanelHeader icon={<CalendarDays className="h-4 w-4" />} title="Upcoming Events" href="/events" />
      <div className="grid gap-3">
        {events.length === 0 ? (
          <div className="rounded-[18px] border border-dashed border-white/10 bg-black/15 px-4 py-5 text-sm text-text-muted">
            Upcoming events will appear here as soon as they are published.
          </div>
        ) : (
          events.slice(0, 3).map((event) => (
            <Link
              key={event.id}
              href={getEventHref(event)}
            className="overflow-hidden rounded-[20px] border border-white/[0.06] bg-black/15 transition hover:border-accent-blue/25 hover:bg-accent-blue/5"
            >
              {event.bannerUrl ? (
                <img src={event.bannerUrl} alt={event.name} className="h-32 w-full object-cover" />
              ) : (
                <div className="h-32 bg-[radial-gradient(circle_at_top_left,rgba(47,152,255,0.22),transparent_30%),linear-gradient(180deg,rgba(16,24,43,0.96),rgba(8,14,28,0.96))]" />
              )}
              <div className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-accent-blue">{event.type}</p>
                    <h3 className="mt-2 font-display text-xl font-black uppercase text-white">{event.name}</h3>
                  </div>
                  <span className="rounded-full border border-accent-blue/30 bg-accent-blue/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-accent-blue-light">
                    {event.prizePool}
                  </span>
                </div>
                <p className="mt-3 text-sm text-text-muted">{formatDateRange(event.startDate, event.endDate)}</p>
                <p className="mt-1 text-sm text-text-muted">{event.region}</p>
                <div className="mt-4">
                  <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-[0.16em] text-accent-blue">
                    View Details
                    <ChevronRight className="h-3.5 w-3.5" />
                  </span>
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
    </section>
  );
}

function TeamSpotlightCard({ team, rank }: { team: PubgHubTeam; rank: number }) {
  return (
    <Link
      href={`/pubg/teams/${team.slug}`}
      className="rounded-[20px] border border-white/[0.06] bg-black/15 p-4 transition hover:border-accent-blue/25 hover:bg-accent-blue/5"
    >
      <div className="flex items-center gap-3">
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] font-mono-stat text-xs text-accent-blue-light">
          #{rank}
        </span>
        <TeamAvatar name={team.name} imageUrl={team.logoUrl ?? undefined} size="lg" />
        <div className="min-w-0">
          <p className="truncate font-display text-lg font-black uppercase text-white">{team.name}</p>
          <p className="text-xs uppercase tracking-[0.16em] text-text-muted">{team.formLabel}</p>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-3">
        <div className="stat-pill !p-3">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-text-muted">Points</p>
          <p className="mt-2 font-mono-stat text-lg text-accent-blue-light">{formatNumber(team.totalPoints)}</p>
        </div>
        <div className="stat-pill !p-3">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-text-muted">Wins</p>
          <p className="mt-2 font-mono-stat text-lg text-white">{formatNumber(team.wins)}</p>
        </div>
        <div className="stat-pill !p-3">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-text-muted">Kills</p>
          <p className="mt-2 font-mono-stat text-lg text-white">{formatNumber(team.kills)}</p>
        </div>
      </div>
    </Link>
  );
}

function TopTeams({ teams }: { teams: PubgHubTeam[] }) {
  return (
    <section className="esports-card p-4">
      <PanelHeader icon={<ShieldCheck className="h-4 w-4" />} title="Top Teams" href="/pubg/teams" />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {teams.slice(0, 4).map((team, index) => (
          <TeamSpotlightCard key={team.id} team={team} rank={index + 1} />
        ))}
      </div>
    </section>
  );
}

function PlayerSpotlightCard({ player }: { player: PubgHubPlayer }) {
  return (
    <Link
      href={`/pubg/players/${player.slug}`}
      className="rounded-[20px] border border-white/[0.06] bg-black/15 p-4 transition hover:border-accent-blue/25 hover:bg-accent-blue/5"
    >
      <div className="flex items-center gap-3">
        <TeamAvatar name={player.pubgName} imageUrl={player.avatarUrl ?? undefined} size="lg" />
        <div className="min-w-0">
          <p className="truncate font-display text-lg font-black uppercase text-white">{player.pubgName}</p>
          <p className="truncate text-xs uppercase tracking-[0.16em] text-text-muted">
            {player.currentTeamName ?? "Team TBD"}
          </p>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="stat-pill !p-3">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-text-muted">Kills</p>
          <p className="mt-2 font-mono-stat text-lg text-accent-blue-light">{formatNumber(player.kills)}</p>
        </div>
        <div className="stat-pill !p-3">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-text-muted">Damage</p>
          <p className="mt-2 font-mono-stat text-lg text-white">{formatNumber(player.damage)}</p>
        </div>
      </div>
    </Link>
  );
}

function TopPlayers({ players }: { players: PubgHubPlayer[] }) {
  return (
    <section className="esports-card p-4">
      <PanelHeader icon={<Users className="h-4 w-4" />} title="Top Players" href="/pubg/players" />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {players.slice(0, 4).map((player) => (
          <PlayerSpotlightCard key={player.id} player={player} />
        ))}
      </div>
    </section>
  );
}

function NewsCard({ article }: { article: PlatformArticle | null }) {
  return (
    <section className="esports-card h-full p-4">
      <PanelHeader icon={<Newspaper className="h-4 w-4" />} title="Latest News" href="/news" />
      {article ? (
        <Link href={`/news/${article.slug}`} className="block overflow-hidden rounded-[18px] border border-white/[0.06] bg-black/15">
          {article.imageUrl ? (
            <img src={article.imageUrl} alt={article.title} className="h-40 w-full object-cover" />
          ) : null}
          <div className="p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-accent-blue">{article.category}</p>
            <h3 className="mt-3 font-display text-lg font-black uppercase text-white">{article.title}</h3>
            <p className="mt-2 text-sm text-text-muted">{formatDate(article.date)}</p>
          </div>
        </Link>
      ) : (
        <div className="rounded-[18px] border border-dashed border-white/10 bg-black/15 px-4 py-5 text-sm text-text-muted">
          Latest published news will appear here automatically.
        </div>
      )}
    </section>
  );
}

function VideoCard({ item }: { item: PlatformMediaItem | null }) {
  return (
    <section className="esports-card h-full p-4">
      <PanelHeader icon={<Clapperboard className="h-4 w-4" />} title="Latest Videos" href="/media" />
      {item ? (
        <a
          href={getMediaHref(item)}
          target={isExternalHref(getMediaHref(item)) ? "_blank" : undefined}
          rel="noreferrer"
          className="block overflow-hidden rounded-[18px] border border-white/[0.06] bg-black/15"
        >
          <div className="relative">
            {item.imageUrl ? (
              <img src={item.imageUrl} alt={item.title} className="h-40 w-full object-cover" />
            ) : (
              <div className="h-40 bg-[radial-gradient(circle_at_top_left,rgba(47,152,255,0.2),transparent_30%),linear-gradient(180deg,rgba(16,24,43,0.96),rgba(8,14,28,0.96))]" />
            )}
            <span className="absolute left-4 top-4 inline-flex h-12 w-12 items-center justify-center rounded-full border border-white/15 bg-black/45 text-white">
              <Play className="ml-0.5 h-4 w-4 fill-current" />
            </span>
          </div>
          <div className="p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-accent-blue">{item.category}</p>
            <h3 className="mt-3 font-display text-lg font-black uppercase text-white">{item.title}</h3>
            <p className="mt-2 text-sm text-text-muted">{item.duration ?? "Duration TBA"}</p>
          </div>
        </a>
      ) : (
        <div className="rounded-[18px] border border-dashed border-white/10 bg-black/15 px-4 py-5 text-sm text-text-muted">
          Published video coverage will appear here automatically.
        </div>
      )}
    </section>
  );
}

function FollowBravo() {
  const socials = [
    { label: "Discord", href: BRAVO_DISCORD_URL },
    { label: "Instagram", href: BRAVO_INSTAGRAM_URL },
    { label: "YouTube", href: "https://www.youtube.com/@bravogamingnepal7981" },
    { label: "Contact", href: "/contact" },
  ];

  return (
    <section className="esports-card h-full p-4">
      <PanelHeader icon={<Users className="h-4 w-4" />} title="Follow Bravo" />
      <div className="rounded-[18px] border border-white/[0.06] bg-black/15 p-4">
        <p className="font-display text-lg font-black uppercase text-white">Official public channels</p>
        <p className="mt-2 text-sm leading-7 text-text-muted">
          Follow Bravo for scrim calls, event posters, highlights, sponsor drops, and community updates.
        </p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {socials.map((item) => (
            <ActionLink key={item.label} href={item.href} variant="secondary" className="justify-center">
              {item.label}
            </ActionLink>
          ))}
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
  const featuredEvent = hub.home.featuredEvents[0] ?? hub.home.upcomingEvents[0] ?? hub.events[0] ?? null;
  const homepageSponsors =
    hub.home.featuredSponsors.length > 0
      ? hub.home.featuredSponsors
      : hub.sponsors.filter((sponsor) => sponsor.showOnHomepage).slice(0, 4);

  return (
    <main className="page-shell pb-12">
      <div className="page-stack">
        <HeroSection
          hub={hub}
          pubg={pubg}
          featuredEvent={featuredEvent}
          heroSponsor={homepageSponsors[0] ?? null}
        />

        <SponsorStrip sponsors={homepageSponsors} />
        <LivePulse pubg={pubg} />

        <section className="grid gap-6 xl:grid-cols-[0.88fr,1.12fr]">
          <TodayScrims pubg={pubg} watchLiveHref={hub.home.liveFeature.href} />
          <CurrentStandings teams={pubg.teams} />
        </section>

        <section className="grid gap-6 xl:grid-cols-[0.95fr,1.05fr]">
          <UpcomingEvents events={hub.home.upcomingEvents} />
          <TopTeams teams={pubg.teams} />
        </section>

        <TopPlayers players={pubg.players} />

        <section className="grid gap-6 xl:grid-cols-3">
          <NewsCard article={hub.home.featuredNews[0] ?? null} />
          <VideoCard item={hub.home.featuredMedia[0] ?? null} />
          <FollowBravo />
        </section>
      </div>
    </main>
  );
}
