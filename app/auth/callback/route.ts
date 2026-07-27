import { writeAuditLogFromRequest } from "@/lib/audit-logs";
import { completeDiscordLogin } from "@/lib/discord-login";
import { DiscordRoleSyncError } from "@/lib/discord-role-sync";
import { getSessionCookieMaxAge, REFRESH_COOKIE, SESSION_COOKIE } from "@/lib/supabase-auth-server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

const SAFE_NEXT_PATHS = new Set(["/", "/admin", "/team", "/dashboard/player"]);

function safeNextPath(value: string | null) {
  return value && SAFE_NEXT_PATHS.has(value) ? value : null;
}

function callbackError(request: Request, category: string) {
  const url = new URL("/login", request.url);
  url.searchParams.set("error", category);
  return NextResponse.redirect(url, 303);
}

export async function GET(request: Request) {
  const callbackUrl = new URL(request.url);
  if (callbackUrl.searchParams.get("error")) {
    return callbackError(request, "oauth_cancelled");
  }

  const code = callbackUrl.searchParams.get("code");
  if (!code) {
    return callbackError(request, "callback_code_missing");
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.session?.access_token) {
    return callbackError(request, "callback_exchange_failed");
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    return callbackError(request, "identity_verification_failed");
  }

  try {
    const result = await completeDiscordLogin(user, data.session.access_token);
    const requestedNext = safeNextPath(callbackUrl.searchParams.get("next"));
    const destination = requestedNext === result.redirectTo ? requestedNext : result.redirectTo;
    const response = NextResponse.redirect(new URL(destination, request.url), 303);
    const maxAge = getSessionCookieMaxAge(data.session.access_token);
    response.cookies.set(SESSION_COOKIE, data.session.access_token, {
      httpOnly: true,
      maxAge,
      path: "/",
      priority: "high",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });
    response.cookies.set(REFRESH_COOKIE, data.session.refresh_token, {
      httpOnly: true,
      maxAge: 60 * 60 * 24 * 5,
      path: "/",
      priority: "high",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });
    await writeAuditLogFromRequest(request, {
      action: "discord_login",
      entityType: "session",
      entityId: user.id,
      newValue: { role: result.role, redirectTo: destination },
    });
    return response;
  } catch (callbackFailure) {
    const category = callbackFailure instanceof DiscordRoleSyncError ? `discord_${callbackFailure.category}` : "discord_access_denied";
    return callbackError(request, category);
  }
}
