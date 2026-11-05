import { readSafeAuthDestination } from "@/lib/auth-destinations";
import { buildDiscordAuthCallbackUrl, DISCORD_OAUTH_INTENT_COOKIE } from "@/lib/discord-auth";
import { enforceRateLimit } from "@/lib/rate-limit";
import { requireSameOrigin } from "@/lib/request-origin";
import { NextResponse } from "next/server";

const INTENT_MAX_AGE_SECONDS = 10 * 60;

export async function POST(request: Request) {
  const invalidOrigin = requireSameOrigin(request);
  if (invalidOrigin) return invalidOrigin;

  const limited = await enforceRateLimit(request, {
    key: "discord-oauth-intent",
    maxRequests: 12,
    windowMs: 60_000,
  });
  if (limited) return limited;

  const body = (await request.json().catch(() => null)) as { next?: unknown } | null;
  const nextPath = readSafeAuthDestination(body?.next) ?? "/";
  const intent = crypto.randomUUID();
  const callbackUrl = buildDiscordAuthCallbackUrl(new URL(request.url).origin, nextPath, intent);
  const response = NextResponse.json({ success: true, callbackUrl }, { headers: { "Cache-Control": "private, no-store, max-age=0" } });
  response.cookies.set(DISCORD_OAUTH_INTENT_COOKIE, intent, {
    httpOnly: true,
    maxAge: INTENT_MAX_AGE_SECONDS,
    path: "/auth/callback",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
  return response;
}
