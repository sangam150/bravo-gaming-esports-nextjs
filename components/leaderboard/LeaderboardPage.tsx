"use client";

import Link from "next/link";
import Tabs from "@/components/ui/Tabs";
import TeamAvatar from "@/components/ui/TeamAvatar";
import type { LeaderboardRow } from "@/lib/types";

function LeaderboardTable({ rows }: { rows: LeaderboardRow[] }) {
  return (
    <div className="esports-card overflow-hidden !p-0">
      <table className="data-table min-w-full">
        <thead>
          <tr>
            <th>#</th>
            <th>Team</th>
            <th>Matches</th>
            <th>Kills</th>
            <th>Place Pts</th>
            <th>Total Pts</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.teamId}>
              <td className={row.rank === 1 ? "rank-gold" : "font-mono-stat font-bold text-accent-blue"}>
                #{row.rank}
              </td>
              <td>
                <Link href={`/teams/${row.teamId}`} className="flex items-center gap-2 hover:text-accent-blue">
                  <TeamAvatar name={row.team} size="sm" />
                  <span className="font-semibold uppercase">{row.team}</span>
                </Link>
              </td>
              <td className="text-text-muted">{row.matches}</td>
              <td className="text-text-muted">{row.kills}</td>
              <td className="text-text-muted">{row.placement}</td>
              <td className={row.rank <= 5 ? "points-cell" : "font-mono-stat font-bold text-white"}>
                {row.points}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function LeaderboardPageClient({ initialRows }: { initialRows: LeaderboardRow[] }) {
  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="page-hero mb-8">
        <p className="section-title">Competition</p>
        <h1 className="hero-h1 mt-2 !text-4xl">Leaderboard</h1>
        <p className="mt-3 text-text-muted">Season standings for all registered Bravo Gaming teams.</p>
      </div>

      {initialRows.length === 0 ? (
        <div className="esports-card p-10 text-center">
          <p className="font-display text-lg font-bold uppercase text-white">Waiting for live match data</p>
          <p className="mt-2 text-sm text-text-muted">
            Standings appear after PUBG PC match results are imported from the live API.
          </p>
        </div>
      ) : (
        <Tabs tabs={["Overall", "Weekly", "Monthly", "Season"]}>
          {(tab) => (
            <>
              <LeaderboardTable rows={initialRows} />
              {tab !== "Overall" && (
                <p className="mt-3 text-center text-xs text-text-muted">
                  {tab} rankings mirror overall until period filters are configured.
                </p>
              )}
            </>
          )}
        </Tabs>
      )}

      <p className="mt-6 text-center text-xs text-text-muted">
        Leaderboard updates automatically when live match data is imported.
      </p>
    </main>
  );
}
