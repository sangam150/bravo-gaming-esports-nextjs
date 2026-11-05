"use client";
import { useEffect, useState } from "react";
import { parseEventSchedule, type EventSchedule } from "@/lib/event-schedule";
import { formatEventDateTimeInput, eventDateTimeLocalToUtcIso } from "@/lib/event-datetime";
import { parseEventProduction, type EventProduction } from "@/lib/event-production";
import { adminFetch } from "@/lib/admin-api";
import type { Team, Tournament, TournamentMatch } from "@/lib/types";

export default function CompetitionScheduleEditor({
  tournament,
  onSaved,
  teams = [],
  matches = [],
}: {
  tournament: Tournament;
  onSaved: () => void | Promise<void>;
  teams?: Team[];
  matches?: TournamentMatch[];
}) {
  const [schedule, setSchedule] = useState<EventSchedule>(
    () => parseEventSchedule(tournament.schedule) ?? { version: 1, stage: "", timeZone: "Asia/Kathmandu", matches: [] },
  );
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [production, setProduction] = useState<EventProduction | null>(null);
  useEffect(() => { let active = true; adminFetch(`/api/tournaments/${encodeURIComponent(tournament.id)}?production=true`).then(response => { if (active) setProduction(parseEventProduction(response.data.draft)); }).catch(() => { if (active) setError("Hierarchy unavailable. Reload before assigning stages, groups or days."); }); return () => { active = false; }; }, [tournament.id]);
  function patch(index: number, value: Partial<EventSchedule["matches"][number]>) { setSchedule({ ...schedule, matches: schedule.matches.map((row, i) => i === index ? { ...row, ...value } : row) }); }
  async function save() {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const value = JSON.stringify(schedule);
      parseEventSchedule(value);
      await adminFetch(`/api/tournaments/${encodeURIComponent(tournament.id)}`, {
        method: "PUT",
        body: JSON.stringify({ schedule: value }),
      });
      await onSaved();
      setMessage("Schedule saved. Published competition graphics will update automatically.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Schedule save failed.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="esports-card space-y-4 p-5" aria-label="Competition schedule editor">
      <h2 className="text-lg font-bold text-white">Match schedule</h2>
      <p className="text-sm text-text-muted">
        Enter start times in the event timezone below. Saving replaces the competition’s existing
        schedule text.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <label>
          Stage
          <input
            className="input-esports"
            maxLength={100}
            value={schedule.stage}
            onChange={(e) => setSchedule({ ...schedule, stage: e.target.value })}
          />
        </label>
        <label>
          Event timezone
          <input
            className="input-esports"
            value={schedule.timeZone}
            onChange={(e) => setSchedule({ ...schedule, timeZone: e.target.value })}
          />
        </label>
      </div>
      {schedule.matches.map((match, index) => (
        <fieldset key={index} className="grid gap-3 rounded border border-white/10 p-3 sm:grid-cols-4">
          <legend>Match {match.matchNumber}</legend>
          <label>Match number<input className="input-esports" type="number" min={1} value={match.matchNumber} onChange={event => patch(index, { matchNumber: Number(event.target.value) })} /></label>
          <label>
            Map
            <input
              className="input-esports"
              value={match.map}
              onChange={(e) =>
                setSchedule({
                  ...schedule,
                  matches: schedule.matches.map((row, i) => (i === index ? { ...row, map: e.target.value } : row)),
                })
              }
            />
          </label>
          <label>
            Start time ({schedule.timeZone})
            <input
              type="datetime-local"
              className="input-esports"
              value={formatEventDateTimeInput(match.scheduledAt, schedule.timeZone)}
              onChange={(e) =>
                setSchedule({
                  ...schedule,
                  matches: schedule.matches.map((row, i) =>
                    i === index ? { ...row, scheduledAt: eventDateTimeLocalToUtcIso(e.target.value, schedule.timeZone) ?? "" } : row,
                  ),
                })
              }
            />
          </label>
          <label>
            Status
            <select
              className="input-esports"
              value={match.status}
              onChange={(e) =>
                setSchedule({
                  ...schedule,
                  matches: schedule.matches.map((row, i) => (i === index ? { ...row, status: e.target.value as typeof row.status } : row)),
                })
              }
            >
              {["upcoming", "scheduled", "lobby-open", "in-progress", "awaiting-results", "under-review", "completed", "postponed", "cancelled"].map((status) => (
                <option key={status}>{status}</option>
              ))}
            </select>
          </label>
          {production && (["stageId", "groupId", "dayId"] as const).map(key => <label key={key}>{key === "stageId" ? "Stage" : key === "groupId" ? "Group" : "Match day"}<select className="input-esports" value={match[key] ?? ""} onChange={event => patch(index, { [key]: event.target.value, ...(key === "stageId" ? { groupId: "", dayId: "" } : {}) })}><option value="">Unassigned</option>{(key === "stageId" ? production.stages : key === "groupId" ? production.groups.filter(row => row.stageId === match.stageId) : production.days.filter(row => row.stageId === match.stageId)).filter(row => !row.archived || row.id === match[key]).sort((a, b) => a.order - b.order).map(row => <option key={row.id} value={row.id}>{row.name}{row.archived ? " (archived)" : ""}</option>)}</select></label>)}
          <label>Official match title<input className="input-esports" maxLength={160} value={match.title ?? ""} onChange={event => patch(index, { title: event.target.value })} /></label>
          <label>Broadcast display label<input className="input-esports" maxLength={160} value={match.displayTitle ?? ""} onChange={event => patch(index, { displayTitle: event.target.value })} /></label>
          <label>Result record<select className="input-esports" value={match.matchId ?? ""} onChange={event => patch(index, { matchId: event.target.value })}><option value="">Match by number</option>{matches.filter(row => row.tournamentId === tournament.id).map(row => <option key={row.id} value={row.id}>Match {row.matchNumber ?? row.sequenceNumber} · {row.map} · {row.status}</option>)}</select></label>
          {(["actualStartAt", "actualEndAt"] as const).map(key => <label key={key}>{key === "actualStartAt" ? "Actual start" : "Actual end"} ({schedule.timeZone})<input className="input-esports" type="datetime-local" value={formatEventDateTimeInput(match[key], schedule.timeZone)} onChange={event => patch(index, { [key]: eventDateTimeLocalToUtcIso(event.target.value, schedule.timeZone) ?? "" })} /></label>)}
          <details className="sm:col-span-4"><summary>Participating teams</summary><div className="mt-2 flex flex-wrap gap-3">{teams.filter(team => tournament.registeredTeamIds?.includes(team.id)).map(team => <label key={team.id} className="flex gap-2"><input type="checkbox" checked={match.teamIds?.includes(team.id) ?? false} onChange={event => patch(index, { teamIds: event.target.checked ? [...match.teamIds ?? [], team.id] : match.teamIds?.filter(teamId => teamId !== team.id) })} />{team.name}</label>)}</div></details>
          <label>Private observer notes<textarea className="input-esports" maxLength={1000} value={match.observerNotes ?? ""} onChange={event => patch(index, { observerNotes: event.target.value })} /></label>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => setSchedule({ ...schedule, matches: schedule.matches.filter((_, i) => i !== index) })}
          >
            Remove match {match.matchNumber}
          </button>
        </fieldset>
      ))}
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          className="btn-secondary"
          disabled={busy || schedule.matches.length >= 100}
          onClick={() =>
            setSchedule({
              ...schedule,
              matches: [
                ...schedule.matches,
                {
                  matchNumber: Math.max(0, ...schedule.matches.map((row) => row.matchNumber)) + 1,
                  map: "Erangel",
                  scheduledAt: "",
                  status: "upcoming",
                },
              ],
            })
          }
        >
          Add scheduled match
        </button>
        <button type="button" className="btn-primary" disabled={busy} onClick={() => void save()}>
          {busy ? "Saving…" : "Save schedule"}
        </button>
      </div>
      {error ? <p role="alert">{error}</p> : null}
      {message ? <p role="status">{message}</p> : null}
    </section>
  );
}
