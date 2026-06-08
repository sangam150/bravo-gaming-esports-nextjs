import { NextRequest, NextResponse } from "next/server";
import { pubgFetch, PUBG_SHARD, summarizeMatch } from "@/lib/pubg";

export async function GET(req: NextRequest) {
  try {
    const name = req.nextUrl.searchParams.get("name");
    if (!name) return NextResponse.json({ error: "Missing ?name=PLAYER_NAME" }, { status: 400 });

    const playerData = await pubgFetch(`/shards/${PUBG_SHARD}/players?filter[playerNames]=${encodeURIComponent(name)}`);
    const player = playerData?.data?.[0];
    const matchId = player?.relationships?.matches?.data?.[0]?.id;

    if (!matchId) return NextResponse.json({ error: "No recent match found for this player." }, { status: 404 });

    const matchData = await pubgFetch(`/shards/${PUBG_SHARD}/matches/${matchId}`, false);

    return NextResponse.json({
      player: { id: player.id, name: player.attributes.name, shardId: player.attributes.shardId },
      latestMatch: summarizeMatch(matchData)
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
