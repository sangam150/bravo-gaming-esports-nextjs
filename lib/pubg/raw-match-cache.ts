import "server-only";

import { sanitizeJsonValue } from "@/lib/json-utils";
import { getSupabaseServiceRoleClient } from "@/lib/supabase/service-role-client";
import type { PubgImportPreviewSource } from "@/lib/types";
import type { Json, TablesInsert } from "@/types/database.types";
import { DEFAULT_PUBG_SHARD, fetchPubgMatch } from "./pubg-api";

type RawPubgMatchResult = {
  matchId: string;
  raw: unknown;
  shard: string;
  source: PubgImportPreviewSource;
};

function toNullableUuid(value?: string | null) {
  if (!value) {
    return null;
  }

  const normalizedValue = value.trim();
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(normalizedValue) ? normalizedValue : null;
}

export async function getRawPubgMatch(matchId: string) {
  const client = getSupabaseServiceRoleClient();
  const { data, error } = await client
    .from("pending_imports")
    .select("raw_json")
    .eq("match_id", matchId)
    .not("raw_json", "is", null)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data?.raw_json ?? null;
}

async function saveRawPubgMatch(matchId: string, shard: string, rawJson: unknown) {
  const client = getSupabaseServiceRoleClient();
  const { data: existing, error: existingError } = await client
    .from("pending_imports")
    .select("*")
    .eq("match_id", matchId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingError) {
    throw existingError;
  }

  const now = new Date().toISOString();
  const payload: TablesInsert<"pending_imports"> = {
    id: existing?.id,
    approved_at: existing?.approved_at ?? null,
    approved_by: existing?.approved_by ?? null,
    created_at: existing?.created_at ?? now,
    created_by: existing?.created_by ?? null,
    day_id: toNullableUuid(existing?.day_id),
    error_message: existing?.error_message ?? null,
    external_match_id: existing?.external_match_id ?? matchId,
    map: existing?.map ?? null,
    match_date: existing?.match_date ?? null,
    match_id: matchId,
    match_number: existing?.match_number ?? null,
    normalized_at: existing?.normalized_at ?? null,
    normalized_json: existing?.normalized_json ?? null,
    published_at: existing?.published_at ?? null,
    raw_json: (sanitizeJsonValue(rawJson) ?? null) as Json | null,
    raw_json_id: matchId,
    retry_count: existing?.retry_count ?? 0,
    season_id: toNullableUuid(existing?.season_id),
    source: `pubg_api:${shard}`,
    status: existing?.status ?? "fetched",
    updated_at: now,
  };

  const { error } = await client.from("pending_imports").upsert(payload, { onConflict: "id" });
  if (error) {
    throw error;
  }

  return payload.raw_json;
}

export async function ensureRawPubgMatch(matchId: string, shard = DEFAULT_PUBG_SHARD): Promise<RawPubgMatchResult> {
  const existingRaw = await getRawPubgMatch(matchId);
  if (existingRaw) {
    return {
      matchId,
      raw: existingRaw,
      shard,
      source: "db_cache",
    };
  }

  const raw = await fetchPubgMatch(matchId, shard);
  await saveRawPubgMatch(matchId, shard, raw);

  return {
    matchId,
    raw,
    shard,
    source: "pubg_api",
  };
}

export async function refetchRawPubgMatch(matchId: string, shard = DEFAULT_PUBG_SHARD): Promise<RawPubgMatchResult> {
  const raw = await fetchPubgMatch(matchId, shard);
  await saveRawPubgMatch(matchId, shard, raw);

  return {
    matchId,
    raw,
    shard,
    source: "pubg_api",
  };
}
