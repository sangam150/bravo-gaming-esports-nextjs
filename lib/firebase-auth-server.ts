import admin from "firebase-admin";
import { getFirebaseApp, isFirebaseConfigured } from "./firebase";

export function getAdminAuth() {
  const app = getFirebaseApp();
  if (!app) throw new Error("Firebase Admin not configured");
  return admin.auth(app);
}

export function getAdminEmails(): string[] {
  return (process.env.ADMIN_EMAIL || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email: string): boolean {
  const allowed = getAdminEmails();
  if (allowed.length === 0) return false;
  return allowed.includes(email.toLowerCase());
}

export async function verifyAdminToken(idToken: string) {
  if (!isFirebaseConfigured()) {
    throw new Error("Firebase Admin is not configured");
  }
  const decoded = await getAdminAuth().verifyIdToken(idToken);
  if (!isAdminEmail(decoded.email || "")) {
    throw new Error("Unauthorized: not an admin user");
  }
  return decoded;
}

export async function ensureAdminCustomClaim(uid: string) {
  if (!isFirebaseConfigured()) {
    throw new Error("Firebase Admin is not configured");
  }

  const auth = getAdminAuth();
  const user = await auth.getUser(uid);
  if (user.customClaims?.admin === true) {
    return false;
  }

  await auth.setCustomUserClaims(uid, {
    ...user.customClaims,
    admin: true,
  });

  return true;
}

export async function createAdminSessionCookie(idToken: string, expiresInMs: number) {
  if (!isFirebaseConfigured()) {
    throw new Error("Firebase Admin is not configured");
  }

  await verifyAdminToken(idToken);
  return getAdminAuth().createSessionCookie(idToken, { expiresIn: expiresInMs });
}

export async function verifyAdminSessionCookie(sessionCookie: string) {
  if (!isFirebaseConfigured()) {
    throw new Error("Firebase Admin is not configured");
  }

  const decoded = await getAdminAuth().verifySessionCookie(sessionCookie, true);
  if (!isAdminEmail(decoded.email || "")) {
    throw new Error("Unauthorized: not an admin user");
  }

  return decoded;
}

export const SESSION_COOKIE = "bravo_admin_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 5; // 5 days
