import "server-only";

import { getSupabaseServiceRoleClient } from "@/lib/supabase/service-role-client";
import {
  normalizeUploadFolder,
  normalizeUploadType,
  sanitizeStorageSegment,
  sanitizeUploadFileName,
  STORAGE_TARGET_BY_TYPE,
  type UploadType,
} from "@/lib/upload-config";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  type GetObjectCommandOutput,
} from "@aws-sdk/client-s3";
import { randomUUID } from "crypto";
import { Readable } from "stream";
import { getR2Client, getR2PrivateBucketName, getR2PublicBaseUrl, getR2PublicBucketName, getR2PublicDeliveryMode } from "./client";
import type { BuildStoragePathResult, ManagedUploadRecord, StorageVisibility } from "./types";

function trimSlashes(value: string) {
  return value.replace(/^\/+|\/+$/g, "");
}

function normalizeObjectKey(objectKey: string) {
  const normalized = trimSlashes(objectKey);
  if (
    !normalized ||
    normalized.includes("\\") ||
    /[\u0000-\u001f\u007f]/.test(normalized) ||
    normalized.split("/").some((segment) => segment === "." || segment === "..")
  ) {
    throw new Error("Invalid managed storage object key.");
  }
  return normalized;
}

function getBucketName(visibility: StorageVisibility) {
  return visibility === "private" ? getR2PrivateBucketName() : getR2PublicBucketName();
}

function getObjectCacheControl(visibility: StorageVisibility) {
  return visibility === "private" ? "private, no-store" : "public, max-age=31536000, immutable";
}

function parseSupabasePublicUrl(url: string) {
  try {
    const parsedUrl = new URL(url);
    const configuredSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
    if (!configuredSupabaseUrl || parsedUrl.origin !== new URL(configuredSupabaseUrl).origin) {
      return null;
    }
    const marker = "/storage/v1/object/public/";
    const markerIndex = parsedUrl.pathname.indexOf(marker);

    if (markerIndex < 0) {
      return null;
    }

    const publicPath = parsedUrl.pathname.slice(markerIndex + marker.length);
    const [bucketName, ...pathParts] = publicPath.split("/").filter(Boolean);

    if (!bucketName || pathParts.length === 0) {
      return null;
    }

    return {
      bucketName,
      filePath: pathParts.join("/"),
    };
  } catch {
    return null;
  }
}

function parseManagedPrivateUploadId(url: string) {
  try {
    if (!url.startsWith("/") || url.startsWith("//")) {
      return null;
    }
    const parsedUrl = new URL(url, "http://internal.invalid");
    const match = parsedUrl.pathname.match(/^\/api\/uploads\/private\/([^/]+)$/);
    return match?.[1] ? decodeURIComponent(match[1]) : null;
  } catch {
    return null;
  }
}

function parseManagedPublicObjectKey(url: string) {
  try {
    const baseUrl = new URL(getR2PublicBaseUrl());
    const parsedUrl = new URL(url);
    if (parsedUrl.origin !== baseUrl.origin) {
      return null;
    }

    const basePath = trimSlashes(baseUrl.pathname);
    const targetPath = trimSlashes(parsedUrl.pathname);

    if (!basePath) {
      return targetPath || null;
    }

    if (targetPath === basePath) {
      return null;
    }

    if (!targetPath.startsWith(`${basePath}/`)) {
      return null;
    }

    return targetPath.slice(basePath.length + 1) || null;
  } catch {
    return null;
  }
}

function parseManagedPublicProxyObjectKey(url: string) {
  try {
    if (!url.startsWith("/") || url.startsWith("//")) {
      return null;
    }
    const parsedUrl = new URL(url, "http://internal.invalid");
    if (parsedUrl.pathname !== "/api/uploads/r2") {
      return null;
    }

    const objectKey = parsedUrl.searchParams.get("key");
    return objectKey ? normalizeObjectKey(objectKey) : null;
  } catch {
    return null;
  }
}

function getVisibilityForUploadType(fileType: string) {
  const normalizedType = normalizeUploadType(fileType);
  if (!normalizedType) {
    return null;
  }

  return STORAGE_TARGET_BY_TYPE[normalizedType].visibility;
}

async function getUploadRecordById(uploadId: string): Promise<ManagedUploadRecord | null> {
  const client = getSupabaseServiceRoleClient();
  const { data, error } = await client
    .from("uploads")
    .select("id,file_url,file_path,file_type,related_type,related_id,file_name,content_type,size_bytes")
    .eq("id", uploadId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  return {
    contentType: data.content_type ?? null,
    fileName: data.file_name ?? null,
    filePath: data.file_path ?? null,
    fileType: data.file_type,
    id: data.id,
    relatedId: data.related_id ?? null,
    relatedType: data.related_type,
    sizeBytes: data.size_bytes ?? null,
    url: data.file_url,
  };
}

async function deleteLegacySupabaseObject(bucketName: string, filePath: string) {
  const client = getSupabaseServiceRoleClient();
  const { error } = await client.storage.from(bucketName).remove([filePath]);

  if (error) {
    throw error;
  }
}

export function buildPublicFileUrl(objectKey: string) {
  const normalizedObjectKey = normalizeObjectKey(objectKey);

  if (getR2PublicDeliveryMode() === "proxy") {
    return `/api/uploads/r2?key=${encodeURIComponent(normalizedObjectKey)}`;
  }

  return `${getR2PublicBaseUrl()}/${normalizedObjectKey}`;
}

export function buildPrivateUploadUrl(uploadId: string) {
  return `/api/uploads/private/${encodeURIComponent(uploadId)}`;
}

function buildStoragePath(type: UploadType, entityId: string, filename: string): BuildStoragePathResult {
  const target = STORAGE_TARGET_BY_TYPE[type];
  const safeEntityId = sanitizeStorageSegment(entityId);
  const safeFilename = sanitizeUploadFileName(type, filename);
  const entitySuffix = safeEntityId && safeEntityId !== "general" ? `-${safeEntityId}` : "";
  const uniquePrefix = `${Date.now()}-${randomUUID().slice(0, 8)}`;
  const path = `${target.folder}/${uniquePrefix}${entitySuffix}-${safeFilename}`;

  return {
    bucket: getBucketName(target.visibility),
    folder: target.folder,
    path,
    visibility: target.visibility,
  };
}

async function uploadObjectToR2(input: {
  body: Buffer;
  bucket: string;
  contentType: string;
  objectKey: string;
  visibility: StorageVisibility;
}) {
  await getR2Client().send(
    new PutObjectCommand({
      Body: input.body,
      Bucket: input.bucket,
      CacheControl: getObjectCacheControl(input.visibility),
      ContentType: input.contentType,
      Key: normalizeObjectKey(input.objectKey),
    }),
  );
}

export async function uploadPublicObjectAtKey(objectKey: string, body: Buffer, contentType: string) {
  const normalizedObjectKey = normalizeObjectKey(objectKey);
  await uploadObjectToR2({
    body,
    bucket: getR2PublicBucketName(),
    contentType,
    objectKey: normalizedObjectKey,
    visibility: "public",
  });
  return {
    path: normalizedObjectKey,
    url: buildPublicFileUrl(normalizedObjectKey),
  };
}

export async function uploadPrivateObjectAtKey(objectKey: string, body: Buffer, contentType: string) {
  const normalizedObjectKey = normalizeObjectKey(objectKey);
  await uploadObjectToR2({
    body,
    bucket: getR2PrivateBucketName(),
    contentType,
    objectKey: normalizedObjectKey,
    visibility: "private",
  });
  return {
    path: normalizedObjectKey,
  };
}

export async function uploadPrivateFile(
  type: UploadType,
  entityId: string,
  filename: string,
  body: Buffer,
  contentType: string,
): Promise<BuildStoragePathResult & { visibility: "private" }> {
  const storagePath = buildStoragePath(type, entityId, filename);

  if (storagePath.visibility !== "private") {
    throw new Error(`Upload type ${type} is not configured for the private R2 bucket.`);
  }

  await uploadObjectToR2({
    body,
    bucket: storagePath.bucket,
    contentType,
    objectKey: storagePath.path,
    visibility: storagePath.visibility,
  });

  return {
    ...storagePath,
    visibility: "private",
  };
}

async function deleteObjectFromR2(visibility: StorageVisibility, objectKey: string) {
  await getR2Client().send(
    new DeleteObjectCommand({
      Bucket: getBucketName(visibility),
      Key: normalizeObjectKey(objectKey),
    }),
  );
}

export async function deletePublicObjectByKey(objectKey: string) {
  await deleteObjectFromR2("public", normalizeObjectKey(objectKey));
}

export async function deletePrivateObjectByKey(objectKey: string) {
  await deleteObjectFromR2("private", normalizeObjectKey(objectKey));
}

async function verifyObject(
  visibility: StorageVisibility,
  objectKey: string,
  expected: {
    contentType?: string;
    sizeBytes?: number;
  } = {},
) {
  const response = await getR2Client().send(
    new HeadObjectCommand({
      Bucket: getBucketName(visibility),
      Key: normalizeObjectKey(objectKey),
    }),
  );
  if (typeof expected.sizeBytes === "number" && response.ContentLength !== expected.sizeBytes) {
    throw new Error("The uploaded file size could not be verified.");
  }
  if (expected.contentType && normalizedContentType(response.ContentType) !== normalizedContentType(expected.contentType)) {
    throw new Error("The uploaded file content type could not be verified.");
  }
  return response;
}

async function verifyPublicObject(
  objectKey: string,
  expected: {
    contentType?: string;
    sizeBytes?: number;
  } = {},
) {
  return verifyObject("public", objectKey, expected);
}

export async function verifyPrivateObject(
  objectKey: string,
  expected: {
    contentType?: string;
    sizeBytes?: number;
  } = {},
) {
  return verifyObject("private", objectKey, expected);
}

function normalizedContentType(value: string | null | undefined) {
  return value?.split(";", 1)[0]?.trim().toLowerCase() ?? null;
}

export function assertPublicObjectDelivery(
  delivered: {
    contentType?: string | null;
    sizeBytes: number;
  },
  expected: {
    contentType?: string;
    sizeBytes?: number;
  } = {},
) {
  if (typeof expected.sizeBytes === "number" && delivered.sizeBytes !== expected.sizeBytes) {
    throw new Error("The delivered image size could not be verified.");
  }
  if (expected.contentType && normalizedContentType(delivered.contentType) !== normalizedContentType(expected.contentType)) {
    throw new Error("The delivered image content type could not be verified.");
  }
}

async function fetchDeliveredPublicObject(objectKey: string) {
  const response = await fetch(buildPublicFileUrl(objectKey), {
    cache: "no-store",
    headers: {
      Accept: "image/avif,image/webp,image/png,image/jpeg,*/*",
    },
    redirect: "error",
  });
  if (!response.ok) {
    throw new Error("The uploaded image is not available from the configured public delivery URL.");
  }
  return {
    body: Buffer.from(await response.arrayBuffer()),
    contentType: response.headers.get("content-type"),
  };
}

/**
 * Verifies both the stored R2 object and the path users will actually load.
 * Proxy delivery uses the same GetObject adapter as `/api/uploads/r2`; direct
 * delivery performs a real request against the configured public base URL.
 */
export async function verifyPublicObjectDelivery(
  objectKey: string,
  expected: {
    contentType?: string;
    sizeBytes?: number;
  } = {},
) {
  const normalizedObjectKey = normalizeObjectKey(objectKey);
  await verifyPublicObject(normalizedObjectKey, expected);

  if (getR2PublicDeliveryMode() === "proxy") {
    const object = await getPublicObject(normalizedObjectKey);
    const body = await readObjectBodyAsBuffer(object.Body);
    if (!body) {
      throw new Error("The uploaded image is not available through the public proxy.");
    }
    assertPublicObjectDelivery(
      {
        contentType: object.ContentType,
        sizeBytes: body.byteLength,
      },
      expected,
    );
    return;
  }

  let lastError: unknown;
  for (const retryDelayMs of [0, 150, 400]) {
    if (retryDelayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
    }
    try {
      const delivered = await fetchDeliveredPublicObject(normalizedObjectKey);
      assertPublicObjectDelivery(
        {
          contentType: delivered.contentType,
          sizeBytes: delivered.body.byteLength,
        },
        expected,
      );
      return;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error ? lastError : new Error("The uploaded image could not be verified for public delivery.");
}

export function getManagedPublicObjectKeyFromUrl(url: string | null | undefined) {
  if (!url) return null;
  return parseManagedPublicProxyObjectKey(url) ?? parseManagedPublicObjectKey(url);
}

export async function deleteFromStorageByUrl(url: string | null | undefined) {
  if (!url) return false;

  const privateUploadId = parseManagedPrivateUploadId(url);
  if (privateUploadId) {
    const uploadRecord = await getUploadRecordById(privateUploadId);
    if (!uploadRecord?.filePath) {
      return false;
    }

    const visibility = getVisibilityForUploadType(uploadRecord.fileType);
    if (visibility !== "private") {
      return false;
    }

    await deleteObjectFromR2("private", uploadRecord.filePath);
    return true;
  }

  const managedPublicObjectKey = getManagedPublicObjectKeyFromUrl(url);
  if (managedPublicObjectKey) {
    await deleteObjectFromR2("public", managedPublicObjectKey);
    return true;
  }

  const legacySupabaseObject = parseSupabasePublicUrl(url);
  if (legacySupabaseObject) {
    await deleteLegacySupabaseObject(legacySupabaseObject.bucketName, legacySupabaseObject.filePath);
    return true;
  }

  return false;
}

export async function getManagedUploadRecord(uploadId: string) {
  return getUploadRecordById(uploadId);
}

export async function getPrivateObject(filePath: string): Promise<GetObjectCommandOutput> {
  return getR2Client().send(
    new GetObjectCommand({
      Bucket: getR2PrivateBucketName(),
      Key: normalizeObjectKey(filePath),
    }),
  );
}

export async function getPublicObject(filePath: string): Promise<GetObjectCommandOutput> {
  return getR2Client().send(
    new GetObjectCommand({
      Bucket: getR2PublicBucketName(),
      Key: normalizeObjectKey(filePath),
    }),
  );
}

export function normalizeManagedPublicObjectKey(filePath: string) {
  const normalizedKey = normalizeObjectKey(filePath);
  const segments = normalizedKey.split("/").filter(Boolean);
  const [folder, demoSeedTag, demoFolder] = segments;

  if (!folder || normalizedKey.includes("..")) {
    return null;
  }

  if (normalizeUploadFolder(folder)) {
    return normalizedKey;
  }

  // Demo preview assets live under demo/<seed-tag>/<managed-folder>/... so they can be cleaned up safely.
  if (
    folder === "demo" &&
    segments.length >= 4 &&
    demoSeedTag &&
    /^[a-z0-9_-]+$/i.test(demoSeedTag) &&
    demoFolder &&
    normalizeUploadFolder(demoFolder)
  ) {
    return normalizedKey;
  }

  if (!normalizeUploadFolder(folder)) {
    return null;
  }

  return normalizedKey;
}

export function isR2ObjectMissingError(error: unknown) {
  if (!error || typeof error !== "object") {
    return false;
  }

  const candidate = error as {
    Code?: string;
    code?: string;
    name?: string;
    message?: string;
    $metadata?: { httpStatusCode?: number };
  };

  return (
    candidate.$metadata?.httpStatusCode === 404 ||
    candidate.Code === "NoSuchKey" ||
    candidate.code === "NoSuchKey" ||
    candidate.name === "NoSuchKey" ||
    candidate.name === "NotFound" ||
    candidate.message?.includes("NoSuchKey") === true ||
    candidate.message?.includes("not found") === true
  );
}

export async function readObjectBodyAsBuffer(body: GetObjectCommandOutput["Body"]) {
  if (!body) {
    return null;
  }

  if (typeof body.transformToByteArray === "function") {
    return Buffer.from(await body.transformToByteArray());
  }

  const stream = body as Readable;
  const chunks: Buffer[] = [];

  return await new Promise<Buffer>((resolve, reject) => {
    stream.on("data", (chunk) => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    });
    stream.once("end", () => resolve(Buffer.concat(chunks)));
    stream.once("error", reject);
  });
}
