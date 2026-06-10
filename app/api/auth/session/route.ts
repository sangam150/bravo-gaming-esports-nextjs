import {
  createAdminSessionCookie,
  ensureAdminCustomClaim,
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  verifyAdminToken,
} from "@/lib/firebase-auth-server";
import { enforceRateLimit } from "@/lib/rate-limit";
import { logServerError } from "@/lib/server-monitoring";

export async function POST(request: Request) {
  const limited = enforceRateLimit(request, { key: "auth-session", maxRequests: 10, windowMs: 60_000 });
  if (limited) return limited;

  try {
    const { idToken } = await request.json();
    if (!idToken) {
      return Response.json({ error: "idToken is required" }, { status: 400 });
    }
    const decoded = await verifyAdminToken(idToken);
    const claimsUpdated = await ensureAdminCustomClaim(decoded.uid);
    const sessionCookie = await createAdminSessionCookie(idToken, SESSION_MAX_AGE * 1000);
    const response = Response.json({
      success: true,
      claimsUpdated,
      user: { uid: decoded.uid, email: decoded.email },
    });
    const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
    response.headers.append(
      "Set-Cookie",
      `${SESSION_COOKIE}=${sessionCookie}; Path=/; HttpOnly; SameSite=Strict; Priority=High; Max-Age=${SESSION_MAX_AGE}${secure}`
    );
    return response;
  } catch (error: unknown) {
    await logServerError("auth.session.create", error, request);
    const message = error instanceof Error ? error.message : String(error);
    return Response.json({ error: message }, { status: 401 });
  }
}

export async function DELETE() {
  const response = Response.json({ success: true });
  response.headers.append(
    "Set-Cookie",
    `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Strict; Priority=High; Max-Age=0`
  );
  return response;
}
