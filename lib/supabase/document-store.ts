export const SUPABASE_DOCUMENT_STORE_TABLE = "app_documents";

export type SupabaseDocumentStoreRow = {
  collection_name: string;
  id: string;
  data: Record<string, unknown> | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export function mapSupabaseDocumentStoreRow<T = Record<string, unknown>>(
  row: SupabaseDocumentStoreRow
) {
  return {
    id: row.id,
    ...((row.data ?? {}) as Record<string, unknown>),
  } as T & { id: string };
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "object" && error && "message" in error && typeof error.message === "string") {
    return error.message;
  }

  return String(error);
}

export function isSupabaseDocumentStoreMissingError(error: unknown) {
  const message = getErrorMessage(error).toLowerCase();
  const maybeCode =
    typeof error === "object" && error && "code" in error && typeof error.code === "string"
      ? error.code
      : undefined;

  return (
    maybeCode === "42P01" ||
    message.includes("public.app_documents") ||
    message.includes("app_documents") && message.includes("schema cache") ||
    message.includes("relation") && message.includes("app_documents") && message.includes("does not exist")
  );
}
