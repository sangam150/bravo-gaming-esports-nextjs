import { requireAdmin } from "@/lib/admin-auth";
import { createNextSeasonDay, ensureSeasonDay } from "@/lib/admin-season-days";
import { enforceRateLimit } from "@/lib/rate-limit";
import { logServerError } from "@/lib/server-monitoring";

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
      return Response.json({
        success: true,
        data: result,
        message: result.created
          ? `Prepared Day ${targetDayNumber} and linked it for imports.`
          : `Day ${targetDayNumber} is ready for imports.`,
      });
    }

    const result = await createNextSeasonDay(seasonId, daySetup);

    return Response.json({
      success: true,
      data: result,
      message: `Created Day ${result.nextDayNumber} and set it as the active scrim day.`,
    });
  } catch (error: unknown) {
    await logServerError("admin.seasons.create-next-day", error, request);
    const message = error instanceof Error ? error.message : String(error);
    return Response.json({ error: message }, { status: 500 });
  }
}
