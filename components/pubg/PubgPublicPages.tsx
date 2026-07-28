import {
  buildHref,
  EmptyState,
  EventSummaryCard,
  formatDateRange,
  formatDateTime,
  formatDecimal,
  formatNumber,
  FormPill,
  MapStatsTable,
  MetricCard,
  PageHero,
  PlayerIdentity,
  RankBadge,
  readSearchParam,
  SectionHeader,
  sourceLabel,
  StatePill,
  StatusPill,
  SyncPill,
  TeamIdentity,
  TrendBars,
} from "@/components/pubg/PubgHubUI";
import ManagedImage from "@/components/ui/ManagedImage";
import { resolveSponsorDestination, sponsorOpensInNewTab } from "@/lib/sponsor-links";
import TeamAvatar from "@/components/ui/TeamAvatar";
import { BRAVO_DISCORD_URL } from "@/lib/brand-links";
import type { PlatformHubData, PlatformSponsorProfile } from "@/lib/platform-hub";
import {
  getPublicPubgPlayers,
  getPublicPubgTeams,
  isPublicPubgMatchStatus,
  type PubgHubDataset,
  type PubgHubEvent,
  type PubgHubMatch,
  type PubgHubPlayer,
  type PubgHubTeam,
} from "@/lib/pubg-hub";
import { getPlayerRankMap, getTeamRankMap } from "@/lib/pubg-rankings";
import Link from "next/link";

type SearchParamDictionary = Record<string, string | string[] | undefined>;

type PubgDashboardSeasonSummary = {
  title: string;
  slug: string;
  currentDay: number;
  matchesPlayed: number;
  teamsTracked: number;
  playersTracked: number;
  currentTournamentTitle?: string | null;
};

function isPublishedMatch(match: PubgHubMatch) {
  return isPublicPubgMatchStatus(match.status);
}

function buildTeamLookup(dataset: PubgHubDataset) {
  return new Map(dataset.teams.map((team) => [team.id, team] as const));
}

function buildPlayerLookup(dataset: PubgHubDataset) {
  return new Map(dataset.players.map((player) => [player.id, player] as const));
}

function countBy<T>(items: T[], key: (item: T) => string) {
  return items.reduce<Record<string, number>>((result, item) => {
    const currentKey = key(item);
    result[currentKey] = (result[currentKey] ?? 0) + 1;
    return result;
  }, {});
}

function dedupeMaps(matches: PubgHubMatch[]) {
  return Array.from(new Set(matches.map((match) => match.mapName))).sort((firstValue, secondValue) =>
    firstValue.localeCompare(secondValue),
  );
}

function filterMatches(dataset: PubgHubDataset, options: { eventSlug?: string; mapName?: string; status?: string }) {
  return dataset.matches.filter((match) => {
    if (options.eventSlug && match.eventSlug !== options.eventSlug) return false;
    if (options.mapName && options.mapName !== "all" && match.mapName !== options.mapName) return false;
    if (options.status === "published" && !isPublishedMatch(match)) return false;
    if (options.status === "awaiting_approval" && isPublishedMatch(match)) return false;
    if (
      options.status &&
      !["all", "published", "awaiting_approval"].includes(options.status) &&
      match.status.trim().toLowerCase() !== options.status
    ) {
      return false;
    }
    return true;
  });
}

function getLeaderboardSurface(rank: number) {
  if (rank === 1) {
    return "border-[#f5c76a]/20 bg-[linear-gradient(180deg,rgba(245,199,106,0.12),rgba(11,21,33,0.94))]";
  }

  if (rank === 2) {
    return "border-slate-300/20 bg-[linear-gradient(180deg,rgba(203,213,225,0.1),rgba(11,21,33,0.94))]";
  }

  if (rank === 3) {
    return "border-orange-300/18 bg-[linear-gradient(180deg,rgba(253,186,116,0.1),rgba(11,21,33,0.94))]";
  }

  return "border-white/[0.08] bg-[#08101a]";
}

function FilterField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-text-muted">
      <span>{label}</span>
      {children}
    </label>
  );
}

function ActiveFilterSummary({ items }: { items: Array<{ label: string; value?: string | null }> }) {
  const activeItems = items.filter((item) => item.value && item.value !== "all");

  if (activeItems.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {activeItems.map((item) => (
        <span
          key={`${item.label}-${item.value}`}
          className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-text-muted"
        >
          {item.label}: <span className="ml-1 text-white">{item.value}</span>
        </span>
      ))}
    </div>
  );
}

function buildTopFragger(match: PubgHubMatch, playerLookup: Map<string, PubgHubPlayer>) {
  const playerResult = [...match.playerResults].sort(
    (firstValue, secondValue) =>
      secondValue.kills - firstValue.kills || secondValue.damage - firstValue.damage || secondValue.assists - firstValue.assists,
  )[0];

  if (!playerResult) {
    return null;
  }

  const player = playerLookup.get(playerResult.playerId) ?? null;

  return {
    id: playerResult.playerId,
    pubgName: player?.pubgName ?? playerResult.pubgName,
    currentTeamName: player?.currentTeamName ?? playerResult.teamName ?? null,
    player,
  };
}

function FilterBar({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="rounded-card border border-white/[0.08] bg-bg-card p-4">
      <form method="get" className="grid gap-3 xl:grid-cols-[repeat(4,minmax(0,1fr))_auto]">
        {children}
        <div className="flex items-end gap-2">
          <button type="submit" className="btn-primary h-11">
            Apply Filters
          </button>
          {action}
        </div>
      </form>
    </div>
  );
}

function DashboardSection({
  id,
  eyebrow,
  title,
  description,
  action,
  children,
  bodyClassName = "p-5",
}: {
  id?: string;
  eyebrow: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  bodyClassName?: string;
}) {
  return (
    <section
      id={id}
      className="scroll-mt-28 overflow-hidden rounded-[28px] border border-white/[0.08] bg-[#08101a] shadow-[0_24px_80px_rgba(0,0,0,0.35)]"
    >
      <div className="border-b border-white/[0.08] px-5 py-4">
        <SectionHeader eyebrow={eyebrow} title={title} description={description} action={action} />
      </div>
      <div className={bodyClassName}>{children}</div>
    </section>
  );
}

function HeaderStatCell({ label, value, detail }: { label: string; value: string | number; detail?: string }) {
  return (
    <div className="rounded-[24px] border border-white/[0.08] bg-black/25 px-4 py-3">
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-text-muted">{label}</p>
      <p className="mt-2 truncate font-display text-lg font-black uppercase text-white">
        {typeof value === "number" ? formatNumber(value) : value}
      </p>
      {detail ? <p className="mt-1 text-xs text-text-muted">{detail}</p> : null}
    </div>
  );
}

function PlacementFormStrip({ placements }: { placements: number[] }) {
  if (placements.length === 0) {
    return <span className="text-xs text-text-muted">No form yet</span>;
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {placements.slice(0, 5).map((placement, index) => {
        const toneClass =
          placement === 1
            ? "border-accent-green/30 bg-accent-green/10 text-accent-green"
            : placement <= 4
              ? "border-accent-blue/30 bg-accent-blue/10 text-accent-blue"
              : placement <= 8
                ? "border-accent-yellow/30 bg-accent-yellow/10 text-accent-yellow"
                : "border-white/10 bg-white/5 text-text-muted";

        return (
          <span
            key={`${placement}-${index}`}
            className={`inline-flex min-w-9 items-center justify-center rounded-full border px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em] ${toneClass}`}
          >
            #{placement}
          </span>
        );
      })}
    </div>
  );
}

function getMatchStatusMeta(match: PubgHubMatch) {
  const normalizedStatus = match.status.trim().toLowerCase();

  if (normalizedStatus === "completed" || match.eventStatus === "finished") {
    return {
      label: "Completed",
      className: "border-accent-blue/30 bg-accent-blue/10 text-accent-blue-light",
    };
  }

  if (isPublishedMatch(match)) {
    return {
      label: "Published",
      className: "border-accent-green/30 bg-accent-green/10 text-accent-green",
    };
  }

  if (match.eventStatus === "ongoing") {
    return {
      label: "Live",
      className: "border-accent-red/30 bg-accent-red/10 text-white",
    };
  }

  return {
    label: "Pending Review",
    className: "border-accent-yellow/30 bg-accent-yellow/10 text-accent-yellow",
  };
}

function getEventScheduleLabel(event: PubgHubEvent) {
  return event.matchCount > 0 ? `${formatNumber(event.matchCount)} matches` : "Schedule Pending";
}

function getEventWinnerLabel(event: PubgHubEvent, winnerName?: string | null) {
  if (event.status === "finished") {
    return winnerName ?? "Results Pending";
  }

  return event.status === "ongoing" ? "Results in progress" : "Winner confirmed after completion";
}

function HubMatchCard({ match, playerLookup }: { match: PubgHubMatch; playerLookup: Map<string, PubgHubPlayer> }) {
  const topFragger = buildTopFragger(match, playerLookup);
  const matchStatus = getMatchStatusMeta(match);
  const matchHref = match.eventSlug ? buildHref(`/pubg/events/${match.eventSlug}`, { tab: "matches" }) : "/pubg/results";

  return (
    <div className="rounded-[24px] border border-white/[0.08] bg-[#0b1521] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-accent-blue">
            Match {match.matchNumber} | {match.mapName}
          </p>
          <h3 className="mt-2 font-display text-lg font-black uppercase text-white">{match.eventName}</h3>
          <p className="mt-2 text-sm text-text-muted">{formatDateTime(match.startTime)}</p>
        </div>
        <span
          className={`inline-flex items-center rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] ${matchStatus.className}`}
        >
          {matchStatus.label}
        </span>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-[20px] border border-white/[0.08] bg-black/20 p-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-text-muted">Winner / WWCD</p>
          <p className="mt-2 font-semibold text-white">{match.winnerTeamName ?? "Winner TBD"}</p>
        </div>
        <div className="rounded-[20px] border border-white/[0.08] bg-black/20 p-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-text-muted">Top Fragger</p>
          <p className="mt-2 font-semibold text-white">{topFragger?.pubgName ?? "Pending player stats"}</p>
          <p className="mt-1 text-xs text-text-muted">{topFragger?.currentTeamName ?? "Team TBD"}</p>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <HeaderStatCell label="Total Kills" value={match.totalKills} />
        <HeaderStatCell label="Teams" value={match.teamResults.length} />
        <HeaderStatCell label="Status" value={matchStatus.label} />
        <div className="flex items-end justify-end">
          <Link href={matchHref} className="btn-primary h-11 w-full justify-center">
            View Results
          </Link>
        </div>
      </div>
    </div>
  );
}

function HubEventCard({ event, winnerName }: { event: PubgHubEvent; winnerName?: string | null }) {
  return (
    <div className="rounded-[24px] border border-white/[0.08] bg-[#0b1521] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-accent-blue">{event.type || "PUBG Event"}</p>
          <h3 className="mt-2 font-display text-lg font-black uppercase text-white">{event.name}</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          <StatusPill status={event.status} />
          <SyncPill syncStatus={event.syncStatus} />
        </div>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <HeaderStatCell label="Date" value={formatDateRange(event.startDate, event.endDate)} />
        <HeaderStatCell label="Prize Pool" value={event.prizePool || "TBD"} />
        <HeaderStatCell label="Teams" value={event.teamCount} />
        <HeaderStatCell label="Schedule" value={getEventScheduleLabel(event)} />
      </div>
      <div className="mt-4 rounded-[20px] border border-white/[0.08] bg-black/20 p-3">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-text-muted">Winner</p>
        <p className="mt-2 font-semibold text-white">{getEventWinnerLabel(event, winnerName)}</p>
      </div>
      <div className="mt-4 flex justify-end">
        <Link href={`/pubg/events/${event.slug}`} className="btn-secondary">
          View Event
        </Link>
      </div>
    </div>
  );
}

function HubTeamCard({ team, rank }: { team: PubgHubTeam; rank: number }) {
  return (
    <div className={`h-full rounded-[24px] border p-4 ${getLeaderboardSurface(rank)}`}>
      <div className="flex items-start gap-3">
        <TeamAvatar name={team.name} imageUrl={team.logoUrl ?? undefined} size="md" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <RankBadge rank={rank} />
            <p className="line-clamp-2 font-display text-lg font-black uppercase text-white">{team.name}</p>
          </div>
          <p className="mt-2 text-xs uppercase tracking-[0.16em] text-text-muted">
            {team.tag ? `[${team.tag}]` : "PUBG Team"} | {team.region ?? "Region TBA"}
          </p>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <HeaderStatCell label="Points" value={team.totalPoints} />
        <HeaderStatCell label="Kills" value={team.kills} />
        <HeaderStatCell label="WWCD" value={team.wins} />
        <HeaderStatCell label="Avg Place" value={formatDecimal(team.avgPlacement, 2)} />
      </div>
      <div className="mt-4">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-text-muted">Recent placement run</p>
        <div className="mt-2">
          <PlacementFormStrip placements={team.recentPlacements} />
        </div>
      </div>
      <div className="mt-4 flex justify-end">
        <Link href={`/pubg/teams/${team.slug || team.id}`} className="btn-secondary">
          Team Profile
        </Link>
      </div>
    </div>
  );
}

function HubPlayerCard({ player, rank }: { player: PubgHubPlayer; rank: number }) {
  return (
    <div className={`h-full rounded-[24px] border p-4 ${getLeaderboardSurface(rank)}`}>
      <div className="flex items-start gap-3">
        <TeamAvatar name={player.pubgName} imageUrl={player.avatarUrl ?? undefined} size="sm" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <RankBadge rank={rank} />
            <p className="line-clamp-2 font-display text-base font-black uppercase text-white">{player.pubgName}</p>
          </div>
          <p className="mt-2 text-xs uppercase tracking-[0.16em] text-text-muted">{player.currentTeamName ?? "Team TBD"}</p>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <HeaderStatCell label="Kills" value={player.kills} />
        <HeaderStatCell label="Assists" value={player.assists} />
        <HeaderStatCell label="Damage" value={player.damage} />
        <HeaderStatCell label="Avg K" value={formatDecimal(player.avgKills, 2)} />
      </div>
      <div className="mt-4 flex justify-end">
        <Link href={`/pubg/players/${player.slug || player.id}`} className="btn-secondary">
          View Profile
        </Link>
      </div>
    </div>
  );
}

function PubgPartnerStrip({ partners }: { partners: PlatformSponsorProfile[] }) {
  if (partners.length === 0) {
    return null;
  }

  return (
    <section className="overflow-hidden rounded-[28px] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(9,15,29,0.96),rgba(7,11,21,0.98))] px-5 py-5 shadow-[0_18px_60px_rgba(0,0,0,0.28)]">
      <div className="flex justify-center">
        <span className="inline-flex rounded-full border border-white/[0.08] bg-black/20 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-text-muted">
          Official Partners
        </span>
      </div>
      <div className={`mt-5 grid gap-3 ${partners.length === 1 ? "mx-auto max-w-sm grid-cols-1" : "sm:grid-cols-2 xl:grid-cols-4"}`}>
        {partners.map((partner) => {
          const visualAsset = partner.logoUrl ?? partner.bannerUrl ?? partner.designAssetUrl ?? null;
          const destination = resolveSponsorDestination(partner);
          const openInNewTab = sponsorOpensInNewTab(partner);
          const content = visualAsset ? (
            <ManagedImage
              src={visualAsset}
              alt={partner.name}
              sizes="200px"
              wrapperClassName="flex h-12 w-full items-center justify-center"
              className="max-h-12 w-auto object-contain"
            />
          ) : (
            <div>
              <p className="font-display text-xl font-black uppercase text-white">{partner.name}</p>
              <p className="mt-2 text-[10px] font-black uppercase tracking-[0.18em] text-accent-blue">{partner.tier}</p>
            </div>
          );

          return destination ? (
            <a
              key={partner.id}
              href={destination}
              target={openInNewTab ? "_blank" : undefined}
              rel={openInNewTab ? "noopener noreferrer" : undefined}
              aria-label={`Visit ${partner.name} website${openInNewTab ? " (opens in a new tab)" : ""}`}
              className="flex min-h-[92px] items-center justify-center rounded-[22px] border border-white/[0.08] bg-black/20 px-5 py-4 text-center transition hover:border-accent-blue/30 hover:bg-accent-blue/5"
            >
              {content}
            </a>
          ) : (
            <div
              key={partner.id}
              className="flex min-h-[92px] items-center justify-center rounded-[22px] border border-white/[0.08] bg-black/20 px-5 py-4 text-center"
            >
              {content}
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function PubgDashboardPage({
  dataset,
  activeSeason,
  recentMatches,
  recentEvents,
  activeEvents,
  partners,
}: {
  dataset: Awaited<ReturnType<typeof import("@/lib/pubg-hub").getPubgDashboardData>>;
  activeSeason: PubgDashboardSeasonSummary | null;
  recentMatches: PubgHubMatch[];
  recentEvents: PubgHubEvent[];
  activeEvents: PubgHubEvent[];
  partners: PlatformSponsorProfile[];
}) {
  const playerLookup = buildPlayerLookup(dataset);
  const hasSupabaseDataset = dataset.source === "supabase";
  const publishedMatches = hasSupabaseDataset ? recentMatches.filter(isPublishedMatch).slice(0, 4) : [];
  const rankedTeams = getPublicPubgTeams(dataset);
  const rankedPlayers = getPublicPubgPlayers(dataset, rankedTeams);
  const leaderboardTeams = hasSupabaseDataset ? rankedTeams.filter((team) => team.statsTracked).slice(0, 5) : [];
  const leaderboardPlayers = hasSupabaseDataset ? rankedPlayers.filter((player) => player.statsTracked).slice(0, 5) : [];
  const featuredEvent = hasSupabaseDataset
    ? (activeEvents.find((event) => event.status === "ongoing") ??
      activeEvents[0] ??
      recentEvents.find((event) => event.status !== "finished") ??
      recentEvents[0] ??
      null)
    : null;
  const upcomingEvents = hasSupabaseDataset
    ? Array.from(
        new Map(
          [...activeEvents, ...recentEvents]
            .filter((event) => event.id !== featuredEvent?.id && event.status !== "finished")
            .map((event) => [event.id, event] as const),
        ).values(),
      ).slice(0, 4)
    : [];
  const publishedMatchCount = dataset.matches.filter(isPublishedMatch).length;
  const rankedTeamCount = rankedTeams.filter((team) => team.statsTracked).length;
  const rankedPlayerCount = rankedPlayers.filter((player) => player.statsTracked).length;
  const upcomingEventCount = dataset.events.filter((event) => event.status !== "finished").length;
  const hasPublishedCompetitionData =
    publishedMatches.length > 0 ||
    leaderboardTeams.length > 0 ||
    leaderboardPlayers.length > 0 ||
    Boolean(activeSeason && activeSeason.matchesPlayed > 0);
  const showAnalyticsDashboard = hasSupabaseDataset && hasPublishedCompetitionData;
  const seasonHeadline = activeSeason?.currentTournamentTitle ?? featuredEvent?.name ?? "Bravo PUBG PC";
  const latestPublishedDetail = publishedMatches[0]
    ? `${publishedMatches[0].eventName} | ${formatDateTime(publishedMatches[0].startTime)}`
    : "Published results, standings, and team form update here after verification.";

  if (!showAnalyticsDashboard) {
    return (
      <main className="page-shell overflow-x-hidden pb-12 pt-6">
        <div className="page-stack overflow-x-hidden">
          <PageHero
            badge="PUBG Competition Hub"
            title={
              <>
                Bravo PUBG PC
                <br />
                competition
              </>
            }
            description="Browse published events, rules, registration links, results, teams, and player statistics."
            actions={
              <>
                <Link href="/teams/register" className="btn-primary">
                  Register Team
                </Link>
                <Link href="/events" className="btn-secondary">
                  View Events
                </Link>
                <a href={BRAVO_DISCORD_URL} target="_blank" rel="noreferrer" className="btn-discord">
                  Join Discord
                </a>
              </>
            }
          />

          <section className="mx-auto max-w-5xl">
            <EmptyState
              title="No published PUBG match data yet"
              description="Official results, leaderboards, player spotlights, and event coverage will appear here after the first verified results set is published."
              action={
                <div className="flex flex-wrap justify-center gap-2">
                  <Link href="/teams/register" className="btn-primary">
                    Register Team
                  </Link>
                  <Link href="/events" className="btn-secondary">
                    View Events
                  </Link>
                  <Link href="/rules" className="btn-secondary">
                    Rules
                  </Link>
                  <Link href="/anti-cheat" className="btn-secondary">
                    Anti-Cheat
                  </Link>
                  <a href={BRAVO_DISCORD_URL} target="_blank" rel="noreferrer" className="btn-discord">
                    Join Discord
                  </a>
                </div>
              }
            />
          </section>

          <PubgPartnerStrip partners={partners.slice(0, 4)} />
        </div>
      </main>
    );
  }

  return (
    <main className="page-shell overflow-x-hidden pb-12 pt-6">
      <div className="page-stack overflow-x-hidden">
        <PageHero
          badge="PUBG Competition Hub"
          title={
            <>
              Official PUBG competition hub
              <br />
              for Bravo Gaming Esports
            </>
          }
          description={`Track featured tournaments, published results, leaderboard leaders, and registration windows around ${seasonHeadline}.`}
          actions={
            <>
              <Link href="/teams/register" className="btn-primary">
                Register Team
              </Link>
              <Link href="/events" className="btn-secondary">
                View Events
              </Link>
              <Link href="/pubg/leaderboards" className="btn-secondary">
                Official Leaderboards
              </Link>
            </>
          }
          stats={[
            {
              label: "Published Matches",
              value: publishedMatchCount,
              tone: "blue",
            },
            { label: "Ranked Teams", value: rankedTeamCount, tone: "green" },
            {
              label: "Ranked Players",
              value: rankedPlayerCount,
              tone: "yellow",
            },
            {
              label: "Upcoming Events",
              value: upcomingEventCount,
              tone: "red",
            },
          ]}
          aside={
            <div className="space-y-4">
              <div>
                <p className="section-title">Current Focus</p>
                <h2 className="mt-2 font-display text-2xl font-black uppercase text-white">{seasonHeadline}</h2>
              </div>
              <div className="rounded-card border border-white/[0.08] bg-black/20 p-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-text-muted">Coverage Mode</p>
                <p className="mt-2 text-sm text-white">{sourceLabel(dataset.source)}</p>
              </div>
              <div className="rounded-card border border-white/[0.08] bg-black/20 p-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-text-muted">Last Published Update</p>
                <p className="mt-2 text-sm text-white">{latestPublishedDetail}</p>
              </div>
            </div>
          }
        />

        <DashboardSection
          eyebrow="Featured Event"
          title={featuredEvent?.name ?? "Next featured PUBG event"}
          description="The current tournament focus stays front and center with clear schedule, status, and registration context."
        >
          {featuredEvent ? (
            <div className="grid gap-4 xl:grid-cols-[1.1fr,0.9fr]">
              <div className="rounded-[24px] border border-white/[0.08] bg-[#0b1521] p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-accent-blue">Featured Event</p>
                    <h3 className="mt-2 font-display text-2xl font-black uppercase text-white">{featuredEvent.name}</h3>
                    <p className="mt-3 text-sm leading-7 text-text-muted">
                      {featuredEvent.description ??
                        "Official PUBG tournament coverage with standings, schedule, teams, and public results."}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <StatusPill status={featuredEvent.status} />
                    <StatePill state={featuredEvent.state} />
                  </div>
                </div>
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <HeaderStatCell label="Date" value={formatDateRange(featuredEvent.startDate, featuredEvent.endDate)} />
                  <HeaderStatCell label="Prize Pool" value={featuredEvent.prizePool || "TBD"} />
                  <HeaderStatCell label="Teams" value={featuredEvent.teamCount} />
                  <HeaderStatCell label="Schedule" value={getEventScheduleLabel(featuredEvent)} />
                </div>
              </div>
              <div className="rounded-[24px] border border-white/[0.08] bg-[#0b1521] p-5">
                <div className="space-y-4">
                  <div className="rounded-[20px] border border-white/[0.08] bg-black/20 p-4">
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-text-muted">Winner Status</p>
                    <p className="mt-2 font-semibold text-white">
                      {getEventWinnerLabel(featuredEvent, featuredEvent.standings[0]?.teamName ?? null)}
                    </p>
                  </div>
                  <div className="rounded-[20px] border border-white/[0.08] bg-black/20 p-4">
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-text-muted">Registration</p>
                    <p className="mt-2 text-sm text-white">
                      {featuredEvent.status === "finished"
                        ? "Registration has closed for this published event."
                        : "Team registration and public event updates stay connected through Bravo channels."}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <Link href={`/pubg/events/${featuredEvent.slug}`} className="btn-primary">
                      View Event
                    </Link>
                    <Link href="/events" className="btn-secondary">
                      Browse Events
                    </Link>
                    {featuredEvent.status === "ongoing" && featuredEvent.streamUrl ? (
                      <a href={featuredEvent.streamUrl} target="_blank" rel="noopener noreferrer" className="btn-secondary">
                        Watch Live
                      </a>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <EmptyState
              title="No featured event is scheduled yet"
              description="Upcoming PUBG tournaments and registration windows will appear here once they are announced."
            />
          )}
        </DashboardSection>

        <DashboardSection
          eyebrow="Latest Results"
          title="Published match results"
          description="Recent verified matches from official Bravo PUBG tournaments and scrims."
          action={
            <Link href="/pubg/results" className="btn-secondary">
              View All Results
            </Link>
          }
        >
          {publishedMatches.length > 0 ? (
            <div className="grid gap-4 xl:grid-cols-2">
              {publishedMatches.map((match) => (
                <HubMatchCard key={match.id} match={match} playerLookup={playerLookup} />
              ))}
            </div>
          ) : (
            <EmptyState
              title="No match results have been published yet"
              description="Results will appear once they are officially verified."
            />
          )}
        </DashboardSection>

        <DashboardSection
          eyebrow="Team Leaderboard Preview"
          title="Top teams from published results"
          description="The same official team order used on the full leaderboard appears here on the hub preview."
          action={
            <Link href="/pubg/leaderboards?view=teams" className="btn-secondary">
              View Full Team Board
            </Link>
          }
        >
          {leaderboardTeams.length > 0 ? (
            <div className="grid gap-4 xl:grid-cols-2">
              {leaderboardTeams.slice(0, 4).map((team, index) => (
                <HubTeamCard key={team.id} team={team} rank={index + 1} />
              ))}
            </div>
          ) : (
            <EmptyState
              title="Team standings are not available yet"
              description="Official team standings will appear here after published results go live."
            />
          )}
        </DashboardSection>

        <DashboardSection
          eyebrow="Player Leaderboard Preview"
          title="Top fraggers and damage leaders"
          description="The same official player order used on the full leaderboard stays aligned on this preview."
          action={
            <Link href="/pubg/leaderboards?view=players" className="btn-secondary">
              View Full Player Board
            </Link>
          }
        >
          {leaderboardPlayers.length > 0 ? (
            <div className="grid gap-4 xl:grid-cols-2">
              {leaderboardPlayers.slice(0, 4).map((player, index) => (
                <HubPlayerCard key={player.id} player={player} rank={index + 1} />
              ))}
            </div>
          ) : (
            <EmptyState
              title="Player standings are not available yet"
              description="Official player rankings will appear here after published results go live."
            />
          )}
        </DashboardSection>

        <DashboardSection
          eyebrow="Upcoming Events"
          title="Next tournaments and scrims"
          description="Follow upcoming registration windows, schedules, and official event updates."
          action={
            <Link href="/events" className="btn-secondary">
              Browse All Events
            </Link>
          }
        >
          {upcomingEvents.length > 0 ? (
            <div className="grid gap-4 xl:grid-cols-2">
              {upcomingEvents.map((event) => (
                <HubEventCard key={event.id} event={event} winnerName={event.standings[0]?.teamName ?? null} />
              ))}
            </div>
          ) : (
            <EmptyState
              title="No upcoming PUBG events are posted yet"
              description="The next tournament window will appear here once the schedule is confirmed."
            />
          )}
        </DashboardSection>

        <PubgPartnerStrip partners={partners.slice(0, 4)} />

        <section className="overflow-hidden rounded-[30px] border border-white/[0.08] bg-[radial-gradient(circle_at_top_left,rgba(20,126,245,0.18),transparent_34%),linear-gradient(180deg,rgba(11,21,33,0.96),rgba(7,11,21,0.98))] p-6 sm:p-7">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
            <div className="max-w-3xl">
              <p className="section-title">Ready For The Next Lobby?</p>
              <h2 className="mt-2 font-display text-3xl font-black uppercase text-white">Stay tournament-ready with Bravo PUBG</h2>
              <p className="mt-4 text-sm leading-7 text-text-muted">
                Registration, events, official rules, anti-cheat policy, and Discord updates stay visible so teams can move quickly when the
                next room opens.
              </p>
            </div>
            <div className="flex flex-wrap gap-3 xl:max-w-[34rem] xl:justify-end">
              <Link href="/teams/register" className="btn-primary">
                Register Team
              </Link>
              <Link href="/events" className="btn-secondary">
                View Events
              </Link>
              <Link href="/rules" className="btn-secondary">
                Rules
              </Link>
              <Link href="/anti-cheat" className="btn-secondary">
                Anti-Cheat
              </Link>
              <a href={BRAVO_DISCORD_URL} target="_blank" rel="noreferrer" className="btn-discord">
                Join Discord
              </a>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

export function PubgEventsPage({ dataset, searchParams }: { dataset: PubgHubDataset; searchParams: SearchParamDictionary }) {
  const query = readSearchParam(searchParams.q).trim().toLowerCase();
  const status = readSearchParam(searchParams.status, "all");
  const state = readSearchParam(searchParams.state, "all");
  const region = readSearchParam(searchParams.region, "all");

  const filteredEvents = dataset.events.filter((event) => {
    if (query && !`${event.name} ${event.region} ${event.type}`.toLowerCase().includes(query)) return false;
    if (status !== "all" && event.status !== status) return false;
    if (state !== "all" && event.state !== state) return false;
    if (region !== "all" && event.region !== region) return false;
    return true;
  });

  const syncCounts = countBy(dataset.events, (event) => event.syncStatus);
  const regions = Array.from(new Set(dataset.events.map((event) => event.region))).sort((firstValue, secondValue) =>
    firstValue.localeCompare(secondValue),
  );

  return (
    <main className="page-shell pb-12 pt-6">
      <div className="page-stack">
        <PageHero
          badge="PUBG Events"
          title={
            <>
              Event boards with standings,
              <br />
              schedule, and context layers
            </>
          }
          description="Browse published PUBG events, schedules, standings, teams, players, matches, and statistics."
          actions={
            <>
              <Link href="/pubg" className="btn-secondary">
                Back to dashboard
              </Link>
              <Link href="/pubg/results" className="btn-primary">
                Match activity
              </Link>
            </>
          }
          stats={[
            {
              label: "Total Events",
              value: dataset.events.length,
              tone: "blue",
            },
            { label: "Synced", value: syncCounts.synced ?? 0, tone: "green" },
            {
              label: "Awaiting Approval",
              value: syncCounts.awaiting_approval ?? 0,
              tone: "yellow",
            },
            { label: "Draft", value: syncCounts.draft ?? 0, tone: "red" },
          ]}
          aside={
            <div className="space-y-4">
              <div>
                <p className="section-title">Event States</p>
                <h2 className="mt-2 font-display text-2xl font-black uppercase text-white">Published, locked, and draft tracking</h2>
              </div>
              <div className="grid gap-3">
                {dataset.events.slice(0, 4).map((event) => (
                  <div key={event.id} className="rounded-card border border-white/[0.08] bg-black/20 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-semibold text-white">{event.name}</p>
                      <div className="flex flex-wrap gap-2">
                        <StatusPill status={event.status} />
                        <StatePill state={event.state} />
                      </div>
                    </div>
                    <div className="mt-3">
                      <SyncPill syncStatus={event.syncStatus} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          }
        />

        <FilterBar
          action={
            <Link href="/pubg/events" className="btn-secondary h-11">
              Reset
            </Link>
          }
        >
          <input
            aria-label="Search events"
            name="q"
            defaultValue={query}
            className="input-esports h-11"
            placeholder="Search event, region, or type"
          />
          <select aria-label="Filter events by status" name="status" defaultValue={status} className="input-esports h-11">
            <option value="all">All statuses</option>
            <option value="upcoming">Upcoming</option>
            <option value="ongoing">Ongoing</option>
            <option value="finished">Finished</option>
          </select>
          <select aria-label="Filter events by publication state" name="state" defaultValue={state} className="input-esports h-11">
            <option value="all">All states</option>
            <option value="published">Published</option>
            <option value="locked">Locked</option>
            <option value="draft">Draft</option>
          </select>
          <select aria-label="Filter events by region" name="region" defaultValue={region} className="input-esports h-11">
            <option value="all">All regions</option>
            {regions.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </FilterBar>

        <section className="esports-card p-6">
          <SectionHeader
            eyebrow="Event List"
            title={filteredEvents.length ? `${filteredEvents.length} event boards found` : "No events match the current filter"}
            description="Filter published events by status, region, and publication state."
          />
          <div className="mt-6 grid gap-4 xl:grid-cols-2">
            {filteredEvents.map((event) => (
              <EventSummaryCard key={event.id} event={event} href={`/pubg/events/${event.slug}`} />
            ))}
            {filteredEvents.length === 0 ? (
              <div className="xl:col-span-2">
                <EmptyState
                  title="No events match the current filters"
                  description="Try adjusting the filters to browse more published events."
                />
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </main>
  );
}

export function PubgCommunityPage({
  dataset,
  hub,
  searchParams,
}: {
  dataset: PubgHubDataset;
  hub: PlatformHubData;
  searchParams: SearchParamDictionary;
}) {
  const rawQuery = readSearchParam(searchParams.q).trim();
  const query = rawQuery.toLowerCase();
  const requestedView = readSearchParam(searchParams.view, "all");
  const view = requestedView === "teams" || requestedView === "players" ? requestedView : "all";
  const latestAnnouncements = hub.news.slice(0, 3);
  const rankedTeams = getPublicPubgTeams(dataset);
  const rankedPlayers = getPublicPubgPlayers(dataset, rankedTeams);
  const hasTeams = rankedTeams.length > 0;
  const hasPlayers = rankedPlayers.length > 0;
  const hasAnnouncements = latestAnnouncements.length > 0;
  const hasCommunityDirectory = hasTeams || hasPlayers;
  const hasCommunityData = hasCommunityDirectory || hasAnnouncements || dataset.matches.length > 0;
  const liveOrUpcomingEvents = dataset.events.filter((event) => event.status !== "finished").length;
  const communityRegions = Array.from(
    new Set(rankedTeams.map((team) => team.region).filter((value): value is string => Boolean(value))),
  ).sort((firstValue, secondValue) => firstValue.localeCompare(secondValue));
  const teamRankMap = getTeamRankMap(rankedTeams);
  const playerRankMap = getPlayerRankMap(rankedPlayers);
  const filteredTeams = rankedTeams.filter((team) => {
    if (!query) return true;
    return `${team.name} ${team.tag ?? ""} ${team.region ?? ""}`.toLowerCase().includes(query);
  });
  const filteredPlayers = rankedPlayers.filter((player) => {
    if (!query) return true;
    return `${player.pubgName} ${player.currentTeamName ?? ""}`.toLowerCase().includes(query);
  });
  const visibleTeams = filteredTeams.slice(0, query ? 12 : 8);
  const visiblePlayers = filteredPlayers.slice(0, query ? 12 : 8);
  const showTeams = view !== "players";
  const showPlayers = view !== "teams";
  const resetHref = buildHref("/pubg/community", {
    view: view === "all" ? undefined : view,
  });

  return (
    <main className="page-shell pb-12 pt-6">
      <div className="page-stack">
        <PageHero
          badge="PUBG Community"
          title={
            <>
              Teams, players,
              <br />
              and community updates
            </>
          }
          description={
            hasCommunityData
              ? "Discover published Bravo teams, player spotlights, official announcements, and the fastest public routes into upcoming PUBG action."
              : "Join the Bravo community for team registration, room updates, and the next official PUBG announcements."
          }
          actions={
            <>
              <a href={BRAVO_DISCORD_URL} target="_blank" rel="noreferrer" className="btn-discord">
                Join Discord
              </a>
              <Link href="/teams/register" className="btn-primary">
                Register Team
              </Link>
              <Link href="/events" className="btn-secondary">
                View Events
              </Link>
            </>
          }
          stats={
            hasCommunityData
              ? [
                  {
                    label: "Published Teams",
                    value: rankedTeams.length,
                    tone: "blue" as const,
                  },
                  {
                    label: "Published Players",
                    value: rankedPlayers.length,
                    tone: "green" as const,
                  },
                  {
                    label: "Published Matches",
                    value: dataset.matches.length,
                    tone: "yellow" as const,
                  },
                  {
                    label: "Announcements",
                    value: hub.news.length,
                    tone: "red" as const,
                  },
                ]
              : undefined
          }
          aside={
            <div className="space-y-4">
              <div>
                <p className="section-title">Community Access</p>
                <h2 className="mt-2 font-display text-2xl font-black uppercase text-white">Stay connected to the next Bravo PUBG call</h2>
              </div>
              {[
                hasCommunityData
                  ? `Community regions tracked: ${communityRegions.length}`
                  : "Register your roster and follow official room updates in Discord.",
                hasCommunityData
                  ? `Upcoming or live events: ${liveOrUpcomingEvents}`
                  : "Published team cards, player spotlights, and announcements will appear here after release.",
                "Use Events, News, Rules, and Contact to stay tournament-ready throughout the season.",
              ].map((item) => (
                <div key={item} className="rounded-card border border-white/[0.08] bg-black/20 px-4 py-3 text-sm text-white">
                  {item}
                </div>
              ))}
            </div>
          }
        />

        {hasCommunityDirectory ? (
          <>
            <div className="tab-bar">
              {[
                { value: "all", label: "All" },
                { value: "teams", label: "Teams" },
                { value: "players", label: "Players" },
              ].map((tab) => (
                <Link
                  key={tab.value}
                  href={buildHref("/pubg/community", {
                    view: tab.value === "all" ? undefined : tab.value,
                    q: rawQuery || undefined,
                  })}
                  className={`tab-item ${view === tab.value ? "tab-item-active" : ""}`}
                >
                  {tab.label}
                </Link>
              ))}
            </div>

            <FilterBar
              action={
                <Link href={resetHref} className="btn-secondary h-11">
                  Reset
                </Link>
              }
            >
              <FilterField label="Search">
                <input name="q" defaultValue={rawQuery} className="input-esports h-11" placeholder="Search team, player, or region" />
              </FilterField>
              <input type="hidden" name="view" value={view} />
              <div className="rounded-card border border-white/[0.08] bg-bg-primary px-4 py-3 text-sm text-text-muted">
                Browse published PUBG teams and players, or use search to jump straight to a name or region.
              </div>
            </FilterBar>
            <ActiveFilterSummary
              items={[
                { label: "Search", value: rawQuery || null },
                { label: "View", value: view === "all" ? null : view },
              ]}
            />
          </>
        ) : null}

        <section className="grid gap-6 xl:grid-cols-[1fr,1fr]">
          <DashboardSection
            eyebrow="Community Actions"
            title="Community links that matter"
            description="Registration, Discord, event updates, rules, and support should stay one click away from the Bravo community hub."
          >
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {[
                {
                  title: "Discord",
                  detail: "Join the official Bravo Discord for scrim coordination, announcements, and community support.",
                  href: BRAVO_DISCORD_URL,
                  external: true,
                },
                {
                  title: "Register Team",
                  detail: "Submit your roster and stay ready for official Bravo scrims and tournaments.",
                  href: "/teams/register",
                  external: false,
                },
                {
                  title: "Events",
                  detail: "Browse published and upcoming PUBG event boards.",
                  href: "/events",
                  external: false,
                },
                {
                  title: "News",
                  detail: "Read official announcements, tournament updates, and community stories.",
                  href: "/news",
                  external: false,
                },
                {
                  title: "Rules",
                  detail: "Review the current competition, conduct, and lobby expectations.",
                  href: "/rules",
                  external: false,
                },
                {
                  title: "Contact",
                  detail: "Reach Bravo for community, team, sponsor, or tournament support.",
                  href: "/contact",
                  external: false,
                },
              ].map((item) =>
                item.external ? (
                  <a
                    key={item.title}
                    href={item.href}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-card border border-white/[0.08] bg-bg-primary p-4 transition hover:border-accent-blue/30 hover:bg-bg-hover"
                  >
                    <p className="font-display text-sm font-black uppercase text-white">{item.title}</p>
                    <p className="mt-2 text-sm text-text-muted">{item.detail}</p>
                  </a>
                ) : (
                  <Link
                    key={item.title}
                    href={item.href}
                    className="rounded-card border border-white/[0.08] bg-bg-primary p-4 transition hover:border-accent-blue/30 hover:bg-bg-hover"
                  >
                    <p className="font-display text-sm font-black uppercase text-white">{item.title}</p>
                    <p className="mt-2 text-sm text-text-muted">{item.detail}</p>
                  </Link>
                ),
              )}
            </div>
          </DashboardSection>

          <DashboardSection
            eyebrow="Latest Announcements"
            title="Official community updates"
            description="Announcements, tournament notices, and public Bravo updates are published here first."
          >
            <div className="grid gap-3">
              {latestAnnouncements.map((article) => (
                <Link
                  key={article.slug}
                  href={`/news/${article.slug}`}
                  className="rounded-card border border-white/[0.08] bg-bg-primary p-4 transition hover:border-accent-blue/30 hover:bg-bg-hover"
                >
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-accent-blue">{article.category}</p>
                  <p className="mt-2 font-semibold text-white">{article.title}</p>
                  <p className="mt-2 text-sm text-text-muted">{article.summary}</p>
                </Link>
              ))}
              {latestAnnouncements.length === 0 ? (
                <EmptyState
                  title="No official announcements have been published yet"
                  description="Tournament updates, community notices, and featured stories will appear here soon."
                />
              ) : null}
            </div>
          </DashboardSection>
        </section>

        {!hasCommunityDirectory ? (
          <DashboardSection
            eyebrow="Community Directory"
            title="Team and player listings are coming soon"
            description="Official Bravo team cards and player spotlights will appear here after published results and roster updates are live."
          >
            <EmptyState
              title="No published team or player data yet"
              description="Register your team, join Discord, and check back for official community listings."
              action={
                <div className="flex flex-wrap justify-center gap-3">
                  <Link href="/teams/register" className="btn-primary">
                    Register Team
                  </Link>
                  <a href={BRAVO_DISCORD_URL} target="_blank" rel="noreferrer" className="btn-secondary">
                    Join Discord
                  </a>
                </div>
              }
            />
          </DashboardSection>
        ) : null}

        {showTeams && hasCommunityDirectory ? (
          <DashboardSection
            eyebrow="Teams"
            title={visibleTeams.length > 0 ? "PUBG team directory" : "No published team cards yet"}
            description="Browse published Bravo teams, region tags, logos, and recent form from the current results set."
            action={
              <Link href="/pubg/teams" className="btn-secondary">
                View Full Directory
              </Link>
            }
          >
            {visibleTeams.length > 0 ? (
              <div className="grid gap-4 xl:grid-cols-2">
                {visibleTeams.map((team, index) => (
                  <HubTeamCard key={team.id} team={team} rank={teamRankMap.get(team.id) ?? index + 1} />
                ))}
              </div>
            ) : (
              <EmptyState
                title={query ? "No teams match this search" : "No published team data yet"}
                description={
                  query
                    ? "Try broadening your search to see more PUBG teams."
                    : "Official team cards will appear here after published match results and roster updates are available."
                }
              />
            )}
          </DashboardSection>
        ) : null}

        {showPlayers && hasCommunityDirectory ? (
          <DashboardSection
            eyebrow="Players"
            title={visiblePlayers.length > 0 ? "PUBG player spotlights" : "No published player spotlights yet"}
            description="Browse published player spotlights and current performance leaders from official Bravo results."
            action={
              <Link href="/pubg/players" className="btn-secondary">
                View Full Directory
              </Link>
            }
          >
            {visiblePlayers.length > 0 ? (
              <div className="grid gap-4 xl:grid-cols-2">
                {visiblePlayers.map((player, index) => (
                  <HubPlayerCard key={player.id} player={player} rank={playerRankMap.get(player.id) ?? index + 1} />
                ))}
              </div>
            ) : (
              <EmptyState
                title={query ? "No players match this search" : "No published player data yet"}
                description={
                  query
                    ? "Try broadening your search to see more PUBG players."
                    : "Official player spotlights will appear here after published results are available."
                }
              />
            )}
          </DashboardSection>
        ) : null}
      </div>
    </main>
  );
}

function EventNavigation({ slug, currentTab, target, map }: { slug: string; currentTab: string; target: string; map: string }) {
  const tabs = [
    { value: "overview", label: "Overview" },
    { value: "teams", label: "Teams" },
    { value: "players", label: "Players" },
    { value: "matches", label: "Matches" },
    { value: "stats", label: "Stats" },
  ];

  return (
    <div className="tab-bar">
      {tabs.map((tab) => (
        <Link
          key={tab.value}
          href={buildHref(`/pubg/events/${slug}`, {
            tab: tab.value,
            target: target || undefined,
            map: map || undefined,
          })}
          className={`tab-item ${currentTab === tab.value ? "tab-item-active" : ""}`}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  );
}

function EventSpotlight({ event, team, player }: { event: PubgHubEvent; team: PubgHubTeam | null; player: PubgHubPlayer | null }) {
  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <div className="esports-card p-6">
        <SectionHeader
          eyebrow="Team Spotlight"
          title={team?.name ?? "Team spotlight"}
          description="Selected from the event board so users can move from standings into roster, recent trend, and event-specific output without losing context."
        />
        {team ? (
          <div className="mt-5 space-y-5">
            <div className="flex flex-wrap items-center gap-3">
              <TeamAvatar name={team.name} imageUrl={team.logoUrl ?? undefined} size="lg" />
              <div>
                <h3 className="font-display text-2xl font-black uppercase text-white">{team.name}</h3>
                <p className="text-sm uppercase tracking-[0.16em] text-text-muted">{team.region ?? "Region TBA"}</p>
              </div>
              <div className="ml-auto">
                <FormPill label={team.formLabel} />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <MetricCard label="Matches" value={team.eventStats.find((item) => item.eventId === event.id)?.matches ?? 0} compact />
              <MetricCard label="Kills" value={team.eventStats.find((item) => item.eventId === event.id)?.kills ?? 0} compact tone="blue" />
              <MetricCard
                label="Points"
                value={team.eventStats.find((item) => item.eventId === event.id)?.totalPoints ?? 0}
                compact
                tone="green"
              />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-text-muted">Roster overlay</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {team.currentRoster.map((member) => (
                  <div key={member.playerId} className="rounded-card border border-white/[0.08] bg-bg-primary p-3">
                    <p className="font-semibold text-white">{member.pubgName}</p>
                    <p className="text-xs uppercase tracking-[0.16em] text-text-muted">{member.role}</p>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-text-muted">Recent point trend</p>
              <div className="mt-3">
                <TrendBars values={team.recentPoints} tone="green" />
              </div>
            </div>
            <Link href={`/pubg/teams/${team.slug ?? team.id}`} className="btn-secondary">
              Open team profile
            </Link>
          </div>
        ) : (
          <div className="mt-5">
            <EmptyState
              title="No team spotlight selected"
              description="Choose a team from the event standings to view roster, form, and event splits here."
            />
          </div>
        )}
      </div>

      <div className="esports-card p-6">
        <SectionHeader
          eyebrow="Player Spotlight"
          title={player?.pubgName ?? "Player spotlight"}
          description="The event player view keeps high-output players close to the board so users can jump from rankings into match history and team context quickly."
        />
        {player ? (
          <div className="mt-5 space-y-5">
            <div className="flex flex-wrap items-center gap-3">
              <TeamAvatar name={player.pubgName} imageUrl={player.avatarUrl ?? undefined} size="lg" />
              <div>
                <h3 className="font-display text-2xl font-black uppercase text-white">{player.pubgName}</h3>
                <p className="text-sm uppercase tracking-[0.16em] text-text-muted">{player.currentTeamName ?? "Team TBD"}</p>
              </div>
              <div className="ml-auto">
                <FormPill label={player.formLabel} />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-4">
              <MetricCard label="Kills" value={player.eventStats.find((item) => item.eventId === event.id)?.kills ?? 0} compact />
              <MetricCard
                label="Assists"
                value={player.eventStats.find((item) => item.eventId === event.id)?.assists ?? 0}
                compact
                tone="blue"
              />
              <MetricCard
                label="Knocks"
                value={player.eventStats.find((item) => item.eventId === event.id)?.knocks ?? 0}
                compact
                tone="yellow"
              />
              <MetricCard
                label="Damage"
                value={player.eventStats.find((item) => item.eventId === event.id)?.damage ?? 0}
                compact
                tone="green"
              />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-text-muted">Recent kill trend</p>
              <div className="mt-3">
                <TrendBars values={player.recentTrend} tone="blue" />
              </div>
            </div>
            {player.bestMatch ? (
              <div className="rounded-card border border-white/[0.08] bg-bg-primary p-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-text-muted">Best match</p>
                <p className="mt-2 font-semibold text-white">
                  {player.bestMatch.eventName} | Match {player.bestMatch.matchNumber}
                </p>
                <p className="mt-2 text-sm text-text-muted">
                  {player.bestMatch.kills} kills, {player.bestMatch.assists ?? 0} assists,{" "}
                  {player.bestMatch.damage === undefined ? "damage not tracked" : `${player.bestMatch.damage} damage`} on{" "}
                  {player.bestMatch.mapName}.
                </p>
              </div>
            ) : null}
            <Link href={`/pubg/players/${player.slug ?? player.id}`} className="btn-secondary">
              Open player profile
            </Link>
          </div>
        ) : (
          <div className="mt-5">
            <EmptyState
              title="No player spotlight selected"
              description="Choose a player from the event stats table to view their event performance and recent form here."
            />
          </div>
        )}
      </div>
    </div>
  );
}

function EventStandingsTable({ event, slug }: { event: PubgHubEvent; slug: string }) {
  return (
    <div className="esports-card overflow-hidden !p-0">
      <div className="border-b border-white/[0.08] px-5 py-4">
        <SectionHeader
          eyebrow="Standings"
          title="Team board"
          description="Team points, placement splits, kill output, and quick drill-in routes into the event team spotlight."
        />
      </div>
      {event.standings.length === 0 ? (
        <div className="p-6">
          <EmptyState
            title="Leaderboard data is not available yet"
            description="Leaderboard data will be available once matches have been completed and officially published."
          />
        </div>
      ) : (
        <div className="table-scroll" tabIndex={0}>
          <table className="data-table min-w-full">
            <caption className="sr-only">Team standings for {event.name}</caption>
            <thead>
              <tr>
                <th scope="col">Rank</th>
                <th scope="col">Team</th>
                <th scope="col">Matches</th>
                <th scope="col">Wins</th>
                <th scope="col">Kills</th>
                <th scope="col">Placement</th>
                <th scope="col">Damage</th>
                <th scope="col">Total</th>
                <th scope="col">Trend</th>
              </tr>
            </thead>
            <tbody>
              {event.standings.map((row) => (
                <tr key={row.teamId}>
                  <td>
                    <RankBadge rank={row.rank} />
                  </td>
                  <td>
                    <Link
                      href={buildHref(`/pubg/events/${slug}`, {
                        tab: "teams",
                        target: row.teamId,
                      })}
                      className="font-semibold text-white hover:text-accent-blue"
                    >
                      {row.teamName}
                    </Link>
                  </td>
                  <td>{formatNumber(row.matches)}</td>
                  <td>{formatNumber(row.wins)}</td>
                  <td>{formatNumber(row.kills)}</td>
                  <td>{formatNumber(row.placementPoints)}</td>
                  <td>{row.damage === null ? "Not tracked" : formatNumber(row.damage)}</td>
                  <td className="points-cell">{formatNumber(row.totalPoints)}</td>
                  <td className="min-w-28">
                    <TrendBars values={row.trend} tone="green" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function EventPlayersTable({ event, slug }: { event: PubgHubEvent; slug: string }) {
  return (
    <div className="esports-card overflow-hidden !p-0">
      <div className="border-b border-white/[0.08] px-5 py-4">
        <SectionHeader
          eyebrow="Player Stats"
          title="Event player table"
          description="Kills, assists, knocks, damage, averages, and quick spotlight routing into the selected player."
        />
      </div>
      {event.playerTable.length === 0 ? (
        <div className="p-6">
          <EmptyState
            title="Player statistics are currently unavailable"
            description="Please check back after upcoming matches are completed."
          />
        </div>
      ) : (
        <div className="table-scroll" tabIndex={0}>
          <table className="data-table min-w-full">
            <caption className="sr-only">Player statistics for {event.name}</caption>
            <thead>
              <tr>
                <th scope="col">Rank</th>
                <th scope="col">Player</th>
                <th scope="col">Team</th>
                <th scope="col">Kills</th>
                <th scope="col">Assists</th>
                <th scope="col">Knocks</th>
                <th scope="col">Damage</th>
                <th scope="col">Avg K</th>
                <th scope="col">Trend</th>
              </tr>
            </thead>
            <tbody>
              {event.playerTable.map((row) => (
                <tr key={row.playerId}>
                  <td>
                    <RankBadge rank={row.rank} />
                  </td>
                  <td>
                    <Link
                      href={buildHref(`/pubg/events/${slug}`, {
                        tab: "players",
                        target: row.playerId,
                      })}
                      className="font-semibold text-white hover:text-accent-blue"
                    >
                      {row.pubgName}
                    </Link>
                  </td>
                  <td>{row.teamName ?? "Team TBD"}</td>
                  <td>{formatNumber(row.kills)}</td>
                  <td>{formatNumber(row.assists)}</td>
                  <td>{formatNumber(row.knocks)}</td>
                  <td>{formatNumber(row.damage)}</td>
                  <td>{formatDecimal(row.avgKills, 2)}</td>
                  <td className="min-w-28">
                    <TrendBars values={row.trend} tone="blue" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function EventMatchesBoard({ event, playerLookup }: { event: PubgHubEvent; playerLookup: Map<string, PubgHubPlayer> }) {
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      {event.matches.map((match) => {
        const winnerTeam = match.winnerTeamName ?? "Winner TBD";
        const topFragger = buildTopFragger(match, playerLookup);
        const matchStatus = getMatchStatusMeta(match);

        return (
          <div key={match.id} className="esports-card p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-accent-blue">
                  Match {match.matchNumber} | {match.mapName}
                </p>
                <h3 className="mt-2 font-display text-lg font-black uppercase text-white">{event.name}</h3>
              </div>
              <span className={`rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] ${matchStatus.className}`}>
                {matchStatus.label}
              </span>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <MetricCard label="Winner" value={winnerTeam} compact />
              <MetricCard label="Total Kills" value={match.totalKills} compact tone="blue" />
              {match.totalDamage !== null ? <MetricCard label="Damage" value={match.totalDamage} compact tone="green" /> : null}
            </div>
            {topFragger ? (
              <div className="mt-4 rounded-card border border-white/[0.08] bg-bg-primary p-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-text-muted">Top fragger</p>
                <p className="mt-2 font-semibold text-white">{topFragger.pubgName}</p>
                <p className="mt-1 text-sm text-text-muted">{topFragger.currentTeamName ?? "Team TBD"}</p>
              </div>
            ) : null}
            <div className="mt-4 table-scroll" tabIndex={0}>
              <table className="data-table min-w-full">
                <caption className="sr-only">
                  Leading team results for {event.name}, match {match.matchNumber}
                </caption>
                <thead>
                  <tr>
                    <th scope="col">Rank</th>
                    <th scope="col">Team</th>
                    <th scope="col">Kills</th>
                    <th scope="col">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {match.teamResults.slice(0, 6).map((result) => (
                    <tr key={result.teamId}>
                      <td>#{result.placement}</td>
                      <td>{result.teamName}</td>
                      <td>{formatNumber(result.kills)}</td>
                      <td className="points-cell">{formatNumber(result.totalPoints)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
      {event.matches.length === 0 ? (
        <div className="xl:col-span-2">
          <EmptyState
            title="No match results have been published for this event yet"
            description="Results will appear once they are officially verified."
          />
        </div>
      ) : null}
    </div>
  );
}

export function PubgEventDetailPage({
  dataset,
  event,
  searchParams,
}: {
  dataset: PubgHubDataset;
  event: PubgHubEvent;
  searchParams: SearchParamDictionary;
}) {
  const tab = readSearchParam(searchParams.tab, "overview");
  const target = readSearchParam(searchParams.target);
  const map = readSearchParam(searchParams.map, "all");
  const teamLookup = buildTeamLookup(dataset);
  const playerLookup = buildPlayerLookup(dataset);
  const selectedTeamId = event.teamIds.includes(target) ? target : (event.topTeamId ?? event.standings[0]?.teamId ?? "");
  const selectedPlayerId = event.playerTable.some((row) => row.playerId === target)
    ? target
    : (event.topPlayerId ?? event.playerTable[0]?.playerId ?? "");
  const selectedTeam = selectedTeamId ? (teamLookup.get(selectedTeamId) ?? null) : null;
  const selectedPlayer = selectedPlayerId ? (playerLookup.get(selectedPlayerId) ?? null) : null;
  const filteredMapStats = map === "all" ? event.mapStats : event.mapStats.filter((item) => item.map === map);
  const mapOptions = ["all", ...event.mapStats.map((item) => item.map)];
  const selectedPlayerRow = event.playerTable.find((row) => row.playerId === selectedPlayerId) ?? null;
  const selectedTeamRow = event.standings.find((row) => row.teamId === selectedTeamId) ?? null;

  return (
    <main className="page-shell pb-12 pt-6">
      <div className="page-stack">
        <PageHero
          badge="PUBG Event Detail"
          title={
            <>
              {event.name}
              <br />
              event context and stat layers
            </>
          }
          description={
            event.description ??
            "Full event context: standings, players, matches, map splits, approval state, and direct paths into team and player views inside the event."
          }
          actions={
            <>
              <Link href="/pubg/events" className="btn-secondary">
                Back to events
              </Link>
              {event.status === "ongoing" && event.streamUrl ? (
                <a href={event.streamUrl} target="_blank" rel="noopener noreferrer" className="btn-primary">
                  Watch Live
                </a>
              ) : null}
            </>
          }
          stats={[
            { label: "Teams", value: event.teamCount, tone: "blue" },
            { label: "Matches", value: event.matchCount, tone: "green" },
            { label: "Region", value: event.region, tone: "yellow" },
            { label: "Prize", value: event.prizePool, tone: "red" },
          ]}
          aside={
            <div className="space-y-4">
              <div>
                <p className="section-title">Event State</p>
                <h2 className="mt-2 font-display text-2xl font-black uppercase text-white">Public board status</h2>
              </div>
              <div className="flex flex-wrap gap-2">
                <StatusPill status={event.status} />
                <StatePill state={event.state} />
                <SyncPill syncStatus={event.syncStatus} />
              </div>
              <div className="rounded-card border border-white/[0.08] bg-black/20 p-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-text-muted">Schedule</p>
                <p className="mt-2 text-sm text-white">{formatDateRange(event.startDate, event.endDate)}</p>
              </div>
              <div className="rounded-card border border-white/[0.08] bg-black/20 p-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-text-muted">Format</p>
                <p className="mt-2 text-sm text-white">
                  {event.game} | {event.mode} | {event.perspective}
                </p>
              </div>
              <div className="rounded-card border border-white/[0.08] bg-black/20 p-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-text-muted">Approval</p>
                <p className="mt-2 text-sm text-white">
                  {event.syncStatus === "awaiting_approval"
                    ? "At least one match result is still waiting on admin approval before the board fully locks."
                    : event.state === "draft"
                      ? "This event is still in draft and is not ready for a live public fantasy or registration lock."
                      : "This board is approved enough for public browsing and context tracking."}
                </p>
              </div>
            </div>
          }
        />

        <section className="sticky top-20 z-20 rounded-[28px] border border-white/[0.08] bg-[#09111b]/95 p-3 shadow-[0_18px_60px_rgba(0,0,0,0.35)] backdrop-blur md:static md:border-0 md:bg-transparent md:p-0 md:shadow-none">
          <EventNavigation slug={event.slug} currentTab={tab} target={target} map={map} />
        </section>

        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Top Team" value={event.standings[0]?.teamName ?? "Pending"} tone="green" />
          <MetricCard label="Top Player" value={event.playerTable[0]?.pubgName ?? "Pending"} tone="blue" />
          <MetricCard label="Published Matches" value={event.matches.filter(isPublishedMatch).length} tone="yellow" />
          <MetricCard label="Generated" value={formatDateTime(dataset.generatedAt)} tone="red" />
        </section>

        {(tab === "overview" || tab === "teams" || tab === "players") && (
          <EventSpotlight event={event} team={selectedTeam} player={selectedPlayer} />
        )}

        {tab === "overview" ? (
          <>
            <EventStandingsTable event={event} slug={event.slug} />
            <EventPlayersTable event={event} slug={event.slug} />
            <section className="grid gap-6 xl:grid-cols-[1.05fr,0.95fr]">
              <MapStatsTable
                stats={event.mapStats}
                title="Event map performance"
                description="Map-by-map kills, wins, damage, and average placement across the whole event board."
              />
              <div className="esports-card p-6">
                <SectionHeader
                  eyebrow="Event Teams"
                  title="Twenty-team lobby context"
                  description="Everyone attached to the event is visible here, even when the event is upcoming or draft."
                />
                <div className="mt-5 grid gap-3 md:grid-cols-2">
                  {event.teamIds.map((teamId) => {
                    const team = teamLookup.get(teamId);
                    return team ? (
                      <TeamIdentity
                        key={team.id}
                        team={team}
                        href={buildHref(`/pubg/events/${event.slug}`, {
                          tab: "teams",
                          target: team.id,
                        })}
                      />
                    ) : null;
                  })}
                </div>
              </div>
            </section>
          </>
        ) : null}

        {tab === "teams" ? <EventStandingsTable event={event} slug={event.slug} /> : null}
        {tab === "players" ? <EventPlayersTable event={event} slug={event.slug} /> : null}
        {tab === "matches" ? <EventMatchesBoard event={event} playerLookup={playerLookup} /> : null}

        {tab === "stats" ? (
          <>
            <section className="esports-card p-6">
              <SectionHeader
                eyebrow="Stat Filters"
                title="Map-based event read"
                description="Use map filters to tighten the read on team and player output without losing the wider event context."
              />
              <div className="mt-5 flex flex-wrap gap-2">
                {mapOptions.map((item) => (
                  <Link
                    key={item}
                    href={buildHref(`/pubg/events/${event.slug}`, {
                      tab: "stats",
                      map: item === "all" ? undefined : item,
                    })}
                    className={`rounded-full border px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.12em] ${
                      map === item || (item === "all" && map === "all")
                        ? "border-accent-blue/30 bg-accent-blue/10 text-accent-blue"
                        : "border-white/10 bg-bg-primary text-text-muted"
                    }`}
                  >
                    {item === "all" ? "All Maps" : item}
                  </Link>
                ))}
              </div>
            </section>

            <section className="grid gap-6 xl:grid-cols-[1fr,1fr]">
              <MapStatsTable
                stats={filteredMapStats}
                title={map === "all" ? "All map splits" : `${map} split`}
                description="Kills, wins, damage, and average placement for the selected map view."
              />
              <div className="esports-card p-6">
                <SectionHeader
                  eyebrow="Trend Layer"
                  title="Match-by-match signals"
                  description="Recent event trends for the selected team and player inside this event board."
                />
                <div className="mt-5 grid gap-5">
                  <div className="rounded-card border border-white/[0.08] bg-bg-primary p-4">
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-text-muted">Selected team point trend</p>
                    <div className="mt-3">
                      <TrendBars values={selectedTeamRow?.trend ?? []} tone="green" />
                    </div>
                  </div>
                  <div className="rounded-card border border-white/[0.08] bg-bg-primary p-4">
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-text-muted">Selected player kill trend</p>
                    <div className="mt-3">
                      <TrendBars values={selectedPlayerRow?.trend ?? []} tone="blue" />
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </>
        ) : null}
      </div>
    </main>
  );
}

export function PubgResultsPage({ dataset, searchParams }: { dataset: PubgHubDataset; searchParams: SearchParamDictionary }) {
  const eventSlug = readSearchParam(searchParams.event, "all");
  const mapName = readSearchParam(searchParams.map, "all");
  const status = readSearchParam(searchParams.status, "all");
  const playerLookup = buildPlayerLookup(dataset);
  const filteredMatches = filterMatches(dataset, {
    eventSlug: eventSlug === "all" ? undefined : eventSlug,
    mapName,
    status,
  });
  const mapOptions = dedupeMaps(dataset.matches);
  const teamLookup = buildTeamLookup(dataset);

  return (
    <main className="page-shell pb-12 pt-6">
      <div className="page-stack">
        <PageHero
          badge="PUBG Results"
          title={
            <>
              Match activity with
              <br />
              winner, fragger, and state
            </>
          }
          description="The Bravo results board stays compact and scan-friendly: match cards, event context, winner, top fragger, total kills, damage, and approval state."
          actions={
            <>
              <Link href="/pubg" className="btn-secondary">
                Dashboard
              </Link>
              <Link href="/pubg/events" className="btn-primary">
                Event boards
              </Link>
            </>
          }
          stats={[
            {
              label: "Published Matches",
              value: dataset.matches.filter(isPublishedMatch).length,
              tone: "green",
            },
            {
              label: "Awaiting Approval",
              value: dataset.matches.filter((match) => !isPublishedMatch(match)).length,
              tone: "yellow",
            },
            { label: "Maps Covered", value: mapOptions.length, tone: "blue" },
            {
              label: "Events Covered",
              value: new Set(dataset.matches.map((match) => match.eventId)).size,
              tone: "red",
            },
          ]}
          aside={
            <div className="space-y-4">
              <div>
                <p className="section-title">Recent Sync</p>
                <h2 className="mt-2 font-display text-2xl font-black uppercase text-white">Result approval and visibility</h2>
              </div>
              {dataset.events.slice(0, 4).map((event) => (
                <div key={event.id} className="rounded-card border border-white/[0.08] bg-black/20 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold text-white">{event.name}</p>
                    <SyncPill syncStatus={event.syncStatus} />
                  </div>
                  <p className="mt-2 text-sm text-text-muted">{event.matchCount} matches tracked</p>
                </div>
              ))}
            </div>
          }
        />

        <FilterBar
          action={
            <Link href="/pubg/results" className="btn-secondary h-11">
              Reset
            </Link>
          }
        >
          <select aria-label="Filter results by event" name="event" defaultValue={eventSlug} className="input-esports h-11">
            <option value="all">All events</option>
            {dataset.events.map((event) => (
              <option key={event.id} value={event.slug}>
                {event.name}
              </option>
            ))}
          </select>
          <select aria-label="Filter results by map" name="map" defaultValue={mapName} className="input-esports h-11">
            <option value="all">All maps</option>
            {mapOptions.map((map) => (
              <option key={map} value={map}>
                {map}
              </option>
            ))}
          </select>
          <select aria-label="Filter results by state" name="status" defaultValue={status} className="input-esports h-11">
            <option value="all">All states</option>
            <option value="published">Published</option>
            <option value="awaiting_approval">Awaiting approval</option>
          </select>
          <div className="rounded-card border border-white/[0.08] bg-bg-primary px-4 py-3 text-sm text-text-muted">
            Match cards keep enough context visible that users do not need a dedicated match route to understand the latest lobby.
          </div>
        </FilterBar>

        <section className="grid gap-4 xl:grid-cols-2">
          {filteredMatches.map((match) => {
            const topFragger = buildTopFragger(match, playerLookup);
            const matchStatus = getMatchStatusMeta(match);

            return (
              <div key={match.id} className="esports-card p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-accent-blue">{match.eventName}</p>
                    <h2 className="mt-2 font-display text-2xl font-black uppercase text-white">
                      Match {match.matchNumber} | {match.mapName}
                    </h2>
                    <p className="mt-2 text-sm text-text-muted">{formatDateTime(match.startTime)}</p>
                  </div>
                  <span
                    className={`rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] ${matchStatus.className}`}
                  >
                    {matchStatus.label}
                  </span>
                </div>
                <div className="mt-5 grid gap-3 sm:grid-cols-4">
                  <MetricCard label="Winner" value={match.winnerTeamName ?? "Pending"} compact tone="green" />
                  <MetricCard label="Kills" value={match.totalKills} compact tone="blue" />
                  {match.totalDamage !== null ? <MetricCard label="Damage" value={match.totalDamage} compact tone="yellow" /> : null}
                  <MetricCard label="Event" value={match.eventStatus} compact tone="red" />
                </div>
                <div className="mt-5 grid gap-5 xl:grid-cols-[1fr,0.95fr]">
                  <div className="rounded-card border border-white/[0.08] bg-bg-primary p-4">
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-text-muted">Winner board</p>
                    {match.winnerTeamId ? (
                      <div className="mt-3">
                        <TeamIdentity
                          team={
                            teamLookup.get(match.winnerTeamId) ?? {
                              id: match.winnerTeamId,
                              name: match.winnerTeamName ?? "Pending",
                              tag: null,
                              logoUrl: null,
                            }
                          }
                          href={match.winnerTeamId ? `/pubg/teams/${match.winnerTeamId}` : undefined}
                        />
                      </div>
                    ) : (
                      <p className="mt-3 text-sm text-text-muted">Winner will appear after the lobby data publishes fully.</p>
                    )}
                    <div className="mt-4 table-scroll" tabIndex={0}>
                      <table className="data-table min-w-full">
                        <caption className="sr-only">
                          Leading team results for {match.eventName}, match {match.matchNumber}
                        </caption>
                        <thead>
                          <tr>
                            <th scope="col">Rank</th>
                            <th scope="col">Team</th>
                            <th scope="col">Kills</th>
                            <th scope="col">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {match.teamResults.slice(0, 5).map((row) => (
                            <tr key={row.teamId}>
                              <td>#{row.placement}</td>
                              <td>{row.teamName}</td>
                              <td>{formatNumber(row.kills)}</td>
                              <td className="points-cell">{formatNumber(row.totalPoints)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  {topFragger ? (
                    <div className="rounded-card border border-white/[0.08] bg-bg-primary p-4">
                      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-text-muted">Top fragger</p>
                      <div className="mt-3">
                        {topFragger.player ? (
                          <PlayerIdentity player={topFragger.player} href={`/pubg/players/${topFragger.player.slug}`} />
                        ) : (
                          <div>
                            <p className="font-semibold text-white">{topFragger.pubgName}</p>
                            <p className="mt-1 text-sm text-text-muted">{topFragger.currentTeamName ?? "Team TBD"}</p>
                          </div>
                        )}
                      </div>
                      <div className="mt-4">
                        <Link href={`/pubg/events/${match.eventSlug}?tab=matches`} className="btn-secondary">
                          Open event board
                        </Link>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-end">
                      <Link href={`/pubg/events/${match.eventSlug}?tab=matches`} className="btn-secondary">
                        Open event board
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          {filteredMatches.length === 0 ? (
            <div className="xl:col-span-2">
              <EmptyState
                title="No match results are available for the selected filters"
                description="Try adjusting the filters or check back after official results are published."
              />
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}

export function PubgFantasyPage() {
  return (
    <main className="page-shell pb-12 pt-6">
      <div className="page-stack">
        <PageHero
          badge="Feature Status"
          title={
            <>
              PUBG fantasy
              <br />
              is not available
            </>
          }
          description="Bravo has not published a PUBG fantasy competition. No picks, scores, rewards, or fantasy leaderboards are currently active."
          actions={
            <>
              <Link href="/pubg" className="btn-primary">
                Browse PUBG
              </Link>
              <Link href="/pubg/leaderboards" className="btn-secondary">
                View Leaderboards
              </Link>
            </>
          }
        />

        <EmptyState
          title="No fantasy competition is published"
          description="Use the PUBG hub for published events, standings, teams, players, and match results."
        />
      </div>
    </main>
  );
}

export function PubgAccessPage() {
  return (
    <main className="page-shell pb-12 pt-6">
      <div className="page-stack">
        <PageHero
          badge="Portal Access"
          title={
            <>
              Supabase-backed access
              <br />
              for Bravo operators
            </>
          }
          description="Bravo keeps operational access simple and real: admin accounts handle publishing and approval work, while team staff manage their own roster and upload tasks."
          actions={
            <>
              <Link href="/admin/login" className="btn-primary">
                Admin login
              </Link>
              <Link href="/team/login" className="btn-secondary">
                Team login
              </Link>
            </>
          }
          stats={[
            { label: "Admin Access", value: "Protected", tone: "green" },
            {
              label: "Team Access",
              value: "Coach / Manager / IGL",
              tone: "yellow",
            },
            { label: "Auth Layer", value: "Supabase", tone: "blue" },
            { label: "Scope", value: "PUBG Ops", tone: "red" },
          ]}
          aside={
            <div className="space-y-4">
              <div>
                <p className="section-title">Current Policy</p>
                <h2 className="mt-2 font-display text-2xl font-black uppercase text-white">Role clarity keeps operations clean</h2>
              </div>
              <div className="rounded-card border border-white/[0.08] bg-black/20 p-4 text-sm text-white">
                Admin handles publish and approval operations.
              </div>
              <div className="rounded-card border border-white/[0.08] bg-black/20 p-4 text-sm text-white">
                Coaches, team managers, and team IGLs handle roster, optional MOSS, and team asset operations.
              </div>
            </div>
          }
        />

        <section className="grid gap-6 xl:grid-cols-2">
          <div className="esports-card p-6">
            <SectionHeader
              eyebrow="Live Access"
              title="Current Bravo roles"
              description="Choose the right access point for publishing, team operations, and competition support."
            />
            <div className="mt-5 grid gap-3">
              <Link
                href="/admin/login"
                className="rounded-card border border-white/[0.08] bg-bg-primary p-5 transition hover:border-accent-blue/30 hover:bg-bg-hover"
              >
                <p className="font-display text-lg font-black uppercase text-white">Admin Login</p>
                <p className="mt-2 text-sm text-text-muted">Match approval, event publishing, uploads, and platform moderation.</p>
              </Link>
              <Link
                href="/team/login"
                className="rounded-card border border-white/[0.08] bg-bg-primary p-5 transition hover:border-accent-green/30 hover:bg-bg-hover"
              >
                <p className="font-display text-lg font-black uppercase text-white">Team Login</p>
                <p className="mt-2 text-sm text-text-muted">
                  Roster management, MOSS workflow, result evidence, and operational requests for a team.
                </p>
              </Link>
            </div>
          </div>

          <div className="esports-card p-6">
            <SectionHeader
              eyebrow="Access Policy"
              title="Role-scoped Supabase access"
              description="Bravo keeps each route aligned to the role that owns the work behind it."
            />
            <div className="mt-5 grid gap-3">
              {[
                "Admins publish homepage sections, news, events, matches, rankings, sponsors, media, and approvals.",
                "Coaches, team managers, and team IGLs manage roster requests, player images, logo updates, optional MOSS submissions, and team-side match evidence.",
              ].map((item) => (
                <div key={item} className="rounded-card border border-white/[0.08] bg-bg-primary p-5 text-sm text-white">
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
