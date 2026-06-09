import { COLLECTIONS, fetchFirestoreCollection } from "@/lib/firebase";
import { importPubgMatch } from "@/lib/pubg-sync";
import type { Scrim } from "@/lib/types";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const scrims = await fetchFirestoreCollection<Scrim>(COLLECTIONS.scrims, 50);
    const pending = scrims.filter(
      (s) => (s.pubgMatchId || (s.pubgMatchIds?.length ?? 0) > 0) && (s.status === "live" || s.status === "waiting_for_data")
    );

    const results: { scrimId: string; matchId: string; ok: boolean; error?: string }[] = [];

    for (const scrim of pending) {
      const matchIds = Array.from(
        new Set([...(scrim.pubgMatchIds ?? []), scrim.pubgMatchId].filter((matchId): matchId is string => Boolean(matchId)))
      );
      for (const matchId of matchIds) {
        try {
          await importPubgMatch(matchId, { scrimId: scrim.id });
          results.push({ scrimId: scrim.id, matchId, ok: true });
        } catch (error: unknown) {
          results.push({
            scrimId: scrim.id,
            matchId,
            ok: false,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }
    }

    return Response.json({ success: true, synced: results.filter((r) => r.ok).length, results });
  } catch (error: unknown) {
    return Response.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
