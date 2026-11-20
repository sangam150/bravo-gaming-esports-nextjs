import type { User } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import "server-only";
import { AuthConfigurationError } from "./auth-errors";
import { isAdminRole as isAdminRoleHelper, isPlatformRole } from "./authz";
import { isSupabaseSessionCookieName } from "./supabase-auth-cookies";
import { getSupabaseServiceRoleClient } from "./supabase/service-role-client";
import { getAuthProfileIdentity } from "./supabase/profile-identity";
import { createSupabaseServerClient } from "./supabase/server";

export const SESSION_COOKIE = "bravo_session";
export const REFRESH_COOKIE = "bravo_refresh";
const SESSION_MAX_AGE = 60 * 60 * 24 * 5; // 5 days

type ProfileRecord = {
  id: string;
  role: string;
  role_source: string;
  team_id: string | null;
  player_id: string | null;
  display_name: string | null;
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

function isAdminRole(role: string | null | undefined) {
  return isAdminRoleHelper(role);
}

async function getProfileFromProfiles(authUserId: string): Promise<ProfileRecord | null> {
  const client = getSupabaseServiceRoleClient();
  const profile = await getAuthProfileIdentity(client, authUserId);
  return profile
    ? {
        id: profile.id,
        role: profile.role,
        role_source: profile.roleSource,
        team_id: profile.teamId,
        player_id: profile.playerId,
        display_name: profile.displayName,
        is_active: profile.isActive,
      }
    : null;
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

async function resolveVerifiedUser(user: User | null) {
  if (!user?.id || !user.email) {
    throw new Error("Unauthorized: invalid session");
  }

  const profileRecord = await getProfileFromProfiles(user.id);
  if (!profileRecord) {
    throw new AuthConfigurationError("profile_missing", "Your account has not been fully configured. Please contact the Bravo owner.");
  }
  if (!profileRecord.role) {
    throw new AuthConfigurationError("role_missing", "Your account access has not been configured. Please contact the Bravo owner.");
  }
  if (!isPlatformRole(profileRecord.role)) {
    throw new AuthConfigurationError("role_invalid", "Your account access has not been configured. Please contact the Bravo owner.");
  }
  if (!profileRecord.is_active) {
    throw new AuthConfigurationError("account_inactive", "This account is currently inactive. Please contact the Bravo owner.");
  }
  const relationalDiscordAuthorizationEnabled = process.env.DISCORD_RELATIONAL_TEAM_AUTH_ENABLED?.trim().toLowerCase() === "true";
  const roleIsTrusted = profileRecord.role_source !== "discord_sync" || relationalDiscordAuthorizationEnabled;
  const role = roleIsTrusted ? profileRecord.role : "viewer";

  return {
    profileId: profileRecord.id,
    uid: user.id,
    email: user.email,
    role,
    teamId: roleIsTrusted ? profileRecord.team_id : null,
    playerId: roleIsTrusted ? profileRecord.player_id : null,
    displayName: profileRecord.display_name,
    isAdmin: isAdminRole(role),
    accountStatus: "active",
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

  return resolveVerifiedUser(user);
}

export async function createSessionCookie(accessToken: string, _expiresInMs: number) {
  void _expiresInMs;
  await verifyAccessToken(accessToken);
  return accessToken;
}

export async function verifySessionCookie(sessionCookie: string) {
  return verifyAccessToken(sessionCookie);
}

export async function getServerSession() {
  const cookieStore = await cookies();
  const hasSupabaseCookie = cookieStore.getAll().some((cookie) => isSupabaseSessionCookieName(cookie.name));
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (!error && user) {
      return await resolveVerifiedUser(user);
    }
  } catch {
    // Fall through to the short-lived compatibility cookie during migration.
  }

  if (hasSupabaseCookie) return null;
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
