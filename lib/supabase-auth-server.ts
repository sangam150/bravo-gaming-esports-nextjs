import "server-only";
import { cookies } from "next/headers";
import type { User } from "@supabase/supabase-js";
import { isAdminRole as isAdminRoleHelper, isPlatformRole } from "./authz";
import { getSupabaseServiceRoleClient } from "./supabase/service-role-client";
import type { Tables } from "@/types/database.types";

export const SESSION_COOKIE = "bravo_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 5; // 5 days

type ProfileRecord = Pick<Tables<"profiles">, "id" | "role" | "team_id" | "display_name">;
type LegacyUserRecord = Pick<Tables<"users">, "id" | "role" | "team_id" | "name">;
type KnownProfileRecord = ProfileRecord | LegacyUserRecord;
type ResolvedIdentityOverride = {
  role: string | null;
  teamId: string | null;
  playerId: string | null;
  displayName: string | null;
};
type ConfiguredIdentityOverride = {
  uid?: string;
  email?: string;
  role?: string | null;
  teamId?: string | null;
  team_id?: string | null;
  playerId?: string | null;
  player_id?: string | null;
  displayName?: string | null;
  display_name?: string | null;
  name?: string | null;
};

export type VerifiedSession = {
  profileId: string | null;
  uid: string;
  email: string;
  role: string;
  teamId: string | null;
  playerId: string | null;
  displayName: string | null;
  isAdmin: boolean;
};

export function isAdminRole(role: string | null | undefined) {
  return isAdminRoleHelper(role);
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

function normalizeTextValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    return typeof message === "string" ? message : String(error);
  }

  return String(error);
}

function extractIdentityOverride(payload: Record<string, unknown> | null | undefined): ResolvedIdentityOverride {
  if (!payload) {
    return {
      role: null,
      teamId: null,
      playerId: null,
      displayName: null,
    };
  }

  const role = normalizeTextValue(payload.role);
  return {
    role: isPlatformRole(role) ? role : null,
    teamId: normalizeTextValue(payload.teamId) ?? normalizeTextValue(payload.team_id),
    playerId: normalizeTextValue(payload.playerId) ?? normalizeTextValue(payload.player_id),
    displayName:
      normalizeTextValue(payload.displayName) ??
      normalizeTextValue(payload.display_name) ??
      normalizeTextValue(payload.name),
  };
}

let cachedConfiguredIdentityOverrides: ConfiguredIdentityOverride[] | null = null;

function getConfiguredIdentityOverrides() {
  if (cachedConfiguredIdentityOverrides) {
    return cachedConfiguredIdentityOverrides;
  }

  const raw = process.env.SUPABASE_AUTH_PROFILE_OVERRIDES_JSON?.trim();
  if (!raw) {
    cachedConfiguredIdentityOverrides = [];
    return cachedConfiguredIdentityOverrides;
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed)) {
      cachedConfiguredIdentityOverrides = parsed.filter(
        (value): value is ConfiguredIdentityOverride => typeof value === "object" && value !== null
      );
      return cachedConfiguredIdentityOverrides;
    }

    if (parsed && typeof parsed === "object") {
      cachedConfiguredIdentityOverrides = Object.entries(parsed).flatMap(([key, value]) => {
        if (!value || typeof value !== "object") {
          return [];
        }

        return [
          {
            ...(key.includes("@") ? { email: key } : { uid: key.replace(/^uid:/i, "") }),
            ...(value as ConfiguredIdentityOverride),
          },
        ];
      });
      return cachedConfiguredIdentityOverrides;
    }
  } catch {
    /* ignore malformed overrides and continue with profile-backed auth */
  }

  cachedConfiguredIdentityOverrides = [];
  return cachedConfiguredIdentityOverrides;
}

function getConfiguredIdentityOverride(uid: string, email: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const match = getConfiguredIdentityOverrides().find((entry) => {
    const entryUid = entry.uid?.trim();
    const entryEmail = entry.email?.trim().toLowerCase();
    return entryUid === uid || entryEmail === normalizedEmail;
  });

  return extractIdentityOverride(match ? (match as Record<string, unknown>) : null);
}

function getAuthMetadataOverride(user: User) {
  const appMetadata = extractIdentityOverride(
    user.app_metadata && typeof user.app_metadata === "object"
      ? (user.app_metadata as Record<string, unknown>)
      : null
  );
  const userMetadata =
    user.user_metadata && typeof user.user_metadata === "object"
      ? (user.user_metadata as Record<string, unknown>)
      : null;

  return {
    role: appMetadata.role,
    teamId: appMetadata.teamId,
    playerId: appMetadata.playerId,
    displayName: appMetadata.displayName ?? normalizeTextValue(userMetadata?.display_name) ?? normalizeTextValue(userMetadata?.name),
  } satisfies ResolvedIdentityOverride;
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
    const message = getErrorMessage(error);
    if (!/profiles/i.test(message)) {
      throw error;
    }
  }

  return getProfileFromUsers(authUserId).catch(() => null);
}

function normalizeRole(role: string | null | undefined, email: string) {
  if (isPlatformRole(role)) {
    return role;
  }

  return isConfiguredAdminEmail(email) ? "admin" : "viewer";
}

function resolveVerifiedSession(input: {
  user: User;
  profileRecord: KnownProfileRecord | null;
}) {
  const metadataOverride = getAuthMetadataOverride(input.user);
  const configuredOverride = getConfiguredIdentityOverride(input.user.id, input.user.email ?? "");
  const role = normalizeRole(
    input.profileRecord?.role ?? metadataOverride.role ?? configuredOverride.role,
    input.user.email ?? ""
  );

  return {
    profileId: input.profileRecord?.id ?? null,
    uid: input.user.id,
    email: input.user.email ?? "",
    role,
    teamId: input.profileRecord?.team_id ?? metadataOverride.teamId ?? configuredOverride.teamId ?? null,
    playerId: metadataOverride.playerId ?? configuredOverride.playerId ?? null,
    displayName: isProfileRecord(input.profileRecord)
      ? input.profileRecord.display_name ?? null
      : isLegacyUserRecord(input.profileRecord)
      ? input.profileRecord.name ?? null
      : metadataOverride.displayName ?? configuredOverride.displayName ?? null,
    isAdmin: isAdminRole(role),
  } satisfies VerifiedSession;
}

function canProvisionProfile(session: VerifiedSession) {
  return Boolean(
    !session.profileId &&
      session.email &&
      (session.isAdmin || session.role === "team_igl")
  );
}

async function maybeProvisionProfile(user: User, session: VerifiedSession) {
  if (!canProvisionProfile(session) || !user.email) {
    return null;
  }

  const client = getSupabaseServiceRoleClient();
  const profilePayload = {
    auth_user_id: user.id,
    email: user.email,
    role: session.role as Tables<"profiles">["role"],
    team_id: session.teamId,
    display_name: session.displayName,
    updated_at: new Date().toISOString(),
  };

  try {
    const { data, error } = await client
      .from("profiles")
      .upsert(
        profilePayload,
        { onConflict: "auth_user_id" }
      )
      .select("id,role,team_id,display_name")
      .maybeSingle();

    if (error) {
      throw error;
    }

    return (data ?? null) as ProfileRecord | null;
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    if (!/profiles_id_fkey|auth\.users|table \"users\"/i.test(message)) {
      return null;
    }

    try {
      const { data, error: retryError } = await client
        .from("profiles")
        .upsert(
          {
            id: user.id,
            ...profilePayload,
          },
          { onConflict: "auth_user_id" }
        )
        .select("id,role,team_id,display_name")
        .maybeSingle();

      if (retryError) {
        throw retryError;
      }

      return (data ?? null) as ProfileRecord | null;
    } catch {
      return null;
    }
  }
}

function decodeJwtPayload(accessToken: string) {
  const payload = accessToken.split(".")[1];
  if (!payload) {
    return null;
  }

  const normalizedPayload = payload.replace(/-/g, "+").replace(/_/g, "/");
  const paddedPayload = normalizedPayload.padEnd(Math.ceil(normalizedPayload.length / 4) * 4, "=");

  return JSON.parse(Buffer.from(paddedPayload, "base64").toString("utf8")) as {
    exp?: number;
  };
}

export function getSessionCookieMaxAge(accessToken: string) {
  try {
    const payload = decodeJwtPayload(accessToken);
    if (typeof payload?.exp !== "number") {
      return SESSION_MAX_AGE;
    }

    const remainingSeconds = Math.floor(payload.exp - Date.now() / 1000);
    if (remainingSeconds <= 0) {
      return 1;
    }

    return Math.min(SESSION_MAX_AGE, remainingSeconds);
  } catch {
    return SESSION_MAX_AGE;
  }
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
  const resolvedSession = resolveVerifiedSession({
    user,
    profileRecord,
  });
  const provisionedProfileRecord = await maybeProvisionProfile(user, resolvedSession);

  return resolveVerifiedSession({
    user,
    profileRecord: provisionedProfileRecord ?? profileRecord,
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
