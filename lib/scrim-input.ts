import type { Scrim } from "./types";

export class ScrimInputError extends Error {}

export function validateScrimInput(body: Record<string, unknown>) {
  for (const key of ["title", "date", "map"]) {
    if (typeof body[key] !== "string" || !body[key].trim() || body[key].length > 200)
      throw new ScrimInputError(`${key} is required and must be at most 200 characters.`);
  }
  if (!Number.isFinite(Date.parse(body.date as string))) throw new ScrimInputError("A valid scrim date is required.");
  const statuses: Scrim["status"][] = ["scheduled", "live", "completed", "waiting_for_data"];
  if (body.status !== undefined && !statuses.includes(body.status as Scrim["status"])) throw new ScrimInputError("Invalid scrim status.");
  if (body.published !== undefined && typeof body.published !== "boolean") throw new ScrimInputError("published must be a boolean.");
  if (body.seasonDayNumber !== undefined && (!Number.isSafeInteger(body.seasonDayNumber) || Number(body.seasonDayNumber) < 1))
    throw new ScrimInputError("Season day must be a positive integer.");
  for (const key of ["teamIds", "mapRotation"]) {
    const values = body[key];
    if (
      values !== undefined &&
      (!Array.isArray(values) || values.length > 100 || values.some((value) => typeof value !== "string" || value.length > 160))
    )
      throw new ScrimInputError(`${key} must contain at most 100 text values.`);
  }
  for (const key of ["roomId", "roomPassword", "lobbyTime", "seasonId", "seasonTitle", "tournamentId"]) {
    if (body[key] !== undefined && (typeof body[key] !== "string" || body[key].length > 200))
      throw new ScrimInputError(`${key} must be at most 200 characters.`);
  }
  if (body.announcement !== undefined && (typeof body.announcement !== "string" || body.announcement.length > 5000))
    throw new ScrimInputError("Announcement must be at most 5000 characters.");
}

export function scrimAuditSummary(scrim: Partial<Scrim>) {
  return {
    id: scrim.id,
    title: scrim.title,
    date: scrim.date,
    status: scrim.status,
    published: scrim.published,
    teamCount: scrim.teamIds?.length ?? 0,
    deletedAt: scrim.deletedAt,
  };
}
