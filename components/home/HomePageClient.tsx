"use client";

import Image from "next/image";
import Link from "next/link";
import LiveStatusSidebar from "./LiveStatusSidebar";
import SponsorStrip from "./SponsorStrip";
import StatusBadge from "@/components/ui/StatusBadge";
import TeamAvatar from "@/components/ui/TeamAvatar";
import SectionHeader from "@/components/ui/SectionHeader";
import {
  getMvpPlayer,
  useBravoRealtimeData,
  useRealtimeAnnouncements,
  useRealtimeSiteStats,
  useRealtimeStreams,
  useRealtimeVideos,
} from "@/lib/realtime-hooks";
import type {
  Announcement,
  CurrentSeasonOverview,
  LeaderboardRow,
  Player,
  SiteStats,
  SponsorItem,
  StreamSchedule,
  Tournament,
  VideoItem,
} from "@/lib/types";

const statIcons = ["TM", "MH", "TC", "PP", "CM", "YT"];

function formatHeroCount(value: number) {
  return value > 0 ? `${value}+` : "0";
}

function countdown(startDate: string) {
  const diff = new Date(startDate).getTime() - Date.now();
  if (diff <= 0) return "Soon";
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  return `${d}D ${h}H`;
}

function isPlaceholderValue(value: string) {
  return value.trim().toLowerCase().includes("not imported yet");
}

export default function HomePageClient({
  initialStats,
  initialTournaments,
  initialLeaderboard,
  initialMvp,
  initialAnnouncements,
  initialStreams,
  initialVideos,
  initialSponsors,
  initialOverview,
}: {
  initialStats: SiteStats;
  initialTournaments: Tournament[];
  initialLeaderboard: LeaderboardRow[];
  initialMvp: Player | null;
  initialAnnouncements: Announcement[];
  initialStreams: StreamSchedule[];
  initialVideos: VideoItem[];
  initialSponsors: SponsorItem[];
  initialOverview: CurrentSeasonOverview | null;
}) {
  const liveCompetition = useBravoRealtimeData(undefined, {
    scrims: false,
    matches: false,
    matchResults: false,
  });
  const { data: liveStatsDoc } = useRealtimeSiteStats(initialStats);
  const { data: liveAnnouncements } = useRealtimeAnnouncements(initialAnnouncements);
  const { data: liveStreams } = useRealtimeStreams(initialStreams);
  const { data: liveVideos } = useRealtimeVideos(initialVideos);

  const activeOverview = liveCompetition.overview ?? initialOverview;
  const activeAnnouncements = liveAnnouncements.length > 0 ? liveAnnouncements : initialAnnouncements;
  const activeStreams = liveStreams.length > 0 ? liveStreams : initialStreams;
  const activeVideos = liveVideos.length > 0 ? liveVideos : initialVideos;
  const activeTournaments =
    activeOverview?.tournaments?.length
      ? [...activeOverview.tournaments]
      : liveCompetition.tournaments.length > 0
        ? [...liveCompetition.tournaments]
        : [...initialTournaments];
  const activeLeaderboard =
    activeOverview?.leaderboard?.length
      ? activeOverview.leaderboard
      : liveCompetition.leaderboardRows.length > 0
        ? liveCompetition.leaderboardRows
        : initialLeaderboard;
  const activePlayers =
    activeOverview?.players?.length
      ? activeOverview.players
      : liveCompetition.players.filter((player) => player.scope !== "tournament");
  const activeMvp = getMvpPlayer(activePlayers) ?? initialMvp;
  const activeStats = {
    ...initialStats,
    ...(liveStatsDoc ? Object.fromEntries(Object.entries(liveStatsDoc).filter(([key]) => key !== "id")) : {}),
    teamsRegistered: activeOverview?.registeredTeams ?? initialStats.teamsRegistered,
    matchesHosted: activeOverview?.matchesPlayed ?? initialStats.matchesHosted,
    tournamentsCompleted:
      activeOverview?.completedDays ??
      activeTournaments.filter((tournament) => tournament.status === "COMPLETED").length,
  } satisfies SiteStats;
  const featuredTournaments = [...activeTournaments]
    .sort((firstTournament, secondTournament) => {
      const firstIsCurrent = activeOverview?.currentTournament?.id === firstTournament.id ? 1 : 0;
      const secondIsCurrent = activeOverview?.currentTournament?.id === secondTournament.id ? 1 : 0;
      return (
        secondIsCurrent - firstIsCurrent ||
        (secondTournament.seasonDayNumber ?? secondTournament.dayNumber ?? Number.NEGATIVE_INFINITY) -
          (firstTournament.seasonDayNumber ?? firstTournament.dayNumber ?? Number.NEGATIVE_INFINITY) ||
        (secondTournament.startDate ?? "").localeCompare(firstTournament.startDate ?? "")
      );
    })
    .slice(0, 3);

  const heroStats = [
    { label: "Teams Registered", value: formatHeroCount(activeStats.teamsRegistered) },
    { label: "Matches Hosted", value: formatHeroCount(activeStats.matchesHosted) },
    { label: "Tournaments Completed", value: formatHeroCount(activeStats.tournamentsCompleted) },
    { label: "Prize Pools Awarded", value: activeStats.prizePoolsAwarded },
    {
      label: "Community Members",
      value: activeStats.communityMembers > 0 ? `${activeStats.communityMembers.toLocaleString()}+` : "Not imported yet",
    },
    { label: "YouTube Views", value: activeStats.youtubeViews },
  ];

  return (
    <div className="page-shell pb-12 pt-6">
      <div className="page-stack">
        <div className="flex flex-col gap-6 xl:flex-row">
          <div className="hero-banner min-h-[420px] flex-1 overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_50%,_rgba(29,155,240,0.12),_transparent_45%)]" />
            <div className="absolute bottom-0 right-0 hidden h-full w-[42%] opacity-90 md:block">
              <Image src="/images/hero-character.svg" alt="" fill className="object-contain object-bottom" priority />
            </div>
            <div className="absolute inset-0 bg-gradient-to-r from-bg-primary via-bg-primary/95 to-transparent" />
            <div className="relative z-10 p-6 sm:p-8 lg:p-10">
              <span className="brand-badge">#1 PUBG PC Esports Organization in Nepal</span>
              <h1 className="hero-h1 mt-5">
                <span className="text-accent-blue">Bravo Gaming</span>
                <br />
                Esports Nepal
              </h1>
              <p className="mt-3 font-display text-sm font-semibold uppercase tracking-[0.12em] text-text-muted">
                PUBG PC Scrims | Tournaments | Live Streaming
              </p>
              <p className="tagline-italic mt-2">Where Champions Are Made</p>
              <p className="mt-4 max-w-lg text-sm leading-relaxed text-text-muted">
                Live coverage of BRAVO GAMING ESPORTS DAILY PUBG PC SCRIMS with verified standings, slot-based team
                tracking, esports broadcasts, and season history stored directly in Bravo&apos;s own platform.
              </p>
              <div className="mt-6 flex flex-wrap gap-2">
                <Link href="/live-stream" className="btn-watch-live">
                  Watch Live
                </Link>
                <Link href="/pubg-scrims" className="btn-primary">
                  Join Scrims
                </Link>
                <Link href="/leaderboard" className="btn-secondary">
                  View Leaderboard
                </Link>
                <a href="https://kamaucha.me/bravo" target="_blank" rel="noopener noreferrer" className="btn-discord">
                  Join Discord
                </a>
              </div>
            </div>
          </div>
          <LiveStatusSidebar />
        </div>

        <section className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
          {heroStats.map((stat, index) => {
            const compactValue = typeof stat.value === "string" && isPlaceholderValue(stat.value);

            return (
              <div
                key={stat.label}
                className="stat-pill count-up flex min-h-[88px] items-center gap-3"
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-accent-blue/20 bg-accent-blue/10 font-mono-stat text-sm font-bold text-accent-blue">
                  {statIcons[index]}
                </span>
                <div className="min-w-0">
                  <p
                    className={
                      compactValue
                        ? "text-xs font-semibold uppercase tracking-[0.1em] text-text-muted"
                        : "font-mono-stat text-stat text-white"
                    }
                  >
                    {stat.value}
                  </p>
                  <p className="mt-0.5 text-label font-semibold uppercase text-text-muted">{stat.label}</p>
                </div>
              </div>
            );
          })}
        </section>

        {activeOverview && (
          <section className="mt-8 grid gap-6 xl:grid-cols-[1.05fr,1.95fr]">
            <div className="esports-card p-6">
              <p className="section-title">Current Season</p>
              <h2 className="mt-2 text-3xl font-black text-white">{activeOverview.season.seriesTitle}</h2>
              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-card border border-white/[0.06] bg-bg-primary p-4">
                  <p className="text-label uppercase text-text-muted">Season Start</p>
                  <p className="mt-2 font-mono-stat text-white">{activeOverview.season.startDate}</p>
                </div>
                <div className="rounded-card border border-white/[0.06] bg-bg-primary p-4">
                  <p className="text-label uppercase text-text-muted">Current Day</p>
                  <p className="mt-2 text-2xl font-black text-accent-blue">Day {activeOverview.season.currentDay}</p>
                </div>
                <div className="rounded-card border border-white/[0.06] bg-bg-primary p-4">
                  <p className="text-label uppercase text-text-muted">Season Status</p>
                  <p className="mt-2 font-mono-stat text-white">{activeOverview.season.status}</p>
                </div>
                <div className="rounded-card border border-white/[0.06] bg-bg-primary p-4">
                  <p className="text-label uppercase text-text-muted">Season Length</p>
                  <p className="mt-2 text-2xl font-black text-accent-green">{activeOverview.season.configuredDays} Days</p>
                  <p className="mt-1 text-xs text-text-muted">Extendable when new days are created</p>
                </div>
              </div>
              <div className="mt-5 grid grid-cols-3 gap-3">
                <div className="rounded-card border border-white/[0.06] bg-bg-primary p-4">
                  <p className="text-label uppercase text-text-muted">Teams</p>
                  <p className="mt-2 text-2xl font-black text-white">{activeOverview.registeredTeams}</p>
                </div>
                <div className="rounded-card border border-white/[0.06] bg-bg-primary p-4">
                  <p className="text-label uppercase text-text-muted">Matches</p>
                  <p className="mt-2 text-2xl font-black text-white">{activeOverview.matchesPlayed}</p>
                </div>
                <div className="rounded-card border border-white/[0.06] bg-bg-primary p-4">
                  <p className="text-label uppercase text-text-muted">Results</p>
                  <p className="mt-2 text-2xl font-black text-white">{activeOverview.completedDays}</p>
                </div>
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                <Link href="/current-season" className="btn-primary">
                  Open Season Hub
                </Link>
                {activeOverview.currentTournament && (
                  <Link href={`/tournaments/${activeOverview.currentTournament.id}`} className="btn-secondary">
                    Open Day {activeOverview.currentTournament.seasonDayNumber ?? activeOverview.currentTournament.dayNumber}
                  </Link>
                )}
              </div>
              <p className="mt-4 text-sm text-text-muted">
                {activeOverview.currentTournament?.matchCount
                  ? "Current day match data is syncing into standings automatically."
                  : "Matches not imported yet for the active day."}
              </p>
            </div>

            <div className="esports-card overflow-hidden !p-0">
              <div className="border-b border-white/[0.08] px-5 py-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="section-heading !text-sm">Season Leaderboard</p>
                    <p className="mt-1 text-sm text-text-muted">
                      Stored and aggregated automatically from every imported Bravo match.
                    </p>
                  </div>
                  {activeOverview.currentTournament ? <StatusBadge status={activeOverview.currentTournament.status} /> : null}
                </div>
              </div>
              {activeOverview.leaderboard.length === 0 ? (
                <div className="p-6 text-center text-sm text-text-muted">Matches not imported yet for season standings.</div>
              ) : (
                <div className="table-scroll">
                  <table className="data-table min-w-full">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Slot</th>
                        <th>Team</th>
                        <th>M</th>
                        <th>Kill</th>
                        <th>Place</th>
                        <th>Pts</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeOverview.leaderboard.slice(0, 5).map((row) => (
                        <tr key={row.teamId} className={row.rank === 1 ? "bg-bg-hover" : ""}>
                          <td className={row.rank === 1 ? "rank-gold" : "font-mono-stat font-bold text-accent-blue"}>
                            #{row.rank}
                          </td>
                          <td className="text-text-muted">{row.slotNumber ? `#${row.slotNumber}` : "-"}</td>
                          <td>
                            <Link href={`/teams/${row.teamId}`} className="flex items-center gap-2 hover:text-accent-blue">
                              <TeamAvatar name={row.team} imageUrl={row.logoUrl} size="sm" />
                              <span className="font-semibold">{row.team}</span>
                            </Link>
                          </td>
                          <td className="text-text-muted">{row.matches}</td>
                          <td className="text-text-muted">{row.killPoints ?? row.kills}</td>
                          <td className="text-text-muted">{row.placement}</td>
                          <td className="points-cell">{row.points}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>
        )}

        <section className="mt-8 grid gap-6 lg:grid-cols-[1.05fr,1.35fr,0.9fr]">
          <div>
            <SectionHeader title="Featured Tournaments" linkLabel="View All" linkHref="/tournaments" />
            {featuredTournaments.length === 0 ? (
              <div className="esports-card flex min-h-[220px] items-center justify-center p-6 text-center text-sm text-text-muted">
                Create the next scrim day from admin to publish it here.
              </div>
            ) : (
              <div className="space-y-3">
                {featuredTournaments.map((tournament) => (
                  <Link key={tournament.id} href={`/tournaments/${tournament.id}`} className="tournament-card block p-4">
                    <div className="flex gap-3">
                      <TeamAvatar name={tournament.title} size="lg" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="truncate font-display text-[15px] font-semibold uppercase text-white">
                            {tournament.title}
                          </h3>
                          <StatusBadge status={tournament.status} />
                        </div>
                        <div className="mt-2 grid grid-cols-3 gap-1 text-center">
                          <div>
                            <p className="text-label uppercase text-text-muted">Day</p>
                            <p className="font-mono-stat text-xs font-bold text-white">
                              {tournament.seasonDayNumber ?? tournament.dayNumber ?? "-"}
                            </p>
                          </div>
                          <div>
                            <p className="text-label uppercase text-text-muted">Teams</p>
                            <p className="font-mono-stat text-xs font-bold text-white">
                              {tournament.teamCount}/{tournament.maxTeams}
                            </p>
                          </div>
                          <div>
                            <p className="text-label uppercase text-text-muted">Status</p>
                            <p className="font-mono-stat text-xs font-bold text-accent-blue">
                              {(tournament.matchCount ?? 0) > 0 ? countdown(tournament.startDate) : "Pending"}
                            </p>
                          </div>
                        </div>
                        {(tournament.matchCount ?? 0) === 0 && (
                          <p className="mt-2 text-xs uppercase tracking-[0.1em] text-text-muted">
                            Matches not imported yet
                          </p>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div>
            <SectionHeader title="Live Leaderboard" linkLabel="View Full Leaderboard" linkHref="/leaderboard" />
            <div className="esports-card overflow-hidden !p-0">
              {activeLeaderboard.length === 0 ? (
                <div className="flex min-h-[220px] items-center justify-center p-6 text-center text-sm text-text-muted">
                  Matches not imported yet. The leaderboard will populate automatically after imports.
                </div>
              ) : (
                <div className="table-scroll">
                  <table className="data-table min-w-full">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Slot</th>
                        <th>Team</th>
                        <th>M</th>
                        <th>K</th>
                        <th>Place</th>
                        <th>Pts</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeLeaderboard.slice(0, 5).map((row) => (
                        <tr key={row.teamId} className={row.rank === 1 ? "bg-bg-hover" : ""}>
                          <td className={row.rank === 1 ? "rank-gold" : "font-mono-stat font-bold text-accent-blue"}>
                            #{row.rank}
                          </td>
                          <td className="text-text-muted">{row.slotNumber ? `#${row.slotNumber}` : "-"}</td>
                          <td>
                            <Link href={`/teams/${row.teamId}`} className="flex items-center gap-2 hover:text-accent-blue">
                              <TeamAvatar name={row.team} imageUrl={row.logoUrl} size="sm" />
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
                </div>
              )}
            </div>
          </div>

          <div>
            <SectionHeader title="MVP of the Week" />
            {activeMvp ? (
              <div className="mvp-card relative p-5">
                <span className="absolute right-3 top-3 rounded border border-accent-yellow/40 bg-accent-yellow/10 px-2 py-0.5 font-display text-label font-bold text-accent-yellow">
                  MVP
                </span>
                <div className="relative mx-auto flex h-24 w-24 items-center justify-center rounded-full border-2 border-accent-blue/40 bg-gradient-to-br from-accent-blue/30 to-bg-primary shadow-glow">
                  <span className="font-display text-3xl font-black text-white">{activeMvp.name.slice(0, 2).toUpperCase()}</span>
                </div>
                <div className="mt-4 text-center">
                  <h3 className="font-display text-xl font-bold text-white">{activeMvp.name}</h3>
                  <p className="text-label uppercase text-text-muted">{activeMvp.teamName}</p>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  {[
                    { label: "Kills", value: activeMvp.kills },
                    { label: "Damage", value: activeMvp.damage.toLocaleString() },
                    { label: "Chicken Dinners", value: activeMvp.chickenDinners },
                    { label: "MVP Awards", value: activeMvp.mvpCount },
                  ].map((stat) => (
                    <div key={stat.label} className="rounded-card border border-white/[0.05] bg-bg-primary p-2.5">
                      <p className="text-label uppercase text-text-muted">{stat.label}</p>
                      <p className="font-mono-stat font-bold text-white">{stat.value}</p>
                    </div>
                  ))}
                </div>
                <Link href={`/players/${activeMvp.id}`} className="btn-outline-blue mt-4 w-full justify-center">
                  View Profile
                </Link>
              </div>
            ) : (
              <div className="esports-card flex min-h-[220px] items-center justify-center p-6 text-center text-sm text-text-muted">
                Matches not imported yet for MVP rankings.
              </div>
            )}
          </div>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-3">
          <div>
            <SectionHeader title="Latest Videos" linkLabel="View All" linkHref="/videos" />
            {activeVideos.length === 0 ? (
              <div className="esports-card p-6 text-center text-sm text-text-muted">
                Video content is stored in Firestore and will appear here after publishing.
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {activeVideos.slice(0, 4).map((video) => (
                  <div key={video.id} className="video-card">
                    <div className="relative aspect-video bg-gradient-to-br from-slate-800 to-bg-primary">
                      <span className="absolute bottom-1.5 right-1.5 rounded bg-black/80 px-1.5 py-0.5 font-mono-stat text-[10px] text-white">
                        {video.duration}
                      </span>
                    </div>
                    <div className="p-3">
                      <p className="text-[10px] font-bold uppercase text-accent-blue">{video.category}</p>
                      <p className="mt-1 line-clamp-2 text-xs font-semibold text-white">{video.title}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <SectionHeader title="Latest News" linkLabel="View All" linkHref="/news" />
            {activeAnnouncements.length === 0 ? (
              <div className="esports-card p-6 text-center text-sm text-text-muted">
                News and announcements will appear here after publishing from admin.
              </div>
            ) : (
              <div className="space-y-3">
                {activeAnnouncements.slice(0, 3).map((announcement) => (
                  <article key={announcement.id} className="news-card flex gap-3 p-3">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-card bg-bg-primary text-xs font-bold uppercase tracking-[0.16em] text-accent-blue">
                      News
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="line-clamp-1 text-sm font-semibold text-white">{announcement.title}</h3>
                        <span className="shrink-0 text-[10px] uppercase text-text-muted">{announcement.date}</span>
                      </div>
                      <p className="mt-1 line-clamp-2 text-xs text-text-muted">{announcement.detail}</p>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>

          <div>
            <SectionHeader title="Upcoming Streams" linkLabel="View Schedule" linkHref="/stream-schedule" />
            {activeStreams.length === 0 ? (
              <div className="esports-card p-6 text-center text-sm text-text-muted">
                Stream schedule data is published from Firestore and will appear here automatically.
              </div>
            ) : (
              <div className="space-y-3">
                {activeStreams.map((stream) => (
                  <div key={stream.id} className="stream-card p-4">
                    <p className="text-label font-bold uppercase text-accent-blue">{stream.time}</p>
                    <p className="mt-1 font-semibold text-white">{stream.title}</p>
                    <Link
                      href="/live-stream"
                      className="mt-2 inline-flex items-center gap-1 font-display text-label font-bold uppercase text-accent-red"
                    >
                      <span className="live-dot h-1.5 w-1.5" /> YouTube Live
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        <SponsorStrip initialSponsors={initialSponsors} />
      </div>
    </div>
  );
}
