import { requireAdmin } from "@/lib/admin-auth";
import { createNextSeasonDay, ensureSeasonDay } from "@/lib/admin-season-days";
import { enforceRateLimit } from "@/lib/rate-limit";
import { revalidateTournamentPaths } from "@/lib/revalidate-public";
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
    dayMatchCount:
      typeof body.dayMatchCount === "number" && Number.isFinite(body.dayMatchCount)
        ? Math.max(1, Math.round(body.dayMatchCount))
        : undefined,
  };
}

export async function POST(request: Request) {
  const unauthorized = await requireAdmin(request);
  if (unauthorized) return unauthorized;

  const limited = enforceRateLimit(request, { key: "admin-create-next-day", maxRequests: 10, windowMs: 60_000 });
  if (limited) return limited;

  try {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const seasonId = typeof body.seasonId === "string" ? body.seasonId.trim() : "";
    const daySetup = normalizeDaySetup(body);
    const targetDayNumber =
      typeof body.targetDayNumber === "number" && Number.isFinite(body.targetDayNumber)
        ? body.targetDayNumber
        : undefined;
    if (!seasonId) {
      return Response.json({ error: "seasonId is required" }, { status: 400 });
    }

    if (targetDayNumber) {
      const result = await ensureSeasonDay(seasonId, targetDayNumber, { overrides: daySetup });
      revalidateTournamentPaths(result.tournament?.id);
      const createdMatchCount = result.createdMatches?.length ?? 0;
      return Response.json({
        success: true,
        data: result,
        message: result.created
          ? `Prepared Day ${targetDayNumber} and ${createdMatchCount} draft match slot${createdMatchCount === 1 ? "" : "s"}.`
          : createdMatchCount > 0
            ? `Day ${targetDayNumber} is ready and ${createdMatchCount} missing draft match slot${createdMatchCount === 1 ? "" : "s"} were added.`
            : `Day ${targetDayNumber} is ready for imports.`,
      });
    }

    const result = await createNextSeasonDay(seasonId, daySetup);
    revalidateTournamentPaths(result.tournament.id);
    const createdMatchCount = result.createdMatches?.length ?? 0;

    return Response.json({
      success: true,
      data: result,
      message: `Created Day ${result.nextDayNumber}, set it active, and prepared ${createdMatchCount} draft match slot${createdMatchCount === 1 ? "" : "s"}.`,
    });
  } catch (error: unknown) {
    await logServerError("admin.seasons.create-next-day", error, request);
    const message = getRouteErrorMessage(error);
    return Response.json({ error: message }, { status: 500 });
  }
}
