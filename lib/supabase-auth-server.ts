import { cookies } from "next/headers";
import { getSupabaseServiceRoleClient } from "./supabase/service-role-client";
import type { Tables } from "@/types/database.types";

const ADMIN_ROLES = new Set(["super_admin", "admin", "moderator"]);
const PLATFORM_ROLES = new Set(["super_admin", "admin", "moderator", "team_igl", "caster", "viewer"]);

export const SESSION_COOKIE = "bravo_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 5; // 5 days

type ProfileRecord = Pick<Tables<"profiles">, "id" | "role" | "team_id" | "display_name">;
type LegacyUserRecord = Pick<Tables<"users">, "id" | "role" | "team_id" | "name">;
type KnownProfileRecord = ProfileRecord | LegacyUserRecord;

export type VerifiedSession = {
  profileId: string | null;
  uid: string;
  email: string;
  role: string;
  teamId: string | null;
  displayName: string | null;
  isAdmin: boolean;
};

export function isAdminRole(role: string | null | undefined) {
  return Boolean(role && ADMIN_ROLES.has(role));
}

export function getAdminEmails(): string[] {
  return (process.env.ADMIN_EMAIL || "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
}

function isConfiguredAdminEmail(email: string) {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) {
    return false;
  }

  return getAdminEmails().includes(normalizedEmail);
}

function isProfileRecord(record: KnownProfileRecord | null): record is ProfileRecord {
  return Boolean(record && "display_name" in record);
}

function isLegacyUserRecord(record: KnownProfileRecord | null): record is LegacyUserRecord {
  return Boolean(record && "name" in record);
}

async function getProfileFromProfiles(authUserId: string): Promise<ProfileRecord | null> {
  const client = getSupabaseServiceRoleClient();
  const { data, error } = await client
    .from("profiles")
    .select("id,role,team_id,display_name")
    .eq("auth_user_id", authUserId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data ?? null) as ProfileRecord | null;
}

async function getProfileFromUsers(authUserId: string): Promise<LegacyUserRecord | null> {
  const client = getSupabaseServiceRoleClient();
  const { data, error } = await client
    .from("users")
    .select("id,role,team_id,name")
    .eq("auth_user_id", authUserId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data ?? null) as LegacyUserRecord | null;
}

async function getUserProfileRecord(authUserId: string) {
  try {
    return await getProfileFromProfiles(authUserId);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    if (!/profiles/i.test(message)) {
      throw error;
    }
  }

  return getProfileFromUsers(authUserId).catch(() => null);
}

function normalizeRole(role: string | null | undefined, email: string) {
  if (role && PLATFORM_ROLES.has(role)) {
    return role;
  }

  return isConfiguredAdminEmail(email) ? "admin" : "viewer";
}

function resolveVerifiedSession(input: {
  uid: string;
  email: string;
  profileRecord: KnownProfileRecord | null;
}) {
  const role = normalizeRole(input.profileRecord?.role, input.email);

  return {
    profileId: input.profileRecord?.id ?? null,
    uid: input.uid,
    email: input.email,
    role,
    teamId: input.profileRecord?.team_id ?? null,
    displayName: isProfileRecord(input.profileRecord)
      ? input.profileRecord.display_name ?? null
      : isLegacyUserRecord(input.profileRecord)
      ? input.profileRecord.name ?? null
      : null,
    isAdmin: isAdminRole(role),
  } satisfies VerifiedSession;
}

export async function verifyAccessToken(accessToken: string) {
  const client = getSupabaseServiceRoleClient();
  const {
    data: { user },
    error,
  } = await client.auth.getUser(accessToken);

  if (error) {
    throw error;
  }

  if (!user?.id || !user.email) {
    throw new Error("Unauthorized: invalid session");
  }

  const profileRecord = await getUserProfileRecord(user.id);

  return resolveVerifiedSession({
    uid: user.id,
    email: user.email,
    profileRecord,
  });
}

export async function verifyAdminToken(accessToken: string) {
  const session = await verifyAccessToken(accessToken);
  if (!session.isAdmin) {
    throw new Error("Unauthorized: not an admin user");
  }
  return session;
}

export async function createSessionCookie(accessToken: string, _expiresInMs: number) {
  await verifyAccessToken(accessToken);
  return accessToken;
}

export async function createAdminSessionCookie(accessToken: string, _expiresInMs: number) {
  await verifyAdminToken(accessToken);
  return accessToken;
}

export async function verifySessionCookie(sessionCookie: string) {
  return verifyAccessToken(sessionCookie);
}

export async function verifyAdminSessionCookie(sessionCookie: string) {
  return verifyAdminToken(sessionCookie);
}

export async function getServerSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  try {
    return await verifySessionCookie(token);
  } catch {
    return null;
  }
}

export async function getServerAdminSession() {
  const session = await getServerSession();
  return session?.isAdmin ? session : null;
}
