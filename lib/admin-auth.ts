import "server-only";
import {
  hasPlayerDashboardAccess,
  hasTeamWorkspaceAccess,
} from "./authz";
import {
  SESSION_COOKIE,
  getServerAdminSession as getSupabaseAdminSession,
  getServerSession,
  verifyAccessToken,
  verifySessionCookie,
  verifyAdminToken,
  type VerifiedSession,
} from "./supabase-auth-server";

function readSessionCookie(request: Request) {
  return request.headers.get("cookie")?.match(new RegExp(`${SESSION_COOKIE}=([^;]+)`))?.[1] ?? null;
}

function jsonAuthResponse(status: number, error: string) {
  return new Response(JSON.stringify({ error }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function isAdminRequest(request: Request): Promise<boolean> {
  const session = await getRequestSession(request);
  return Boolean(session?.isAdmin);
}

export async function getRequestSession(request: Request): Promise<VerifiedSession | null> {
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    try {
      return await verifyAccessToken(token);
    } catch {
      return null;
    }
  }

  const sessionCookie = readSessionCookie(request);
  if (!sessionCookie) {
    return null;
  }

  try {
    return await verifySessionCookie(sessionCookie);
  } catch {
    return null;
  }
}

export async function requireAdmin(request: Request) {
  const session = await getRequestSession(request);
  if (!session) {
    return adminUnauthorizedResponse();
  }

  if (!session.isAdmin) {
    return permissionDeniedResponse("Access denied. Admin role required.");
  }

  return null;
}

export async function requireAuthenticatedUser(request: Request) {
  const session = await getRequestSession(request);
  if (!session) {
    return {
      response: loginRequiredResponse(),
      session: null,
    };
  }

  return { response: null, session };
}

export async function requireTeamWorkspaceUser(request: Request) {
  const auth = await requireAuthenticatedUser(request);
  if (auth.response || !auth.session) {
    return auth;
  }

  if (!hasTeamWorkspaceAccess(auth.session.role, auth.session.isAdmin)) {
    return {
      response: permissionDeniedResponse("Access denied. Team workspace access required."),
      session: null,
    };
  }

  if (!auth.session.teamId) {
    return {
      response: permissionDeniedResponse("This account is not linked to a team yet."),
      session: null,
    };
  }

  return auth;
}

export async function requirePlayerDashboardUser(request: Request) {
  const auth = await requireAuthenticatedUser(request);
  if (auth.response || !auth.session) {
    return auth;
  }

  if (!hasPlayerDashboardAccess(auth.session.role, auth.session.isAdmin)) {
    return {
      response: permissionDeniedResponse("Access denied. Player dashboard access required."),
      session: null,
    };
  }

  return auth;
}

export async function getServerAdminSession() {
  return getSupabaseAdminSession();
}

export async function getServerAuthenticatedSession() {
  return getServerSession();
}

export async function verifyAdminBearerToken(accessToken: string) {
  return verifyAdminToken(accessToken);
}

export async function verifyBearerToken(accessToken: string) {
  return verifyAccessToken(accessToken);
}

export function adminUnauthorizedResponse() {
  return jsonAuthResponse(401, "Unauthorized. Admin login required.");
}

export function loginRequiredResponse() {
  return jsonAuthResponse(401, "Unauthorized. Login required.");
}

export function permissionDeniedResponse(error = "Access denied.") {
  return jsonAuthResponse(403, error);
}
