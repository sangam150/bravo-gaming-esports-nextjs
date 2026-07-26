import {
  buildHref,
  EmptyState,
  formatDateTime,
  formatDecimal,
  formatNumber,
  PageHero,
  RankBadge,
  readSearchParam,
  SectionHeader,
  sourceLabel,
  TrendBars,
} from "@/components/pubg/PubgHubUI";
import TeamAvatar from "@/components/ui/TeamAvatar";
import { BRAVO_DISCORD_URL } from "@/lib/brand-links";
import {
  getPublicPubgPlayers,
  getPublicPubgTeams,
  type PubgHubDataset,
  type PubgHubMatch,
  type PubgHubPlayer,
  type PubgHubTeam,
} from "@/lib/pubg-hub";
import { type PubgPlayerBoardRow, type PubgTeamBoardRow } from "@/lib/pubg-rankings";
import Link from "next/link";

type SearchParamDictionary = Record<string, string | string[] | undefined>;

function buildTeamLookup(teams: readonly PubgHubTeam[]) {
  return new Map(teams.map((team) => [team.id, team] as const));
}

function dedupeMaps(matches: PubgHubMatch[]) {
  return Array.from(new Set(matches.map((match) => match.mapName))).sort((firstValue, secondValue) =>
    firstValue.localeCompare(secondValue),
  );
}

function filterMatches(dataset: PubgHubDataset, options: { eventSlug?: string; mapName?: string }) {
  return dataset.matches.filter((match) => {
    if (options.eventSlug && match.eventSlug !== options.eventSlug) {
      return false;
    }

    if (options.mapName && options.mapName !== "all" && match.mapName !== options.mapName) {
      return false;
    }

    return true;
  });
}

function getLatestFilteredMatch(matches: PubgHubMatch[]) {
  return (
    [...matches].sort((firstValue, secondValue) => {
      const firstTime = new Date(firstValue.startTime).getTime();
      const secondTime = new Date(secondValue.startTime).getTime();

      if (Number.isFinite(firstTime) && Number.isFinite(secondTime) && secondTime !== firstTime) {
        return secondTime - firstTime;
      }

      return secondValue.matchNumber - firstValue.matchNumber;
    })[0] ?? null
  );
}

function toTeamBoardRow(team: PubgHubTeam, rank: number): PubgTeamBoardRow {
  return {
    rank,
    id: team.id,
    teamId: team.id,
    slug: team.slug,
    name: team.name,
    tag: team.tag ?? null,
    logoUrl: team.logoUrl ?? null,
    slotNumber: team.slotNumber ?? null,
    matches: team.matches,
    wins: team.wins,
    kills: team.kills,
    damage: team.damage,
    placementPoints: team.placementPoints,
    killPoints: team.killPoints,
    totalPoints: team.totalPoints,
    avgPlacement: team.avgPlacement,
    trend: team.recentPoints.slice(-6),
  };
}

function toPlayerBoardRow(player: PubgHubPlayer, rank: number): PubgPlayerBoardRow {
  return {
    rank,
    id: player.id,
    playerId: player.id,
    slug: player.slug,
    pubgName: player.pubgName,
    avatarUrl: player.avatarUrl ?? null,
    teamId: player.currentTeamId ?? null,
    teamName: player.currentTeamName ?? null,
    matches: player.matches,
    wins: player.wins,
    kills: player.kills,
    assists: player.assists,
    knocks: player.knocks,
    damage: player.damage,
    avgKills: player.avgKills,
    avgDamage: player.avgDamage,
    trend: player.recentTrend.slice(-6),
    bestMatch: player.bestMatch ?? null,
  };
}

function formatDamageValue(value: number) {
  return value > 0 ? formatNumber(value) : "Pending";
}

function getLeaderboardLensLabel(dataset: PubgHubDataset, eventSlug: string, latestMatch: PubgHubMatch | null) {
  if (eventSlug !== "all") {
    return dataset.events.find((event) => event.slug === eventSlug)?.name ?? eventSlug;
  }

  const activeEvent =
    dataset.events.find((event) => event.status === "ongoing") ??
    dataset.events.find((event) => event.status === "upcoming") ??
    dataset.events[0] ??
    null;

  return latestMatch?.eventName ?? activeEvent?.name ?? "All published PUBG results";
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

function LeaderboardsLaunchState() {
  return (
    <main className="page-shell pb-12 pt-6">
      <div className="page-stack">
        <section className="overflow-hidden rounded-[32px] border border-white/[0.08] bg-[radial-gradient(circle_at_top_left,rgba(20,126,245,0.16),transparent_34%),linear-gradient(180deg,rgba(11,21,33,0.96),rgba(7,11,21,0.98))] p-6 sm:p-8">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-accent-blue-light">PUBG Leaderboards</p>
          <h1 className="mt-3 font-display text-3xl font-black uppercase text-white sm:text-4xl">
            Official leaderboards will appear here after published results go live
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-text-muted">
            Team and player boards unlock after Bravo publishes the first verified PUBG result set. Until then, use the public event board,
            team registration, and Discord updates to stay ready for the next lobby.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/events" className="btn-secondary">
              View Events
            </Link>
            <Link href="/teams/register" className="btn-primary">
              Register Team
            </Link>
            <a href={BRAVO_DISCORD_URL} target="_blank" rel="noreferrer" className="btn-discord">
              Join Discord
            </a>
          </div>
        </section>
      </div>
    </main>
  );
}

function TeamLeaderboardMobileCard({ row }: { row: PubgTeamBoardRow }) {
  return (
    <Link href={`/pubg/teams/${row.slug}`} className={`block rounded-[24px] border p-4 ${getLeaderboardSurface(row.rank)}`}>
      <div className="flex items-start gap-3">
        <RankBadge rank={row.rank} />
        <TeamAvatar name={row.name} imageUrl={row.logoUrl ?? undefined} size="md" />
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 font-display text-lg font-black uppercase text-white">{row.name}</p>
          <p className="mt-2 text-xs uppercase tracking-[0.16em] text-text-muted">{row.tag ? row.tag : "PUBG Team"}</p>
        </div>
      </div>
      <p className="mt-4 font-mono-stat text-xl text-accent-blue-light">{formatNumber(row.totalPoints)} Total Points</p>
      <p className="mt-2 text-sm text-text-muted">
        {formatNumber(row.kills)} Kills • {formatNumber(row.wins)} WWCD
      </p>
      <p className="mt-2 text-sm text-text-muted">
        {formatNumber(row.matches)} Matches • {formatNumber(row.placementPoints)} Placement Points
      </p>
      <p className="mt-2 text-sm text-text-muted">Damage: {formatDamageValue(row.damage)}</p>
    </Link>
  );
}

function PlayerLeaderboardMobileSummaryCard({ row }: { row: PubgPlayerBoardRow }) {
  return (
    <Link href={`/pubg/players/${row.slug}`} className={`block rounded-[24px] border p-4 ${getLeaderboardSurface(row.rank)}`}>
      <div className="flex items-start gap-3">
        <RankBadge rank={row.rank} />
        <TeamAvatar name={row.pubgName} imageUrl={row.avatarUrl ?? undefined} size="md" />
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 font-display text-lg font-black uppercase text-white">{row.pubgName}</p>
          <p className="mt-2 text-xs uppercase tracking-[0.16em] text-text-muted">{row.teamName ?? "Team TBD"}</p>
        </div>
      </div>
      <p className="mt-4 text-sm text-text-muted">
        {formatNumber(row.kills)} Kills • {formatNumber(row.assists)} Assists • {formatNumber(row.knocks)} Knocks
      </p>
      <p className="mt-2 text-sm text-text-muted">{formatDamageValue(row.damage)} Damage</p>
      <p className="mt-2 text-sm text-text-muted">Avg Kills: {formatDecimal(row.avgKills, 2)}</p>
      <p className="mt-2 text-sm text-text-muted">
        Best Match: {row.bestMatch ? `${row.bestMatch.kills}K on ${row.bestMatch.mapName}` : "Pending"}
      </p>
    </Link>
  );
}

export function PubgLeaderboardsRoute({ dataset, searchParams }: { dataset: PubgHubDataset; searchParams: SearchParamDictionary }) {
  const view = readSearchParam(searchParams.view, "teams");
  const requestedEventSlug = readSearchParam(searchParams.event, "all");
  const eventSlug =
    requestedEventSlug === "all" || dataset.events.some((event) => event.slug === requestedEventSlug) ? requestedEventSlug : "all";
  const mapName = readSearchParam(searchParams.map, "all");
  const publicTeams = getPublicPubgTeams(dataset);
  const publicPlayers = getPublicPubgPlayers(dataset, publicTeams);
  const teamLookup = buildTeamLookup(publicTeams);
  const filteredMatches = filterMatches(dataset, {
    eventSlug: eventSlug === "all" ? undefined : eventSlug,
    mapName,
  });
  const latestFilteredMatch = getLatestFilteredMatch(filteredMatches);
  const leaderboardLensLabel = getLeaderboardLensLabel(dataset, eventSlug, latestFilteredMatch);
  const leaderboardUpdatedLabel = latestFilteredMatch
    ? `After published Match ${latestFilteredMatch.matchNumber} on ${latestFilteredMatch.mapName}`
    : "Generated from the current published results set";
  const filteredPublicTeams =
    eventSlug === "all"
      ? publicTeams
      : publicTeams.filter((team) => team.eventStats.some((eventStat) => eventStat.eventSlug === eventSlug));
  const filteredPublicPlayers =
    eventSlug === "all"
      ? publicPlayers
      : publicPlayers.filter((player) => player.eventStats.some((eventStat) => eventStat.eventSlug === eventSlug));
  const teamBoardSource = filteredPublicTeams.length > 0 ? filteredPublicTeams : publicTeams;
  const playerBoardSource = filteredPublicPlayers.length > 0 ? filteredPublicPlayers : publicPlayers;
  const teamBoard = teamBoardSource.map((team, index) => toTeamBoardRow(team, index + 1));
  const playerBoard = playerBoardSource.map((player, index) => toPlayerBoardRow(player, index + 1));
  const mapOptions = dedupeMaps(dataset.matches);
  const hasLeaderboardCoverage = teamBoard.length > 0 || playerBoard.length > 0;

  if (!hasLeaderboardCoverage) {
    return <LeaderboardsLaunchState />;
  }

  return (
    <main className="page-shell pb-12 pt-6">
      <div className="page-stack">
        <PageHero
          badge="Official PUBG Leaderboards"
          title={<>Official PUBG Leaderboards</>}
          description="Track team standings, top fraggers, damage leaders, and published tournament results."
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
            {
              label: "Matches In View",
              value: filteredMatches.length,
              tone: "blue",
            },
            { label: "Ranked Teams", value: teamBoard.length, tone: "green" },
            {
              label: "Ranked Players",
              value: playerBoard.length,
              tone: "yellow",
            },
            {
              label: "Maps",
              value: mapName === "all" ? mapOptions.length : 1,
              tone: "red",
            },
          ]}
          aside={
            <div className="space-y-4">
              <div>
                <p className="section-title">Leaderboard View</p>
                <h2 className="mt-2 font-display text-2xl font-black uppercase text-white">Switch between teams and players</h2>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link
                  href={buildHref("/pubg/leaderboards", {
                    view: "teams",
                    event: eventSlug === "all" ? undefined : eventSlug,
                    map: mapName === "all" ? undefined : mapName,
                  })}
                  className={`rounded-full border px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.12em] ${view === "teams" ? "border-accent-blue/30 bg-accent-blue/10 text-accent-blue" : "border-white/10 bg-bg-primary text-text-muted"}`}
                >
                  Team board
                </Link>
                <Link
                  href={buildHref("/pubg/leaderboards", {
                    view: "players",
                    event: eventSlug === "all" ? undefined : eventSlug,
                    map: mapName === "all" ? undefined : mapName,
                  })}
                  className={`rounded-full border px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.12em] ${view === "players" ? "border-accent-blue/30 bg-accent-blue/10 text-accent-blue" : "border-white/10 bg-bg-primary text-text-muted"}`}
                >
                  Player board
                </Link>
              </div>
              <div className="rounded-card border border-white/[0.08] bg-black/20 p-4 text-sm text-text-muted">
                {sourceLabel(dataset.source)}
              </div>
              <div className="rounded-card border border-white/[0.08] bg-black/20 p-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-text-muted">Current Lens</p>
                <p className="mt-2 text-sm font-semibold text-white">{leaderboardLensLabel}</p>
                <p className="mt-4 text-[10px] font-bold uppercase tracking-[0.18em] text-text-muted">Last Updated</p>
                <p className="mt-2 text-sm text-white">{leaderboardUpdatedLabel}</p>
                <p className="mt-2 text-xs text-text-muted">Dataset generated {formatDateTime(dataset.generatedAt)}</p>
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
            Team rankings stay aligned with the official Bravo order used across the hub and the full event boards.
          </div>
          <div className="rounded-card border border-white/[0.08] bg-bg-primary px-4 py-3 text-sm text-text-muted">
            Player rankings stay aligned with the same published order used on the hub previews and event results.
          </div>
        </FilterBar>

        <ActiveFilterSummary
          items={[
            {
              label: "View",
              value: view === "teams" ? "Team Board" : "Player Board",
            },
            {
              label: "Event",
              value: eventSlug === "all" ? null : (dataset.events.find((event) => event.slug === eventSlug)?.name ?? eventSlug),
            },
            { label: "Map", value: mapName === "all" ? null : mapName },
          ]}
        />

        {view === "teams" ? (
          teamBoard.length === 0 ? (
            <section className="esports-card p-6">
              <EmptyState
                title="Leaderboard data is not available yet"
                description="Leaderboard data will be available once matches have been completed and officially published."
              />
            </section>
          ) : (
            <section className="esports-card overflow-hidden !p-0">
              <div className="border-b border-white/[0.08] px-5 py-4">
                <SectionHeader
                  eyebrow="Team Board"
                  title="Official team leaderboard"
                  description="Rank, team, matches, WWCD, placement points, kills, damage, total points, and recent trend from the published board."
                />
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
                    <span className="text-right">Placement Points</span>
                    <span className="text-right">Kills</span>
                    <span className="text-right">Damage</span>
                    <span className="text-right">Total Points</span>
                    <span className="text-right">Trend</span>
                  </div>
                  {teamBoard.map((row) => (
                    <div
                      key={row.teamId}
                      className={`grid grid-cols-[72px,minmax(0,1.8fr),90px,76px,98px,84px,112px,102px,120px] items-center gap-4 rounded-[22px] border px-4 py-4 ${getLeaderboardSurface(row.rank)}`}
                    >
                      <RankBadge rank={row.rank} />
                      <Link
                        href={`/pubg/teams/${row.slug}`}
                        className="flex min-w-0 items-center gap-3 rounded-card transition hover:text-accent-blue"
                      >
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
                      <span className="text-right font-mono-stat text-white">{formatDamageValue(row.damage)}</span>
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
        ) : playerBoard.length === 0 ? (
          <section className="esports-card p-6">
            <EmptyState
              title="Player statistics are currently unavailable"
              description="Please check back after upcoming matches are completed."
            />
          </section>
        ) : (
          <section className="esports-card overflow-hidden !p-0">
            <div className="border-b border-white/[0.08] px-5 py-4">
              <SectionHeader
                eyebrow="Player Board"
                title="Official player leaderboard"
                description="Rank, player, team, kills, damage, assists, knocks, average kills, and best-match context from the published board."
              />
            </div>
            <div className="grid gap-3 p-4 md:hidden">
              {playerBoard.map((row) => (
                <PlayerLeaderboardMobileSummaryCard key={row.playerId} row={row} />
              ))}
            </div>
            <div className="hidden px-4 pb-4 md:block">
              <div className="space-y-3">
                <div className="grid grid-cols-[72px,minmax(0,1.5fr),minmax(0,1.2fr),84px,110px,86px,86px,96px,minmax(0,1.2fr)] gap-4 rounded-[20px] border border-white/[0.08] bg-black/20 px-4 py-3 text-[10px] font-black uppercase tracking-[0.18em] text-text-muted">
                  <span>Rank</span>
                  <span>Player</span>
                  <span>Team</span>
                  <span className="text-right">Kills</span>
                  <span className="text-right">Damage</span>
                  <span className="text-right">Assists</span>
                  <span className="text-right">Knocks</span>
                  <span className="text-right">Avg Kills</span>
                  <span>Best Match</span>
                </div>
                {playerBoard.map((row) => (
                  <div
                    key={row.playerId}
                    className={`grid grid-cols-[72px,minmax(0,1.5fr),minmax(0,1.2fr),84px,110px,86px,86px,96px,minmax(0,1.2fr)] items-center gap-4 rounded-[22px] border px-4 py-4 ${getLeaderboardSurface(row.rank)}`}
                  >
                    <RankBadge rank={row.rank} />
                    <Link
                      href={`/pubg/players/${row.slug}`}
                      className="flex min-w-0 items-center gap-3 rounded-card transition hover:text-accent-blue"
                    >
                      <TeamAvatar name={row.pubgName} imageUrl={row.avatarUrl ?? undefined} size="sm" />
                      <div className="min-w-0">
                        <p className="font-semibold text-white">{row.pubgName}</p>
                        <p className="text-xs uppercase tracking-[0.16em] text-text-muted">{row.teamName ?? "Team TBD"}</p>
                      </div>
                    </Link>
                    <div className="min-w-0 text-sm text-white">
                      {row.teamName ? (
                        row.teamId ? (
                          <Link href={`/pubg/teams/${teamLookup.get(row.teamId)?.slug ?? row.teamId}`} className="hover:text-accent-blue">
                            {row.teamName}
                          </Link>
                        ) : (
                          row.teamName
                        )
                      ) : (
                        "Team TBD"
                      )}
                    </div>
                    <span className="text-right font-mono-stat text-white">{formatNumber(row.kills)}</span>
                    <span className="text-right font-mono-stat text-white">{formatDamageValue(row.damage)}</span>
                    <span className="text-right font-mono-stat text-white">{formatNumber(row.assists)}</span>
                    <span className="text-right font-mono-stat text-white">{formatNumber(row.knocks)}</span>
                    <span className="text-right font-mono-stat text-accent-blue-light">{formatDecimal(row.avgKills, 2)}</span>
                    <span className="text-sm text-text-muted">
                      {row.bestMatch
                        ? `${row.bestMatch.kills}K • ${row.bestMatch.mapName} • Match ${row.bestMatch.matchNumber}`
                        : "Pending"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
