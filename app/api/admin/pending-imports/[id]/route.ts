import { requireAdmin } from "@/lib/admin-auth";
import { writeAuditLogFromRequest } from "@/lib/audit-logs";
import { COLLECTIONS, deleteDocument, getDocument, saveDocument } from "@/lib/document-store";
import { importPubgMatchesRelational } from "@/lib/pubg-import-relational";
import { enforceRateLimit } from "@/lib/rate-limit";
import { revalidateCompetitionPaths } from "@/lib/revalidate-public";
import { logServerError } from "@/lib/server-monitoring";
import type { PubgImportBatch } from "@/lib/types";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const unauthorized = await requireAdmin(request);
  if (unauthorized) return unauthorized;

  const limited = await enforceRateLimit(request, {
    key: "admin-pending-imports-action",
    maxRequests: 20,
    windowMs: 60_000,
  });
  if (limited) return limited;

  const { id } = await context.params;

  try {
    const body = (await request.json().catch(() => ({}))) as {
      action?: string;
      reason?: string;
    };
    const pendingImport = await getDocument<PubgImportBatch>(COLLECTIONS.pubgImportBatches, id);
    if (!pendingImport) {
      return Response.json({ error: "Pending import batch not found." }, { status: 404 });
    }

    if (pendingImport.status && pendingImport.status !== "pending") {
      return Response.json({ error: `This import batch is already ${pendingImport.status}.` }, { status: 409 });
    }

    if (body.action === "reject") {
      const previous = { ...pendingImport };
      await saveDocument(COLLECTIONS.pubgImportBatches, id, {
        status: "rejected",
        rejectedAt: new Date().toISOString(),
        rejectedReason: body.reason?.trim() || undefined,
      });
      await writeAuditLogFromRequest(request, {
        action: "reject",
        entityType: "pubg_import_batch",
        entityId: id,
        oldValue: previous,
        newValue: {
          ...previous,
          status: "rejected",
          rejectedReason: body.reason?.trim() || undefined,
        },
      });
      return Response.json({
        success: true,
        message: "Pending import rejected.",
      });
    }

    if (body.action !== "approve") {
      return Response.json({ error: "Unsupported action." }, { status: 400 });
    }

    const importResult = await importPubgMatchesRelational(pendingImport.matchIds, {
      tournamentId: pendingImport.tournamentId,
      scrimId: pendingImport.scrimId,
      seasonId: pendingImport.seasonId,
      seasonDayNumber: pendingImport.seasonDayNumber,
      autoCreateDay: true,
      duplicateMode: pendingImport.duplicateMode,
      matchEdits: pendingImport.matchEdits,
      dayTitle: pendingImport.dayTitle,
      dayDate: pendingImport.dayDate,
      dayMap: pendingImport.dayMap,
      dayLobbyTime: pendingImport.dayLobbyTime,
      dayMapRotation: pendingImport.dayMapRotation,
      // Keep explicit publish action separate from import approval.
      publish: false,
    });

    const previous = { ...pendingImport };
    await saveDocument(COLLECTIONS.pubgImportBatches, id, {
      status: "approved",
      approvedAt: new Date().toISOString(),
      importResult,
    });
    await writeAuditLogFromRequest(request, {
      action: "approve",
      entityType: "pubg_import_batch",
      entityId: id,
      oldValue: previous,
      newValue: { ...previous, status: "approved", importResult },
    });
    revalidateCompetitionPaths();

    return Response.json({
      success: true,
      data: importResult,
      message: `Approved and imported ${importResult.importedCount} match${importResult.importedCount === 1 ? "" : "es"} to draft. Publish when ready.`,
    });
  } catch (error: unknown) {
    await logServerError("admin.pending-imports.action", error, request);
    const message = error instanceof Error ? error.message : String(error);
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const unauthorized = await requireAdmin(request);
  if (unauthorized) return unauthorized;

  const limited = await enforceRateLimit(request, {
    key: "admin-pending-imports-delete",
    maxRequests: 20,
    windowMs: 60_000,
  });
  if (limited) return limited;

  const { id } = await context.params;

  try {
    const pendingImport = await getDocument<PubgImportBatch>(COLLECTIONS.pubgImportBatches, id);
    if (!pendingImport) {
      return Response.json({ error: "Pending import batch not found." }, { status: 404 });
    }

    await deleteDocument(COLLECTIONS.pubgImportBatches, id);
    return Response.json({
      success: true,
      message: "Pending import batch deleted.",
    });
  } catch (error: unknown) {
    await logServerError("admin.pending-imports.delete", error, request);
    const message = error instanceof Error ? error.message : String(error);
    return Response.json({ error: message }, { status: 500 });
  }
}
