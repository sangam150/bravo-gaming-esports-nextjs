import { requireAdmin } from "@/lib/admin-auth";
import { getSeasons, saveSeason } from "@/lib/data";

export async function GET() {
  const data = await getSeasons();
  return Response.json({ success: true, data });
}

export async function POST(request: Request) {
  const unauthorized = await requireAdmin(request);
  if (unauthorized) return unauthorized;

  try {
    const body = await request.json();
    if (!body.title) {
      return Response.json({ error: "title is required" }, { status: 400 });
    }

    const result = await saveSeason(body, body.id);
    return Response.json({ success: true, data: result });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return Response.json({ error: message }, { status: 500 });
  }
}
