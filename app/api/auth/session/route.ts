import {
  createSessionCookie,
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  verifyAccessToken,
} from "@/lib/supabase-auth-server";
import { enforceRateLimit } from "@/lib/rate-limit";
import { logServerError } from "@/lib/server-monitoring";
import {
  jsonErrorResponse,
  USER_FACING_ERROR_MESSAGES,
} from "@/lib/user-facing-errors";

export async function POST(request: Request) {
  const limited = enforceRateLimit(request, { key: "auth-session", maxRequests: 10, windowMs: 60_000 });
  if (limited) return limited;

  try {
    const body = await request.json();
    const accessToken =
      typeof body.accessToken === "string"
        ? body.accessToken
        : typeof body.idToken === "string"
          ? body.idToken
          : "";

    if (!accessToken) {
      return Response.json(
        { error: "A valid sign-in session is required before access can be granted." },
        { status: 400 }
      );
    }
    const decoded = await verifyAccessToken(accessToken);
    const sessionCookie = await createSessionCookie(accessToken, SESSION_MAX_AGE * 1000);
    const response = Response.json({
      success: true,
      user: {
        profileId: decoded.profileId,
        uid: decoded.uid,
        email: decoded.email,
        role: decoded.role,
        teamId: decoded.teamId,
        displayName: decoded.displayName,
        isAdmin: decoded.isAdmin,
      },
    });
    const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
    response.headers.append(
      "Set-Cookie",
      `${SESSION_COOKIE}=${sessionCookie}; Path=/; HttpOnly; SameSite=Strict; Priority=High; Max-Age=${SESSION_MAX_AGE}${secure}`
    );
    return response;
  } catch (error: unknown) {
    await logServerError("auth.session.create", error, request);
    return jsonErrorResponse(error, {
      status: 401,
      fallback: USER_FACING_ERROR_MESSAGES.session,
    });
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
