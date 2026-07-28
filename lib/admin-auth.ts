import "server-only";
import { hasTeamWorkspaceAccess } from "./authz";
import {
  SESSION_COOKIE,
  getServerSession,
  getServerAdminSession as getSupabaseAdminSession,
  verifyAccessToken,
  verifySessionCookie,
  type VerifiedSession,
} from "./supabase-auth-server";

type AuthResult = { response: Response; session: null } | { response: null; session: VerifiedSession };

type TeamAuthResult = { response: Response; session: null } | { response: null; session: VerifiedSession & { teamId: string } };

type PlatformAdminAuthResult = { response: Response; session: null } | { response: null; session: VerifiedSession & { profileId: string } };

function readSessionCookie(request: Request) {
  return request.headers.get("cookie")?.match(new RegExp(`${SESSION_COOKIE}=([^;]+)`))?.[1] ?? null;
}

function jsonAuthResponse(status: number, error: string) {
  return new Response(JSON.stringify({ error }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
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
  if (sessionCookie) {
    try {
      return await verifySessionCookie(sessionCookie);
    } catch {
      // The Supabase SSR session below is authoritative after token refresh.
    }
  }

  return getServerSession();
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

export async function requireAuthenticatedUser(request: Request): Promise<AuthResult> {
  const session = await getRequestSession(request);
  if (!session) {
    return {
      response: loginRequiredResponse(),
      session: null,
    };
  }

  return { response: null, session };
}

export async function requirePlatformAdmin(request: Request): Promise<PlatformAdminAuthResult> {
  const auth = await requireAuthenticatedUser(request);
  if (auth.response || !auth.session) {
    return auth;
  }

  if (auth.session.role !== "super_admin" && auth.session.role !== "admin") {
    return {
      response: permissionDeniedResponse("Access denied. Super-admin or admin role required."),
      session: null,
    };
  }

  if (!auth.session.profileId) {
    return {
      response: permissionDeniedResponse("This admin account is missing its protected profile link."),
      session: null,
    };
  }

  return {
    response: null,
    session: { ...auth.session, profileId: auth.session.profileId },
  };
}

export async function requireTeamWorkspaceUser(request: Request): Promise<TeamAuthResult> {
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

  return {
    response: null,
    session: { ...auth.session, teamId: auth.session.teamId },
  };
}

export async function getServerAdminSession() {
  return getSupabaseAdminSession();
}

export async function getServerAuthenticatedSession() {
  return getServerSession();
}

function adminUnauthorizedResponse() {
  return jsonAuthResponse(401, "Unauthorized. Admin login required.");
}

function loginRequiredResponse() {
  return jsonAuthResponse(401, "Unauthorized. Login required.");
}

export function permissionDeniedResponse(error = "Access denied.") {
  return jsonAuthResponse(403, error);
}
