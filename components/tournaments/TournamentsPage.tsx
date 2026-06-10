"use client";

import Link from "next/link";
import Tabs from "@/components/ui/Tabs";
import StatusBadge from "@/components/ui/StatusBadge";
import TeamAvatar from "@/components/ui/TeamAvatar";
import type { Tournament } from "@/lib/types";

function TournamentRow({ tournament }: { tournament: Tournament }) {
  return (
    <div className="tournament-card flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
      <TeamAvatar name={tournament.title} size="lg" />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="font-display text-base font-bold uppercase text-white">{tournament.title}</h2>
          <StatusBadge status={tournament.status} />
          <span className="rounded-full border border-accent-blue/30 bg-accent-blue/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-accent-blue">
            {tournament.tier}
          </span>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-text-muted">
          <span>{tournament.server}</span>
          <span className="h-1 w-1 rounded-full bg-white/20" />
          <span>{tournament.format}</span>
          <span className="h-1 w-1 rounded-full bg-white/20" />
          <span>{tournament.perspective ?? "TPP"}</span>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <div>
            <p className="text-label uppercase text-text-muted">Prize Pool</p>
            <p className="font-mono-stat font-bold text-white">{tournament.prizePool}</p>
          </div>
          <div>
            <p className="text-label uppercase text-text-muted">Teams Joined</p>
            <p className="font-mono-stat font-bold text-white">
              {tournament.teamCount}/{tournament.maxTeams}
            </p>
          </div>
          <div>
            <p className="text-label uppercase text-text-muted">Starts</p>
            <p className="font-mono-stat text-text-muted">{tournament.startDate}</p>
          </div>
          <div>
            <p className="text-label uppercase text-text-muted">Matches</p>
            <p className="font-mono-stat font-bold text-accent-blue">{tournament.matchCount ?? 0}</p>
          </div>
        </div>
      </div>
      <div className="flex shrink-0 flex-wrap gap-2">
        <Link href={`/tournaments/${tournament.id}`} className="btn-outline-blue">
          View Details
        </Link>
        {["OPEN", "REGISTERING"].includes(tournament.status) && (
          <Link href={`/teams/register?tournament=${tournament.id}`} className="btn-secondary">
            Register
          </Link>
        )}
      </div>
    </div>
  );
}

export default function TournamentsPageClient({ initialTournaments }: { initialTournaments: Tournament[] }) {
  const filterByStatuses = (statuses: string[]) =>
    initialTournaments.filter((tournament) => statuses.includes(tournament.status));

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="page-hero mb-8">
        <p className="section-title">PUBG PC</p>
        <h1 className="hero-h1 mt-2 !text-4xl">Tournaments</h1>
        <p className="mt-3 text-text-muted">
          Discover live brackets, register your squad, and follow verified results.
        </p>
      </div>

      <Tabs tabs={["Active", "Upcoming", "Past"]}>
        {(tab) => {
          const tournaments =
            tab === "Active"
              ? filterByStatuses(["LIVE", "OPEN", "REGISTERING"])
              : tab === "Upcoming"
                ? filterByStatuses(["UPCOMING"])
                : filterByStatuses(["COMPLETED"]);

          return (
            <div className="space-y-4">
              {tournaments.map((tournament) => (
                <TournamentRow key={tournament.id} tournament={tournament} />
              ))}
              {tournaments.length === 0 && (
                <p className="text-center text-text-muted">
                  {tab === "Past" ? "No past tournaments yet." : `No ${tab.toLowerCase()} tournaments right now.`}
                </p>
              )}
            </div>
          );
        }}
      </Tabs>
    </main>
  );
}
