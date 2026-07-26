import { requireAdmin } from "@/lib/admin-auth";
import { getLatestRawImportPayload } from "@/lib/pubg-import-relational";
import { enforceRateLimit } from "@/lib/rate-limit";
import { logServerError } from "@/lib/server-monitoring";

export async function GET(request: Request) {
  const unauthorized = await requireAdmin(request);
  if (unauthorized) return unauthorized;

  const limited = await enforceRateLimit(request, {
    key: "admin-pubg-raw",
    maxRequests: 30,
    windowMs: 60_000,
  });
  if (limited) return limited;

  try {
    const { searchParams } = new URL(request.url);
    const matchId = searchParams.get("matchId")?.trim();
    if (!matchId) {
      return Response.json({ error: "matchId is required." }, { status: 400 });
    }

    const raw = await getLatestRawImportPayload(matchId);
    if (!raw) {
      return Response.json({ error: "No cached raw payload found for this match." }, { status: 404 });
    }

    return Response.json({ success: true, data: { matchId, raw } });
  } catch (error: unknown) {
    await logServerError("admin.pubg.raw", error, request);
    const message = error instanceof Error ? error.message : String(error);
    return Response.json({ error: message }, { status: 500 });
  }
}
