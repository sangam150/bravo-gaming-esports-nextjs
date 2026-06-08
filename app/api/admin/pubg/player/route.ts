import { requireAdmin } from "@/lib/admin-auth";
import { pubgFetch, PUBG_SHARD } from "@/lib/pubg";
import { saveFirestoreDocument } from "@/lib/firebase";

export async function POST(request: Request) {
  const unauthorized = await requireAdmin(request);
  if (unauthorized) return unauthorized;

  try {
    const body = await request.json();
    const playerName = body.playerName?.trim();
    const saveToFirebase = Boolean(body.saveToFirebase);

    if (!playerName) {
      return new Response(JSON.stringify({ error: "playerName is required" }), { status: 400 });
    }

    const playerData = await pubgFetch(
      `/shards/${PUBG_SHARD}/players?filter[playerNames]=${encodeURIComponent(playerName)}`
    );

    let firebaseResult = null;
    if (saveToFirebase) {
      firebaseResult = await saveFirestoreDocument("pubgPlayers", playerName, playerData);
    }

    return new Response(
      JSON.stringify({ success: true, playerData, firebaseResult }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error?.message || String(error) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
