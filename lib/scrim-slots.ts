import type { Scrim } from "./types";

export class ScrimSlotError extends Error {}

type SlotSettings = Pick<Scrim, "teamIds" | "teamCapacity" | "slotAssignments" | "slotsLocked">;

export function toggleScrimTeamConfirmation(value: Partial<Scrim>, teamId: string): Partial<Scrim> {
  if (value.slotsLocked) throw new ScrimSlotError("Unlock confirmed slots before adding or withdrawing a team.");
  const current = value.teamIds ?? [];
  const teamIds = current.includes(teamId) ? current.filter(id => id !== teamId) : [...current, teamId];
  const next = { ...value, teamIds, slotAssignments: value.slotAssignments?.filter(row => teamIds.includes(row.teamId)) };
  validateScrimSlots(next);
  return next;
}

/** Preserve legacy day records until an operator explicitly configures event slots. */
export function validateScrimSlots(input: Record<string, unknown>, existing?: Scrim) {
  const teamIds = Array.isArray(input.teamIds) ? input.teamIds : [];
  if (new Set(teamIds).size !== teamIds.length) throw new ScrimSlotError("A team can only be confirmed once in a scrim.");
  const configured = ["teamCapacity", "slotAssignments", "slotsLocked"].some(key => input[key] !== undefined);
  if (!configured) return;
  const capacity = input.teamCapacity === undefined ? 16 : input.teamCapacity;
  if (!Number.isSafeInteger(capacity) || Number(capacity) < 1 || Number(capacity) > 100)
    throw new ScrimSlotError("Team capacity must be between 1 and 100.");
  if (teamIds.length > Number(capacity)) throw new ScrimSlotError("Confirmed teams exceed this scrim's capacity.");
  if (input.slotsLocked !== undefined && typeof input.slotsLocked !== "boolean") throw new ScrimSlotError("Slot lock must be a boolean.");
  const assignments = input.slotAssignments === undefined ? [] : input.slotAssignments;
  if (!Array.isArray(assignments) || assignments.length > Number(capacity)) throw new ScrimSlotError("Invalid scrim slot assignments.");
  const assignedTeams = new Set<string>();
  const assignedSlots = new Set<number>();
  for (const assignment of assignments) {
    if (!assignment || typeof assignment !== "object" || Array.isArray(assignment)) throw new ScrimSlotError("Invalid scrim slot assignment.");
    const { teamId, slotNumber } = assignment as Record<string, unknown>;
    if (typeof teamId !== "string" || !teamIds.includes(teamId)) throw new ScrimSlotError("Only confirmed teams can receive a scrim slot.");
    if (!Number.isSafeInteger(slotNumber) || Number(slotNumber) < 1 || Number(slotNumber) > Number(capacity))
      throw new ScrimSlotError("Each slot must be within this scrim's capacity.");
    if (assignedTeams.has(teamId) || assignedSlots.has(Number(slotNumber))) throw new ScrimSlotError("A team and a slot can each occur only once in this scrim.");
    assignedTeams.add(teamId);
    assignedSlots.add(Number(slotNumber));
  }
  if (existing?.slotsLocked && input.slotsLocked !== false) {
    const canonical = (rows: { teamId: string; slotNumber: number }[]) => JSON.stringify([...rows].sort((a, b) => a.slotNumber - b.slotNumber));
    if (Number(capacity) !== (existing.teamCapacity ?? 16) || canonical(assignments) !== canonical(existing.slotAssignments ?? []) ||
      JSON.stringify([...teamIds].sort()) !== JSON.stringify([...existing.teamIds].sort()))
      throw new ScrimSlotError("Unlock confirmed slots before changing teams, capacity or assignments.");
  }
}

export function autoAssignScrimSlots(settings: SlotSettings): NonNullable<Scrim["slotAssignments"]> {
  validateScrimSlots(settings as unknown as Record<string, unknown>);
  if (settings.slotsLocked) throw new ScrimSlotError("Unlock confirmed slots before assigning teams.");
  const capacity = settings.teamCapacity ?? 16;
  const assignments = [...(settings.slotAssignments ?? [])];
  const used = new Set(assignments.map(row => row.slotNumber));
  for (const teamId of settings.teamIds) {
    if (assignments.some(row => row.teamId === teamId)) continue;
    const slotNumber = Array.from({ length: capacity }, (_, index) => index + 1).find(slot => !used.has(slot));
    if (!slotNumber) throw new ScrimSlotError("No free slot remains in this scrim.");
    assignments.push({ teamId, slotNumber });
    used.add(slotNumber);
  }
  return assignments.sort((a, b) => a.slotNumber - b.slotNumber);
}

export function buildScrimSlotNotice(scrim: Pick<Scrim, "title" | "date" | "lobbyTime" | "teamIds" | "teamCapacity" | "slotAssignments">, teams: { id: string; name: string }[]) {
  validateScrimSlots(scrim as unknown as Record<string, unknown>);
  const rows = [...(scrim.slotAssignments ?? [])].sort((a, b) => a.slotNumber - b.slotNumber);
  if (!rows.length) throw new ScrimSlotError("Save confirmed slot assignments before copying a notice.");
  const lines = rows.map(row => {
    const team = teams.find(candidate => candidate.id === row.teamId);
    if (!team?.name.trim()) throw new ScrimSlotError("A confirmed team name is unavailable. Reload before copying slots.");
    return `Slot ${String(row.slotNumber).padStart(2, "0")} — ${team.name.replace(/[\r\n]/g, " ")}`;
  });
  return [scrim.title, `${scrim.date} · ${scrim.lobbyTime || "Start time pending"}`, ...lines].join("\n");
}
