import { fetchPubgPlayerRecentMatches } from "@/lib/pubg";
import { COLLECTIONS, fetchFirestoreCollection, getFirestoreDocument, saveFirestoreDocument } from "@/lib/firebase";
import { importPubgMatch } from "@/lib/pubg-sync";
import { enforceRateLimit } from "@/lib/rate-limit";
import { logServerError } from "@/lib/server-monitoring";
import type { PubgImportWatcher, Scrim } from "@/lib/types";

export async function GET(request: Request) {
  const limited = enforceRateLimit(request, { key: "cron-sync-matches", maxRequests: 30, windowMs: 60_000 });
  if (limited) return limited;

  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const [scrims, watchers] = await Promise.all([
      fetchFirestoreCollection<Scrim>(COLLECTIONS.scrims, 50),
      fetchFirestoreCollection<PubgImportWatcher>(COLLECTIONS.pubgImportWatchers, 50).catch(() => []),
    ]);
    const pending = scrims.filter(
      (s) => (s.pubgMatchId || (s.pubgMatchIds?.length ?? 0) > 0) && (s.status === "live" || s.status === "waiting_for_data")
    );

    const results: Array<{ source: "scrim" | "watcher"; id: string; matchId: string; ok: boolean; error?: string }> = [];

    for (const scrim of pending) {
      const matchIds = Array.from(
        new Set([...(scrim.pubgMatchIds ?? []), scrim.pubgMatchId].filter((matchId): matchId is string => Boolean(matchId)))
      );
      for (const matchId of matchIds) {
        try {
          await importPubgMatch(matchId, { scrimId: scrim.id });
          results.push({ source: "scrim", id: scrim.id, matchId, ok: true });
        } catch (error: unknown) {
          results.push({
            source: "scrim",
            id: scrim.id,
            matchId,
            ok: false,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }
    }

    const enabledWatchers = watchers.filter((watcher) => watcher.enabled !== false && watcher.autoImportNewMatches !== false);

    for (const watcher of enabledWatchers) {
      try {
        const lookup = await fetchPubgPlayerRecentMatches(watcher.playerName, 10);
        const knownMatchIds = new Set(watcher.importedMatchIds ?? []);
        const importedThisRun: string[] = [];

        for (const match of lookup.recentMatches) {
          if (knownMatchIds.has(match.matchId)) {
            continue;
          }

          const alreadyImported = await getFirestoreDocument(COLLECTIONS.pubgMatches, match.matchId);
          if (alreadyImported) {
            knownMatchIds.add(match.matchId);
            continue;
          }

          try {
            await importPubgMatch(match.matchId, {
              tournamentId: watcher.tournamentId,
              scrimId: watcher.scrimId,
            });
            knownMatchIds.add(match.matchId);
            importedThisRun.push(match.matchId);
            results.push({ source: "watcher", id: watcher.id, matchId: match.matchId, ok: true });
          } catch (error: unknown) {
            results.push({
              source: "watcher",
              id: watcher.id,
              matchId: match.matchId,
              ok: false,
              error: error instanceof Error ? error.message : String(error),
            });
          }
        }

        await saveFirestoreDocument(COLLECTIONS.pubgImportWatchers, watcher.id, {
          playerId: watcher.playerId ?? lookup.playerId,
          shardId: watcher.shardId ?? lookup.shardId,
          importedMatchIds: Array.from(knownMatchIds).slice(-50),
          lastCheckedAt: new Date().toISOString(),
          lastImportedAt: importedThisRun.length > 0 ? new Date().toISOString() : watcher.lastImportedAt,
        });
      } catch (error: unknown) {
        results.push({
          source: "watcher",
          id: watcher.id,
          matchId: "lookup",
          ok: false,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return Response.json({ success: true, synced: results.filter((r) => r.ok).length, results });
  } catch (error: unknown) {
    await logServerError("cron.sync-matches", error, request);
    return Response.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
