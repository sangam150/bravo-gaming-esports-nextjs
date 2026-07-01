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
import HomeCommunityBanner from "@/components/home/HomeCommunityBanner";
import BravoLogo from "@/components/ui/BravoLogo";
import TeamAvatar from "@/components/ui/TeamAvatar";
import { BRAVO_DISCORD_URL } from "@/lib/brand-links";
import type { PubgHubDataset, PubgHubMatch, PubgHubPlayer, PubgHubTeam } from "@/lib/pubg-hub";
import { getRankedPlayers, getRankedTeams } from "@/lib/pubg-rankings";
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
  hrefLabel = "Browse",
}: {
  icon?: React.ReactNode;
  title: string;
  href?: string;
  hrefLabel?: string;
}) {
  return (
    <div className="mb-2.5 flex items-center justify-between gap-3">
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

function getSponsorKindLabel(kind: PlatformSponsorProfile["kind"]) {
  return kind === "design" ? "Design Partner" : kind === "sponsor" ? "Official Sponsor" : "Community Partner";
}

function getSponsorVisualUrl(sponsor: PlatformSponsorProfile) {
  return sponsor.bannerUrl ?? sponsor.designAssetUrl ?? sponsor.logoUrl ?? null;
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
      eyebrow: "Current Match Center",
      title: liveMatch.eventName,
      detail: `Match ${liveMatch.matchNumber}/${Math.max(liveMatch.matchNumber, liveMatchCount)}`,
      subdetail: liveMatch.mapName,
      href: watchLiveHref,
      actionLabel: "Open Match Center",
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

function getLeaderboardStyles(rank: number) {
  if (rank === 1) {
    return {
      row: "border-[#f5c76a]/20 bg-[linear-gradient(180deg,rgba(245,199,106,0.12),rgba(15,23,42,0.86))] hover:border-[#f5c76a]/40",
      badge: "border-[#f5c76a]/35 bg-[#f5c76a]/16 text-[#ffe4a3]",
      points: "border-[#f5c76a]/35 bg-[#f5c76a]/16 text-[#ffe4a3]",
    };
  }

  if (rank === 2) {
    return {
      row: "border-slate-300/20 bg-[linear-gradient(180deg,rgba(203,213,225,0.1),rgba(15,23,42,0.86))] hover:border-slate-300/35",
      badge: "border-slate-300/30 bg-slate-300/12 text-slate-100",
      points: "border-slate-300/30 bg-slate-300/12 text-slate-100",
    };
  }

  if (rank === 3) {
    return {
      row: "border-orange-300/18 bg-[linear-gradient(180deg,rgba(253,186,116,0.1),rgba(15,23,42,0.86))] hover:border-orange-300/30",
      badge: "border-orange-300/30 bg-orange-300/12 text-orange-100",
      points: "border-orange-300/30 bg-orange-300/12 text-orange-100",
    };
  }

  return {
    row: "border-white/[0.06] bg-black/20 hover:border-accent-blue/30 hover:bg-accent-blue/5",
    badge: "border-white/10 bg-white/[0.04] text-accent-blue-light",
    points: "border-accent-blue/25 bg-accent-blue/12 text-accent-blue-light",
  };
}

function HeroSection({
  hub,
  pubg,
  featuredEvent,
}: {
  hub: PlatformHubData;
  pubg: PubgHubDataset;
  featuredEvent: PlatformEvent | null;
}) {
  const liveMatch = pubg.matches.find((match) => match.eventStatus === "ongoing") ?? null;
  const liveEvent = liveMatch ? pubg.events.find((event) => event.id === liveMatch.eventId) ?? null : null;
  const liveCard = getHeroLiveCard(featuredEvent, liveMatch, liveEvent?.matchCount ?? 0, hub.home.liveFeature.href);

  return (
    <section className="hero-banner overflow-hidden !p-0">
      <div className="relative grid gap-4 px-5 py-5 sm:px-7 sm:py-6 xl:grid-cols-[1.05fr,0.95fr]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_26%,rgba(20,126,245,0.24),transparent_34%),radial-gradient(circle_at_80%_18%,rgba(47,152,255,0.12),transparent_20%)]" />
        <div className="absolute inset-y-0 right-[16%] hidden w-[34rem] opacity-[0.08] lg:block">
          <div className="flex h-full items-center justify-center">
            <BravoLogo size={220} />
          </div>
        </div>

        <div className="relative z-10 min-w-0">
          <p className="section-title">Bravo Gaming Esports</p>
          <h1 className="hero-h1 mt-4 max-w-[18ch]">Nepal&apos;s Home of Competitive PUBG PC Esports</h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-text-secondary sm:text-base sm:leading-8">
            Compete in daily PUBG PC scrims, participate in tournaments, track official standings, analyze player statistics,
            and become part of Nepal&apos;s growing competitive esports community.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <ActionLink href="/pubg/leaderboards">View Leaderboards</ActionLink>
            <ActionLink href="/teams/register" variant="secondary">
              Register Team
            </ActionLink>
          </div>
        </div>

        <div className="relative z-10 min-w-0">
          <div className="relative min-h-[22rem] overflow-hidden rounded-[28px] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(9,15,29,0.94),rgba(7,11,21,0.94))] px-5 py-6 shadow-[0_24px_80px_rgba(0,0,0,0.34)] sm:px-6">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_36%_18%,rgba(47,152,255,0.16),transparent_26%),radial-gradient(circle_at_70%_88%,rgba(20,126,245,0.12),transparent_26%)]" />
            <div className="relative">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-accent-red">{liveCard.eyebrow}</p>
                  <h2 className="mt-3 font-display text-2xl font-black uppercase text-white">PUBG Match Center</h2>
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
                  {liveMatch
                    ? `Match ${liveMatch.matchNumber}/${Math.max(liveMatch.matchNumber, liveEvent?.matchCount ?? liveMatch.matchNumber)}`
                    : "Schedule TBA"}
                </p>
                <p className="mt-1 text-sm text-text-muted">{liveMatch ? liveMatch.eventName : "Current schedule will appear here"}</p>
                <ActionLink href={liveCard.href} variant={liveMatch ? "primary" : "secondary"} className="mt-4 w-full justify-center">
                  {liveCard.actionLabel}
                </ActionLink>
              </div>
            </div>
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
    <section className="light-card p-4 sm:p-5">
      <PanelHeader title="Official Partners" href="/sponsors" hrefLabel="View All" />
      <div className={joinClasses("grid gap-4", sponsors.length === 1 ? "mx-auto max-w-3xl" : "lg:grid-cols-2 xl:grid-cols-4")}>
        {sponsors.slice(0, 4).map((sponsor) => (
          <div
            key={sponsor.id}
            className={joinClasses(
              "overflow-hidden rounded-[24px] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(10,16,32,0.96),rgba(7,11,21,0.98))]",
              sponsors.length === 1 && "shadow-[0_30px_80px_rgba(0,0,0,0.32)]"
            )}
          >
            <div className={joinClasses("grid gap-0", sponsors.length === 1 ? "lg:grid-cols-[0.92fr,1.08fr]" : "")}>
              <div className="relative flex min-h-[180px] items-center justify-center overflow-hidden border-b border-white/[0.08] bg-[radial-gradient(circle_at_top_left,rgba(47,152,255,0.2),transparent_34%),linear-gradient(180deg,rgba(11,21,33,0.98),rgba(7,11,21,0.98))] p-6 lg:border-b-0 lg:border-r">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_16%_18%,rgba(20,126,245,0.18),transparent_30%),radial-gradient(circle_at_82%_80%,rgba(239,68,68,0.08),transparent_24%)]" />
                {getSponsorVisualUrl(sponsor) ? (
                  <img
                    src={getSponsorVisualUrl(sponsor) ?? undefined}
                    alt={sponsor.name}
                    className="relative z-10 max-h-24 w-auto object-contain sm:max-h-28"
                  />
                ) : (
                  <span className="relative z-10 font-display text-3xl font-black uppercase tracking-[0.12em] text-white">
                    {sponsor.name}
                  </span>
                )}
              </div>

              <div className="flex h-full flex-col p-5 sm:p-6">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-accent-blue/30 bg-accent-blue/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-accent-blue-light">
                    {getSponsorKindLabel(sponsor.kind)}
                  </span>
                  <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-text-muted">
                    {sponsor.tier}
                  </span>
                </div>
                <h3 className="mt-4 font-display text-2xl font-black uppercase text-white">{sponsor.name}</h3>
                <p className="mt-3 text-sm leading-7 text-text-secondary">
                  {sponsor.description || "Official partner support for Bravo Gaming Esports coverage and competition operations."}
                </p>
                {sponsor.supportedEvents.length > 0 ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {sponsor.supportedEvents.slice(0, 2).map((eventName) => (
                      <span
                        key={eventName}
                        className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-text-muted"
                      >
                        {eventName}
                      </span>
                    ))}
                  </div>
                ) : null}
                <div className="mt-5">
                  <ActionLink href={getSponsorHref(sponsor)} variant={sponsor.websiteUrl ? "primary" : "secondary"}>
                    {sponsor.websiteUrl ? "View Partner" : "Open Profile"}
                  </ActionLink>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function LivePulse({ pubg }: { pubg: PubgHubDataset }) {
  const totalKills = pubg.matches.reduce((sum, match) => sum + match.totalKills, 0);
  const liveMatches = pubg.matches.filter((match) => match.eventStatus === "ongoing").length;
  const trackedPlayers = pubg.players.length;
  const trackedTeams = pubg.teams.length;
  const hasTrackedData = trackedPlayers > 0 || trackedTeams > 0 || totalKills > 0;

  if (!hasTrackedData && liveMatches === 0) {
    return (
      <section className="standard-card p-3.5">
        <PanelHeader icon={<Radio className="h-4 w-4" />} title="Competition Pulse" />
        <div className="rounded-[22px] border border-white/[0.08] bg-[radial-gradient(circle_at_top_left,rgba(20,126,245,0.18),transparent_34%),linear-gradient(180deg,rgba(11,21,33,0.96),rgba(7,11,21,0.96))] p-5">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-accent-blue-light">Current Status</p>
          <h3 className="mt-3 font-display text-xl font-black uppercase text-white">No active room right now</h3>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-text-muted">
            Join Discord for room updates, lobby timing, and official match announcements.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <ActionLink href={BRAVO_DISCORD_URL}>Join Discord</ActionLink>
            <ActionLink href="/events" variant="secondary">
              View Events
            </ActionLink>
          </div>
        </div>
      </section>
    );
  }

  const cards = [
    liveMatches > 0
      ? {
          label: "Official Rooms",
          value: liveMatches,
          detail: "Current Bravo room count",
          icon: <Radio className="h-4 w-4" />,
        }
      : {
          label: "Current Status",
          value: "No Active Room",
          detail: "Next room timing will be shared in Discord.",
          icon: <Radio className="h-4 w-4" />,
        },
    ...(trackedPlayers > 0
      ? [{ label: "Players Tracked", value: trackedPlayers, detail: "Verified player profiles", icon: <Users className="h-4 w-4" /> }]
      : []),
    ...(trackedTeams > 0
      ? [{ label: "Registered Teams", value: trackedTeams, detail: "Public team profiles", icon: <ShieldCheck className="h-4 w-4" /> }]
      : []),
    ...(totalKills > 0
      ? [{ label: "Published Kills", value: totalKills, detail: "Across verified results", icon: <Crosshair className="h-4 w-4" /> }]
      : []),
  ];

  return (
    <section className="standard-card p-3.5">
      <PanelHeader icon={<Radio className="h-4 w-4" />} title="Competition Pulse" />
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <div key={card.label} className="stat-pill flex min-h-[112px] items-start gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-[14px] border border-accent-blue/15 bg-accent-blue/10 text-accent-blue">
              {card.icon}
            </span>
            <div className="min-w-0">
              <p className="text-[14px] font-medium text-[#c7d2fe]">{card.label}</p>
              <p className="mt-3 font-mono-stat text-2xl text-white">{typeof card.value === "number" ? formatNumber(card.value) : card.value}</p>
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
  const matches = [...pubg.matches].slice(0, 4);

  return (
    <section className="priority-card h-full p-3.5">
      <PanelHeader icon={<ShieldCheck className="h-4 w-4" />} title="Today&apos;s Scrims" href="/pubg/results" />
      <div className="space-y-2">
        {matches.length === 0 ? (
          <div className="rounded-[22px] border border-white/[0.08] bg-[radial-gradient(circle_at_top_left,rgba(20,126,245,0.18),transparent_34%),linear-gradient(180deg,rgba(11,21,33,0.96),rgba(7,11,21,0.96))] p-5">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-accent-blue-light">Match Center</p>
            <h3 className="mt-3 font-display text-xl font-black uppercase text-white">No official scrim update is published right now</h3>
            <p className="mt-3 max-w-xl text-sm leading-7 text-text-muted">
              Join Discord for room updates, lobby calls, and match announcements, or browse the PUBG event schedule to see what&apos;s next.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <ActionLink href={BRAVO_DISCORD_URL} variant="secondary">
                Join Discord
              </ActionLink>
              <ActionLink href="/pubg/events">View Schedule</ActionLink>
            </div>
          </div>
        ) : (
          matches.map((match) => {
            const event = eventById.get(match.eventId);
            const action =
              match.eventStatus === "ongoing"
                ? { label: "Open Match Center", href: watchLiveHref, variant: "primary" as const }
                : event?.status === "upcoming"
                  ? { label: "Join", href: `/teams/register?tournament=${event.id}`, variant: "secondary" as const }
                  : { label: "View", href: getMatchHref(match), variant: "secondary" as const };

            return (
              <div key={match.id} className="rounded-[16px] border border-white/[0.06] bg-black/20 px-3 py-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-white">{match.eventName}</p>
                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-text-muted sm:text-sm">
                      <span>{match.mapName}</span>
                      <span>Match {match.matchNumber}</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={joinClasses(
                        "rounded-full border px-2 py-1 text-[10px] font-black uppercase tracking-[0.16em]",
                        match.eventStatus === "ongoing"
                          ? "border-accent-red/30 bg-accent-red/10 text-white"
                          : match.eventStatus === "upcoming"
                            ? "border-accent-blue/30 bg-accent-blue/10 text-accent-blue-light"
                            : "border-accent-green/30 bg-accent-green/10 text-accent-green"
                      )}
                    >
                      {match.eventStatus === "ongoing" ? "Current" : match.eventStatus === "upcoming" ? "Upcoming" : "Published"}
                    </span>
                    <ActionLink href={action.href} variant={action.variant} className="!h-9 !px-3">
                      {action.label}
                    </ActionLink>
                  </div>
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
  const leaderboard = getRankedTeams(teams).slice(0, 5);

  return (
    <section className="priority-card h-full overflow-hidden !p-0">
      <div className="px-4 py-4">
        <PanelHeader icon={<Trophy className="h-4 w-4" />} title="Current Standings" />
      </div>

      {leaderboard.length === 0 ? (
        <div className="px-4 pb-4">
          <div className="rounded-[22px] border border-white/[0.08] bg-[radial-gradient(circle_at_top_left,rgba(20,126,245,0.18),transparent_34%),linear-gradient(180deg,rgba(11,21,33,0.96),rgba(7,11,21,0.96))] p-5">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-accent-blue-light">Leaderboard</p>
            <h3 className="mt-3 font-display text-xl font-black uppercase text-white">Official standings are on the way</h3>
            <p className="mt-3 max-w-xl text-sm leading-7 text-text-muted">
              Official standings will appear after published match results are available for the current leaderboard window.
            </p>
            <div className="mt-5">
              <ActionLink href="/pubg" variant="secondary">
                View PUBG Hub
              </ActionLink>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="hidden px-4 pb-4 md:block">
            <div className="rounded-[22px] border border-white/[0.06] bg-black/10 p-3">
              <div className="grid grid-cols-[76px,minmax(0,1.5fr),92px,76px,76px,116px] gap-4 px-4 pb-4 pt-1 text-[10px] font-black uppercase tracking-[0.18em] text-text-muted">
                <span>Rank</span>
                <span>Team</span>
                <span className="text-right">Matches</span>
                <span className="text-right">WWCD</span>
                <span className="text-right">Kills</span>
                <span className="text-right">Points</span>
              </div>
              <div className="space-y-3">
                {leaderboard.map((team, index) => {
                  const rank = index + 1;
                  const styles = getLeaderboardStyles(rank);

                  return (
                    <Link
                      key={team.id}
                      href={`/pubg/teams/${team.slug ?? team.id}`}
                      className={joinClasses(
                        "grid grid-cols-[76px,minmax(0,1.5fr),92px,76px,76px,116px] items-center gap-4 rounded-[20px] border px-4 py-3.5 transition",
                        styles.row
                      )}
                    >
                      <span
                        className={joinClasses(
                          "inline-flex h-11 w-11 items-center justify-center rounded-[16px] border font-mono-stat text-sm",
                          styles.badge
                        )}
                      >
                        #{rank}
                      </span>
                      <div className="min-w-0 flex items-center gap-3">
                        <TeamAvatar name={team.name} imageUrl={team.logoUrl ?? undefined} size="md" />
                      <div className="min-w-0">
                        <p className="font-display text-base font-black uppercase leading-tight text-white" title={team.name}>
                          {team.name}
                        </p>
                        <p className="text-xs uppercase tracking-[0.16em] text-text-muted">
                          {team.tag ? `[${team.tag}]` : "PUBG Team"}
                        </p>
                      </div>
                      </div>
                      <span className="text-right font-mono-stat text-white">{formatNumber(team.matches)}</span>
                      <span className="text-right font-mono-stat text-white">{formatNumber(team.wins)}</span>
                      <span className="text-right font-mono-stat text-white">{formatNumber(team.kills)}</span>
                      <span
                        className={joinClasses(
                          "justify-self-end rounded-full border px-3 py-1.5 text-right font-mono-stat text-sm uppercase",
                          styles.points
                        )}
                      >
                        {formatNumber(team.totalPoints)} pts
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="grid gap-3 px-4 pb-4 md:hidden">
            {leaderboard.map((team, index) => {
              const rank = index + 1;
              const styles = getLeaderboardStyles(rank);

              return (
                <Link
                  key={team.id}
                  href={`/pubg/teams/${team.slug ?? team.id}`}
                  className={joinClasses("rounded-[20px] border p-4 transition", styles.row)}
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={joinClasses(
                        "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-[16px] border font-mono-stat text-sm",
                        styles.badge
                      )}
                    >
                      #{rank}
                    </span>
                    <TeamAvatar name={team.name} imageUrl={team.logoUrl ?? undefined} size="md" />
                    <div className="min-w-0 flex-1">
                      <p className="font-display text-base font-black uppercase leading-tight text-white" title={team.name}>
                        {team.name}
                      </p>
                      <p className="text-xs uppercase tracking-[0.16em] text-text-muted">
                        {team.tag ? `[${team.tag}]` : "PUBG Team"}
                      </p>
                    </div>
                    <span
                      className={joinClasses(
                        "shrink-0 rounded-full border px-3 py-1.5 font-mono-stat text-xs uppercase",
                        styles.points
                      )}
                    >
                      {formatNumber(team.totalPoints)} pts
                    </span>
                  </div>
                  <p className="mt-4 text-sm text-text-muted">
                    {formatNumber(team.matches)} Matches
                    <span className="mx-2 text-white/35">|</span>
                    {formatNumber(team.wins)} WWCD
                    <span className="mx-2 text-white/35">|</span>
                    {formatNumber(team.kills)} Kills
                  </p>
                </Link>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 px-4 pb-4">
            <p className="text-xs uppercase tracking-[0.16em] text-text-muted">
              Full placement details and point breakdown stay on the complete leaderboard.
            </p>
            <ActionLink href="/pubg/leaderboards" variant="secondary">
              Browse Full Leaderboard
            </ActionLink>
          </div>
        </>
      )}
    </section>
  );
}

function UpcomingEvents({ events }: { events: PlatformEvent[] }) {
  return (
    <section className="standard-card h-full p-3.5">
      <PanelHeader icon={<CalendarDays className="h-4 w-4" />} title="Upcoming Events" href="/events" hrefLabel="Schedule" />
      <div className="grid gap-3">
        {events.length === 0 ? (
          <div className="overflow-hidden rounded-[22px] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(9,15,29,0.96),rgba(7,11,21,0.96))]">
            <div className="border-b border-white/[0.08] px-4 py-4">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-accent-blue-light">Registration</p>
              <h3 className="mt-3 font-display text-xl font-black uppercase text-white">Tournament registration opens here next</h3>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-text-muted">
                Tournament registration and upcoming events will be posted here soon. Register your roster now or join Discord for lobby calls and announcement drops.
              </p>
            </div>
            <div className="flex flex-wrap gap-3 px-4 py-4">
              <ActionLink href="/teams/register">Register Team</ActionLink>
              <ActionLink href={BRAVO_DISCORD_URL} variant="secondary">
                Join Discord
              </ActionLink>
            </div>
          </div>
        ) : (
          events.slice(0, 3).map((event) => (
            <Link
              key={event.id}
              href={getEventHref(event)}
              className="overflow-hidden rounded-[20px] border border-white/[0.06] bg-black/15 transition hover:border-accent-blue/25 hover:bg-accent-blue/5"
            >
              <div className="grid gap-0 sm:grid-cols-[176px,minmax(0,1fr)]">
                {event.bannerUrl ? (
                  <img src={event.bannerUrl} alt={event.name} className="h-28 w-full object-cover sm:h-full" />
                ) : (
                  <div className="h-28 bg-[radial-gradient(circle_at_top_left,rgba(47,152,255,0.22),transparent_30%),linear-gradient(180deg,rgba(16,24,43,0.96),rgba(8,14,28,0.96))] sm:h-full" />
                )}
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-accent-blue">{event.type}</p>
                      <h3 className="mt-2 font-display text-lg font-black uppercase text-white">{event.name}</h3>
                    </div>
                    {event.prizePool && event.prizePool !== "TBD" ? (
                      <span className="rounded-full border border-accent-blue/30 bg-accent-blue/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-accent-blue-light">
                        {event.prizePool}
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-text-muted">
                    <span>{formatDateRange(event.startDate, event.endDate)}</span>
                    <span>{event.region}</span>
                  </div>
                  <div className="mt-4">
                    <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-[0.16em] text-accent-blue">
                      Browse Event
                      <ChevronRight className="h-3.5 w-3.5" />
                    </span>
                  </div>
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
  const styles = getLeaderboardStyles(rank);

  return (
    <Link
      href={`/pubg/teams/${team.slug ?? team.id}`}
      className={joinClasses("flex h-full flex-col rounded-[24px] border p-5 transition", styles.row)}
    >
      <div className="flex items-start gap-4">
        <span
          className={joinClasses(
            "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[16px] border font-mono-stat text-xs",
            styles.badge
          )}
        >
          #{rank}
        </span>
        <TeamAvatar name={team.name} imageUrl={team.logoUrl ?? undefined} size="lg" />
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 font-display text-xl font-black uppercase leading-tight text-white" title={team.name}>
            {team.name}
          </p>
          <p className="mt-2 text-xs uppercase tracking-[0.16em] text-text-muted">
            {team.tag ? `[${team.tag}]` : "PUBG Team"}
          </p>
        </div>
        {rank <= 3 ? <Trophy className="h-5 w-5 shrink-0 text-[#f5c76a]" /> : null}
      </div>

      <div className="mt-6">
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-text-muted">Total Points</p>
        <p className="mt-2 font-mono-stat text-3xl text-white">{formatNumber(team.totalPoints)}</p>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <span className={joinClasses("rounded-full border px-3 py-1.5 font-mono-stat text-xs uppercase", styles.points)}>
          {formatNumber(team.wins)} WWCD
        </span>
        <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 font-mono-stat text-xs uppercase text-white">
          {formatNumber(team.kills)} Kills
        </span>
      </div>

      <div className="mt-auto pt-5">
        <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-[0.18em] text-accent-blue">
          View Team
          <ChevronRight className="h-3.5 w-3.5" />
        </span>
      </div>
    </Link>
  );
}

function TopTeams({ teams }: { teams: PubgHubTeam[] }) {
  const topTeams = getRankedTeams(teams).slice(0, 4);

  if (teams.length === 0) {
    return null;
  }

  return (
    <section className="standard-card h-full p-3.5">
      <PanelHeader icon={<ShieldCheck className="h-4 w-4" />} title="Top Teams" href="/pubg/teams" />
      <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-4">
        {topTeams.map((team, index) => (
          <TeamSpotlightCard key={team.id} team={team} rank={index + 1} />
        ))}
      </div>
    </section>
  );
}

function PlayerSpotlightCard({ player, rank }: { player: PubgHubPlayer; rank: number }) {
  const styles = getLeaderboardStyles(rank);

  return (
    <Link href={`/pubg/players/${player.slug ?? player.id}`} className={joinClasses("flex h-full flex-col rounded-[24px] border p-4 transition", styles.row)}>
      <div className="flex items-start gap-3">
        <span
          className={joinClasses(
            "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[16px] border font-mono-stat text-xs",
            styles.badge
          )}
        >
          #{rank}
        </span>
        <TeamAvatar name={player.pubgName} imageUrl={player.avatarUrl ?? undefined} size="md" />
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 font-display text-lg font-black uppercase leading-tight text-white">{player.pubgName}</p>
          <p className="truncate text-xs uppercase tracking-[0.16em] text-text-muted">{player.currentTeamName ?? "Team TBD"}</p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3">
        <div className="stat-pill !p-3">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-text-muted">Kills</p>
          <p className="mt-2 font-mono-stat text-base text-accent-blue-light">{formatNumber(player.kills)}</p>
        </div>
        <div className="stat-pill !p-3">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-text-muted">Damage</p>
          <p className="mt-2 font-mono-stat text-base text-white">{formatNumber(player.damage)}</p>
        </div>
        <div className="stat-pill !p-3">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-text-muted">Avg K</p>
          <p className="mt-2 font-mono-stat text-base text-white">{player.avgKills.toFixed(2)}</p>
        </div>
      </div>

      <div className="mt-auto pt-4">
        <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-[0.18em] text-accent-blue">
          View Player
          <ChevronRight className="h-3.5 w-3.5" />
        </span>
      </div>
    </Link>
  );
}

function TopPlayers({ players }: { players: PubgHubPlayer[] }) {
  const topPlayers = getRankedPlayers(players).slice(0, 4);

  if (topPlayers.length === 0) {
    return null;
  }

  return (
    <section className="standard-card p-4">
      <PanelHeader icon={<Users className="h-4 w-4" />} title="Top Players" href="/pubg/players" />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {topPlayers.map((player, index) => (
          <PlayerSpotlightCard key={player.id} player={player} rank={index + 1} />
        ))}
      </div>
    </section>
  );
}

function NewsUpdateCard({ article }: { article: PlatformArticle }) {
  return (
    <Link
      href={`/news/${article.slug}`}
      className="block overflow-hidden rounded-[20px] border border-white/[0.06] bg-black/15 transition hover:border-accent-blue/25 hover:bg-accent-blue/5"
    >
      {article.imageUrl ? <img src={article.imageUrl} alt={article.title} className="h-44 w-full object-cover" /> : null}
      <div className="p-4">
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-accent-blue">{article.category}</p>
        <h3 className="mt-3 font-display text-lg font-black uppercase text-white">{article.title}</h3>
        <p className="mt-2 text-sm text-text-muted">{formatDate(article.date)}</p>
        <p className="mt-3 text-sm leading-6 text-text-muted">{article.summary}</p>
        <span className="mt-4 inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-[0.16em] text-accent-blue">
          Read Story
          <ChevronRight className="h-3.5 w-3.5" />
        </span>
      </div>
    </Link>
  );
}

function VideoUpdateCard({ item }: { item: PlatformMediaItem }) {
  return (
    <a
      href={getMediaHref(item)}
      target={isExternalHref(getMediaHref(item)) ? "_blank" : undefined}
      rel="noreferrer"
      className="block overflow-hidden rounded-[20px] border border-white/[0.06] bg-black/15 transition hover:border-accent-blue/25 hover:bg-accent-blue/5"
    >
      <div className="relative">
        {item.imageUrl ? (
          <img src={item.imageUrl} alt={item.title} className="h-44 w-full object-cover" />
        ) : (
          <div className="h-44 bg-[radial-gradient(circle_at_top_left,rgba(47,152,255,0.2),transparent_30%),linear-gradient(180deg,rgba(16,24,43,0.96),rgba(8,14,28,0.96))]" />
        )}
        <span className="absolute left-4 top-4 inline-flex h-12 w-12 items-center justify-center rounded-full border border-white/15 bg-black/45 text-white">
          <Play className="ml-0.5 h-4 w-4 fill-current" />
        </span>
      </div>
      <div className="p-4">
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-accent-blue">{item.category}</p>
        <h3 className="mt-3 font-display text-lg font-black uppercase text-white">{item.title}</h3>
        <p className="mt-2 text-sm text-text-muted">{item.duration ?? "Duration TBA"}</p>
        <p className="mt-3 text-sm leading-6 text-text-muted">{item.summary}</p>
        <span className="mt-4 inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-[0.16em] text-accent-blue">
          Watch Video
          <ChevronRight className="h-3.5 w-3.5" />
        </span>
      </div>
    </a>
  );
}

function LatestUpdates({
  article,
  item,
}: {
  article: PlatformArticle | null;
  item: PlatformMediaItem | null;
}) {
  const hasNews = Boolean(article);
  const hasVideo = Boolean(item);
  const hasAnyUpdates = hasNews || hasVideo;

  return (
    <section className="light-card p-4">
      <PanelHeader icon={<Newspaper className="h-4 w-4" />} title="Latest Updates" />

      {hasAnyUpdates ? (
        <>
          <div className={joinClasses("grid gap-4", hasNews && hasVideo && "xl:grid-cols-2")}>
            {article ? <NewsUpdateCard article={article} /> : null}
            {item ? <VideoUpdateCard item={item} /> : null}
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            {article ? (
              <ActionLink href="/news" variant={item ? "secondary" : "primary"}>
                Browse News
              </ActionLink>
            ) : null}
            {item ? (
              <ActionLink href="/media" variant={article ? "secondary" : "primary"}>
                Watch Highlights
              </ActionLink>
            ) : null}
          </div>
        </>
      ) : (
        <div className="rounded-[22px] border border-dashed border-white/10 bg-black/15 px-5 py-6 text-center">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-accent-blue-light">Official Updates</p>
          <h3 className="mt-3 font-display text-xl font-black uppercase text-white">Official updates are coming soon</h3>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-text-muted">
            Official news, highlights, and video coverage will appear here after publication.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <ActionLink href="/news" variant="secondary">
              Browse News
            </ActionLink>
            <ActionLink href="/media">Watch Media</ActionLink>
          </div>
        </div>
      )}
    </section>
  );
}

function CombinedUpdatesPanel() {
  return (
    <section className="light-card p-4">
      <PanelHeader icon={<CalendarDays className="h-4 w-4" />} title="Official Updates" />
      <div className="rounded-[22px] border border-white/[0.08] bg-[radial-gradient(circle_at_top_left,rgba(20,126,245,0.18),transparent_34%),linear-gradient(180deg,rgba(11,21,33,0.96),rgba(7,11,21,0.96))] p-5">
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-accent-blue-light">Tournament Launch</p>
        <h3 className="mt-3 font-display text-xl font-black uppercase text-white">Official updates are coming soon</h3>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-text-muted">
          Scrim schedules, tournament announcements, match results, news, and highlights will appear here after publication.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <ActionLink href={BRAVO_DISCORD_URL}>Join Discord</ActionLink>
          <ActionLink href="/teams/register" variant="secondary">
            Register Team
          </ActionLink>
          <ActionLink href="/pubg" variant="secondary">
            View PUBG Hub
          </ActionLink>
        </div>
      </div>
    </section>
  );
}

function CommunityStrip() {
  return (
    <section className="light-card overflow-hidden !p-0">
      <div className="relative overflow-hidden rounded-[30px] px-5 py-5 sm:px-6 sm:py-6">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_18%,rgba(20,126,245,0.24),transparent_30%),radial-gradient(circle_at_88%_20%,rgba(239,68,68,0.14),transparent_24%),linear-gradient(180deg,rgba(9,15,29,0.98),rgba(7,11,21,0.98))]" />
        <div className="relative flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div className="max-w-2xl">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-accent-blue-light">Community</p>
            <h2 className="mt-3 font-display text-2xl font-black uppercase text-white">Join the Bravo Community</h2>
            <p className="mt-3 text-sm leading-7 text-text-muted">
              Register your team, get room updates, follow official results, and stay ready for PUBG PC scrims and tournaments.
            </p>
            <div className="mt-4 flex flex-wrap gap-4 text-xs font-black uppercase tracking-[0.16em] text-text-muted">
              <Link href="/rules" className="transition hover:text-white">
                Rules
              </Link>
              <Link href="/anti-cheat" className="transition hover:text-white">
                Anti-Cheat Policy
              </Link>
              <Link href="/about/sponsor-us" className="transition hover:text-white">
                Sponsor Inquiry
              </Link>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <ActionLink href="/teams/register">Register Team</ActionLink>
            <ActionLink href={BRAVO_DISCORD_URL} variant="secondary">
              Join Discord
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
  const featuredEvent = hub.home.featuredEvents[0] ?? hub.home.upcomingEvents[0] ?? hub.events[0] ?? null;
  const featuredArticle = hub.home.featuredNews[0] ?? null;
  const featuredMedia = hub.home.featuredMedia[0] ?? null;
  const preferredSponsorOrder = ["sap", "kento", "hukut", "gorkhali roleplay"];
  const orderedPreferredSponsors = preferredSponsorOrder
    .map((name) => hub.sponsors.find((sponsor) => sponsor.name.toLowerCase().includes(name)) ?? null)
    .filter((sponsor): sponsor is PlatformSponsorProfile => Boolean(sponsor));
  const homepageSponsors =
    orderedPreferredSponsors.length > 0
      ? orderedPreferredSponsors
      : (
          hub.home.featuredSponsors.length > 0
            ? hub.home.featuredSponsors
            : hub.sponsors.filter((sponsor) => sponsor.showOnHomepage)
        ).slice(0, 4);
  const showCombinedUpdatesPanel =
    pubg.matches.length === 0 &&
    hub.home.upcomingEvents.length === 0 &&
    !featuredArticle &&
    !featuredMedia;

  return (
    <main className="page-shell pb-20 sm:pb-24">
      <div className="page-stack">
        <HeroSection hub={hub} pubg={pubg} featuredEvent={featuredEvent} />
        <LivePulse pubg={pubg} />

        {showCombinedUpdatesPanel ? (
          <section className="grid items-stretch gap-4 xl:grid-cols-[0.95fr,1.05fr]">
            <CombinedUpdatesPanel />
            <CurrentStandings teams={pubg.teams} />
          </section>
        ) : (
          <>
            <section className="grid items-stretch gap-4 xl:grid-cols-[0.88fr,1.12fr]">
              <TodayScrims pubg={pubg} watchLiveHref={hub.home.liveFeature.href} />
              <CurrentStandings teams={pubg.teams} />
            </section>

            <UpcomingEvents events={hub.home.upcomingEvents} />

            <TopTeams teams={pubg.teams} />

            <TopPlayers players={pubg.players} />

            <LatestUpdates article={featuredArticle} item={featuredMedia} />
          </>
        )}

        <SponsorStrip sponsors={homepageSponsors} />

        <CommunityStrip />
      </div>
      <HomeCommunityBanner />
    </main>
  );
}
