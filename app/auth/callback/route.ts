import { writeAuditLogFromRequest } from "@/lib/audit-logs";
import { readSafeAuthDestination, resolveAuthorizedAuthDestination } from "@/lib/auth-destinations";
import { DISCORD_OAUTH_INTENT_COOKIE, extractDiscordUserId } from "@/lib/discord-auth";
import { completeDiscordLogin } from "@/lib/discord-login";
import { DiscordRoleSyncError } from "@/lib/discord-role-sync";
import { getSessionCookieMaxAge, REFRESH_COOKIE, SESSION_COOKIE, verifyAccessToken } from "@/lib/supabase-auth-server";
import { isSupabaseAuthCookieName } from "@/lib/supabase-auth-cookies";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

function callbackError(request: Request, category: string, currentAuthCookieNames: Iterable<string>) {
  const url = new URL("/login", request.url);
  url.searchParams.set("error", category);
  const response = NextResponse.redirect(url, 303);
  response.headers.set("Cache-Control", "private, no-store");
  response.cookies.set(SESSION_COOKIE, "", {
    expires: new Date(0),
    httpOnly: true,
    maxAge: 0,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
  response.cookies.set(REFRESH_COOKIE, "", {
    expires: new Date(0),
    httpOnly: true,
    maxAge: 0,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
  response.cookies.set(DISCORD_OAUTH_INTENT_COOKIE, "", {
    expires: new Date(0),
    httpOnly: true,
    maxAge: 0,
    path: "/auth/callback",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
  const cookieNames = new Set(
    (request.headers.get("cookie") ?? "")
      .split(";")
      .map((cookie) => cookie.split("=", 1)[0]?.trim())
      .filter((name): name is string => Boolean(name && isSupabaseAuthCookieName(name))),
  );
  for (const name of currentAuthCookieNames) cookieNames.add(name);
  for (const name of cookieNames) {
    response.cookies.set(name, "", {
      expires: new Date(0),
      httpOnly: true,
      maxAge: 0,
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });
  }
  return response;
}

function readRequestCookie(request: Request, name: string) {
  const encodedName = `${encodeURIComponent(name)}=`;
  const value = (request.headers.get("cookie") ?? "")
    .split(";")
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith(encodedName))
    ?.slice(encodedName.length);
  if (!value) return null;
  try {
    return decodeURIComponent(value);
  } catch {
    return null;
  }
}

function readAuthenticationMethods(accessToken: string) {
  try {
    const payload = accessToken.split(".")[1];
    if (!payload) return [];
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    const claims = JSON.parse(Buffer.from(padded, "base64").toString("utf8")) as { amr?: unknown };
    if (!Array.isArray(claims.amr)) return [];
    return claims.amr.flatMap((entry) => {
      if (!entry || typeof entry !== "object" || Array.isArray(entry)) return [];
      const method = (entry as { method?: unknown }).method;
      return typeof method === "string" ? [method.trim().toLowerCase()] : [];
    });
  } catch {
    return [];
  }
}

async function rejectCallback(supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>, request: Request, category: string) {
  const cookieStore = await cookies();
  // The code exchange can write new/chunked SSR cookies that were absent from
  // the incoming request. Keep their names even if SDK sign-out removes some
  // or returns an error without clearing its session.
  const authCookieNames = new Set(
    cookieStore.getAll().map((cookie) => cookie.name).filter(isSupabaseAuthCookieName),
  );
  await supabase.auth.signOut({ scope: "local" }).catch(() => undefined);
  for (const cookie of cookieStore.getAll()) {
    if (isSupabaseAuthCookieName(cookie.name)) authCookieNames.add(cookie.name);
  }
  return callbackError(request, category, authCookieNames);
}

export async function GET(request: Request) {
  const callbackUrl = new URL(request.url);
  const supabase = await createSupabaseServerClient();
  if (callbackUrl.searchParams.get("error")) {
    return rejectCallback(supabase, request, "oauth_cancelled");
  }

  const code = callbackUrl.searchParams.get("code");
  if (!code) {
    return rejectCallback(supabase, request, "callback_code_missing");
  }

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.session?.access_token) {
    return rejectCallback(supabase, request, "callback_exchange_failed");
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    return rejectCallback(supabase, request, "identity_verification_failed");
  }

  const requestedFlow = callbackUrl.searchParams.get("flow");
  const requestedIntent = callbackUrl.searchParams.get("intent");
  const storedIntent = readRequestCookie(request, DISCORD_OAUTH_INTENT_COOKIE);
  const hasValidDiscordIntent =
    requestedFlow === "discord" &&
    typeof requestedIntent === "string" &&
    /^[0-9a-f-]{36}$/i.test(requestedIntent) &&
    requestedIntent === storedIntent;
  const usedOAuth = readAuthenticationMethods(data.session.access_token).includes("oauth");
  const isDiscordFlow = hasValidDiscordIntent && usedOAuth;
  if ((requestedFlow === "discord" || usedOAuth) && !isDiscordFlow) {
    return rejectCallback(supabase, request, "oauth_intent_invalid");
  }
  if (isDiscordFlow && !extractDiscordUserId(user)) {
    return rejectCallback(supabase, request, "discord_identity_missing");
  }

  try {
    const requestedNext = readSafeAuthDestination(callbackUrl.searchParams.get("next"));
    const result = isDiscordFlow ? await completeDiscordLogin(user) : null;
    const verifiedSession = await verifyAccessToken(data.session.access_token);
    const preferredDestination = result ? (requestedNext === result.redirectTo ? requestedNext : result.redirectTo) : requestedNext;
    const destination = resolveAuthorizedAuthDestination(verifiedSession, preferredDestination);
    const destinationUrl = new URL(destination, request.url);
    if (result?.notice) {
      destinationUrl.searchParams.set("notice", result.notice);
    }
    const response = NextResponse.redirect(destinationUrl, 303);
    response.headers.set("Cache-Control", "private, no-store");
    const maxAge = getSessionCookieMaxAge(data.session.access_token);
    response.cookies.set(SESSION_COOKIE, data.session.access_token, {
      httpOnly: true,
      maxAge,
      path: "/",
      priority: "high",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });
    response.cookies.set(DISCORD_OAUTH_INTENT_COOKIE, "", {
      expires: new Date(0),
      httpOnly: true,
      maxAge: 0,
      path: "/auth/callback",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });
    await writeAuditLogFromRequest(request, {
      action: isDiscordFlow ? "discord_login" : "email_callback_login",
      entityType: "session",
      entityId: user.id,
      newValue: {
        role: verifiedSession.role,
        redirectTo: destination,
        method: isDiscordFlow ? "discord_oauth" : "verified_email_callback",
      },
    });
    return response;
  } catch (callbackFailure) {
    const category = isDiscordFlow
      ? callbackFailure instanceof DiscordRoleSyncError
        ? `discord_${callbackFailure.category}`
        : "discord_access_denied"
      : "email_callback_access_denied";
    return rejectCallback(supabase, request, category);
  }
}
