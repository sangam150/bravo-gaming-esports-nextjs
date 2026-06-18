import { randomUUID } from "crypto";
import { COLLECTIONS } from "./document-store-collections";
import { getRequestedServerDataBackend } from "./data-backend";
import { readJsonObject, sanitizeJsonObject, sanitizeJsonValue } from "./json-utils";
import { isSupabaseServiceRoleConfigured } from "./supabase/env";
import { getSupabaseServiceRoleClient } from "./supabase/service-role-client";
import {
  SUPABASE_DOCUMENT_STORE_TABLE,
  mapSupabaseDocumentStoreRow,
  type SupabaseDocumentStoreRow,
  isSupabaseDocumentStoreMissingError,
} from "./supabase/document-store";

export { COLLECTIONS };

export type DocumentWriteOperation =
  | {
      type: "set";
      collectionName: string;
      docId: string;
      data: Record<string, unknown>;
      merge?: boolean;
    }
  | {
      type: "delete";
      collectionName: string;
      docId: string;
    };

export function sanitizeDocumentData(data: Record<string, unknown>) {
  const { id: _ignoredId, ...payload } = data;
  return sanitizeJsonObject(payload);
}

export function isDocumentStoreAdminConfigured(): boolean {
  return isSupabaseServiceRoleConfigured();
}

export function isDocumentStoreConfigured(): boolean {
  return isSupabaseServiceRoleConfigured();
}

let supabaseDocumentStoreProbe: Promise<boolean> | null = null;

async function hasSupabaseDocumentStore() {
  if (!isSupabaseServiceRoleConfigured()) {
    return false;
  }

  if (supabaseDocumentStoreProbe) {
    return supabaseDocumentStoreProbe;
  }

  supabaseDocumentStoreProbe = (async () => {
    try {
      const client = getSupabaseServiceRoleClient();
      const { error } = await client.from(SUPABASE_DOCUMENT_STORE_TABLE).select("id", { head: true, count: "exact" }).limit(1);

      if (error) {
        if (isSupabaseDocumentStoreMissingError(error)) {
          return false;
        }

        throw error;
      }

      return true;
    } catch (error: unknown) {
      if (isSupabaseDocumentStoreMissingError(error)) {
        return false;
      }

      throw error;
    }
  })();

  return supabaseDocumentStoreProbe;
}

async function requireSupabaseDocumentStore() {
  const requestedBackend = getRequestedServerDataBackend();

  if (requestedBackend !== "auto" && requestedBackend !== "supabase") {
    throw new Error("Only the Supabase data backend is supported.");
  }

  if (!isSupabaseServiceRoleConfigured()) {
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY), and SUPABASE_SERVICE_ROLE_KEY."
    );
  }

  if (!(await hasSupabaseDocumentStore())) {
    throw new Error(
      "Supabase document store is not ready. Run the SQL in supabase/schema.sql so public.app_documents exists."
    );
  }
}

export async function getConfiguredDataBackend() {
  await requireSupabaseDocumentStore();
  return "supabase" as const;
}

async function getSupabaseDocumentRows(collectionName: string, docIds?: string[]) {
  await requireSupabaseDocumentStore();

  const client = getSupabaseServiceRoleClient();
  let query = client
    .from(SUPABASE_DOCUMENT_STORE_TABLE)
    .select("collection_name,id,data,created_at,updated_at")
    .eq("collection_name", collectionName);

  if (docIds?.length) {
    query = query.in("id", docIds);
  }

  const { data, error } = await query;
  if (error) {
    throw error;
  }

  return (data ?? []) as SupabaseDocumentStoreRow[];
}

function getComparableFieldValue(record: Record<string, unknown>, field: string) {
  return record[field];
}

export async function fetchDocumentCollection<T = Record<string, unknown>>(collectionName: string, limit = 100) {
  await requireSupabaseDocumentStore();

  const client = getSupabaseServiceRoleClient();
  const { data, error } = await client
    .from(SUPABASE_DOCUMENT_STORE_TABLE)
    .select("collection_name,id,data,created_at,updated_at")
    .eq("collection_name", collectionName)
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw error;
  }

  return ((data ?? []) as SupabaseDocumentStoreRow[]).map((row) => mapSupabaseDocumentStoreRow<T>(row));
}

export async function getDocument<T = Record<string, unknown>>(collectionName: string, docId: string) {
  await requireSupabaseDocumentStore();

  const client = getSupabaseServiceRoleClient();
  const { data, error } = await client
    .from(SUPABASE_DOCUMENT_STORE_TABLE)
    .select("collection_name,id,data,created_at,updated_at")
    .eq("collection_name", collectionName)
    .eq("id", docId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  return mapSupabaseDocumentStoreRow<T>(data as SupabaseDocumentStoreRow);
}

export async function saveDocument(collectionName: string, docId: string, data: Record<string, unknown>) {
  await requireSupabaseDocumentStore();

  const client = getSupabaseServiceRoleClient();
  const now = new Date().toISOString();
  const existingRows = await getSupabaseDocumentRows(collectionName, [docId]);
  const existingRow = existingRows[0];
  const existingData = readJsonObject(existingRow?.data) ?? {};
  const payload = sanitizeDocumentData({
    ...existingData,
    ...data,
    updatedAt: now,
  });

  const { error } = await client.from(SUPABASE_DOCUMENT_STORE_TABLE).upsert(
    [
      {
        collection_name: collectionName,
        id: docId,
        data: payload,
        created_at: existingRow?.created_at ?? now,
        updated_at: now,
      },
    ],
    {
      onConflict: "collection_name,id",
    }
  );

  if (error) {
    throw error;
  }

  return { id: docId, collection: collectionName };
}

export async function createDocument(collectionName: string, data: Record<string, unknown>, docId?: string) {
  await requireSupabaseDocumentStore();

  const client = getSupabaseServiceRoleClient();
  const now = new Date().toISOString();
  const resolvedDocId = docId ?? randomUUID();
  const payload = sanitizeDocumentData({
    ...data,
    createdAt: data.createdAt ?? now,
    updatedAt: now,
  });

  const { error } = await client.from(SUPABASE_DOCUMENT_STORE_TABLE).upsert(
    [
      {
        collection_name: collectionName,
        id: resolvedDocId,
        data: payload,
        created_at: now,
        updated_at: now,
      },
    ],
    {
      onConflict: "collection_name,id",
    }
  );

  if (error) {
    throw error;
  }

  return { id: resolvedDocId, collection: collectionName };
}

export async function deleteDocument(collectionName: string, docId: string) {
  await requireSupabaseDocumentStore();

  const client = getSupabaseServiceRoleClient();
  const { error } = await client
    .from(SUPABASE_DOCUMENT_STORE_TABLE)
    .delete()
    .eq("collection_name", collectionName)
    .eq("id", docId);

  if (error) {
    throw error;
  }

  return { id: docId, deleted: true };
}

export async function queryDocumentCollection<T = Record<string, unknown>>(
  collectionName: string,
  field: string,
  value: string,
  limit = 50
) {
  const fetchedRows = await fetchDocumentCollection<T>(collectionName, Math.max(limit * 4, 200));
  return fetchedRows
    .filter((row) => {
      const comparableValue = getComparableFieldValue(row as unknown as Record<string, unknown>, field);
      return comparableValue === value;
    })
    .slice(0, limit);
}

export async function commitDocumentWriteOperations(operations: DocumentWriteOperation[], chunkSize = 400) {
  await requireSupabaseDocumentStore();

  if (operations.length === 0) {
    return { committedOperations: 0, batches: 0 };
  }

  const client = getSupabaseServiceRoleClient();
  const now = new Date().toISOString();
  const setOperations = operations.filter(
    (operation): operation is Extract<DocumentWriteOperation, { type: "set" }> => operation.type === "set"
  );
  const deleteOperations = operations.filter(
    (operation): operation is Extract<DocumentWriteOperation, { type: "delete" }> => operation.type === "delete"
  );

  const existingRowsByCollection = new Map<string, Map<string, SupabaseDocumentStoreRow>>();
  const docIdsByCollection = new Map<string, string[]>();

  for (const operation of setOperations) {
    const currentDocIds = docIdsByCollection.get(operation.collectionName) ?? [];
    currentDocIds.push(operation.docId);
    docIdsByCollection.set(operation.collectionName, currentDocIds);
  }

  for (const [collectionName, docIds] of docIdsByCollection) {
    const uniqueDocIds = Array.from(new Set(docIds));
    const rows = await getSupabaseDocumentRows(collectionName, uniqueDocIds);
    existingRowsByCollection.set(collectionName, new Map(rows.map((row) => [row.id, row])));
  }

  const upsertRows = setOperations.map((operation) => {
    const existingRow = existingRowsByCollection.get(operation.collectionName)?.get(operation.docId);
    const existingData =
      operation.merge === false
        ? {}
        : readJsonObject(existingRow?.data) ?? {};

    return {
      collection_name: operation.collectionName,
      id: operation.docId,
      data: sanitizeDocumentData({
        ...existingData,
        ...operation.data,
        updatedAt: now,
      }),
      created_at: existingRow?.created_at ?? now,
      updated_at: now,
    };
  });

  let completedBatches = 0;

  for (let index = 0; index < upsertRows.length; index += chunkSize) {
    const chunk = upsertRows.slice(index, index + chunkSize);
    if (chunk.length === 0) {
      continue;
    }

    const { error } = await client.from(SUPABASE_DOCUMENT_STORE_TABLE).upsert(chunk, {
      onConflict: "collection_name,id",
    });

    if (error) {
      throw error;
    }

    completedBatches += 1;
  }

  const deleteGroups = new Map<string, string[]>();
  for (const operation of deleteOperations) {
    const currentDocIds = deleteGroups.get(operation.collectionName) ?? [];
    currentDocIds.push(operation.docId);
    deleteGroups.set(operation.collectionName, currentDocIds);
  }

  for (const [collectionName, docIds] of deleteGroups) {
    const uniqueDocIds = Array.from(new Set(docIds));

    for (let index = 0; index < uniqueDocIds.length; index += chunkSize) {
      const chunk = uniqueDocIds.slice(index, index + chunkSize);
      const { error } = await client
        .from(SUPABASE_DOCUMENT_STORE_TABLE)
        .delete()
        .eq("collection_name", collectionName)
        .in("id", chunk);

      if (error) {
        throw error;
      }

      completedBatches += 1;
    }
  }

  return {
    committedOperations: operations.length,
    batches: completedBatches,
  };
}
