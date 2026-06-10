import Link from "next/link";
import StatusBadge from "@/components/ui/StatusBadge";
import TeamAvatar from "@/components/ui/TeamAvatar";
import { getCurrentSeasonOverview, getScrimDayResults } from "@/lib/data";

export default async function ResultsPage() {
  const [overview, dayResults] = await Promise.all([getCurrentSeasonOverview(), getScrimDayResults()]);
  const tournamentsByDayNumber = new Map(
    (overview?.tournaments ?? [])
      .filter((tournament) => typeof (tournament.seasonDayNumber ?? tournament.dayNumber) === "number")
      .map((tournament) => [tournament.seasonDayNumber ?? tournament.dayNumber ?? 0, tournament])
  );

  return (
    <main className="page-shell">
      <div className="page-inner space-y-8">
        <section className="page-hero p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="section-title">Results</p>
              <h1 className="hero-h1 mt-2 !text-4xl">Verified Daily Results</h1>
              <p className="mt-4 max-w-3xl text-sm text-text-muted sm:text-base">
                Historical Bravo Day 1 to Day 3 records are stored from the reference site, and newer days continue
                from direct PUBG PC imports only.
              </p>
            </div>
            <Link href="/leaderboard" className="btn-primary shrink-0">
              Open Leaderboard
            </Link>
          </div>
        </section>

        {dayResults.length === 0 ? (
          <section className="esports-card p-10 text-center">
            <p className="font-display text-lg font-bold uppercase text-white">No imported results yet</p>
            <p className="mt-2 text-sm text-text-muted">
              Use the admin match importer to bring in Bravo PUBG PC match data and populate this page.
            </p>
          </section>
        ) : (
          <section className="grid gap-4 xl:grid-cols-2">
            {dayResults.map((day) => {
              const tournament = tournamentsByDayNumber.get(day.dayNumber);
              const topTeams = day.leaderboard.slice(0, 3);

              return (
                <article key={day.id} className="tournament-card p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-label uppercase text-accent-blue">{day.label}</p>
                      <h2 className="mt-2 font-display text-xl font-black uppercase text-white">{day.displayDate}</h2>
                    </div>
                    <StatusBadge
                      status={
                        day.status === "completed"
                          ? "COMPLETED"
                          : day.status === "live"
                            ? "LIVE"
                            : day.pendingMatches > 0
                              ? "UPCOMING"
                              : "OPEN"
                      }
                    />
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-3">
                    <div className="rounded-card border border-white/10 bg-bg-primary p-3">
                      <p className="text-label uppercase text-text-muted">Matches</p>
                      <p className="mt-2 font-mono-stat text-xl font-bold text-white">{day.completedMatches}</p>
                    </div>
                    <div className="rounded-card border border-white/10 bg-bg-primary p-3">
                      <p className="text-label uppercase text-text-muted">Teams</p>
                      <p className="mt-2 font-mono-stat text-xl font-bold text-white">{day.leaderboard.length}</p>
                    </div>
                    <div className="rounded-card border border-white/10 bg-bg-primary p-3">
                      <p className="text-label uppercase text-text-muted">Pending</p>
                      <p className="mt-2 font-mono-stat text-xl font-bold text-white">{day.pendingMatches}</p>
                    </div>
                  </div>

                  {topTeams.length === 0 ? (
                    <div className="mt-4 rounded-card border border-dashed border-white/10 p-4 text-sm text-text-muted">
                      Results have not been imported yet for this day.
                    </div>
                  ) : (
                    <div className="mt-4 space-y-3">
                      {topTeams.map((team) => (
                        <div
                          key={`${day.id}-${team.teamId ?? team.teamName}`}
                          className="flex items-center justify-between rounded-card border border-white/10 bg-bg-primary p-3"
                        >
                          <div className="flex items-center gap-3">
                            <TeamAvatar name={team.teamName} size="sm" />
                            <div>
                              <p className="font-semibold text-white">{team.teamName}</p>
                              <p className="text-xs uppercase text-text-muted">
                                {team.slotNumber ? `Slot ${team.slotNumber}` : "Imported result"}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="points-cell">{team.totalPoints}</p>
                            <p className="text-xs uppercase text-text-muted">Pts</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="mt-5 flex flex-wrap gap-2">
                    {tournament && (
                      <Link href={`/tournaments/${tournament.id}`} className="btn-outline-blue">
                        View Day Details
                      </Link>
                    )}
                    <Link href="/pubg-scrims" className="btn-secondary">
                      Open Daily Scrims
                    </Link>
                  </div>
                </article>
              );
            })}
          </section>
        )}
      </div>
    </main>
  );
}
