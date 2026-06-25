import "server-only";

import { randomUUID } from "crypto";
import { deleteCompetitionMatch, getCompetitionMatch, saveCompetitionMatch } from "./competition-relational";
import { readJsonObject, sanitizeJsonValue } from "./json-utils";
import { previewPubgMatches } from "./pubg-sync";
import { getSupabaseServiceRoleClient } from "./supabase/service-role-client";
import type {
  MatchPlayerResult,
  PubgBulkImportResult,
  PubgBulkImportResultItem,
  PubgBulkPreviewResult,
  PubgDuplicateMode,
  PubgImportContext,
  PubgImportEdit,
  PubgImportPreview,
  TeamMatchResult,
  TournamentMatch,
} from "./types";
import type { Json, Tables, TablesInsert } from "@/types/database.types";

type ImportTargetOptions = {
  tournamentId?: string;
  scrimId?: string;
  seasonId?: string;
  seasonDayNumber?: number;
  autoCreateDay?: boolean;
  dayTitle?: string;
  dayDate?: string;
  dayMap?: string;
  dayLobbyTime?: string;
  dayMapRotation?: string[];
  matchEdits?: PubgImportEdit[];
};

type RelationalImportOptions = ImportTargetOptions & {
  duplicateMode?: PubgDuplicateMode;
  publish?: boolean;
};

type PendingImportCachePayload = {
  context: PubgImportContext;
  preview: PubgImportPreview;
  sourceMatchId: string;
  raw?: unknown;
};

function cleanString(value?: string | null) {
  const normalizedValue = value?.trim();
  return normalizedValue ? normalizedValue : undefined;
}

function toFiniteNumber(value: unknown, fallback = 0) {
  const numericValue = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numericValue) ? numericValue : fallback;
}

function normalizeTeamResults(results?: TeamMatchResult[]) {
  return (results ?? []).map((result) => {
    const kills = toFiniteNumber(result.kills);
    const placementPoints = toFiniteNumber(result.placementPoints);
    const killPoints = toFiniteNumber(result.killPoints, kills);

    return {
      ...result,
      placement: toFiniteNumber(result.placement),
      kills,
      damage: toFiniteNumber(result.damage),
      placementPoints,
      killPoints,
      totalPoints: toFiniteNumber(result.totalPoints, placementPoints + killPoints),
    } satisfies TeamMatchResult;
  });
}

function normalizePlayerResults(results?: MatchPlayerResult[]) {
  return (results ?? []).map((result) => {
    const kills = toFiniteNumber(result.kills);
    const placementPoints = toFiniteNumber(result.placementPoints);

    return {
      ...result,
      placement: toFiniteNumber(result.placement),
      kills,
      assists: toFiniteNumber(result.assists),
      knocks: toFiniteNumber(result.knocks),
      damage: toFiniteNumber(result.damage),
      survivalTime: toFiniteNumber(result.survivalTime),
      placementPoints,
      totalPoints: toFiniteNumber(result.totalPoints, placementPoints + kills),
    } satisfies MatchPlayerResult;
  });
}

function normalizeImportEdits(edits?: PubgImportEdit[]) {
  const byMatchId = new Map<string, PubgImportEdit>();

  for (const edit of edits ?? []) {
    const sourceMatchId = cleanString(edit.sourceMatchId);
    if (!sourceMatchId) continue;
    byMatchId.set(sourceMatchId, edit);
  }

  return byMatchId;
}

function applyEdit(preview: PubgImportPreview, edit?: PubgImportEdit) {
  if (!edit) {
    return {
      matchId: preview.matchId,
      matchNumber: preview.matchNumber,
      map: preview.summary.mapName ?? "Unknown",
      playedAt: preview.summary.createdAt,
      teamResults: normalizeTeamResults(preview.teamResults),
      playerResults: normalizePlayerResults(preview.playerResults),
    };
  }

  return {
    matchId: cleanString(edit.matchId) ?? preview.matchId,
    matchNumber: typeof edit.matchNumber === "number" ? edit.matchNumber : preview.matchNumber,
    map: cleanString(edit.map) ?? preview.summary.mapName ?? "Unknown",
    playedAt: cleanString(edit.playedAt) ?? preview.summary.createdAt,
    teamResults: normalizeTeamResults(edit.teamResults?.length ? edit.teamResults : preview.teamResults),
    playerResults: normalizePlayerResults(edit.playerResults?.length ? edit.playerResults : preview.playerResults),
  };
}

async function findExistingDuplicate(
  tournamentId: string | undefined,
  matchId: string,
  matchNumber: number | undefined
) {
  const client = getSupabaseServiceRoleClient();
  const duplicateIds = new Set<string>();

  const { data: byMatchId, error: byMatchIdError } = await client
    .from("matches")
    .select("id")
    .is("deleted_at", null)
    .or(`match_id.eq.${matchId},external_match_id.eq.${matchId}`)
    .limit(5);

  if (byMatchIdError) {
    throw byMatchIdError;
  }

  for (const row of byMatchId ?? []) {
    duplicateIds.add(row.id);
  }

  if (tournamentId && typeof matchNumber === "number") {
    const { data: bySequence, error: bySequenceError } = await client
      .from("matches")
      .select("id")
      .eq("event_id", tournamentId)
      .eq("match_number", matchNumber)
      .is("deleted_at", null)
      .limit(5);

    if (bySequenceError) {
      throw bySequenceError;
    }

    for (const row of bySequence ?? []) {
      duplicateIds.add(row.id);
    }
  }

  const [firstId] = Array.from(duplicateIds);
  return firstId;
}

export async function cachePendingImportPreview(payload: PendingImportCachePayload) {
  const client = getSupabaseServiceRoleClient();

  const normalizedJson = (sanitizeJsonValue({
    context: payload.context,
    preview: payload.preview,
    sourceMatchId: payload.sourceMatchId,
  }) ?? null) as Json | null;
  const rawJson = (sanitizeJsonValue(payload.raw ?? payload.preview.summary ?? null) ?? null) as Json | null;

  const now = new Date().toISOString();
  const insertPayload: TablesInsert<"pending_imports"> = {
    id: randomUUID(),
    created_at: now,
    updated_at: now,
    created_by: null,
    day_id: payload.context.scrimId ?? null,
    map: payload.preview.summary.mapName ?? null,
    match_date: payload.preview.summary.createdAt ?? null,
    match_id: payload.preview.matchId,
    match_number: payload.preview.matchNumber ?? null,
    normalized_json: normalizedJson,
    raw_json: rawJson,
    season_id: payload.context.seasonId ?? null,
    status: "pending",
  };

  const { error } = await client.from("pending_imports").insert(insertPayload);
  if (error) {
    throw error;
  }
}

export async function getLatestPendingImportCache(matchId: string) {
  const client = getSupabaseServiceRoleClient();
  const { data, error } = await client
    .from("pending_imports")
    .select("*")
    .eq("match_id", matchId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ?? null;
}

export function parseCachedPreview(cacheRow: Tables<"pending_imports"> | null) {
  if (!cacheRow) return null;
  const normalized = readJsonObject(cacheRow.normalized_json);
  if (!normalized) return null;

  const previewValue = readJsonObject((normalized.preview as Json | undefined) ?? null);
  if (!previewValue) return null;

  const contextValue = readJsonObject((normalized.context as Json | undefined) ?? null) ?? {};

  const sourceMatchIdValue = normalized.sourceMatchId;
  const sourceMatchId =
    typeof sourceMatchIdValue === "string" && sourceMatchIdValue.trim().length > 0
      ? sourceMatchIdValue.trim()
      : cacheRow.match_id;

  return {
    context: contextValue as PubgImportContext,
    sourceMatchId,
    preview: previewValue as PubgImportPreview,
  };
}

export async function getLatestRawImportPayload(matchId: string) {
  const cacheRow = await getLatestPendingImportCache(matchId);
  return cacheRow?.raw_json ?? null;
}

export async function importPubgMatchesRelational(
  matchIds: string[],
  options?: RelationalImportOptions
): Promise<PubgBulkImportResult> {
  const normalizedMatchIds = Array.from(new Set(matchIds.map((value) => value.trim()).filter(Boolean)));
  if (normalizedMatchIds.length === 0) {
    throw new Error("At least one PUBG match ID is required.");
  }

  const duplicateMode = options?.duplicateMode ?? "overwrite";
  const matchEdits = normalizeImportEdits(options?.matchEdits);
  const previewResult: PubgBulkPreviewResult = await previewPubgMatches(normalizedMatchIds, options);
  const publish = options?.publish !== false;

  const results: PubgBulkImportResultItem[] = [];

  for (const preview of previewResult.previews) {
    try {
      const edit = matchEdits.get(preview.matchId);
      const normalized = applyEdit(preview, edit);
      const existingDuplicateId = await findExistingDuplicate(
        previewResult.context.tournamentId,
        normalized.matchId,
        normalized.matchNumber
      );

      if (existingDuplicateId && duplicateMode === "skip") {
        results.push({
          matchId: normalized.matchId,
          success: true,
          skipped: true,
          alreadyImported: true,
        });
        continue;
      }

      if (existingDuplicateId && duplicateMode === "error") {
        results.push({
          matchId: normalized.matchId,
          success: false,
          alreadyImported: true,
          error: "Duplicate match. This PUBG match is already imported.",
          code: "duplicate_match",
        });
        continue;
      }

      const matchPayload: Partial<TournamentMatch> & { pubgMatchId: string; map: string } = {
        id: existingDuplicateId,
        tournamentId: previewResult.context.tournamentId,
        scrimId: previewResult.context.scrimId,
        pubgMatchId: normalized.matchId,
        externalMatchId: preview.matchId,
        sequenceNumber: normalized.matchNumber,
        matchNumber: normalized.matchNumber,
        map: normalized.map,
        status: publish ? "published" : "draft",
        playedAt: normalized.playedAt,
        dataSource: "pubg_api",
        teamResults: normalized.teamResults,
        playerResults: normalized.playerResults,
      };

      await saveCompetitionMatch(matchPayload, { publish });

      await cachePendingImportPreview({
        context: previewResult.context,
        preview,
        sourceMatchId: preview.matchId,
      });

      results.push({
        matchId: normalized.matchId,
        success: true,
        alreadyImported: Boolean(existingDuplicateId),
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      results.push({
        matchId: preview.matchId,
        success: false,
        error: message,
      });
    }
  }

  for (const previewError of previewResult.errors) {
    results.push({
      matchId: previewError.matchId,
      success: false,
      error: previewError.error,
      code: previewError.code,
      alreadyImported: previewError.alreadyImported,
    });
  }

  return {
    context: previewResult.context,
    results,
    importedCount: results.filter((result) => result.success && !result.skipped).length,
    skippedCount: results.filter((result) => result.skipped).length,
    failedCount: results.filter((result) => !result.success).length,
  };
}

export async function repairImportedPubgMatchFromCache(matchId: string, options?: { publish?: boolean; forcePublished?: boolean }) {
  const client = getSupabaseServiceRoleClient();
  const { data: existingRows, error } = await client
    .from("matches")
    .select("id,status")
    .is("deleted_at", null)
    .or(`match_id.eq.${matchId},external_match_id.eq.${matchId}`)
    .order("updated_at", { ascending: false })
    .limit(1);

  if (error) {
    throw error;
  }

  const existingRow = existingRows?.[0] ?? null;
  if (!existingRow) {
    throw new Error("No imported match found for the provided match ID.");
  }

  if ((existingRow.status === "published" || existingRow.status === "approved") && !options?.forcePublished) {
    throw new Error("This match is already published. Set forcePublished=true to repair it.");
  }

  const cache = parseCachedPreview(await getLatestPendingImportCache(matchId));
  if (!cache) {
    throw new Error("No cached preview found for this match. Re-preview the match first.");
  }

  const repaired = await saveCompetitionMatch(
    {
      id: existingRow.id,
      tournamentId: cache.context.tournamentId,
      scrimId: cache.context.scrimId,
      pubgMatchId: cache.preview.matchId,
      externalMatchId: cache.sourceMatchId,
      sequenceNumber: cache.preview.matchNumber,
      matchNumber: cache.preview.matchNumber,
      map: cache.preview.summary.mapName ?? "Unknown",
      status: options?.publish === false ? "draft" : "published",
      playedAt: cleanString(cache.preview.summary.createdAt),
      dataSource: "pubg_api",
      teamResults: normalizeTeamResults(cache.preview.teamResults),
      playerResults: normalizePlayerResults(cache.preview.playerResults),
    },
    { publish: options?.publish !== false }
  );

  return repaired;
}

export async function resetImportedPubgMatch(matchId: string, options?: { confirmPublished?: boolean }) {
  const client = getSupabaseServiceRoleClient();
  const { data: existingRows, error } = await client
    .from("matches")
    .select("id,status")
    .is("deleted_at", null)
    .or(`match_id.eq.${matchId},external_match_id.eq.${matchId}`)
    .order("updated_at", { ascending: false })
    .limit(1);

  if (error) {
    throw error;
  }

  const existingRow = existingRows?.[0] ?? null;
  if (!existingRow) {
    throw new Error("No imported match found for the provided match ID.");
  }

  if ((existingRow.status === "published" || existingRow.status === "approved") && !options?.confirmPublished) {
    throw new Error("This match is published. Pass confirmPublished=true to reset it.");
  }

  const before = await getCompetitionMatch(existingRow.id);
  await deleteCompetitionMatch(existingRow.id);
  return { id: existingRow.id, before };
}
