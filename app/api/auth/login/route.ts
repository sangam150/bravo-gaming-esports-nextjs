import { writeAuditLogFromRequest } from "@/lib/audit-logs";
import { resolveAuthorizedAuthDestination } from "@/lib/auth-destinations";
import { AuthConfigurationError } from "@/lib/auth-errors";
import { hasPlayerDashboardAccess, hasTeamWorkspaceAccess } from "@/lib/authz";
import { getLoginFailureResponse } from "@/lib/login-failure-response";
import { enforceRateLimit } from "@/lib/rate-limit";
import { requireSameOrigin } from "@/lib/request-origin";
import { logServerError } from "@/lib/server-monitoring";
import { createSessionCookie, getSessionCookieMaxAge, REFRESH_COOKIE, SESSION_COOKIE, verifyAccessToken } from "@/lib/supabase-auth-server";
import { isSupabaseAuthCookieName } from "@/lib/supabase-auth-cookies";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { LoginAccessVariant } from "@/lib/user-facing-errors";
import { getLoginFailureDetails, getRoleAccessErrorMessage, LOGIN_ERROR_MESSAGES } from "@/lib/user-facing-errors";
import { after } from "next/server";
import { cookies } from "next/headers";

function readText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function readVariant(value: unknown): LoginAccessVariant {
  return value === "admin" || value === "team" || value === "player" || value === "hub" ? value : "hub";
}

function buildRoleMismatchMessage(variant: LoginAccessVariant) {
  if (variant === "admin" || variant === "team" || variant === "player") {
    return getRoleAccessErrorMessage(variant);
  }

  return "This account does not have admin or team access.";
}

async function logLoginFailure(
  request: Request,
  payload: {
    variant: LoginAccessVariant;
    category: string;
    stage: string;
    status?: number | null;
    code?: string | null;
  },
) {
  await logServerError("auth.login.failure", new Error(`login_failure:${payload.category}`), request, payload);
}

function createLoginErrorResponse(message: string, status: number) {
  return Response.json(
    {
      success: false,
      error: message,
      status,
    },
    { status, headers: { "Cache-Control": "private, no-store" } },
  );
}

function clearBravoSessionCookies(response: Response, authCookieNames: Iterable<string> = []) {
  response.headers.append("Set-Cookie", `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Strict; Priority=High; Max-Age=0`);
  response.headers.append("Set-Cookie", `${REFRESH_COOKIE}=; Path=/; HttpOnly; SameSite=Strict; Priority=High; Max-Age=0`);
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  for (const name of authCookieNames) {
    response.headers.append("Set-Cookie", `${name}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`);
  }
  return response;
}

async function revokeLoginSession(supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>, request: Request) {
  const cookieStore = await cookies();
  const names = new Set(
    (request.headers.get("cookie") ?? "").split(";").map(cookie => cookie.split("=", 1)[0]?.trim() ?? "").filter(isSupabaseAuthCookieName),
  );
  // Password sign-in may have just written cookies absent from the request.
  // SDK sign-out can return an error without removing those local cookies.
  for (const cookie of cookieStore.getAll()) if (isSupabaseAuthCookieName(cookie.name)) names.add(cookie.name);
  await supabase.auth.signOut({ scope: "local" }).catch(() => undefined);
  for (const cookie of cookieStore.getAll()) if (isSupabaseAuthCookieName(cookie.name)) names.add(cookie.name);
  return names;
}

async function rejectAuthenticatedLogin(supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>, request: Request, message: string, status: number) {
  const authCookieNames = await revokeLoginSession(supabase, request);
  return clearBravoSessionCookies(createLoginErrorResponse(message, status), authCookieNames);
}

function scheduleLoginFailure(request: Request, payload: Parameters<typeof logLoginFailure>[1]) {
  const log = () => logLoginFailure(request, payload).catch(() => undefined);
  try {
    after(log);
  } catch {
    // Failure telemetry must not turn a controlled denial into an exception.
    void log();
  }
}

export async function POST(request: Request) {
  const invalidOrigin = requireSameOrigin(request);
  if (invalidOrigin) return invalidOrigin;

  let variant: LoginAccessVariant = "hub";
  let authenticatedClient: Awaited<ReturnType<typeof createSupabaseServerClient>> | null = null;
  let credentialRequestPending = false;

  try {
    const limited = await enforceRateLimit(request, {
      key: "auth-login",
      maxRequests: 8,
      windowMs: 60_000,
    });
    if (limited) {
      const response = createLoginErrorResponse(LOGIN_ERROR_MESSAGES.rateLimited, 429);
      for (const name of ["Retry-After", "X-RateLimit-Remaining", "X-RateLimit-Reset"]) {
        const value = limited.headers.get(name);
        if (value) response.headers.set(name, value);
      }
      return response;
    }

    const input: unknown = await request.json().catch(() => null);
    const body = input && typeof input === "object" && !Array.isArray(input) ? input as Record<string, unknown> : {};
    const email = readText(body.email);
    const password = typeof body.password === "string" ? body.password : "";
    const requestedDestination = body.redirect;
    variant = readVariant(body.variant);

    if (!email || !password) {
      return createLoginErrorResponse(LOGIN_ERROR_MESSAGES.missingCredentials, 400);
    }

    const supabase = await createSupabaseServerClient();

    credentialRequestPending = true;
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    credentialRequestPending = false;

    if (error) {
      const { status, details } = getLoginFailureResponse(error, { variant, credentials: true });
      scheduleLoginFailure(request, {
        variant,
        category: details.category,
        stage: "credentials",
        status: details.status,
        code: details.code,
      });
      return createLoginErrorResponse(details.message, status);
    }

    if (!data.session?.access_token || !data.session.refresh_token) {
      const details = getLoginFailureDetails(new Error("Unable to establish your session."), {
        variant,
        stage: "session",
      });
      scheduleLoginFailure(request, {
        variant,
        category: details.category,
        stage: "session",
        status: details.status,
        code: details.code,
      });
      return rejectAuthenticatedLogin(supabase, request, details.message, 503);
    }

    authenticatedClient = supabase;
    const verifiedSession = await verifyAccessToken(data.session.access_token);
    if (variant === "team" && hasTeamWorkspaceAccess(verifiedSession.role, verifiedSession.isAdmin) && !verifiedSession.teamId) {
      const message = LOGIN_ERROR_MESSAGES.teamMembershipMissing;
      scheduleLoginFailure(request, {
        variant,
        category: "team_membership_missing",
        stage: "role",
        status: 403,
      });
      return rejectAuthenticatedLogin(supabase, request, message, 403);
    }
    if (variant === "player" && hasPlayerDashboardAccess(verifiedSession.role, verifiedSession.isAdmin) && !verifiedSession.playerId) {
      return rejectAuthenticatedLogin(supabase, request, "This player account is not linked to an approved player profile.", 403);
    }
    const hasAllowedAccess =
      variant === "admin"
        ? verifiedSession.isAdmin
        : variant === "team"
          ? hasTeamWorkspaceAccess(verifiedSession.role, verifiedSession.isAdmin)
          : variant === "player"
            ? hasPlayerDashboardAccess(verifiedSession.role, verifiedSession.isAdmin)
            : true;

    if (!hasAllowedAccess) {
      const message = buildRoleMismatchMessage(variant);
      scheduleLoginFailure(request, {
        variant,
        category: "role_mismatch",
        stage: "role",
        status: 403,
      });
      return rejectAuthenticatedLogin(supabase, request, message, 403);
    }

    const redirectTo = resolveAuthorizedAuthDestination(verifiedSession, requestedDestination);
    const sessionCookieMaxAge = getSessionCookieMaxAge(data.session.access_token);
    const sessionCookie = await createSessionCookie(data.session.access_token, sessionCookieMaxAge * 1000);
    const response = Response.json(
      {
        success: true,
        redirectTo,
        user: {
          uid: verifiedSession.uid,
          email: verifiedSession.email,
          role: verifiedSession.role,
          teamId: verifiedSession.teamId,
          playerId: verifiedSession.playerId,
          displayName: verifiedSession.displayName,
          isAdmin: verifiedSession.isAdmin,
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
      entityId: verifiedSession.uid,
      newValue: {
        email: verifiedSession.email,
        role: verifiedSession.role,
        teamId: verifiedSession.teamId,
        variant,
        redirectTo,
      },
    });

    return response;
  } catch (error: unknown) {
    const authCookieNames = authenticatedClient ? await revokeLoginSession(authenticatedClient, request) : [];
    if (error instanceof AuthConfigurationError) {
      scheduleLoginFailure(request, {
        variant,
        category: error.category,
        stage: "role",
        status: 403,
      });
      return clearBravoSessionCookies(createLoginErrorResponse(error.message, 403), authCookieNames);
    }
    const { status, details } = getLoginFailureResponse(error, { variant, credentials: credentialRequestPending });
    await logServerError("auth.login.server", new Error(`login_failure:${details.category}`), request, {
      variant,
      category: details.category,
      status: details.status,
      code: details.code,
    }).catch(() => undefined);
    return authenticatedClient
      ? clearBravoSessionCookies(createLoginErrorResponse(details.message, status), authCookieNames)
      : createLoginErrorResponse(details.message, status);
  }
}
