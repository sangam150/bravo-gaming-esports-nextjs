import { requireAdmin } from "@/lib/admin-auth";
import { syncBravoDailyScrimSeason } from "@/lib/bravo-season-sync";
import { revalidateTournamentPaths } from "@/lib/revalidate-public";

export async function POST(request: Request) {
  const unauthorized = await requireAdmin(request);
  if (unauthorized) return unauthorized;

  try {
    const body = await request.json().catch(() => ({}));
    const result = await syncBravoDailyScrimSeason({
      configuredDays: typeof body.configuredDays === "number" && Number.isFinite(body.configuredDays) ? body.configuredDays : undefined,
      currentDay: typeof body.currentDay === "number" && Number.isFinite(body.currentDay) ? body.currentDay : undefined,
    });
    revalidateTournamentPaths();
    return Response.json({
      success: true,
      data: result,
      message: `Imported Bravo Day 1 to Day 3 reference results and synced ${result.totals.tournaments} Bravo daily scrim records into the Supabase data store.`,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return Response.json({ error: message }, { status: 500 });
  }
}
