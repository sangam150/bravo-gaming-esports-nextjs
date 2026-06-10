import { requireAdmin } from "@/lib/admin-auth";
import { syncBravoDailyScrimSeason } from "@/lib/bravo-season-sync";

export async function POST(request: Request) {
  const unauthorized = await requireAdmin(request);
  if (unauthorized) return unauthorized;

  try {
    const body = await request.json().catch(() => ({}));
    const result = await syncBravoDailyScrimSeason({
      configuredDays:
        typeof body.configuredDays === "number" && Number.isFinite(body.configuredDays)
          ? body.configuredDays
          : undefined,
      currentDay:
        typeof body.currentDay === "number" && Number.isFinite(body.currentDay)
          ? body.currentDay
          : undefined,
    });

    return Response.json({
      success: true,
      data: result,
      message: `Synced Bravo daily scrims Season 1 with ${result.totals.tournaments} tournament records and ${result.totals.matches} stored matches.`,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return Response.json({ error: message }, { status: 500 });
  }
}
