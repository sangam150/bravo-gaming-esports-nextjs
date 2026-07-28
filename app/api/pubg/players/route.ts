import { PUBG_SHARD, pubgFetch } from "@/lib/pubg";
import { isPubgNotFoundError, normalizePubgPlayerName, toPublicPubgPlayer } from "@/lib/pubg-public";
import { enforceRateLimit } from "@/lib/rate-limit";
import { logServerError } from "@/lib/server-monitoring";
import { jsonErrorResponse } from "@/lib/user-facing-errors";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const limited = await enforceRateLimit(req, {
    key: "public-pubg-player-lookup",
    maxRequests: 20,
    windowMs: 60_000,
  });
  if (limited) return limited;

  try {
    const name = normalizePubgPlayerName(req.nextUrl.searchParams.get("name"));
    if (!name) {
      return NextResponse.json({ error: "A valid PUBG player name is required." }, { status: 400 });
    }

    const data = await pubgFetch(`/shards/${PUBG_SHARD}/players?filter[playerNames]=${encodeURIComponent(name)}`);
    const player = toPublicPubgPlayer(data);
    if (!player) {
      return NextResponse.json({ error: "PUBG player not found." }, { status: 404 });
    }

    return NextResponse.json(
      { player },
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
        },
      },
    );
  } catch (error: unknown) {
    if (isPubgNotFoundError(error)) {
      return NextResponse.json({ error: "PUBG player not found." }, { status: 404 });
    }

    await logServerError("pubg.public-player", error, req);
    return jsonErrorResponse(error, {
      status: 502,
      fallback: "Unable to verify the PUBG player right now.",
    });
  }
}
