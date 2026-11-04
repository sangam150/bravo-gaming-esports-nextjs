import { COLLECTIONS, fetchDocumentCollection } from "@/lib/document-store";
import type { TournamentMatch } from "@/lib/types";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: NextRequest) {
  const matchId = request.nextUrl.searchParams.get("matchId")?.trim();
  if (!matchId) {
    return NextResponse.json({ error: "Add a matchId to the overlay URL." }, { status: 400 });
  }

  try {
    const matches = await fetchDocumentCollection<TournamentMatch>(COLLECTIONS.matches, 500);
    const match = matches.find((item) => {
      const isPublic = item.status === "published" && !item.deletedAt;
      return isPublic && (item.id === matchId || item.pubgMatchId === matchId || item.externalMatchId === matchId);
    });

    if (!match) {
      return NextResponse.json({ error: "No published match found for that match ID." }, { status: 404 });
    }

    return NextResponse.json(
      { match },
      { headers: { "Cache-Control": "no-store, max-age=0", "X-Content-Type-Options": "nosniff" } },
    );
  } catch {
    return NextResponse.json({ error: "Match data is temporarily unavailable. Check the Supabase connection." }, { status: 503 });
  }
}
