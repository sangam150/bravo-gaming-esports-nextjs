import type { Player } from "./types";

export class PlayerProfileInputError extends Error {}

export function validatePlayerProfileInput(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new PlayerProfileInputError("A player profile object is required.");
  const row = value as Record<string, unknown>;
  for (const field of [
    "name",
    "inGameName",
    "pubgName",
    "pubgId",
    "teamId",
    "slug",
    "realName",
    "phone",
    "email",
    "discord",
    "nationality",
  ]) {
    if (row[field] !== undefined && (typeof row[field] !== "string" || row[field].length > 200))
      throw new PlayerProfileInputError(`${field} must be text of at most 200 characters.`);
  }
  if (row.playerStatus !== undefined && row.playerStatus !== "active" && row.playerStatus !== "inactive")
    throw new PlayerProfileInputError("Select an active or inactive player status.");
  if (row.role !== undefined && !["IGL", "Assaulter", "Support", "Sniper", "Substitute"].includes(String(row.role)))
    throw new PlayerProfileInputError("Select a supported player role.");
}

export function canonicalPlayerFields(input: Partial<Player> & { name: string }) {
  const name = input.name?.trim();
  const pubgName = (input.inGameName || input.pubgName || name || "").trim();
  if (!name || !pubgName || name.length > 100 || pubgName.length > 100)
    throw new Error("A player name of at most 100 characters is required.");
  if (input.teamId && !/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(input.teamId))
    throw new Error("A canonical team ID is required.");
  if (input.pubgId && input.pubgId.length > 200) throw new Error("PUBG account ID must be at most 200 characters.");
  return {
    pubg_name: pubgName,
    display_name: name,
    pubg_account_id: input.pubgId?.trim() || null,
    current_team_id: input.teamId || null,
    is_active: input.playerStatus !== "inactive",
  };
}

export function canonicalPlayerMetadata(input: Partial<Player>, saved: Player) {
  return {
    name: saved.name,
    slug: saved.slug,
    inGameName: saved.inGameName,
    pubgName: saved.pubgName,
    pubgId: saved.pubgId,
    teamId: saved.teamId,
    playerStatus: saved.playerStatus,
    createdAt: saved.createdAt,
    realName: input.realName,
    role: input.role,
    discord: input.discord,
    phone: input.phone,
    email: input.email,
    nationality: input.nationality,
  };
}
