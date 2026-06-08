import Link from "next/link";
import { notFound } from "next/navigation";
import { getPlayer, getTeam } from "@/lib/data";

type PageProps = { params: Promise<{ playerId: string }> };

export default async function PlayerProfilePage({ params }: PageProps) {
  const { playerId } = await params;
  const player = await getPlayer(playerId);
  if (!player) notFound();

  const team = player.teamId ? await getTeam(player.teamId) : null;

  const stats = [
    { label: "Kills", value: player.kills, accent: "text-bravoRed" },
    { label: "Damage", value: player.damage.toLocaleString(), accent: "text-bravoBlue" },
    { label: "Chicken Dinners", value: player.chickenDinners, accent: "text-bravoGreen" },
    { label: "MVP Awards", value: player.mvpCount, accent: "text-amber-400" },
    { label: "Matches", value: player.matches, accent: "text-white" },
    { label: "Rating", value: player.rating ?? "—", accent: "text-bravoBlue" },
  ];

  return (
    <main className="mx-auto max-w-7xl px-6 py-8 sm:px-8 lg:py-10">
      <section className="page-hero">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-6">
            <div className={`relative flex h-28 w-28 items-center justify-center rounded-3xl border-2 text-4xl font-black shadow-[0_0_40px_rgba(0,180,255,0.15)] ${
              player.isMvpOfWeek
                ? "border-amber-500/40 bg-gradient-to-br from-amber-500/20 to-slate-900 text-amber-400"
                : "border-bravoBlue/30 bg-gradient-to-br from-bravoBlue/20 to-slate-900 text-bravoBlue"
            }`}>
              {player.name.slice(0, 2).toUpperCase()}
              {player.isMvpOfWeek && <span className="absolute -right-2 -top-2 text-2xl">🏆</span>}
            </div>
            <div>
              <p className="section-title">Player Profile</p>
              <h1 className="mt-2 text-4xl font-black text-white">{player.name}</h1>
              {player.isMvpOfWeek && (
                <span className="mt-2 inline-flex rounded-full bg-amber-500/15 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-amber-400">
                  MVP of the Week
                </span>
              )}
              {team && (
                <Link href={`/teams/${team.id}`} className="mt-2 block text-sm font-semibold text-bravoBlue hover:underline">
                  {team.name}
                </Link>
              )}
            </div>
          </div>
          <Link href="/players" className="btn-esports-outline">← All Players</Link>
        </div>

        <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {stats.map((stat) => (
            <div key={stat.label} className="stat-pill p-5">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">{stat.label}</p>
              <p className={`mt-2 text-3xl font-black ${stat.accent}`}>{stat.value}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
