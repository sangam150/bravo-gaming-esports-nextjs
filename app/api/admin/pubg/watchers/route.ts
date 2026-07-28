import { requireAdmin } from "@/lib/admin-auth";
import { COLLECTIONS, deleteDocument, fetchDocumentCollection, saveDocument } from "@/lib/document-store";
import { requireSameOrigin } from "@/lib/request-origin";
import { slugify } from "@/lib/slug-utils";
import type { PubgImportWatcher } from "@/lib/types";

function buildWatcherId(watcher: Partial<PubgImportWatcher> & { playerName: string }) {
  return [
    watcher.playerId ? slugify(watcher.playerId) : slugify(watcher.playerName),
    watcher.scrimId ? slugify(watcher.scrimId) : watcher.tournamentId ? slugify(watcher.tournamentId) : "general",
  ].join("--");
}

export async function GET(request: Request) {
  const unauthorized = await requireAdmin(request);
  if (unauthorized) return unauthorized;

  const watchers = await fetchDocumentCollection<PubgImportWatcher>(COLLECTIONS.pubgImportWatchers, 100).catch(() => []);
  watchers.sort((firstWatcher, secondWatcher) => (secondWatcher.updatedAt ?? "").localeCompare(firstWatcher.updatedAt ?? ""));

  return Response.json({ success: true, data: watchers });
}

export async function POST(request: Request) {
  const invalidOrigin = requireSameOrigin(request);
  if (invalidOrigin) return invalidOrigin;
  const unauthorized = await requireAdmin(request);
  if (unauthorized) return unauthorized;

  try {
    const body = (await request.json()) as Partial<PubgImportWatcher> & {
      playerName?: string;
    };
    const playerName = body.playerName?.trim();

    if (!playerName) {
      return Response.json({ error: "playerName is required" }, { status: 400 });
    }

    const watcher: PubgImportWatcher = {
      id: buildWatcherId({ ...body, playerName }),
      playerName,
      playerId: body.playerId?.trim() || undefined,
      shardId: body.shardId?.trim() || undefined,
      tournamentId: body.tournamentId?.trim() || undefined,
      scrimId: body.scrimId?.trim() || undefined,
      enabled: body.enabled !== false,
      autoImportNewMatches: body.autoImportNewMatches !== false,
      autoPublishCandidates: body.autoPublishCandidates === true,
      importedMatchIds: Array.from(new Set(body.importedMatchIds ?? [])).slice(0, 50),
      processedMatchIds: Array.from(new Set(body.processedMatchIds ?? body.importedMatchIds ?? [])).slice(0, 100),
      lastCheckedAt: body.lastCheckedAt,
      lastImportedAt: body.lastImportedAt,
      lastDetectedAt: body.lastDetectedAt,
      lastCandidateStatus: body.lastCandidateStatus?.trim() || undefined,
    };

    await saveDocument(COLLECTIONS.pubgImportWatchers, watcher.id, watcher as unknown as Record<string, unknown>);
    return Response.json({ success: true, data: watcher });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const invalidOrigin = requireSameOrigin(request);
  if (invalidOrigin) return invalidOrigin;
  const unauthorized = await requireAdmin(request);
  if (unauthorized) return unauthorized;

  try {
    const body = (await request.json()) as Partial<PubgImportWatcher> & {
      id?: string;
    };
    const watcherId = body.id?.trim();

    if (!watcherId) {
      return Response.json({ error: "id is required" }, { status: 400 });
    }

    await saveDocument(COLLECTIONS.pubgImportWatchers, watcherId, body as Record<string, unknown>);
    return Response.json({ success: true, data: { id: watcherId } });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const invalidOrigin = requireSameOrigin(request);
  if (invalidOrigin) return invalidOrigin;
  const unauthorized = await requireAdmin(request);
  if (unauthorized) return unauthorized;

  const { searchParams } = new URL(request.url);
  const watcherId = searchParams.get("id")?.trim();

  if (!watcherId) {
    return Response.json({ error: "id is required" }, { status: 400 });
  }

  await deleteDocument(COLLECTIONS.pubgImportWatchers, watcherId);
  return Response.json({
    success: true,
    data: { id: watcherId, deleted: true },
  });
}
