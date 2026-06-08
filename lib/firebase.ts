import admin from "firebase-admin";

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

export const COLLECTIONS = {
  tournaments: "tournaments",
  teams: "teams",
  players: "players",
  announcements: "announcements",
  registrations: "registrations",
  tournamentMatches: "tournamentMatches",
  scrims: "scrims",
  matchResults: "matchResults",
  uploads: "uploads",
  siteStats: "siteStats",
  streams: "streams",
  videos: "videos",
  pubgMatches: "pubgMatches",
  pubgPlayers: "pubgPlayers",
} as const;

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

  const storageBucket =
    process.env.FIREBASE_STORAGE_BUCKET ||
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
    `${projectId}.appspot.com`;

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
  const payload = { ...data, updatedAt: new Date().toISOString() };
  await docRef.set(payload, { merge: true });
  return { id: docId, collection: collectionName };
}

export async function createFirestoreDocument(collectionName: string, data: Record<string, unknown>, docId?: string) {
  const db = getFirestore();
  const docRef = docId ? db.collection(collectionName).doc(docId) : db.collection(collectionName).doc();
  const now = new Date().toISOString();
  const payload = { ...data, createdAt: now, updatedAt: now };
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
