import admin from "firebase-admin";
import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { getFirebaseApp, getStorageBucketCandidates, isFirebaseConfigured } from "./firebase";

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

async function uploadToLocalDisk(buffer: Buffer, filePath: string) {
  const diskPath = path.join(process.cwd(), "public", "uploads", ...filePath.split("/"));
  await mkdir(path.dirname(diskPath), { recursive: true });
  await writeFile(diskPath, buffer);
  return `/uploads/${filePath}`;
}

export async function uploadToStorage(
  buffer: Buffer,
  filePath: string,
  contentType: string
): Promise<string> {
  if (isFirebaseConfigured()) {
    const bucketNames = getStorageBucketCandidates();
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
      return uploadToLocalDisk(buffer, filePath);
    }
  }

  return uploadToLocalDisk(buffer, filePath);
}

export function buildStoragePath(
  type: "team_logo" | "player_avatar" | "tournament_banner" | "match_screenshot",
  entityId: string,
  filename: string
) {
  const safeEntityId = entityId.replace(/[^a-zA-Z0-9_-]/g, "_").replace(/_+/g, "_") || "general";
  const safeFilename = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `${type}/${safeEntityId}/${Date.now()}_${safeFilename}`;
}
