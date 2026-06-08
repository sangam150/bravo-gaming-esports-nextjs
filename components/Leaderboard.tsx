import Link from "next/link";
import { getLeaderboard } from "@/lib/data";

export default async function Leaderboard() {
  const rows = await getLeaderboard();

  return (
    <div className="esports-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full border-separate border-spacing-0 text-left text-sm">
          <thead>
            <tr className="border-b border-white/10 bg-slate-900/80 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
              <th className="px-5 py-4">Rank</th>
              <th className="px-5 py-4">Team</th>
              <th className="px-5 py-4">Matches</th>
              <th className="px-5 py-4">Kills</th>
              <th className="px-5 py-4">Placement</th>
              <th className="px-5 py-4">Total PTS</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.teamId} className="border-b border-white/5 transition hover:bg-white/[0.03] even:bg-white/[0.01]">
                <td className="px-5 py-4 font-bold text-bravoBlue">#{row.rank}</td>
                <td className="px-5 py-4">
                  <Link href={`/teams/${row.teamId}`} className="flex items-center gap-3 font-semibold text-white hover:text-bravoBlue">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-800 text-[10px] font-black">
                      {row.team.slice(0, 2).toUpperCase()}
                    </span>
                    {row.team}
                  </Link>
                </td>
                <td className="px-5 py-4 text-slate-400">{row.matches}</td>
                <td className="px-5 py-4 text-slate-400">{row.kills}</td>
                <td className="px-5 py-4 text-slate-400">{row.placement}</td>
                <td className="px-5 py-4 font-bold text-bravoGreen">{row.points}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
