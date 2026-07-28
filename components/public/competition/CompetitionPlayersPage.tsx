import {
  PublicActionLink,
  PublicCommunityCta,
  PublicEmptyState,
  PublicMetric,
  PublicSectionHeader,
  PublicStatusBadge,
  formatPublicNumber,
  readSearchParam,
} from "@/components/public/PublicDesignSystem";
import {
  CompetitionHero,
  DIRECTORY_PAGE_SIZE,
  FilterActions,
  FilterField,
  LargeIdentityArtwork,
  OutputStrip,
  PublicPagination,
  toPositivePage,
  type CompetitionPageProps,
} from "@/components/public/competition/CompetitionShared";
import TeamAvatar from "@/components/ui/TeamAvatar";
import { getPublicPubgPlayers, getPublicPubgTeams, type PubgHubPlayer } from "@/lib/pubg-hub";
import { Crosshair, Search, Trophy, Users } from "lucide-react";
import Link from "next/link";

function PlayerTeamLink({ player }: { player: PubgHubPlayer }) {
  return player.currentTeamId && player.currentTeamName ? (
    <Link href={`/pubg/teams/${player.currentTeamId}`} className="transition hover:text-accent-blue-light">
      {player.currentTeamName}
    </Link>
  ) : (
    <span>Unaffiliated</span>
  );
}

function PlayerMobileCard({ player, rank }: { player: PubgHubPlayer; rank: number }) {
  return (
    <article className="public-card p-4">
      <div className="flex items-start gap-3">
        <span className="inline-flex h-9 min-w-9 items-center justify-center rounded-full border border-accent-blue/35 bg-accent-blue/10 font-mono text-xs text-white">
          {rank}
        </span>
        <TeamAvatar name={player.pubgName} imageUrl={player.avatarUrl ?? undefined} size="md" />
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-display text-lg font-bold text-white">{player.pubgName}</h3>
          <p className="mt-1 truncate text-xs text-text-muted">
            <PlayerTeamLink player={player} />
          </p>
        </div>
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-3 text-xs">
        {[
          ["Kills", player.kills],
          ["Damage", player.damage],
          ["Assists", player.assists],
          ["Knocks", player.knocks],
        ].map(([label, value]) => (
          <div key={String(label)} className="rounded-[4px] border border-white/10 bg-black/20 p-3">
            <dt className="text-text-muted">{label}</dt>
            <dd className="mt-1 font-mono font-semibold tabular-nums text-white">{formatPublicNumber(Number(value))}</dd>
          </div>
        ))}
      </dl>
      <PublicActionLink href={`/pubg/players/${player.slug}`} variant="secondary" className="mt-4 w-full">
        View Profile
      </PublicActionLink>
    </article>
  );
}

export function CompetitionPlayersPage({ dataset, searchParams, basePath }: CompetitionPageProps) {
  const teams = getPublicPubgTeams(dataset);
  const players = getPublicPubgPlayers(dataset, teams);
  const teamLookup = new Map(teams.map((team) => [team.id, team] as const));
  const officialRanks = new Map(players.map((player, index) => [player.id, index + 1] as const));
  const rawQuery = readSearchParam(searchParams.q).trim();
  const query = rawQuery.toLowerCase();
  const requestedTeam = readSearchParam(searchParams.team, "all");
  const teamId = requestedTeam === "all" || teamLookup.has(requestedTeam) ? requestedTeam : "all";
  const requestedSort = readSearchParam(searchParams.sort, "kills");
  const sort = ["kills", "damage", "assists", "knocks", "matches"].includes(requestedSort) ? requestedSort : "kills";

  const filteredPlayers = players.filter((player) => {
    if (query && !`${player.pubgName} ${player.currentTeamName ?? ""}`.toLowerCase().includes(query)) return false;
    if (teamId !== "all" && player.currentTeamId !== teamId) return false;
    return true;
  });

  const sortedPlayers = [...filteredPlayers].sort((first, second) => {
    if (sort === "damage") return second.damage - first.damage || second.kills - first.kills;
    if (sort === "assists") return second.assists - first.assists || second.kills - first.kills;
    if (sort === "knocks") return second.knocks - first.knocks || second.kills - first.kills;
    if (sort === "matches") return second.matches - first.matches || second.kills - first.kills;
    return second.kills - first.kills || second.damage - first.damage;
  });

  const totalPages = Math.max(1, Math.ceil(sortedPlayers.length / DIRECTORY_PAGE_SIZE));
  const page = Math.min(toPositivePage(readSearchParam(searchParams.page, "1")), totalPages);
  const visiblePlayers = sortedPlayers.slice((page - 1) * DIRECTORY_PAGE_SIZE, page * DIRECTORY_PAGE_SIZE);
  const featuredPlayer = players[0] ?? null;
  const featuredVodUrl = featuredPlayer?.recentMatches.find((match) => Boolean(match.vodUrl))?.vodUrl ?? null;
  const activePlayers = players.filter((player) => player.active).length;
  const representedTeams = new Set(players.map((player) => player.currentTeamId).filter(Boolean)).size;
  const totals = players.reduce(
    (summary, player) => ({
      kills: summary.kills + player.kills,
      damage: summary.damage + player.damage,
      assists: summary.assists + player.assists,
      knocks: summary.knocks + player.knocks,
    }),
    { kills: 0, damage: 0, assists: 0, knocks: 0 },
  );

  return (
    <main className="public-page">
      <CompetitionHero
        current="Players"
        title="Players"
        description="Explore Bravo Gaming’s published PUBG roster, player output, and match statistics from official result data."
        aside={
          <div className="public-panel grid gap-px overflow-hidden bg-[rgba(112,145,180,0.2)] sm:grid-cols-3 lg:grid-cols-1">
            <PublicMetric label="Published Players" value={formatPublicNumber(players.length)} icon={<Users className="h-5 w-5" />} />
            <PublicMetric label="Teams Represented" value={formatPublicNumber(representedTeams)} icon={<Trophy className="h-5 w-5" />} />
            <PublicMetric
              label="Published Matches"
              value={formatPublicNumber(dataset.matches.length)}
              icon={<Crosshair className="h-5 w-5" />}
            />
          </div>
        }
      />

      <div className="public-container public-stack">
        <section className="public-panel p-4">
          <form method="get" className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1.3fr_0.75fr_0.9fr_0.9fr_auto]">
            <FilterField label="Search players">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
                <input name="q" defaultValue={rawQuery} className="public-filter-control pl-10" placeholder="Search player or team" />
              </div>
            </FilterField>
            <FilterField label="Role">
              <select disabled className="public-filter-control cursor-not-allowed opacity-60" aria-label="Player roles are not tracked">
                <option>Roles not tracked</option>
              </select>
            </FilterField>
            <FilterField label="Team">
              <select name="team" defaultValue={teamId} className="public-filter-control">
                <option value="all">All teams</option>
                {teams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </select>
            </FilterField>
            <FilterField label="Sort by">
              <select name="sort" defaultValue={sort} className="public-filter-control">
                <option value="kills">Kills</option>
                <option value="damage">Damage</option>
                <option value="assists">Assists</option>
                <option value="knocks">Knocks</option>
                <option value="matches">Matches</option>
              </select>
            </FilterField>
            <FilterActions resetPath={basePath} />
          </form>
        </section>

        {featuredPlayer ? (
          <section className="public-panel p-4 sm:p-5">
            <p className="public-kicker mb-3">Featured Player</p>
            <div className="grid gap-5 lg:grid-cols-[16rem_minmax(0,1fr)]">
              <LargeIdentityArtwork name={featuredPlayer.pubgName} imageUrl={featuredPlayer.avatarUrl} label="#1 rank" />
              <div className="min-w-0 py-1">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h2 className="font-display text-3xl font-bold text-white">{featuredPlayer.pubgName}</h2>
                    <p className="mt-2 text-sm text-text-secondary">
                      <PlayerTeamLink player={featuredPlayer} />
                    </p>
                    <PublicStatusBadge tone="blue" className="mt-3">
                      Published results
                    </PublicStatusBadge>
                  </div>
                  <div className="min-w-32 rounded-[5px] border border-accent-blue/25 bg-accent-blue/10 p-4 text-right">
                    <p className="font-display text-[10px] uppercase tracking-[0.08em] text-text-secondary">Official rank</p>
                    <p className="mt-1 font-display text-4xl font-bold text-white">#1</p>
                    <p className="mt-2 text-[10px] text-text-secondary">Overall rating not tracked</p>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-px overflow-hidden rounded-[5px] border border-[rgba(112,145,180,0.2)] bg-[rgba(112,145,180,0.2)] sm:grid-cols-4">
                  <PublicMetric label="Kills" value={formatPublicNumber(featuredPlayer.kills)} />
                  <PublicMetric label="Damage" value={formatPublicNumber(featuredPlayer.damage)} />
                  <PublicMetric label="Assists" value={formatPublicNumber(featuredPlayer.assists)} />
                  <PublicMetric label="Knocks" value={formatPublicNumber(featuredPlayer.knocks)} />
                </div>

                <div className="mt-5 border-t border-white/10 pt-5">
                  <p className="font-display text-[11px] font-semibold uppercase tracking-[0.05em] text-text-secondary">Recent output</p>
                  <div className="mt-3">
                    <OutputStrip values={featuredPlayer.recentTrend} />
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap gap-3">
                  <PublicActionLink href={`/pubg/players/${featuredPlayer.slug}`}>View Full Profile</PublicActionLink>
                  {featuredVodUrl ? (
                    <PublicActionLink href={featuredVodUrl} variant="secondary">
                      Watch Gameplay
                    </PublicActionLink>
                  ) : null}
                </div>
              </div>
            </div>
          </section>
        ) : null}

        <section className="public-panel p-4">
          <p className="public-kicker mb-3">Player Summary</p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <PublicMetric label="Active roster players" value={formatPublicNumber(activePlayers)} icon={<Users className="h-5 w-5" />} />
            <PublicMetric label="Teams" value={formatPublicNumber(representedTeams)} icon={<Trophy className="h-5 w-5" />} />
            <PublicMetric label="Total kills" value={formatPublicNumber(totals.kills)} icon={<Crosshair className="h-5 w-5" />} />
            <PublicMetric label="Total damage" value={formatPublicNumber(totals.damage)} />
            <PublicMetric label="Total assists" value={formatPublicNumber(totals.assists)} />
            <PublicMetric label="Total knocks" value={formatPublicNumber(totals.knocks)} />
          </div>
        </section>

        <section>
          <PublicSectionHeader
            eyebrow="Published roster"
            title="All Players"
            action={
              <p className="text-xs text-text-muted">
                Showing {visiblePlayers.length === 0 ? 0 : (page - 1) * DIRECTORY_PAGE_SIZE + 1}–
                {Math.min(page * DIRECTORY_PAGE_SIZE, sortedPlayers.length)} of {sortedPlayers.length}
              </p>
            }
            className="mb-3"
          />

          {visiblePlayers.length > 0 ? (
            <>
              <div className="hidden md:block">
                <div className="public-table-wrap">
                  <table className="public-table min-w-[980px]">
                    <caption className="sr-only">Published PUBG player statistics</caption>
                    <thead>
                      <tr>
                        <th scope="col">Rank</th>
                        <th scope="col">Player</th>
                        <th scope="col">Team</th>
                        <th scope="col" className="text-right">
                          Matches
                        </th>
                        <th scope="col" className="text-right">
                          Kills
                        </th>
                        <th scope="col" className="text-right">
                          Damage
                        </th>
                        <th scope="col" className="text-right">
                          Assists
                        </th>
                        <th scope="col" className="text-right">
                          Knocks
                        </th>
                        <th scope="col">Profile</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visiblePlayers.map((player) => (
                        <tr key={player.id}>
                          <td>
                            <span className="font-mono font-semibold text-white">#{officialRanks.get(player.id) ?? "—"}</span>
                          </td>
                          <td>
                            <Link
                              href={`/pubg/players/${player.slug}`}
                              className="flex min-w-40 items-center gap-3 text-white hover:text-accent-blue-light"
                            >
                              <TeamAvatar name={player.pubgName} imageUrl={player.avatarUrl ?? undefined} size="sm" />
                              <span className="font-semibold">{player.pubgName}</span>
                            </Link>
                          </td>
                          <td>
                            <PlayerTeamLink player={player} />
                          </td>
                          <td className="text-right font-mono tabular-nums">{formatPublicNumber(player.matches)}</td>
                          <td className="text-right font-mono tabular-nums text-white">{formatPublicNumber(player.kills)}</td>
                          <td className="text-right font-mono tabular-nums">{formatPublicNumber(player.damage)}</td>
                          <td className="text-right font-mono tabular-nums">{formatPublicNumber(player.assists)}</td>
                          <td className="text-right font-mono tabular-nums">{formatPublicNumber(player.knocks)}</td>
                          <td>
                            <PublicActionLink
                              href={`/pubg/players/${player.slug}`}
                              variant="secondary"
                              className="min-h-8 px-3 py-1.5 text-[11px]"
                            >
                              View Profile
                            </PublicActionLink>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="grid gap-3 md:hidden">
                {visiblePlayers.map((player) => (
                  <PlayerMobileCard key={player.id} player={player} rank={officialRanks.get(player.id) ?? 0} />
                ))}
              </div>
            </>
          ) : (
            <PublicEmptyState
              title={players.length === 0 ? "Published player data is not available yet" : "No players match these filters"}
              description={
                players.length === 0
                  ? "Player profiles will appear after official roster and match data is published."
                  : "Try a broader search, another team, or reset the filters."
              }
            />
          )}
        </section>

        <PublicPagination basePath={basePath} searchParams={searchParams} page={page} totalPages={totalPages} />
        <PublicCommunityCta />
      </div>
    </main>
  );
}
