import { fetchPubgPlayerRecentMatches } from "@/lib/pubg";
import { COLLECTIONS, fetchDocumentCollection, getDocument, saveDocument } from "@/lib/document-store";
import { importPubgMatches } from "@/lib/pubg-sync";
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
      fetchDocumentCollection<Scrim>(COLLECTIONS.scrims, 50),
      fetchDocumentCollection<PubgImportWatcher>(COLLECTIONS.pubgImportWatchers, 50).catch(() => []),
    ]);
    const pending = scrims.filter(
      (s) => (s.pubgMatchId || (s.pubgMatchIds?.length ?? 0) > 0) && (s.status === "live" || s.status === "waiting_for_data")
    );

    const results: Array<{ source: "scrim" | "watcher"; id: string; matchId: string; ok: boolean; error?: string }> = [];

    for (const scrim of pending) {
      const matchIds = Array.from(
        new Set([...(scrim.pubgMatchIds ?? []), scrim.pubgMatchId].filter((matchId): matchId is string => Boolean(matchId)))
      );
      try {
        const importResult = await importPubgMatches(matchIds, {
          scrimId: scrim.id,
          duplicateMode: "overwrite",
        });

        for (const result of importResult.results) {
          results.push({
            source: "scrim",
            id: scrim.id,
            matchId: result.matchId,
            ok: result.success,
            error: result.success ? undefined : result.error,
          });
        }
      } catch (error: unknown) {
        for (const matchId of matchIds) {
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
        const pendingMatchIds: string[] = [];

        for (const match of lookup.recentMatches) {
          if (knownMatchIds.has(match.matchId)) {
            continue;
          }

          const alreadyImported = await getDocument(COLLECTIONS.pubgMatches, match.matchId);
          if (alreadyImported) {
            knownMatchIds.add(match.matchId);
            continue;
          }
          pendingMatchIds.push(match.matchId);
        }

        if (pendingMatchIds.length > 0) {
          try {
            const importResult = await importPubgMatches(pendingMatchIds, {
              tournamentId: watcher.tournamentId,
              scrimId: watcher.scrimId,
              duplicateMode: "overwrite",
            });

            for (const result of importResult.results) {
              if (result.success) {
                knownMatchIds.add(result.matchId);
                if (!result.skipped) {
                  importedThisRun.push(result.matchId);
                }
              }

              results.push({
                source: "watcher",
                id: watcher.id,
                matchId: result.matchId,
                ok: result.success,
                error: result.success ? undefined : result.error,
              });
            }
          } catch (error: unknown) {
            for (const matchId of pendingMatchIds) {
              results.push({
                source: "watcher",
                id: watcher.id,
                matchId,
                ok: false,
                error: error instanceof Error ? error.message : String(error),
              });
            }
          }
        }

        await saveDocument(COLLECTIONS.pubgImportWatchers, watcher.id, {
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

