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
  const ok = await isAdminRequest(request);
  if (!ok) return adminUnauthorizedResponse();
  return null;
}

export async function requireAuthenticatedUser(request: Request) {
  const session = await getRequestSession(request);
  if (!session) {
    return {
      response: new Response(JSON.stringify({ error: "Unauthorized. Login required." }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      }),
      session: null,
    };
  }

  return { response: null, session };
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
  return new Response(JSON.stringify({ error: "Unauthorized. Admin login required." }), {
    status: 401,
    headers: { "Content-Type": "application/json" },
  });
}
