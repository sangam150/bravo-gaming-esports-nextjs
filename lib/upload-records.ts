import { getSupabaseServiceRoleClient } from "./supabase/service-role-client";
import type { UploadRecord } from "./types";
import type { UploadType } from "./upload-config";

type UploadRow = {
  id: string;
  file_url: string;
  file_path?: string | null;
  file_type: string;
  related_type?: string | null;
  related_id?: string | null;
  uploaded_by?: string | null;
  file_name?: string | null;
  content_type?: string | null;
  size_bytes?: number | null;
  created_at: string;
};

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
      file_url: input.fileUrl,
      file_path: input.filePath,
      file_type: input.fileType,
      related_type: input.relatedType,
      related_id: input.relatedId ?? null,
      uploaded_by: input.uploadedBy ?? null,
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
