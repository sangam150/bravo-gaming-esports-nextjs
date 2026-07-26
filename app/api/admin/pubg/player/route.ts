import { requireAdmin } from "@/lib/admin-auth";
import { COLLECTIONS, getDocument, saveDocument } from "@/lib/document-store";
import { fetchPubgPlayerRecentMatches } from "@/lib/pubg";
import { enforceRateLimit } from "@/lib/rate-limit";
import { logServerError } from "@/lib/server-monitoring";
import type { PubgPlayerLookup } from "@/lib/types";

export async function POST(request: Request) {
  const unauthorized = await requireAdmin(request);
  if (unauthorized) return unauthorized;

  const limited = await enforceRateLimit(request, {
    key: "admin-pubg-player",
    maxRequests: 12,
    windowMs: 60_000,
  });
  if (limited) return limited;

  try {
    const body = await request.json();
    const playerName = body.playerName?.trim();
    const shouldSaveLookup = Boolean(body.saveLookup ?? body.saveToDocumentStore);

    if (!playerName) {
      return new Response(JSON.stringify({ error: "playerName is required" }), {
        status: 400,
      });
    }

    const lookup = await fetchPubgPlayerRecentMatches(playerName, 10);
    const recentMatches = await Promise.all(
      lookup.recentMatches.map(async (match) => ({
        ...match,
        alreadyImported: Boolean(await getDocument(COLLECTIONS.pubgMatches, match.matchId)),
      })),
    );

    let savedLookup = null;
    if (shouldSaveLookup) {
      savedLookup = await saveDocument("pubgPlayers", lookup.playerId, {
        playerName: lookup.playerName,
        shardId: lookup.shardId,
        recentMatches,
      });
    }

    const playerLookup: PubgPlayerLookup = {
      playerId: lookup.playerId,
      playerName: lookup.playerName,
      shardId: lookup.shardId,
      recentMatches,
    };

    return new Response(JSON.stringify({ success: true, data: playerLookup, savedLookup }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    await logServerError("admin.pubg.player", error, request);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}
