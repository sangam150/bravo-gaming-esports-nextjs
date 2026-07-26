import { PUBG_SHARD, pubgFetch, summarizeMatch } from "@/lib/pubg";
import { NextRequest, NextResponse } from "next/server";

export async function GET(_request: NextRequest, context: { params: Promise<{ matchId: string }> }) {
  try {
    const { matchId } = await context.params;
    const data = await pubgFetch(`/shards/${PUBG_SHARD}/matches/${matchId}`);
    return NextResponse.json({ summary: summarizeMatch(data), raw: data });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to load the PUBG match.",
      },
      { status: 500 },
    );
  }
}
