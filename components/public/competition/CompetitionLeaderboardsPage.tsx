import {
  PublicActionLink,
  PublicCommunityCta,
  PublicEmptyState,
  PublicMetric,
  PublicSectionHeader,
  buildPublicHref,
  formatPublicNumber,
  joinClasses,
  readSearchParam,
} from "@/components/public/PublicDesignSystem";
import {
  BOARD_PREVIEW_SIZE,
  CompetitionHero,
  FilterActions,
  FilterField,
  PlacementStrip,
  formatResultsTimestamp,
  getLatestMatch,
  getRecentTeamPlacements,
  uniqueStrings,
  type CompetitionPageProps,
} from "@/components/public/competition/CompetitionShared";
import TeamAvatar from "@/components/ui/TeamAvatar";
import { getPublicPubgPlayers, getPublicPubgTeams, type PubgHubMatch } from "@/lib/pubg-hub";
import { buildPubgPlayerBoardRows, buildPubgTeamBoardRows, type PubgPlayerBoardRow, type PubgTeamBoardRow } from "@/lib/pubg-rankings";
import { CalendarDays, Crosshair, Trophy, Users } from "lucide-react";
import Link from "next/link";

function podiumSurface(rank: number) {
  if (rank === 1) return "border-accent-yellow/50 bg-[linear-gradient(180deg,rgba(245,158,11,0.16),rgba(7,19,33,0.9))]";
  if (rank === 2) return "border-slate-300/35 bg-[linear-gradient(180deg,rgba(203,213,225,0.1),rgba(7,19,33,0.9))]";
  return "border-orange-400/35 bg-[linear-gradient(180deg,rgba(251,146,60,0.1),rgba(7,19,33,0.9))]";
}

function TeamPodiumCard({ row }: { row: PubgTeamBoardRow }) {
  return (
    <Link
      href={`/pubg/teams/${row.slug}`}
      className={joinClasses(
        "public-card flex items-center gap-4 p-4",
        row.rank === 1 ? "lg:order-2" : row.rank === 2 ? "lg:order-1" : "lg:order-3",
        podiumSurface(row.rank),
      )}
    >
      <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/20 bg-black/20 font-display text-lg font-bold text-white">
        {row.rank}
      </span>
      <TeamAvatar name={row.name} imageUrl={row.logoUrl ?? undefined} size="lg" />
      <div className="min-w-0 flex-1">
        <p className="truncate font-display text-lg font-bold uppercase text-white">{row.name}</p>
        <p className="mt-1 font-mono text-xl font-semibold tabular-nums text-accent-blue-light">
          {formatPublicNumber(row.totalPoints)} <span className="font-body text-[10px] uppercase text-text-muted">pts</span>
        </p>
        <p className="mt-2 text-xs text-text-muted">
          WWCD {formatPublicNumber(row.wins)} · Kills {formatPublicNumber(row.kills)}
        </p>
      </div>
    </Link>
  );
}

function TeamLeaderboardMobileCard({ row, placements }: { row: PubgTeamBoardRow; placements: number[] }) {
  return (
    <article className="public-card p-4">
      <div className="flex items-start gap-3">
        <span className="inline-flex h-9 min-w-9 items-center justify-center rounded-full border border-accent-blue/35 bg-accent-blue/10 font-mono text-xs text-white">
          {row.rank}
        </span>
        <Link
          href={`/pubg/teams/${row.slug}`}
          className="group flex min-w-0 flex-1 items-center gap-3 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue"
        >
          <TeamAvatar name={row.name} imageUrl={row.logoUrl ?? undefined} size="md" />
          <div className="min-w-0 flex-1">
            <h3 className="truncate font-display text-lg font-bold text-white transition group-hover:text-accent-blue-light">{row.name}</h3>
            <p className="mt-1 text-xs text-text-muted">{formatPublicNumber(row.matches)} matches</p>
          </div>
        </Link>
        <span className="shrink-0 font-mono font-semibold text-accent-blue-light">{formatPublicNumber(row.totalPoints)} pts</span>
      </div>
      <dl className="mt-4 grid grid-cols-3 gap-2 text-xs">
        <div>
          <dt className="text-text-muted">WWCD</dt>
          <dd className="mt-1 font-mono text-white">{formatPublicNumber(row.wins)}</dd>
        </div>
        <div>
          <dt className="text-text-muted">Placement</dt>
          <dd className="mt-1 font-mono text-white">{formatPublicNumber(row.placementPoints)}</dd>
        </div>
        <div>
          <dt className="text-text-muted">Kills</dt>
          <dd className="mt-1 font-mono text-white">{formatPublicNumber(row.kills)}</dd>
        </div>
      </dl>
      <div className="mt-4">
        <PlacementStrip placements={placements} />
      </div>
    </article>
  );
}

function PlayerLeaderboardMobileCard({ row }: { row: PubgPlayerBoardRow }) {
  return (
    <article className="public-card p-4">
      <div className="flex items-start gap-3">
        <span className="inline-flex h-9 min-w-9 items-center justify-center rounded-full border border-accent-blue/35 bg-accent-blue/10 font-mono text-xs text-white">
          {row.rank}
        </span>
        <Link
          href={`/pubg/players/${row.slug}`}
          className="group flex min-w-0 flex-1 items-center gap-3 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue"
        >
          <TeamAvatar name={row.pubgName} imageUrl={row.avatarUrl ?? undefined} size="md" />
          <div className="min-w-0 flex-1">
            <h3 className="truncate font-display text-lg font-bold text-white transition group-hover:text-accent-blue-light">
              {row.pubgName}
            </h3>
            <p className="mt-1 truncate text-xs text-text-muted">{row.teamName ?? "Unaffiliated"}</p>
          </div>
        </Link>
        <span className="shrink-0 font-mono font-semibold text-accent-blue-light">{formatPublicNumber(row.kills)} K</span>
      </div>
      <dl className="mt-4 grid grid-cols-3 gap-2 text-xs">
        <div>
          <dt className="text-text-muted">Assists</dt>
          <dd className="mt-1 font-mono text-white">{formatPublicNumber(row.assists)}</dd>
        </div>
        <div>
          <dt className="text-text-muted">Knocks</dt>
          <dd className="mt-1 font-mono text-white">{formatPublicNumber(row.knocks)}</dd>
        </div>
        <div>
          <dt className="text-text-muted">Damage</dt>
          <dd className="mt-1 font-mono text-white">{formatPublicNumber(row.damage)}</dd>
        </div>
      </dl>
    </article>
  );
}

function TeamLeaderboardSection({ rows, matches }: { rows: PubgTeamBoardRow[]; matches: PubgHubMatch[] }) {
  const visibleRows = rows.slice(0, BOARD_PREVIEW_SIZE);

  return (
    <section id="team-leaderboard" className="scroll-mt-24">
      <PublicSectionHeader
        eyebrow="Team leaderboard"
        title="Official Team Standings"
        action={
          <PublicActionLink href="/teams" variant="secondary" className="min-h-9 px-3 py-2 text-xs">
            View All Teams
          </PublicActionLink>
        }
        className="mb-3"
      />
      {visibleRows.length > 0 ? (
        <>
          <div className="hidden md:block">
            <div className="public-table-wrap">
              <table className="public-table min-w-[980px]">
                <caption className="sr-only">Team leaderboard from the selected published matches</caption>
                <thead>
                  <tr>
                    <th scope="col">Rank</th>
                    <th scope="col">Team</th>
                    <th scope="col" className="text-right">
                      Matches
                    </th>
                    <th scope="col" className="text-right">
                      WWCD
                    </th>
                    <th scope="col" className="text-right">
                      Placement Points
                    </th>
                    <th scope="col" className="text-right">
                      Kills
                    </th>
                    <th scope="col" className="text-right">
                      Total Points
                    </th>
                    <th scope="col">Recent Form</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleRows.map((row) => (
                    <tr key={row.teamId}>
                      <td className="font-mono font-semibold text-white">#{row.rank}</td>
                      <td>
                        <Link
                          href={`/pubg/teams/${row.slug}`}
                          className="flex min-w-40 items-center gap-3 text-white hover:text-accent-blue-light"
                        >
                          <TeamAvatar name={row.name} imageUrl={row.logoUrl ?? undefined} size="sm" />
                          <span className="font-semibold">{row.name}</span>
                        </Link>
                      </td>
                      <td className="text-right font-mono tabular-nums">{formatPublicNumber(row.matches)}</td>
                      <td className="text-right font-mono tabular-nums">{formatPublicNumber(row.wins)}</td>
                      <td className="text-right font-mono tabular-nums">{formatPublicNumber(row.placementPoints)}</td>
                      <td className="text-right font-mono tabular-nums">{formatPublicNumber(row.kills)}</td>
                      <td className="text-right font-mono font-semibold tabular-nums text-accent-blue-light">
                        {formatPublicNumber(row.totalPoints)}
                      </td>
                      <td>
                        <PlacementStrip placements={getRecentTeamPlacements(matches, row.teamId)} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="grid gap-3 md:hidden">
            {visibleRows.map((row) => (
              <TeamLeaderboardMobileCard key={row.teamId} row={row} placements={getRecentTeamPlacements(matches, row.teamId)} />
            ))}
          </div>
        </>
      ) : (
        <PublicEmptyState
          compact
          title="No team standings for this filter"
          description="Choose another event, mode, or map with published team results."
        />
      )}
    </section>
  );
}

function PlayerLeaderboardSection({ rows }: { rows: PubgPlayerBoardRow[] }) {
  const visibleRows = rows.slice(0, BOARD_PREVIEW_SIZE);

  return (
    <section id="player-leaderboard" className="scroll-mt-24">
      <PublicSectionHeader
        eyebrow="Player leaderboard"
        title="Official Player Standings"
        action={
          <PublicActionLink href="/players" variant="secondary" className="min-h-9 px-3 py-2 text-xs">
            View All Players
          </PublicActionLink>
        }
        className="mb-3"
      />
      {visibleRows.length > 0 ? (
        <>
          <div className="hidden md:block">
            <div className="public-table-wrap">
              <table className="public-table min-w-[920px]">
                <caption className="sr-only">Player leaderboard from the selected published matches</caption>
                <thead>
                  <tr>
                    <th scope="col">Rank</th>
                    <th scope="col">Player</th>
                    <th scope="col">Team</th>
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
                  {visibleRows.map((row) => (
                    <tr key={row.playerId}>
                      <td className="font-mono font-semibold text-white">#{row.rank}</td>
                      <td>
                        <Link
                          href={`/pubg/players/${row.slug}`}
                          className="flex min-w-40 items-center gap-3 text-white hover:text-accent-blue-light"
                        >
                          <TeamAvatar name={row.pubgName} imageUrl={row.avatarUrl ?? undefined} size="sm" />
                          <span className="font-semibold">{row.pubgName}</span>
                        </Link>
                      </td>
                      <td>{row.teamName ?? "Unaffiliated"}</td>
                      <td className="text-right font-mono font-semibold tabular-nums text-accent-blue-light">
                        {formatPublicNumber(row.kills)}
                      </td>
                      <td className="text-right font-mono tabular-nums">{formatPublicNumber(row.assists)}</td>
                      <td className="text-right font-mono tabular-nums">{formatPublicNumber(row.knocks)}</td>
                      <td className="text-right font-mono tabular-nums">{formatPublicNumber(row.damage)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="grid gap-3 md:hidden">
            {visibleRows.map((row) => (
              <PlayerLeaderboardMobileCard key={row.playerId} row={row} />
            ))}
          </div>
        </>
      ) : (
        <PublicEmptyState
          compact
          title="No player standings for this filter"
          description="Choose another event, mode, or map with published player results."
        />
      )}
    </section>
  );
}

export function CompetitionLeaderboardsPage({ dataset, searchParams, basePath }: CompetitionPageProps) {
  const teams = getPublicPubgTeams(dataset);
  const players = getPublicPubgPlayers(dataset, teams);
  const teamLookup = new Map(teams.map((team) => [team.id, team] as const));
  const playerLookup = new Map(players.map((player) => [player.id, player] as const));
  const eventLookup = new Map(dataset.events.map((event) => [event.id, event] as const));
  const requestedEventSlug = readSearchParam(searchParams.event, "all");
  const selectedEvent = dataset.events.find((event) => event.slug === requestedEventSlug) ?? null;
  const eventSlug = selectedEvent ? selectedEvent.slug : "all";
  const modes = uniqueStrings(dataset.events.map((event) => event.mode));
  const requestedMode = readSearchParam(searchParams.mode, "all");
  const mode = requestedMode === "all" || modes.includes(requestedMode) ? requestedMode : "all";
  const maps = uniqueStrings(dataset.matches.map((match) => match.mapName));
  const requestedMap = readSearchParam(searchParams.map, "all");
  const map = requestedMap === "all" || maps.includes(requestedMap) ? requestedMap : "all";
  const requestedView = readSearchParam(searchParams.view, "teams");
  const view = requestedView === "players" ? "players" : "teams";

  const filteredMatches = dataset.matches.filter((match) => {
    if (selectedEvent && match.eventSlug !== selectedEvent.slug) return false;
    if (mode !== "all" && eventLookup.get(match.eventId)?.mode !== mode) return false;
    if (map !== "all" && match.mapName !== map) return false;
    return true;
  });

  const teamBoard = buildPubgTeamBoardRows(filteredMatches, teamLookup);
  const playerBoard = buildPubgPlayerBoardRows(filteredMatches, playerLookup);
  const latestMatch = getLatestMatch(filteredMatches);
  const podiumRows = teamBoard.slice(0, 3);
  const lensLabel = [selectedEvent?.name ?? "All published events", mode === "all" ? null : mode, map === "all" ? null : map]
    .filter(Boolean)
    .join(" · ");

  return (
    <main className="public-page">
      <CompetitionHero
        current="Leaderboards"
        title="Leaderboards"
        description="Top teams and players ranked from the published matches selected below."
        aside={
          <div className="public-panel p-5">
            <div className="flex items-center gap-2 text-text-secondary">
              <CalendarDays className="h-4 w-4 text-accent-blue-light" aria-hidden="true" />
              <p className="font-display text-[11px] font-semibold uppercase tracking-[0.05em]">Results through</p>
            </div>
            <p className="mt-2 font-mono text-sm text-white">{formatResultsTimestamp(latestMatch?.startTime)}</p>
            <p className="mt-4 border-t border-white/10 pt-4 text-xs leading-5 text-text-muted">{lensLabel}</p>
          </div>
        }
      />

      <div className="public-container public-stack">
        <section className="public-panel p-4">
          <form method="get" className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1.2fr_0.75fr_0.75fr_0.75fr_auto]">
            <FilterField label="Season / Event">
              <select name="event" defaultValue={eventSlug} className="public-filter-control">
                <option value="all">All published events</option>
                {dataset.events.map((event) => (
                  <option key={event.id} value={event.slug}>
                    {event.name}
                  </option>
                ))}
              </select>
            </FilterField>
            <FilterField label="Game Mode">
              <select name="mode" defaultValue={mode} className="public-filter-control">
                <option value="all">All modes</option>
                {modes.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </FilterField>
            <FilterField label="Map">
              <select name="map" defaultValue={map} className="public-filter-control">
                <option value="all">All maps</option>
                {maps.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </FilterField>
            <FilterField label="View">
              <select name="view" defaultValue={view} className="public-filter-control">
                <option value="teams">Team leaderboard</option>
                <option value="players">Player leaderboard</option>
              </select>
            </FilterField>
            <FilterActions resetPath={basePath} />
          </form>
        </section>

        <nav
          aria-label="Leaderboard views"
          className="grid overflow-hidden rounded-[5px] border border-[rgba(112,145,180,0.28)] sm:grid-cols-2"
        >
          <Link
            href={`${buildPublicHref(basePath, searchParams, { view: "teams" })}#team-leaderboard`}
            aria-current={view === "teams" ? "page" : undefined}
            className={joinClasses(
              "flex min-h-12 items-center justify-center border-accent-blue px-4 font-display text-base font-semibold transition",
              view === "teams" ? "bg-accent-blue text-white" : "bg-[#030a13] text-text-secondary hover:bg-accent-blue/10 hover:text-white",
            )}
          >
            Team Leaderboard
          </Link>
          <Link
            href={`${buildPublicHref(basePath, searchParams, { view: "players" })}#player-leaderboard`}
            aria-current={view === "players" ? "page" : undefined}
            className={joinClasses(
              "flex min-h-12 items-center justify-center border-accent-blue px-4 font-display text-base font-semibold transition",
              view === "players"
                ? "bg-accent-blue text-white"
                : "bg-[#030a13] text-text-secondary hover:bg-accent-blue/10 hover:text-white",
            )}
          >
            Player Leaderboard
          </Link>
        </nav>

        <section className="public-panel p-4">
          <PublicSectionHeader eyebrow="Top 3 teams" title="Podium" className="mb-3" />
          {podiumRows.length > 0 ? (
            <div className="grid gap-3 lg:grid-cols-3">
              {podiumRows.map((row) => (
                <TeamPodiumCard key={row.teamId} row={row} />
              ))}
            </div>
          ) : (
            <PublicEmptyState
              compact
              title="No podium for this filter"
              description="A podium appears when the selected published matches include team results."
            />
          )}
        </section>

        <section className="grid gap-3 sm:grid-cols-3">
          <PublicMetric
            label="Matches in view"
            value={formatPublicNumber(filteredMatches.length)}
            icon={<Crosshair className="h-5 w-5" />}
          />
          <PublicMetric label="Ranked teams" value={formatPublicNumber(teamBoard.length)} icon={<Trophy className="h-5 w-5" />} />
          <PublicMetric label="Ranked players" value={formatPublicNumber(playerBoard.length)} icon={<Users className="h-5 w-5" />} />
        </section>

        {view === "players" ? (
          <>
            <PlayerLeaderboardSection rows={playerBoard} />
            <TeamLeaderboardSection rows={teamBoard} matches={filteredMatches} />
          </>
        ) : (
          <>
            <TeamLeaderboardSection rows={teamBoard} matches={filteredMatches} />
            <PlayerLeaderboardSection rows={playerBoard} />
          </>
        )}

        <PublicCommunityCta
          title="Climb the ranks. Make your mark."
          description="Register your team, compete in published Bravo events, and earn a place on the official leaderboard."
        />
      </div>
    </main>
  );
}
