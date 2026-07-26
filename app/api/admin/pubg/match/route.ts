import { requireAdmin } from "@/lib/admin-auth";
import { writeAuditLogFromRequest } from "@/lib/audit-logs";
import {
  cachePendingImportPreview,
  getLatestRawImportPayload,
  importPubgMatchesRelational,
  repairImportedPubgMatchFromCache,
  resetImportedPubgMatch,
} from "@/lib/pubg-import-relational";
import { previewPubgMatch, previewPubgMatches } from "@/lib/pubg-sync";
import { enforceRateLimit } from "@/lib/rate-limit";
import { revalidateCompetitionPaths } from "@/lib/revalidate-public";
import { logServerError } from "@/lib/server-monitoring";

function getRouteErrorMessage(error: unknown) {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  if (error && typeof error === "object") {
    const message = "message" in error && typeof error.message === "string" ? error.message.trim() : "";
    const code = "code" in error && typeof error.code === "string" ? error.code.trim() : "";
    const details = "details" in error && typeof error.details === "string" ? error.details.trim() : "";
    const hint = "hint" in error && typeof error.hint === "string" ? error.hint.trim() : "";
    const parts = [message, code ? `code=${code}` : "", details, hint].filter(Boolean);
    if (parts.length > 0) {
      return parts.join(" | ");
    }

    try {
      return JSON.stringify(error);
    } catch {
      return String(error);
    }
  }

  return String(error);
}

function normalizeMatchIds(body: Record<string, unknown>) {
  const rawMatchIds = Array.isArray(body.matchIds)
    ? body.matchIds
    : typeof body.matchIds === "string"
      ? body.matchIds.split(/[\n,]+/g)
      : [];
  const singleMatchId = typeof body.matchId === "string" ? body.matchId : "";

  return Array.from(
    new Set([singleMatchId, ...rawMatchIds].map((value) => (typeof value === "string" ? value.trim() : "")).filter(Boolean)),
  );
}

function normalizeDaySetup(body: Record<string, unknown>) {
  const mapRotation = Array.isArray(body.dayMapRotation)
    ? body.dayMapRotation.filter((value): value is string => typeof value === "string" && Boolean(value.trim()))
    : typeof body.dayMapRotation === "string"
      ? body.dayMapRotation
          .split(/[\n,]+/g)
          .map((value) => value.trim())
          .filter(Boolean)
      : undefined;

  return {
    dayTitle: typeof body.dayTitle === "string" ? body.dayTitle : undefined,
    dayDate: typeof body.dayDate === "string" ? body.dayDate : undefined,
    dayMap: typeof body.dayMap === "string" ? body.dayMap : undefined,
    dayLobbyTime: typeof body.dayLobbyTime === "string" ? body.dayLobbyTime : undefined,
    dayMapRotation: mapRotation && mapRotation.length > 0 ? mapRotation : undefined,
  };
}

function getErrorStatus(message: string) {
  const normalizedMessage = message.toLowerCase();
  if (normalizedMessage.includes("permission denied") || normalizedMessage.includes("unauthorized")) return 403;
  if (normalizedMessage.includes("invalid match id") || normalizedMessage.includes("pubg api error 404")) return 400;
  if (normalizedMessage.includes("scrim day missing")) return 400;
  if (normalizedMessage.includes("quota") || normalizedMessage.includes("resource-exhausted")) return 429;
  if (normalizedMessage.includes("missing pubg_api_key")) return 503;
  if (normalizedMessage.includes("pubg api error")) return 502;
  if (normalizedMessage.includes("database write failed")) return 500;
  return 500;
}

export async function POST(request: Request) {
  const unauthorized = await requireAdmin(request);
  if (unauthorized) return unauthorized;

  const limited = await enforceRateLimit(request, {
    key: "admin-pubg-match",
    maxRequests: 12,
    windowMs: 60_000,
  });
  if (limited) return limited;

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const matchIds = normalizeMatchIds(body);
    const daySetup = normalizeDaySetup(body);
    if (matchIds.length === 0) {
      return Response.json({ error: "At least one PUBG match ID is required." }, { status: 400 });
    }

    const options = {
      tournamentId: typeof body.tournamentId === "string" ? body.tournamentId : undefined,
      scrimId: typeof body.scrimId === "string" ? body.scrimId : undefined,
      seasonId: typeof body.seasonId === "string" ? body.seasonId : undefined,
      seasonDayNumber: typeof body.seasonDayNumber === "number" && Number.isFinite(body.seasonDayNumber) ? body.seasonDayNumber : undefined,
      autoCreateDay: body.autoCreateDay !== false,
      ...daySetup,
    };

    if (matchIds.length === 1 && !Array.isArray(body.matchIds)) {
      const result = await previewPubgMatch(matchIds[0], options);
      await cachePendingImportPreview({
        context: {
          seasonId: result.seasonId,
          seasonDayNumber: result.seasonDayNumber,
          tournamentId: result.tournamentId,
          tournamentTitle: result.tournamentTitle,
          scrimId: result.scrimId,
          scrimTitle: result.scrimTitle,
        },
        preview: result,
        sourceMatchId: result.matchId,
      });
      return Response.json({ success: true, data: result });
    }

    const result = await previewPubgMatches(matchIds, options);
    for (const preview of result.previews) {
      await cachePendingImportPreview({
        context: result.context,
        preview,
        sourceMatchId: preview.matchId,
      });
    }
    return Response.json({
      success: result.errors.length === 0,
      data: result,
      message:
        result.previews.length > 0
          ? `Prepared preview for ${result.previews.length} PUBG match${result.previews.length === 1 ? "" : "es"}.`
          : undefined,
    });
  } catch (error: unknown) {
    await logServerError("admin.pubg.match", error, request);
    const message = getRouteErrorMessage(error);
    return Response.json({ error: message }, { status: getErrorStatus(message) });
  }
}

export async function GET(request: Request) {
  const unauthorized = await requireAdmin(request);
  if (unauthorized) return unauthorized;

  const { searchParams } = new URL(request.url);
  const matchId = searchParams.get("matchId")?.trim();
  if (!matchId) {
    return Response.json({ error: "matchId is required." }, { status: 400 });
  }

  try {
    const raw = await getLatestRawImportPayload(matchId);
    if (!raw) {
      return Response.json({ error: "No cached raw payload found for this match." }, { status: 404 });
    }

    return Response.json({ success: true, data: { matchId, raw } });
  } catch (error: unknown) {
    await logServerError("admin.pubg.match.raw", error, request);
    const message = getRouteErrorMessage(error);
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const unauthorized = await requireAdmin(request);
  if (unauthorized) return unauthorized;

  const limited = await enforceRateLimit(request, {
    key: "admin-pubg-match-actions",
    maxRequests: 20,
    windowMs: 60_000,
  });
  if (limited) return limited;

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const action = typeof body.action === "string" ? body.action : "";
    const matchId = typeof body.matchId === "string" ? body.matchId.trim() : "";
    if (!matchId) {
      return Response.json({ error: "matchId is required." }, { status: 400 });
    }

    if (action === "repair") {
      const repaired = await repairImportedPubgMatchFromCache(matchId, {
        publish: body.publish === true,
        forcePublished: body.forcePublished === true,
      });
      await writeAuditLogFromRequest(request, {
        action: "repair",
        entityType: "match",
        entityId: repaired.id,
        newValue: repaired,
      });
      revalidateCompetitionPaths(repaired.id);
      return Response.json({
        success: true,
        data: repaired,
        message: "Match repaired from cached import payload.",
      });
    }

    if (action === "reset") {
      const resetResult = await resetImportedPubgMatch(matchId, {
        confirmPublished: body.confirmPublished === true,
      });
      await writeAuditLogFromRequest(request, {
        action: "reset",
        entityType: "match",
        entityId: resetResult.id,
        oldValue: resetResult.before,
      });
      revalidateCompetitionPaths(resetResult.id);
      return Response.json({
        success: true,
        data: { id: resetResult.id },
        message: "Imported match reset successfully.",
      });
    }

    if (action === "reimport") {
      const importResult = await importPubgMatchesRelational([matchId], {
        tournamentId: typeof body.tournamentId === "string" ? body.tournamentId : undefined,
        scrimId: typeof body.scrimId === "string" ? body.scrimId : undefined,
        seasonId: typeof body.seasonId === "string" ? body.seasonId : undefined,
        seasonDayNumber:
          typeof body.seasonDayNumber === "number" && Number.isFinite(body.seasonDayNumber) ? body.seasonDayNumber : undefined,
        autoCreateDay: body.autoCreateDay !== false,
        duplicateMode:
          body.duplicateMode === "skip" || body.duplicateMode === "error" || body.duplicateMode === "overwrite"
            ? body.duplicateMode
            : "overwrite",
        publish: body.publish === true,
        forceRefetch: body.forceRefetch === true,
      });
      await writeAuditLogFromRequest(request, {
        action: "reimport",
        entityType: "match",
        entityId: matchId,
        newValue: importResult,
      });
      revalidateCompetitionPaths();
      return Response.json({
        success: importResult.failedCount === 0,
        data: importResult,
      });
    }

    return Response.json({ error: "Unsupported action." }, { status: 400 });
  } catch (error: unknown) {
    await logServerError("admin.pubg.match.patch", error, request);
    const message = getRouteErrorMessage(error);
    return Response.json({ error: message }, { status: getErrorStatus(message) });
  }
}
