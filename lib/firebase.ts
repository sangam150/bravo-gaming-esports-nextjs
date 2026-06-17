import { randomUUID } from "crypto";
import { COLLECTIONS } from "./firestore-collections";
import { getRequestedServerDataBackend } from "./data-backend";
import { isSupabaseServiceRoleConfigured } from "./supabase/env";
import { getSupabaseServiceRoleClient } from "./supabase/service-role-client";
import {
  SUPABASE_DOCUMENT_STORE_TABLE,
  isSupabaseDocumentStoreMissingError,
  mapSupabaseDocumentStoreRow,
  type SupabaseDocumentStoreRow,
} from "./supabase/document-store";

export { COLLECTIONS };

export type FirestoreWriteOperation =
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

type FirestoreInput =
  | Record<string, unknown>
  | unknown[]
  | string
  | number
  | boolean
  | null
  | undefined;

function sanitizeFirestoreValue(value: FirestoreInput): FirestoreInput {
  if (Array.isArray(value)) {
    return (value as FirestoreInput[])
      .map((item) => sanitizeFirestoreValue(item))
      .filter((item) => item !== undefined);
  }

  if (value && typeof value === "object" && !(value instanceof Date)) {
    return Object.fromEntries(
      Object.entries(value)
        .map(([key, nestedValue]) => [key, sanitizeFirestoreValue(nestedValue as FirestoreInput)] as const)
        .filter((entry) => entry[1] !== undefined)
    );
  }

  return value;
}

export function sanitizeFirestoreData(data: Record<string, unknown>) {
  const { id: _ignoredId, ...payload } = data;
  return sanitizeFirestoreValue(payload) as Record<string, unknown>;
}

export function getFirebaseApp() {
  return null;
}

export function getStorageBucketCandidates() {
  return [];
}

export function isFirebaseAdminConfigured(): boolean {
  return isSupabaseServiceRoleConfigured();
}

// Legacy name kept because much of the app still imports this as the generic data-backend check.
export function isFirebaseConfigured(): boolean {
  return isSupabaseServiceRoleConfigured();
}

export function getFirestore() {
  throw new Error("Firebase has been removed. Use the Supabase-backed document store helpers instead.");
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
      const { error } = await client
        .from(SUPABASE_DOCUMENT_STORE_TABLE)
        .select("id", { head: true, count: "exact" })
        .limit(1);

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
    throw new Error("Firebase has been removed. Use the Supabase data backend.");
  }

  if (!isSupabaseServiceRoleConfigured()) {
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY."
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

async function fetchFirestoreCollectionFromSupabase<T = Record<string, unknown>>(collectionName: string, limit = 100) {
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

async function getFirestoreDocumentFromSupabase<T = Record<string, unknown>>(collectionName: string, docId: string) {
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

async function saveFirestoreDocumentToSupabase(collectionName: string, docId: string, data: Record<string, unknown>) {
  await requireSupabaseDocumentStore();

  const client = getSupabaseServiceRoleClient();
  const now = new Date().toISOString();
  const existingRows = await getSupabaseDocumentRows(collectionName, [docId]);
  const existingRow = existingRows[0];
  const existingData = existingRow?.data && typeof existingRow.data === "object" ? existingRow.data : {};
  const payload = sanitizeFirestoreData({
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

async function createFirestoreDocumentInSupabase(collectionName: string, data: Record<string, unknown>, docId?: string) {
  await requireSupabaseDocumentStore();

  const client = getSupabaseServiceRoleClient();
  const now = new Date().toISOString();
  const resolvedDocId = docId ?? randomUUID();
  const payload = sanitizeFirestoreData({
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

async function deleteFirestoreDocumentFromSupabase(collectionName: string, docId: string) {
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

function getComparableFieldValue(record: Record<string, unknown>, field: string) {
  return record[field];
}

async function queryFirestoreCollectionFromSupabase<T = Record<string, unknown>>(
  collectionName: string,
  field: string,
  value: string,
  limit = 50
) {
  const fetchedRows = await fetchFirestoreCollectionFromSupabase<T>(collectionName, Math.max(limit * 4, 200));
  return fetchedRows
    .filter((row) => {
      const comparableValue = getComparableFieldValue(row as unknown as Record<string, unknown>, field);
      return comparableValue === value;
    })
    .slice(0, limit);
}

async function commitFirestoreWriteOperationsToSupabase(operations: FirestoreWriteOperation[], chunkSize = 400) {
  await requireSupabaseDocumentStore();

  if (operations.length === 0) {
    return { committedOperations: 0, batches: 0 };
  }

  const client = getSupabaseServiceRoleClient();
  const now = new Date().toISOString();
  const setOperations = operations.filter(
    (operation): operation is Extract<FirestoreWriteOperation, { type: "set" }> => operation.type === "set"
  );
  const deleteOperations = operations.filter(
    (operation): operation is Extract<FirestoreWriteOperation, { type: "delete" }> => operation.type === "delete"
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
        : existingRow?.data && typeof existingRow.data === "object"
          ? existingRow.data
          : {};

    return {
      collection_name: operation.collectionName,
      id: operation.docId,
      data: sanitizeFirestoreData({
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
    if (chunk.length === 0) continue;

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

export async function fetchFirestoreCollection<T = Record<string, unknown>>(collectionName: string, limit = 100) {
  return fetchFirestoreCollectionFromSupabase<T>(collectionName, limit);
}

export async function getFirestoreDocument<T = Record<string, unknown>>(collectionName: string, docId: string) {
  return getFirestoreDocumentFromSupabase<T>(collectionName, docId);
}

export async function saveFirestoreDocument(collectionName: string, docId: string, data: Record<string, unknown>) {
  return saveFirestoreDocumentToSupabase(collectionName, docId, data);
}

export async function createFirestoreDocument(collectionName: string, data: Record<string, unknown>, docId?: string) {
  return createFirestoreDocumentInSupabase(collectionName, data, docId);
}

export async function deleteFirestoreDocument(collectionName: string, docId: string) {
  return deleteFirestoreDocumentFromSupabase(collectionName, docId);
}

export async function queryFirestoreCollection<T = Record<string, unknown>>(
  collectionName: string,
  field: string,
  value: string,
  limit = 50
) {
  return queryFirestoreCollectionFromSupabase<T>(collectionName, field, value, limit);
}

export async function commitFirestoreWriteOperations(operations: FirestoreWriteOperation[], chunkSize = 400) {
  return commitFirestoreWriteOperationsToSupabase(operations, chunkSize);
}
