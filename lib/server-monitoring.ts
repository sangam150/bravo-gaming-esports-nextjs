import { COLLECTIONS, createFirestoreDocument, fetchFirestoreCollection, isFirebaseConfigured } from "./firebase";
import type { ErrorLogRecord } from "./types";

function serializeError(error: unknown) {
  if (error instanceof Error) {
    return {
      message: error.message,
      stack: error.stack,
      name: error.name,
    };
  }

  return {
    message: String(error),
  };
}

export async function logServerError(
  scope: string,
  error: unknown,
  request?: Request,
  extra?: Record<string, unknown>
) {
  const serialized = serializeError(error);
  const url = request ? new URL(request.url) : null;
  const payload: Omit<ErrorLogRecord, "id"> = {
    scope,
    message: serialized.message,
    stack: serialized.stack,
    errorName: serialized.name,
    method: request?.method,
    pathname: url?.pathname,
    search: url?.search || undefined,
    createdAt: new Date().toISOString(),
    details: extra,
  };

  console.error(`[${scope}]`, payload);

  if (!isFirebaseConfigured()) return;

  try {
    await createFirestoreDocument(COLLECTIONS.errorLogs, payload as unknown as Record<string, unknown>);
  } catch (loggingError) {
    console.error("[server-monitoring] failed to persist error log", serializeError(loggingError));
  }
}

export async function getRecentErrorLogs(limit = 25): Promise<ErrorLogRecord[]> {
  if (!isFirebaseConfigured()) return [];

  try {
    const records = await fetchFirestoreCollection<ErrorLogRecord>(COLLECTIONS.errorLogs, limit);
    return records.sort((firstRecord, secondRecord) =>
      (secondRecord.createdAt ?? "").localeCompare(firstRecord.createdAt ?? "")
    );
  } catch {
    return [];
  }
}
