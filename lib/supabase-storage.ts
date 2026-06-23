import { randomUUID } from "crypto";
import { getSupabaseServiceRoleClient } from "./supabase/service-role-client";
import {
  sanitizeStorageSegment,
  sanitizeUploadFileName,
  STORAGE_TARGET_BY_TYPE,
  type UploadType,
} from "./upload-config";

function getStorageConfigurationError() {
  return new Error(
    "Supabase Storage is required for uploads. Set NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY), and SUPABASE_SECRET_KEY (or SUPABASE_SERVICE_ROLE_KEY)."
  );
}

function buildPublicStorageUrl(bucketName: string, filePath: string) {
  const client = getSupabaseServiceRoleClient();
  const {
    data: { publicUrl },
  } = client.storage.from(bucketName).getPublicUrl(filePath);

  return publicUrl;
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

export function buildStoragePath(type: UploadType, entityId: string, filename: string) {
  const target = STORAGE_TARGET_BY_TYPE[type];
  const safeEntityId = sanitizeStorageSegment(entityId);
  const safeFilename = sanitizeUploadFileName(type, filename);

  return {
    bucket: target.bucket,
    path: `${target.directory}/${safeEntityId}/${randomUUID()}_${safeFilename}`,
  };
}

export async function uploadToStorage(
  bucketName: string,
  filePath: string,
  buffer: Buffer,
  contentType: string
): Promise<string> {
  if (!bucketName.trim() || !filePath.trim()) {
    throw getStorageConfigurationError();
  }

  const client = getSupabaseServiceRoleClient();
  const { error } = await client.storage.from(bucketName).upload(filePath, buffer, {
    contentType,
    upsert: true,
  });

  if (error) {
    throw error;
  }

  return buildPublicStorageUrl(bucketName, filePath);
}

export async function deleteFromStorageByUrl(url: string | null | undefined) {
  if (!url) return false;

  const parsed = parseSupabasePublicUrl(url);
  if (!parsed) return false;

  const client = getSupabaseServiceRoleClient();
  const { error } = await client.storage.from(parsed.bucketName).remove([parsed.filePath]);

  if (error) {
    throw error;
  }

  return true;
}
