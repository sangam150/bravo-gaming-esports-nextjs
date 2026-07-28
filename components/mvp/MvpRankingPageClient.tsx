"use client";

import TeamAvatar from "@/components/ui/TeamAvatar";
import { formatDisplayNumber } from "@/lib/display-format";
import { compareMvpRankingPlayers } from "@/lib/ranking-sort";
import { useBravoRealtimeData } from "@/lib/realtime-hooks";
import type { CurrentSeasonOverview, Player } from "@/lib/types";
import Link from "next/link";

export default function MvpRankingPageClient({
  initialOverview,
  initialPlayers,
}: {
  initialOverview: CurrentSeasonOverview | null;
  initialPlayers: Player[];
}) {
  const { overview, players: livePlayers } = useBravoRealtimeData(
    { players: initialPlayers },
    {
      seasons: false,
      tournaments: false,
      standings: false,
      teams: false,
      scrims: false,
      matches: false,
      matchResults: false,
    },
  );

  const activeOverview = overview ?? initialOverview;
  const activePlayers = (
    activeOverview?.players?.length ? activeOverview.players : livePlayers.filter((player) => player.scope !== "tournament")
  )
    .filter((player) => player.matches > 0)
    .sort((firstPlayer, secondPlayer) => compareMvpRankingPlayers(firstPlayer, secondPlayer));

  return (
    <main className="page-shell">
      <div className="page-inner">
        <section className="page-hero">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="section-title">MVP Rankings</p>
              <h1 className="hero-h1 mt-2 !text-4xl">Season MVP Leaderboard</h1>
              <p className="mt-4 max-w-3xl text-sm text-text-muted sm:text-base">
                Ranked by MVP awards first, then kills, damage, assists, and matches played.
              </p>
            </div>
            <Link href="/players" className="btn-secondary shrink-0">
              Open Player Standings
            </Link>
          </div>
        </section>

        {activePlayers.length === 0 ? (
          <section className="esports-card mt-8 p-10 text-center">
            <p className="font-display text-lg font-bold uppercase text-white">Rankings pending</p>
            <p className="mt-2 text-sm text-text-muted">MVP rankings will appear after verified player statistics are published.</p>
          </section>
        ) : (
          <section className="esports-card mt-8 overflow-hidden !p-0">
            <div className="table-scroll" tabIndex={0}>
              <table className="data-table min-w-full">
                <caption className="sr-only">MVP player rankings, awards, performance, and match totals</caption>
                <thead>
                  <tr>
                    <th scope="col">#</th>
                    <th scope="col">Player</th>
                    <th scope="col">Team</th>
                    <th scope="col">MVP Awards</th>
                    <th scope="col">Kills</th>
                    <th scope="col">Damage</th>
                    <th scope="col">Assists</th>
                    <th scope="col">Matches</th>
                  </tr>
                </thead>
                <tbody>
                  {activePlayers.map((player, index) => (
                    <tr key={player.id}>
                      <td className={index === 0 ? "rank-gold" : "font-mono-stat font-bold text-accent-blue"}>#{index + 1}</td>
                      <td>
                        <Link href={`/players/${player.slug ?? player.id}`} className="flex items-center gap-2 hover:text-accent-blue">
                          <TeamAvatar name={player.name} size="sm" />
                          <span className="font-semibold text-white">{player.name}</span>
                        </Link>
                      </td>
                      <td className="text-text-muted">{player.teamName ?? "-"}</td>
                      <td className="font-mono-stat">{player.mvpCount}</td>
                      <td className="font-mono-stat">{player.kills}</td>
                      <td className="font-mono-stat text-text-muted">{formatDisplayNumber(player.damage)}</td>
                      <td className="font-mono-stat text-text-muted">{formatDisplayNumber(player.assists)}</td>
                      <td className="font-mono-stat text-text-muted">{player.matches}</td>
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
