import { COLLECTIONS, fetchDocumentCollection } from "@/lib/document-store";
import type { TournamentMatch } from "@/lib/types";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const matches = await fetchDocumentCollection<TournamentMatch>(COLLECTIONS.matches, 500);
    const data = matches
      .filter((match) => match.status === "published" && !match.deletedAt)
      .map((match) => ({
        id: match.id,
        pubgMatchId: match.pubgMatchId,
        sequenceNumber: match.sequenceNumber ?? match.matchNumber ?? 0,
        map: match.map,
        eventName: match.eventName ?? "Bravo Gaming Scrims",
        playedAt: match.playedAt,
        winner: match.winner,
      }));

    return NextResponse.json(
      { data },
      { headers: { "Cache-Control": "no-store, max-age=0", "X-Content-Type-Options": "nosniff" } },
    );
  } catch {
    return NextResponse.json({ error: "Could not load published matches. Check the Supabase connection." }, { status: 503 });
  }
}
