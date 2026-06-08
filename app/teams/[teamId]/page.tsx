import Link from "next/link";
import { notFound } from "next/navigation";
import LogoBadge from "@/components/ui/LogoBadge";
import { getPlayers, getTeam } from "@/lib/data";

type PageProps = { params: Promise<{ teamId: string }> };

export default async function TeamProfilePage({ params }: PageProps) {
  const { teamId } = await params;
  const team = await getTeam(teamId);
  if (!team) notFound();

  const allPlayers = await getPlayers();
  const roster = allPlayers.filter((p) => p.teamId === teamId);

  return (
    <main className="mx-auto max-w-7xl px-6 py-8 sm:px-8 lg:py-10">
      <section className="page-hero">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-6">
            <LogoBadge label={team.name} size="lg" />
            <div>
              <p className="section-title">Team Profile</p>
              <h1 className="mt-2 text-4xl font-black text-white">{team.name}</h1>
              {team.tag && <p className="text-sm text-slate-500">Tag: [{team.tag}]</p>}
            </div>
          </div>
          <Link href="/teams" className="btn-esports-outline">← All Teams</Link>
        </div>

        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Rank", value: `#${team.rank ?? "—"}`, color: "text-bravoBlue" },
            { label: "Total Points", value: team.totalPoints, color: "text-bravoGreen" },
            { label: "Kills", value: team.kills, color: "text-white" },
            { label: "Matches", value: team.matches, color: "text-white" },
          ].map((s) => (
            <div key={s.label} className="stat-pill p-5 text-center">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">{s.label}</p>
              <p className={`mt-2 text-3xl font-black ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        <div className="mt-10">
          <p className="section-title">Roster</p>
          <h2 className="mt-2 text-xl font-bold text-white">Active Players</h2>
          {roster.length === 0 ? (
            <p className="mt-4 text-slate-500">No players assigned yet.</p>
          ) : (
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {roster.map((player) => (
                <Link key={player.id} href={`/players/${player.id}`} className="tournament-card block p-4 transition hover:border-bravoBlue/30">
                  <p className="font-bold text-white">{player.name}</p>
                  <div className="mt-2 flex justify-between text-xs text-slate-400">
                    <span>{player.kills} kills</span>
                    <span className="text-bravoBlue">{player.rating ?? "—"} rating</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
