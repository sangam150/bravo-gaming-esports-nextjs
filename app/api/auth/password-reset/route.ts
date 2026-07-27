import { enforceRateLimit } from "@/lib/rate-limit";
import { logServerError } from "@/lib/server-monitoring";
import { requireSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@supabase/supabase-js";

const SAFE_RESPONSE = "If an account exists for that email, a password recovery link has been sent.";
const PRODUCTION_ORIGIN = "https://bravo-gaming-esports.vercel.app";

function getRecoveryOrigin(request: Request) {
  const vercelEnvironment = process.env.VERCEL_ENV?.trim();
  if (vercelEnvironment === "production") {
    return process.env.NEXT_PUBLIC_SITE_URL?.trim() || PRODUCTION_ORIGIN;
  }
  if (vercelEnvironment === "preview" && process.env.VERCEL_URL?.trim()) {
    return `https://${process.env.VERCEL_URL.trim()}`;
  }
  return new URL(request.url).origin;
}

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
  const origin = getRecoveryOrigin(request);

  // Always return the same public success response to avoid account enumeration.
  const { error } = await client.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/reset-password`,
  });
  if (error) {
    await logServerError("auth.password_reset.provider", new Error("The password recovery provider rejected a request."), request, {
      status: error.status,
      code: error.code,
    });
  }

  return Response.json({ success: true, message: SAFE_RESPONSE }, { headers: { "Cache-Control": "private, no-store" } });
}
