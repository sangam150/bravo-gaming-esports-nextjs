"use client";

import TeamAvatar from "@/components/ui/TeamAvatar";
import { formatDisplayNumber } from "@/lib/display-format";
import { compareMvpRankingPlayers, comparePlayerLeaderboardPerformance, compareTopFraggerPerformance } from "@/lib/ranking-sort";
import { useBravoRealtimeData } from "@/lib/realtime-hooks";
import type { CurrentSeasonOverview, LeaderboardRow, Player } from "@/lib/types";
import Link from "next/link";
import type { ReactNode } from "react";

function SectionTable({ title, description, columns, rows }: { title: string; description: string; columns: string[]; rows: ReactNode }) {
  return (
    <section className="esports-card overflow-hidden !p-0">
      <div className="border-b border-white/10 px-5 py-4">
        <p className="section-heading !text-sm">{title}</p>
        <p className="mt-1 text-sm text-text-muted">{description}</p>
      </div>
      <div className="table-scroll" tabIndex={0}>
        <table className="data-table min-w-full">
          <caption className="sr-only">
            {title}: {description}
          </caption>
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column} scope="col">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>{rows}</tbody>
        </table>
      </div>
    </section>
  );
}

export default function StatisticsPageClient({
  initialOverview,
  initialLeaderboard,
  initialPlayers,
}: {
  initialOverview: CurrentSeasonOverview | null;
  initialLeaderboard: LeaderboardRow[];
  initialPlayers: Player[];
}) {
  const liveCompetition = useBravoRealtimeData(
    { players: initialPlayers },
    {
      scrims: false,
      matches: false,
      matchResults: false,
    },
  );

  const activeOverview = liveCompetition.overview ?? initialOverview;
  const activeLeaderboard = (
    activeOverview?.leaderboard?.length
      ? activeOverview.leaderboard
      : liveCompetition.leaderboardRows.length > 0
        ? liveCompetition.leaderboardRows
        : initialLeaderboard
  ).filter((row) => row.matches > 0);
  const playerPool = (
    activeOverview?.players?.length ? activeOverview.players : liveCompetition.players.filter((player) => player.scope !== "tournament")
  ).filter((player) => player.matches > 0);
  const playerStandings = [...playerPool].sort((firstPlayer, secondPlayer) =>
    comparePlayerLeaderboardPerformance(firstPlayer, secondPlayer),
  );
  const topFraggers = [...playerPool].sort((firstPlayer, secondPlayer) => compareTopFraggerPerformance(firstPlayer, secondPlayer));
  const mvpRanking = [...playerPool].sort((firstPlayer, secondPlayer) => compareMvpRankingPlayers(firstPlayer, secondPlayer));

  return (
    <main className="page-shell">
      <div className="page-inner space-y-8">
        <section className="page-hero">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="section-title">Statistics</p>
              <h1 className="hero-h1 mt-2 !text-4xl">Performance Dashboards</h1>
              <p className="mt-4 max-w-3xl text-sm text-text-muted sm:text-base">
                Review team standings, player standings, top fraggers, and MVP rankings from published match results.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href="/leaderboard" className="btn-primary">
                Team Leaderboard
              </Link>
              <Link href="/mvp-ranking" className="btn-secondary">
                MVP Rankings
              </Link>
            </div>
          </div>
        </section>

        {activeLeaderboard.length === 0 && playerPool.length === 0 ? (
          <section className="esports-card p-10 text-center">
            <p className="font-display text-lg font-bold uppercase text-white">Statistics pending</p>
            <p className="mt-2 text-sm text-text-muted">Verified team and player statistics will appear after results are published.</p>
          </section>
        ) : (
          <div className="grid gap-6">
            <SectionTable
              title="Team Standings"
              description="Sorted by total points, kill output, wins, best placement, and slot order for tied teams."
              columns={["#", "Team", "Matches", "Kills", "Place Pts", "Total Pts"]}
              rows={activeLeaderboard.slice(0, 10).map((row) => (
                <tr key={row.teamId}>
                  <td className={row.rank === 1 ? "rank-gold" : "font-mono-stat font-bold text-accent-blue"}>#{row.rank}</td>
                  <td>
                    <Link href={`/teams/${row.teamId}`} className="flex items-center gap-2 hover:text-accent-blue">
                      <TeamAvatar name={row.team} imageUrl={row.logoUrl} size="sm" />
                      <span className="font-semibold text-white">{row.team}</span>
                    </Link>
                  </td>
                  <td className="text-text-muted">{row.matches}</td>
                  <td className="text-text-muted">{row.kills}</td>
                  <td className="text-text-muted">{row.placement}</td>
                  <td className="points-cell">{row.points}</td>
                </tr>
              ))}
            />

            <div className="grid gap-6 xl:grid-cols-2">
              <SectionTable
                title="Player Standings"
                description="Sorted by kills, damage, assists, and matches played."
                columns={["#", "Player", "Team", "Kills", "Damage", "Assists", "Matches"]}
                rows={playerStandings.slice(0, 10).map((player, index) => (
                  <tr key={player.id}>
                    <td className={index === 0 ? "rank-gold" : "font-mono-stat font-bold text-accent-blue"}>#{index + 1}</td>
                    <td>
                      <Link href={`/players/${player.slug ?? player.id}`} className="flex items-center gap-2 hover:text-accent-blue">
                        <TeamAvatar name={player.name} size="sm" />
                        <span className="font-semibold text-white">{player.name}</span>
                      </Link>
                    </td>
                    <td className="text-text-muted">{player.teamName ?? "-"}</td>
                    <td>{player.kills}</td>
                    <td>{formatDisplayNumber(player.damage)}</td>
                    <td>{formatDisplayNumber(player.assists)}</td>
                    <td>{player.matches}</td>
                  </tr>
                ))}
              />

              <SectionTable
                title="Top Fraggers"
                description="Sorted by kills, damage, and assists."
                columns={["#", "Player", "Team", "Kills", "Damage", "Assists"]}
                rows={topFraggers.slice(0, 10).map((player, index) => (
                  <tr key={player.id}>
                    <td className={index === 0 ? "rank-gold" : "font-mono-stat font-bold text-accent-blue"}>#{index + 1}</td>
                    <td>
                      <Link href={`/players/${player.slug ?? player.id}`} className="flex items-center gap-2 hover:text-accent-blue">
                        <TeamAvatar name={player.name} size="sm" />
                        <span className="font-semibold text-white">{player.name}</span>
                      </Link>
                    </td>
                    <td className="text-text-muted">{player.teamName ?? "-"}</td>
                    <td>{player.kills}</td>
                    <td>{formatDisplayNumber(player.damage)}</td>
                    <td>{formatDisplayNumber(player.assists)}</td>
                  </tr>
                ))}
              />
            </div>

            <SectionTable
              title="MVP Rankings"
              description="Sorted by MVP awards, then kills, damage, assists, and matches."
              columns={["#", "Player", "Team", "MVP", "Kills", "Damage", "Assists", "Matches"]}
              rows={mvpRanking.slice(0, 10).map((player, index) => (
                <tr key={player.id}>
                  <td className={index === 0 ? "rank-gold" : "font-mono-stat font-bold text-accent-blue"}>#{index + 1}</td>
                  <td>
                    <Link href={`/players/${player.slug ?? player.id}`} className="flex items-center gap-2 hover:text-accent-blue">
                      <TeamAvatar name={player.name} size="sm" />
                      <span className="font-semibold text-white">{player.name}</span>
                    </Link>
                  </td>
                  <td className="text-text-muted">{player.teamName ?? "-"}</td>
                  <td>{player.mvpCount}</td>
                  <td>{player.kills}</td>
                  <td>{formatDisplayNumber(player.damage)}</td>
                  <td>{formatDisplayNumber(player.assists)}</td>
                  <td>{player.matches}</td>
                </tr>
              ))}
            />
          </div>
        )}
      </div>
    </main>
  );
}
