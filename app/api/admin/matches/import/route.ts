import { requireAdmin } from "@/lib/admin-auth";
import { importPubgMatch } from "@/lib/pubg-sync";

export async function POST(request: Request) {
  const unauthorized = await requireAdmin(request);
  if (unauthorized) return unauthorized;

  try {
    const body = await request.json();
    const matchId = body.matchId?.trim();
    if (!matchId) {
      return Response.json({ error: "matchId is required" }, { status: 400 });
    }

    const result = await importPubgMatch(matchId, {
      tournamentId: body.tournamentId,
      scrimId: body.scrimId,
      screenshotUrl: body.screenshotUrl,
    });

    return Response.json({ success: true, data: result });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    const status = message.includes("PUBG API error 404") ? 404 : message.includes("Missing PUBG_API_KEY") ? 503 : 500;
    return Response.json({ error: message }, { status });
  }
}
