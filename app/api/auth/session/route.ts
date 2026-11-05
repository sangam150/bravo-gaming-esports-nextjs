import { writeAuditLogFromRequest } from "@/lib/audit-logs";
import { AuthConfigurationError } from "@/lib/auth-errors";
import { enforceRateLimit } from "@/lib/rate-limit";
import { requireSameOrigin } from "@/lib/request-origin";
import { logServerError } from "@/lib/server-monitoring";
import { createSessionCookie, getSessionCookieMaxAge, REFRESH_COOKIE, SESSION_COOKIE, verifyAccessToken } from "@/lib/supabase-auth-server";
import { isSupabaseAuthCookieName } from "@/lib/supabase-auth-cookies";
import { createSupabaseRouteClient } from "@/lib/supabase/server";
import { jsonErrorResponse, USER_FACING_ERROR_MESSAGES } from "@/lib/user-facing-errors";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

function expireAuthCookie(response: NextResponse, name: string, sameSite: "lax" | "strict") {
  response.cookies.set(name, "", {
    expires: new Date(0),
    httpOnly: true,
    maxAge: 0,
    path: "/",
    priority: "high",
    sameSite,
    secure: process.env.NODE_ENV === "production",
  });
}

export async function POST(request: Request) {
  const invalidOrigin = requireSameOrigin(request);
  if (invalidOrigin) return invalidOrigin;

  const limited = await enforceRateLimit(request, {
    key: "auth-session",
    maxRequests: 10,
    windowMs: 60_000,
  });
  if (limited) return limited;

  try {
    const body = await request.json();
    const accessToken = typeof body.accessToken === "string" ? body.accessToken : typeof body.idToken === "string" ? body.idToken : "";

    if (!accessToken) {
      return Response.json(
        {
          error: "A valid sign-in session is required before access can be granted.",
        },
        { status: 400 },
      );
    }
    const decoded = await verifyAccessToken(accessToken);
    const sessionCookieMaxAge = getSessionCookieMaxAge(accessToken);
    const sessionCookie = await createSessionCookie(accessToken, sessionCookieMaxAge * 1000);
    const response = Response.json(
      {
        success: true,
        authenticated: true,
        role: decoded.role,
        teamId: decoded.teamId,
        playerId: decoded.playerId,
        isAdmin: decoded.isAdmin,
        user: {
          profileId: decoded.profileId,
          uid: decoded.uid,
          email: decoded.email,
          role: decoded.role,
          teamId: decoded.teamId,
          playerId: decoded.playerId,
          displayName: decoded.displayName,
          isAdmin: decoded.isAdmin,
        },
      },
      { headers: { "Cache-Control": "private, no-store" } },
    );
    const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
    response.headers.append(
      "Set-Cookie",
      `${SESSION_COOKIE}=${sessionCookie}; Path=/; HttpOnly; SameSite=Strict; Priority=High; Max-Age=${sessionCookieMaxAge}${secure}`,
    );
    await writeAuditLogFromRequest(request, {
      action: "login",
      entityType: "session",
      entityId: decoded.uid,
      newValue: {
        email: decoded.email,
        role: decoded.role,
        teamId: decoded.teamId,
      },
    });
    return response;
  } catch (error: unknown) {
    if (error instanceof AuthConfigurationError) {
      return Response.json({ success: false, error: error.message }, { status: 403, headers: { "Cache-Control": "private, no-store" } });
    }
    await logServerError("auth.session.create", error, request);
    return jsonErrorResponse(error, {
      status: 401,
      fallback: USER_FACING_ERROR_MESSAGES.session,
    });
  }
}

export async function DELETE(request: NextRequest) {
  const invalidOrigin = requireSameOrigin(request);
  if (invalidOrigin) return invalidOrigin;

  const response = NextResponse.json({ success: true }, { headers: { "Cache-Control": "private, no-store" } });
  const supabaseCookieNames = new Set(
    request.cookies
      .getAll()
      .map((cookie) => cookie.name)
      .filter(isSupabaseAuthCookieName),
  );

  try {
    const supabase = createSupabaseRouteClient(request, response);
    await supabase.auth.signOut({ scope: "local" });
  } catch {
    // Explicit expiry below is authoritative even when the SDK cannot sign out.
  }

  for (const cookie of response.cookies.getAll()) {
    if (isSupabaseAuthCookieName(cookie.name)) {
      supabaseCookieNames.add(cookie.name);
    }
  }
  for (const cookieName of supabaseCookieNames) {
    expireAuthCookie(response, cookieName, "lax");
  }
  expireAuthCookie(response, SESSION_COOKIE, "strict");
  expireAuthCookie(response, REFRESH_COOKIE, "strict");

  return response;
}
