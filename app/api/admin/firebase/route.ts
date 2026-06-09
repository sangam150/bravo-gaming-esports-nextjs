import { requireAdmin } from "@/lib/admin-auth";
import { COLLECTIONS, fetchFirestoreCollection } from "@/lib/firebase";
import { enforceRateLimit } from "@/lib/rate-limit";
import { logServerError } from "@/lib/server-monitoring";

const allowedCollections = new Set(Object.values(COLLECTIONS));

export async function POST(request: Request) {
  const unauthorized = await requireAdmin(request);
  if (unauthorized) return unauthorized;

  const limited = enforceRateLimit(request, { key: "admin-firestore-browser", maxRequests: 20, windowMs: 60_000 });
  if (limited) return limited;

  try {
    const body = await request.json();
    const collectionName = body.collectionName?.trim();

    if (!collectionName) {
      return new Response(JSON.stringify({ error: "collectionName is required" }), { status: 400 });
    }

    if (!allowedCollections.has(collectionName)) {
      return new Response(JSON.stringify({ error: "Unsupported collectionName" }), { status: 400 });
    }

    const data = await fetchFirestoreCollection(collectionName);
    return new Response(JSON.stringify({ success: true, data }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    await logServerError("admin.firestore.browser", error, request);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
