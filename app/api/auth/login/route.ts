import { writeAuditLogFromRequest } from "@/lib/audit-logs";
import { AuthConfigurationError } from "@/lib/auth-errors";
import { hasPlayerDashboardAccess, hasTeamWorkspaceAccess } from "@/lib/authz";
import { enforceRateLimit } from "@/lib/rate-limit";
import { logServerError } from "@/lib/server-monitoring";
import { createSessionCookie, getSessionCookieMaxAge, REFRESH_COOKIE, SESSION_COOKIE, verifyAccessToken } from "@/lib/supabase-auth-server";
import { requireSupabaseEnv } from "@/lib/supabase/env";
import type { LoginAccessVariant } from "@/lib/user-facing-errors";
import { getLoginFailureDetails, getRoleAccessErrorMessage, LOGIN_ERROR_MESSAGES } from "@/lib/user-facing-errors";
import { createClient } from "@supabase/supabase-js";
import { after } from "next/server";

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
    { status },
  );
}

function scheduleLoginFailure(request: Request, payload: Parameters<typeof logLoginFailure>[1]) {
  after(async () => {
    await logLoginFailure(request, payload);
  });
}

export async function POST(request: Request) {
  const limited = await enforceRateLimit(request, {
    key: "auth-login",
    maxRequests: 8,
    windowMs: 60_000,
  });
  if (limited) {
    return createLoginErrorResponse(LOGIN_ERROR_MESSAGES.rateLimited, 429);
  }

  let variant: LoginAccessVariant = "hub";

  try {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const email = readText(body.email);
    const password = typeof body.password === "string" ? body.password : "";
    variant = readVariant(body.variant);

    if (!email || !password) {
      return createLoginErrorResponse(LOGIN_ERROR_MESSAGES.missingCredentials, 400);
    }

    const { url, publicKey } = requireSupabaseEnv();
    const supabase = createClient(url, publicKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      const details = getLoginFailureDetails(error, {
        variant,
        stage: "credentials",
      });
      scheduleLoginFailure(request, {
        variant,
        category: details.category,
        stage: "credentials",
        status: details.status,
        code: details.code,
      });
      const status = details.category === "rate_limited" ? 429 : details.category === "backend_unavailable" ? 503 : 401;
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
      return createLoginErrorResponse(details.message, 503);
    }

    const verifiedSession = await verifyAccessToken(data.session.access_token);
    if (variant === "team" && hasTeamWorkspaceAccess(verifiedSession.role, verifiedSession.isAdmin) && !verifiedSession.teamId) {
      const message = LOGIN_ERROR_MESSAGES.teamMembershipMissing;
      scheduleLoginFailure(request, {
        variant,
        category: "team_membership_missing",
        stage: "role",
        status: 403,
      });
      return createLoginErrorResponse(message, 403);
    }
    if (variant === "player" && hasPlayerDashboardAccess(verifiedSession.role, verifiedSession.isAdmin) && !verifiedSession.playerId) {
      return createLoginErrorResponse("This player account is not linked to an approved player profile.", 403);
    }
    const hasAllowedAccess =
      variant === "admin"
        ? verifiedSession.isAdmin
        : variant === "team"
          ? hasTeamWorkspaceAccess(verifiedSession.role, verifiedSession.isAdmin)
          : variant === "player"
            ? hasPlayerDashboardAccess(verifiedSession.role, verifiedSession.isAdmin)
            : verifiedSession.isAdmin || hasTeamWorkspaceAccess(verifiedSession.role, verifiedSession.isAdmin);

    if (!hasAllowedAccess) {
      const message = buildRoleMismatchMessage(variant);
      scheduleLoginFailure(request, {
        variant,
        category: "role_mismatch",
        stage: "role",
        status: 403,
      });
      return createLoginErrorResponse(message, 403);
    }

    const sessionCookieMaxAge = getSessionCookieMaxAge(data.session.access_token);
    const sessionCookie = await createSessionCookie(data.session.access_token, sessionCookieMaxAge * 1000);
    const response = Response.json({
      success: true,
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
      user: {
        uid: verifiedSession.uid,
        email: verifiedSession.email,
        role: verifiedSession.role,
        teamId: verifiedSession.teamId,
        playerId: verifiedSession.playerId,
        displayName: verifiedSession.displayName,
        isAdmin: verifiedSession.isAdmin,
      },
    });
    const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
    response.headers.append(
      "Set-Cookie",
      `${SESSION_COOKIE}=${sessionCookie}; Path=/; HttpOnly; SameSite=Strict; Priority=High; Max-Age=${sessionCookieMaxAge}${secure}`,
    );
    response.headers.append(
      "Set-Cookie",
      `${REFRESH_COOKIE}=${data.session.refresh_token}; Path=/; HttpOnly; SameSite=Strict; Priority=High; Max-Age=${60 * 60 * 24 * 5}${secure}`,
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
      },
    });

    return response;
  } catch (error: unknown) {
    if (error instanceof AuthConfigurationError) {
      scheduleLoginFailure(request, {
        variant,
        category: error.category,
        stage: "role",
        status: 403,
      });
      return createLoginErrorResponse(error.message, 403);
    }
    await logServerError("auth.login.server", error, request, { variant });
    return createLoginErrorResponse(LOGIN_ERROR_MESSAGES.backendUnavailable, 503);
  }
}
