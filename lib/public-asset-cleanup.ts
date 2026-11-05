import "server-only";

import { getSupabaseServiceRoleClient } from "@/lib/supabase/service-role-client";
import { isImageUploadType, getUploadVisibility, normalizeUploadType, type UploadType } from "@/lib/upload-config";
import {
  deleteFromStorageByUrl,
  deletePublicObjectByKey,
  getManagedPublicObjectKeyFromUrl,
  getManagedUploadRecord,
  normalizeManagedPublicObjectKey,
} from "@/lib/r2/storage";
import { deleteUploadRecord } from "@/lib/upload-records";
import { resolvePublicAssetUrl } from "@/lib/public-asset-url";

const REFERENCE_SCAN_PAGE_SIZE = 500;
const ABANDONED_ADMIN_UPLOAD_SCAN_PAGE_SIZE = 25;
const ABANDONED_ADMIN_UPLOAD_MINIMUM_AGE_MS = 24 * 60 * 60 * 1_000;
const ABANDONED_ADMIN_UPLOAD_TYPES = [
  "announcement_image",
  "coach_avatar",
  "hero_slide_asset",
  "match_media",
  "match_screenshot",
  "media_asset",
  "player_avatar",
  "player_photo",
  "result_screenshot",
  "scoreboard_image",
  "sponsor_asset",
  "sponsor_logo",
  "stream_thumbnail",
  "tournament_banner",
] as const satisfies readonly UploadType[];

type AssetReference = {
  id: string;
  source: string;
};

type PageResult = {
  data: readonly unknown[] | null;
  error: unknown;
};

type AssetMatcher = (value: unknown) => boolean;

export type ManagedPublicAssetOwnerType =
  "homepage_content" | "match" | "news_article" | "platform_event" | "sponsor" | "tournament" | "video" | "broadcast";

export type ManagedPublicAssetClaimResult = {
  claimed: boolean;
  objectKey: string | null;
  status: "already_claimed" | "ambiguous" | "claimed" | "conflict" | "ineligible" | "not_found" | "not_managed" | "preserved";
  uploadId: string | null;
};

export type ManagedAssetCleanupResult = {
  deleted: boolean;
  reference: AssetReference | null;
  referenced: boolean;
};

export class ManagedAssetCleanupError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(message: string, options: { code: string; status: number }) {
    super(message);
    this.name = "ManagedAssetCleanupError";
    this.code = options.code;
    this.status = options.status;
  }
}

function readRowId(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return "unknown";
  const id = (value as { id?: unknown }).id;
  return typeof id === "string" && id.trim() ? id : "unknown";
}

function createAssetMatcher(url: string, objectKey?: string | null): AssetMatcher {
  const normalizedUrl = url.trim();
  const normalizedObjectKey = objectKey ? normalizeManagedPublicObjectKey(objectKey) : getManagedPublicObjectKeyFromUrl(normalizedUrl);
  const canonicalUrl = resolvePublicAssetUrl(normalizedUrl);
  const canonicalProxyUrl = normalizedObjectKey ? `/api/uploads/r2?key=${encodeURIComponent(normalizedObjectKey)}` : null;

  function matchesString(value: string) {
    const candidate = value.trim();
    if (!candidate) return false;
    if (candidate === normalizedUrl || candidate.includes(normalizedUrl)) return true;
    if (normalizedObjectKey && (candidate === normalizedObjectKey || candidate.includes(normalizedObjectKey))) return true;

    const candidateObjectKey = getManagedPublicObjectKeyFromUrl(candidate);
    if (normalizedObjectKey && candidateObjectKey === normalizedObjectKey) return true;

    const candidateCanonicalUrl = resolvePublicAssetUrl(candidate);
    return Boolean(
      candidateCanonicalUrl &&
      ((canonicalUrl && candidateCanonicalUrl === canonicalUrl) || (canonicalProxyUrl && candidateCanonicalUrl === canonicalProxyUrl)),
    );
  }

  function matches(value: unknown): boolean {
    if (typeof value === "string") return matchesString(value);
    if (Array.isArray(value)) return value.some(matches);
    if (!value || typeof value !== "object") return false;
    return Object.values(value as Record<string, unknown>).some(matches);
  }

  return matches;
}

export function assetValueReferencesPublicAsset(value: unknown, url: string, objectKey?: string | null) {
  return createAssetMatcher(url, objectKey)(value);
}

function toNullableUuid(value?: string | null) {
  if (!value) return null;
  const normalizedValue = value.trim();
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(normalizedValue) ? normalizedValue : null;
}

/**
 * Reclassifies one exact managed public image after its owning entity has been
 * saved. Ambiguous, stale, or ineligible records are deliberately preserved.
 */
export async function claimStagedAdminPublicAsset(input: {
  relatedId?: string | null;
  relatedType: ManagedPublicAssetOwnerType;
  url?: string | null;
}): Promise<ManagedPublicAssetClaimResult> {
  const normalizedUrl = input.url?.trim() ?? "";
  const objectKey = normalizedUrl ? getManagedPublicObjectKeyFromUrl(normalizedUrl) : null;
  if (!objectKey) {
    return { claimed: false, objectKey: null, status: "not_managed", uploadId: null };
  }

  try {
    const client = getSupabaseServiceRoleClient();
    const { data, error } = await client
      .from("uploads")
      .select("id,file_url,file_path,file_type,related_type,related_id")
      .eq("file_path", objectKey)
      .limit(2);
    if (error) {
      return { claimed: false, objectKey, status: "preserved", uploadId: null };
    }

    const matchingRows = data ?? [];
    if (matchingRows.length === 0) {
      return { claimed: false, objectKey, status: "not_found", uploadId: null };
    }
    if (matchingRows.length !== 1) {
      return { claimed: false, objectKey, status: "ambiguous", uploadId: null };
    }

    const upload = matchingRows[0];
    if (upload.file_path !== objectKey || getManagedPublicObjectKeyFromUrl(upload.file_url) !== objectKey) {
      return { claimed: false, objectKey, status: "ineligible", uploadId: upload.id };
    }
    const fileType = normalizeUploadType(upload.file_type);
    if (!fileType || !isImageUploadType(fileType) || getUploadVisibility(fileType) !== "public") {
      return { claimed: false, objectKey, status: "ineligible", uploadId: upload.id };
    }

    const relatedId = toNullableUuid(input.relatedId);
    if (upload.related_type === input.relatedType && upload.related_id === relatedId) {
      return { claimed: true, objectKey, status: "already_claimed", uploadId: upload.id };
    }
    if (upload.related_type !== "admin_upload") {
      return { claimed: false, objectKey, status: "conflict", uploadId: upload.id };
    }

    let claimQuery = client
      .from("uploads")
      .update({ related_id: relatedId, related_type: input.relatedType })
      .eq("id", upload.id)
      .eq("file_path", objectKey)
      .eq("file_url", upload.file_url)
      .eq("related_type", "admin_upload");
    claimQuery = upload.related_id === null ? claimQuery.is("related_id", null) : claimQuery.eq("related_id", upload.related_id);
    const { data: claimedUpload, error: claimError } = await claimQuery.select("id,file_path,related_type,related_id").maybeSingle();
    if (claimError) {
      return { claimed: false, objectKey, status: "preserved", uploadId: upload.id };
    }
    if (
      !claimedUpload ||
      claimedUpload.file_path !== objectKey ||
      claimedUpload.related_type !== input.relatedType ||
      claimedUpload.related_id !== relatedId
    ) {
      return { claimed: false, objectKey, status: "conflict", uploadId: upload.id };
    }

    return { claimed: true, objectKey, status: "claimed", uploadId: upload.id };
  } catch {
    return { claimed: false, objectKey, status: "preserved", uploadId: null };
  }
}

export async function claimStagedAdminPublicAssets(input: {
  relatedId?: string | null;
  relatedType: ManagedPublicAssetOwnerType;
  urls: readonly (string | null | undefined)[];
}) {
  const urls = [...new Set(input.urls.map((url) => url?.trim()).filter((url): url is string => Boolean(url)))];
  return Promise.all(
    urls.map((url) =>
      claimStagedAdminPublicAsset({
        relatedId: input.relatedId,
        relatedType: input.relatedType,
        url,
      }),
    ),
  );
}

async function findReferenceInPages(source: string, loadPage: (from: number, to: number) => Promise<PageResult>, matches: AssetMatcher) {
  for (let from = 0; ; from += REFERENCE_SCAN_PAGE_SIZE) {
    const page = await loadPage(from, from + REFERENCE_SCAN_PAGE_SIZE - 1);
    if (page.error) throw page.error;
    const rows = page.data ?? [];
    const match = rows.find(matches);
    if (match) {
      return {
        id: readRowId(match),
        source,
      } satisfies AssetReference;
    }
    if (rows.length < REFERENCE_SCAN_PAGE_SIZE) return null;
  }
}

export async function findPublicAssetReference(url: string, objectKey?: string | null) {
  const client = getSupabaseServiceRoleClient();
  const matches = createAssetMatcher(url, objectKey);
  const scanners: Array<() => Promise<AssetReference | null>> = [
    () =>
      findReferenceInPages(
        "app_documents",
        async (from, to) => {
          const { data, error } = await client.from("app_documents").select("id,data").range(from, to);
          return { data, error };
        },
        matches,
      ),
    () =>
      findReferenceInPages(
        "settings",
        async (from, to) => {
          const { data, error } = await client.from("settings").select("id,value").range(from, to);
          return { data, error };
        },
        matches,
      ),
    () =>
      findReferenceInPages(
        "events",
        async (from, to) => {
          const { data, error } = await client.from("events").select("id,banner_url").range(from, to);
          return { data, error };
        },
        matches,
      ),
    () =>
      findReferenceInPages(
        "matches",
        async (from, to) => {
          const { data, error } = await client
            .from("matches")
            .select("id,result_image_url,scoreboard_image_url,screenshot_urls")
            .range(from, to);
          return { data, error };
        },
        matches,
      ),
    () =>
      findReferenceInPages(
        "players",
        async (from, to) => {
          const { data, error } = await client.from("players").select("id,avatar_url,photo_url").range(from, to);
          return { data, error };
        },
        matches,
      ),
    () =>
      findReferenceInPages(
        "sponsors",
        async (from, to) => {
          const { data, error } = await client.from("sponsors").select("id,logo_url").range(from, to);
          return { data, error };
        },
        matches,
      ),
    () =>
      findReferenceInPages(
        "teams",
        async (from, to) => {
          const { data, error } = await client.from("teams").select("id,logo_url,source_metadata").range(from, to);
          return { data, error };
        },
        matches,
      ),
    () =>
      findReferenceInPages(
        "videos",
        async (from, to) => {
          const { data, error } = await client.from("videos").select("id,image_url,thumbnail_url").range(from, to);
          return { data, error };
        },
        matches,
      ),
  ];

  for (const scan of scanners) {
    const reference = await scan();
    if (reference) return reference;
  }
  return null;
}

async function deleteUploadRowsForPublicAsset(url: string, objectKey: string | null) {
  const client = getSupabaseServiceRoleClient();
  const ids = new Set<string>();
  const byUrl = await client.from("uploads").select("id").eq("file_url", url);
  if (byUrl.error) throw byUrl.error;
  for (const row of byUrl.data ?? []) ids.add(row.id);

  if (objectKey) {
    const byPath = await client.from("uploads").select("id").eq("file_path", objectKey);
    if (byPath.error) throw byPath.error;
    for (const row of byPath.data ?? []) ids.add(row.id);
  }

  if (ids.size === 0) return;
  const { error } = await client
    .from("uploads")
    .delete()
    .in("id", [...ids]);
  if (error) throw error;
}

export async function cleanupUnreferencedPublicAssetByUrl(url: string): Promise<ManagedAssetCleanupResult> {
  const normalizedUrl = url.trim();
  if (!normalizedUrl) {
    return { deleted: false, reference: null, referenced: false };
  }
  const objectKey = getManagedPublicObjectKeyFromUrl(normalizedUrl);
  const reference = await findPublicAssetReference(normalizedUrl, objectKey);
  if (reference) {
    return { deleted: false, reference, referenced: true };
  }

  const deleted = await deleteFromStorageByUrl(normalizedUrl);
  if (!deleted) {
    return { deleted: false, reference: null, referenced: false };
  }
  await deleteUploadRowsForPublicAsset(normalizedUrl, objectKey);
  return { deleted: true, reference: null, referenced: false };
}

export async function cleanupStagedAdminUpload(input: { objectKey: string; uploadId: string }): Promise<ManagedAssetCleanupResult> {
  const objectKey = normalizeManagedPublicObjectKey(input.objectKey);
  if (!objectKey || !input.uploadId.trim()) {
    throw new ManagedAssetCleanupError("A managed upload ID and exact object key are required.", {
      code: "invalid_staged_upload_cleanup",
      status: 400,
    });
  }

  const upload = await getManagedUploadRecord(input.uploadId.trim());
  const fileType = normalizeUploadType(upload?.fileType);
  if (
    !upload ||
    upload.id !== input.uploadId.trim() ||
    upload.filePath !== objectKey ||
    upload.relatedType !== "admin_upload" ||
    !fileType ||
    !isImageUploadType(fileType) ||
    getUploadVisibility(fileType) !== "public"
  ) {
    throw new ManagedAssetCleanupError("The selected staged upload does not match a removable managed public image.", {
      code: "staged_upload_cleanup_mismatch",
      status: 409,
    });
  }

  const reference = await findPublicAssetReference(upload.url, objectKey);
  if (reference) {
    return { deleted: false, reference, referenced: true };
  }

  await deletePublicObjectByKey(objectKey);
  await deleteUploadRecord(upload.id);
  return { deleted: true, reference: null, referenced: false };
}

export async function cleanupOneAbandonedAdminUpload(excludeUploadId?: string) {
  const client = getSupabaseServiceRoleClient();
  const cutoff = new Date(Date.now() - ABANDONED_ADMIN_UPLOAD_MINIMUM_AGE_MS).toISOString();
  let lastReferencedResult: ManagedAssetCleanupResult | null = null;
  for (let from = 0; ; from += ABANDONED_ADMIN_UPLOAD_SCAN_PAGE_SIZE) {
    let query = client
      .from("uploads")
      .select("id,file_path")
      .eq("related_type", "admin_upload")
      .in("file_type", [...ABANDONED_ADMIN_UPLOAD_TYPES])
      .lt("created_at", cutoff)
      .order("created_at", { ascending: true })
      .order("id", { ascending: true })
      .range(from, from + ABANDONED_ADMIN_UPLOAD_SCAN_PAGE_SIZE - 1);
    if (excludeUploadId) query = query.neq("id", excludeUploadId);

    const { data, error } = await query;
    if (error) throw error;
    for (const candidate of data ?? []) {
      if (!candidate.file_path) continue;
      try {
        const result = await cleanupStagedAdminUpload({
          objectKey: candidate.file_path,
          uploadId: candidate.id,
        });
        if (result.deleted) return result;
        if (result.referenced) lastReferencedResult = result;
      } catch (cleanupError) {
        if (!(cleanupError instanceof ManagedAssetCleanupError)) throw cleanupError;
      }
    }
    if ((data ?? []).length < ABANDONED_ADMIN_UPLOAD_SCAN_PAGE_SIZE) break;
  }

  return lastReferencedResult ?? { deleted: false, reference: null, referenced: false };
}
