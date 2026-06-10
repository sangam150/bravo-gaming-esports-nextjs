import admin from "firebase-admin";
import { randomUUID } from "crypto";
import { getFirebaseApp, getStorageBucketCandidates, isFirebaseConfigured } from "./firebase";
import {
  sanitizeStorageSegment,
  sanitizeUploadFileName,
  STORAGE_DIRECTORY_BY_TYPE,
  type UploadType,
} from "./upload-config";

function isMissingBucketError(error: unknown) {
  if (!(error instanceof Error)) return false;

  const maybeCode = (error as Error & { code?: number | string }).code;
  return (
    maybeCode === 404 ||
    maybeCode === "404" ||
    error.message.toLowerCase().includes("specified bucket does not exist")
  );
}

function buildFirebaseDownloadUrl(bucketName: string, filePath: string, token: string) {
  return `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodeURIComponent(filePath)}?alt=media&token=${token}`;
}

function isMissingFileError(error: unknown) {
  if (!(error instanceof Error)) return false;

  const maybeCode = (error as Error & { code?: number | string }).code;
  return (
    maybeCode === 404 ||
    maybeCode === "404" ||
    error.message.toLowerCase().includes("no such object")
  );
}

async function uploadToFirebaseBucket(
  bucketName: string,
  buffer: Buffer,
  filePath: string,
  contentType: string
) {
  const app = getFirebaseApp();
  if (!app) throw new Error("Firebase app not initialized");

  const downloadToken = randomUUID();
  const bucket = admin.storage(app).bucket(bucketName);
  const file = bucket.file(filePath);

  await file.save(buffer, {
    metadata: {
      contentType,
      metadata: {
        firebaseStorageDownloadTokens: downloadToken,
      },
    },
    resumable: false,
  });

  return buildFirebaseDownloadUrl(bucket.name, filePath, downloadToken);
}

function getStorageConfigurationError() {
  return new Error(
    "Firebase Storage is required for uploads. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY, and FIREBASE_STORAGE_BUCKET."
  );
}

function parseFirebaseDownloadUrl(url: string) {
  try {
    const parsedUrl = new URL(url);
    if (parsedUrl.hostname !== "firebasestorage.googleapis.com") return null;

    const match = parsedUrl.pathname.match(/^\/v0\/b\/([^/]+)\/o\/(.+)$/);
    if (!match) return null;

    return {
      bucketName: decodeURIComponent(match[1]),
      filePath: decodeURIComponent(match[2]),
    };
  } catch {
    return null;
  }
}

export async function uploadToStorage(
  buffer: Buffer,
  filePath: string,
  contentType: string
): Promise<string> {
  if (isFirebaseConfigured()) {
    const bucketNames = getStorageBucketCandidates();
    if (bucketNames.length === 0) {
      throw getStorageConfigurationError();
    }

    let missingBucketCount = 0;

    for (const bucketName of bucketNames) {
      try {
        return await uploadToFirebaseBucket(bucketName, buffer, filePath, contentType);
      } catch (error: unknown) {
        if (isMissingBucketError(error)) {
          missingBucketCount += 1;
          continue;
        }
        throw error;
      }
    }

    if (bucketNames.length > 0 && missingBucketCount === bucketNames.length) {
      throw new Error(
        `Firebase Storage bucket not found. Checked: ${bucketNames.join(", ")}. Set FIREBASE_STORAGE_BUCKET to your active bucket name.`
      );
    }
  }

  throw getStorageConfigurationError();
}

export function buildStoragePath(
  type: UploadType,
  entityId: string,
  filename: string
) {
  const directory = STORAGE_DIRECTORY_BY_TYPE[type];
  const safeEntityId = sanitizeStorageSegment(entityId);
  const safeFilename = sanitizeUploadFileName(filename);
  return `${directory}/${safeEntityId}/${randomUUID()}_${safeFilename}`;
}

export async function deleteFromStorageByUrl(url: string | null | undefined) {
  if (!url) return false;

  const parsed = parseFirebaseDownloadUrl(url);
  if (!parsed) return false;

  const app = getFirebaseApp();
  if (!app) return false;

  try {
    await admin.storage(app).bucket(parsed.bucketName).file(parsed.filePath).delete();
    return true;
  } catch (error: unknown) {
    if (isMissingFileError(error)) {
      return false;
    }

    throw error;
  }
}
