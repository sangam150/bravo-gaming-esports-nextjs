import { NextRequest, NextResponse } from "next/server";
import { pubgFetch, PUBG_SHARD, summarizeMatch } from "@/lib/pubg";

export async function GET(req: NextRequest, context: { params: Promise<{ matchId: string }> }) {
  try {
    const { matchId } = await context.params;
    const data = await pubgFetch(`/shards/${PUBG_SHARD}/matches/${matchId}`);
    return NextResponse.json({ summary: summarizeMatch(data), raw: data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
