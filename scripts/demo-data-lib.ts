import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { loadEnvConfig } from "@next/env";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  DeleteObjectsCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

loadEnvConfig(process.cwd());

export const DEMO_SEED_TAG = "bravo_demo_seed_2026";
export const DEMO_SOURCE = "demo_seed";
export const DEMO_R2_PREFIX = `demo/${DEMO_SEED_TAG}`;
export const DEMO_MANIFEST_PATH = path.resolve(process.cwd(), "qa-artifacts", "demo-seed-records.json");

const SINGLETON_DOCUMENTS = [
  { collectionName: "homepageContent", id: "main" },
  { collectionName: "siteStats", id: "main" },
] as const;

const DEMO_DOCUMENT_COLLECTIONS = [
  "announcements",
  "homepageContent",
  "newsArticles",
  "scrims",
  "siteStats",
  "sponsors",
  "videos",
] as const;

type JsonObject = Record<string, unknown>;
type SupabaseAdminClient = SupabaseClient<any>;

type AppDocumentRow = {
  collection_name: string;
  id: string;
  data: JsonObject | null;
  created_at: string;
  updated_at: string;
};

type AppDocumentBackup = {
  collectionName: string;
  id: string;
  data: JsonObject;
  createdAt: string;
  updatedAt: string;
};

type R2Config = {
  client: S3Client;
  publicBaseUrl: string;
  publicBucketName: string;
  publicDeliveryMode: "direct" | "proxy";
};

export type DemoManifest = {
  createdAt: string;
  demoSeedTag: string;
  singletonBackups: {
    homepageContent: AppDocumentBackup | null;
    siteStats: AppDocumentBackup | null;
  };
  uploadedObjectKeys: string[];
};

export type DemoCleanupSummary = {
  appDocuments: number;
  days: number;
  eventTeams: number;
  events: number;
  matches: number;
  matchPlayerResults: number;
  matchTeamResults: number;
  players: number;
  removedObjectKeys: number;
  seasons: number;
  teamRosterHistory: number;
  teams: number;
  uploads: number;
};

export type DemoUploadedAsset = {
  contentType: string;
  fileName: string;
  key: string;
  sizeBytes: number;
  url: string;
};

function getRequiredEnvironmentValue(name: string) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function trimSlashes(value: string) {
  return value.replace(/^\/+|\/+$/g, "");
}

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/g, "");
}

function isObject(value: unknown): value is JsonObject {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

export function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function formatDateOnly(value: Date) {
  return value.toISOString().slice(0, 10);
}

export function addDays(value: Date, amount: number) {
  const nextValue = new Date(value);
  nextValue.setUTCDate(nextValue.getUTCDate() + amount);
  return nextValue;
}

export function buildUuid(prefix: string, index: number) {
  return `${prefix}-0000-4000-8000-${index.toString(16).padStart(12, "0")}`;
}

export function getSupabaseAdminClient() {
  return createClient<any>(
    getRequiredEnvironmentValue("NEXT_PUBLIC_SUPABASE_URL"),
    process.env.SUPABASE_SECRET_KEY?.trim() || getRequiredEnvironmentValue("SUPABASE_SERVICE_ROLE_KEY"),
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

export function getOptionalR2Config(): R2Config | null {
  const accountId = process.env.R2_ACCOUNT_ID?.trim();
  const accessKeyId = process.env.R2_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY?.trim();
  const publicBucketName = process.env.R2_BUCKET_NAME?.trim();
  const publicBaseUrl = process.env.R2_PUBLIC_BASE_URL?.trim();

  if (!accountId || !accessKeyId || !secretAccessKey || !publicBucketName || !publicBaseUrl) {
    return null;
  }

  return {
    client: new S3Client({
      credentials: { accessKeyId, secretAccessKey },
      endpoint: trimTrailingSlash(
        process.env.R2_ENDPOINT?.trim() || `https://${accountId}.r2.cloudflarestorage.com`
      ),
      region: "auto",
    }),
    publicBaseUrl: trimTrailingSlash(publicBaseUrl),
    publicBucketName,
    publicDeliveryMode:
      process.env.R2_PUBLIC_DELIVERY_MODE?.trim().toLowerCase() === "proxy" ? "proxy" : "direct",
  };
}

export function buildPublicAssetUrl(r2: R2Config, objectKey: string) {
  const normalizedObjectKey = trimSlashes(objectKey);
  if (r2.publicDeliveryMode === "proxy") {
    return `/api/uploads/r2?key=${encodeURIComponent(normalizedObjectKey)}`;
  }

  return `${r2.publicBaseUrl}/${normalizedObjectKey}`;
}

function isDemoDocumentPayload(payload: unknown) {
  if (!isObject(payload)) {
    return false;
  }

  return (
    payload.demo_seed_tag === DEMO_SEED_TAG ||
    payload.source === DEMO_SOURCE ||
    payload.is_demo === true
  );
}

function mapDocumentBackup(row: AppDocumentRow | null): AppDocumentBackup | null {
  if (!row || !isObject(row.data) || isDemoDocumentPayload(row.data)) {
    return null;
  }

  return {
    collectionName: row.collection_name,
    id: row.id,
    data: row.data,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function readDemoManifest(): Promise<DemoManifest | null> {
  try {
    const rawValue = await readFile(DEMO_MANIFEST_PATH, "utf8");
    return JSON.parse(rawValue) as DemoManifest;
  } catch {
    return null;
  }
}

export async function writeDemoManifest(manifest: DemoManifest) {
  await mkdir(path.dirname(DEMO_MANIFEST_PATH), { recursive: true });
  await writeFile(DEMO_MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
}

export async function deleteDemoManifest() {
  await rm(DEMO_MANIFEST_PATH, { force: true });
}

export async function captureSingletonBackups(client: SupabaseAdminClient) {
  const backups: DemoManifest["singletonBackups"] = {
    homepageContent: null,
    siteStats: null,
  };

  for (const documentRef of SINGLETON_DOCUMENTS) {
    const { data, error } = await client
      .from("app_documents")
      .select("collection_name,id,data,created_at,updated_at")
      .eq("collection_name", documentRef.collectionName)
      .eq("id", documentRef.id)
      .maybeSingle<AppDocumentRow>();

    if (error) {
      throw error;
    }

    if (documentRef.collectionName === "homepageContent") {
      backups.homepageContent = mapDocumentBackup(data ?? null);
    } else if (documentRef.collectionName === "siteStats") {
      backups.siteStats = mapDocumentBackup(data ?? null);
    }
  }

  return backups;
}

export async function upsertRowsInChunks(
  client: SupabaseAdminClient,
  table: string,
  rows: JsonObject[],
  options: { chunkSize?: number; onConflict?: string } = {}
) {
  if (rows.length === 0) {
    return;
  }

  const chunkSize = options.chunkSize ?? 200;
  for (let index = 0; index < rows.length; index += chunkSize) {
    const chunk = rows.slice(index, index + chunkSize);
    const query = client.from(table).upsert(
      chunk,
      options.onConflict ? { onConflict: options.onConflict } : undefined
    );

    const { error } = await query;
    if (error) {
      throw error;
    }
  }
}

export async function upsertAppDocuments(
  client: SupabaseAdminClient,
  rows: Array<{ collectionName: string; id: string; data: JsonObject; createdAt?: string; updatedAt?: string }>
) {
  if (rows.length === 0) {
    return;
  }

  const now = new Date().toISOString();
  await upsertRowsInChunks(
    client,
    "app_documents",
    rows.map((row) => ({
      collection_name: row.collectionName,
      id: row.id,
      data: row.data,
      created_at: row.createdAt ?? now,
      updated_at: row.updatedAt ?? now,
    })),
    { onConflict: "collection_name,id" }
  );
}

async function listDemoAppDocuments(client: SupabaseAdminClient) {
  const { data, error } = await client
    .from("app_documents")
    .select("collection_name,id,data,created_at,updated_at")
    .in("collection_name", [...DEMO_DOCUMENT_COLLECTIONS])
    .limit(1000);

  if (error) {
    throw error;
  }

  return ((data ?? []) as AppDocumentRow[]).filter((row) => isDemoDocumentPayload(row.data));
}

async function restoreSingletonDocument(
  client: SupabaseAdminClient,
  backup: AppDocumentBackup | null,
  collectionName: string
) {
  if (backup) {
    await upsertAppDocuments(client, [
      {
        collectionName: backup.collectionName,
        id: backup.id,
        data: backup.data,
        createdAt: backup.createdAt,
        updatedAt: backup.updatedAt,
      },
    ]);
    return;
  }

  const { data, error } = await client
    .from("app_documents")
    .select("collection_name,id,data")
    .eq("collection_name", collectionName)
    .eq("id", "main")
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (data && isDemoDocumentPayload((data as AppDocumentRow).data)) {
    const { error: deleteError } = await client
      .from("app_documents")
      .delete()
      .eq("collection_name", collectionName)
      .eq("id", "main");

    if (deleteError) {
      throw deleteError;
    }
  }
}

async function countRowsByDemoTag(client: SupabaseAdminClient, table: string) {
  const { count, error } = await client
    .from(table)
    .select("id", { count: "exact", head: true })
    .eq("demo_seed_tag", DEMO_SEED_TAG);

  if (error) {
    throw error;
  }

  return count ?? 0;
}

async function deleteRowsByDemoTag(client: SupabaseAdminClient, table: string) {
  const count = await countRowsByDemoTag(client, table);
  if (count === 0) {
    return 0;
  }

  const { error } = await client.from(table).delete().eq("demo_seed_tag", DEMO_SEED_TAG);
  if (error) {
    throw error;
  }

  return count;
}

async function listR2ObjectKeysByPrefix(r2: R2Config | null, prefix: string) {
  if (!r2) {
    return [];
  }

  const objectKeys: string[] = [];
  let continuationToken: string | undefined;

  do {
    const response = await r2.client.send(
      new ListObjectsV2Command({
        Bucket: r2.publicBucketName,
        ContinuationToken: continuationToken,
        Prefix: prefix,
      })
    );

    for (const item of response.Contents ?? []) {
      if (item.Key) {
        objectKeys.push(item.Key);
      }
    }

    continuationToken = response.NextContinuationToken;
  } while (continuationToken);

  return objectKeys;
}

export async function uploadDemoSvgAsset(
  r2: R2Config | null,
  input: {
    fileName: string;
    folder: string;
    label: string;
    accentColor: string;
    backgroundColor: string;
    detailColor?: string;
  }
): Promise<DemoUploadedAsset | null> {
  if (!r2) {
    return null;
  }

  const normalizedFileName = `${slugify(input.fileName)}.svg`;
  const objectKey = `${DEMO_R2_PREFIX}/${trimSlashes(input.folder)}/${normalizedFileName}`;
  const svgMarkup = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${input.backgroundColor}" />
      <stop offset="100%" stop-color="${input.detailColor ?? "#08101f"}" />
    </linearGradient>
  </defs>
  <rect width="1280" height="720" rx="48" fill="url(#bg)" />
  <circle cx="214" cy="188" r="128" fill="${input.accentColor}" fill-opacity="0.18" />
  <circle cx="1090" cy="584" r="148" fill="${input.accentColor}" fill-opacity="0.22" />
  <rect x="96" y="98" width="1088" height="524" rx="36" fill="none" stroke="${input.accentColor}" stroke-opacity="0.5" stroke-width="8" />
  <text x="96" y="210" fill="#f8fafc" font-family="Arial, sans-serif" font-size="56" font-weight="700">${input.label}</text>
  <text x="96" y="286" fill="${input.accentColor}" font-family="Arial, sans-serif" font-size="26" font-weight="700" letter-spacing="4">BRAVO DEMO SEED</text>
  <text x="96" y="344" fill="#cbd5e1" font-family="Arial, sans-serif" font-size="24">Launch preview placeholder uploaded to R2</text>
</svg>`;
  const body = Buffer.from(svgMarkup, "utf8");

  await r2.client.send(
    new PutObjectCommand({
      Body: body,
      Bucket: r2.publicBucketName,
      CacheControl: "public, max-age=31536000, immutable",
      ContentType: "image/svg+xml",
      Key: objectKey,
    })
  );

  return {
    contentType: "image/svg+xml",
    fileName: normalizedFileName,
    key: objectKey,
    sizeBytes: body.byteLength,
    url: buildPublicAssetUrl(r2, objectKey),
  };
}

export async function clearDemoData(
  client: SupabaseAdminClient,
  options: { log?: (message: string) => void } = {}
) {
  const log = options.log ?? (() => undefined);
  const manifest = await readDemoManifest();
  const r2 = getOptionalR2Config();

  const demoDocuments = await listDemoAppDocuments(client);
  const removableDocuments = demoDocuments.filter(
    (row) =>
      !SINGLETON_DOCUMENTS.some(
        (documentRef) =>
          documentRef.collectionName === row.collection_name && documentRef.id === row.id
      )
  );

  for (const collectionName of new Set(removableDocuments.map((row) => row.collection_name))) {
    const ids = removableDocuments
      .filter((row) => row.collection_name === collectionName)
      .map((row) => row.id);

    if (ids.length === 0) {
      continue;
    }

    const { error } = await client
      .from("app_documents")
      .delete()
      .eq("collection_name", collectionName)
      .in("id", ids);

    if (error) {
      throw error;
    }
  }

  await restoreSingletonDocument(
    client,
    manifest?.singletonBackups.homepageContent ?? null,
    "homepageContent"
  );
  await restoreSingletonDocument(client, manifest?.singletonBackups.siteStats ?? null, "siteStats");

  const summary: DemoCleanupSummary = {
    appDocuments: removableDocuments.length,
    matchPlayerResults: await deleteRowsByDemoTag(client, "match_player_results"),
    matchTeamResults: await deleteRowsByDemoTag(client, "match_team_results"),
    matches: await deleteRowsByDemoTag(client, "matches"),
    eventTeams: await deleteRowsByDemoTag(client, "event_teams"),
    teamRosterHistory: await deleteRowsByDemoTag(client, "team_roster_history"),
    players: await deleteRowsByDemoTag(client, "players"),
    teams: await deleteRowsByDemoTag(client, "teams"),
    days: await deleteRowsByDemoTag(client, "days"),
    events: await deleteRowsByDemoTag(client, "events"),
    seasons: await deleteRowsByDemoTag(client, "seasons"),
    uploads: await deleteRowsByDemoTag(client, "uploads"),
    removedObjectKeys: 0,
  };

  const objectKeys = Array.from(
    new Set([
      ...(manifest?.uploadedObjectKeys ?? []),
      ...(await listR2ObjectKeysByPrefix(r2, DEMO_R2_PREFIX)),
    ])
  );

  if (r2 && objectKeys.length > 0) {
    for (let index = 0; index < objectKeys.length; index += 1000) {
      const chunk = objectKeys.slice(index, index + 1000);
      await r2.client.send(
        new DeleteObjectsCommand({
          Bucket: r2.publicBucketName,
          Delete: {
            Objects: chunk.map((key) => ({ Key: key })),
          },
        })
      );
    }
    summary.removedObjectKeys = objectKeys.length;
  }

  await deleteDemoManifest();
  log(`Removed demo data tagged ${DEMO_SEED_TAG}.`);
  return summary;
}
