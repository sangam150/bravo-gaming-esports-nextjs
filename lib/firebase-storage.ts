import admin from "firebase-admin";
import { getFirebaseApp, isFirebaseConfigured } from "./firebase";

function getBucket() {
  if (!isFirebaseConfigured()) throw new Error("Firebase not configured");
  const app = getFirebaseApp();
  if (!app) throw new Error("Firebase app not initialized");
  const bucketName =
    process.env.FIREBASE_STORAGE_BUCKET ||
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
    `${process.env.FIREBASE_PROJECT_ID}.appspot.com`;
  return admin.storage(app).bucket(bucketName);
}

export async function uploadToStorage(
  buffer: Buffer,
  path: string,
  contentType: string
): Promise<string> {
  const bucket = getBucket();
  const file = bucket.file(path);
  await file.save(buffer, {
    metadata: { contentType },
    public: true,
  });
  return `https://storage.googleapis.com/${bucket.name}/${path}`;
}

export function buildStoragePath(
  type: "team_logo" | "player_avatar" | "tournament_banner" | "match_screenshot",
  entityId: string,
  filename: string
) {
  const safe = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `${type}/${entityId}/${Date.now()}_${safe}`;
}
