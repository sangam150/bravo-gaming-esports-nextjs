import {
  buildHref,
  DualTrendChart,
  formatDecimal,
  formatNumber,
  FormPill,
  MapStatsTable,
  MetricCard,
  PageHero,
  PlayerIdentity,
  readSearchParam,
  RecentMatchCards,
  SectionHeader,
  TeamIdentity,
  TrendBars,
} from "@/components/pubg/PubgHubUI";
import TeamAvatar from "@/components/ui/TeamAvatar";
import { findPublicPubgTeam, type PubgHubDataset, type PubgHubPlayer, type PubgHubRecentMatch, type PubgHubTeam } from "@/lib/pubg-hub";
import Link from "next/link";

type SearchParamDictionary = Record<string, string | string[] | undefined>;

function FilterBar({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
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
    <nav aria-label="Profile sections" className="tab-bar">
      {tabs.map((tab) => (
        <Link
          key={tab.value}
          href={buildHref(pathname, {
            ...extras,
            tab: tab.value === "overview" ? undefined : tab.value,
          })}
          aria-current={currentTab === tab.value ? "page" : undefined}
          className={`tab-item ${currentTab === tab.value ? "tab-item-active" : ""}`}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}

export function PubgTeamProfileShowcasePage({
  team,
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
  const bestMap =
    [...team.mapStats].sort(
      (firstValue, secondValue) => secondValue.points - firstValue.points || secondValue.kills - firstValue.kills,
    )[0] ?? null;
  const averageRecentPoints =
    team.recentPoints.length > 0 ? team.recentPoints.reduce((sum, value) => sum + value, 0) / team.recentPoints.length : 0;
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
              <Link
                href={buildHref("/pubg/compare", {
                  mode: "teams",
                  sideA: team.id,
                })}
                className="btn-primary"
              >
                Compare Team
              </Link>
            </>
          }
          stats={[
            { label: "Matches", value: team.statsTracked ? team.matches : "Not tracked", tone: "blue" },
            { label: "Wins", value: team.statsTracked ? team.wins : "Not tracked", tone: "green" },
            { label: "Kills", value: team.statsTracked ? team.kills : "Not tracked", tone: "yellow" },
            {
              label: "Damage",
              value: team.statsTracked && team.damageTracked ? formatNumber(team.damage) : "Not tracked",
              tone: "red",
            },
          ]}
          aside={
            <div className="space-y-4">
              <div className="rounded-[22px] border border-white/[0.06] bg-black/15 p-4">
                <div className="flex items-center gap-4">
                  <TeamAvatar name={team.name} imageUrl={team.logoUrl ?? undefined} size="lg" />
                  <div>
                    <p className="font-display text-2xl font-black uppercase text-white">{team.name}</p>
                    <p className="text-sm uppercase tracking-[0.16em] text-text-muted">{team.region ?? "Region not published"}</p>
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
                <MetricCard label="Podium Events" value={team.eventStats.length > 0 ? podiumEvents : "Not tracked"} compact tone="green" />
                <MetricCard
                  label="Avg Recent Pts"
                  value={team.recentPoints.length > 0 ? formatDecimal(averageRecentPoints, 1) : "Not tracked"}
                  compact
                  tone="yellow"
                />
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
          <select aria-label="Filter team profile by event" name="event" defaultValue={eventId} className="input-esports h-11">
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
                <SectionHeader
                  eyebrow="Roster"
                  title="Current lineup"
                  description="Every live roster slot keeps its player profile one click away."
                />
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
                        <Link
                          href={`/pubg/players/${member.playerId}`}
                          className="text-[11px] font-black uppercase tracking-[0.14em] text-accent-blue hover:text-white"
                        >
                          Open player profile
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="esports-card p-6">
                <SectionHeader
                  eyebrow="Recent Trend"
                  title="Points and kills pressure"
                  description="A compact trend read keeps form visible before users dive into full match history."
                />
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
                <SectionHeader
                  eyebrow="Recent Matches"
                  title="Latest team activity"
                  description="Recent match rows stay on the profile so the standings never feel detached from the actual lobby output."
                />
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
              <SectionHeader
                eyebrow="Starting Four"
                title="Roster cards"
                description="Active roster entries are always shown from the current public team profile."
              />
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
              <SectionHeader
                eyebrow="Roster History"
                title="Previous overlays and swaps"
                description="Historical roster movement stays visible as scouting context."
              />
              <div className="mt-5 grid gap-3">
                {team.rosterHistory.map((entry) => (
                  <div
                    key={`${entry.playerId}-${entry.startDate}`}
                    className="rounded-[18px] border border-white/[0.06] bg-black/15 px-4 py-3"
                  >
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
            <SectionHeader
              eyebrow="Matches"
              title="Recent team match feed"
              description="Recent matches stay available as cards so the page reads cleanly on mobile and desktop."
            />
            <div className="mt-5">
              <RecentMatchCards matches={filteredMatches as PubgHubRecentMatch[]} />
            </div>
          </section>
        ) : null}

        {tab === "statistics" ? (
          <>
            <section className="grid gap-6 xl:grid-cols-[1.15fr,0.85fr]">
              <MapStatsTable
                stats={team.mapStats}
                title="Map performance"
                description="Kills, wins, damage, and total points broken down by map."
              />
              <div className="esports-card p-6">
                <SectionHeader
                  eyebrow="Event Splits"
                  title="Event-specific output"
                  description="Every tracked event contribution remains visible even after the homepage cycle moves on."
                />
                <div className="mt-5 table-scroll" tabIndex={0}>
                  <table className="data-table min-w-full">
                    <caption className="sr-only">Team performance split by event</caption>
                    <thead>
                      <tr>
                        <th scope="col">Event</th>
                        <th scope="col">Status</th>
                        <th scope="col" className="text-right">
                          Kills
                        </th>
                        <th scope="col" className="text-right">
                          Wins
                        </th>
                        <th scope="col" className="text-right">
                          Points
                        </th>
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

            <section>
              <div className="esports-card p-6">
                <SectionHeader
                  eyebrow="Trend Layer"
                  title="Points versus kills"
                  description="A quick dual-read of how the squad is converting lobbies lately."
                />
                <div className="mt-5">
                  <DualTrendChart firstValues={team.recentPoints} secondValues={team.recentKills} firstLabel="Points" secondLabel="Kills" />
                </div>
              </div>
            </section>
          </>
        ) : null}

        {tab === "achievements" ? (
          <section className="grid gap-6 xl:grid-cols-3">
            <MetricCard label="Podium Events" value={team.eventStats.length > 0 ? podiumEvents : "Not tracked"} tone="blue" />
            <MetricCard label="Best Map" value={bestMap?.map ?? "Pending"} tone="green" />
            <MetricCard
              label="Average Placement"
              value={team.statsTracked ? formatDecimal(team.avgPlacement, 2) : "Not tracked"}
              tone="yellow"
            />
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
  const currentTeam = player.currentTeamId ? (findPublicPubgTeam(dataset, player.currentTeamId) ?? null) : null;
  const representedTeams = new Set(
    [player.currentTeamName, ...player.previousTeams].filter((teamName): teamName is string => Boolean(teamName)),
  );

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
              <Link
                href={buildHref("/pubg/compare", {
                  mode: "players",
                  sideA: player.id,
                })}
                className="btn-primary"
              >
                Compare Player
              </Link>
            </>
          }
          stats={[
            { label: "Kills", value: player.statsTracked ? player.kills : "Not tracked", tone: "blue" },
            { label: "Damage", value: player.statsTracked ? player.damage : "Not tracked", tone: "green" },
            {
              label: "Avg Kills",
              value: player.statsTracked ? formatDecimal(player.avgKills, 2) : "Not tracked",
              tone: "yellow",
            },
            { label: "MVP Count", value: player.statsTracked ? player.mvpCount : "Not tracked", tone: "red" },
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
                  <Link
                    href={`/pubg/teams/${currentTeam.slug}`}
                    className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-text-muted"
                  >
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
          <select aria-label="Filter player profile by event" name="event" defaultValue={eventId} className="input-esports h-11">
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
              <SectionHeader
                eyebrow="Best Match"
                title="Peak output snapshot"
                description="Best-match context stays visible near the top for quick scouting."
              />
              {player.bestMatch ? (
                <div className="mt-5 rounded-[18px] border border-white/[0.06] bg-black/15 p-5">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-accent-blue">{player.bestMatch.eventName}</p>
                  <h3 className="mt-2 font-display text-xl font-black uppercase text-white">
                    Match {player.bestMatch.matchNumber} | {player.bestMatch.mapName}
                  </h3>
                  <div className="mt-4 grid gap-3 sm:grid-cols-4">
                    <MetricCard label="Kills" value={player.bestMatch.kills} compact tone="blue" />
                    <MetricCard label="Assists" value={player.bestMatch.assists ?? "Not tracked"} compact tone="yellow" />
                    <MetricCard label="Knocks" value={player.bestMatch.knocks ?? "Not tracked"} compact tone="green" />
                    <MetricCard label="Damage" value={player.bestMatch.damage ?? "Not tracked"} compact tone="red" />
                  </div>
                </div>
              ) : (
                <div className="mt-5 rounded-[18px] border border-dashed border-white/10 bg-black/15 px-4 py-5 text-sm text-text-muted">
                  Best-match context appears once enough player rows have been published.
                </div>
              )}
            </div>

            <div className="esports-card p-6">
              <SectionHeader
                eyebrow="Fast Read"
                title="Ranking summary"
                description="A compact read of form, damage, and win share keeps the profile useful at a glance."
              />
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <MetricCard label="Matches" value={player.statsTracked ? player.matches : "Not tracked"} compact />
                <MetricCard label="Wins" value={player.statsTracked ? player.wins : "Not tracked"} compact tone="green" />
                <MetricCard
                  label="Avg Damage"
                  value={player.statsTracked ? formatDecimal(player.avgDamage, 2) : "Not tracked"}
                  compact
                  tone="blue"
                />
                <MetricCard
                  label="Form Score"
                  value={player.statsTracked ? formatDecimal(player.formScore, 2) : "Not tracked"}
                  compact
                  tone="yellow"
                />
              </div>
              <div className="mt-5">
                <DualTrendChart
                  firstValues={player.recentTrend}
                  secondValues={player.recentDamageTrend}
                  firstLabel="Kills"
                  secondLabel="Damage"
                />
              </div>
            </div>
          </section>
        ) : null}

        {tab === "history" ? (
          <>
            <section className="esports-card overflow-hidden !p-0">
              <div className="border-b border-white/[0.06] px-5 py-4">
                <SectionHeader
                  eyebrow="Recent Matches"
                  title="Match history"
                  description="Recent match cards keep the profile compact and readable on smaller screens."
                />
              </div>
              <div className="p-5">
                <RecentMatchCards matches={filteredMatches as PubgHubRecentMatch[]} />
              </div>
            </section>

            <section className="esports-card overflow-hidden !p-0">
              <div className="border-b border-white/[0.06] px-5 py-4">
                <SectionHeader
                  eyebrow="Event History"
                  title="Event-specific player stats"
                  description="Kills, assists, knocks, and damage stay attached to every event this player touched."
                />
              </div>
              <div className="table-scroll" tabIndex={0}>
                <table className="data-table min-w-full">
                  <caption className="sr-only">Player performance split by event</caption>
                  <thead>
                    <tr>
                      <th scope="col">Event</th>
                      <th scope="col">Status</th>
                      <th scope="col" className="text-right">
                        Kills
                      </th>
                      <th scope="col" className="text-right">
                        Assists
                      </th>
                      <th scope="col" className="text-right">
                        Knocks
                      </th>
                      <th scope="col" className="text-right">
                        Damage
                      </th>
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
              <MapStatsTable
                stats={player.mapStats}
                title="Map profile"
                description="Where this player finds the best fragging and damage edges."
              />
              <div className="esports-card p-6">
                <SectionHeader
                  eyebrow="Recent Output"
                  title="Kills and damage trends"
                  description="Recent output trends stay readable without opening another route."
                />
                <div className="mt-5">
                  <DualTrendChart
                    firstValues={player.recentTrend}
                    secondValues={player.recentDamageTrend}
                    firstLabel="Kills"
                    secondLabel="Damage"
                  />
                </div>
              </div>
            </section>

            <section className="esports-card p-6">
              <SectionHeader
                eyebrow="Identity"
                title="Team context"
                description="Current and previous team context remains visible alongside the pure stat read."
              />
              <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                <PlayerIdentity player={player} />
                {currentTeam ? <TeamIdentity team={currentTeam} href={`/pubg/teams/${currentTeam.slug}`} /> : null}
                <div className="rounded-[18px] border border-white/[0.06] bg-black/15 p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-text-muted">Previous Teams</p>
                  <p className="mt-2 text-sm text-white">
                    {player.previousTeams.length > 0 ? player.previousTeams.join(", ") : "No previous teams tracked"}
                  </p>
                </div>
              </div>
            </section>
          </>
        ) : null}

        {tab === "achievements" ? (
          <section className="grid gap-6 xl:grid-cols-4">
            <MetricCard label="MVP Awards" value={player.statsTracked ? player.mvpCount : "Not tracked"} tone="blue" />
            <MetricCard label="Wins" value={player.statsTracked ? player.wins : "Not tracked"} tone="green" />
            <MetricCard label="Best Match Kills" value={player.bestMatch?.kills ?? "Pending"} tone="yellow" />
            <MetricCard label="Teams Represented" value={representedTeams.size > 0 ? representedTeams.size : "Pending"} tone="red" />
          </section>
        ) : null}
      </div>
    </main>
  );
}
