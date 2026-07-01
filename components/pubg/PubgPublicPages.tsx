import Link from "next/link";
import TeamAvatar from "@/components/ui/TeamAvatar";
import type { PlatformHubData, PlatformSponsorProfile } from "@/lib/platform-hub";
import type {
  PubgHubDataset,
  PubgHubEvent,
  PubgHubEventPlayerRow,
  PubgHubMatch,
  PubgHubPlayer,
  PubgHubRecentMatch,
  PubgHubTeam,
} from "@/lib/pubg-hub";
import {
  buildPubgPlayerBoardRows,
  buildPubgTeamBoardRows,
  comparePubgPlayers,
  getPlayerRankMap,
  getRankedPlayers,
  getRankedTeams,
  getTeamRankMap,
  type PubgPlayerBoardRow,
  type PubgTeamBoardRow,
} from "@/lib/pubg-rankings";
import { BRAVO_DISCORD_URL } from "@/lib/brand-links";
import {
  buildHref,
  DualTrendChart,
  EmptyState,
  EventSummaryCard,
  FormPill,
  formatDate,
  formatDateRange,
  formatDateTime,
  formatDecimal,
  formatNumber,
  MapStatsTable,
  MetricCard,
  PageHero,
  PlayerIdentity,
  RadarComparison,
  RankBadge,
  readSearchParam,
  RecentMatchCards,
  SectionHeader,
  sourceLabel,
  StatePill,
  StatusPill,
  SyncPill,
  TeamIdentity,
  TrendBars,
} from "@/components/pubg/PubgHubUI";

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

const dashboardNavItems = [
  { label: "Overview", href: "#overview" },
  { label: "Tournaments", href: "#tournaments" },
  { label: "Scrims", href: "#scrims" },
  { label: "Seasons", href: "/pubg/seasons/current" },
  { label: "Matches", href: "#matches" },
  { label: "Results", href: "/pubg/results" },
  { label: "Leaderboards", href: "/pubg/leaderboards" },
  { label: "Community", href: "/pubg/community" },
  { label: "Teams", href: "/pubg/teams" },
  { label: "Players", href: "/pubg/players" },
  { label: "Stats", href: "#stats" },
  { label: "Hall of Fame", href: "/pubg/hall-of-fame" },
] as const;

function buildTeamLookup(dataset: PubgHubDataset) {
  return new Map(dataset.teams.map((team) => [team.id, team] as const));
}

function buildPlayerLookup(dataset: PubgHubDataset) {
  return new Map(dataset.players.map((player) => [player.id, player] as const));
}

function buildEventLookup(dataset: PubgHubDataset) {
  return new Map(dataset.events.map((event) => [event.id, event] as const));
}

function countBy<T>(items: T[], key: (item: T) => string) {
  return items.reduce<Record<string, number>>((result, item) => {
    const currentKey = key(item);
    result[currentKey] = (result[currentKey] ?? 0) + 1;
    return result;
  }, {});
}

function dedupeMaps(matches: PubgHubMatch[]) {
  return Array.from(new Set(matches.map((match) => match.mapName))).sort((firstValue, secondValue) => firstValue.localeCompare(secondValue));
}

function filterMatches(dataset: PubgHubDataset, options: { eventSlug?: string; mapName?: string; status?: string }) {
  return dataset.matches.filter((match) => {
    if (options.eventSlug && match.eventSlug !== options.eventSlug) return false;
    if (options.mapName && options.mapName !== "all" && match.mapName !== options.mapName) return false;
    if (options.status && options.status !== "all" && match.status !== options.status) return false;
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

function FilterField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="grid gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-text-muted">
      <span>{label}</span>
      {children}
    </label>
  );
}

function ActiveFilterSummary({
  items,
}: {
  items: Array<{ label: string; value?: string | null }>;
}) {
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

function sortDirectoryPlayers(players: PubgHubPlayer[], sort: string) {
  if (sort === "damage") {
    return [...players].sort((firstValue, secondValue) => secondValue.damage - firstValue.damage || comparePubgPlayers(firstValue, secondValue));
  }

  if (sort === "avg") {
    return [...players].sort((firstValue, secondValue) => secondValue.avgKills - firstValue.avgKills || comparePubgPlayers(firstValue, secondValue));
  }

  return getRankedPlayers(players);
}

function buildTopFragger(match: PubgHubMatch, playerLookup: Map<string, PubgHubPlayer>) {
  const playerResult = [...match.playerResults].sort(
    (firstValue, secondValue) =>
      secondValue.kills - firstValue.kills ||
      secondValue.damage - firstValue.damage ||
      secondValue.assists - firstValue.assists
  )[0];

  if (!playerResult) {
    return null;
  }

  return playerLookup.get(playerResult.playerId) ?? null;
}

function FilterBar({
  children,
  action,
}: {
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
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
    <section id={id} className="scroll-mt-28 overflow-hidden rounded-[28px] border border-white/[0.08] bg-[#08101a] shadow-[0_24px_80px_rgba(0,0,0,0.35)]">
      <div className="border-b border-white/[0.08] px-5 py-4">
        <SectionHeader eyebrow={eyebrow} title={title} description={description} action={action} />
      </div>
      <div className={bodyClassName}>{children}</div>
    </section>
  );
}

function HeaderStatCell({
  label,
  value,
  detail,
}: {
  label: string;
  value: string | number;
  detail?: string;
}) {
  return (
    <div className="rounded-[24px] border border-white/[0.08] bg-black/25 px-4 py-3">
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-text-muted">{label}</p>
      <p className="mt-2 truncate font-display text-lg font-black uppercase text-white">{typeof value === "number" ? formatNumber(value) : value}</p>
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

function DashboardSubnav() {
  return (
    <nav className="sticky top-20 z-20 overflow-hidden rounded-[24px] border border-white/[0.08] bg-[#09111b]/95 p-2 shadow-[0_18px_60px_rgba(0,0,0,0.35)] backdrop-blur">
      <div className="flex gap-2 overflow-x-auto pb-1">
        {dashboardNavItems.map((item) => (
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
  );
}

function HubMatchCard({
  match,
  playerLookup,
}: {
  match: PubgHubMatch;
  playerLookup: Map<string, PubgHubPlayer>;
}) {
  const topFragger = buildTopFragger(match, playerLookup);

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
        <StatusPill status={match.eventStatus} />
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
        <HeaderStatCell label="Published" value={match.status === "published" ? "Yes" : "Pending"} />
        <div className="flex items-end justify-end">
          <Link href={`/pubg/matches/${match.id}`} className="btn-primary h-11 w-full justify-center">
            View Match
          </Link>
        </div>
      </div>
    </div>
  );
}

function HubEventCard({
  event,
  winnerName,
}: {
  event: PubgHubEvent;
  winnerName?: string | null;
}) {
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
        <HeaderStatCell label="Matches" value={event.matchCount} />
      </div>
      <div className="mt-4 rounded-[20px] border border-white/[0.08] bg-black/20 p-3">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-text-muted">Winner</p>
        <p className="mt-2 font-semibold text-white">
          {event.status === "finished" ? winnerName ?? "Winner TBD" : "Winner will lock after completion"}
        </p>
      </div>
      <div className="mt-4 flex justify-end">
        <Link href={`/pubg/events/${event.slug}`} className="btn-secondary">
          View Event
        </Link>
      </div>
    </div>
  );
}

function HubTeamCard({
  team,
  rank,
}: {
  team: PubgHubTeam;
  rank: number;
}) {
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

function HubPlayerCard({
  player,
  rank,
}: {
  player: PubgHubPlayer;
  rank: number;
}) {
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

function SidebarTeamRow({
  team,
  rank,
}: {
  team: PubgHubTeam;
  rank: number;
}) {
  return (
    <Link
      href={`/pubg/teams/${team.slug || team.id}`}
      className="flex items-center justify-between gap-3 rounded-[20px] border border-white/[0.08] bg-[#0b1521] px-4 py-3 transition hover:border-accent-blue/30 hover:bg-[#101a28]"
    >
      <div className="flex min-w-0 items-center gap-3">
        <RankBadge rank={rank} />
        <TeamAvatar name={team.name} imageUrl={team.logoUrl ?? undefined} size="sm" />
        <div className="min-w-0">
          <p className="truncate font-semibold uppercase text-white">{team.name}</p>
          <p className="text-[10px] uppercase tracking-[0.16em] text-text-muted">{team.kills} kills | {team.wins} WWCD</p>
        </div>
      </div>
      <div className="text-right">
        <p className="font-mono-stat text-sm text-accent-blue-light">{formatNumber(team.totalPoints)}</p>
        <p className="text-[10px] uppercase tracking-[0.16em] text-text-muted">Points</p>
      </div>
    </Link>
  );
}

function SidebarPlayerRow({
  player,
  rank,
}: {
  player: PubgHubPlayer;
  rank: number;
}) {
  return (
    <Link
      href={`/pubg/players/${player.slug || player.id}`}
      className="flex items-center justify-between gap-3 rounded-[20px] border border-white/[0.08] bg-[#0b1521] px-4 py-3 transition hover:border-accent-blue/30 hover:bg-[#101a28]"
    >
      <div className="flex min-w-0 items-center gap-3">
        <RankBadge rank={rank} />
        <TeamAvatar name={player.pubgName} imageUrl={player.avatarUrl ?? undefined} size="sm" />
        <div className="min-w-0">
          <p className="truncate font-semibold uppercase text-white">{player.pubgName}</p>
          <p className="truncate text-[10px] uppercase tracking-[0.16em] text-text-muted">
            {player.currentTeamName ?? "Team TBD"}
          </p>
        </div>
      </div>
      <div className="text-right">
        <p className="font-mono-stat text-sm text-accent-blue-light">{formatNumber(player.kills)}</p>
        <p className="text-[10px] uppercase tracking-[0.16em] text-text-muted">Kills</p>
      </div>
    </Link>
  );
}

function PartnerRailCard({ sponsor }: { sponsor: PlatformSponsorProfile }) {
  const visualAsset = sponsor.logoUrl ?? sponsor.bannerUrl ?? sponsor.designAssetUrl ?? null;
  const rawDescription = sponsor.description?.trim() || "Partner details will be updated soon.";
  const description = rawDescription.length > 120 ? `${rawDescription.slice(0, 117).trim()}...` : rawDescription;

  return (
    <div className="rounded-[22px] border border-white/[0.08] bg-[#0b1521] p-4">
      <div className="flex items-center gap-3">
        {visualAsset ? (
          <img
            src={visualAsset}
            alt={sponsor.name}
            className="h-14 w-14 rounded-[18px] border border-white/10 bg-black/20 object-contain p-2"
          />
        ) : (
          <div className="flex h-14 w-14 items-center justify-center rounded-[18px] border border-white/10 bg-black/20 text-[10px] font-bold uppercase tracking-[0.18em] text-text-muted">
            {sponsor.name.slice(0, 2)}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-base font-black uppercase text-white">{sponsor.name}</p>
          <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.18em] text-accent-blue">{sponsor.tier}</p>
        </div>
      </div>
      <p className="mt-4 text-sm text-text-muted">{description}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Link href={`/sponsors/${sponsor.slug}`} className="btn-secondary">
          Open Profile
        </Link>
        {sponsor.websiteUrl ? (
          <a href={sponsor.websiteUrl} target="_blank" rel="noreferrer" className="btn-primary">
            Website
          </a>
        ) : null}
        {!sponsor.websiteUrl && sponsor.socialUrl ? (
          <a href={sponsor.socialUrl} target="_blank" rel="noreferrer" className="btn-primary">
            Social
          </a>
        ) : null}
      </div>
    </div>
  );
}

export function PubgDashboardPage({
  dataset,
  activeSeason,
  recentMatches,
  recentEvents,
  topPlayers,
  topTeams,
  activeEvents,
  mapPulse,
  partners,
}: {
  dataset: Awaited<ReturnType<typeof import("@/lib/pubg-hub").getPubgDashboardData>>;
  activeSeason: PubgDashboardSeasonSummary | null;
  recentMatches: PubgHubMatch[];
  recentEvents: PubgHubEvent[];
  topPlayers: PubgHubPlayer[];
  topTeams: PubgHubTeam[];
  activeEvents: PubgHubEvent[];
  mapPulse: PubgHubTeam["mapStats"];
  partners: PlatformSponsorProfile[];
}) {
  const playerLookup = buildPlayerLookup(dataset);
  const hasVerifiedCompetitionData = dataset.source === "supabase";
  const publishedMatches = hasVerifiedCompetitionData ? recentMatches.filter((match) => match.status === "published").slice(0, 4) : [];
  const leaderboardTeams = hasVerifiedCompetitionData ? dataset.teams.slice(0, 6) : [];
  const leaderboardPlayers = hasVerifiedCompetitionData ? dataset.players.slice(0, 6) : [];
  const featuredEvents = hasVerifiedCompetitionData ? recentEvents.slice(0, 3) : [];
  const scrimEvents = hasVerifiedCompetitionData
    ? dataset.events.filter((event) => event.status !== "finished" && /scrim/i.test(event.type)).slice(0, 3)
    : [];
  const upcomingScrims = scrimEvents.length > 0 ? scrimEvents : featuredEvents.filter((event) => event.status !== "finished").slice(0, 3);
  const featuredTeams = hasVerifiedCompetitionData ? topTeams.slice(0, 4) : [];
  const sidebarTeams = hasVerifiedCompetitionData ? topTeams.slice(0, 3) : [];
  const sidebarPlayers = hasVerifiedCompetitionData ? topPlayers.slice(0, 3) : [];
  const spotlightEvent = hasVerifiedCompetitionData ? activeEvents[0] ?? recentEvents[0] ?? null : null;
  const latestWinner = publishedMatches[0]?.winnerTeamName ?? null;
  const mostWinsTeam = leaderboardTeams.length > 0 ? [...leaderboardTeams].sort((a, b) => b.wins - a.wins || b.totalPoints - a.totalPoints)[0] : null;
  const mostKillsPlayer = leaderboardPlayers.length > 0 ? [...leaderboardPlayers].sort((a, b) => b.kills - a.kills || b.damage - a.damage)[0] : null;
  const highestDamagePlayer = leaderboardPlayers.length > 0 ? [...leaderboardPlayers].sort((a, b) => b.damage - a.damage || b.kills - a.kills)[0] : null;
  const bestAveragePlacementTeam =
    leaderboardTeams.length > 0
      ? [...leaderboardTeams].filter((team) => team.matches > 0).sort((a, b) => a.avgPlacement - b.avgPlacement || b.totalPoints - a.totalPoints)[0] ?? null
      : null;
  const mostConsistentTeam =
    leaderboardTeams.length > 0
      ? [...leaderboardTeams].filter((team) => team.matches > 2).sort((a, b) => b.formScore - a.formScore || a.avgPlacement - b.avgPlacement)[0] ?? null
      : null;
  const spotlightSeasonLabel = activeSeason?.title ?? "Current season";
  const latestMatchLabel = publishedMatches[0] ? `Match ${publishedMatches[0].matchNumber}` : "Awaiting result";

  if (!hasVerifiedCompetitionData) {
    return (
      <main className="page-shell overflow-x-hidden pb-12 pt-6">
        <div className="page-stack overflow-x-hidden">
          <section className="relative overflow-hidden rounded-[36px] border border-white/[0.08] bg-[#050910] px-6 py-7 shadow-[0_30px_120px_rgba(0,0,0,0.45)] sm:px-8">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_14%,rgba(29,155,240,0.16),transparent_28%),radial-gradient(circle_at_86%_18%,rgba(255,180,0,0.12),transparent_26%),linear-gradient(140deg,rgba(4,8,14,0.98),rgba(8,15,24,0.94))]" />
            <div className="relative z-10 space-y-6">
              <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
                <div className="max-w-4xl">
                  <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-accent-blue">Bravo Gaming PUBG PC</p>
                  <h1 className="mt-3 font-display text-4xl font-black uppercase tracking-tight text-white sm:text-5xl">
                    Daily scrims, results, standings, and player output in one hub
                  </h1>
                  <p className="mt-4 text-sm leading-7 text-text-muted sm:text-base sm:leading-8">
                    Official PUBG match results, standings, events, and player coverage will appear here as soon as they are published.
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <a href={BRAVO_DISCORD_URL} target="_blank" rel="noreferrer" className="btn-discord">
                    Join Discord
                  </a>
                  <Link href="/events" className="btn-primary">
                    View Events
                  </Link>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <HeaderStatCell label="Current Status" value="No Live Scrim" detail="Next room updates will be announced in Discord." />
                <HeaderStatCell label="Coverage" value="Schedule TBA" detail="Match results and standings publish here after verification." />
                <HeaderStatCell label="Register" value="Team Signups Open" detail="Register your roster to stay ready for the next lobby." />
                <HeaderStatCell label="Support" value="Contact Bravo" detail="Reach out for rules, sponsor inquiry, or event support." />
              </div>
            </div>
          </section>

          <section className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
            <DashboardSection
              eyebrow="Current Status"
              title="Official PUBG coverage is coming online"
              description="Official PUBG match data will appear here after results are published."
            >
              <EmptyState
                title="No published PUBG match data yet"
                description="Official results, standings, player rankings, and event coverage will appear here after publication."
                action={
                  <div className="flex flex-wrap justify-center gap-2">
                    <a href={BRAVO_DISCORD_URL} target="_blank" rel="noreferrer" className="btn-discord">
                      Join Discord
                    </a>
                    <Link href="/events" className="btn-secondary">
                      View Events
                    </Link>
                    <Link href="/teams/register" className="btn-primary">
                      Register Team
                    </Link>
                  </div>
                }
              />
            </DashboardSection>

            <DashboardSection
              eyebrow="Tournament Ready"
              title="Stay ready for the next lobby"
              description="Register, review policy links, and keep the public event board one click away."
            >
              <div className="grid gap-3">
                {[
                  { title: "Register Team", detail: "Open the roster registration flow before the next scrim or tournament window.", href: "/teams/register", external: false },
                  { title: "Join Discord", detail: "Get room updates, scrim timing, and official match announcements.", href: BRAVO_DISCORD_URL, external: true },
                  { title: "Rules", detail: "Review the current public competition and conduct rules.", href: "/rules", external: false },
                  { title: "Anti-Cheat Policy", detail: "Read the competitive integrity and anti-cheat expectations.", href: "/anti-cheat", external: false },
                  { title: "Sponsor Inquiry", detail: "Contact Bravo for event sponsorship and partner opportunities.", href: "/about/sponsor-us", external: false },
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
                  )
                )}
              </div>
            </DashboardSection>
          </section>

          {partners.length > 0 ? (
            <DashboardSection
              eyebrow="Partners"
              title="Official partner support"
              description="Official sponsor and partner profiles."
            >
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {partners.slice(0, 4).map((partner) => (
                  <PartnerRailCard key={partner.id} sponsor={partner} />
                ))}
              </div>
            </DashboardSection>
          ) : null}
        </div>
      </main>
    );
  }

  return (
    <main className="page-shell overflow-x-hidden pb-12 pt-6">
      <div className="page-stack overflow-x-hidden">
        <section className="relative overflow-hidden rounded-[36px] border border-white/[0.08] bg-[#050910] px-6 py-7 shadow-[0_30px_120px_rgba(0,0,0,0.45)] sm:px-8">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_14%,rgba(29,155,240,0.16),transparent_28%),radial-gradient(circle_at_86%_18%,rgba(255,180,0,0.12),transparent_26%),linear-gradient(140deg,rgba(4,8,14,0.98),rgba(8,15,24,0.94))]" />
          <div className="relative z-10 space-y-6">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
              <div className="max-w-4xl">
                <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-accent-blue">Bravo Gaming PUBG PC</p>
                <h1 className="mt-3 font-display text-4xl font-black uppercase tracking-tight text-white sm:text-5xl">
                  Daily scrims, results, standings, and player output in one hub
                </h1>
                <p className="mt-4 text-sm font-semibold uppercase tracking-[0.22em] text-text-muted">
                  Daily Scrims | Tournaments | Teams | Players | Rankings | Results
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
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
              <HeaderStatCell
                label="Active Season"
                value={spotlightSeasonLabel}
                detail={activeSeason?.currentTournamentTitle ?? "Current PUBG season board"}
              />
              <HeaderStatCell label="Matches Tracked" value={hasVerifiedCompetitionData ? dataset.summary.trackedMatches : 0} />
              <HeaderStatCell label="Teams" value={hasVerifiedCompetitionData ? dataset.teams.length : 0} />
              <HeaderStatCell label="Players" value={hasVerifiedCompetitionData ? dataset.players.length : 0} />
              <HeaderStatCell
                label="Latest Match"
                value={latestMatchLabel}
                detail={publishedMatches[0] ? `${publishedMatches[0].mapName} | ${formatDateTime(publishedMatches[0].startTime)}` : "Awaiting first published result"}
              />
            </div>
          </div>
        </section>

        <DashboardSubnav />

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1.66fr)_320px]">
          <div className="min-w-0 space-y-6">
            <DashboardSection
              id="overview"
              eyebrow="Overview"
              title="Active season and current event focus"
              description="Season status, featured event details, and the current public PUBG focus."
            >
              {activeSeason || spotlightEvent ? (
                <div className="grid gap-4 xl:grid-cols-[1.05fr,0.95fr]">
                  <div className="rounded-[24px] border border-white/[0.08] bg-[#0b1521] p-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-accent-blue">Active Season</p>
                        <h2 className="mt-2 font-display text-2xl font-black uppercase text-white">{spotlightSeasonLabel}</h2>
                      </div>
                      {activeSeason ? (
                        <Link href={`/pubg/seasons/${activeSeason.slug}`} className="btn-secondary">
                          Open Season
                        </Link>
                      ) : null}
                    </div>
                    <div className="mt-5 grid gap-3 sm:grid-cols-2">
                      <HeaderStatCell label="Current Day" value={activeSeason?.currentDay ?? "TBA"} />
                      <HeaderStatCell label="Matches Played" value={activeSeason?.matchesPlayed ?? 0} />
                      <HeaderStatCell label="Teams Tracked" value={activeSeason?.teamsTracked ?? 0} />
                      <HeaderStatCell label="Players Tracked" value={activeSeason?.playersTracked ?? 0} />
                    </div>
                    <div className="mt-5 rounded-[20px] border border-white/[0.08] bg-black/20 p-4">
                      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-text-muted">Current Focus</p>
                      <p className="mt-2 text-sm text-white">
                        {activeSeason?.currentTournamentTitle ?? spotlightEvent?.name ?? "The next scheduled PUBG event will appear here once it is announced."}
                      </p>
                    </div>
                  </div>

                  <div className="rounded-[24px] border border-white/[0.08] bg-[#0b1521] p-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-accent-blue">Featured Event</p>
                        <h2 className="mt-2 font-display text-2xl font-black uppercase text-white">{spotlightEvent?.name ?? "Featured event"}</h2>
                      </div>
                      {spotlightEvent ? (
                        <div className="flex flex-wrap gap-2">
                          <StatusPill status={spotlightEvent.status} />
                          <StatePill state={spotlightEvent.state} />
                        </div>
                      ) : null}
                    </div>
                    {spotlightEvent ? (
                      <>
                        <div className="mt-5 grid gap-3 sm:grid-cols-2">
                          <HeaderStatCell label="Date" value={formatDateRange(spotlightEvent.startDate, spotlightEvent.endDate)} />
                          <HeaderStatCell label="Prize Pool" value={spotlightEvent.prizePool || "TBD"} />
                          <HeaderStatCell label="Teams" value={spotlightEvent.teamCount} />
                          <HeaderStatCell label="Matches" value={spotlightEvent.matchCount} />
                        </div>
                        <div className="mt-5 flex flex-wrap gap-3">
                          <Link href={`/pubg/events/${spotlightEvent.slug}`} className="btn-primary">
                            View Event
                          </Link>
                          <Link href="/pubg/results" className="btn-secondary">
                            Latest Results
                          </Link>
                        </div>
                      </>
                    ) : (
                      <div className="mt-5">
                        <EmptyState title="No events scheduled right now" description="Upcoming PUBG tournaments and registration windows will be posted here soon." />
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <EmptyState title="No active season has been published yet" description="Leaderboard data will be available once matches have been completed and officially published." />
              )}
            </DashboardSection>

            <DashboardSection
              id="matches"
              eyebrow="Results"
              title="Latest published match results"
              description="Official published match results from Bravo scrims and tournaments."
            >
              {publishedMatches.length > 0 ? (
                <div className="grid gap-4 xl:grid-cols-2">
                  {publishedMatches.map((match) => (
                    <HubMatchCard key={match.id} match={match} playerLookup={playerLookup} />
                  ))}
                </div>
              ) : (
                <EmptyState title="No match results have been published yet" description="Results will appear once they are officially verified." />
              )}
            </DashboardSection>

            <DashboardSection
              id="leaderboards"
              eyebrow="Leaderboards"
              title="Team leaderboard"
              description="Current standings from verified match data."
            >
              {leaderboardTeams.length > 0 ? (
                <div className="table-scroll">
                  <table className="data-table min-w-full">
                    <thead style={{ position: "static" }}>
                      <tr>
                        <th>Rank</th>
                        <th>Logo</th>
                        <th>Team</th>
                        <th>Matches</th>
                        <th>WWCD</th>
                        <th>Kills</th>
                        <th>Placement Points</th>
                        <th>Total Points</th>
                        <th>Form</th>
                      </tr>
                    </thead>
                    <tbody>
                      {leaderboardTeams.map((team, index) => (
                        <tr key={team.id}>
                          <td>
                            <RankBadge rank={index + 1} />
                          </td>
                          <td>
                            <TeamAvatar name={team.name} imageUrl={team.logoUrl ?? undefined} size="sm" />
                          </td>
                          <td>
                            <Link href={`/pubg/teams/${team.slug || team.id}`} className="font-semibold text-white hover:text-accent-blue">
                              {team.name}
                            </Link>
                          </td>
                          <td>{formatNumber(team.matches)}</td>
                          <td>{formatNumber(team.wins)}</td>
                          <td>{formatNumber(team.kills)}</td>
                          <td>{formatNumber(team.placementPoints)}</td>
                          <td className="points-cell">{formatNumber(team.totalPoints)}</td>
                          <td className="min-w-40">
                            <PlacementFormStrip placements={team.recentPlacements} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <EmptyState title="Leaderboard data is not available yet" description="Leaderboard data will be available once matches have been completed and officially published." />
              )}
            </DashboardSection>

            <DashboardSection
              eyebrow="Players"
              title="Player leaderboard"
              description="Top players based on official published results."
            >
              {leaderboardPlayers.length > 0 ? (
                <div className="table-scroll">
                  <table className="data-table min-w-full">
                    <thead>
                      <tr>
                        <th>Rank</th>
                        <th>Player</th>
                        <th>Team</th>
                        <th>Kills</th>
                        <th>Assists</th>
                        <th>Knocks</th>
                        <th>Damage</th>
                        <th>MVP</th>
                      </tr>
                    </thead>
                    <tbody>
                      {leaderboardPlayers.map((player, index) => (
                        <tr key={player.id}>
                          <td>
                            <RankBadge rank={index + 1} />
                          </td>
                          <td>
                            <Link href={`/pubg/players/${player.slug || player.id}`} className="font-semibold text-white hover:text-accent-blue">
                              {player.pubgName}
                            </Link>
                          </td>
                          <td>
                            {player.currentTeamId ? (
                              <Link href={`/pubg/teams/${player.currentTeamId}`} className="text-white hover:text-accent-blue">
                                {player.currentTeamName ?? "Team TBD"}
                              </Link>
                            ) : (
                              player.currentTeamName ?? "Team TBD"
                            )}
                          </td>
                          <td>{formatNumber(player.kills)}</td>
                          <td>{formatNumber(player.assists)}</td>
                          <td>{formatNumber(player.knocks)}</td>
                          <td>{formatNumber(player.damage)}</td>
                          <td>{formatNumber(player.mvpCount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <EmptyState title="Player statistics are currently unavailable" description="Please check back after upcoming matches are completed." />
              )}
            </DashboardSection>

            <DashboardSection
              id="tournaments"
              eyebrow="Tournaments"
              title="Event and tournament cards"
              description="Published and upcoming PUBG events."
            >
              {featuredEvents.length > 0 ? (
                <div className="grid gap-4 xl:grid-cols-2">
                  {featuredEvents.map((event) => (
                    <HubEventCard key={event.id} event={event} winnerName={event.standings[0]?.teamName ?? null} />
                  ))}
                </div>
              ) : (
                <EmptyState title="No events scheduled right now" description="Upcoming PUBG tournaments and registration windows will be posted here soon." />
              )}
            </DashboardSection>

            <DashboardSection
              eyebrow="Teams"
              title="Top team cards"
              description="Leading teams from the current verified results window."
            >
              {featuredTeams.length > 0 ? (
                <div className="grid gap-4 xl:grid-cols-2">
                  {featuredTeams.map((team, index) => (
                    <HubTeamCard key={team.id} team={team} rank={index + 1} />
                  ))}
                </div>
              ) : (
                <EmptyState title="Team statistics are not available yet" description="Statistics will appear after official match data is published." />
              )}
            </DashboardSection>

            <DashboardSection
              id="stats"
              eyebrow="Stats"
              title="PUBG hub snapshot"
              description="Verified performance highlights from the published results set."
            >
              {hasVerifiedCompetitionData ? (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  <MetricCard label="Most WWCD" value={mostWinsTeam?.name ?? "TBA"} detail={mostWinsTeam ? `${formatNumber(mostWinsTeam.wins)} WWCD` : undefined} tone="green" />
                  <MetricCard label="Most Kills" value={mostKillsPlayer?.pubgName ?? "TBA"} detail={mostKillsPlayer ? `${formatNumber(mostKillsPlayer.kills)} kills` : undefined} tone="blue" />
                  <MetricCard label="Highest Damage" value={highestDamagePlayer?.pubgName ?? "TBA"} detail={highestDamagePlayer ? `${formatNumber(highestDamagePlayer.damage)} damage` : undefined} tone="red" />
                  <MetricCard label="Best Avg Placement" value={bestAveragePlacementTeam?.name ?? "TBA"} detail={bestAveragePlacementTeam ? `${formatDecimal(bestAveragePlacementTeam.avgPlacement, 2)} avg place` : undefined} tone="yellow" />
                  <MetricCard label="Latest Winner" value={latestWinner ?? "TBA"} detail={publishedMatches[0] ? `${publishedMatches[0].mapName} | ${formatDate(publishedMatches[0].startTime)}` : undefined} tone="green" />
                  <MetricCard label="Most Consistent Team" value={mostConsistentTeam?.name ?? "TBA"} detail={mostConsistentTeam ? `${mostConsistentTeam.formLabel} form` : undefined} tone="blue" />
                </div>
              ) : (
                <EmptyState title="MVP rankings are not available yet" description="MVP rankings will be generated after sufficient match data becomes available." />
              )}
            </DashboardSection>

            {mapPulse.length > 0 ? (
              <MapStatsTable
                stats={mapPulse}
                title="Map pulse"
                description="Map-by-map kills, wins, damage, and total points from the published PUBG result set."
              />
            ) : null}
          </div>

          <aside className="min-w-0 space-y-6">
            <DashboardSection
              id="scrims"
              eyebrow="Upcoming Scrims"
              title="Immediate lobby schedule"
              description="Upcoming scrim windows and lobby schedule."
            >
              {upcomingScrims.length > 0 ? (
                <div className="space-y-3">
                  {upcomingScrims.map((event) => (
                    <div key={event.id} className="rounded-[22px] border border-white/[0.08] bg-[#0b1521] p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-semibold uppercase text-white">{event.name}</p>
                        <StatusPill status={event.status} />
                      </div>
                      <p className="mt-2 text-xs uppercase tracking-[0.16em] text-text-muted">{event.type || "PUBG Event"}</p>
                      <p className="mt-3 text-sm text-text-muted">{formatDateRange(event.startDate, event.endDate)}</p>
                      <div className="mt-4 flex justify-between gap-3 text-sm">
                        <span className="text-text-muted">Teams: <span className="font-semibold text-white">{formatNumber(event.teamCount)}</span></span>
                        <span className="text-text-muted">Matches: <span className="font-semibold text-white">{formatNumber(event.matchCount)}</span></span>
                      </div>
                      <div className="mt-4 flex justify-end">
                        <Link href={`/pubg/events/${event.slug}`} className="btn-secondary">
                          View Event
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState title="No scrims scheduled" description="No scrim sessions are scheduled at the moment. Please check back later for the next session." />
              )}
            </DashboardSection>

            <DashboardSection eyebrow="Top Teams" title="Sidebar team standings" description="Current team leaderboard snapshot.">
              {sidebarTeams.length > 0 ? (
                <div className="space-y-3">
                  {sidebarTeams.map((team, index) => (
                    <SidebarTeamRow key={team.id} team={team} rank={index + 1} />
                  ))}
                </div>
              ) : (
                <EmptyState title="Team statistics are not available yet" description="Statistics will appear after official match data is published." />
              )}
            </DashboardSection>

            <DashboardSection eyebrow="Top Fraggers" title="Player spotlight cards" description="Top player snapshot from published results.">
              {sidebarPlayers.length > 0 ? (
                <div className="space-y-3">
                  {sidebarPlayers.map((player, index) => (
                    <SidebarPlayerRow key={player.id} player={player} rank={index + 1} />
                  ))}
                </div>
              ) : (
                <EmptyState title="Player statistics are currently unavailable" description="Please check back after upcoming matches are completed." />
              )}
            </DashboardSection>

            <DashboardSection eyebrow="Partners" title="PUBG partner support" description="Official sponsor and partner profiles.">
              {partners.length > 0 ? (
                <div className="space-y-3">
                  {partners.slice(0, 4).map((partner) => (
                    <PartnerRailCard key={partner.id} sponsor={partner} />
                  ))}
                </div>
              ) : (
                <EmptyState title="Partner lineup coming soon" description="Official sponsors and partners will be listed here once announcements go live." />
              )}
            </DashboardSection>

          </aside>
        </section>
      </div>
    </main>
  );
}

export function PubgEventsPage({
  dataset,
  searchParams,
}: {
  dataset: PubgHubDataset;
  searchParams: SearchParamDictionary;
}) {
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
  const regions = Array.from(new Set(dataset.events.map((event) => event.region))).sort((firstValue, secondValue) => firstValue.localeCompare(secondValue));

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
          description="Every event card shows region, schedule, team count, match count, and direct routes into standings, teams, players, matches, and stats."
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
            { label: "Total Events", value: dataset.events.length, tone: "blue" },
            { label: "Synced", value: syncCounts.synced ?? 0, tone: "green" },
            { label: "Awaiting Approval", value: syncCounts.awaiting_approval ?? 0, tone: "yellow" },
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
          <input name="q" defaultValue={query} className="input-esports h-11" placeholder="Search event, region, or type" />
          <select name="status" defaultValue={status} className="input-esports h-11">
            <option value="all">All statuses</option>
            <option value="upcoming">Upcoming</option>
            <option value="ongoing">Ongoing</option>
            <option value="finished">Finished</option>
          </select>
          <select name="state" defaultValue={state} className="input-esports h-11">
            <option value="all">All states</option>
            <option value="published">Published</option>
            <option value="locked">Locked</option>
            <option value="draft">Draft</option>
          </select>
          <select name="region" defaultValue={region} className="input-esports h-11">
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
            description="Bravo event browsing works best when status, state, and sync are visible before the click, so every card exposes its operating context up front."
          />
          <div className="mt-6 grid gap-4 xl:grid-cols-2">
            {filteredEvents.map((event) => (
              <EventSummaryCard key={event.id} event={event} href={`/pubg/events/${event.slug}`} />
            ))}
            {filteredEvents.length === 0 ? (
              <div className="xl:col-span-2">
                <EmptyState title="No events match the current filters" description="Try adjusting the filters to browse more published events." />
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
  const hasTeams = dataset.teams.length > 0;
  const hasPlayers = dataset.players.length > 0;
  const hasAnnouncements = latestAnnouncements.length > 0;
  const hasCommunityDirectory = hasTeams || hasPlayers;
  const hasCommunityData = hasCommunityDirectory || hasAnnouncements || dataset.matches.length > 0;
  const liveOrUpcomingEvents = dataset.events.filter((event) => event.status !== "finished").length;
  const communityRegions = Array.from(
    new Set(dataset.teams.map((team) => team.region).filter((value): value is string => Boolean(value)))
  ).sort((firstValue, secondValue) => firstValue.localeCompare(secondValue));
  const rankedTeams = getRankedTeams(dataset.teams);
  const rankedPlayers = getRankedPlayers(dataset.players);
  const teamRankMap = getTeamRankMap(rankedTeams);
  const playerRankMap = getPlayerRankMap(rankedPlayers);
  const filteredTeams = rankedTeams
    .filter((team) => {
      if (!query) return true;
      return `${team.name} ${team.tag ?? ""} ${team.region ?? ""}`.toLowerCase().includes(query);
    });
  const filteredPlayers = rankedPlayers
    .filter((player) => {
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
                  { label: "Tracked Teams", value: dataset.teams.length, tone: "blue" as const },
                  { label: "Tracked Players", value: dataset.players.length, tone: "green" as const },
                  { label: "Published Matches", value: dataset.matches.length, tone: "yellow" as const },
                  { label: "Announcements", value: hub.news.length, tone: "red" as const },
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
                hasCommunityData ? `Community regions tracked: ${communityRegions.length}` : "Register your roster and follow official room updates in Discord.",
                hasCommunityData ? `Upcoming or live events: ${liveOrUpcomingEvents}` : "Published team cards, player spotlights, and announcements will appear here after release.",
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
            <ActiveFilterSummary items={[{ label: "Search", value: rawQuery || null }, { label: "View", value: view === "all" ? null : view }]} />
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
                { title: "Discord", detail: "Join the official Bravo Discord for scrim coordination, announcements, and community support.", href: BRAVO_DISCORD_URL, external: true },
                { title: "Register Team", detail: "Submit your roster and stay ready for official Bravo scrims and tournaments.", href: "/teams/register", external: false },
                { title: "Events", detail: "Browse published and upcoming PUBG event boards.", href: "/events", external: false },
                { title: "News", detail: "Read official announcements, tournament updates, and community stories.", href: "/news", external: false },
                { title: "Rules", detail: "Review the current competition, conduct, and lobby expectations.", href: "/rules", external: false },
                { title: "Contact", detail: "Reach Bravo for community, team, sponsor, or tournament support.", href: "/contact", external: false },
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
                )
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

function EventNavigation({
  slug,
  currentTab,
  target,
  map,
}: {
  slug: string;
  currentTab: string;
  target: string;
  map: string;
}) {
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

function EventSpotlight({
  event,
  team,
  player,
}: {
  event: PubgHubEvent;
  team: PubgHubTeam | null;
  player: PubgHubPlayer | null;
}) {
  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <div className="esports-card p-6">
        <SectionHeader eyebrow="Team Spotlight" title={team?.name ?? "Team spotlight"} description="Selected from the event board so users can move from standings into roster, recent trend, and event-specific output without losing context." />
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
              <MetricCard label="Points" value={team.eventStats.find((item) => item.eventId === event.id)?.totalPoints ?? 0} compact tone="green" />
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
            <EmptyState title="No team spotlight selected" description="Choose a team from the event standings to view roster, form, and event splits here." />
          </div>
        )}
      </div>

      <div className="esports-card p-6">
        <SectionHeader eyebrow="Player Spotlight" title={player?.pubgName ?? "Player spotlight"} description="The event player view keeps high-output players close to the board so users can jump from rankings into match history and team context quickly." />
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
              <MetricCard label="Assists" value={player.eventStats.find((item) => item.eventId === event.id)?.assists ?? 0} compact tone="blue" />
              <MetricCard label="Knocks" value={player.eventStats.find((item) => item.eventId === event.id)?.knocks ?? 0} compact tone="yellow" />
              <MetricCard label="Damage" value={player.eventStats.find((item) => item.eventId === event.id)?.damage ?? 0} compact tone="green" />
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
                  {player.bestMatch.kills} kills, {player.bestMatch.assists ?? 0} assists, {player.bestMatch.damage ?? 0} damage on {player.bestMatch.mapName}.
                </p>
              </div>
            ) : null}
            <Link href={`/pubg/players/${player.slug ?? player.id}`} className="btn-secondary">
              Open player profile
            </Link>
          </div>
        ) : (
          <div className="mt-5">
            <EmptyState title="No player spotlight selected" description="Choose a player from the event stats table to view their event performance and recent form here." />
          </div>
        )}
      </div>
    </div>
  );
}

function EventStandingsTable({
  event,
  slug,
}: {
  event: PubgHubEvent;
  slug: string;
}) {
  return (
    <div className="esports-card overflow-hidden !p-0">
      <div className="border-b border-white/[0.08] px-5 py-4">
        <SectionHeader eyebrow="Standings" title="Team board" description="Team points, placement splits, kill output, and quick drill-in routes into the event team spotlight." />
      </div>
      {event.standings.length === 0 ? (
        <div className="p-6">
          <EmptyState title="Leaderboard data is not available yet" description="Leaderboard data will be available once matches have been completed and officially published." />
        </div>
      ) : (
        <div className="table-scroll">
          <table className="data-table min-w-full">
            <thead>
              <tr>
                <th>Rank</th>
                <th>Team</th>
                <th>Matches</th>
                <th>Wins</th>
                <th>Kills</th>
                <th>Placement</th>
                <th>Total</th>
                <th>Trend</th>
              </tr>
            </thead>
            <tbody>
              {event.standings.map((row) => (
                <tr key={row.teamId}>
                  <td>
                    <RankBadge rank={row.rank} />
                  </td>
                  <td>
                    <Link href={buildHref(`/pubg/events/${slug}`, { tab: "teams", target: row.teamId })} className="font-semibold text-white hover:text-accent-blue">
                      {row.teamName}
                    </Link>
                  </td>
                  <td>{formatNumber(row.matches)}</td>
                  <td>{formatNumber(row.wins)}</td>
                  <td>{formatNumber(row.kills)}</td>
                  <td>{formatNumber(row.placementPoints)}</td>
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

function EventPlayersTable({
  event,
  slug,
}: {
  event: PubgHubEvent;
  slug: string;
}) {
  return (
    <div className="esports-card overflow-hidden !p-0">
      <div className="border-b border-white/[0.08] px-5 py-4">
        <SectionHeader eyebrow="Player Stats" title="Event player table" description="Kills, assists, knocks, damage, averages, and quick spotlight routing into the selected player." />
      </div>
      {event.playerTable.length === 0 ? (
        <div className="p-6">
          <EmptyState title="Player statistics are currently unavailable" description="Please check back after upcoming matches are completed." />
        </div>
      ) : (
        <div className="table-scroll">
          <table className="data-table min-w-full">
            <thead>
              <tr>
                <th>Rank</th>
                <th>Player</th>
                <th>Team</th>
                <th>Kills</th>
                <th>Assists</th>
                <th>Knocks</th>
                <th>Damage</th>
                <th>Avg K</th>
                <th>Trend</th>
              </tr>
            </thead>
            <tbody>
              {event.playerTable.map((row) => (
                <tr key={row.playerId}>
                  <td>
                    <RankBadge rank={row.rank} />
                  </td>
                  <td>
                    <Link href={buildHref(`/pubg/events/${slug}`, { tab: "players", target: row.playerId })} className="font-semibold text-white hover:text-accent-blue">
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

function EventMatchesBoard({
  event,
  playerLookup,
}: {
  event: PubgHubEvent;
  playerLookup: Map<string, PubgHubPlayer>;
}) {
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      {event.matches.map((match) => {
        const winnerTeam = match.winnerTeamName ?? "Winner TBD";
        const topFragger = buildTopFragger(match, playerLookup);

        return (
          <div key={match.id} className="esports-card p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-accent-blue">
                  Match {match.matchNumber} | {match.mapName}
                </p>
                <h3 className="mt-2 font-display text-lg font-black uppercase text-white">{event.name}</h3>
              </div>
              <span className={`rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] ${match.status === "published" ? "border-accent-green/30 bg-accent-green/10 text-accent-green" : "border-accent-yellow/30 bg-accent-yellow/10 text-accent-yellow"}`}>
                {match.status === "published" ? "Published" : "Awaiting Approval"}
              </span>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <MetricCard label="Winner" value={winnerTeam} compact />
              <MetricCard label="Total Kills" value={match.totalKills} compact tone="blue" />
              <MetricCard label="Damage" value={match.totalDamage} compact tone="green" />
            </div>
            <div className="mt-4 rounded-card border border-white/[0.08] bg-bg-primary p-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-text-muted">Top fragger</p>
              <p className="mt-2 font-semibold text-white">{topFragger?.pubgName ?? "Pending player stats"}</p>
              <p className="mt-1 text-sm text-text-muted">{topFragger?.currentTeamName ?? "Team TBD"}</p>
            </div>
            <div className="mt-4 table-scroll">
              <table className="data-table min-w-full">
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Team</th>
                    <th>Kills</th>
                    <th>Total</th>
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
          <EmptyState title="No match results have been published for this event yet" description="Results will appear once they are officially verified." />
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
  const selectedTeamId = event.teamIds.includes(target) ? target : event.topTeamId ?? event.standings[0]?.teamId ?? "";
  const selectedPlayerId =
    event.playerTable.some((row) => row.playerId === target) ? target : event.topPlayerId ?? event.playerTable[0]?.playerId ?? "";
  const selectedTeam = selectedTeamId ? teamLookup.get(selectedTeamId) ?? null : null;
  const selectedPlayer = selectedPlayerId ? playerLookup.get(selectedPlayerId) ?? null : null;
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
          description={event.description ?? "Full event context: standings, players, matches, map splits, approval state, and direct paths into team and player views inside the event."}
          actions={
            <>
              <Link href="/pubg/events" className="btn-secondary">
                Back to events
              </Link>
              <Link href={event.streamUrl ?? "/live-stream"} className="btn-primary">
                Stream / coverage
              </Link>
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

        <section className="esports-card p-6">
          <EventNavigation slug={event.slug} currentTab={tab} target={target} map={map} />
        </section>

        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Top Team" value={event.standings[0]?.teamName ?? "Pending"} tone="green" />
          <MetricCard label="Top Player" value={event.playerTable[0]?.pubgName ?? "Pending"} tone="blue" />
          <MetricCard label="Published Matches" value={event.matches.filter((match) => match.status === "published").length} tone="yellow" />
          <MetricCard label="Generated" value={formatDateTime(dataset.generatedAt)} tone="red" />
        </section>

        {(tab === "overview" || tab === "teams" || tab === "players") && <EventSpotlight event={event} team={selectedTeam} player={selectedPlayer} />}

        {tab === "overview" ? (
          <>
            <EventStandingsTable event={event} slug={event.slug} />
            <EventPlayersTable event={event} slug={event.slug} />
            <section className="grid gap-6 xl:grid-cols-[1.05fr,0.95fr]">
              <MapStatsTable stats={event.mapStats} title="Event map performance" description="Map-by-map kills, wins, damage, and average placement across the whole event board." />
              <div className="esports-card p-6">
                <SectionHeader eyebrow="Event Teams" title="Twenty-team lobby context" description="Everyone attached to the event is visible here, even when the event is upcoming or draft." />
                <div className="mt-5 grid gap-3 md:grid-cols-2">
                  {event.teamIds.map((teamId) => {
                    const team = teamLookup.get(teamId);
                    return team ? <TeamIdentity key={team.id} team={team} href={buildHref(`/pubg/events/${event.slug}`, { tab: "teams", target: team.id })} /> : null;
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
              <SectionHeader eyebrow="Stat Filters" title="Map-based event read" description="Use map filters to tighten the read on team and player output without losing the wider event context." />
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
              <MapStatsTable stats={filteredMapStats} title={map === "all" ? "All map splits" : `${map} split`} description="Kills, wins, damage, and average placement for the selected map view." />
              <div className="esports-card p-6">
                <SectionHeader eyebrow="Trend Layer" title="Match-by-match signals" description="Recent event trends for the selected team and player inside this event board." />
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

export function PubgTeamsPage({
  dataset,
  searchParams,
}: {
  dataset: PubgHubDataset;
  searchParams: SearchParamDictionary;
}) {
  const rawQuery = readSearchParam(searchParams.q).trim();
  const query = rawQuery.toLowerCase();
  const region = readSearchParam(searchParams.region, "all");
  const page = Math.max(Number(readSearchParam(searchParams.page, "1")) || 1, 1);
  const pageSize = 12;
  const rankedTeams = getRankedTeams(dataset.teams);
  const teamRankMap = getTeamRankMap(rankedTeams);
  const teamRegions = Array.from(new Set(rankedTeams.map((team) => team.region).filter((value): value is string => Boolean(value)))).sort((firstValue, secondValue) => firstValue.localeCompare(secondValue));
  const filteredTeams = rankedTeams
    .filter((team) => {
      if (query && !`${team.name} ${team.tag ?? ""} ${team.region ?? ""}`.toLowerCase().includes(query)) return false;
      if (region !== "all" && team.region !== region) return false;
      return true;
    });
  const visibleTeams = filteredTeams.slice(0, page * pageSize);
  const hasMore = visibleTeams.length < filteredTeams.length;
  const nextPageHref = buildHref("/pubg/teams", {
    q: rawQuery || undefined,
    region: region === "all" ? undefined : region,
    page: String(page + 1),
  });

  return (
    <main className="page-shell pb-12 pt-6">
      <div className="page-stack">
        <PageHero
          badge="PUBG Teams"
          title={
            <>
              Team profiles with roster,
              <br />
              rank, roster, and map splits
            </>
          }
          description="Every tracked Bravo squad gets one official ranking card with roster preview, core scoring stats, recent output, and direct routes into the full team profile."
          actions={
            <>
              <Link href="/pubg/leaderboards?view=teams" className="btn-primary">
                Team board
              </Link>
              <Link href="/pubg/community?view=teams" className="btn-secondary">
                Community view
              </Link>
            </>
          }
          stats={[
            { label: "Tracked Teams", value: dataset.teams.length, tone: "blue" },
            { label: "Active Rosters", value: dataset.teams.filter((team) => team.currentRoster.length > 0).length, tone: "green" },
            { label: "Regions", value: teamRegions.length, tone: "yellow" },
            { label: "Ranked Cards", value: filteredTeams.length, tone: "red" },
          ]}
          aside={
            <div className="space-y-4">
              <div>
                <p className="section-title">Top Seed Snapshot</p>
                <h2 className="mt-2 font-display text-2xl font-black uppercase text-white">Official team order from published results</h2>
              </div>
              {rankedTeams.slice(0, 4).map((team, index) => (
                <div key={team.id} className="rounded-card border border-white/[0.08] bg-black/20 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <RankBadge rank={index + 1} />
                        <p className="truncate font-semibold text-white">{team.name}</p>
                      </div>
                      <p className="mt-2 text-sm text-text-muted">
                        {formatNumber(team.totalPoints)} pts • {formatNumber(team.kills)} kills • {formatNumber(team.wins)} WWCD
                      </p>
                    </div>
                    <span className="font-mono-stat text-sm text-accent-blue-light">{formatNumber(team.matches)}M</span>
                  </div>
                  <div className="mt-3">
                    <TrendBars values={team.recentPoints} tone="green" />
                  </div>
                </div>
              ))}
            </div>
          }
        />

        <FilterBar
          action={
            <Link href="/pubg/teams" className="btn-secondary h-11">
              Reset
            </Link>
          }
        >
          <FilterField label="Search">
            <input name="q" defaultValue={rawQuery} className="input-esports h-11" placeholder="Search team, tag, or region" />
          </FilterField>
          <FilterField label="Region">
            <select name="region" defaultValue={region} className="input-esports h-11">
              <option value="all">All regions</option>
              {teamRegions.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </FilterField>
          <div className="rounded-card border border-white/[0.08] bg-bg-primary px-4 py-3 text-sm text-text-muted">
            Cards keep the official leaderboard order, even when you filter by region or search.
          </div>
          <div className="rounded-card border border-white/[0.08] bg-bg-primary px-4 py-3 text-sm text-text-muted">
            Showing {visibleTeams.length} of {filteredTeams.length} ranked teams.
          </div>
        </FilterBar>
        <ActiveFilterSummary items={[{ label: "Search", value: rawQuery || null }, { label: "Region", value: region === "all" ? null : region }]} />

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visibleTeams.map((team) => {
            const rank = teamRankMap.get(team.id) ?? 0;

            return (
              <div key={team.id} className={`flex h-full flex-col rounded-[26px] border p-5 ${getLeaderboardSurface(rank)}`}>
                <div className="flex items-start gap-4">
                  <TeamAvatar name={team.name} imageUrl={team.logoUrl ?? undefined} size="lg" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <RankBadge rank={rank} />
                      <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-text-muted">
                        {team.tag ? `[${team.tag}]` : "PUBG Team"}
                      </span>
                    </div>
                    <h2 className="mt-3 line-clamp-2 font-display text-xl font-black uppercase text-white">{team.name}</h2>
                    <p className="mt-2 text-xs uppercase tracking-[0.16em] text-text-muted">{team.region ?? "Region TBA"}</p>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3">
                  <MetricCard label="Points" value={team.totalPoints} compact tone="green" />
                  <MetricCard label="Kills" value={team.kills} compact tone="blue" />
                  <MetricCard label="Matches" value={team.matches} compact />
                  <MetricCard label="Avg Place" value={formatDecimal(team.avgPlacement, 2)} compact tone="yellow" />
                </div>

                <div className="mt-5 rounded-card border border-white/[0.08] bg-black/20 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-text-muted">Last 6 matches</p>
                    <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-white">
                      {formatNumber(team.wins)} WWCD
                    </span>
                  </div>
                  <div className="mt-3">
                    <TrendBars values={team.recentPoints} tone="green" />
                  </div>
                </div>

                <div className="mt-5">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-text-muted">Roster</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {team.currentRoster.length > 0 ? (
                      team.currentRoster.slice(0, 4).map((member) => (
                        <span key={member.playerId} className="rounded-full border border-white/10 bg-bg-primary px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-white">
                          {member.pubgName}
                        </span>
                      ))
                    ) : (
                      <span className="text-sm text-text-muted">Roster update pending.</span>
                    )}
                  </div>
                </div>

                <div className="mt-5">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-text-muted">Map Strength</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {team.mapStats.slice(0, 2).map((mapStat) => (
                      <span
                        key={mapStat.map}
                        className="rounded-full border border-accent-blue/20 bg-accent-blue/10 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-accent-blue-light"
                      >
                        {mapStat.map} • {formatNumber(mapStat.points)} pts
                      </span>
                    ))}
                    {team.mapStats.length === 0 ? <span className="text-sm text-text-muted">Map splits will appear after more matches.</span> : null}
                  </div>
                </div>

                <div className="mt-auto pt-5">
                  <Link href={`/pubg/teams/${team.slug ?? team.id}`} className="btn-primary">
                    View Team
                  </Link>
                </div>
              </div>
            );
          })}
          {filteredTeams.length === 0 ? (
            <div className="md:col-span-2 xl:col-span-3">
              <EmptyState title="No teams match the current filters" description="Try adjusting your search or browse available categories." />
            </div>
          ) : null}
        </section>

        {hasMore ? (
          <div className="flex justify-center">
            <Link href={nextPageHref} className="btn-secondary">
              Load More Teams
            </Link>
          </div>
        ) : null}
      </div>
    </main>
  );
}

export function PubgTeamDetailPage({
  team,
  dataset,
  searchParams,
}: {
  team: PubgHubTeam;
  dataset: PubgHubDataset;
  searchParams: SearchParamDictionary;
}) {
  const eventId = readSearchParam(searchParams.event, "all");
  const selectedEventStat = eventId === "all" ? null : team.eventStats.find((eventStat) => eventStat.eventId === eventId) ?? null;
  const filteredMatches = eventId === "all" ? team.recentMatches : team.recentMatches.filter((match) => match.eventId === eventId);
  const teamLookup = buildTeamLookup(dataset);
  const playerLookup = buildPlayerLookup(dataset);
  const bestMap = [...team.mapStats].sort((firstValue, secondValue) => secondValue.points - firstValue.points || secondValue.kills - firstValue.kills)[0] ?? null;
  const podiumFinishes = team.eventStats.filter((eventStat) => (eventStat.rank ?? Number.POSITIVE_INFINITY) <= 3).length;
  const averageRecentPoints =
    team.recentPoints.length > 0
      ? team.recentPoints.reduce((sum, value) => sum + value, 0) / team.recentPoints.length
      : 0;

  return (
    <main className="page-shell pb-12 pt-6">
      <div className="page-stack">
        <PageHero
          badge="PUBG Team Profile"
          title={
            <>
              {team.name}
              <br />
              team form and event profile
            </>
          }
          description="A full Bravo public team profile: current roster, event-specific stats, recent matches, placement trend, kill trend, map performance, and roster overlay history."
          actions={
            <>
              <Link href="/pubg/teams" className="btn-secondary">
                Back to teams
              </Link>
              <Link href={buildHref("/pubg/compare", { mode: "teams", sideA: team.id })} className="btn-primary">
                Compare team
              </Link>
            </>
          }
          stats={[
            { label: "Matches", value: team.matches, tone: "blue" },
            { label: "Wins", value: team.wins, tone: "green" },
            { label: "Kills", value: team.kills, tone: "yellow" },
            { label: "Points", value: team.totalPoints, tone: "red" },
          ]}
          aside={
            <div className="space-y-4">
              <div className="rounded-[26px] border border-white/[0.08] bg-black/20 p-4">
                <div className="flex items-center gap-4">
                  <TeamAvatar name={team.name} imageUrl={team.logoUrl ?? undefined} size="lg" />
                  <div>
                    <h2 className="font-display text-2xl font-black uppercase text-white">{team.name}</h2>
                    <p className="text-sm uppercase tracking-[0.16em] text-text-muted">{team.region ?? "Region TBA"}</p>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <FormPill label={team.formLabel} />
                  {team.slotNumber ? (
                    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-text-muted">Slot {team.slotNumber}</span>
                  ) : null}
                  {bestMap ? (
                    <span className="rounded-full border border-accent-green/20 bg-accent-green/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-accent-green">
                      Best map {bestMap.map}
                    </span>
                  ) : null}
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <MetricCard label="Active Roster" value={team.currentRoster.length} compact tone="blue" />
                <MetricCard label="Podium Events" value={podiumFinishes} compact tone="green" />
                <MetricCard label="Recent Avg Pts" value={formatDecimal(averageRecentPoints, 1)} compact tone="yellow" />
                <MetricCard label="Map Edge" value={bestMap?.map ?? "Pending"} compact tone="red" />
              </div>
              <div className="rounded-card border border-white/[0.08] bg-black/20 p-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-text-muted">Current roster</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {team.currentRoster.map((member) => (
                    <Link
                      key={member.playerId}
                      href={`/pubg/players/${member.playerId}`}
                      className="rounded-full border border-white/10 bg-bg-primary px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-white transition hover:border-accent-blue/30 hover:text-accent-blue"
                    >
                      {member.pubgName}
                    </Link>
                  ))}
                </div>
              </div>
              <div className="rounded-card border border-white/[0.08] bg-black/20 p-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-text-muted">Placement trend</p>
                <div className="mt-3">
                  <TrendBars values={team.recentPlacements.map((value) => 20 - value)} tone="yellow" />
                </div>
              </div>
              <div className="rounded-card border border-white/[0.08] bg-black/20 p-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-text-muted">Kill trend</p>
                <div className="mt-3">
                  <TrendBars values={team.recentKills} tone="blue" />
                </div>
              </div>
            </div>
          }
        />

        <FilterBar
          action={
            <Link href={`/pubg/teams/${team.slug ?? team.id}`} className="btn-secondary h-11">
              All events
            </Link>
          }
        >
          <input type="hidden" name="q" value="" />
          <select name="event" defaultValue={eventId} className="input-esports h-11">
            <option value="all">All events</option>
            {team.eventStats.map((eventStat) => (
              <option key={eventStat.eventId} value={eventStat.eventId}>
                {eventStat.eventName}
              </option>
            ))}
          </select>
          <div className="rounded-card border border-white/[0.08] bg-bg-primary px-4 py-3 text-sm text-text-muted">
            Event-specific stats and recent matches tighten to the selected event when you want a clearer team view.
          </div>
          <div className="rounded-card border border-white/[0.08] bg-bg-primary px-4 py-3 text-sm text-text-muted">
            Data source: {sourceLabel(dataset.source)}
          </div>
        </FilterBar>

        <section className="grid gap-6 xl:grid-cols-[1fr,1fr]">
          <div className="esports-card p-6">
            <SectionHeader eyebrow="Current Roster" title="Starting four and role split" description="The current Bravo team card always shows the active roster, even if the selected event is older." />
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {team.currentRoster.map((member) => {
                const player = playerLookup.get(member.playerId);

                return (
                  <div key={member.playerId} className="rounded-[24px] border border-white/[0.08] bg-bg-primary p-4">
                    <div className="flex items-center gap-3">
                      <TeamAvatar name={member.pubgName} imageUrl={player?.avatarUrl ?? undefined} size="md" />
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-white">{member.pubgName}</p>
                        <p className="text-xs uppercase tracking-[0.16em] text-text-muted">{member.role}</p>
                      </div>
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                      <div className="rounded-2xl border border-white/10 bg-black/20 px-3 py-2">
                        <p className="uppercase tracking-[0.14em] text-text-muted">Kills</p>
                        <p className="mt-1 font-mono-stat text-white">{formatNumber(player?.kills ?? 0)}</p>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-black/20 px-3 py-2">
                        <p className="uppercase tracking-[0.14em] text-text-muted">Damage</p>
                        <p className="mt-1 font-mono-stat text-white">{formatNumber(player?.damage ?? 0)}</p>
                      </div>
                    </div>
                    <div className="mt-4">
                      <Link href={`/pubg/players/${member.playerId}`} className="text-sm text-accent-blue hover:underline">
                        Open player profile
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="esports-card p-6">
            <SectionHeader eyebrow="Roster History" title="Overlay and previous swaps" description="Past roster movement stays attached to the team profile for scouting and context." />
            <div className="mt-5 space-y-3">
              {team.rosterHistory.map((entry) => (
                <div key={`${entry.playerId}-${entry.startDate}`} className="rounded-card border border-white/[0.08] bg-bg-primary p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-white">{entry.pubgName}</p>
                      <p className="text-xs uppercase tracking-[0.16em] text-text-muted">{entry.status}</p>
                    </div>
                    <p className="text-xs uppercase tracking-[0.16em] text-text-muted">
                      {formatDate(entry.startDate)} - {entry.endDate ? formatDate(entry.endDate) : "Current"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.08fr,0.92fr]">
          <div className="esports-card overflow-hidden !p-0">
            <div className="border-b border-white/[0.08] px-5 py-4">
              <SectionHeader eyebrow="Event Splits" title="Event-specific team output" description="Matches, kills, wins, points, average placement, and event rank when available." />
            </div>
            <div className="table-scroll">
              <table className="data-table min-w-full">
                <thead>
                  <tr>
                    <th>Event</th>
                    <th>Status</th>
                    <th>Matches</th>
                    <th>Kills</th>
                    <th>Wins</th>
                    <th>Points</th>
                    <th>Avg Place</th>
                  </tr>
                </thead>
                <tbody>
                  {team.eventStats.map((eventStat) => (
                    <tr key={eventStat.eventId} className={selectedEventStat?.eventId === eventStat.eventId ? "!bg-accent-blue/5" : ""}>
                      <td>
                        <Link href={`/pubg/events/${eventStat.eventSlug}`} className="font-semibold text-white hover:text-accent-blue">
                          {eventStat.eventName}
                        </Link>
                      </td>
                      <td>{eventStat.eventStatus}</td>
                      <td>{formatNumber(eventStat.matches)}</td>
                      <td>{formatNumber(eventStat.kills)}</td>
                      <td>{formatNumber(eventStat.wins)}</td>
                      <td className="points-cell">{formatNumber(eventStat.totalPoints)}</td>
                      <td>{formatDecimal(eventStat.avgPlacement, 2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="esports-card p-6">
            <SectionHeader eyebrow="Selected Event" title={selectedEventStat?.eventName ?? "All events"} description="The selected event filter keeps recent matches and quick team reads focused below." />
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <MetricCard label="Kills" value={selectedEventStat?.kills ?? team.kills} compact tone="blue" />
              <MetricCard label="Points" value={selectedEventStat?.totalPoints ?? team.totalPoints} compact tone="green" />
              <MetricCard label="Wins" value={selectedEventStat?.wins ?? team.wins} compact tone="yellow" />
              <MetricCard label="Avg Place" value={formatDecimal(selectedEventStat?.avgPlacement ?? team.avgPlacement, 2)} compact tone="red" />
            </div>
            <div className="mt-5">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-text-muted">Recent point trend</p>
              <div className="mt-3">
                <TrendBars values={filteredMatches.map((match) => match.totalPoints).slice(0, 6).reverse()} tone="green" />
              </div>
            </div>
          </div>
        </section>

        <MapStatsTable stats={team.mapStats} title="Map performance" description="Where the team is strongest right now across kills, wins, damage, and average placement." />

        <section className="esports-card overflow-hidden !p-0">
          <div className="border-b border-white/[0.08] px-5 py-4">
            <SectionHeader eyebrow="Recent Matches" title="Latest team activity" description="Event context, map, placement, kills, and points stay visible without leaving the profile." />
          </div>
          {filteredMatches.length === 0 ? (
            <div className="p-6">
              <EmptyState title="No match results are available for the selected filters" description="Try adjusting the filters or check back after official results are published." />
            </div>
          ) : (
            <div className="p-5">
              <RecentMatchCards matches={filteredMatches as PubgHubRecentMatch[]} teamLookup={teamLookup} />
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

export function PubgPlayersPage({
  dataset,
  searchParams,
}: {
  dataset: PubgHubDataset;
  searchParams: SearchParamDictionary;
}) {
  const rawQuery = readSearchParam(searchParams.q).trim();
  const query = rawQuery.toLowerCase();
  const teamId = readSearchParam(searchParams.team, "all");
  const sort = readSearchParam(searchParams.sort, "kills");
  const minMatches = Math.max(Number(readSearchParam(searchParams.minMatches, "0")) || 0, 0);
  const page = Math.max(Number(readSearchParam(searchParams.page, "1")) || 1, 1);
  const pageSize = 12;
  const teams = buildTeamLookup(dataset);
  const rankedPlayers = getRankedPlayers(dataset.players);
  const playerRankMap = getPlayerRankMap(rankedPlayers);
  const filteredPlayers = rankedPlayers
    .filter((player) => {
      if (query && !`${player.pubgName} ${player.currentTeamName ?? ""}`.toLowerCase().includes(query)) return false;
      if (teamId !== "all" && player.currentTeamId !== teamId) return false;
      if (player.matches < minMatches) return false;
      return true;
    });
  const sortedPlayers = sortDirectoryPlayers(filteredPlayers, sort);
  const visiblePlayers = sortedPlayers.slice(0, page * pageSize);
  const hasMore = visiblePlayers.length < sortedPlayers.length;
  const nextPageHref = buildHref("/pubg/players", {
    q: rawQuery || undefined,
    team: teamId === "all" ? undefined : teamId,
    sort: sort === "kills" ? undefined : sort,
    minMatches: minMatches > 0 ? String(minMatches) : undefined,
    page: String(page + 1),
  });

  return (
    <main className="page-shell pb-12 pt-6">
      <div className="page-stack">
        <PageHero
          badge="PUBG Players"
          title={
            <>
              Player profiles with
              <br />
              output, rank, and history
            </>
          }
          description="All tracked players land in one compact Bravo board with official leaderboard context, core stat output, best-match snapshots, and direct profile access."
          actions={
            <>
              <Link href="/pubg/leaderboards?view=players" className="btn-primary">
                Player board
              </Link>
              <Link href="/pubg/community?view=players" className="btn-secondary">
                Community view
              </Link>
            </>
          }
          stats={[
            { label: "Tracked Players", value: dataset.players.length, tone: "blue" },
            { label: "MVP-Level", value: dataset.players.filter((player) => player.mvpCount > 0).length, tone: "green" },
            { label: "Teams Represented", value: new Set(dataset.players.map((player) => player.currentTeamId).filter(Boolean)).size, tone: "yellow" },
            { label: "Visible Cards", value: sortedPlayers.length, tone: "red" },
          ]}
          aside={
            <div className="space-y-4">
              <div>
                <p className="section-title">Frag Leader Snapshot</p>
                <h2 className="mt-2 font-display text-2xl font-black uppercase text-white">Official player order from published results</h2>
              </div>
              {rankedPlayers.slice(0, 4).map((player, index) => (
                <div key={player.id} className="rounded-card border border-white/[0.08] bg-black/20 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <RankBadge rank={index + 1} />
                        <p className="truncate font-semibold text-white">{player.pubgName}</p>
                      </div>
                      <p className="mt-2 text-sm text-text-muted">
                        {formatNumber(player.kills)} kills • {formatNumber(player.damage)} damage
                      </p>
                    </div>
                    <span className="font-mono-stat text-sm text-accent-blue-light">{player.avgKills.toFixed(2)} A/K</span>
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

        <FilterBar
          action={
            <Link href="/pubg/players" className="btn-secondary h-11">
              Reset
            </Link>
          }
        >
          <FilterField label="Search">
            <input name="q" defaultValue={rawQuery} className="input-esports h-11" placeholder="Search player or team" />
          </FilterField>
          <FilterField label="Team">
            <select name="team" defaultValue={teamId} className="input-esports h-11">
              <option value="all">All teams</option>
              {getRankedTeams(dataset.teams).map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </select>
          </FilterField>
          <FilterField label="Sort">
            <select name="sort" defaultValue={sort} className="input-esports h-11">
              <option value="kills">Sort by kills</option>
              <option value="damage">Sort by damage</option>
              <option value="avg">Sort by average kills</option>
            </select>
          </FilterField>
          <FilterField label="Minimum Matches">
            <select name="minMatches" defaultValue={String(minMatches)} className="input-esports h-11">
              <option value="0">All samples</option>
              <option value="3">3+ matches</option>
              <option value="5">5+ matches</option>
              <option value="8">8+ matches</option>
            </select>
          </FilterField>
        </FilterBar>
        <ActiveFilterSummary
          items={[
            { label: "Search", value: rawQuery || null },
            { label: "Team", value: teamId === "all" ? null : teams.get(teamId)?.name ?? teamId },
            { label: "Sort", value: sort === "kills" ? null : sort === "damage" ? "Damage" : "Avg Kills" },
            { label: "Min Matches", value: minMatches > 0 ? String(minMatches) : null },
          ]}
        />

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visiblePlayers.map((player, index) => {
            const officialRank = playerRankMap.get(player.id) ?? index + 1;
            const displayRank = index + 1;

            return (
              <div key={player.id} className={`flex h-full flex-col rounded-[26px] border p-5 ${getLeaderboardSurface(displayRank)}`}>
                <div className="flex items-start gap-4">
                  <RankBadge rank={displayRank} />
                  <TeamAvatar name={player.pubgName} imageUrl={player.avatarUrl ?? undefined} size="lg" />
                  <div className="min-w-0 flex-1">
                    <h2 className="line-clamp-2 font-display text-xl font-black uppercase text-white">{player.pubgName}</h2>
                    <p className="mt-2 text-xs uppercase tracking-[0.16em] text-text-muted">{player.currentTeamName ?? "Team TBD"}</p>
                    <p className="mt-3 text-[10px] font-bold uppercase tracking-[0.18em] text-accent-blue-light">
                      Official leaderboard #{officialRank}
                    </p>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3">
                  <MetricCard label="Kills" value={player.kills} compact tone="blue" />
                  <MetricCard label="Damage" value={player.damage} compact tone="red" />
                  <MetricCard label="Assists" value={player.assists} compact tone="yellow" />
                  <MetricCard label="Knocks" value={player.knocks} compact tone="green" />
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <MetricCard label="Avg K" value={formatDecimal(player.avgKills, 2)} compact />
                  <MetricCard label="Matches" value={player.matches} compact />
                </div>

                <div className="mt-5 rounded-card border border-white/[0.08] bg-black/20 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-text-muted">Recent output</p>
                    <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-white">
                      {player.avgKills.toFixed(2)} avg kills
                    </span>
                  </div>
                  <div className="mt-3">
                    <TrendBars values={player.recentTrend} tone="blue" />
                  </div>
                </div>

                <div className="mt-5 rounded-card border border-white/[0.08] bg-bg-primary p-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-text-muted">Best Match</p>
                  {player.bestMatch ? (
                    <>
                      <p className="mt-2 font-semibold text-white">
                        {player.bestMatch.eventName} • Match {player.bestMatch.matchNumber}
                      </p>
                      <p className="mt-2 text-sm text-text-muted">
                        {player.bestMatch.kills} kills • {player.bestMatch.damage ?? 0} damage • {player.bestMatch.mapName}
                      </p>
                    </>
                  ) : (
                    <p className="mt-2 text-sm text-text-muted">Best-match context will appear once more match data is published.</p>
                  )}
                </div>

                <div className="mt-auto flex flex-wrap gap-2 pt-5">
                  <Link href={`/pubg/players/${player.slug ?? player.id}`} className="btn-primary">
                    View Player
                  </Link>
                  {player.currentTeamId && teams.get(player.currentTeamId) ? (
                    <Link href={`/pubg/teams/${teams.get(player.currentTeamId)?.slug ?? player.currentTeamId}`} className="btn-secondary">
                      Open Team
                    </Link>
                  ) : null}
                </div>
              </div>
            );
          })}
          {sortedPlayers.length === 0 ? (
            <div className="md:col-span-2 xl:col-span-3">
              <EmptyState title="No players match the current filters" description="Try adjusting your search or browse available categories." />
            </div>
          ) : null}
        </section>

        {hasMore ? (
          <div className="flex justify-center">
            <Link href={nextPageHref} className="btn-secondary">
              Load More Players
            </Link>
          </div>
        ) : null}
      </div>
    </main>
  );
}

export function PubgPlayerDetailPage({
  player,
  dataset,
  searchParams,
}: {
  player: PubgHubPlayer;
  dataset: PubgHubDataset;
  searchParams: SearchParamDictionary;
}) {
  const eventId = readSearchParam(searchParams.event, "all");
  const filteredEventStats = eventId === "all" ? player.eventStats : player.eventStats.filter((item) => item.eventId === eventId);
  const filteredMatches = eventId === "all" ? player.recentMatches : player.recentMatches.filter((match) => match.eventId === eventId);
  const currentTeam = player.currentTeamId ? dataset.teams.find((team) => team.id === player.currentTeamId) ?? null : null;

  return (
    <main className="page-shell pb-12 pt-6">
      <div className="page-stack">
        <PageHero
          badge="PUBG Player Profile"
          title={
            <>
              {player.pubgName}
              <br />
              player form and match output
            </>
          }
          description="Kills, assists, knocks, damage, average output, best match context, event history, recent form, ranking momentum, and previous team context all stay inside the Bravo player page."
          actions={
            <>
              <Link href="/pubg/players" className="btn-secondary">
                Back to players
              </Link>
              <Link href={buildHref("/pubg/compare", { mode: "players", sideA: player.id })} className="btn-primary">
                Compare player
              </Link>
            </>
          }
          stats={[
            { label: "Kills", value: player.kills, tone: "blue" },
            { label: "Damage", value: player.damage, tone: "green" },
            { label: "Avg Kills", value: formatDecimal(player.avgKills, 2), tone: "yellow" },
            { label: "MVP Count", value: player.mvpCount, tone: "red" },
          ]}
          aside={
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <TeamAvatar name={player.pubgName} imageUrl={player.avatarUrl ?? undefined} size="lg" />
                <div>
                  <h2 className="font-display text-2xl font-black uppercase text-white">{player.pubgName}</h2>
                  <p className="text-sm uppercase tracking-[0.16em] text-text-muted">{player.currentTeamName ?? "Team TBD"}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <FormPill label={player.formLabel} />
                {currentTeam ? <Link href={`/pubg/teams/${currentTeam.id}`} className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-text-muted">Open team</Link> : null}
              </div>
              <div className="rounded-card border border-white/[0.08] bg-black/20 p-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-text-muted">Recent kill trend</p>
                <div className="mt-3">
                  <TrendBars values={player.recentTrend} tone="blue" />
                </div>
              </div>
              <div className="rounded-card border border-white/[0.08] bg-black/20 p-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-text-muted">Damage trend</p>
                <div className="mt-3">
                  <TrendBars values={player.recentDamageTrend} tone="green" />
                </div>
              </div>
            </div>
          }
        />

        <FilterBar
          action={
            <Link href={`/pubg/players/${player.slug ?? player.id}`} className="btn-secondary h-11">
              All events
            </Link>
          }
        >
          <select name="event" defaultValue={eventId} className="input-esports h-11">
            <option value="all">All events</option>
            {player.eventStats.map((eventStat) => (
              <option key={eventStat.eventId} value={eventStat.eventId}>
                {eventStat.eventName}
              </option>
            ))}
          </select>
          <div className="rounded-card border border-white/[0.08] bg-bg-primary px-4 py-3 text-sm text-text-muted">
            Event filters tighten both the player event table and recent match history below for cleaner scouting reads.
          </div>
          <div className="rounded-card border border-white/[0.08] bg-bg-primary px-4 py-3 text-sm text-text-muted">
            Previous teams: {player.previousTeams.length > 0 ? player.previousTeams.join(" | ") : "No previous teams tracked"}
          </div>
          <input type="hidden" name="view" value="profile" />
        </FilterBar>

        <section className="grid gap-6 xl:grid-cols-[1fr,1fr]">
          <div className="esports-card p-6">
            <SectionHeader eyebrow="Best Match" title="Peak output snapshot" description="Best-match context stays near the top so users can see ceiling performance immediately." />
            {player.bestMatch ? (
              <div className="mt-5 rounded-card border border-white/[0.08] bg-bg-primary p-5">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-accent-blue">{player.bestMatch.eventName}</p>
                <h3 className="mt-2 font-display text-xl font-black uppercase text-white">
                  Match {player.bestMatch.matchNumber} | {player.bestMatch.mapName}
                </h3>
                <div className="mt-4 grid gap-3 sm:grid-cols-4">
                  <MetricCard label="Kills" value={player.bestMatch.kills} compact tone="blue" />
                  <MetricCard label="Assists" value={player.bestMatch.assists ?? 0} compact tone="yellow" />
                  <MetricCard label="Knocks" value={player.bestMatch.knocks ?? 0} compact tone="green" />
                  <MetricCard label="Damage" value={player.bestMatch.damage ?? 0} compact tone="red" />
                </div>
              </div>
            ) : (
              <div className="mt-5">
                <EmptyState title="Player statistics are currently unavailable" description="Please check back after upcoming matches are completed." />
              </div>
            )}
          </div>

          <div className="esports-card p-6">
            <SectionHeader eyebrow="Player Ranking" title="Fast scouting markers" description="A compact summary of the player's scoring pressure, consistency, and win share." />
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <MetricCard label="Matches" value={player.matches} compact />
              <MetricCard label="Wins" value={player.wins} compact tone="green" />
              <MetricCard label="Avg Damage" value={formatDecimal(player.avgDamage, 2)} compact tone="blue" />
              <MetricCard label="Form Score" value={formatDecimal(player.formScore, 2)} compact tone="yellow" />
            </div>
            <div className="mt-5">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-text-muted">Recent output</p>
              <div className="mt-3">
                <DualTrendChart firstValues={player.recentTrend} secondValues={player.recentDamageTrend} firstLabel="Kills" secondLabel="Damage" />
              </div>
            </div>
          </div>
        </section>

        <section className="esports-card overflow-hidden !p-0">
          <div className="border-b border-white/[0.08] px-5 py-4">
            <SectionHeader eyebrow="Event History" title="Event-specific player stats" description="Kills, assists, knocks, damage, and averages across every tracked event." />
          </div>
          <div className="table-scroll">
            <table className="data-table min-w-full">
              <thead>
                <tr>
                  <th>Event</th>
                  <th>Status</th>
                  <th>Kills</th>
                  <th>Assists</th>
                  <th>Knocks</th>
                  <th>Damage</th>
                  <th>Avg K</th>
                  <th>Avg Dmg</th>
                </tr>
              </thead>
              <tbody>
                {filteredEventStats.map((eventStat) => (
                  <tr key={eventStat.eventId}>
                    <td>
                      <Link href={`/pubg/events/${eventStat.eventSlug}`} className="font-semibold text-white hover:text-accent-blue">
                        {eventStat.eventName}
                      </Link>
                    </td>
                    <td>{eventStat.eventStatus}</td>
                    <td>{formatNumber(eventStat.kills)}</td>
                    <td>{formatNumber(eventStat.assists)}</td>
                    <td>{formatNumber(eventStat.knocks)}</td>
                    <td>{formatNumber(eventStat.damage)}</td>
                    <td>{formatDecimal(eventStat.avgKills, 2)}</td>
                    <td>{formatDecimal(eventStat.avgDamage, 2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <MapStatsTable stats={player.mapStats} title="Map profile" description="Where this player finds the best fragging and damage edges." />

        <section className="esports-card overflow-hidden !p-0">
          <div className="border-b border-white/[0.08] px-5 py-4">
            <SectionHeader eyebrow="Match History" title="Recent player matches" description="A lean public feed of the player's latest tracked output across all boards or the selected event filter." />
          </div>
          {filteredMatches.length === 0 ? (
            <div className="p-6">
              <EmptyState title="No match results are available for the selected filters" description="Try adjusting the filters or check back after official results are published." />
            </div>
          ) : (
            <div className="p-5">
              <RecentMatchCards matches={filteredMatches as PubgHubRecentMatch[]} />
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

export function PubgResultsPage({
  dataset,
  searchParams,
}: {
  dataset: PubgHubDataset;
  searchParams: SearchParamDictionary;
}) {
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
            { label: "Published Matches", value: dataset.matches.filter((match) => match.status === "published").length, tone: "green" },
            { label: "Awaiting Approval", value: dataset.matches.filter((match) => match.status !== "published").length, tone: "yellow" },
            { label: "Tracked Maps", value: mapOptions.length, tone: "blue" },
            { label: "Events Covered", value: new Set(dataset.matches.map((match) => match.eventId)).size, tone: "red" },
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
          <select name="event" defaultValue={eventSlug} className="input-esports h-11">
            <option value="all">All events</option>
            {dataset.events.map((event) => (
              <option key={event.id} value={event.slug}>
                {event.name}
              </option>
            ))}
          </select>
          <select name="map" defaultValue={mapName} className="input-esports h-11">
            <option value="all">All maps</option>
            {mapOptions.map((map) => (
              <option key={map} value={map}>
                {map}
              </option>
            ))}
          </select>
          <select name="status" defaultValue={status} className="input-esports h-11">
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
                  <span className={`rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] ${match.status === "published" ? "border-accent-green/30 bg-accent-green/10 text-accent-green" : "border-accent-yellow/30 bg-accent-yellow/10 text-accent-yellow"}`}>
                    {match.status === "published" ? "Published" : "Awaiting Approval"}
                  </span>
                </div>
                <div className="mt-5 grid gap-3 sm:grid-cols-4">
                  <MetricCard label="Winner" value={match.winnerTeamName ?? "Pending"} compact tone="green" />
                  <MetricCard label="Kills" value={match.totalKills} compact tone="blue" />
                  <MetricCard label="Damage" value={match.totalDamage} compact tone="yellow" />
                  <MetricCard label="Event" value={match.eventStatus} compact tone="red" />
                </div>
                <div className="mt-5 grid gap-5 xl:grid-cols-[1fr,0.95fr]">
                  <div className="rounded-card border border-white/[0.08] bg-bg-primary p-4">
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-text-muted">Winner board</p>
                    {match.winnerTeamId ? (
                      <div className="mt-3">
                        <TeamIdentity team={teamLookup.get(match.winnerTeamId) ?? { id: match.winnerTeamId, name: match.winnerTeamName ?? "Pending", tag: null, logoUrl: null }} href={match.winnerTeamId ? `/pubg/teams/${match.winnerTeamId}` : undefined} />
                      </div>
                    ) : (
                      <p className="mt-3 text-sm text-text-muted">Winner will appear after the lobby data publishes fully.</p>
                    )}
                    <div className="mt-4 table-scroll">
                      <table className="data-table min-w-full">
                        <thead>
                          <tr>
                            <th>Rank</th>
                            <th>Team</th>
                            <th>Kills</th>
                            <th>Total</th>
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
                  <div className="rounded-card border border-white/[0.08] bg-bg-primary p-4">
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-text-muted">Top fragger</p>
                    {topFragger ? (
                      <div className="mt-3">
                        <PlayerIdentity player={topFragger} href={`/pubg/players/${topFragger.id}`} />
                      </div>
                    ) : (
                      <p className="mt-3 text-sm text-text-muted">Top-fragger data will appear here after results are published.</p>
                    )}
                    <div className="mt-4">
                      <Link href={`/pubg/events/${match.eventSlug}?tab=matches`} className="btn-secondary">
                        Open event board
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          {filteredMatches.length === 0 ? (
            <div className="xl:col-span-2">
              <EmptyState title="No match results are available for the selected filters" description="Try adjusting the filters or check back after official results are published." />
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}

function TeamLeaderboardMobileCard({ row }: { row: PubgTeamBoardRow }) {
  return (
    <Link
      href={`/pubg/teams/${row.slug}`}
      className={`block rounded-[24px] border p-4 ${getLeaderboardSurface(row.rank)}`}
    >
      <div className="flex items-start gap-3">
        <RankBadge rank={row.rank} />
        <TeamAvatar name={row.name} imageUrl={row.logoUrl ?? undefined} size="md" />
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 font-display text-lg font-black uppercase text-white">{row.name}</p>
          <p className="mt-2 text-xs uppercase tracking-[0.16em] text-text-muted">{row.tag ? row.tag : "PUBG Team"}</p>
        </div>
      </div>
      <p className="mt-4 font-mono-stat text-xl text-accent-blue-light">{formatNumber(row.totalPoints)} Total</p>
      <p className="mt-2 text-sm text-text-muted">
        {formatNumber(row.kills)} Kills • {formatNumber(row.wins)} WWCD
      </p>
      <p className="mt-2 text-sm text-text-muted">
        {formatNumber(row.matches)} Matches • {formatNumber(row.placementPoints)} Placement
      </p>
      <p className="mt-2 text-sm text-text-muted">Damage: {formatNumber(row.damage)}</p>
    </Link>
  );
}

function PlayerLeaderboardMobileCard({ row }: { row: PubgPlayerBoardRow }) {
  return (
    <Link
      href={`/pubg/players/${row.slug}`}
      className={`block rounded-[24px] border p-4 ${getLeaderboardSurface(row.rank)}`}
    >
      <div className="flex items-start gap-3">
        <RankBadge rank={row.rank} />
        <TeamAvatar name={row.pubgName} imageUrl={row.avatarUrl ?? undefined} size="md" />
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 font-display text-lg font-black uppercase text-white">{row.pubgName}</p>
          <p className="mt-2 text-xs uppercase tracking-[0.16em] text-text-muted">{row.teamName ?? "Team TBD"}</p>
        </div>
      </div>
      <p className="mt-4 text-sm text-text-muted">
        {formatNumber(row.kills)} Kills • {formatNumber(row.damage)} Damage
      </p>
      <p className="mt-2 text-sm text-text-muted">
        {formatNumber(row.assists)} Assists • {formatNumber(row.knocks)} Knocks
      </p>
      <p className="mt-2 text-sm text-text-muted">Avg Kills: {formatDecimal(row.avgKills, 2)}</p>
      <p className="mt-2 text-sm text-text-muted">
        Best Match: {row.bestMatch ? `${row.bestMatch.kills}K on ${row.bestMatch.mapName}` : "Pending"}
      </p>
    </Link>
  );
}

export function PubgLeaderboardsPage({
  dataset,
  searchParams,
}: {
  dataset: PubgHubDataset;
  searchParams: SearchParamDictionary;
}) {
  const view = readSearchParam(searchParams.view, "teams");
  const eventSlug = readSearchParam(searchParams.event, "all");
  const mapName = readSearchParam(searchParams.map, "all");
  const teamLookup = buildTeamLookup(dataset);
  const playerLookup = buildPlayerLookup(dataset);
  const filteredMatches = filterMatches(dataset, {
    eventSlug: eventSlug === "all" ? undefined : eventSlug,
    mapName,
  });
  const teamBoard = buildPubgTeamBoardRows(filteredMatches, teamLookup);
  const playerBoard = buildPubgPlayerBoardRows(filteredMatches, playerLookup);
  const mapOptions = dedupeMaps(dataset.matches);

  return (
    <main className="page-shell pb-12 pt-6">
      <div className="page-stack">
        <PageHero
          badge="PUBG Leaderboards"
          title={
            <>
              Team and player boards
              <br />
              built from published results
            </>
          }
          description="Leaderboards update from the current published results set, with a shared ranking model that keeps the homepage, hub, directories, and full boards aligned."
          actions={
            <>
              <Link href={view === "teams" ? "/pubg/teams" : "/pubg/players"} className="btn-primary">
                {view === "teams" ? "Browse Teams" : "Browse Players"}
              </Link>
              <Link href="/pubg/results" className="btn-secondary">
                Match activity
              </Link>
            </>
          }
          stats={[
            { label: "Filtered Matches", value: filteredMatches.length, tone: "blue" },
            { label: "Team Rows", value: teamBoard.length, tone: "green" },
            { label: "Player Rows", value: playerBoard.length, tone: "yellow" },
            { label: "Maps In Lens", value: mapName === "all" ? mapOptions.length : 1, tone: "red" },
          ]}
          aside={
            <div className="space-y-4">
              <div>
                <p className="section-title">Board Lens</p>
                <h2 className="mt-2 font-display text-2xl font-black uppercase text-white">Team and player switches</h2>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link href={buildHref("/pubg/leaderboards", { view: "teams", event: eventSlug === "all" ? undefined : eventSlug, map: mapName === "all" ? undefined : mapName })} className={`rounded-full border px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.12em] ${view === "teams" ? "border-accent-blue/30 bg-accent-blue/10 text-accent-blue" : "border-white/10 bg-bg-primary text-text-muted"}`}>
                  Team board
                </Link>
                <Link href={buildHref("/pubg/leaderboards", { view: "players", event: eventSlug === "all" ? undefined : eventSlug, map: mapName === "all" ? undefined : mapName })} className={`rounded-full border px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.12em] ${view === "players" ? "border-accent-blue/30 bg-accent-blue/10 text-accent-blue" : "border-white/10 bg-bg-primary text-text-muted"}`}>
                  Player board
                </Link>
              </div>
              <div className="rounded-card border border-white/[0.08] bg-black/20 p-4 text-sm text-text-muted">
                Coverage mode: {sourceLabel(dataset.source)}
              </div>
            </div>
          }
        />

        <FilterBar
          action={
            <Link href={buildHref("/pubg/leaderboards", { view })} className="btn-secondary h-11">
              Reset
            </Link>
          }
        >
          <input type="hidden" name="view" value={view} />
          <FilterField label="Event">
            <select name="event" defaultValue={eventSlug} className="input-esports h-11">
              <option value="all">All events</option>
              {dataset.events.map((event) => (
                <option key={event.id} value={event.slug}>
                  {event.name}
                </option>
              ))}
            </select>
          </FilterField>
          <FilterField label="Map">
            <select name="map" defaultValue={mapName} className="input-esports h-11">
              <option value="all">All maps</option>
              {mapOptions.map((map) => (
                <option key={map} value={map}>
                  {map}
                </option>
              ))}
            </select>
          </FilterField>
          <div className="rounded-card border border-white/[0.08] bg-bg-primary px-4 py-3 text-sm text-text-muted">
            Team order follows one official rule set everywhere: total points, kills, WWCD, placement points, then average placement.
          </div>
          <div className="rounded-card border border-white/[0.08] bg-bg-primary px-4 py-3 text-sm text-text-muted">
            Player order follows the same shared default across homepage, hub previews, and the full player board.
          </div>
        </FilterBar>
        <ActiveFilterSummary
          items={[
            { label: "View", value: view === "teams" ? "Team Board" : "Player Board" },
            { label: "Event", value: eventSlug === "all" ? null : dataset.events.find((event) => event.slug === eventSlug)?.name ?? eventSlug },
            { label: "Map", value: mapName === "all" ? null : mapName },
          ]}
        />

        {view === "teams" ? (
          filteredMatches.length === 0 ? (
            <section className="esports-card p-6">
              <EmptyState title="Leaderboard data is not available yet" description="Leaderboard data will be available once matches have been completed and officially published." />
            </section>
          ) : (
            <section className="esports-card overflow-hidden !p-0">
              <div className="border-b border-white/[0.08] px-5 py-4">
                <SectionHeader eyebrow="Team Board" title="Official team leaderboard" description="Rank, team, matches, WWCD, placement, kills, damage, total points, and recent trend from the published board." />
              </div>
              <div className="grid gap-3 p-4 md:hidden">
                {teamBoard.map((row) => (
                  <TeamLeaderboardMobileCard key={row.teamId} row={row} />
                ))}
              </div>
              <div className="hidden px-4 pb-4 md:block">
                <div className="space-y-3">
                  <div className="grid grid-cols-[72px,minmax(0,1.8fr),90px,76px,98px,84px,112px,102px,120px] gap-4 rounded-[20px] border border-white/[0.08] bg-black/20 px-4 py-3 text-[10px] font-black uppercase tracking-[0.18em] text-text-muted">
                    <span>Rank</span>
                    <span>Team</span>
                    <span className="text-right">Matches</span>
                    <span className="text-right">WWCD</span>
                    <span className="text-right">Placement</span>
                    <span className="text-right">Kills</span>
                    <span className="text-right">Damage</span>
                    <span className="text-right">Total</span>
                    <span className="text-right">Trend</span>
                  </div>
                  {teamBoard.map((row) => (
                    <div
                      key={row.teamId}
                      className={`grid grid-cols-[72px,minmax(0,1.8fr),90px,76px,98px,84px,112px,102px,120px] items-center gap-4 rounded-[22px] border px-4 py-4 ${getLeaderboardSurface(row.rank)}`}
                    >
                      <RankBadge rank={row.rank} />
                      <Link href={`/pubg/teams/${row.slug}`} className="flex min-w-0 items-center gap-3 rounded-card transition hover:text-accent-blue">
                        <TeamAvatar name={row.name} imageUrl={row.logoUrl ?? undefined} size="sm" />
                        <div className="min-w-0">
                          <p className="font-semibold text-white">{row.name}</p>
                          <p className="text-xs uppercase tracking-[0.16em] text-text-muted">{row.tag ? row.tag : "PUBG Team"}</p>
                        </div>
                      </Link>
                      <span className="text-right font-mono-stat text-white">{formatNumber(row.matches)}</span>
                      <span className="text-right font-mono-stat text-white">{formatNumber(row.wins)}</span>
                      <span className="text-right font-mono-stat text-white">{formatNumber(row.placementPoints)}</span>
                      <span className="text-right font-mono-stat text-white">{formatNumber(row.kills)}</span>
                      <span className="text-right font-mono-stat text-white">{formatNumber(row.damage)}</span>
                      <span className="text-right font-mono-stat text-accent-blue-light">{formatNumber(row.totalPoints)}</span>
                      <div className="justify-self-end min-w-[110px]">
                        <TrendBars values={row.trend} tone="green" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )
        ) : filteredMatches.length === 0 ? (
          <section className="esports-card p-6">
            <EmptyState title="Player statistics are currently unavailable" description="Please check back after upcoming matches are completed." />
          </section>
        ) : (
          <section className="esports-card overflow-hidden !p-0">
            <div className="border-b border-white/[0.08] px-5 py-4">
              <SectionHeader eyebrow="Player Board" title="Official player leaderboard" description="Rank, player, team, kills, damage, assists, knocks, average kills, and best-match context from the published board." />
            </div>
            <div className="grid gap-3 p-4 md:hidden">
              {playerBoard.map((row) => (
                <PlayerLeaderboardMobileCard key={row.playerId} row={row} />
              ))}
            </div>
            <div className="hidden px-4 pb-4 md:block">
              <div className="table-scroll">
                <table className="data-table min-w-full">
                  <thead style={{ position: "static" }}>
                    <tr>
                      <th>Rank</th>
                      <th className="min-w-[240px]">Player</th>
                      <th className="min-w-[180px]">Team</th>
                      <th>Kills</th>
                      <th>Damage</th>
                      <th>Assists</th>
                      <th>Knocks</th>
                      <th>Avg Kills</th>
                      <th className="min-w-[220px]">Best Match</th>
                    </tr>
                  </thead>
                  <tbody>
                    {playerBoard.map((row) => (
                      <tr key={row.playerId} className={getLeaderboardSurface(row.rank)}>
                        <td>
                          <RankBadge rank={row.rank} />
                        </td>
                        <td className="min-w-[240px]">
                          <Link href={`/pubg/players/${row.slug}`} className="flex items-center gap-3 rounded-card transition hover:text-accent-blue">
                            <TeamAvatar name={row.pubgName} imageUrl={row.avatarUrl ?? undefined} size="sm" />
                            <div className="min-w-0">
                              <p className="font-semibold text-white">{row.pubgName}</p>
                              <p className="text-xs uppercase tracking-[0.16em] text-text-muted">{row.teamName ?? "Team TBD"}</p>
                            </div>
                          </Link>
                        </td>
                        <td className="min-w-[180px]">
                          {row.teamName ? (
                            row.teamId ? (
                              <Link href={`/pubg/teams/${row.teamId}`} className="text-white hover:text-accent-blue">
                                {row.teamName}
                              </Link>
                            ) : (
                              row.teamName
                            )
                          ) : (
                            "Team TBD"
                          )}
                        </td>
                        <td>{formatNumber(row.kills)}</td>
                        <td>{formatNumber(row.damage)}</td>
                        <td>{formatNumber(row.assists)}</td>
                        <td>{formatNumber(row.knocks)}</td>
                        <td>{formatDecimal(row.avgKills, 2)}</td>
                        <td className="min-w-[220px] text-sm text-text-muted">
                          {row.bestMatch ? `${row.bestMatch.kills}K • ${row.bestMatch.mapName} • Match ${row.bestMatch.matchNumber}` : "Pending"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

export function PubgFantasyPage({ dataset }: { dataset: PubgHubDataset }) {
  const previewPlayers = dataset.fantasy.leaderboard.slice(0, 10);

  return (
    <main className="page-shell pb-12 pt-6">
      <div className="page-stack">
        <PageHero
          badge="PUBG Fantasy Coming Soon"
          title={
            <>
              Five-player fantasy,
              <br />
              coming soon
            </>
          }
          description="PUBG fantasy stays intentionally low-pressure for now. This page previews the scoring model, likely event pools, and player board while the full Bravo builder remains disabled until launch."
          actions={
            <>
              <Link href="/pubg" className="btn-secondary">
                Dashboard
              </Link>
              <Link href="/pubg/players" className="btn-primary">
                Browse players
              </Link>
            </>
          }
          stats={[
            { label: "Fantasy Status", value: dataset.fantasy.enabled ? "Enabled" : "Coming Soon", tone: dataset.fantasy.enabled ? "green" : "yellow" },
            { label: "Preview Events", value: dataset.fantasy.events.length, tone: "blue" },
            { label: "Top Player Rows", value: dataset.fantasy.leaderboard.length, tone: "red" },
            { label: "Squad Size", value: 5, tone: "green" },
          ]}
          aside={
            <div className="space-y-4">
              <div>
                <p className="section-title">Launch Preview</p>
                <h2 className="mt-2 font-display text-2xl font-black uppercase text-white">What launches first</h2>
              </div>
              <div className="grid gap-3">
                {[
                  "Pick five players from enabled event pools",
                  "Lock squads automatically once the event starts",
                  "Score from official match stats and published results",
                  "Expose a public leaderboard once the builder goes live",
                ].map((item) => (
                  <div key={item} className="rounded-card border border-white/[0.08] bg-black/20 px-4 py-3 text-sm text-white">
                    {item}
                  </div>
                ))}
              </div>
            </div>
          }
        />

        <section className="grid gap-6 xl:grid-cols-[1fr,1fr]">
          <div className="esports-card p-6">
            <SectionHeader eyebrow="Fantasy Events" title="Preview event cards" description="See which Bravo PUBG events are the most likely candidates for the first public fantasy pools." />
            <div className="mt-5 grid gap-3">
              {dataset.fantasy.events.map((event) => (
                <div key={event.eventId} className="rounded-card border border-white/[0.08] bg-bg-primary p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-text-muted">{event.region}</p>
                      <h3 className="mt-2 font-display text-lg font-black uppercase text-white">{event.eventName}</h3>
                      <p className="mt-2 text-sm text-text-muted">{formatDate(event.startDate)}</p>
                    </div>
                    <span className={`rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] ${event.locked ? "border-accent-yellow/30 bg-accent-yellow/10 text-accent-yellow" : "border-accent-green/30 bg-accent-green/10 text-accent-green"}`}>
                      {event.statusLabel}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="esports-card p-6">
            <SectionHeader eyebrow="Squad Builder Preview" title="Five slots, not live yet" description="This is a clean preview of the builder layout. Picks stay disabled until Bravo turns the first fantasy event live." />
            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              {["Captain Slot", "Flex Slot 2", "Flex Slot 3", "Flex Slot 4", "Flex Slot 5"].map((slot, index) => (
                <div key={slot} className="rounded-card border border-dashed border-white/10 bg-bg-primary p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-display text-sm font-black uppercase text-white">{slot}</p>
                      <p className="mt-1 text-sm text-text-muted">Player selection unlocks only after the first official Bravo fantasy event is published.</p>
                    </div>
                    <span className={`rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] ${index === 0 ? "border-accent-yellow/30 bg-accent-yellow/10 text-accent-yellow" : "border-white/10 bg-white/5 text-text-muted"}`}>
                      {index === 0 ? "2x Score" : "Open"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="esports-card overflow-hidden !p-0">
          <div className="border-b border-white/[0.08] px-5 py-4">
            <SectionHeader eyebrow="Top 10 Fantasy Players" title="Leaderboard preview" description="The preview board already reads from the same player stats used elsewhere in the Bravo PUBG hub." />
          </div>
          <div className="table-scroll">
            <table className="data-table min-w-full">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Player</th>
                  <th>Tier</th>
                  <th>Score</th>
                  <th>Kills</th>
                  <th>Knocks</th>
                  <th>Assists</th>
                  <th>Damage</th>
                  <th>Matches</th>
                </tr>
              </thead>
              <tbody>
                {previewPlayers.map((row) => (
                  <tr key={row.playerId}>
                    <td>
                      <RankBadge rank={row.rank} />
                    </td>
                    <td>{row.pubgName}</td>
                    <td>{row.tier}</td>
                    <td className="points-cell">{row.score}</td>
                    <td>{row.kills}</td>
                    <td>{row.knocks}</td>
                    <td>{row.assists}</td>
                    <td>{formatNumber(row.damage)}</td>
                    <td>{row.matches}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
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
            { label: "Live Roles", value: 2, tone: "green" },
            { label: "Team Access", value: "Coach / Manager / IGL", tone: "yellow" },
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
            <SectionHeader eyebrow="Live Access" title="Current Bravo roles" description="Choose the right access point for publishing, team operations, and competition support." />
            <div className="mt-5 grid gap-3">
              <Link href="/admin/login" className="rounded-card border border-white/[0.08] bg-bg-primary p-5 transition hover:border-accent-blue/30 hover:bg-bg-hover">
                <p className="font-display text-lg font-black uppercase text-white">Admin Login</p>
                <p className="mt-2 text-sm text-text-muted">Match approval, event publishing, uploads, and platform moderation.</p>
              </Link>
              <Link href="/team/login" className="rounded-card border border-white/[0.08] bg-bg-primary p-5 transition hover:border-accent-green/30 hover:bg-bg-hover">
                <p className="font-display text-lg font-black uppercase text-white">Team Login</p>
                <p className="mt-2 text-sm text-text-muted">Roster management, MOSS workflow, result evidence, and operational requests for a team.</p>
              </Link>
            </div>
          </div>

          <div className="esports-card p-6">
            <SectionHeader eyebrow="Access Policy" title="Role-scoped Supabase access" description="Bravo keeps each route aligned to the role that owns the work behind it." />
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

