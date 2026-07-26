import { enforceRateLimit } from "@/lib/rate-limit";
import { requireSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@supabase/supabase-js";

const SAFE_RESPONSE = "If an account exists for that email, a password recovery link has been sent.";
const PRODUCTION_ORIGIN = "https://bravo-gaming-esports.vercel.app";

export async function POST(request: Request) {
  const limited = await enforceRateLimit(request, {
    key: "auth-password-reset",
    maxRequests: 5,
    windowMs: 15 * 60_000,
  });
  if (limited) {
    return Response.json(
      {
        success: false,
        error: "Too many password reset attempts. Please wait and try again.",
      },
      { status: 429, headers: { "Cache-Control": "private, no-store" } },
    );
  }

  const body = (await request.json().catch(() => ({}))) as { email?: unknown };
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!email || !email.includes("@")) {
    return Response.json(
      { success: false, error: "Please enter a valid email address." },
      { status: 400, headers: { "Cache-Control": "private, no-store" } },
    );
  }

  const { url, publicKey } = requireSupabaseEnv();
  const client = createClient(url, publicKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const configuredOrigin = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  const origin = process.env.NODE_ENV === "production" ? configuredOrigin || PRODUCTION_ORIGIN : new URL(request.url).origin;

  // Always return the same public success response to avoid account enumeration.
  await client.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/reset-password`,
  });

  return Response.json({ success: true, message: SAFE_RESPONSE }, { headers: { "Cache-Control": "private, no-store" } });
}
