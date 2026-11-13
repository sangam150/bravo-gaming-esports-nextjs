"use client";

import { useState } from "react";
import { autoAssignScrimSlots, buildScrimSlotNotice } from "@/lib/scrim-slots";
import type { Scrim, Team } from "@/lib/types";

export default function ScrimSlotEditor({ value, saved, teams, onChange }: {
  value: Partial<Scrim>;
  saved?: Scrim;
  teams: Team[];
  onChange: (value: Partial<Scrim>) => void;
}) {
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const teamIds = value.teamIds ?? [];
  const capacity = value.teamCapacity ?? Math.max(16, teamIds.length);
  const assignments = value.slotAssignments ?? [];
  const locked = value.slotsLocked === true;
  function assign(teamId: string, slotNumber: number) {
    onChange({ ...value, teamCapacity: capacity, slotAssignments: [...assignments.filter(row => row.teamId !== teamId), ...(slotNumber ? [{ teamId, slotNumber }] : [])] });
  }
  async function copy() {
    setMessage(""); setError("");
    try {
      if (!saved) throw new Error("Save this scrim before copying confirmed slots.");
      await navigator.clipboard.writeText(buildScrimSlotNotice(saved, teams));
      setMessage("Saved slot assignments copied. Unsaved form edits are excluded.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not copy slots. Check clipboard permission."); }
  }
  return <fieldset className="space-y-4 rounded border border-white/10 p-4 sm:col-span-2">
    <legend className="font-bold text-white">Confirmed team slots</legend>
    <p className="text-sm text-text-muted">Select confirmed teams above, assign unique lobby slots, then save the scrim. Missing logos do not prevent confirmation.</p>
    <div className="flex flex-wrap items-end gap-4">
      <label>Team capacity<input className="input-esports" aria-label="Scrim team capacity" type="number" min={1} max={100} required disabled={locked} value={capacity} onChange={event => onChange({ ...value, teamCapacity: Number(event.target.value) })} /></label>
      <label className="flex gap-2"><input type="checkbox" checked={locked} onChange={event => onChange({ ...value, teamCapacity: capacity, slotsLocked: event.target.checked })} />Lock confirmed slots</label>
      <span className="text-sm text-text-muted">{teamIds.length} / {capacity} teams · {assignments.length} assigned</span>
    </div>
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {teamIds.map(teamId => {
        const team = teams.find(row => row.id === teamId);
        return <label key={teamId} className="rounded border border-white/10 p-3"><span className="block truncate font-semibold text-white">{team?.name ?? "Team record unavailable"}</span>
          <select className="input-esports mt-2" aria-label={`Slot for ${team?.name ?? teamId}`} disabled={locked} value={assignments.find(row => row.teamId === teamId)?.slotNumber ?? ""} onChange={event => assign(teamId, Number(event.target.value))}>
            <option value="">Unassigned</option>
            {Array.from({ length: Math.max(0, Math.min(100, capacity)) }, (_, index) => index + 1).map(slot => <option key={slot} value={slot} disabled={assignments.some(row => row.slotNumber === slot && row.teamId !== teamId)}>Slot {slot}</option>)}
          </select>
        </label>;
      })}
    </div>
    <div className="flex flex-wrap gap-3">
      <button type="button" className="btn-secondary" disabled={locked || !teamIds.length} onClick={() => { setError(""); try { onChange({ ...value, teamCapacity: capacity, slotAssignments: autoAssignScrimSlots({ teamIds, teamCapacity: capacity, slotAssignments: assignments, slotsLocked: locked }) }); } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not assign slots."); } }}>Assign available slots</button>
      <button type="button" className="btn-secondary" disabled={!saved?.slotAssignments?.length} onClick={() => void copy()}>Copy saved slot assignments</button>
    </div>
    {error ? <p role="alert">{error}</p> : null}
    {message ? <p role="status">{message}</p> : null}
  </fieldset>;
}
