import { PUBG_SHARD, pubgFetch } from "@/lib/pubg";
import { isPubgNotFoundError, normalizePubgMatchId, toPublicPubgMatchSummary } from "@/lib/pubg-public";
import { enforceRateLimit } from "@/lib/rate-limit";
import { logServerError } from "@/lib/server-monitoring";
import { jsonErrorResponse } from "@/lib/user-facing-errors";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest, context: { params: Promise<{ matchId: string }> }) {
  const limited = await enforceRateLimit(request, {
    key: "public-pubg-match-summary",
    maxRequests: 30,
    windowMs: 60_000,
  });
  if (limited) return limited;

  try {
    const params = await context.params;
    const matchId = normalizePubgMatchId(params.matchId);
    if (!matchId) {
      return NextResponse.json({ error: "A valid PUBG match ID is required." }, { status: 400 });
    }

    const data = await pubgFetch(`/shards/${PUBG_SHARD}/matches/${encodeURIComponent(matchId)}`);
    const summary = toPublicPubgMatchSummary(data, matchId);
    if (!summary) {
      return NextResponse.json({ error: "PUBG match not found." }, { status: 404 });
    }

    return NextResponse.json(
      { summary },
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
        },
      },
    );
  } catch (error: unknown) {
    if (isPubgNotFoundError(error)) {
      return NextResponse.json({ error: "PUBG match not found." }, { status: 404 });
    }

    await logServerError("pubg.public-match", error, request);
    return jsonErrorResponse(error, {
      status: 502,
      fallback: "Unable to load the PUBG match right now.",
    });
  }
}
