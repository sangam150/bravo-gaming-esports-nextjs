import { extractTelemetryUrl, PUBG_SHARD, pubgFetch } from "@/lib/pubg";
import { enforceRateLimit } from "@/lib/rate-limit";
import { logServerError } from "@/lib/server-monitoring";
import { jsonErrorResponse, USER_FACING_ERROR_MESSAGES } from "@/lib/user-facing-errors";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const limited = await enforceRateLimit(req, {
    key: "pubg-telemetry",
    maxRequests: 8,
    windowMs: 60_000,
  });
  if (limited) return limited;

  try {
    const matchId = req.nextUrl.searchParams.get("matchId");
    if (!matchId) return NextResponse.json({ error: "Missing ?matchId=MATCH_ID" }, { status: 400 });

    const matchData = await pubgFetch(`/shards/${PUBG_SHARD}/matches/${matchId}`);
    const telemetryUrl = extractTelemetryUrl(matchData);
    if (!telemetryUrl) return NextResponse.json({ error: "Telemetry URL not found." }, { status: 404 });

    const events = await fetch(telemetryUrl).then((res) => res.json());
    return NextResponse.json({ matchId, telemetryUrl, events });
  } catch (error: unknown) {
    await logServerError("pubg.telemetry", error, req);
    return jsonErrorResponse(error, {
      status: 500,
      fallback: USER_FACING_ERROR_MESSAGES.server,
    });
  }
}
