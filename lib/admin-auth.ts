import { cookies } from "next/headers";
import { SESSION_COOKIE, verifyAdminToken } from "./firebase-auth-server";

export async function isAdminRequest(request: Request): Promise<boolean> {
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    try {
      await verifyAdminToken(authHeader.slice(7));
      return true;
    } catch {
      return false;
    }
  }

  const sessionCookie = request.headers.get("cookie")?.match(new RegExp(`${SESSION_COOKIE}=([^;]+)`))?.[1];
  if (sessionCookie) {
    try {
      await verifyAdminToken(sessionCookie);
      return true;
    } catch {
      return false;
    }
  }

  return false;
}

export async function requireAdmin(request: Request) {
  const ok = await isAdminRequest(request);
  if (!ok) return adminUnauthorizedResponse();
  return null;
}

export async function getServerAdminSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    return await verifyAdminToken(token);
  } catch {
    return null;
  }
}

export function adminUnauthorizedResponse() {
  return new Response(JSON.stringify({ error: "Unauthorized. Admin login required." }), {
    status: 401,
    headers: { "Content-Type": "application/json" },
  });
}
