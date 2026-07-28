import { requirePlatformAdmin } from "@/lib/admin-auth";
import { extractTelemetryUrl, PUBG_SHARD, pubgFetch } from "@/lib/pubg";
import { isTrustedPubgTelemetryUrl, normalizePubgMatchId } from "@/lib/pubg-public";
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
    key: "admin-pubg-telemetry",
    maxRequests: 8,
    windowMs: 60_000,
  });
  if (limited) return privateResponse(limited);

  try {
    const matchId = normalizePubgMatchId(req.nextUrl.searchParams.get("matchId"));
    if (!matchId) {
      return privateResponse(NextResponse.json({ error: "A valid PUBG match ID is required." }, { status: 400 }));
    }

    const matchData = await pubgFetch(`/shards/${PUBG_SHARD}/matches/${encodeURIComponent(matchId)}`);
    const telemetryUrl = extractTelemetryUrl(matchData);
    if (!telemetryUrl || !isTrustedPubgTelemetryUrl(telemetryUrl)) {
      return privateResponse(NextResponse.json({ error: "Trusted PUBG telemetry was not found." }, { status: 404 }));
    }

    const telemetryResponse = await fetch(telemetryUrl, {
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
    if (!telemetryResponse.ok) {
      throw new Error(`PUBG telemetry request failed with status ${telemetryResponse.status}.`);
    }

    const events: unknown = await telemetryResponse.json();
    return privateResponse(NextResponse.json({ matchId, telemetryUrl, events }));
  } catch (error: unknown) {
    await logServerError("pubg.telemetry", error, req);
    return privateResponse(
      jsonErrorResponse(error, {
        status: 500,
        fallback: USER_FACING_ERROR_MESSAGES.server,
      }),
    );
  }
}
