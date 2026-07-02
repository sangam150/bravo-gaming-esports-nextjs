import { writeAuditLog } from "@/lib/audit-logs";
import { COLLECTIONS, fetchDocumentCollection, getDocument, saveDocument } from "@/lib/document-store";
import { processAutoDetectedPubgCandidate } from "@/lib/pubg-import-candidates";
import { cachePendingImportPreview } from "@/lib/pubg-import-relational";
import { fetchPubgPlayerRecentMatches, fetchPubgPlayerRecentMatchesById } from "@/lib/pubg";
import { importPubgMatches, previewPubgMatches } from "@/lib/pubg-sync";
import { enforceRateLimit } from "@/lib/rate-limit";
import { logServerError } from "@/lib/server-monitoring";
import type { PubgImportWatcher, Scrim } from "@/lib/types";

export async function GET(request: Request) {
  const limited = await enforceRateLimit(request, { key: "cron-sync-matches", maxRequests: 30, windowMs: 60_000 });
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

    const results: Array<{
      source: "scrim" | "watcher";
      id: string;
      matchId: string;
      ok: boolean;
      status?: string;
      error?: string;
    }> = [];

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
        await writeAuditLog({
          action: "auto_detect_started",
          entityType: "pubg_import_candidate",
          entityId: watcher.id,
          newValue: {
            watcherId: watcher.id,
            eventId: watcher.tournamentId ?? watcher.scrimId ?? null,
            matchId: null,
            confidenceScore: null,
            reason: "Auto-detect sweep started.",
            actor: "system",
            timestamp: new Date().toISOString(),
          },
        }).catch(() => null);

        if (!watcher.scrimId && !watcher.tournamentId) {
          results.push({
            source: "watcher",
            id: watcher.id,
            matchId: "configuration",
            ok: false,
            error: "Watcher must be scoped to a scrim or tournament before candidate discovery can run.",
          });
          continue;
        }

        const lookup = watcher.playerId
          ? await fetchPubgPlayerRecentMatchesById(watcher.playerId, 10).catch(() =>
              fetchPubgPlayerRecentMatches(watcher.playerName, 10)
            )
          : await fetchPubgPlayerRecentMatches(watcher.playerName, 10);
        const knownMatchIds = new Set(watcher.processedMatchIds ?? watcher.importedMatchIds ?? []);
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
            const previewResult = await previewPubgMatches(pendingMatchIds, {
              tournamentId: watcher.tournamentId,
              scrimId: watcher.scrimId,
              autoCreateDay: false,
            });

            for (const preview of previewResult.previews) {
              await cachePendingImportPreview({
                context: previewResult.context,
                preview,
                sourceMatchId: preview.matchId,
              });
              knownMatchIds.add(preview.matchId);
              const candidate = await processAutoDetectedPubgCandidate(watcher, preview);
              results.push({
                source: "watcher",
                id: watcher.id,
                matchId: preview.matchId,
                ok: candidate.status !== "failed",
                status: candidate.status,
                error: candidate.error,
              });
            }

            for (const result of previewResult.errors) {
              results.push({
                source: "watcher",
                id: watcher.id,
                matchId: result.matchId,
                ok: false,
                error: result.error,
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

        const latestWatcher = await getDocument<PubgImportWatcher>(COLLECTIONS.pubgImportWatchers, watcher.id).catch(
          () => null
        );
        await saveDocument(COLLECTIONS.pubgImportWatchers, watcher.id, {
          playerId: watcher.playerId ?? lookup.playerId,
          shardId: watcher.shardId ?? lookup.shardId,
          importedMatchIds: latestWatcher?.importedMatchIds ?? watcher.importedMatchIds,
          processedMatchIds: Array.from(new Set(latestWatcher?.processedMatchIds ?? Array.from(knownMatchIds))).slice(-100),
          lastCheckedAt: new Date().toISOString(),
          lastImportedAt: latestWatcher?.lastImportedAt ?? watcher.lastImportedAt,
          lastDetectedAt: latestWatcher?.lastDetectedAt ?? watcher.lastDetectedAt,
          lastCandidateStatus: latestWatcher?.lastCandidateStatus ?? watcher.lastCandidateStatus,
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


