import { requireAdmin } from "@/lib/admin-auth";
import { writeAuditLogFromRequest } from "@/lib/audit-logs";
import { getPlayers, savePlayer } from "@/lib/data";
import { revalidatePlayerPaths } from "@/lib/revalidate-public";

export async function GET() {
  const data = await getPlayers();
  return Response.json({ success: true, data });
}

export async function POST(request: Request) {
  const unauthorized = await requireAdmin(request);
  if (unauthorized) return unauthorized;
  try {
    const body = await request.json();
    if (!body.name) {
      return Response.json({ error: "name is required" }, { status: 400 });
    }
    const result = await savePlayer(body, body.id);
    await writeAuditLogFromRequest(request, {
      action: "create",
      entityType: "player",
      entityId: result.id,
      newValue: result,
    });
    revalidatePlayerPaths(result.slug ?? result.id);
    return Response.json({ success: true, data: result });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return Response.json({ error: message }, { status: 500 });
  }
}
