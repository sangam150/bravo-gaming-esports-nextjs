"use client";
import type { Tournament, TournamentMatch, TeamRegistration } from "@/lib/types";
import type { AdminSection } from "@/lib/admin-navigation";
import { parseEventSchedule } from "@/lib/event-schedule";
import { formatDisplayDateTime } from "@/lib/display-format";

export default function AdminOverview({
  tournaments,
  matches,
  registrations,
  teamCount,
  playerCount,
  activity,
  onNavigate,
}: {
  tournaments: Tournament[];
  matches: TournamentMatch[];
  registrations: TeamRegistration[];
  teamCount: number;
  playerCount: number;
  activity: { id: string; action: string; createdAt?: string }[];
  onNavigate: (section: AdminSection) => void;
}) {
  const active =
    tournaments.find((event) => event.status === "LIVE") ??
    tournaments.find((event) => ["OPEN", "REGISTERING", "UPCOMING"].includes(event.status));
  const upcoming = tournaments
    .flatMap((event) => {
      try {
        return (parseEventSchedule(event.schedule)?.matches ?? [])
          .filter((match) => match.status === "upcoming")
          .map((match) => ({ ...match, event: event.title, eventId: event.id }));
      } catch {
        return [];
      }
    })
    .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt))
    .slice(0, 5);
  const published = matches.filter((match) => match.status === "published" && !match.deletedAt).slice(0, 5);
  return (
    <div className="space-y-6">
      <nav aria-label="Quick actions" className="flex flex-wrap gap-2">
        {(
          [
            ["Create competition", "tournaments"],
            ["Create scrim", "scrims"],
            ["Add match result", "matchManager"],
            ["Manage registrations", "registrations"],
            ["Open broadcast studio", "broadcast"],
          ] as const
        ).map(([label, target]) => (
          <button type="button" key={target} className="btn-secondary" onClick={() => onNavigate(target)}>
            {label}
          </button>
        ))}
      </nav>
      <section className="esports-card p-5">
        <p className="text-xs uppercase text-text-muted">Active competition</p>
        <h2 className="mt-2 text-xl font-bold text-white">{active?.title || "No active competition"}</h2>
        <p className="mt-2 text-sm text-text-muted">
          {active ? `${active.status} · ${active.startDate}` : "Create a competition to start registration and scheduling."}
        </p>
      </section>
      <dl className="grid gap-3 sm:grid-cols-3">
        {[
          ["Registered teams", teamCount],
          ["Total players", playerCount],
          ["Pending registrations", registrations.filter((row) => row.status === "pending").length],
        ].map(([label, value]) => (
          <div key={label} className="rounded-card border border-white/10 p-4">
            <dt className="text-sm text-text-muted">{label}</dt>
            <dd className="mt-1 text-2xl font-bold text-white">{value}</dd>
          </div>
        ))}
      </dl>
      <div className="grid gap-5 lg:grid-cols-2">
        <section className="esports-card p-5">
          <h2 className="font-bold text-white">Upcoming matches</h2>
          <ul className="mt-3 divide-y divide-white/10">
            {upcoming.map((row) => (
              <li key={`${row.eventId}-${row.matchNumber}`} className="py-3 text-sm text-text-muted">
                <span className="block text-white">
                  {row.event} · Match {row.matchNumber} · {row.map}
                </span>
                {formatDisplayDateTime(row.scheduledAt)}
              </li>
            ))}
          </ul>
          {!upcoming.length ? <p className="mt-3 text-sm text-text-muted">No upcoming matches scheduled.</p> : null}
        </section>
        <section className="esports-card p-5">
          <h2 className="font-bold text-white">Recent match results</h2>
          <ul className="mt-3 divide-y divide-white/10">
            {published.map((match) => (
              <li key={match.id} className="py-3 text-sm text-text-muted">
                <span className="block text-white">
                  {match.eventName} · Match {match.matchNumber ?? "—"} · {match.map}
                </span>
                {match.winner} · {match.points} points
              </li>
            ))}
          </ul>
          {!published.length ? <p className="mt-3 text-sm text-text-muted">No published match results.</p> : null}
        </section>
      </div>
      <section className="esports-card p-5">
        <h2 className="font-bold text-white">Latest activity</h2>
        <ul className="mt-3 divide-y divide-white/10">
          {activity.slice(0, 5).map((row) => (
            <li key={row.id} className="flex justify-between gap-3 py-3 text-sm text-text-muted">
              <span>{row.action}</span>
              <span>{row.createdAt ? formatDisplayDateTime(row.createdAt) : ""}</span>
            </li>
          ))}
        </ul>
        {!activity.length ? <p className="mt-3 text-sm text-text-muted">No recent activity.</p> : null}
      </section>
    </div>
  );
}
