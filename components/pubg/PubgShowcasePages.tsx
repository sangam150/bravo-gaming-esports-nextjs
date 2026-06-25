import Link from "next/link";
import TeamAvatar from "@/components/ui/TeamAvatar";
import type {
  PubgHubDataset,
  PubgHubMatch,
  PubgHubPlayer,
  PubgHubRecentMatch,
  PubgHubTeam,
} from "@/lib/pubg-hub";
import {
  buildHref,
  DualTrendChart,
  FormPill,
  formatDateRange,
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
  TeamIdentity,
  TrendBars,
} from "@/components/pubg/PubgHubUI";

type SearchParamDictionary = Record<string, string | string[] | undefined>;

type TeamBoardRow = {
  rank: number;
  teamId: string;
  name: string;
  tag?: string | null;
  logoUrl?: string | null;
  matches: number;
  wins: number;
  kills: number;
  damage: number;
  placementPoints: number;
  killPoints: number;
  totalPoints: number;
  avgPlacement: number;
  trend: number[];
};

type PlayerBoardRow = {
  rank: number;
  playerId: string;
  pubgName: string;
  avatarUrl?: string | null;
  teamId?: string | null;
  teamName?: string | null;
  matches: number;
  wins: number;
  kills: number;
  assists: number;
  knocks: number;
  damage: number;
  avgKills: number;
  avgDamage: number;
  trend: number[];
};

function joinClasses(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

function dedupeMaps(matches: PubgHubMatch[]) {
  return Array.from(new Set(matches.map((match) => match.mapName))).sort((firstValue, secondValue) =>
    firstValue.localeCompare(secondValue)
  );
}

function filterMatches(dataset: PubgHubDataset, options: { eventSlug?: string; mapName?: string }) {
  return dataset.matches.filter((match) => {
    if (options.eventSlug && match.eventSlug !== options.eventSlug) return false;
    if (options.mapName && options.mapName !== "all" && match.mapName !== options.mapName) return false;
    return true;
  });
}

function buildTeamLookup(dataset: PubgHubDataset) {
  return new Map(dataset.teams.map((team) => [team.id, team] as const));
}

function buildPlayerLookup(dataset: PubgHubDataset) {
  return new Map(dataset.players.map((player) => [player.id, player] as const));
}

function summarizeTeamsFromMatches(matches: PubgHubMatch[], teamLookup: Map<string, PubgHubTeam>) {
  const summary = new Map<string, Omit<TeamBoardRow, "rank" | "name" | "tag" | "logoUrl"> & { totalPlacement: number }>();

  for (const match of matches) {
    for (const teamResult of match.teamResults) {
      const current = summary.get(teamResult.teamId) ?? {
        teamId: teamResult.teamId,
        matches: 0,
        wins: 0,
        kills: 0,
        damage: 0,
        placementPoints: 0,
        killPoints: 0,
        totalPoints: 0,
        avgPlacement: 0,
        totalPlacement: 0,
        trend: [],
      };

      current.matches += 1;
      current.wins += teamResult.wwcd ? 1 : 0;
      current.kills += teamResult.kills;
      current.placementPoints += teamResult.placementPoints;
      current.killPoints += teamResult.killPoints;
      current.totalPoints += teamResult.totalPoints;
      current.totalPlacement += teamResult.placement;
      current.trend.push(teamResult.totalPoints);
      current.damage += match.playerResults
        .filter((playerResult) => playerResult.teamId === teamResult.teamId)
        .reduce((sum, playerResult) => sum + playerResult.damage, 0);

      summary.set(teamResult.teamId, current);
    }
  }

  return Array.from(summary.values())
    .map((row) => {
      const team = teamLookup.get(row.teamId);

      return {
        rank: 0,
        teamId: row.teamId,
        name: team?.name ?? row.teamId,
        tag: team?.tag ?? null,
        logoUrl: team?.logoUrl ?? null,
        matches: row.matches,
        wins: row.wins,
        kills: row.kills,
        damage: row.damage,
        placementPoints: row.placementPoints,
        killPoints: row.killPoints,
        totalPoints: row.totalPoints,
        avgPlacement: row.totalPlacement / Math.max(row.matches, 1),
        trend: row.trend.slice(-6),
      } satisfies TeamBoardRow;
    })
    .sort(
      (firstValue, secondValue) =>
        secondValue.totalPoints - firstValue.totalPoints ||
        secondValue.kills - firstValue.kills ||
        firstValue.avgPlacement - secondValue.avgPlacement ||
        firstValue.name.localeCompare(secondValue.name)
    )
    .map((row, index) => ({
      ...row,
      rank: index + 1,
    }));
}

function summarizePlayersFromMatches(matches: PubgHubMatch[], playerLookup: Map<string, PubgHubPlayer>) {
  const summary = new Map<string, Omit<PlayerBoardRow, "rank" | "pubgName" | "avatarUrl" | "teamId" | "teamName" | "avgKills" | "avgDamage">>();

  for (const match of matches) {
    const winningTeamId = match.winnerTeamId;

    for (const playerResult of match.playerResults) {
      const current = summary.get(playerResult.playerId) ?? {
        playerId: playerResult.playerId,
        matches: 0,
        wins: 0,
        kills: 0,
        assists: 0,
        knocks: 0,
        damage: 0,
        trend: [],
      };

      current.matches += 1;
      current.wins += playerResult.teamId === winningTeamId ? 1 : 0;
      current.kills += playerResult.kills;
      current.assists += playerResult.assists;
      current.knocks += playerResult.knocks;
      current.damage += playerResult.damage;
      current.trend.push(playerResult.kills);

      summary.set(playerResult.playerId, current);
    }
  }

  return Array.from(summary.values())
    .map((row) => {
      const player = playerLookup.get(row.playerId);

      return {
        rank: 0,
        playerId: row.playerId,
        pubgName: player?.pubgName ?? row.playerId,
        avatarUrl: player?.avatarUrl ?? null,
        teamId: player?.currentTeamId ?? null,
        teamName: player?.currentTeamName ?? null,
        matches: row.matches,
        wins: row.wins,
        kills: row.kills,
        assists: row.assists,
        knocks: row.knocks,
        damage: row.damage,
        avgKills: row.kills / Math.max(row.matches, 1),
        avgDamage: row.damage / Math.max(row.matches, 1),
        trend: row.trend.slice(-6),
      } satisfies PlayerBoardRow;
    })
    .sort(
      (firstValue, secondValue) =>
        secondValue.kills - firstValue.kills ||
        secondValue.damage - firstValue.damage ||
        secondValue.assists - firstValue.assists ||
        firstValue.pubgName.localeCompare(secondValue.pubgName)
    )
    .map((row, index) => ({
      ...row,
      rank: index + 1,
    }));
}

function FilterBar({
  children,
  action,
}: {
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <section className="esports-card p-3.5">
      <form method="get" className="grid gap-2.5 xl:grid-cols-[repeat(4,minmax(0,1fr))_auto]">
        {children}
        <div className="flex items-end gap-2">
          <button type="submit" className="btn-primary h-11">
            Apply Filters
          </button>
          {action}
        </div>
      </form>
    </section>
  );
}

function ProfileTabs({
  pathname,
  currentTab,
  tabs,
  extras,
}: {
  pathname: string;
  currentTab: string;
  tabs: Array<{ label: string; value: string }>;
  extras?: Record<string, string | undefined>;
}) {
  return (
    <div className="tab-bar">
      {tabs.map((tab) => (
        <Link
          key={tab.value}
          href={buildHref(pathname, { ...extras, tab: tab.value === "overview" ? undefined : tab.value })}
          className={`tab-item ${currentTab === tab.value ? "tab-item-active" : ""}`}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  );
}

export function PubgLeaderboardsShowcasePage({
  dataset,
  searchParams,
}: {
  dataset: PubgHubDataset;
  searchParams: SearchParamDictionary;
}) {
  const view = readSearchParam(searchParams.view, "teams");
  const tab = readSearchParam(searchParams.tab, "overall");
  const eventSlug = readSearchParam(searchParams.event, "all");
  const season = readSearchParam(searchParams.season, eventSlug);
  const mode = readSearchParam(searchParams.mode, "all");
  const mapName = readSearchParam(searchParams.map, "all");
  const teamLookup = buildTeamLookup(dataset);
  const playerLookup = buildPlayerLookup(dataset);
  const filteredMatches = filterMatches(dataset, {
    eventSlug: season === "all" ? undefined : season,
    mapName,
  });
  const teamBoard = summarizeTeamsFromMatches(filteredMatches, teamLookup);
  const playerBoard = summarizePlayersFromMatches(filteredMatches, playerLookup);
  const mapOptions = dedupeMaps(dataset.matches);

  const sortedTeamBoard =
    tab === "kills"
      ? [...teamBoard].sort((firstValue, secondValue) => secondValue.kills - firstValue.kills || secondValue.totalPoints - firstValue.totalPoints)
      : tab === "placement"
        ? [...teamBoard].sort((firstValue, secondValue) => firstValue.avgPlacement - secondValue.avgPlacement || secondValue.totalPoints - firstValue.totalPoints)
        : tab === "damage"
          ? [...teamBoard].sort((firstValue, secondValue) => secondValue.damage - firstValue.damage || secondValue.totalPoints - firstValue.totalPoints)
          : teamBoard;

  const sortedPlayerBoard =
    tab === "damage"
      ? [...playerBoard].sort((firstValue, secondValue) => secondValue.damage - firstValue.damage || secondValue.kills - firstValue.kills)
      : tab === "kills"
        ? [...playerBoard].sort((firstValue, secondValue) => secondValue.kills - firstValue.kills || secondValue.damage - firstValue.damage)
        : [...playerBoard].sort((firstValue, secondValue) => secondValue.avgKills - firstValue.avgKills || secondValue.kills - firstValue.kills);

  return (
    <main className="page-shell pb-10 pt-4">
      <div className="page-stack">
        <PageHero
          badge="02. Leaderboards Page"
          title={
            <>
              Leaderboards
            </>
          }
          description="Season-based PUBG standings with compact filters and tabbed ranking views."
          actions={
            <>
              <Link href="/pubg/results" className="btn-secondary">
                Match Results
              </Link>
              <Link href="/pubg/compare" className="btn-primary">
                Compare
              </Link>
            </>
          }
          stats={[
            { label: "Matches", value: filteredMatches.length, tone: "blue" },
            { label: "Teams", value: teamBoard.length, tone: "green" },
            { label: "Players", value: playerBoard.length, tone: "yellow" },
            { label: "Maps", value: mapName === "all" ? mapOptions.length : 1, tone: "red" },
          ]}
          aside={
            <div className="space-y-3">
              <div>
                <p className="section-title">Board Tabs</p>
                <h2 className="mt-2 font-display text-xl font-black uppercase text-white">Overall, kills, placement, damage</h2>
              </div>
              <div className="tab-bar">
                {["overall", "kills", "placement", "damage"].map((item) => (
                  <Link
                    key={item}
                    href={buildHref("/pubg/leaderboards", {
                      view,
                      tab: item === "overall" ? undefined : item,
                      season: season === "all" ? undefined : season,
                      mode: mode === "all" ? undefined : mode,
                      map: mapName === "all" ? undefined : mapName,
                    })}
                    className={`tab-item ${tab === item ? "tab-item-active" : ""}`}
                  >
                    {item}
                  </Link>
                ))}
              </div>
              <div className="flex gap-2">
                <Link
                  href={buildHref("/pubg/leaderboards", { view: "teams", tab, season: season === "all" ? undefined : season, mode: mode === "all" ? undefined : mode, map: mapName === "all" ? undefined : mapName })}
                  className={`tab-item ${view === "teams" ? "tab-item-active" : "rounded-[14px] border border-white/10 bg-black/10"}`}
                >
                  Team board
                </Link>
                <Link
                  href={buildHref("/pubg/leaderboards", { view: "players", tab, season: season === "all" ? undefined : season, mode: mode === "all" ? undefined : mode, map: mapName === "all" ? undefined : mapName })}
                  className={`tab-item ${view === "players" ? "tab-item-active" : "rounded-[14px] border border-white/10 bg-black/10"}`}
                >
                  Player board
                </Link>
              </div>
            </div>
          }
        />

        <FilterBar
          action={
            <Link href={buildHref("/pubg/leaderboards", { view })} className="btn-secondary h-10">
              Reset
            </Link>
          }
        >
          <input type="hidden" name="view" value={view} />
          <input type="hidden" name="tab" value={tab} />
          <select name="season" defaultValue={season} className="input-esports h-10">
            <option value="all">Season / Tournament</option>
            {dataset.events.map((event) => (
              <option key={event.id} value={event.slug}>
                {event.name}
              </option>
            ))}
          </select>
          <select name="mode" defaultValue={mode} className="input-esports h-10">
            <option value="all">All modes</option>
            <option value="tpp">TPP</option>
            <option value="fpp">FPP</option>
            <option value="squad">Squad</option>
          </select>
          <select name="map" defaultValue={mapName} className="input-esports h-10">
            <option value="all">All maps</option>
            {mapOptions.map((map) => (
              <option key={map} value={map}>
                {map}
              </option>
            ))}
          </select>
        </FilterBar>

        {view === "teams" ? (
          <section className="esports-card overflow-hidden !p-0">
            <div className="border-b border-white/[0.06] px-4 py-3.5">
              <SectionHeader
                eyebrow="Team Board"
                title="Compact standings table"
                description="Rank, matches, WWCD, placement, kills, total points, and trend in one competitive scan."
              />
            </div>
            <div className="table-scroll">
              <table className="data-table min-w-full">
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Team</th>
                    <th className="text-right">Matches</th>
                    <th className="text-right">WWCD</th>
                    <th className="text-right">Placement</th>
                    <th className="text-right">Kills</th>
                    <th className="text-right">Damage</th>
                    <th className="text-right">Total</th>
                    <th className="text-right">Trend</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedTeamBoard.map((row, index) => (
                    <tr key={row.teamId}>
                      <td>
                        <RankBadge rank={index + 1} />
                      </td>
                      <td>
                        <Link href={`/pubg/teams/${teamLookup.get(row.teamId)?.slug ?? row.teamId}`} className="flex items-center gap-3 hover:text-accent-blue">
                          <TeamAvatar name={row.name} imageUrl={row.logoUrl ?? undefined} size="sm" />
                          <div>
                            <p className="font-semibold text-white">{row.name}</p>
                            <p className="text-xs uppercase tracking-[0.16em] text-text-muted">{row.tag ?? "PUBG Team"}</p>
                          </div>
                        </Link>
                      </td>
                      <td className="text-right">{formatNumber(row.matches)}</td>
                      <td className="text-right">{formatNumber(row.wins)}</td>
                      <td className="text-right">{formatNumber(row.placementPoints)}</td>
                      <td className="text-right">{formatNumber(row.kills)}</td>
                      <td className="text-right">{formatNumber(row.damage)}</td>
                      <td className="points-cell text-right">{formatNumber(row.totalPoints)}</td>
                      <td className="min-w-28">
                        <TrendBars values={row.trend} tone="blue" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ) : (
          <section className="esports-card overflow-hidden !p-0">
            <div className="border-b border-white/[0.06] px-4 py-3.5">
              <SectionHeader
                eyebrow="Player Board"
                title="Fraggers, damage, and recent form"
                description="Player leaderboard rows keep recent output readable without hiding team context."
              />
            </div>
            <div className="table-scroll">
              <table className="data-table min-w-full">
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Player</th>
                    <th>Team</th>
                    <th className="text-right">Matches</th>
                    <th className="text-right">Wins</th>
                    <th className="text-right">Kills</th>
                    <th className="text-right">Assists</th>
                    <th className="text-right">Damage</th>
                    <th className="text-right">Trend</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedPlayerBoard.map((row, index) => (
                    <tr key={row.playerId}>
                      <td>
                        <RankBadge rank={index + 1} />
                      </td>
                      <td>
                        <Link href={`/pubg/players/${playerLookup.get(row.playerId)?.slug ?? row.playerId}`} className="flex items-center gap-3 hover:text-accent-blue">
                          <TeamAvatar name={row.pubgName} imageUrl={row.avatarUrl ?? undefined} size="sm" />
                          <div>
                            <p className="font-semibold text-white">{row.pubgName}</p>
                            <p className="text-xs uppercase tracking-[0.16em] text-text-muted">{formatDecimal(row.avgKills, 2)} avg kills</p>
                          </div>
                        </Link>
                      </td>
                      <td>
                        {row.teamName && row.teamId ? (
                          <Link href={`/pubg/teams/${teamLookup.get(row.teamId)?.slug ?? row.teamId}`} className="text-white hover:text-accent-blue">
                            {row.teamName}
                          </Link>
                        ) : (
                          row.teamName ?? "Team TBD"
                        )}
                      </td>
                      <td className="text-right">{formatNumber(row.matches)}</td>
                      <td className="text-right">{formatNumber(row.wins)}</td>
                      <td className="text-right">{formatNumber(row.kills)}</td>
                      <td className="text-right">{formatNumber(row.assists)}</td>
                      <td className="text-right">{formatNumber(row.damage)}</td>
                      <td className="min-w-28">
                        <TrendBars values={row.trend} tone="blue" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

export function PubgTeamProfileShowcasePage({
  team,
  dataset,
  searchParams,
}: {
  team: PubgHubTeam;
  dataset: PubgHubDataset;
  searchParams: SearchParamDictionary;
}) {
  const tab = readSearchParam(searchParams.tab, "overview");
  const eventId = readSearchParam(searchParams.event, "all");
  const filteredMatches = eventId === "all" ? team.recentMatches : team.recentMatches.filter((match) => match.eventId === eventId);
  const filteredEventStats = eventId === "all" ? team.eventStats : team.eventStats.filter((item) => item.eventId === eventId);
  const bestMap = [...team.mapStats].sort((firstValue, secondValue) => secondValue.points - firstValue.points || secondValue.kills - firstValue.kills)[0] ?? null;
  const averageRecentPoints =
    team.recentPoints.length > 0
      ? team.recentPoints.reduce((sum, value) => sum + value, 0) / team.recentPoints.length
      : 0;
  const podiumEvents = team.eventStats.filter((eventStat) => (eventStat.rank ?? Number.POSITIVE_INFINITY) <= 3).length;

  return (
    <main className="page-shell pb-12 pt-6">
      <div className="page-stack">
        <PageHero
          badge="04. Team Page"
          title={
            <>
              {team.name}
              <br />
              team form and event profile
            </>
          }
          description="Overview, roster, matches, statistics, and achievement context stay on one compact public team page backed by the Bravo PUBG dataset."
          actions={
            <>
              <Link href="/pubg/teams" className="btn-secondary">
                Back to Teams
              </Link>
              <Link href={buildHref("/pubg/compare", { mode: "teams", sideA: team.id })} className="btn-primary">
                Compare Team
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
              <div className="rounded-[22px] border border-white/[0.06] bg-black/15 p-4">
                <div className="flex items-center gap-4">
                  <TeamAvatar name={team.name} imageUrl={team.logoUrl ?? undefined} size="lg" />
                  <div>
                    <p className="font-display text-2xl font-black uppercase text-white">{team.name}</p>
                    <p className="text-sm uppercase tracking-[0.16em] text-text-muted">{team.region ?? "Nepal"}</p>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <FormPill label={team.formLabel} />
                  {team.slotNumber ? (
                    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-text-muted">
                      Slot {team.slotNumber}
                    </span>
                  ) : null}
                  {bestMap ? (
                    <span className="rounded-full border border-accent-blue/20 bg-accent-blue/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-accent-blue-light">
                      Best map {bestMap.map}
                    </span>
                  ) : null}
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <MetricCard label="Active Roster" value={team.currentRoster.length} compact tone="blue" />
                <MetricCard label="Podium Events" value={podiumEvents} compact tone="green" />
                <MetricCard label="Avg Recent Pts" value={formatDecimal(averageRecentPoints, 1)} compact tone="yellow" />
                <MetricCard label="Map Edge" value={bestMap?.map ?? "Pending"} compact tone="red" />
              </div>
            </div>
          }
        />

        <ProfileTabs
          pathname={`/pubg/teams/${team.slug}`}
          currentTab={tab}
          tabs={[
            { label: "Overview", value: "overview" },
            { label: "Roster", value: "roster" },
            { label: "Matches", value: "matches" },
            { label: "Statistics", value: "statistics" },
            { label: "Achievements", value: "achievements" },
          ]}
          extras={{ event: eventId === "all" ? undefined : eventId }}
        />

        <FilterBar
          action={
            <Link href={`/pubg/teams/${team.slug}`} className="btn-secondary h-11">
              All Events
            </Link>
          }
        >
          <input type="hidden" name="tab" value={tab} />
          <select name="event" defaultValue={eventId} className="input-esports h-11">
            <option value="all">All events</option>
            {team.eventStats.map((eventStat) => (
              <option key={eventStat.eventId} value={eventStat.eventId}>
                {eventStat.eventName}
              </option>
            ))}
          </select>
          <div className="rounded-[16px] border border-white/[0.06] bg-black/15 px-4 py-3 text-sm text-text-muted">
            Event filters tighten recent matches and team stat tables without changing the underlying route.
          </div>
          <div className="rounded-[16px] border border-white/[0.06] bg-black/15 px-4 py-3 text-sm text-text-muted">
            Current roster always reflects the latest public squad, while match history stays tied to the represented event.
          </div>
          <div className="rounded-[16px] border border-white/[0.06] bg-black/15 px-4 py-3 text-sm text-text-muted">
            Roster history remains public-facing scouting context instead of buried admin-only data.
          </div>
        </FilterBar>

        {tab === "overview" ? (
          <>
            <section className="grid gap-6 xl:grid-cols-[1.1fr,0.9fr]">
              <div className="esports-card p-6">
                <SectionHeader eyebrow="Roster" title="Current lineup" description="Every live roster slot keeps its player profile one click away." />
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  {team.currentRoster.map((member) => (
                    <div key={member.playerId} className="rounded-[18px] border border-white/[0.06] bg-black/15 p-4">
                      <div className="flex items-center gap-3">
                        <TeamAvatar name={member.pubgName} imageUrl={member.avatarUrl ?? undefined} size="sm" />
                        <div>
                          <p className="font-semibold text-white">{member.pubgName}</p>
                          <p className="text-xs uppercase tracking-[0.16em] text-text-muted">{member.role}</p>
                        </div>
                      </div>
                      <div className="mt-4">
                        <Link href={`/pubg/players/${member.playerId}`} className="text-[11px] font-black uppercase tracking-[0.14em] text-accent-blue hover:text-white">
                          Open player profile
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="esports-card p-6">
                <SectionHeader eyebrow="Recent Trend" title="Points and kills pressure" description="A compact trend read keeps form visible before users dive into full match history." />
                <div className="mt-5 space-y-5">
                  <div className="rounded-[18px] border border-white/[0.06] bg-black/15 p-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-text-muted">Recent points</p>
                    <div className="mt-3">
                      <TrendBars values={team.recentPoints} tone="blue" />
                    </div>
                  </div>
                  <div className="rounded-[18px] border border-white/[0.06] bg-black/15 p-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-text-muted">Recent placements</p>
                    <div className="mt-3">
                      <TrendBars values={team.recentPlacements.map((placement) => Math.max(1, 18 - placement))} tone="green" />
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section className="esports-card overflow-hidden !p-0">
              <div className="border-b border-white/[0.06] px-5 py-4">
                <SectionHeader eyebrow="Recent Matches" title="Latest team activity" description="Recent match rows stay on the profile so the standings never feel detached from the actual lobby output." />
              </div>
              <div className="p-5">
                <RecentMatchCards matches={filteredMatches as PubgHubRecentMatch[]} />
              </div>
            </section>
          </>
        ) : null}

        {tab === "roster" ? (
          <section className="grid gap-6 xl:grid-cols-[1fr,1fr]">
            <div className="esports-card p-6">
              <SectionHeader eyebrow="Starting Four" title="Roster cards" description="Active roster entries are always shown from the current public team profile." />
              <div className="mt-5 grid gap-3">
                {team.currentRoster.map((member) => (
                  <div key={member.playerId} className="rounded-[18px] border border-white/[0.06] bg-black/15 p-4">
                    <div className="flex items-center gap-3">
                      <TeamAvatar name={member.pubgName} imageUrl={member.avatarUrl ?? undefined} size="sm" />
                      <div>
                        <p className="font-semibold text-white">{member.pubgName}</p>
                        <p className="text-xs uppercase tracking-[0.16em] text-text-muted">{member.role}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="esports-card p-6">
              <SectionHeader eyebrow="Roster History" title="Previous overlays and swaps" description="Historical roster movement stays visible as scouting context." />
              <div className="mt-5 grid gap-3">
                {team.rosterHistory.map((entry) => (
                  <div key={`${entry.playerId}-${entry.startDate}`} className="rounded-[18px] border border-white/[0.06] bg-black/15 px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold text-white">{entry.pubgName}</p>
                        <p className="text-xs uppercase tracking-[0.16em] text-text-muted">{entry.status}</p>
                      </div>
                      <p className="text-xs uppercase tracking-[0.16em] text-text-muted">
                        {entry.endDate ? `${entry.startDate} - ${entry.endDate}` : `${entry.startDate} - Current`}
                      </p>
                    </div>
                  </div>
                ))}
                {team.rosterHistory.length === 0 ? (
                  <div className="rounded-[18px] border border-dashed border-white/10 bg-black/15 px-4 py-5 text-sm text-text-muted">
                    No previous roster overlays are recorded yet.
                  </div>
                ) : null}
              </div>
            </div>
          </section>
        ) : null}

        {tab === "matches" ? (
          <section className="esports-card p-6">
            <SectionHeader eyebrow="Matches" title="Recent team match feed" description="Recent matches stay available as cards so the page reads cleanly on mobile and desktop." />
            <div className="mt-5">
              <RecentMatchCards matches={filteredMatches as PubgHubRecentMatch[]} />
            </div>
          </section>
        ) : null}

        {tab === "statistics" ? (
          <>
            <section className="grid gap-6 xl:grid-cols-[1.15fr,0.85fr]">
              <MapStatsTable stats={team.mapStats} title="Map performance" description="Kills, wins, damage, and total points broken down by map." />
              <div className="esports-card p-6">
                <SectionHeader eyebrow="Event Splits" title="Event-specific output" description="Every tracked event contribution remains visible even after the homepage cycle moves on." />
                <div className="mt-5 table-scroll">
                  <table className="data-table min-w-full">
                    <thead>
                      <tr>
                        <th>Event</th>
                        <th>Status</th>
                        <th className="text-right">Kills</th>
                        <th className="text-right">Wins</th>
                        <th className="text-right">Points</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredEventStats.map((eventStat) => (
                        <tr key={eventStat.eventId}>
                          <td className="font-semibold text-white">{eventStat.eventName}</td>
                          <td>{eventStat.eventStatus}</td>
                          <td className="text-right">{formatNumber(eventStat.kills)}</td>
                          <td className="text-right">{formatNumber(eventStat.wins)}</td>
                          <td className="points-cell text-right">{formatNumber(eventStat.totalPoints)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>

            <section className="grid gap-6 xl:grid-cols-2">
              <div className="esports-card p-6">
                <SectionHeader eyebrow="Trend Layer" title="Points versus kills" description="A quick dual-read of how the squad is converting lobbies lately." />
                <div className="mt-5">
                  <DualTrendChart firstValues={team.recentPoints} secondValues={team.recentKills} firstLabel="Points" secondLabel="Kills" />
                </div>
              </div>
              <div className="esports-card p-6">
                <SectionHeader eyebrow="Scouting Read" title="Placement profile" description="Radar view compresses the broad team profile into something fast to scan." />
                <div className="mt-5">
                  <RadarComparison
                    title="Team shape"
                    firstLabel={team.name}
                    secondLabel="Benchmark"
                    points={[
                      { label: "Kills", firstValue: team.kills, secondValue: Math.max(1, team.kills * 0.8) },
                      { label: "Wins", firstValue: team.wins, secondValue: Math.max(1, team.wins * 0.75) },
                      { label: "Points", firstValue: team.totalPoints, secondValue: Math.max(1, team.totalPoints * 0.82) },
                      { label: "Damage", firstValue: team.damage, secondValue: Math.max(1, team.damage * 0.78) },
                      { label: "Matches", firstValue: team.matches, secondValue: Math.max(1, team.matches * 0.9) },
                    ]}
                  />
                </div>
              </div>
            </section>
          </>
        ) : null}

        {tab === "achievements" ? (
          <section className="grid gap-6 xl:grid-cols-3">
            <MetricCard label="Podium Events" value={podiumEvents} tone="blue" />
            <MetricCard label="Best Map" value={bestMap?.map ?? "Pending"} tone="green" />
            <MetricCard label="Average Placement" value={formatDecimal(team.avgPlacement, 2)} tone="yellow" />
          </section>
        ) : null}
      </div>
    </main>
  );
}

export function PubgPlayerProfileShowcasePage({
  player,
  dataset,
  searchParams,
}: {
  player: PubgHubPlayer;
  dataset: PubgHubDataset;
  searchParams: SearchParamDictionary;
}) {
  const tab = readSearchParam(searchParams.tab, "overview");
  const eventId = readSearchParam(searchParams.event, "all");
  const filteredMatches = eventId === "all" ? player.recentMatches : player.recentMatches.filter((match) => match.eventId === eventId);
  const filteredEventStats = eventId === "all" ? player.eventStats : player.eventStats.filter((item) => item.eventId === eventId);
  const currentTeam = player.currentTeamId ? dataset.teams.find((team) => team.id === player.currentTeamId) ?? null : null;

  return (
    <main className="page-shell pb-12 pt-6">
      <div className="page-stack">
        <PageHero
          badge="05. Player Page"
          title={
            <>
              {player.pubgName}
              <br />
              player form and match output
            </>
          }
          description="Overview, match history, statistics, and achievements stay on one Bravo player profile with recent form, best match context, and event-specific output."
          actions={
            <>
              <Link href="/pubg/players" className="btn-secondary">
                Back to Players
              </Link>
              <Link href={buildHref("/pubg/compare", { mode: "players", sideA: player.id })} className="btn-primary">
                Compare Player
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
                {currentTeam ? (
                  <Link href={`/pubg/teams/${currentTeam.slug}`} className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-text-muted">
                    Open team
                  </Link>
                ) : null}
              </div>
              <div className="rounded-[18px] border border-white/[0.06] bg-black/15 p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-text-muted">Recent trend</p>
                <div className="mt-3">
                  <TrendBars values={player.recentTrend} tone="blue" />
                </div>
              </div>
            </div>
          }
        />

        <ProfileTabs
          pathname={`/pubg/players/${player.slug}`}
          currentTab={tab}
          tabs={[
            { label: "Overview", value: "overview" },
            { label: "Match History", value: "history" },
            { label: "Statistics", value: "statistics" },
            { label: "Achievements", value: "achievements" },
          ]}
          extras={{ event: eventId === "all" ? undefined : eventId }}
        />

        <FilterBar
          action={
            <Link href={`/pubg/players/${player.slug}`} className="btn-secondary h-11">
              All Events
            </Link>
          }
        >
          <input type="hidden" name="tab" value={tab} />
          <select name="event" defaultValue={eventId} className="input-esports h-11">
            <option value="all">All events</option>
            {player.eventStats.map((eventStat) => (
              <option key={eventStat.eventId} value={eventStat.eventId}>
                {eventStat.eventName}
              </option>
            ))}
          </select>
          <div className="rounded-[16px] border border-white/[0.06] bg-black/15 px-4 py-3 text-sm text-text-muted">
            Event filters tighten both the match feed and event statistics below.
          </div>
          <div className="rounded-[16px] border border-white/[0.06] bg-black/15 px-4 py-3 text-sm text-text-muted">
            Previous teams: {player.previousTeams.length > 0 ? player.previousTeams.join(" | ") : "No previous teams tracked"}
          </div>
          <div className="rounded-[16px] border border-white/[0.06] bg-black/15 px-4 py-3 text-sm text-text-muted">
            Public player pages keep team context, damage trends, and best-match reads in one place.
          </div>
        </FilterBar>

        {tab === "overview" ? (
          <section className="grid gap-6 xl:grid-cols-[1fr,1fr]">
            <div className="esports-card p-6">
              <SectionHeader eyebrow="Best Match" title="Peak output snapshot" description="Best-match context stays visible near the top for quick scouting." />
              {player.bestMatch ? (
                <div className="mt-5 rounded-[18px] border border-white/[0.06] bg-black/15 p-5">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-accent-blue">{player.bestMatch.eventName}</p>
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
                <div className="mt-5 rounded-[18px] border border-dashed border-white/10 bg-black/15 px-4 py-5 text-sm text-text-muted">
                  Best-match context appears once enough player rows have been published.
                </div>
              )}
            </div>

            <div className="esports-card p-6">
              <SectionHeader eyebrow="Fast Read" title="Ranking summary" description="A compact read of form, damage, and win share keeps the profile useful at a glance." />
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <MetricCard label="Matches" value={player.matches} compact />
                <MetricCard label="Wins" value={player.wins} compact tone="green" />
                <MetricCard label="Avg Damage" value={formatDecimal(player.avgDamage, 2)} compact tone="blue" />
                <MetricCard label="Form Score" value={formatDecimal(player.formScore, 2)} compact tone="yellow" />
              </div>
              <div className="mt-5">
                <DualTrendChart firstValues={player.recentTrend} secondValues={player.recentDamageTrend} firstLabel="Kills" secondLabel="Damage" />
              </div>
            </div>
          </section>
        ) : null}

        {tab === "history" ? (
          <>
            <section className="esports-card overflow-hidden !p-0">
              <div className="border-b border-white/[0.06] px-5 py-4">
                <SectionHeader eyebrow="Recent Matches" title="Match history" description="Recent match cards keep the profile compact and readable on smaller screens." />
              </div>
              <div className="p-5">
                <RecentMatchCards matches={filteredMatches as PubgHubRecentMatch[]} />
              </div>
            </section>

            <section className="esports-card overflow-hidden !p-0">
              <div className="border-b border-white/[0.06] px-5 py-4">
                <SectionHeader eyebrow="Event History" title="Event-specific player stats" description="Kills, assists, knocks, and damage stay attached to every event this player touched." />
              </div>
              <div className="table-scroll">
                <table className="data-table min-w-full">
                  <thead>
                    <tr>
                      <th>Event</th>
                      <th>Status</th>
                      <th className="text-right">Kills</th>
                      <th className="text-right">Assists</th>
                      <th className="text-right">Knocks</th>
                      <th className="text-right">Damage</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEventStats.map((eventStat) => (
                      <tr key={eventStat.eventId}>
                        <td className="font-semibold text-white">{eventStat.eventName}</td>
                        <td>{eventStat.eventStatus}</td>
                        <td className="text-right">{formatNumber(eventStat.kills)}</td>
                        <td className="text-right">{formatNumber(eventStat.assists)}</td>
                        <td className="text-right">{formatNumber(eventStat.knocks)}</td>
                        <td className="text-right">{formatNumber(eventStat.damage)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        ) : null}

        {tab === "statistics" ? (
          <>
            <section className="grid gap-6 xl:grid-cols-[1fr,1fr]">
              <MapStatsTable stats={player.mapStats} title="Map profile" description="Where this player finds the best fragging and damage edges." />
              <div className="esports-card p-6">
                <SectionHeader eyebrow="Recent Output" title="Kills and damage trends" description="Recent output trends stay readable without opening another route." />
                <div className="mt-5">
                  <DualTrendChart firstValues={player.recentTrend} secondValues={player.recentDamageTrend} firstLabel="Kills" secondLabel="Damage" />
                </div>
              </div>
            </section>

            <section className="esports-card p-6">
              <SectionHeader eyebrow="Identity" title="Team context" description="Current and previous team context remains visible alongside the pure stat read." />
              <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                <PlayerIdentity player={player} />
                {currentTeam ? <TeamIdentity team={currentTeam} href={`/pubg/teams/${currentTeam.slug}`} /> : null}
                <div className="rounded-[18px] border border-white/[0.06] bg-black/15 p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-text-muted">Previous Teams</p>
                  <p className="mt-2 text-sm text-white">{player.previousTeams.length > 0 ? player.previousTeams.join(", ") : "No previous teams tracked"}</p>
                </div>
              </div>
            </section>
          </>
        ) : null}

        {tab === "achievements" ? (
          <section className="grid gap-6 xl:grid-cols-4">
            <MetricCard label="MVP Awards" value={player.mvpCount} tone="blue" />
            <MetricCard label="Wins" value={player.wins} tone="green" />
            <MetricCard label="Best Match Kills" value={player.bestMatch?.kills ?? 0} tone="yellow" />
            <MetricCard label="Teams Represented" value={1 + player.previousTeams.length} tone="red" />
          </section>
        ) : null}
      </div>
    </main>
  );
}
