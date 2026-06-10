"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import SearchInput from "@/components/ui/SearchInput";
import TeamAvatar from "@/components/ui/TeamAvatar";
import type { Team } from "@/lib/types";

export default function TeamsPageClient({ initialTeams }: { initialTeams: Team[] }) {
  const [search, setSearch] = useState("");
  const [showAll, setShowAll] = useState(false);

  const filteredTeams = useMemo(() => {
    const query = search.toLowerCase();
    return initialTeams.filter((team) => team.name.toLowerCase().includes(query));
  }, [initialTeams, search]);

  const visibleTeams = showAll ? filteredTeams : filteredTeams.slice(0, 8);

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="page-hero mb-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="section-title">Teams</p>
            <h1 className="hero-h1 mt-2 !text-4xl">Registered Teams</h1>
            <p className="mt-3 text-text-muted">All registered and verified teams, synced for the current Bravo season.</p>
          </div>
          <Link href="/teams/register" className="btn-primary shrink-0">
            Register Team
          </Link>
        </div>
      </div>

      <SearchInput placeholder="Search teams..." value={search} onChange={setSearch} />

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {visibleTeams.map((team) => (
          <Link key={team.id} href={`/teams/${team.id}`} className="esports-card group min-w-0 p-5 text-center">
            <div className="mx-auto">
              <TeamAvatar name={team.name} size="lg" imageUrl={team.logoUrl ?? team.logo} />
            </div>
            {team.slotNumber && (
              <p className="mt-4 text-label font-bold uppercase text-accent-blue">Slot {team.slotNumber}</p>
            )}
            <h2 className="mt-4 font-display text-sm font-bold uppercase text-white group-hover:text-accent-blue">
              {team.name}
            </h2>
            <p className="truncate text-label uppercase text-text-muted">{team.tag ?? team.name}</p>
            <div className="mt-4 flex justify-center gap-6 text-sm">
              <div>
                <p className="text-label uppercase text-text-muted">Points</p>
                <p className="font-mono-stat font-bold text-accent-green">{team.totalPoints}</p>
              </div>
              <div>
                <p className="text-label uppercase text-text-muted">Rank</p>
                <p className="font-mono-stat font-bold text-accent-blue">
                  {team.rank ? `#${team.rank}` : "-"}
                </p>
              </div>
            </div>
            <span className="btn-outline-blue mt-4 inline-flex w-full justify-center !text-[11px]">
              View Profile
            </span>
          </Link>
        ))}
      </div>

      {!showAll && filteredTeams.length > 8 && (
        <div className="mt-8 text-center">
          <button type="button" onClick={() => setShowAll(true)} className="btn-secondary">
            Load More
          </button>
        </div>
      )}
    </main>
  );
}
