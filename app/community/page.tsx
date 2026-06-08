import Link from "next/link";
import { getAnnouncements, getTeams } from "@/lib/data";
import TeamAvatar from "@/components/ui/TeamAvatar";

export default async function CommunityPage() {
  const [teams, announcements] = await Promise.all([getTeams(), getAnnouncements()]);

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <section className="mb-10">
        <p className="section-title">Teams</p>
        <h2 className="section-heading mt-2">All Registered Teams</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {teams.slice(0, 8).map((t) => (
            <Link key={t.id} href={`/teams/${t.id}`} className="esports-card flex items-center gap-3 p-4">
              <TeamAvatar name={t.name} />
              <div>
                <p className="text-sm font-bold text-white">{t.name}</p>
                <p className="text-label text-text-muted">#{t.rank} · {t.totalPoints} pts</p>
              </div>
            </Link>
          ))}
        </div>
        <Link href="/teams" className="btn-outline-blue mt-4 inline-flex">View All Teams</Link>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div>
          <p className="section-title">Community</p>
          <h2 className="section-heading mt-2">Join Our Community</h2>

          <div className="mt-6 rounded-card border border-accent-discord/30 bg-accent-discord/10 p-6 text-center">
            <p className="font-display text-2xl font-black text-white">JOIN 6,985+ MEMBERS</p>
            <p className="mt-1 text-sm text-text-muted">on Discord</p>
            <a href="https://kamaucha.me/bravo" target="_blank" rel="noreferrer" className="btn-discord mt-4 inline-flex">Join Discord</a>
          </div>

          <div className="mt-6 flex gap-3">
            {["YouTube", "Discord", "Facebook", "Instagram"].map((s) => (
              <span key={s} className="rounded-card border border-white/[0.08] bg-bg-card px-4 py-2 text-label font-bold uppercase text-text-muted">{s}</span>
            ))}
          </div>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <div className="esports-card p-5">
            <h3 className="section-heading !text-sm">Latest Announcements</h3>
            <ul className="mt-4 space-y-3">
              {announcements.map((a) => (
                <li key={a.id} className="text-sm">
                  <p className="font-semibold text-white">{a.title}</p>
                  <p className="text-xs text-text-muted">{a.detail}</p>
                </li>
              ))}
            </ul>
            <Link href="/news" className="btn-outline-blue mt-4 inline-flex !text-[11px]">View All</Link>
          </div>
          <div className="esports-card p-5">
            <h3 className="section-heading !text-sm">Community Stats</h3>
            <dl className="mt-4 space-y-3">
              {[
                ["Total Members", "2,380+"],
                ["Active Members", "1,250+"],
                ["Online Now", "340+"],
                ["Total Messages", "15,680+"],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between text-sm">
                  <dt className="text-text-muted">{k}</dt>
                  <dd className="font-mono-stat font-bold text-accent-green">{v}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>
    </main>
  );
}
