import { fetchDocumentCollection, getDocument, saveDocument } from "./document-store";
import { slugify } from "./slug-utils";

type SoftDeletableRecord = {
  id: string;
  slug?: string | null;
  deletedAt?: string | null;
  updatedAt?: string | null;
  createdAt?: string | null;
  published?: boolean | null;
  state?: string | null;
  status?: string | null;
};

function isSoftDeletedRecord(record?: { deletedAt?: string | null } | null) {
  return Boolean(record?.deletedAt);
}

export function filterSoftDeleted<T extends { deletedAt?: string | null }>(records: T[]) {
  return records.filter((record) => !isSoftDeletedRecord(record));
}

export async function ensureUniqueDocumentSlug(
  collectionName: string,
  desiredValue: string,
  currentId?: string | null,
  fallbackValue?: string,
) {
  const baseSlug = slugify(desiredValue || fallbackValue || "item");
  const records = await fetchDocumentCollection<SoftDeletableRecord>(collectionName, 2000).catch(() => []);
  const takenSlugs = new Set(
    records
      .filter((record) => record.id !== currentId && !isSoftDeletedRecord(record))
      .map((record) => record.slug?.trim().toLowerCase())
      .filter((value): value is string => Boolean(value)),
  );

  if (!takenSlugs.has(baseSlug)) {
    return baseSlug;
  }

  let suffix = 2;
  while (takenSlugs.has(`${baseSlug}-${suffix}`)) {
    suffix += 1;
  }

  return `${baseSlug}-${suffix}`;
}

export async function getDocumentByIdOrSlug<T extends SoftDeletableRecord>(
  collectionName: string,
  identifier: string,
  options: { includeDeleted?: boolean } = {},
) {
  const directMatch = await getDocument<T>(collectionName, identifier).catch(() => null);
  if (directMatch) {
    if (!options.includeDeleted && isSoftDeletedRecord(directMatch)) {
      return null;
    }
    return directMatch;
  }

  const records = await fetchDocumentCollection<T>(collectionName, 2000).catch(() => []);
  const normalizedIdentifier = identifier.trim().toLowerCase();
  const matchedRecord = records.find((record) => record.slug?.trim().toLowerCase() === normalizedIdentifier) ?? null;

  if (!matchedRecord) {
    return null;
  }

  if (!options.includeDeleted && isSoftDeletedRecord(matchedRecord)) {
    return null;
  }

  return matchedRecord;
}

export async function softDeleteDocumentEntity(collectionName: string, id: string, patch: Record<string, unknown> = {}) {
  const existing = await getDocument<Record<string, unknown> & SoftDeletableRecord>(collectionName, id);
  if (!existing) {
    return null;
  }

  const now = new Date().toISOString();
  const nextRecord = {
    ...existing,
    ...patch,
    deletedAt: now,
    updatedAt: now,
    published: false,
    state: existing.state === "published" ? "draft" : existing.state,
    status: existing.status === "published" ? "archived" : existing.status,
  };

  await saveDocument(collectionName, id, nextRecord);

  return {
    previous: existing,
    next: nextRecord,
  };
}
