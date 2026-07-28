import "server-only";

import type { Json, Tables, TablesInsert, TablesUpdate } from "@/types/database.types";
import { getSupabaseServiceRoleClient } from "./supabase/service-role-client";
import { normalizeCanonicalTeamIdentity } from "./team-reconciliation";

type TeamRow = Tables<"teams">;
type TeamAliasRow = Tables<"team_aliases">;

const TEAM_SELECT =
  "id,name,short_name,tag,slug,slot_number,logo_url,description,region,status,is_active,verification_status,discord_mapping_status,primary_igl_profile_id,normalized_name,source_metadata,merged_into_team_id,archived_at,deleted_at,created_at,updated_at";
const TEAM_ALIAS_SELECT =
  "id,team_id,alias,normalized_alias,source,source_identifier,is_primary,previous_name,previous_tag,previous_slug,created_at";

export type CanonicalTeamAlias = {
  alias: string;
  id: string;
  isPrimary: boolean;
  normalizedAlias: string;
  source: string;
};

export type CanonicalAdminTeam = {
  aliases: CanonicalTeamAlias[];
  archivedAt: string | null;
  createdAt: string;
  description: string | null;
  discordMappingStatus: string;
  id: string;
  isActive: boolean;
  logo: string | null;
  logoUrl: string | null;
  mergedIntoTeamId: string | null;
  name: string;
  normalizedName: string;
  primaryIglProfileId: string | null;
  region: string | null;
  shortName: string | null;
  slotNumber: number | null;
  slug: string | null;
  sourceMetadata: Json;
  status: string;
  tag: string | null;
  updatedAt: string;
  verificationStatus: string;
};

export type CanonicalTeamWriteInput = {
  archivedAt?: string | null;
  description?: string | null;
  discordMappingStatus?: string;
  isActive?: boolean;
  mergedIntoTeamId?: string | null;
  name?: string;
  primaryIglProfileId?: string | null;
  region?: string | null;
  shortName?: string | null;
  slotNumber?: number | null;
  slug?: string | null;
  sourceMetadata?: Json;
  status?: string;
  tag?: string | null;
  verificationStatus?: string;
};

function readString(value: unknown) {
  return typeof value === "string" ? value : undefined;
}

function readNullableString(value: unknown) {
  return value === null || typeof value === "string" ? value : undefined;
}

function readBoolean(value: unknown) {
  return typeof value === "boolean" ? value : undefined;
}

function readNullableNumber(value: unknown) {
  return value === null || (typeof value === "number" && Number.isFinite(value)) ? value : undefined;
}

function readFirstPresent(body: Record<string, unknown>, keys: readonly string[]) {
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(body, key)) {
      return body[key];
    }
  }
  return undefined;
}

export function parseCanonicalTeamWriteInput(value: unknown): CanonicalTeamWriteInput {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const body = value as Record<string, unknown>;
  const parsed: CanonicalTeamWriteInput = {};
  const archivedAt = readNullableString(readFirstPresent(body, ["archivedAt", "archived_at"]));
  const description = readNullableString(body.description);
  const discordMappingStatus = readString(readFirstPresent(body, ["discordMappingStatus", "discord_mapping_status"]));
  const isActive = readBoolean(readFirstPresent(body, ["isActive", "is_active"]));
  const mergedIntoTeamId = readNullableString(readFirstPresent(body, ["mergedIntoTeamId", "merged_into_team_id"]));
  const name = readString(body.name);
  const primaryIglProfileId = readNullableString(readFirstPresent(body, ["primaryIglProfileId", "primary_igl_profile_id"]));
  const region = readNullableString(readFirstPresent(body, ["region", "country"]));
  const shortName = readNullableString(readFirstPresent(body, ["shortName", "short_name"]));
  const slotNumber = readNullableNumber(readFirstPresent(body, ["slotNumber", "slot_number"]));
  const slug = readNullableString(body.slug);
  const status = readString(body.status);
  const tag = readNullableString(body.tag);
  const verificationStatus = readString(readFirstPresent(body, ["verificationStatus", "verification_status"]));

  if (archivedAt !== undefined) parsed.archivedAt = archivedAt;
  if (description !== undefined) parsed.description = description;
  if (discordMappingStatus !== undefined) parsed.discordMappingStatus = discordMappingStatus;
  if (isActive !== undefined) parsed.isActive = isActive;
  if (mergedIntoTeamId !== undefined) parsed.mergedIntoTeamId = mergedIntoTeamId;
  if (name !== undefined) parsed.name = name;
  if (primaryIglProfileId !== undefined) parsed.primaryIglProfileId = primaryIglProfileId;
  if (region !== undefined) parsed.region = region;
  if (shortName !== undefined) parsed.shortName = shortName;
  if (slotNumber !== undefined) parsed.slotNumber = slotNumber;
  if (slug !== undefined) parsed.slug = slug;
  if (status !== undefined) parsed.status = status;
  if (tag !== undefined) parsed.tag = tag;
  if (verificationStatus !== undefined) parsed.verificationStatus = verificationStatus;

  return parsed;
}

export class CanonicalTeamError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(message: string, options: { code: string; status: number }) {
    super(message);
    this.name = "CanonicalTeamError";
    this.code = options.code;
    this.status = options.status;
  }
}

export function isCanonicalTeamId(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value.trim());
}

function nullableString(value: unknown) {
  if (value === null) return null;
  if (typeof value !== "string") return undefined;
  return value.trim() || null;
}

function normalizeSlug(value: string) {
  return value
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function toCanonicalAlias(row: TeamAliasRow): CanonicalTeamAlias | null {
  const alias = row.alias ?? row.previous_name ?? row.previous_tag ?? row.previous_slug;
  if (!alias?.trim()) return null;
  return {
    alias: alias.trim(),
    id: row.id,
    isPrimary: row.is_primary,
    normalizedAlias: normalizeCanonicalTeamIdentity(alias),
    source: row.source,
  };
}

function toCanonicalTeam(row: TeamRow, aliases: CanonicalTeamAlias[] = []): CanonicalAdminTeam {
  return {
    aliases,
    archivedAt: row.archived_at,
    createdAt: row.created_at,
    description: row.description,
    discordMappingStatus: row.discord_mapping_status,
    id: row.id,
    isActive: row.is_active,
    logo: row.logo_url,
    logoUrl: row.logo_url,
    mergedIntoTeamId: row.merged_into_team_id,
    name: row.name,
    normalizedName: row.normalized_name ?? normalizeCanonicalTeamIdentity(row.name),
    primaryIglProfileId: row.primary_igl_profile_id,
    region: row.region,
    shortName: row.short_name,
    slotNumber: row.slot_number,
    slug: row.slug,
    sourceMetadata: row.source_metadata,
    status: row.status,
    tag: row.tag,
    updatedAt: row.updated_at,
    verificationStatus: row.verification_status,
  };
}

async function listAliasesByTeamId(teamIds: string[]) {
  if (teamIds.length === 0) return new Map<string, CanonicalTeamAlias[]>();
  const client = getSupabaseServiceRoleClient();
  const { data, error } = await client.from("team_aliases").select(TEAM_ALIAS_SELECT).in("team_id", teamIds).order("created_at");
  if (error) throw error;

  const aliasesByTeamId = new Map<string, CanonicalTeamAlias[]>();
  for (const row of (data ?? []) as TeamAliasRow[]) {
    const alias = toCanonicalAlias(row);
    if (!alias) continue;
    const aliases = aliasesByTeamId.get(row.team_id) ?? [];
    aliases.push(alias);
    aliasesByTeamId.set(row.team_id, aliases);
  }
  return aliasesByTeamId;
}

export async function listCanonicalAdminTeams() {
  const client = getSupabaseServiceRoleClient();
  const { data, error } = await client.from("teams").select(TEAM_SELECT).is("deleted_at", null).order("name");
  if (error) throw error;

  const rows = (data ?? []) as TeamRow[];
  const aliasesByTeamId = await listAliasesByTeamId(rows.map((row) => row.id));
  return rows.map((row) => toCanonicalTeam(row, aliasesByTeamId.get(row.id) ?? []));
}

function isActiveCanonicalTeamLifecycle(team: {
  archivedAt: string | null;
  isActive: boolean;
  mergedIntoTeamId: string | null;
  status: string;
}) {
  return team.isActive && team.status.trim().toLowerCase() === "active" && !team.archivedAt && !team.mergedIntoTeamId;
}

function normalizedIdentitySet(values: ReadonlyArray<string | null | undefined>) {
  return new Set(
    values
      .filter((value): value is string => typeof value === "string" && Boolean(value.trim()))
      .map((value) => normalizeCanonicalTeamIdentity(value))
      .filter(Boolean),
  );
}

async function assertCanonicalTeamIdentitiesAvailable(teamId: string | null, identityValues: ReadonlyArray<string | null | undefined>) {
  const proposedIdentities = normalizedIdentitySet(identityValues);
  if (proposedIdentities.size === 0) return;

  const teams = await listCanonicalAdminTeams();
  const conflictingTeam = teams.find((team) => {
    if (team.id === teamId || !isActiveCanonicalTeamLifecycle(team)) return false;
    const claimedIdentities = normalizedIdentitySet([team.name, team.tag, team.slug, ...team.aliases.map((alias) => alias.alias)]);
    return [...proposedIdentities].some((identity) => claimedIdentities.has(identity));
  });

  if (conflictingTeam) {
    throw new CanonicalTeamError(
      "That name, tag, slug, or alias is already claimed by another active official team. Reconcile the teams instead of creating an ambiguous identity.",
      {
        code: "canonical_team_identity_conflict",
        status: 409,
      },
    );
  }
}

function throwCanonicalTeamMutationError(error: unknown): never {
  const record = typeof error === "object" && error !== null ? (error as Record<string, unknown>) : null;
  const code = typeof record?.code === "string" ? record.code : "";
  const diagnostic = [record?.message, record?.details, record?.hint]
    .filter((value): value is string => typeof value === "string")
    .join(" ");
  if (code === "23505" && /canonical team identity|name\/tag\/slug\/alias|canonical_team_identity_claims/i.test(diagnostic)) {
    throw new CanonicalTeamError(
      "That name, tag, slug, or alias was claimed by another active official team. Refresh and reconcile the duplicate.",
      {
        code: "canonical_team_identity_conflict",
        status: 409,
      },
    );
  }
  throw error;
}

export async function getCanonicalAdminTeam(identifier: string) {
  const client = getSupabaseServiceRoleClient();
  const normalizedIdentifier = identifier.trim();
  let query = client.from("teams").select(TEAM_SELECT).is("deleted_at", null);
  query = isCanonicalTeamId(normalizedIdentifier) ? query.eq("id", normalizedIdentifier) : query.eq("slug", normalizedIdentifier);
  const { data, error } = await query.maybeSingle<TeamRow>();
  if (error) throw error;
  if (!data) return null;

  const aliasesByTeamId = await listAliasesByTeamId([data.id]);
  return toCanonicalTeam(data, aliasesByTeamId.get(data.id) ?? []);
}

function buildTeamUpdate(input: CanonicalTeamWriteInput): TablesUpdate<"teams"> {
  const update: TablesUpdate<"teams"> = {};
  if ("name" in input && typeof input.name === "string") {
    const name = input.name.trim();
    if (!name) throw new CanonicalTeamError("Team name is required.", { code: "invalid_team_name", status: 400 });
    update.name = name;
    update.normalized_name = normalizeCanonicalTeamIdentity(name);
  }
  if ("shortName" in input) update.short_name = nullableString(input.shortName);
  if ("tag" in input) update.tag = nullableString(input.tag);
  if ("slug" in input) update.slug = input.slug ? normalizeSlug(input.slug) : null;
  if ("slotNumber" in input) update.slot_number = input.slotNumber ?? null;
  if ("description" in input) update.description = nullableString(input.description);
  if ("region" in input) update.region = nullableString(input.region);
  if ("status" in input && input.status) update.status = input.status;
  if ("isActive" in input) update.is_active = input.isActive;
  if ("verificationStatus" in input && input.verificationStatus) update.verification_status = input.verificationStatus;
  if ("discordMappingStatus" in input && input.discordMappingStatus) update.discord_mapping_status = input.discordMappingStatus;
  if ("primaryIglProfileId" in input) update.primary_igl_profile_id = input.primaryIglProfileId ?? null;
  if ("mergedIntoTeamId" in input) update.merged_into_team_id = input.mergedIntoTeamId ?? null;
  if ("archivedAt" in input) update.archived_at = input.archivedAt ?? null;
  if ("sourceMetadata" in input && input.sourceMetadata !== undefined) update.source_metadata = input.sourceMetadata;
  update.updated_at = new Date().toISOString();
  return update;
}

export async function updateCanonicalAdminTeam(id: string, input: CanonicalTeamWriteInput) {
  if (!isCanonicalTeamId(id)) {
    throw new CanonicalTeamError("Select a valid official team.", { code: "invalid_team_id", status: 400 });
  }

  const client = getSupabaseServiceRoleClient();
  const validatesIdentity = ["archivedAt", "isActive", "mergedIntoTeamId", "name", "slug", "status", "tag"].some((field) => field in input);
  if (validatesIdentity) {
    const current = await getCanonicalAdminTeam(id);
    if (!current) {
      throw new CanonicalTeamError("The official team could not be found.", { code: "team_not_found", status: 404 });
    }

    const proposed = {
      archivedAt: "archivedAt" in input ? (input.archivedAt ?? null) : current.archivedAt,
      isActive: "isActive" in input ? Boolean(input.isActive) : current.isActive,
      mergedIntoTeamId: "mergedIntoTeamId" in input ? (input.mergedIntoTeamId ?? null) : current.mergedIntoTeamId,
      name: typeof input.name === "string" ? input.name.trim() : current.name,
      slug: "slug" in input ? (input.slug ? normalizeSlug(input.slug) : null) : current.slug,
      status: typeof input.status === "string" && input.status ? input.status : current.status,
      tag: "tag" in input ? nullableString(input.tag) : current.tag,
    };
    if (isActiveCanonicalTeamLifecycle(proposed)) {
      await assertCanonicalTeamIdentitiesAvailable(id, [
        proposed.name,
        proposed.tag,
        proposed.slug,
        ...current.aliases.map((alias) => alias.alias),
      ]);
    }
  }

  const { data, error } = await client
    .from("teams")
    .update(buildTeamUpdate(input))
    .eq("id", id)
    .is("deleted_at", null)
    .select(TEAM_SELECT)
    .maybeSingle<TeamRow>();
  if (error) throwCanonicalTeamMutationError(error);
  if (!data) {
    throw new CanonicalTeamError("The official team could not be found.", { code: "team_not_found", status: 404 });
  }

  const aliasesByTeamId = await listAliasesByTeamId([data.id]);
  return toCanonicalTeam(data, aliasesByTeamId.get(data.id) ?? []);
}

export async function replaceCanonicalTeamLogoWithCas(
  id: string,
  input: {
    expectedLogoUrl: string | null;
    expectedUpdatedAt: string;
    logoUrl: string | null;
    sourceMetadata: Json;
  },
) {
  if (!isCanonicalTeamId(id)) {
    throw new CanonicalTeamError("Select a valid official team.", { code: "invalid_team_id", status: 400 });
  }

  const client = getSupabaseServiceRoleClient();
  let query = client
    .from("teams")
    .update({
      logo_url: input.logoUrl,
      source_metadata: input.sourceMetadata,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("updated_at", input.expectedUpdatedAt)
    .is("deleted_at", null);
  query = input.expectedLogoUrl ? query.eq("logo_url", input.expectedLogoUrl) : query.is("logo_url", null);

  const { data, error } = await query.select(TEAM_SELECT).maybeSingle<TeamRow>();
  if (error) {
    try {
      const current = await getCanonicalAdminTeam(id);
      if (current?.logoUrl === input.logoUrl) {
        return current;
      }
    } catch {
      // A failed recovery read leaves activation state unknown. Preserve the
      // versioned object so a committed logo can never be deleted accidentally.
    }

    throw new CanonicalTeamError(
      "The logo activation result could not be confirmed. The uploaded version was retained for safe recovery.",
      {
        code: "team_logo_activation_unconfirmed",
        status: 503,
      },
    );
  }

  if (!data) {
    const current = await getCanonicalAdminTeam(id);
    if (current?.logoUrl === input.logoUrl) {
      return current;
    }
    throw new CanonicalTeamError("This team changed while the logo was uploading. Refresh and try again.", {
      code: "team_logo_version_conflict",
      status: 409,
    });
  }

  const aliasesByTeamId = await listAliasesByTeamId([data.id]);
  return toCanonicalTeam(data, aliasesByTeamId.get(data.id) ?? []);
}

export async function createCanonicalAdminTeam(input: CanonicalTeamWriteInput & { name: string }) {
  const client = getSupabaseServiceRoleClient();
  const name = input.name.trim();
  if (!name || !normalizeCanonicalTeamIdentity(name)) {
    throw new CanonicalTeamError("Team name must contain letters or numbers.", { code: "invalid_team_name", status: 400 });
  }
  const slug = normalizeSlug(input.slug ?? name);
  const proposedLifecycle = {
    archivedAt: input.archivedAt ?? null,
    isActive: input.isActive ?? true,
    mergedIntoTeamId: input.mergedIntoTeamId ?? null,
    status: input.status ?? "active",
  };
  if (isActiveCanonicalTeamLifecycle(proposedLifecycle)) {
    await assertCanonicalTeamIdentitiesAvailable(null, [name, input.tag, slug]);
  }
  const insert: TablesInsert<"teams"> = {
    ...buildTeamUpdate(input),
    name,
    normalized_name: normalizeCanonicalTeamIdentity(name),
    slug,
  };
  const { data, error } = await client.from("teams").insert(insert).select(TEAM_SELECT).single<TeamRow>();
  if (error) throwCanonicalTeamMutationError(error);
  return toCanonicalTeam(data);
}

export async function archiveCanonicalAdminTeam(id: string) {
  return updateCanonicalAdminTeam(id, {
    archivedAt: new Date().toISOString(),
    isActive: false,
    status: "archived",
  });
}

export async function saveCanonicalTeamAlias(teamId: string, aliasValue: string) {
  if (!isCanonicalTeamId(teamId)) {
    throw new CanonicalTeamError("Select a valid official team.", { code: "invalid_team_id", status: 400 });
  }
  const alias = aliasValue.trim();
  const normalizedAlias = normalizeCanonicalTeamIdentity(alias);
  if (!alias || normalizedAlias.length < 2) {
    throw new CanonicalTeamError("Enter a recognizable team alias.", { code: "invalid_alias", status: 400 });
  }

  const team = await getCanonicalAdminTeam(teamId);
  if (!team) {
    throw new CanonicalTeamError("The official team could not be found.", { code: "team_not_found", status: 404 });
  }

  const client = getSupabaseServiceRoleClient();
  if (isActiveCanonicalTeamLifecycle(team)) {
    await assertCanonicalTeamIdentitiesAvailable(teamId, [alias]);
  }

  const sourceIdentifier = `team-logo:${teamId}:${normalizedAlias}`;
  const aliasRecord: TablesInsert<"team_aliases"> = {
    alias,
    is_primary: false,
    normalized_alias: normalizedAlias,
    previous_name: null,
    previous_slug: null,
    previous_tag: null,
    source: "team_logo_manual",
    source_identifier: sourceIdentifier,
    team_id: teamId,
  };
  const { data: existing, error: existingError } = await client
    .from("team_aliases")
    .select(TEAM_ALIAS_SELECT)
    .eq("team_id", teamId)
    .eq("source", "team_logo_manual")
    .eq("normalized_alias", normalizedAlias)
    .limit(1)
    .maybeSingle<TeamAliasRow>();
  if (existingError) throw existingError;

  const result = existing
    ? await client.from("team_aliases").update(aliasRecord).eq("id", existing.id).select(TEAM_ALIAS_SELECT).single<TeamAliasRow>()
    : await client.from("team_aliases").insert(aliasRecord).select(TEAM_ALIAS_SELECT).single<TeamAliasRow>();
  if (result.error) throwCanonicalTeamMutationError(result.error);
  const canonicalAlias = toCanonicalAlias(result.data);
  if (!canonicalAlias) {
    throw new CanonicalTeamError("The alias could not be saved.", { code: "alias_save_failed", status: 500 });
  }
  return canonicalAlias;
}

export function mergeTeamSourceMetadata(current: Json, patch: Record<string, Json>): Json {
  const currentObject = typeof current === "object" && current !== null && !Array.isArray(current) ? current : {};
  return {
    ...currentObject,
    ...patch,
  };
}
