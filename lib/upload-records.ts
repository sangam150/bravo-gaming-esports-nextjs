import type { Tables } from "@/types/database.types";
import { getSupabaseServiceRoleClient } from "./supabase/service-role-client";
import type { UploadRecord } from "./types";
import type { UploadType } from "./upload-config";

type UploadRow = Tables<"uploads">;

function toNullableUuid(value?: string | null) {
  if (!value) {
    return null;
  }

  const normalizedValue = value.trim();
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(normalizedValue) ? normalizedValue : null;
}

function toUploadRecord(row: UploadRow): UploadRecord {
  return {
    id: row.id,
    path: row.file_path ?? "",
    url: row.file_url,
    type: row.file_type as UploadType,
    entityId: row.related_id ?? undefined,
    fileName: row.file_name ?? undefined,
    contentType: row.content_type ?? undefined,
    sizeBytes: row.size_bytes ?? undefined,
    uploadedAt: row.created_at,
  };
}

export async function createUploadRecord(input: {
  fileUrl: string;
  filePath: string;
  fileType: UploadType;
  id?: string;
  relatedType: string;
  relatedId?: string | null;
  uploadedBy?: string | null;
  fileName?: string | null;
  contentType?: string | null;
  sizeBytes?: number | null;
}) {
  const client = getSupabaseServiceRoleClient();
  const { data, error } = await client
    .from("uploads")
    .insert({
      id: input.id,
      file_url: input.fileUrl,
      file_path: input.filePath,
      file_type: input.fileType,
      related_type: input.relatedType,
      related_id: toNullableUuid(input.relatedId),
      uploaded_by: toNullableUuid(input.uploadedBy),
      file_name: input.fileName ?? null,
      content_type: input.contentType ?? null,
      size_bytes: input.sizeBytes ?? null,
      created_at: new Date().toISOString(),
    })
    .select("id,file_url,file_path,file_type,related_type,related_id,uploaded_by,file_name,content_type,size_bytes,created_at")
    .single<UploadRow>();

  if (error) {
    throw error;
  }

  return toUploadRecord(data);
}

export async function getRecentUploadRecords(limit = 10) {
  const client = getSupabaseServiceRoleClient();
  const { data, error } = await client
    .from("uploads")
    .select("id,file_url,file_path,file_type,related_type,related_id,uploaded_by,file_name,content_type,size_bytes,created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => toUploadRecord(row as UploadRow));
}

export async function claimUploadRecordForEntity(input: {
  id: string;
  relatedType: string;
  relatedId: string;
  filePath: string;
  fileUrl: string;
}) {
  const relatedId = toNullableUuid(input.relatedId);
  if (!relatedId) {
    throw new Error("A valid entity ID is required to claim an upload.");
  }

  const client = getSupabaseServiceRoleClient();
  const { data, error } = await client
    .from("uploads")
    .update({ related_id: relatedId })
    .eq("id", input.id)
    .eq("related_type", input.relatedType)
    .eq("file_path", input.filePath)
    .eq("file_url", input.fileUrl)
    .is("related_id", null)
    .select("id,file_url,file_path,file_type,related_type,related_id,uploaded_by,file_name,content_type,size_bytes,created_at")
    .maybeSingle<UploadRow>();

  if (error) {
    throw error;
  }

  return data ? toUploadRecord(data) : null;
}

export async function releaseUploadRecordEntityClaim(input: { id: string; relatedType: string; relatedId: string }) {
  const relatedId = toNullableUuid(input.relatedId);
  if (!relatedId) {
    return false;
  }

  const client = getSupabaseServiceRoleClient();
  const { data, error } = await client
    .from("uploads")
    .update({ related_id: null })
    .eq("id", input.id)
    .eq("related_type", input.relatedType)
    .eq("related_id", relatedId)
    .select("id")
    .maybeSingle();

  if (error) {
    throw error;
  }

  return Boolean(data);
}

export async function listPendingRegistrationLogoUploadRecords(registrationId: string) {
  const relatedId = toNullableUuid(registrationId);
  if (!relatedId) {
    return [];
  }

  const client = getSupabaseServiceRoleClient();
  const { data, error } = await client
    .from("uploads")
    .select("id,file_url,file_path,file_type,related_type,related_id,uploaded_by,file_name,content_type,size_bytes,created_at")
    .eq("related_type", "team_registration")
    .eq("related_id", relatedId)
    .eq("file_type", "team_logo_pending")
    .order("created_at", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => toUploadRecord(row as UploadRow));
}

export async function deleteUploadRecord(id: string) {
  const client = getSupabaseServiceRoleClient();
  const { error } = await client.from("uploads").delete().eq("id", id);
  if (error) {
    throw error;
  }
}
