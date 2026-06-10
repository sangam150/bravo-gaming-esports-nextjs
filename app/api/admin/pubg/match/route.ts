import { requireAdmin } from "@/lib/admin-auth";
import { previewPubgMatch } from "@/lib/pubg-sync";
import { enforceRateLimit } from "@/lib/rate-limit";
import { logServerError } from "@/lib/server-monitoring";

export async function POST(request: Request) {
  const unauthorized = await requireAdmin(request);
  if (unauthorized) return unauthorized;

  const limited = enforceRateLimit(request, { key: "admin-pubg-match", maxRequests: 12, windowMs: 60_000 });
  if (limited) return limited;

  try {
    const body = await request.json();
    const matchId = body.matchId?.trim();
    if (!matchId) {
      return Response.json({ error: "matchId is required" }, { status: 400 });
    }

    const result = await previewPubgMatch(matchId, {
      tournamentId: body.tournamentId,
      scrimId: body.scrimId,
    });

    return Response.json({ success: true, data: result });
  } catch (error: unknown) {
    await logServerError("admin.pubg.match", error, request);
    const message = error instanceof Error ? error.message : String(error);
    const status = message.includes("404") ? 404 : message.includes("PUBG_API_KEY") ? 503 : 500;
    return Response.json({ error: message }, { status });
  }
}
