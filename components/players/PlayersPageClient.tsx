"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import SearchInput from "@/components/ui/SearchInput";
import TeamAvatar from "@/components/ui/TeamAvatar";
import type { Player } from "@/lib/types";

export default function PlayersPageClient() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const perPage = 10;

  useEffect(() => {
    fetch("/api/players").then((r) => r.json()).then((d) => setPlayers(d.data ?? []));
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return players.filter(
      (p) => p.name.toLowerCase().includes(q) || (p.teamName ?? "").toLowerCase().includes(q)
    );
  }, [players, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const pageRows = filtered.slice((page - 1) * perPage, page * perPage);

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="page-hero mb-8">
        <p className="section-title">Players</p>
        <h1 className="hero-h1 mt-2 !text-4xl">Top Players</h1>
        <p className="mt-3 text-text-muted">Top players and rising stars.</p>
      </div>

      <SearchInput placeholder="Search players, teams..." value={search} onChange={(v) => { setSearch(v); setPage(1); }} />

      <div className="mt-6 esports-card overflow-hidden !p-0">
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
            {pageRows.map((p, i) => (
              <tr key={p.id}>
                <td className="font-mono-stat font-bold text-accent-blue">#{(page - 1) * perPage + i + 1}</td>
                <td>
                  <Link href={`/players/${p.id}`} className="flex items-center gap-2 hover:text-accent-blue">
                    <TeamAvatar name={p.name} size="sm" />
                    <span className="font-semibold">{p.name}</span>
                  </Link>
                </td>
                <td className="text-text-muted uppercase">{p.teamName ?? "—"}</td>
                <td className="font-mono-stat">{p.kills}</td>
                <td className="font-mono-stat text-text-muted">{p.damage.toLocaleString()}</td>
                <td className="font-mono-stat">{p.mvpCount}</td>
                <td className="font-mono-stat text-accent-green">{p.winRate ? `${Math.round(p.winRate * 100)}%` : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-6 flex items-center justify-center gap-2">
        {Array.from({ length: Math.min(totalPages, 3) }, (_, i) => i + 1).map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setPage(n)}
            className={`h-8 w-8 rounded-btn text-sm font-bold ${page === n ? "bg-accent-blue text-white" : "bg-bg-card text-text-muted"}`}
          >
            {n}
          </button>
        ))}
        {totalPages > 3 && <span className="text-text-muted">...</span>}
        {page < totalPages && (
          <button type="button" onClick={() => setPage(page + 1)} className="btn-secondary !py-1.5 !text-[11px]">Next →</button>
        )}
      </div>
    </main>
  );
}
