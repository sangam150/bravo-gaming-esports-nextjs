import { requireAdmin } from "@/lib/admin-auth";
import { importPubgMatch, importPubgMatches } from "@/lib/pubg-sync";
import { enforceRateLimit } from "@/lib/rate-limit";
import { logServerError } from "@/lib/server-monitoring";
import type { PubgDuplicateMode } from "@/lib/types";

function normalizeMatchIds(body: Record<string, unknown>) {
  const rawMatchIds = Array.isArray(body.matchIds)
    ? body.matchIds
    : typeof body.matchIds === "string"
      ? body.matchIds.split(/[\n,]+/g)
      : [];
  const singleMatchId = typeof body.matchId === "string" ? body.matchId : "";

  return Array.from(
    new Set(
      [singleMatchId, ...rawMatchIds]
        .map((value) => (typeof value === "string" ? value.trim() : ""))
        .filter(Boolean)
    )
  );
}

function normalizeDaySetup(body: Record<string, unknown>) {
  const mapRotation =
    Array.isArray(body.dayMapRotation)
      ? body.dayMapRotation.filter((value): value is string => typeof value === "string" && Boolean(value.trim()))
      : typeof body.dayMapRotation === "string"
        ? body.dayMapRotation.split(/[\n,]+/g).map((value) => value.trim()).filter(Boolean)
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
  if (normalizedMessage.includes("duplicate match")) return 409;
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

  const limited = enforceRateLimit(request, { key: "admin-pubg-match-import", maxRequests: 12, windowMs: 60_000 });
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
      seasonDayNumber:
        typeof body.seasonDayNumber === "number" && Number.isFinite(body.seasonDayNumber)
          ? body.seasonDayNumber
          : undefined,
      autoCreateDay: body.autoCreateDay !== false,
      screenshotUrl: typeof body.screenshotUrl === "string" ? body.screenshotUrl : undefined,
      duplicateMode:
        body.duplicateMode === "skip" || body.duplicateMode === "error" || body.duplicateMode === "overwrite"
          ? (body.duplicateMode as PubgDuplicateMode)
          : "overwrite",
      ...daySetup,
    };

    if (matchIds.length === 1 && !Array.isArray(body.matchIds)) {
      const result = await importPubgMatch(matchIds[0], options);
      return Response.json({ success: true, data: result });
    }

    const result = await importPubgMatches(matchIds, options);
    return Response.json({
      success: result.failedCount === 0,
      data: result,
      message:
        result.failedCount > 0
          ? `Imported ${result.importedCount} match${result.importedCount === 1 ? "" : "es"} with ${result.failedCount} failure${result.failedCount === 1 ? "" : "s"}.`
          : `Imported ${result.importedCount} match${result.importedCount === 1 ? "" : "es"} successfully.`,
    });
  } catch (error: unknown) {
    await logServerError("admin.matches.import", error, request);
    const message = error instanceof Error ? error.message : String(error);
    return Response.json({ error: message }, { status: getErrorStatus(message) });
  }
}
