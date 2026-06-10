"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import SearchInput from "@/components/ui/SearchInput";
import TeamAvatar from "@/components/ui/TeamAvatar";
import type { Player } from "@/lib/types";

export default function PlayersPageClient({ initialPlayers }: { initialPlayers: Player[] }) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const perPage = 10;

  const filteredPlayers = useMemo(() => {
    const query = search.toLowerCase();
    return initialPlayers.filter(
      (player) =>
        player.name.toLowerCase().includes(query) ||
        (player.teamName ?? "").toLowerCase().includes(query)
    );
  }, [initialPlayers, search]);

  const totalPages = Math.max(1, Math.ceil(filteredPlayers.length / perPage));
  const pageRows = filteredPlayers.slice((page - 1) * perPage, page * perPage);

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="page-hero mb-8">
        <p className="section-title">Players</p>
        <h1 className="hero-h1 mt-2 !text-4xl">Top Players</h1>
        <p className="mt-3 text-text-muted">Top fraggers, IGLs, and rising stars across the Bravo ecosystem.</p>
      </div>

      <SearchInput
        placeholder="Search players, teams..."
        value={search}
        onChange={(value) => {
          setSearch(value);
          setPage(1);
        }}
      />

      <div className="mt-6 esports-card overflow-hidden !p-0">
        <div className="table-scroll">
          <table className="data-table min-w-full">
            <thead>
              <tr>
                <th>#</th>
                <th>Player</th>
                <th>Team</th>
                <th>Kills</th>
                <th>Damage</th>
                <th>MVP</th>
                <th>Win Rate</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((player, index) => (
                <tr key={player.id}>
                  <td className="font-mono-stat font-bold text-accent-blue">
                    #{(page - 1) * perPage + index + 1}
                  </td>
                  <td>
                    <Link href={`/players/${player.id}`} className="flex items-center gap-2 hover:text-accent-blue">
                      <TeamAvatar name={player.name} size="sm" />
                      <span className="font-semibold">{player.name}</span>
                    </Link>
                  </td>
                  <td className="text-text-muted uppercase">{player.teamName ?? "-"}</td>
                  <td className="font-mono-stat">{player.kills}</td>
                  <td className="font-mono-stat text-text-muted">{player.damage.toLocaleString()}</td>
                  <td className="font-mono-stat">{player.mvpCount}</td>
                  <td className="font-mono-stat text-accent-green">
                    {typeof player.winRate === "number" ? `${Math.round(player.winRate * 100)}%` : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-6 flex items-center justify-center gap-2">
        {Array.from({ length: Math.min(totalPages, 3) }, (_, index) => index + 1).map((pageNumber) => (
          <button
            key={pageNumber}
            type="button"
            onClick={() => setPage(pageNumber)}
            className={`h-8 w-8 rounded-btn text-sm font-bold ${
              page === pageNumber ? "bg-accent-blue text-white" : "bg-bg-card text-text-muted"
            }`}
          >
            {pageNumber}
          </button>
        ))}
        {totalPages > 3 && <span className="text-text-muted">...</span>}
        {page < totalPages && (
          <button type="button" onClick={() => setPage(page + 1)} className="btn-secondary !py-1.5 !text-[11px]">
            Next
          </button>
        )}
      </div>
    </main>
  );
}
