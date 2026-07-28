import { requirePlatformAdmin } from "@/lib/admin-auth";
import { fetchPubgPlayerRecentMatches } from "@/lib/pubg";
import { normalizePubgPlayerName } from "@/lib/pubg-public";
import { enforceRateLimit } from "@/lib/rate-limit";
import { requireSameOrigin } from "@/lib/request-origin";
import { logServerError } from "@/lib/server-monitoring";
import { jsonErrorResponse, USER_FACING_ERROR_MESSAGES } from "@/lib/user-facing-errors";
import { NextRequest, NextResponse } from "next/server";

function privateResponse(response: Response) {
  response.headers.set("Cache-Control", "private, no-store, max-age=0");
  return response;
}

export async function GET(req: NextRequest) {
  const auth = await requirePlatformAdmin(req);
  if (auth.response) return privateResponse(auth.response);

  const invalidOrigin = requireSameOrigin(req, { includeSafeMethods: true });
  if (invalidOrigin) return privateResponse(invalidOrigin);

  const limited = await enforceRateLimit(req, {
    key: "admin-pubg-sync-player",
    maxRequests: 12,
    windowMs: 60_000,
  });
  if (limited) return privateResponse(limited);

  try {
    const name = normalizePubgPlayerName(req.nextUrl.searchParams.get("name"));
    if (!name) {
      return privateResponse(NextResponse.json({ error: "A valid PUBG player name is required." }, { status: 400 }));
    }

    const lookup = await fetchPubgPlayerRecentMatches(name, 1);
    const latestMatch = lookup.recentMatches[0];

    if (!latestMatch) {
      return privateResponse(NextResponse.json({ error: "No recent match found for this player." }, { status: 404 }));
    }

    return privateResponse(
      NextResponse.json({
        player: {
          id: lookup.playerId,
          name: lookup.playerName,
          shardId: lookup.shardId,
        },
        latestMatch,
      }),
    );
  } catch (error: unknown) {
    await logServerError("pubg.sync-player", error, req);
    return privateResponse(
      jsonErrorResponse(error, {
        status: 500,
        fallback: USER_FACING_ERROR_MESSAGES.server,
      }),
    );
  }
}
