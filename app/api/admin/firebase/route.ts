import { requireAdmin } from "@/lib/admin-auth";
import { fetchFirestoreCollection } from "@/lib/firebase";

export async function POST(request: Request) {
  const unauthorized = await requireAdmin(request);
  if (unauthorized) return unauthorized;

  try {
    const body = await request.json();
    const collectionName = body.collectionName?.trim();

    if (!collectionName) {
      return new Response(JSON.stringify({ error: "collectionName is required" }), { status: 400 });
    }

    const data = await fetchFirestoreCollection(collectionName);
    return new Response(JSON.stringify({ success: true, data }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error?.message || String(error) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
