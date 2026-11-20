import type { SupabaseClient } from "@supabase/supabase-js";

const MODERN_PROFILE_FIELDS = "id,role,role_source,team_id,player_id,display_name,is_active";
const LEGACY_PROFILE_FIELDS = "id,role,team_id,player_id,display_name,status";

type QueryError = {
  code?: unknown;
  message?: unknown;
  details?: unknown;
  hint?: unknown;
};

type ProfileRow = Record<string, unknown>;

export type AuthProfileIdentity = {
  id: string;
  role: string;
  roleSource: string;
  teamId: string | null;
  playerId: string | null;
  displayName: string | null;
  isActive: boolean;
  schema: "modern" | "legacy";
};

function readRequiredText(row: ProfileRow, name: string) {
  const value = row[name];
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`Authentication profile is missing ${name}.`);
  }
  return value.trim();
}

function readOptionalText(row: ProfileRow, name: string) {
  const value = row[name];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function isLegacyProfileCompatibilityError(error: QueryError | null) {
  if (!error) return false;
  const code = typeof error.code === "string" ? error.code : "";
  const text = [error.message, error.details, error.hint]
    .filter((value): value is string => typeof value === "string")
    .join(" ")
    .toLowerCase();
  return (code === "42703" || code === "PGRST204") && /role_source|is_active/.test(text);
}

function mapModernProfile(data: ProfileRow): AuthProfileIdentity {
  if (typeof data.is_active !== "boolean") {
    throw new Error("Authentication profile is missing is_active.");
  }
  return {
    id: readRequiredText(data, "id"),
    role: readRequiredText(data, "role"),
    roleSource: readRequiredText(data, "role_source"),
    teamId: readOptionalText(data, "team_id"),
    playerId: readOptionalText(data, "player_id"),
    displayName: readOptionalText(data, "display_name"),
    isActive: data.is_active,
    schema: "modern",
  };
}

function mapLegacyProfile(data: ProfileRow): AuthProfileIdentity {
  const status = readRequiredText(data, "status").toLowerCase();
  return {
    id: readRequiredText(data, "id"),
    role: readRequiredText(data, "role"),
    roleSource: "legacy_schema",
    teamId: readOptionalText(data, "team_id"),
    playerId: readOptionalText(data, "player_id"),
    displayName: readOptionalText(data, "display_name"),
    isActive: status === "active",
    schema: "legacy",
  };
}

/**
 * Reads the modern protected identity projection. The only compatibility path
 * is the verified legacy staging schema, where `status` predates `is_active`
 * and `role_source`. Unknown schema or query failures continue to fail closed.
 */
export async function getAuthProfileIdentity(client: Pick<SupabaseClient, "from">, authUserId: string) {
  const modern = await client
    .from("profiles")
    .select(MODERN_PROFILE_FIELDS)
    .eq("auth_user_id", authUserId)
    .maybeSingle();

  if (!modern.error) {
    return modern.data ? mapModernProfile(modern.data as unknown as ProfileRow) : null;
  }
  if (!isLegacyProfileCompatibilityError(modern.error)) throw modern.error;

  const legacy = await client
    .from("profiles")
    .select(LEGACY_PROFILE_FIELDS)
    .eq("auth_user_id", authUserId)
    .maybeSingle();
  if (legacy.error) throw legacy.error;
  return legacy.data ? mapLegacyProfile(legacy.data as unknown as ProfileRow) : null;
}
