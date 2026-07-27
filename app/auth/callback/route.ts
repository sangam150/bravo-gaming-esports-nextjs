import { writeAuditLogFromRequest } from "@/lib/audit-logs";
import { readSafeAuthDestination, resolveAuthorizedAuthDestination } from "@/lib/auth-destinations";
import { extractDiscordUserId } from "@/lib/discord-auth";
import { completeDiscordLogin } from "@/lib/discord-login";
import { DiscordRoleSyncError } from "@/lib/discord-role-sync";
import { getSessionCookieMaxAge, REFRESH_COOKIE, SESSION_COOKIE, verifyAccessToken } from "@/lib/supabase-auth-server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

function callbackError(request: Request, category: string) {
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
  const cookieNames = (request.headers.get("cookie") ?? "")
    .split(";")
    .map((cookie) => cookie.split("=", 1)[0]?.trim())
    .filter((name): name is string => Boolean(name?.startsWith("sb-") && name.includes("-auth-token")));
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

async function rejectCallback(supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>, request: Request, category: string) {
  await supabase.auth.signOut({ scope: "local" }).catch(() => undefined);
  return callbackError(request, category);
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

  const isDiscordIdentity = Boolean(extractDiscordUserId(user));

  try {
    const requestedNext = readSafeAuthDestination(callbackUrl.searchParams.get("next"));
    const result = isDiscordIdentity ? await completeDiscordLogin(user) : null;
    const verifiedSession = result ? null : await verifyAccessToken(data.session.access_token);
    const destination = result
      ? requestedNext === result.redirectTo
        ? requestedNext
        : result.redirectTo
      : resolveAuthorizedAuthDestination(verifiedSession ?? {}, requestedNext);
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
    await writeAuditLogFromRequest(request, {
      action: isDiscordIdentity ? "discord_login" : "email_callback_login",
      entityType: "session",
      entityId: user.id,
      newValue: {
        role: result?.role ?? verifiedSession?.role,
        redirectTo: destination,
        method: isDiscordIdentity ? "discord_oauth" : "verified_email_callback",
      },
    });
    return response;
  } catch (callbackFailure) {
    const category = isDiscordIdentity
      ? callbackFailure instanceof DiscordRoleSyncError
        ? `discord_${callbackFailure.category}`
        : "discord_access_denied"
      : "email_callback_access_denied";
    return rejectCallback(supabase, request, category);
  }
}
