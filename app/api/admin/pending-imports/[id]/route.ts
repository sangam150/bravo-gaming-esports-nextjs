import { requireAdmin } from "@/lib/admin-auth";
import { COLLECTIONS, deleteFirestoreDocument, getFirestoreDocument, saveFirestoreDocument } from "@/lib/firebase";
import { importPubgMatches } from "@/lib/pubg-sync";
import { enforceRateLimit } from "@/lib/rate-limit";
import { logServerError } from "@/lib/server-monitoring";
import type { PubgImportBatch } from "@/lib/types";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const unauthorized = await requireAdmin(request);
  if (unauthorized) return unauthorized;

  const limited = enforceRateLimit(request, { key: "admin-pending-imports-action", maxRequests: 20, windowMs: 60_000 });
  if (limited) return limited;

  const { id } = await context.params;

  try {
    const body = (await request.json().catch(() => ({}))) as { action?: string; reason?: string };
    const pendingImport = await getFirestoreDocument<PubgImportBatch>(COLLECTIONS.pubgImportBatches, id);
    if (!pendingImport) {
      return Response.json({ error: "Pending import batch not found." }, { status: 404 });
    }

    if (pendingImport.status && pendingImport.status !== "pending") {
      return Response.json(
        { error: `This import batch is already ${pendingImport.status}.` },
        { status: 409 }
      );
    }

    if (body.action === "reject") {
      await saveFirestoreDocument(COLLECTIONS.pubgImportBatches, id, {
        status: "rejected",
        rejectedAt: new Date().toISOString(),
        rejectedReason: body.reason?.trim() || undefined,
      });
      return Response.json({ success: true, message: "Pending import rejected." });
    }

    if (body.action !== "approve") {
      return Response.json({ error: "Unsupported action." }, { status: 400 });
    }

    const importResult = await importPubgMatches(pendingImport.matchIds, {
      tournamentId: pendingImport.tournamentId,
      scrimId: pendingImport.scrimId,
      seasonId: pendingImport.seasonId,
      seasonDayNumber: pendingImport.seasonDayNumber,
      autoCreateDay: true,
      screenshotUrl: pendingImport.screenshotUrl,
      duplicateMode: pendingImport.duplicateMode,
      matchEdits: pendingImport.matchEdits,
      dayTitle: pendingImport.dayTitle,
      dayDate: pendingImport.dayDate,
      dayMap: pendingImport.dayMap,
      dayLobbyTime: pendingImport.dayLobbyTime,
      dayMapRotation: pendingImport.dayMapRotation,
    });

    await saveFirestoreDocument(COLLECTIONS.pubgImportBatches, id, {
      status: "approved",
      approvedAt: new Date().toISOString(),
      importResult,
    });

    return Response.json({
      success: true,
      data: importResult,
      message: `Approved and published ${importResult.importedCount} match${importResult.importedCount === 1 ? "" : "es"}.`,
    });
  } catch (error: unknown) {
    await logServerError("admin.pending-imports.action", error, request);
    const message = error instanceof Error ? error.message : String(error);
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const unauthorized = await requireAdmin(request);
  if (unauthorized) return unauthorized;

  const limited = enforceRateLimit(request, { key: "admin-pending-imports-delete", maxRequests: 20, windowMs: 60_000 });
  if (limited) return limited;

  const { id } = await context.params;

  try {
    const pendingImport = await getFirestoreDocument<PubgImportBatch>(COLLECTIONS.pubgImportBatches, id);
    if (!pendingImport) {
      return Response.json({ error: "Pending import batch not found." }, { status: 404 });
    }

    await deleteFirestoreDocument(COLLECTIONS.pubgImportBatches, id);
    return Response.json({ success: true, message: "Pending import batch deleted." });
  } catch (error: unknown) {
    await logServerError("admin.pending-imports.delete", error, request);
    const message = error instanceof Error ? error.message : String(error);
    return Response.json({ error: message }, { status: 500 });
  }
}
