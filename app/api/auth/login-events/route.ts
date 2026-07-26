import { enforceRateLimit } from "@/lib/rate-limit";
import { logServerError } from "@/lib/server-monitoring";

function readText(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function readStatus(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export async function POST(request: Request) {
  const limited = await enforceRateLimit(request, {
    key: "auth-login-events",
    maxRequests: 30,
    windowMs: 60_000,
  });
  if (limited) return limited;

  try {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const variant = readText(body.variant) ?? "unknown";
    const category = readText(body.category) ?? "unknown";
    const stage = readText(body.stage) ?? "unknown";
    const code = readText(body.code);
    const status = readStatus(body.status);

    await logServerError("auth.login.failure", new Error(`login_failure:${category}`), request, {
      variant,
      category,
      stage,
      status,
      code,
    });

    return Response.json({ success: true });
  } catch (error: unknown) {
    await logServerError("auth.login.failure-report", error, request);
    return Response.json({ success: false }, { status: 200 });
  }
}
