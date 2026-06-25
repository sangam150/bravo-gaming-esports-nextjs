import "server-only";

import { getCompetitionMatch, saveCompetitionMatch } from "./competition-relational";
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
  forceRefetch?: boolean;
};

type PendingImportCachePayload = {
  context: PubgImportContext;
  preview: PubgImportPreview;
  sourceMatchId: string;
  raw?: unknown;
};

type ImportLifecycleState =
  | "queued"
  | "fetching"
  | "fetched"
  | "normalized"
  | "draft"
  | "published"
  | "failed"
  | "repaired"
  | "reset";

function normalizePendingImportStatus(
  state: ImportLifecycleState
): TablesInsert<"pending_imports">["status"] {
  return state;
}

function buildLifecycleEntry(state: ImportLifecycleState, details?: Record<string, unknown>) {
  return {
    state,
    at: new Date().toISOString(),
    ...(details ? { details } : {}),
  };
}

async function appendPendingImportLifecycle(
  matchId: string,
  state: ImportLifecycleState,
  options?: {
    context?: PubgImportContext;
    sourceMatchId?: string;
    preview?: PubgImportPreview;
    raw?: unknown;
    details?: Record<string, unknown>;
  }
) {
  const client = getSupabaseServiceRoleClient();
  const existing = await getLatestPendingImportCache(matchId);
  const existingNormalized = readJsonObject(existing?.normalized_json) ?? {};
  const existingLifecycle = Array.isArray(existingNormalized.lifecycle)
    ? [...(existingNormalized.lifecycle as Json[])]
    : [];

  const normalizedJson = (sanitizeJsonValue({
    ...(existingNormalized as Record<string, unknown>),
    context: options?.context ?? existingNormalized.context,
    sourceMatchId: options?.sourceMatchId ?? existingNormalized.sourceMatchId ?? matchId,
    preview: options?.preview ?? existingNormalized.preview,
    errorMessage: options?.details?.errorMessage ?? existingNormalized.errorMessage,
    retryCount:
      state === "failed"
        ? (typeof existingNormalized.retryCount === "number" ? Number(existingNormalized.retryCount) : 0) + 1
        : typeof existingNormalized.retryCount === "number"
          ? Number(existingNormalized.retryCount)
          : 0,
    lifecycle: [...existingLifecycle, buildLifecycleEntry(state, options?.details)],
  }) ?? null) as Json | null;

  const payload: TablesInsert<"pending_imports"> = {
    id: existing?.id,
    season_id: options?.context?.seasonId ?? existing?.season_id ?? null,
    day_id: options?.context?.scrimId ?? existing?.day_id ?? null,
    match_id: matchId,
    external_match_id:
      options?.sourceMatchId ??
      (typeof existingNormalized.sourceMatchId === "string" ? existingNormalized.sourceMatchId : null),
    match_number: options?.preview?.matchNumber ?? existing?.match_number ?? null,
    map: options?.preview?.summary.mapName ?? existing?.map ?? null,
    match_date: options?.preview?.summary.createdAt ?? existing?.match_date ?? null,
    raw_json: (sanitizeJsonValue(options?.raw ?? existing?.raw_json ?? null) ?? null) as Json | null,
    raw_json_id: matchId,
    normalized_json: normalizedJson,
    status: normalizePendingImportStatus(state),
    source: state === "fetching" ? "pubg_api" : existing?.source ?? "pubg_api",
    normalized_at:
      state === "normalized" || state === "draft" || state === "published" || state === "repaired"
        ? new Date().toISOString()
        : existing?.normalized_at ?? null,
    published_at: state === "published" ? new Date().toISOString() : existing?.published_at ?? null,
    error_message:
      typeof options?.details?.errorMessage === "string"
        ? options.details.errorMessage
        : existing?.error_message ?? null,
    retry_count:
      state === "failed"
        ? (existing?.retry_count ?? 0) + 1
        : existing?.retry_count ?? 0,
    created_by: existing?.created_by ?? null,
    updated_at: new Date().toISOString(),
  };

  const { error } = await client.from("pending_imports").upsert(payload, { onConflict: "id" });
  if (error) {
    throw error;
  }
}

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
  await appendPendingImportLifecycle(payload.preview.matchId, "queued", {
    context: payload.context,
    sourceMatchId: payload.sourceMatchId,
    preview: payload.preview,
    raw: payload.raw ?? payload.preview.summary,
  });
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
  if (typeof previewValue.matchId !== "string") return null;
  if (!previewValue.summary || typeof previewValue.summary !== "object") return null;

  const contextValue = readJsonObject((normalized.context as Json | undefined) ?? null) ?? {};

  const sourceMatchIdValue = normalized.sourceMatchId;
  const sourceMatchId =
    typeof sourceMatchIdValue === "string" && sourceMatchIdValue.trim().length > 0
      ? sourceMatchIdValue.trim()
      : cacheRow.match_id;

  return {
    context: contextValue as PubgImportContext,
    sourceMatchId,
    preview: previewValue as unknown as PubgImportPreview,
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
  const publish = options?.publish !== false;

  const results: PubgBulkImportResultItem[] = [];

  const previewMap = new Map<string, PubgImportPreview>();
  let importContext: PubgImportContext = {};

  const toFetch: string[] = [];
  for (const matchId of normalizedMatchIds) {
    await appendPendingImportLifecycle(matchId, "queued", {
      context: {
        seasonId: options?.seasonId,
        seasonDayNumber: options?.seasonDayNumber,
        tournamentId: options?.tournamentId,
        scrimId: options?.scrimId,
      },
      details: {
        source: options?.forceRefetch ? "pubg_api_forced" : "auto",
      },
    });

    if (options?.forceRefetch) {
      toFetch.push(matchId);
      continue;
    }

    const cached = parseCachedPreview(await getLatestPendingImportCache(matchId));
    if (cached?.preview) {
      previewMap.set(matchId, cached.preview);
      importContext = {
        ...importContext,
        ...cached.context,
      };
      await appendPendingImportLifecycle(matchId, "fetching", {
        context: cached.context,
        preview: cached.preview,
        details: { source: "cached" },
      });
      await appendPendingImportLifecycle(matchId, "fetched", {
        context: cached.context,
        preview: cached.preview,
        details: { source: "cached" },
      });
      await appendPendingImportLifecycle(matchId, "normalized", {
        context: cached.context,
        preview: cached.preview,
        details: { source: "cached" },
      });
      continue;
    }

    toFetch.push(matchId);
  }

  if (toFetch.length > 0) {
    for (const matchId of toFetch) {
      await appendPendingImportLifecycle(matchId, "fetching", {
        context: {
          seasonId: options?.seasonId,
          seasonDayNumber: options?.seasonDayNumber,
          tournamentId: options?.tournamentId,
          scrimId: options?.scrimId,
        },
        details: { source: "pubg_api" },
      });
    }

    const fetchedPreviewResult: PubgBulkPreviewResult = await previewPubgMatches(toFetch, options);
    importContext = { ...importContext, ...fetchedPreviewResult.context };

    for (const preview of fetchedPreviewResult.previews) {
      previewMap.set(preview.matchId, preview);
      await appendPendingImportLifecycle(preview.matchId, "fetched", {
        context: fetchedPreviewResult.context,
        preview,
        details: { source: "pubg_api" },
      });
      await appendPendingImportLifecycle(preview.matchId, "normalized", {
        context: fetchedPreviewResult.context,
        preview,
        details: { source: "pubg_api" },
      });
    }

    for (const previewError of fetchedPreviewResult.errors) {
      await appendPendingImportLifecycle(previewError.matchId, "failed", {
        context: fetchedPreviewResult.context,
        details: {
          code: previewError.code,
          errorMessage: previewError.error,
        },
      });
      results.push({
        matchId: previewError.matchId,
        success: false,
        error: previewError.error,
        code: previewError.code,
        alreadyImported: previewError.alreadyImported,
      });
    }
  }

  for (const requestedMatchId of normalizedMatchIds) {
    const preview = previewMap.get(requestedMatchId);
    if (!preview) continue;

    try {
      const edit = matchEdits.get(preview.matchId);
      const normalized = applyEdit(preview, edit);
      const existingDuplicateId = await findExistingDuplicate(
        importContext.tournamentId,
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
        tournamentId: importContext.tournamentId,
        scrimId: importContext.scrimId,
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

      await appendPendingImportLifecycle(normalized.matchId, publish ? "published" : "draft", {
        context: importContext,
        preview,
        sourceMatchId: preview.matchId,
        details: {
          duplicateMode,
          alreadyImported: Boolean(existingDuplicateId),
        },
      });

      results.push({
        matchId: normalized.matchId,
        success: true,
        alreadyImported: Boolean(existingDuplicateId),
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      await appendPendingImportLifecycle(preview.matchId, "failed", {
        context: importContext,
        preview,
        details: { errorMessage: message },
      });
      results.push({
        matchId: preview.matchId,
        success: false,
        error: message,
      });
    }
  }

  return {
    context: importContext,
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

  const cache = parseCachedPreview(await getLatestPendingImportCache(matchId));
  if (!cache) {
    throw new Error("No cached preview found for this match. Re-preview the match first.");
  }

  const currentMatch = await getCompetitionMatch(existingRow.id);
  const currentPublished = currentMatch?.status === "published";
  const nextPublished =
    typeof options?.publish === "boolean"
      ? options.publish
      : currentPublished;

  if (currentPublished && typeof options?.publish === "boolean" && options.publish !== currentPublished && !options?.forcePublished) {
    throw new Error("This operation changes published state. Set forcePublished=true to confirm.");
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
      status: nextPublished ? "published" : "draft",
      playedAt: cleanString(cache.preview.summary.createdAt),
      dataSource: "pubg_api",
      teamResults: normalizeTeamResults(cache.preview.teamResults),
      playerResults: normalizePlayerResults(cache.preview.playerResults),
    },
    { publish: nextPublished }
  );

  await appendPendingImportLifecycle(matchId, "repaired", {
    context: cache.context,
    preview: cache.preview,
    sourceMatchId: cache.sourceMatchId,
    details: {
      publish: nextPublished,
    },
  });

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

  const { error: deleteTeamResultsError } = await client
    .from("match_team_results")
    .delete()
    .eq("match_id", existingRow.id);
  if (deleteTeamResultsError) {
    throw deleteTeamResultsError;
  }

  const { error: deletePlayerResultsError } = await client
    .from("match_player_results")
    .delete()
    .eq("match_id", existingRow.id);
  if (deletePlayerResultsError) {
    throw deletePlayerResultsError;
  }

  const now = new Date().toISOString();
  const { error: updateMatchError } = await client
    .from("matches")
    .update({
      status: "failed",
      updated_at: now,
    })
    .eq("id", existingRow.id);
  if (updateMatchError) {
    throw updateMatchError;
  }

  const cache = parseCachedPreview(await getLatestPendingImportCache(matchId));
  await appendPendingImportLifecycle(matchId, "reset", {
    context: cache?.context,
    preview: cache?.preview,
    sourceMatchId: cache?.sourceMatchId,
  });

  return { id: existingRow.id, before };
}
