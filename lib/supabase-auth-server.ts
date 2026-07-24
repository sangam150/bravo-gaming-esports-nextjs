import "server-only";
import { cookies } from "next/headers";
import { isAdminRole as isAdminRoleHelper, isPlatformRole } from "./authz";
import { extractDiscordUserId } from "./discord-auth";
import { getSupabaseServiceRoleClient } from "./supabase/service-role-client";
import type { Tables } from "@/types/database.types";
import { AuthConfigurationError } from "./auth-errors";

export const SESSION_COOKIE = "bravo_session";
export const REFRESH_COOKIE = "bravo_refresh";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 5; // 5 days

type ProfileRecord = Pick<Tables<"profiles">, "id" | "role" | "team_id" | "player_id" | "display_name" | "discord_user_id"> & {
  is_active: boolean;
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
  accountStatus: "active";
};

export function isAdminRole(role: string | null | undefined) {
  return isAdminRoleHelper(role);
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

async function getProfileFromProfiles(authUserId: string): Promise<ProfileRecord | null> {
  const client = getSupabaseServiceRoleClient();
  const { data, error } = await client
    .from("profiles")
    .select("id,role,team_id,player_id,display_name,discord_user_id,is_active")
    .eq("auth_user_id", authUserId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data ?? null) as ProfileRecord | null;
}

async function getProfileFromDiscordUserId(discordUserId: string): Promise<ProfileRecord | null> {
  const client = getSupabaseServiceRoleClient();
  const { data, error } = await client
    .from("profiles")
    .select("id,role,team_id,player_id,display_name,discord_user_id,is_active")
    .eq("discord_user_id", discordUserId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data ?? null) as ProfileRecord | null;
}

async function getUserProfileRecord(authUserId: string, discordUserId?: string | null) {
  try {
    const profileRecord = await getProfileFromProfiles(authUserId);
    if (profileRecord) {
      return profileRecord;
    }

    if (discordUserId) {
      return await getProfileFromDiscordUserId(discordUserId);
    }

    return null;
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    if (!/profiles/i.test(message)) {
      throw error;
    }
  }

  return null;
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

  const profileRecord = await getUserProfileRecord(user.id, extractDiscordUserId(user));
  if (!profileRecord) {
    throw new AuthConfigurationError(
      "profile_missing",
      "Your account has not been fully configured. Please contact the Bravo owner."
    );
  }
  if (!profileRecord.role) {
    throw new AuthConfigurationError(
      "role_missing",
      "Your account access has not been configured. Please contact the Bravo owner."
    );
  }
  if (!isPlatformRole(profileRecord.role)) {
    throw new AuthConfigurationError(
      "role_invalid",
      "Your account access has not been configured. Please contact the Bravo owner."
    );
  }
  if (!profileRecord.is_active) {
    throw new AuthConfigurationError(
      "account_inactive",
      "This account is currently inactive. Please contact the Bravo owner."
    );
  }

  return {
    profileId: profileRecord.id,
    uid: user.id,
    email: user.email,
    role: profileRecord.role,
    teamId: profileRecord.team_id,
    playerId: profileRecord.player_id,
    displayName: profileRecord.display_name,
    isAdmin: isAdminRole(profileRecord.role),
    accountStatus: "active",
  } satisfies VerifiedSession;
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
