"use client";

import { useState } from "react";
import Link from "next/link";
import LogoBadge from "@/components/ui/LogoBadge";
import type { Player, Team, TournamentMatch } from "@/lib/types";

const tabs = ["Matches", "Players", "Teams"] as const;

export default function TournamentTabs({
  matches,
  teams,
  players,
}: {
  matches: TournamentMatch[];
  teams: Team[];
  players: Player[];
}) {
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]>("Matches");

  return (
    <section className="mt-10 esports-card p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="section-title">Tournament dashboard</p>
          <h2 className="mt-2 text-3xl font-semibold text-white">Match, player and team insights</h2>
        </div>
        <div className="flex flex-wrap gap-3">
          {tabs.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${activeTab === tab ? "bg-bravoBlue text-slate-950" : "bg-white/5 text-slate-300 hover:bg-white/10"}`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {activeTab === "Matches" && (
        <div className="mt-8 grid gap-6 lg:grid-cols-3">
          {matches.length === 0 ? (
            <p className="text-slate-400 lg:col-span-3">Event data will appear here after admin approval.</p>
          ) : (
            matches.map((match) => (
              <div key={match.id} className="esports-card p-6">
                <div className="flex items-center gap-4">
                  <LogoBadge label={match.map} />
                  <div>
                    <p className="text-sm uppercase tracking-[0.24em] text-slate-400">Map</p>
                    <p className="mt-2 text-xl font-semibold text-white">{match.map}</p>
                  </div>
                </div>
                <div className="mt-6 space-y-3 text-slate-300">
                  <p>Winner: <span className="font-semibold text-white">{match.winner}</span></p>
                  <p>Points: <span className="font-semibold text-white">{match.points}</span></p>
                  <p>Knockouts: <span className="font-semibold text-white">{match.knockouts}</span></p>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === "Players" && (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {players.map((player) => (
            <Link key={player.id} href={`/players/${player.id}`} className="esports-card block p-5 transition hover:border-bravoBlue/30">
              <p className="text-lg font-semibold text-white">{player.name}</p>
              <p className="text-sm text-slate-400">{player.teamName}</p>
              <div className="mt-4 flex justify-between text-sm text-slate-300">
                <span>Kills {player.kills}</span>
                <span className="text-bravoBlue">{player.rating ?? "-"} rating</span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {activeTab === "Teams" && (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {teams.map((team) => (
            <Link key={team.id} href={`/teams/${team.id}`} className="esports-card block p-5 transition hover:border-bravoBlue/30">
              <div className="flex items-center gap-4">
                <LogoBadge label={team.name} />
                <div>
                  <p className="font-semibold text-white">{team.name}</p>
                  <p className="text-sm text-slate-400">#{team.rank} | {team.totalPoints} pts</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
