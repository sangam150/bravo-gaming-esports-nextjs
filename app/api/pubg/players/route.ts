import { PUBG_SHARD, pubgFetch } from "@/lib/pubg";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const name = req.nextUrl.searchParams.get("name");
    if (!name) return NextResponse.json({ error: "Missing ?name=PLAYER_NAME" }, { status: 400 });
    const data = await pubgFetch(`/shards/${PUBG_SHARD}/players?filter[playerNames]=${encodeURIComponent(name)}`);
    return NextResponse.json(data);
  } catch (error: unknown) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to fetch the PUBG player.",
      },
      { status: 500 },
    );
  }
}
