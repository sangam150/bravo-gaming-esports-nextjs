import "server-only";

import { randomUUID } from "crypto";
import { Readable } from "stream";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  type GetObjectCommandOutput,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getSupabaseServiceRoleClient } from "@/lib/supabase/service-role-client";
import {
  normalizeUploadType,
  sanitizeStorageSegment,
  sanitizeUploadFileName,
  STORAGE_TARGET_BY_TYPE,
  type UploadType,
} from "@/lib/upload-config";
import { getR2Client, getR2PrivateBucketName, getR2PublicBaseUrl, getR2PublicBucketName } from "./client";
import type { BuildStoragePathResult, ManagedUploadRecord, PresignedUploadResult, StorageVisibility } from "./types";

function trimSlashes(value: string) {
  return value.replace(/^\/+|\/+$/g, "");
}

function normalizeObjectKey(objectKey: string) {
  return trimSlashes(objectKey);
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
    const parsedUrl = new URL(url, "http://localhost");
    const match = parsedUrl.pathname.match(/^\/api\/uploads\/private\/([^/]+)$/);
    return match?.[1] ? decodeURIComponent(match[1]) : null;
  } catch {
    return null;
  }
}

function parseManagedPublicObjectKey(url: string) {
  try {
    const baseUrl = new URL(getR2PublicBaseUrl());
    const parsedUrl = new URL(url, baseUrl);
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
  return `${getR2PublicBaseUrl()}/${normalizeObjectKey(objectKey)}`;
}

export function buildPrivateUploadUrl(uploadId: string) {
  return `/api/uploads/private/${encodeURIComponent(uploadId)}`;
}

export function buildStoragePath(type: UploadType, entityId: string, filename: string): BuildStoragePathResult {
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

export async function uploadObjectToR2(input: {
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
    })
  );
}

export async function uploadPublicFile(
  type: UploadType,
  entityId: string,
  filename: string,
  body: Buffer,
  contentType: string
): Promise<BuildStoragePathResult & { url: string; visibility: "public" }> {
  const storagePath = buildStoragePath(type, entityId, filename);

  if (storagePath.visibility !== "public") {
    throw new Error(`Upload type ${type} is not configured for the public R2 bucket.`);
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
    visibility: "public",
    url: buildPublicFileUrl(storagePath.path),
  };
}

export async function uploadPrivateFile(
  type: UploadType,
  entityId: string,
  filename: string,
  body: Buffer,
  contentType: string
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

export async function deleteObjectFromR2(visibility: StorageVisibility, objectKey: string) {
  await getR2Client().send(
    new DeleteObjectCommand({
      Bucket: getBucketName(visibility),
      Key: normalizeObjectKey(objectKey),
    })
  );
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

  const managedPublicObjectKey = parseManagedPublicObjectKey(url);
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

export async function createPresignedPublicUpload(
  type: UploadType,
  entityId: string,
  fileName: string,
  contentType: string
): Promise<PresignedUploadResult> {
  const storagePath = buildStoragePath(type, entityId, fileName);

  if (storagePath.visibility !== "public") {
    throw new Error(`Upload type ${type} is not configured for presigned public uploads.`);
  }

  const uploadUrl = await getSignedUrl(
    getR2Client(),
    new PutObjectCommand({
      Bucket: storagePath.bucket,
      CacheControl: getObjectCacheControl(storagePath.visibility),
      ContentType: contentType,
      Key: storagePath.path,
    }),
    { expiresIn: 300 }
  );

  return {
    expiresAt: new Date(Date.now() + 300_000).toISOString(),
    headers: {
      "Content-Type": contentType,
    },
    method: "PUT",
    path: storagePath.path,
    uploadUrl,
    url: buildPublicFileUrl(storagePath.path),
  };
}

export async function getManagedUploadRecord(uploadId: string) {
  return getUploadRecordById(uploadId);
}

export async function getPrivateObject(filePath: string): Promise<GetObjectCommandOutput> {
  return getR2Client().send(
    new GetObjectCommand({
      Bucket: getR2PrivateBucketName(),
      Key: normalizeObjectKey(filePath),
    })
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

export function toReadableStream(body: GetObjectCommandOutput["Body"]) {
  if (!body) {
    return null;
  }

  if (typeof body.transformToWebStream === "function") {
    return body.transformToWebStream();
  }

  return Readable.toWeb(body as Readable);
}
