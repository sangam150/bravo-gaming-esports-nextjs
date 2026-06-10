import { NextRequest, NextResponse } from "next/server";
import { fetchPubgPlayerRecentMatches } from "@/lib/pubg";

export async function GET(req: NextRequest) {
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
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
