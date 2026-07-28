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
  CompetitionHero,
  DIRECTORY_PAGE_SIZE,
  FilterActions,
  FilterField,
  LargeIdentityArtwork,
  PlacementStrip,
  PublicPagination,
  getRecentTeamPlacements,
  toPositivePage,
  uniqueStrings,
  type CompetitionPageProps,
} from "@/components/public/competition/CompetitionShared";
import TeamAvatar from "@/components/ui/TeamAvatar";
import { getPublicPubgPlayers, getPublicPubgTeams, type PubgHubTeam } from "@/lib/pubg-hub";
import { buildPubgTeamBoardRows } from "@/lib/pubg-rankings";
import { Crosshair, Search, UserRound, Users } from "lucide-react";
import Link from "next/link";

type TeamDirectoryRow = {
  team: PubgHubTeam;
  rank: number;
  matches: number;
  wins: number;
  kills: number;
  totalPoints: number;
  recentPlacements: number[];
};

function classifyRegion(region?: string | null) {
  const normalized = region?.trim().toLowerCase();
  if (!normalized) return null;
  if (["nepal", "np", "nepali"].includes(normalized)) return "nepal";
  if (normalized.includes("nepal")) return null;
  if (["tba", "unknown", "global"].includes(normalized)) return null;
  return "international";
}

function TeamRosterPreview({ team }: { team: PubgHubTeam }) {
  if (team.currentRoster.length === 0) return <span className="text-xs text-text-muted">Roster pending</span>;

  return (
    <div className="flex items-center -space-x-2">
      <span className="sr-only">
        {team.name} roster: {team.currentRoster.map((member) => member.pubgName).join(", ")}
      </span>
      {team.currentRoster.slice(0, 4).map((member) => (
        <span key={member.playerId} title={member.pubgName} aria-hidden="true" className="rounded-[18px] ring-2 ring-[#071321]">
          <TeamAvatar name={member.pubgName} imageUrl={member.avatarUrl ?? undefined} size="sm" />
        </span>
      ))}
      {team.currentRoster.length > 4 ? (
        <span
          aria-hidden="true"
          className="inline-flex h-9 w-9 items-center justify-center rounded-[18px] border border-white/15 bg-[#071321] text-[10px] text-white ring-2 ring-[#071321]"
        >
          +{team.currentRoster.length - 4}
        </span>
      ) : null}
    </div>
  );
}

function TeamMobileCard({ row }: { row: TeamDirectoryRow }) {
  return (
    <article className="public-card p-4">
      <div className="flex items-start gap-3">
        <span className="inline-flex h-9 min-w-9 items-center justify-center rounded-full border border-accent-blue/35 bg-accent-blue/10 font-mono text-xs text-white">
          {row.rank}
        </span>
        <TeamAvatar name={row.team.name} imageUrl={row.team.logoUrl ?? undefined} size="md" />
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-display text-lg font-bold text-white">{row.team.name}</h3>
          <p className="mt-1 truncate text-xs text-text-muted">{row.team.region ?? "Region not published"}</p>
        </div>
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-3 text-xs">
        {[
          ["Total points", row.totalPoints],
          ["Total kills", row.kills],
          ["WWCD", row.wins],
          ["Matches", row.matches],
        ].map(([label, value]) => (
          <div key={String(label)} className="rounded-[4px] border border-white/10 bg-black/20 p-3">
            <dt className="text-text-muted">{label}</dt>
            <dd className="mt-1 font-mono font-semibold tabular-nums text-white">{formatPublicNumber(Number(value))}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-4">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.05em] text-text-muted">Recent form</p>
        <PlacementStrip placements={row.recentPlacements} />
      </div>
      {row.team.currentRoster.length > 0 ? (
        <div className="mt-4">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.05em] text-text-muted">Roster</p>
          <p className="text-xs leading-5 text-text-secondary">{row.team.currentRoster.map((member) => member.pubgName).join(", ")}</p>
        </div>
      ) : null}
      <div className="mt-4 grid grid-cols-2 gap-2">
        <PublicActionLink href={`/pubg/teams/${row.team.slug}`} variant="secondary" className="w-full">
          Team Profile
        </PublicActionLink>
        <PublicActionLink href={`/pubg/teams/${row.team.slug}?tab=matches`} variant="secondary" className="w-full">
          View Results
        </PublicActionLink>
      </div>
    </article>
  );
}

export function CompetitionTeamsPage({ dataset, searchParams, basePath }: CompetitionPageProps) {
  const teams = getPublicPubgTeams(dataset);
  const players = getPublicPubgPlayers(dataset, teams);
  const officialRanks = new Map(teams.map((team, index) => [team.id, index + 1] as const));
  const rawQuery = readSearchParam(searchParams.q).trim();
  const query = rawQuery.toLowerCase();
  const regions = uniqueStrings(teams.map((team) => team.region));
  const requestedRegion = readSearchParam(searchParams.region, "all");
  const region = requestedRegion === "all" || regions.includes(requestedRegion) ? requestedRegion : "all";
  const requestedEventSlug = readSearchParam(searchParams.event, "all");
  const selectedEvent = dataset.events.find((event) => event.slug === requestedEventSlug) ?? null;
  const eventSlug = selectedEvent ? selectedEvent.slug : "all";
  const requestedSort = readSearchParam(searchParams.sort, "points");
  const sort = ["points", "kills", "wins", "matches", "rank"].includes(requestedSort) ? requestedSort : "points";
  const eventMatches = selectedEvent ? dataset.matches.filter((match) => match.eventSlug === selectedEvent.slug) : dataset.matches;
  const eventBoard = selectedEvent ? buildPubgTeamBoardRows(eventMatches, new Map(teams.map((team) => [team.id, team]))) : [];
  const eventBoardLookup = new Map(eventBoard.map((row) => [row.teamId, row] as const));
  const eventRankLookup = new Map(eventBoard.map((row) => [row.teamId, row.rank] as const));

  const directoryRows: TeamDirectoryRow[] = teams
    .filter((team) => {
      if (!selectedEvent) return true;
      return selectedEvent.teamIds.includes(team.id) || team.eventStats.some((stat) => stat.eventSlug === selectedEvent.slug);
    })
    .map((team) => {
      const boardRow = eventBoardLookup.get(team.id);
      const eventStat = selectedEvent ? team.eventStats.find((stat) => stat.eventSlug === selectedEvent.slug) : null;
      return {
        team,
        rank: eventRankLookup.get(team.id) ?? officialRanks.get(team.id) ?? 0,
        matches: boardRow?.matches ?? eventStat?.matches ?? team.matches,
        wins: boardRow?.wins ?? eventStat?.wins ?? team.wins,
        kills: boardRow?.kills ?? eventStat?.kills ?? team.kills,
        totalPoints: boardRow?.totalPoints ?? eventStat?.totalPoints ?? team.totalPoints,
        recentPlacements: selectedEvent ? getRecentTeamPlacements(eventMatches, team.id) : team.recentPlacements.slice(-5),
      };
    });

  const classifiedNepal = directoryRows.filter((row) => classifyRegion(row.team.region) === "nepal").length;
  const classifiedInternational = directoryRows.filter((row) => classifyRegion(row.team.region) === "international").length;
  const categoryOptions = [
    { id: "all", label: "All Teams", count: directoryRows.length },
    ...(classifiedNepal > 0 ? [{ id: "nepal", label: "Nepal Teams", count: classifiedNepal }] : []),
    ...(classifiedInternational > 0 ? [{ id: "international", label: "International Teams", count: classifiedInternational }] : []),
  ];
  const requestedCategory = readSearchParam(searchParams.category, "all");
  const category = categoryOptions.some((option) => option.id === requestedCategory) ? requestedCategory : "all";

  const filteredRows = directoryRows.filter((row) => {
    if (query && !`${row.team.name} ${row.team.tag ?? ""} ${row.team.region ?? ""}`.toLowerCase().includes(query)) return false;
    if (region !== "all" && row.team.region !== region) return false;
    if (category !== "all" && classifyRegion(row.team.region) !== category) return false;
    return true;
  });

  const sortedRows = [...filteredRows].sort((first, second) => {
    if (sort === "kills") return second.kills - first.kills || second.totalPoints - first.totalPoints;
    if (sort === "wins") return second.wins - first.wins || second.totalPoints - first.totalPoints;
    if (sort === "matches") return second.matches - first.matches || second.totalPoints - first.totalPoints;
    if (sort === "rank") return first.rank - second.rank;
    return second.totalPoints - first.totalPoints || second.kills - first.kills;
  });

  const totalPages = Math.max(1, Math.ceil(sortedRows.length / DIRECTORY_PAGE_SIZE));
  const page = Math.min(toPositivePage(readSearchParam(searchParams.page, "1")), totalPages);
  const visibleRows = sortedRows.slice((page - 1) * DIRECTORY_PAGE_SIZE, page * DIRECTORY_PAGE_SIZE);
  const featuredTeam = teams[0] ?? null;
  const activeRosterPlayers = players.filter((player) => player.active && player.currentTeamId).length;
  const totalKills = teams.reduce((sum, team) => sum + team.kills, 0);

  return (
    <main className="public-page">
      <CompetitionHero
        current="Teams"
        title="Teams"
        description="Discover Bravo Gaming’s published PUBG teams, official rosters, standings, and recent match form."
        aside={
          <div className="public-panel grid gap-px overflow-hidden bg-[rgba(112,145,180,0.2)]">
            <PublicMetric label="Published Teams" value={formatPublicNumber(teams.length)} icon={<Users className="h-5 w-5" />} />
            <PublicMetric
              label="Active roster players"
              value={formatPublicNumber(activeRosterPlayers)}
              icon={<UserRound className="h-5 w-5" />}
            />
            <PublicMetric label="Total Kills" value={formatPublicNumber(totalKills)} icon={<Crosshair className="h-5 w-5" />} />
          </div>
        }
      />

      <div className="public-container public-stack">
        <section className="public-panel p-4">
          <form method="get" className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1.2fr_0.8fr_1fr_0.8fr_auto]">
            {category !== "all" ? <input type="hidden" name="category" value={category} /> : null}
            <FilterField label="Search teams">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
                <input name="q" defaultValue={rawQuery} className="public-filter-control pl-10" placeholder="Search team, tag, or region" />
              </div>
            </FilterField>
            <FilterField label="Region">
              <select name="region" defaultValue={region} className="public-filter-control">
                <option value="all">All regions</option>
                {regions.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </FilterField>
            <FilterField label="Tournament">
              <select name="event" defaultValue={eventSlug} className="public-filter-control">
                <option value="all">All published events</option>
                {dataset.events.map((event) => (
                  <option key={event.id} value={event.slug}>
                    {event.name}
                  </option>
                ))}
              </select>
            </FilterField>
            <FilterField label="Sort by">
              <select name="sort" defaultValue={sort} className="public-filter-control">
                <option value="points">Total points</option>
                <option value="kills">Total kills</option>
                <option value="wins">WWCD</option>
                <option value="matches">Matches</option>
                <option value="rank">Official rank</option>
              </select>
            </FilterField>
            <FilterActions resetPath={basePath} />
          </form>
        </section>

        {featuredTeam ? (
          <section className="public-panel p-4 sm:p-5">
            <p className="public-kicker mb-3">Featured Team</p>
            <div className="grid gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,0.85fr)_minmax(0,0.9fr)]">
              <div className="grid gap-4 sm:grid-cols-[12rem_minmax(0,1fr)] lg:grid-cols-1 xl:grid-cols-[12rem_minmax(0,1fr)]">
                <LargeIdentityArtwork name={featuredTeam.name} imageUrl={featuredTeam.logoUrl} label="#1 rank" imageFit="contain" />
                <div className="self-center">
                  <h2 className="font-display text-3xl font-bold text-white">{featuredTeam.name}</h2>
                  <p className="mt-2 text-sm text-text-secondary">{featuredTeam.region ?? "Region not published"}</p>
                  <p className="mt-4 text-sm leading-6 text-text-muted">
                    Published roster and match output from Bravo’s official PUBG results.
                  </p>
                  <div className="mt-5 flex flex-wrap gap-2">
                    <PublicActionLink href={`/pubg/teams/${featuredTeam.slug}`}>Team Profile</PublicActionLink>
                    <PublicActionLink href={`/pubg/teams/${featuredTeam.slug}?tab=matches`} variant="secondary">
                      View Results
                    </PublicActionLink>
                  </div>
                </div>
              </div>

              <div className="border-y border-white/10 py-4 lg:border-x lg:border-y-0 lg:px-5 lg:py-0">
                <p className="font-display text-[11px] font-semibold uppercase tracking-[0.05em] text-text-secondary">Season Stats</p>
                <div className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-[5px] border border-[rgba(112,145,180,0.2)] bg-[rgba(112,145,180,0.2)]">
                  <PublicMetric label="Total Points" value={formatPublicNumber(featuredTeam.totalPoints)} />
                  <PublicMetric label="Total Kills" value={formatPublicNumber(featuredTeam.kills)} />
                  <PublicMetric label="WWCD" value={formatPublicNumber(featuredTeam.wins)} />
                  <PublicMetric label="Matches" value={formatPublicNumber(featuredTeam.matches)} />
                </div>
              </div>

              <div>
                <p className="font-display text-[11px] font-semibold uppercase tracking-[0.05em] text-text-secondary">Recent Form</p>
                <div className="mt-3">
                  <PlacementStrip placements={featuredTeam.recentPlacements.slice(-5)} />
                </div>
                <p className="mt-7 font-display text-[11px] font-semibold uppercase tracking-[0.05em] text-text-secondary">
                  Roster Preview
                </p>
                <div className="mt-3">
                  <TeamRosterPreview team={featuredTeam} />
                </div>
                {featuredTeam.currentRoster.length > 0 ? (
                  <p className="mt-3 text-xs leading-5 text-text-muted">
                    {featuredTeam.currentRoster
                      .slice(0, 4)
                      .map((member) => member.pubgName)
                      .join(" · ")}
                  </p>
                ) : null}
              </div>
            </div>
          </section>
        ) : null}

        <section>
          {categoryOptions.length > 1 ? (
            <nav aria-label="Team categories" className="public-tabs mb-3">
              {categoryOptions.map((option) => (
                <Link
                  key={option.id}
                  href={buildPublicHref(basePath, searchParams, { category: option.id, page: null })}
                  aria-current={category === option.id ? "page" : undefined}
                  className={joinClasses("public-tab", category === option.id && "public-tab-active")}
                >
                  {option.label} ({option.count})
                </Link>
              ))}
            </nav>
          ) : null}

          <PublicSectionHeader
            eyebrow={selectedEvent ? selectedEvent.name : "Published teams"}
            title="Team Directory"
            action={
              <p className="text-xs text-text-muted">
                Showing {visibleRows.length === 0 ? 0 : (page - 1) * DIRECTORY_PAGE_SIZE + 1}–
                {Math.min(page * DIRECTORY_PAGE_SIZE, sortedRows.length)} of {sortedRows.length}
              </p>
            }
            className="mb-3"
          />

          {visibleRows.length > 0 ? (
            <>
              <div className="hidden lg:block">
                <div className="public-table-wrap">
                  <table className="public-table min-w-[1200px]">
                    <caption className="sr-only">Published PUBG team directory and standings</caption>
                    <thead>
                      <tr>
                        <th scope="col">Rank</th>
                        <th scope="col">Team</th>
                        <th scope="col">Region</th>
                        <th scope="col" className="text-right">
                          Total Points
                        </th>
                        <th scope="col" className="text-right">
                          Total Kills
                        </th>
                        <th scope="col" className="text-right">
                          WWCD
                        </th>
                        <th scope="col">Roster Preview</th>
                        <th scope="col">Recent Form</th>
                        <th scope="col">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibleRows.map((row) => (
                        <tr key={row.team.id}>
                          <td>
                            <span className="font-mono font-semibold text-white">#{row.rank}</span>
                          </td>
                          <td>
                            <Link
                              href={`/pubg/teams/${row.team.slug}`}
                              className="flex min-w-40 items-center gap-3 text-white hover:text-accent-blue-light"
                            >
                              <TeamAvatar name={row.team.name} imageUrl={row.team.logoUrl ?? undefined} size="sm" />
                              <span className="font-semibold">{row.team.name}</span>
                            </Link>
                          </td>
                          <td>{row.team.region ?? "Not published"}</td>
                          <td className="text-right font-mono tabular-nums text-accent-blue-light">
                            {formatPublicNumber(row.totalPoints)}
                          </td>
                          <td className="text-right font-mono tabular-nums">{formatPublicNumber(row.kills)}</td>
                          <td className="text-right font-mono tabular-nums">{formatPublicNumber(row.wins)}</td>
                          <td>
                            <TeamRosterPreview team={row.team} />
                          </td>
                          <td>
                            <PlacementStrip placements={row.recentPlacements} />
                          </td>
                          <td>
                            <div className="flex min-w-44 gap-2">
                              <PublicActionLink
                                href={`/pubg/teams/${row.team.slug}`}
                                variant="secondary"
                                className="min-h-8 px-3 py-1.5 text-[11px]"
                              >
                                Team Profile
                              </PublicActionLink>
                              <PublicActionLink
                                href={`/pubg/teams/${row.team.slug}?tab=matches`}
                                variant="secondary"
                                className="min-h-8 px-3 py-1.5 text-[11px]"
                              >
                                Results
                              </PublicActionLink>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="grid gap-3 lg:hidden sm:grid-cols-2">
                {visibleRows.map((row) => (
                  <TeamMobileCard key={row.team.id} row={row} />
                ))}
              </div>
            </>
          ) : (
            <PublicEmptyState
              title={teams.length === 0 ? "Published team data is not available yet" : "No teams match these filters"}
              description={
                teams.length === 0
                  ? "Team profiles will appear after official roster and match data is published."
                  : "Try a broader search, another region or tournament, or reset the filters."
              }
            />
          )}
        </section>

        <PublicPagination basePath={basePath} searchParams={searchParams} page={page} totalPages={totalPages} />
        <PublicCommunityCta
          title="Register your team"
          description="Join Nepal’s growing PUBG PC competition ecosystem and build an official Bravo team profile."
        />
      </div>
    </main>
  );
}
