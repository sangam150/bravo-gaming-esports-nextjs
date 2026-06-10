"use client";

import Link from "next/link";
import Tabs from "@/components/ui/Tabs";
import TeamAvatar from "@/components/ui/TeamAvatar";
import type { LeaderboardRow } from "@/lib/types";

function LeaderboardTable({ rows }: { rows: LeaderboardRow[] }) {
  if (rows.length === 0) {
    return (
      <div className="esports-card p-8 text-center text-sm text-text-muted">
        Data not imported yet. The tournament record exists, but official standings have not been imported yet.
      </div>
    );
  }

  return (
    <div className="esports-card overflow-hidden !p-0">
      <div className="table-scroll">
        <table className="data-table min-w-full">
          <thead>
            <tr>
              <th>#</th>
              <th>Slot</th>
              <th>Team</th>
              <th>Matches</th>
              <th>Kill Pts</th>
              <th>Place Pts</th>
              <th>Total Pts</th>
              <th>Avg Place</th>
              <th>WWCD</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.teamId}>
                <td className={row.rank === 1 ? "rank-gold" : "font-mono-stat font-bold text-accent-blue"}>
                  #{row.rank}
                </td>
                <td className="text-text-muted">{row.slotNumber ? `#${row.slotNumber}` : "-"}</td>
                <td>
                  <Link href={`/teams/${row.teamId}`} className="flex items-center gap-2 hover:text-accent-blue">
                    <TeamAvatar name={row.team} size="sm" imageUrl={row.logoUrl} />
                    <span className="font-semibold uppercase">{row.team}</span>
                  </Link>
                </td>
                <td className="text-text-muted">{row.matches}</td>
                <td className="text-text-muted">{row.killPoints ?? row.kills}</td>
                <td className="text-text-muted">{row.placement}</td>
                <td className={row.rank <= 5 ? "points-cell" : "font-mono-stat font-bold text-white"}>
                  {row.points}
                </td>
                <td className="text-text-muted">{row.averagePlacement ?? "-"}</td>
                <td className="text-text-muted">{row.chickenDinners ?? 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function LeaderboardPageClient({
  initialRows,
  overallLabel = "Overall",
  tournamentLeaderboards = [],
}: {
  initialRows: LeaderboardRow[];
  overallLabel?: string;
  tournamentLeaderboards?: Array<{ id: string; title: string; subtitle?: string; rows: LeaderboardRow[] }>;
}) {
  const tabs = [
    ...tournamentLeaderboards.map((leaderboard) => leaderboard.title),
    ...(initialRows.length > 0 ? [overallLabel] : []),
  ];

  const hasLeaderboardData = initialRows.length > 0 || tournamentLeaderboards.length > 0;

  return (
    <main className="page-shell">
      <div className="page-inner">
      <div className="page-hero mb-8">
        <p className="section-title">Competition</p>
        <h1 className="hero-h1 mt-2 !text-4xl">Leaderboard</h1>
        <p className="mt-3 text-text-muted">Tournament standings imported from real Bravo Gaming PUBG PC results.</p>
      </div>

      {!hasLeaderboardData ? (
        <div className="esports-card p-10 text-center">
          <p className="font-display text-lg font-bold uppercase text-white">Data not imported yet</p>
          <p className="mt-2 text-sm text-text-muted">
            Standings appear here after real PUBG PC match results are imported.
          </p>
        </div>
      ) : (
        <Tabs tabs={tabs}>
          {(tab) => (
            <>
              <LeaderboardTable
                rows={tournamentLeaderboards.find((leaderboard) => leaderboard.title === tab)?.rows ?? initialRows}
              />
              {tab !== overallLabel && tournamentLeaderboards.some((leaderboard) => leaderboard.title === tab) && (
                <p className="mt-3 text-center text-xs text-text-muted">
                  {tournamentLeaderboards.find((leaderboard) => leaderboard.title === tab)?.subtitle ??
                    "Imported directly from Bravo Gaming day results."}
                </p>
              )}
            </>
          )}
        </Tabs>
      )}

      <p className="mt-6 text-center text-xs text-text-muted">
        Leaderboard updates automatically after real match data is imported.
      </p>
      </div>
    </main>
  );
}
