import { NextRequest, NextResponse } from "next/server";
import { pubgFetch, PUBG_SHARD } from "@/lib/pubg";

export async function GET(req: NextRequest) {
  try {
    const name = req.nextUrl.searchParams.get("name");
    if (!name) return NextResponse.json({ error: "Missing ?name=PLAYER_NAME" }, { status: 400 });
    const data = await pubgFetch(`/shards/${PUBG_SHARD}/players?filter[playerNames]=${encodeURIComponent(name)}`);
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
