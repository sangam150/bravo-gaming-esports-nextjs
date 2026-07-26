import { DiscordRoleSyncError, syncDiscordRoles } from "@/lib/discord-role-sync";
import { enforceRateLimit } from "@/lib/rate-limit";
import { createSessionCookie, getSessionCookieMaxAge, REFRESH_COOKIE, SESSION_COOKIE } from "@/lib/supabase-auth-server";
import { getSupabaseServiceRoleClient } from "@/lib/supabase/service-role-client";

export async function POST(request: Request) {
  const limited = await enforceRateLimit(request, {
    key: "discord-role-complete",
    maxRequests: 8,
    windowMs: 60_000,
  });
  if (limited) return limited;
  try {
    const body = (await request.json()) as {
      accessToken?: unknown;
      refreshToken?: unknown;
    };
    const accessToken = typeof body.accessToken === "string" ? body.accessToken : "";
    const refreshToken = typeof body.refreshToken === "string" ? body.refreshToken : "";
    if (!accessToken) return Response.json({ error: "Discord identity verification could not be completed." }, { status: 401 });
    const client = getSupabaseServiceRoleClient();
    const {
      data: { user },
      error,
    } = await client.auth.getUser(accessToken);
    if (error || !user) return Response.json({ error: "Discord identity verification could not be completed." }, { status: 401 });
    const result = await syncDiscordRoles(user);
    const maxAge = getSessionCookieMaxAge(accessToken);
    const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
    const response = Response.json(
      { success: true, role: result.role, redirectTo: result.redirectTo },
      {
        headers: { "Cache-Control": "private, no-store" },
      },
    );
    response.headers.append(
      "Set-Cookie",
      `${SESSION_COOKIE}=${await createSessionCookie(accessToken, maxAge * 1000)}; Path=/; HttpOnly; SameSite=Strict; Priority=High; Max-Age=${maxAge}${secure}`,
    );
    if (refreshToken)
      response.headers.append(
        "Set-Cookie",
        `${REFRESH_COOKIE}=${refreshToken}; Path=/; HttpOnly; SameSite=Strict; Priority=High; Max-Age=${60 * 60 * 24 * 5}${secure}`,
      );
    return response;
  } catch (error) {
    if (error instanceof DiscordRoleSyncError) {
      return Response.json(
        { success: false, error: error.message, category: error.category },
        {
          status: error.status,
          headers: { "Cache-Control": "private, no-store" },
        },
      );
    }
    return Response.json(
      {
        success: false,
        error: "Discord role verification is temporarily unavailable. Please try again later or use email login.",
      },
      { status: 503 },
    );
  }
}
