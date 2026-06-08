import Image from "next/image";
import Link from "next/link";
import LiveStatusSidebar from "./LiveStatusSidebar";
import SponsorStrip from "./SponsorStrip";
import StatusBadge from "@/components/ui/StatusBadge";
import TeamAvatar from "@/components/ui/TeamAvatar";
import SectionHeader from "@/components/ui/SectionHeader";
import {
  getAnnouncements,
  getLeaderboard,
  getMvpOfWeek,
  getSiteStats,
  getStreams,
  getTournaments,
  getVideos,
} from "@/lib/data";

const statIcons = ["👥", "⚔", "🏆", "🎁", "👥", "👁"];

function countdown(startDate: string) {
  const diff = new Date(startDate).getTime() - Date.now();
  if (diff <= 0) return "Soon";
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  return `${d}D ${h}H`;
}

export default async function HomePage() {
  const [stats, tournaments, leaderboard, mvp, announcements, streams, videos] = await Promise.all([
    getSiteStats(),
    getTournaments(),
    getLeaderboard(),
    getMvpOfWeek(),
    getAnnouncements(),
    getStreams(),
    getVideos(),
  ]);

  const heroStats = [
    { label: "Teams Registered", value: `${stats.teamsRegistered}+` },
    { label: "Matches Hosted", value: `${stats.matchesHosted}+` },
    { label: "Tournaments Completed", value: `${stats.tournamentsCompleted}+` },
    { label: "Prize Pools Awarded", value: stats.prizePoolsAwarded },
    { label: "Community Members", value: `${stats.communityMembers.toLocaleString()}+` },
    { label: "YouTube Views", value: stats.youtubeViews },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 pb-12 pt-6 sm:px-6 lg:px-8">
      {/* Hero row: 75% + 320px sidebar */}
      <div className="flex flex-col gap-6 xl:flex-row">
        <div className="hero-banner min-h-[420px] flex-1 overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_50%,_rgba(29,155,240,0.12),_transparent_45%)]" />
          <div className="absolute bottom-0 right-0 hidden h-full w-[42%] opacity-90 md:block">
            <Image src="/images/hero-character.svg" alt="" fill className="object-contain object-bottom" priority />
          </div>
          <div className="absolute inset-0 bg-gradient-to-r from-bg-primary via-bg-primary/95 to-transparent" />
          <div className="relative z-10 p-6 sm:p-8 lg:p-10">
            <span className="brand-badge">#1 PUBG PC ESPORTS ORGANIZATION IN NEPAL</span>
            <h1 className="hero-h1 mt-5">
              <span className="text-accent-blue">BRAVO GAMING</span>
              <br />
              ESPORTS NEPAL 🇳🇵
            </h1>
            <p className="mt-3 font-display text-sm font-semibold uppercase tracking-[0.12em] text-text-muted">
              PUBG PC Scrims • Tournaments • Live Streaming
            </p>
            <p className="tagline-italic mt-2">Where Champions Are Made</p>
            <p className="mt-4 max-w-lg text-sm leading-relaxed text-text-muted">
              Professional PUBG PC scrims, tournaments, esports broadcasts, team rankings, player statistics, and a gaming community built for champions.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              <Link href="/live-stream" className="btn-watch-live">▶ Watch Live</Link>
              <Link href="/pubg-scrims" className="btn-primary">Join Scrims</Link>
              <Link href="/leaderboard" className="btn-secondary">🏆 View Leaderboard</Link>
              <a href="https://kamaucha.me/bravo" target="_blank" rel="noopener noreferrer" className="btn-discord">Join Discord</a>
            </div>
          </div>
        </div>
        <LiveStatusSidebar />
      </div>

      {/* Stats bar */}
      <section className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        {heroStats.map((s, i) => (
          <div key={s.label} className="stat-pill count-up flex items-center gap-3" style={{ animationDelay: `${i * 0.05}s` }}>
            <span className="text-2xl text-accent-blue">{statIcons[i]}</span>
            <div>
              <p className="font-mono-stat text-stat text-white">{s.value}</p>
              <p className="mt-0.5 text-label font-semibold uppercase text-text-muted">{s.label}</p>
            </div>
          </div>
        ))}
      </section>

      {/* Middle row: 3 columns */}
      <section className="mt-8 grid gap-6 lg:grid-cols-12">
        {/* Featured Tournaments */}
        <div className="lg:col-span-4">
          <SectionHeader title="Featured Tournaments" linkLabel="View All" linkHref="/tournaments" />
          <div className="space-y-3">
            {tournaments.slice(0, 3).map((t) => (
              <Link key={t.id} href={`/tournaments/${t.id}`} className="tournament-card block p-4">
                <div className="flex gap-3">
                  <TeamAvatar name={t.title} size="lg" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="truncate font-display text-[15px] font-semibold uppercase text-white">{t.title}</h3>
                      <StatusBadge status={t.status} />
                    </div>
                    <div className="mt-2 grid grid-cols-3 gap-1 text-center">
                      <div>
                        <p className="text-label uppercase text-text-muted">Prize</p>
                        <p className="font-mono-stat text-xs font-bold text-white">{t.prizePool.replace("NPR ", "")}</p>
                      </div>
                      <div>
                        <p className="text-label uppercase text-text-muted">Teams</p>
                        <p className="font-mono-stat text-xs font-bold text-white">{t.teamCount}/{t.maxTeams}</p>
                      </div>
                      <div>
                        <p className="text-label uppercase text-text-muted">Starts</p>
                        <p className="font-mono-stat text-xs font-bold text-accent-blue">{countdown(t.startDate)}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Live Leaderboard */}
        <div className="lg:col-span-5">
          <SectionHeader title="Live Leaderboard" linkLabel="View Full Leaderboard" linkHref="/leaderboard" />
          <div className="esports-card overflow-hidden !p-0">
            {leaderboard.length === 0 ? (
              <p className="p-6 text-center text-sm text-text-muted">Waiting for live match data</p>
            ) : (
              <table className="data-table min-w-full">
                <thead>
                  <tr>
                    <th>#</th><th>Team</th><th>M</th><th>K</th><th>Place</th><th>Pts</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.slice(0, 5).map((row) => (
                    <tr key={row.teamId} className={row.rank === 1 ? "bg-bg-hover" : ""}>
                      <td className={row.rank === 1 ? "rank-gold" : "font-mono-stat font-bold text-accent-blue"}>#{row.rank}</td>
                      <td>
                        <Link href={`/teams/${row.teamId}`} className="flex items-center gap-2 hover:text-accent-blue">
                          <TeamAvatar name={row.team} size="sm" />
                          <span className="font-semibold">{row.team}</span>
                        </Link>
                      </td>
                      <td className="text-text-muted">{row.matches}</td>
                      <td className="text-text-muted">{row.kills}</td>
                      <td className="text-text-muted">{row.placement}</td>
                      <td className="points-cell">{row.points}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* MVP */}
        {mvp && (
          <div className="lg:col-span-3">
            <SectionHeader title="MVP of the Week" />
            <div className="mvp-card relative p-5">
              <span className="absolute right-3 top-3 rounded border border-accent-yellow/40 bg-accent-yellow/10 px-2 py-0.5 font-display text-label font-bold text-accent-yellow">MVP</span>
              <div className="relative mx-auto flex h-24 w-24 items-center justify-center rounded-full border-2 border-accent-blue/40 bg-gradient-to-br from-accent-blue/30 to-bg-primary shadow-glow">
                <span className="font-display text-3xl font-black text-white">{mvp.name.slice(0, 2).toUpperCase()}</span>
              </div>
              <div className="mt-4 text-center">
                <h3 className="font-display text-xl font-bold text-white">{mvp.name}</h3>
                <p className="text-label uppercase text-text-muted">{mvp.teamName}</p>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                {[
                  { l: "Kills", v: mvp.kills },
                  { l: "Damage", v: mvp.damage.toLocaleString() },
                  { l: "Chicken Dinners", v: mvp.chickenDinners },
                  { l: "MVP Awards", v: mvp.mvpCount },
                ].map((s) => (
                  <div key={s.l} className="rounded-card border border-white/[0.05] bg-bg-primary p-2.5">
                    <p className="text-label uppercase text-text-muted">{s.l}</p>
                    <p className="font-mono-stat font-bold text-white">{s.v}</p>
                  </div>
                ))}
              </div>
              <Link href={`/players/${mvp.id}`} className="btn-outline-blue mt-4 w-full justify-center">View Profile</Link>
            </div>
          </div>
        )}
      </section>

      {/* Bottom row */}
      <section className="mt-8 grid gap-6 lg:grid-cols-3">
        <div>
          <SectionHeader title="Latest Videos" linkLabel="View All" linkHref="/videos" />
          <div className="grid grid-cols-2 gap-3">
            {videos.slice(0, 4).map((v) => (
              <div key={v.id} className="video-card">
                <div className="relative aspect-video bg-gradient-to-br from-slate-800 to-bg-primary">
                  <span className="absolute bottom-1.5 right-1.5 rounded bg-black/80 px-1.5 py-0.5 font-mono-stat text-[10px] text-white">{v.duration}</span>
                </div>
                <div className="p-3">
                  <p className="text-[10px] font-bold uppercase text-accent-blue">{v.category}</p>
                  <p className="mt-1 line-clamp-2 text-xs font-semibold text-white">{v.title}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <SectionHeader title="Latest News" linkLabel="View All" linkHref="/news" />
          <div className="space-y-3">
            {announcements.slice(0, 3).map((n) => (
              <article key={n.id} className="news-card flex gap-3 p-3">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-card bg-bg-primary text-xl">📰</div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="line-clamp-1 text-sm font-semibold text-white">{n.title}</h3>
                    <span className="shrink-0 text-[10px] uppercase text-text-muted">{n.date}</span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs text-text-muted">{n.detail}</p>
                </div>
              </article>
            ))}
          </div>
        </div>

        <div>
          <SectionHeader title="Upcoming Streams" linkLabel="View Schedule" linkHref="/stream-schedule" />
          <div className="space-y-3">
            {streams.map((s) => (
              <div key={s.id} className="stream-card p-4">
                <p className="text-label font-bold uppercase text-accent-blue">{s.time}</p>
                <p className="mt-1 font-semibold text-white">{s.title}</p>
                <Link href="/live-stream" className="mt-2 inline-flex items-center gap-1 font-display text-label font-bold uppercase text-accent-red">
                  <span className="live-dot h-1.5 w-1.5" /> YouTube Live
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      <SponsorStrip />
    </div>
  );
}
