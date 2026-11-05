import { requireAdmin } from "@/lib/admin-auth";
import { getSeasons, saveSeason } from "@/lib/data";
import { requireSameOrigin } from "@/lib/request-origin";

export async function GET(request: Request) {
  const internal = new URL(request.url).searchParams.get("admin") === "true";
  if (internal) {
    const denied = await requireAdmin(request);
    if (denied) return denied;
  }
  const data = await getSeasons({ includeInternal: internal });
  return Response.json({ success: true, data }, { headers: { "Cache-Control": internal ? "private, no-store" : "no-cache" } });
}

export async function POST(request: Request) {
  const unauthorized = await requireAdmin(request);
  if (unauthorized) return unauthorized;
  const invalidOrigin = requireSameOrigin(request);
  if (invalidOrigin) return invalidOrigin;

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
