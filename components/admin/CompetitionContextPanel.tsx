"use client";
import { competitionMatches, competitionStandings } from "@/lib/admin-competition-view";
import type { Tournament, TournamentMatch } from "@/lib/types";
import { formatEventSchedule } from "@/lib/event-schedule";

export default function CompetitionContextPanel({
  tournament,
  matches,
  mode,
  onEdit,
  onResults,
}: {
  tournament?: Tournament;
  matches: TournamentMatch[];
  mode: "schedule" | "matches" | "standings";
  onEdit: () => void;
  onResults: () => void;
}) {
  if (!tournament) return <p className="text-sm text-text-muted">Select a competition above to view its {mode}.</p>;
  const scoped = competitionMatches(matches, tournament.id);
  const standings = competitionStandings(scoped);
  return (
    <section className="esports-card space-y-4 p-5" aria-label={`${tournament.title} ${mode}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-white">{tournament.title}</h2>
        <button type="button" onClick={mode === "schedule" ? onEdit : onResults} className="btn-secondary">
          {mode === "schedule" ? "Edit competition schedule" : "Open Match Results"}
        </button>
      </div>
      {mode === "schedule" ? (
        <div className="space-y-2 text-sm text-text-muted">
          <p>
            {tournament.startDate}
            {tournament.endDate ? ` – ${tournament.endDate}` : ""}
          </p>
          <p className="whitespace-pre-wrap">{formatEventSchedule(tournament.schedule) || "No schedule entered yet."}</p>
          <p>Map rotation: {tournament.mapRotation?.join(" → ") || "Not set"}</p>
        </div>
      ) : null}
      {mode === "standings" ? (
        <>
          <p className="text-sm text-text-muted">Published results only. Points retain each match’s saved scoring version.</p>
          {!standings.length ? (
            <p className="text-sm text-text-muted">No published results for this competition.</p>
          ) : (
            <div className="table-scroll" tabIndex={0}>
              <table className="data-table min-w-full">
                <caption className="sr-only">{tournament.title} published standings</caption>
                <thead>
                  <tr>
                    {["Rank", "Team", "Matches", "Wins", "Kills", "Placement points", "Kill points", "Total"].map((label) => (
                      <th key={label} scope="col">
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {standings.map((row, index) => (
                    <tr key={row.id}>
                      <td>{index + 1}</td>
                      <td>{row.name}</td>
                      <td>{row.matches}</td>
                      <td>{row.wins}</td>
                      <td>{row.kills}</td>
                      <td>{row.placementPoints}</td>
                      <td>{row.killPoints}</td>
                      <td>{row.totalPoints}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      ) : (
        <div className="table-scroll" tabIndex={0}>
          <table className="data-table min-w-full">
            <caption className="sr-only">{tournament.title} matches</caption>
            <thead>
              <tr>
                {["Match", "Map", "Played at", "Status", "Winner"].map((label) => (
                  <th key={label} scope="col">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {scoped.map((match) => (
                <tr key={match.id}>
                  <td>{match.matchNumber ?? match.sequenceNumber ?? "—"}</td>
                  <td>{match.map}</td>
                  <td>{match.playedAt || "Not scheduled"}</td>
                  <td>{match.status || "draft"}</td>
                  <td>{match.status === "published" ? match.winner : "Pending publication"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!scoped.length ? <p className="p-4 text-sm text-text-muted">No matches added yet.</p> : null}
        </div>
      )}
    </section>
  );
}
