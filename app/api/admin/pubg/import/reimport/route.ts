import { requireAdmin } from "@/lib/admin-auth";
import { writeAuditLogFromRequest } from "@/lib/audit-logs";
import { importPubgMatchesRelational } from "@/lib/pubg-import-relational";
import { enforceRateLimit } from "@/lib/rate-limit";
import { revalidateCompetitionPaths } from "@/lib/revalidate-public";
import { logServerError } from "@/lib/server-monitoring";
import type { PubgDuplicateMode } from "@/lib/types";

export async function POST(request: Request) {
  const unauthorized = await requireAdmin(request);
  if (unauthorized) return unauthorized;

  const limited = enforceRateLimit(request, { key: "admin-pubg-reimport", maxRequests: 20, windowMs: 60_000 });
  if (limited) return limited;

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const matchId = typeof body.matchId === "string" ? body.matchId.trim() : "";
    if (!matchId) {
      return Response.json({ error: "matchId is required." }, { status: 400 });
    }

    const duplicateMode: PubgDuplicateMode =
      body.duplicateMode === "skip" || body.duplicateMode === "error" || body.duplicateMode === "overwrite"
        ? (body.duplicateMode as PubgDuplicateMode)
        : "overwrite";

    const result = await importPubgMatchesRelational([matchId], {
      tournamentId: typeof body.tournamentId === "string" ? body.tournamentId : undefined,
      scrimId: typeof body.scrimId === "string" ? body.scrimId : undefined,
      seasonId: typeof body.seasonId === "string" ? body.seasonId : undefined,
      seasonDayNumber:
        typeof body.seasonDayNumber === "number" && Number.isFinite(body.seasonDayNumber)
          ? body.seasonDayNumber
          : undefined,
      autoCreateDay: body.autoCreateDay !== false,
      dayTitle: typeof body.dayTitle === "string" ? body.dayTitle : undefined,
      dayDate: typeof body.dayDate === "string" ? body.dayDate : undefined,
      dayMap: typeof body.dayMap === "string" ? body.dayMap : undefined,
      dayLobbyTime: typeof body.dayLobbyTime === "string" ? body.dayLobbyTime : undefined,
      dayMapRotation: Array.isArray(body.dayMapRotation)
        ? body.dayMapRotation.filter((value): value is string => typeof value === "string" && Boolean(value.trim()))
        : undefined,
      duplicateMode,
      publish: body.publish === true,
      forceRefetch: body.forceRefetch === true,
    });

    await writeAuditLogFromRequest(request, {
      action: "reimport",
      entityType: "match",
      entityId: matchId,
      newValue: result,
    });

    revalidateCompetitionPaths();
    return Response.json({ success: result.failedCount === 0, data: result });
  } catch (error: unknown) {
    await logServerError("admin.pubg.import.reimport", error, request);
    const message = error instanceof Error ? error.message : String(error);
    return Response.json({ error: message }, { status: 500 });
  }
}
