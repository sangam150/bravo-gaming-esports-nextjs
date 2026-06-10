import { requireAdmin } from "@/lib/admin-auth";
import { createNextSeasonDay } from "@/lib/admin-season-days";
import { enforceRateLimit } from "@/lib/rate-limit";
import { logServerError } from "@/lib/server-monitoring";

export async function POST(request: Request) {
  const unauthorized = await requireAdmin(request);
  if (unauthorized) return unauthorized;

  const limited = enforceRateLimit(request, { key: "admin-create-next-day", maxRequests: 10, windowMs: 60_000 });
  if (limited) return limited;

  try {
    const body = await request.json().catch(() => ({}));
    const seasonId = typeof body.seasonId === "string" ? body.seasonId.trim() : "";
    if (!seasonId) {
      return Response.json({ error: "seasonId is required" }, { status: 400 });
    }

    const result = await createNextSeasonDay(seasonId);
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
