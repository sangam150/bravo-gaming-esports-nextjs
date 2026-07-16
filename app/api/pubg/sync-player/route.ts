import { NextRequest, NextResponse } from "next/server";
import { fetchPubgPlayerRecentMatches } from "@/lib/pubg";
import { enforceRateLimit } from "@/lib/rate-limit";
import { logServerError } from "@/lib/server-monitoring";
import { jsonErrorResponse, USER_FACING_ERROR_MESSAGES } from "@/lib/user-facing-errors";

export async function GET(req: NextRequest) {
  const limited = await enforceRateLimit(req, { key: "pubg-sync-player", maxRequests: 12, windowMs: 60_000 });
  if (limited) return limited;

  try {
    const name = req.nextUrl.searchParams.get("name");
    if (!name) return NextResponse.json({ error: "Missing ?name=PLAYER_NAME" }, { status: 400 });
    const lookup = await fetchPubgPlayerRecentMatches(name, 1);
    const latestMatch = lookup.recentMatches[0];

    if (!latestMatch) return NextResponse.json({ error: "No recent match found for this player." }, { status: 404 });

    return NextResponse.json({
      player: { id: lookup.playerId, name: lookup.playerName, shardId: lookup.shardId },
      latestMatch,
    });
  } catch (error: unknown) {
    await logServerError("pubg.sync-player", error, req);
    return jsonErrorResponse(error, {
      status: 500,
      fallback: USER_FACING_ERROR_MESSAGES.server,
    });
  }
}
