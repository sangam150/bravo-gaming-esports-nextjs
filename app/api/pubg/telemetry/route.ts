import { NextRequest, NextResponse } from "next/server";
import { pubgFetch, PUBG_SHARD, extractTelemetryUrl } from "@/lib/pubg";

export async function GET(req: NextRequest) {
  try {
    const matchId = req.nextUrl.searchParams.get("matchId");
    if (!matchId) return NextResponse.json({ error: "Missing ?matchId=MATCH_ID" }, { status: 400 });

    const matchData = await pubgFetch(`/shards/${PUBG_SHARD}/matches/${matchId}`);
    const telemetryUrl = extractTelemetryUrl(matchData);
    if (!telemetryUrl) return NextResponse.json({ error: "Telemetry URL not found." }, { status: 404 });

    const events = await fetch(telemetryUrl).then((res) => res.json());
    return NextResponse.json({ matchId, telemetryUrl, events });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
