import Link from "next/link";
import StatusBadge from "@/components/ui/StatusBadge";
import TeamAvatar from "@/components/ui/TeamAvatar";
import { getCurrentSeasonOverview } from "@/lib/data";

function formatDate(value: string) {
  const date = new Date(`${value}T12:00:00+05:45`);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "Asia/Kathmandu",
  }).format(date);
}

function formatSeasonStatus(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export default async function CurrentSeasonPage() {
  const overview = await getCurrentSeasonOverview();

  if (!overview) {
    return (
      <main className="page-shell">
        <div className="page-inner">
        <section className="page-hero p-8 text-center">
          <p className="section-title">Current Season</p>
          <h1 className="hero-h1 mt-2 !text-4xl">Data not imported yet</h1>
          <p className="mt-4 text-text-muted">
            Import Bravo daily scrim data from admin to initialize the current season.
          </p>
        </section>
        </div>
      </main>
    );
  }

  const { season, tournaments, leaderboard, currentTournament, registeredTeams, matchesPlayed, recentResults } =
    overview;

  return (
    <main className="page-shell">
      <div className="page-inner">
      <section className="page-hero overflow-hidden p-6 sm:p-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_10%,rgba(0,217,126,0.12),transparent_35%),radial-gradient(circle_at_10%_25%,rgba(29,155,240,0.16),transparent_30%)]" />
        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <p className="section-title">Current Season</p>
            <h1 className="hero-h1 mt-2 !text-4xl sm:!text-5xl">{season.seriesTitle}</h1>
            <p className="mt-4 max-w-3xl text-sm leading-relaxed text-text-muted sm:text-base">
              Bravo Gaming Esports now stores the full daily PUBG PC scrim season inside Firestore so historical day
              data, standings, teams, and leaderboards remain available even if the original source disappears.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {currentTournament ? (
                <StatusBadge status={currentTournament.status} />
              ) : (
                <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-text-muted">
                  Data not imported yet
                </span>
              )}
              <span className="rounded-full border border-accent-blue/20 bg-accent-blue/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-accent-blue">
                Season {season.seasonNumber}
              </span>
            </div>
          </div>
          <Link href="/leaderboard" className="btn-primary shrink-0">
            View Season Leaderboard
          </Link>
        </div>

        <div className="relative z-10 mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
          {[ 
            { label: "Season Start", value: formatDate(season.startDate) },
            { label: "Current Day", value: `Day ${season.currentDay}` },
            { label: "Season Status", value: formatSeasonStatus(season.status) },
            { label: "Season Length", value: `${season.configuredDays} Days` },
            { label: "Registered Teams", value: `${registeredTeams}` },
            { label: "Matches Stored", value: `${matchesPlayed}` },
          ].map((stat) => (
            <div key={stat.label} className="stat-pill p-4">
              <p className="text-label uppercase text-text-muted">{stat.label}</p>
              <p className="mt-2 text-lg font-black text-white sm:text-2xl">{stat.value}</p>
            </div>
          ))}
        </div>
        <p className="relative z-10 mt-4 text-sm text-text-muted">
          The first Bravo season runs for 15 days starting on June 5, 2026, and can be extended to 30 days if needed.
        </p>
      </section>

      <section className="mt-8 grid gap-6 xl:grid-cols-[1.15fr,1.85fr]">
        <div className="space-y-6">
          <div className="esports-card p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="section-heading !text-sm">Current Day</p>
                <h2 className="mt-2 text-2xl font-black text-white">{currentTournament?.title ?? "Day pending"}</h2>
              </div>
              {currentTournament && <StatusBadge status={currentTournament.status} />}
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-card border border-white/10 bg-bg-primary p-4">
                <p className="text-label uppercase text-text-muted">Teams Joined</p>
                <p className="mt-2 text-2xl font-black text-white">
                  {currentTournament?.teamCount ?? 0}/{currentTournament?.maxTeams ?? 32}
                </p>
              </div>
              <div className="rounded-card border border-white/10 bg-bg-primary p-4">
                <p className="text-label uppercase text-text-muted">Results Stored</p>
                <p className="mt-2 text-2xl font-black text-white">{currentTournament?.matchCount ?? 0}</p>
              </div>
            </div>
            <p className="mt-4 text-sm text-text-muted">
              {currentTournament?.matchCount
                ? "Daily results are available in our database and feed into the season leaderboard automatically."
                : "This day record is stored in Firestore, but official results are still pending import."}
            </p>
            {currentTournament && (
              <Link href={`/tournaments/${currentTournament.id}`} className="btn-outline-blue mt-5 w-full justify-center">
                View Day Details
              </Link>
            )}
          </div>

          <div className="esports-card p-6">
            <p className="section-heading !text-sm">Recent Results</p>
            <div className="mt-4 space-y-3">
              {recentResults.length === 0 ? (
                <p className="text-sm text-text-muted">Data not imported yet for completed day results.</p>
              ) : (
                recentResults.map((tournament) => (
                  <Link
                    key={tournament.id}
                    href={`/tournaments/${tournament.id}`}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-white/10 bg-bg-primary p-4 transition hover:border-accent-blue/30"
                  >
                    <div>
                      <p className="font-semibold text-white">{tournament.title}</p>
                      <p className="mt-1 text-xs uppercase tracking-[0.16em] text-text-muted">
                        Day {tournament.seasonDayNumber ?? tournament.dayNumber ?? "-"} | {tournament.matchCount ?? 0} matches
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-mono-stat text-lg font-bold text-accent-blue">{tournament.teamCount}</p>
                      <p className="text-label uppercase text-text-muted">Teams</p>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="esports-card overflow-hidden !p-0">
          <div className="border-b border-white/10 px-5 py-4">
            <p className="section-heading !text-sm">Overall Season Leaderboard</p>
            <p className="mt-1 text-sm text-text-muted">
              Aggregated from every stored Bravo daily scrim day in the active season.
            </p>
          </div>
          {leaderboard.length === 0 ? (
            <div className="p-8 text-center text-sm text-text-muted">Data not imported yet for season standings.</div>
          ) : (
            <div className="table-scroll">
              <table className="data-table min-w-full">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Slot</th>
                    <th>Team</th>
                    <th>M</th>
                    <th>Kill Pts</th>
                    <th>Place Pts</th>
                    <th>Total</th>
                    <th>Avg Place</th>
                    <th>WWCD</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.map((row) => (
                    <tr key={row.teamId}>
                      <td className={row.rank === 1 ? "rank-gold" : "font-mono-stat font-bold text-accent-blue"}>
                        #{row.rank}
                      </td>
                      <td>{row.slotNumber ? `#${row.slotNumber}` : "-"}</td>
                      <td>
                        <Link href={`/teams/${row.teamId}`} className="flex items-center gap-3 hover:text-accent-blue">
                          <TeamAvatar name={row.team} imageUrl={row.logoUrl} size="sm" />
                          <span className="font-semibold uppercase">{row.team}</span>
                        </Link>
                      </td>
                      <td>{row.matches}</td>
                      <td>{row.killPoints ?? row.kills}</td>
                      <td>{row.placement}</td>
                      <td className={row.rank <= 5 ? "points-cell" : "font-mono-stat font-bold text-white"}>
                        {row.points}
                      </td>
                      <td>{row.averagePlacement ?? "-"}</td>
                      <td>{row.chickenDinners ?? 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      <section className="mt-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="section-title">Season Schedule</p>
            <h2 className="mt-2 text-3xl font-black text-white">Stored Daily Records</h2>
          </div>
          <Link href="/tournaments" className="btn-secondary">
            View All Tournaments
          </Link>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {tournaments.map((tournament) => (
            <Link key={tournament.id} href={`/tournaments/${tournament.id}`} className="tournament-card p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-label uppercase text-accent-blue">
                    Day {tournament.seasonDayNumber ?? tournament.dayNumber ?? "-"}
                  </p>
                  <h3 className="mt-2 line-clamp-2 font-display text-base font-bold uppercase text-white">
                    {tournament.title}
                  </h3>
                </div>
                <StatusBadge status={tournament.status} />
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-label uppercase text-text-muted">Tier</p>
                  <p className="font-mono-stat text-white">{tournament.tier}</p>
                </div>
                <div>
                  <p className="text-label uppercase text-text-muted">Prize Pool</p>
                  <p className="font-mono-stat text-white">{tournament.prizePool}</p>
                </div>
                <div>
                  <p className="text-label uppercase text-text-muted">Mode</p>
                  <p className="font-mono-stat text-white">{tournament.format}</p>
                </div>
                <div>
                  <p className="text-label uppercase text-text-muted">Perspective</p>
                  <p className="font-mono-stat text-white">{tournament.perspective ?? "TPP"}</p>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between text-xs uppercase tracking-[0.16em] text-text-muted">
                <span>{tournament.server}</span>
                <span>{tournament.teamCount}/{tournament.maxTeams} teams</span>
              </div>
            </Link>
          ))}
        </div>
      </section>
      </div>
    </main>
  );
}
