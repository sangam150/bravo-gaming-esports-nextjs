import admin from "firebase-admin";
import { COLLECTIONS } from "./firestore-collections";

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;

function normalizePrivateKey(value?: string) {
  if (!value) return undefined;

  const trimmedValue = value.trim();
  if (!trimmedValue) return undefined;

  const unwrappedValue = trimmedValue.replace(/^['"]+|['"]+$/g, "");
  const withoutTrailingComma = unwrappedValue.replace(/,\s*$/, "");

  return withoutTrailingComma.replace(/\\n/g, "\n");
}

const privateKey = normalizePrivateKey(process.env.FIREBASE_PRIVATE_KEY);

export function getStorageBucketCandidates(projectIdOverride = projectId) {
  const candidates = [
    process.env.FIREBASE_STORAGE_BUCKET ||
      undefined,
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || undefined,
    projectIdOverride ? `${projectIdOverride}.appspot.com` : undefined,
    projectIdOverride ? `${projectIdOverride}.firebasestorage.app` : undefined,
  ].filter((value): value is string => Boolean(value?.trim()));

  return [...new Set(candidates)];
}

function resolveStorageBucket(projectIdOverride?: string) {
  return getStorageBucketCandidates(projectIdOverride)[0];
}

export { COLLECTIONS };

type FirestoreInput = Record<string, unknown> | unknown[] | string | number | boolean | null | undefined;

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
  return getFirebaseAppInternal();
}

export function isFirebaseConfigured(): boolean {
  return Boolean(projectId && clientEmail && privateKey);
}

function getFirebaseAppInternal() {
  if (admin.apps.length) {
    return admin.app();
  }

  if (!isFirebaseConfigured()) {
    return null;
  }

  const storageBucket = resolveStorageBucket(projectId);

  return admin.initializeApp({
    credential: admin.credential.cert({
      projectId: projectId!,
      clientEmail: clientEmail!,
      privateKey: privateKey!,
    }),
    storageBucket,
  });
}

export function getFirestore() {
  const app = getFirebaseAppInternal();
  if (!app) {
    throw new Error(
      "Firebase Admin is not configured. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY in your environment."
    );
  }
  return admin.firestore(app);
}

export async function fetchFirestoreCollection<T = Record<string, unknown>>(collectionName: string, limit = 100) {
  const db = getFirestore();
  const snapshot = await db.collection(collectionName).limit(limit).get();
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as T & { id: string }));
}

export async function getFirestoreDocument<T = Record<string, unknown>>(collectionName: string, docId: string) {
  const db = getFirestore();
  const doc = await db.collection(collectionName).doc(docId).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...doc.data() } as T & { id: string };
}

export async function saveFirestoreDocument(collectionName: string, docId: string, data: Record<string, unknown>) {
  const db = getFirestore();
  const docRef = db.collection(collectionName).doc(docId);
  const payload = sanitizeFirestoreData({ ...data, updatedAt: new Date().toISOString() });
  await docRef.set(payload, { merge: true });
  return { id: docId, collection: collectionName };
}

export async function createFirestoreDocument(collectionName: string, data: Record<string, unknown>, docId?: string) {
  const db = getFirestore();
  const docRef = docId ? db.collection(collectionName).doc(docId) : db.collection(collectionName).doc();
  const now = new Date().toISOString();
  const payload = sanitizeFirestoreData({ ...data, createdAt: now, updatedAt: now });
  await docRef.set(payload);
  return { id: docRef.id, collection: collectionName };
}

export async function deleteFirestoreDocument(collectionName: string, docId: string) {
  const db = getFirestore();
  await db.collection(collectionName).doc(docId).delete();
  return { id: docId, deleted: true };
}

export async function queryFirestoreCollection<T = Record<string, unknown>>(
  collectionName: string,
  field: string,
  value: string,
  limit = 50
) {
  const db = getFirestore();
  const snapshot = await db.collection(collectionName).where(field, "==", value).limit(limit).get();
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as T & { id: string }));
}
