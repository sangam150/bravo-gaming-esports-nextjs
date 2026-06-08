"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Tabs from "@/components/ui/Tabs";
import StatusBadge from "@/components/ui/StatusBadge";
import TeamAvatar from "@/components/ui/TeamAvatar";
import type { Tournament } from "@/lib/types";

function TournamentRow({ t }: { t: Tournament }) {
  const matchProgress = t.status === "LIVE" ? "6/20" : t.status === "COMPLETED" ? "20/20" : "0/16";
  return (
    <div className="tournament-card flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
      <TeamAvatar name={t.title} size="lg" />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="font-display text-base font-bold uppercase text-white">{t.title}</h2>
          <StatusBadge status={t.status} />
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <div>
            <p className="text-label uppercase text-text-muted">Prize Pool</p>
            <p className="font-mono-stat font-bold text-white">{t.prizePool}</p>
          </div>
          <div>
            <p className="text-label uppercase text-text-muted">Teams</p>
            <p className="font-mono-stat font-bold text-white">{t.teamCount}/{t.maxTeams}</p>
          </div>
          <div>
            <p className="text-label uppercase text-text-muted">Starts</p>
            <p className="font-mono-stat text-text-muted">{t.startDate}</p>
          </div>
          <div>
            <p className="text-label uppercase text-text-muted">Matches</p>
            <p className="font-mono-stat font-bold text-accent-blue">{matchProgress}</p>
          </div>
        </div>
      </div>
      <div className="flex shrink-0 gap-2">
        <Link href={`/tournaments/${t.id}`} className="btn-outline-blue">View Details →</Link>
        {["OPEN", "REGISTERING"].includes(t.status) && (
          <Link href={`/teams/register?tournament=${t.id}`} className="btn-secondary">Register</Link>
        )}
      </div>
    </div>
  );
}

export default function TournamentsPageClient() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);

  useEffect(() => {
    fetch("/api/tournaments").then((r) => r.json()).then((d) => setTournaments(d.data ?? []));
  }, []);

  const filter = (statuses: string[]) => tournaments.filter((t) => statuses.includes(t.status));

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="page-hero mb-8">
        <p className="section-title">PUBG PC</p>
        <h1 className="hero-h1 mt-2 !text-4xl">Tournaments</h1>
        <p className="mt-3 text-text-muted">Discover live brackets, register your squad, and follow verified results.</p>
      </div>

      <Tabs tabs={["Active", "Upcoming", "Past"]}>
        {(tab) => (
          <div className="space-y-4">
            {(tab === "Active" ? filter(["LIVE", "OPEN", "REGISTERING"]) :
              tab === "Upcoming" ? filter(["UPCOMING"]) :
              filter(["COMPLETED"])).map((t) => (
              <TournamentRow key={t.id} t={t} />
            ))}
            {tab === "Past" && filter(["COMPLETED"]).length === 0 && (
              <p className="text-center text-text-muted">No past tournaments yet.</p>
            )}
          </div>
        )}
      </Tabs>
    </main>
  );
}
