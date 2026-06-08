import { deletePlayer, getPlayer, savePlayer } from "@/lib/data";
import { requireAdmin } from "@/lib/admin-auth";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: RouteParams) {
  const { id } = await params;
  const player = await getPlayer(id);
  if (!player) return Response.json({ error: "Player not found" }, { status: 404 });
  return Response.json({ success: true, data: player });
}

export async function PUT(request: Request, { params }: RouteParams) {
  const unauthorized = await requireAdmin(request);
  if (unauthorized) return unauthorized;
  const { id } = await params;
  try {
    const body = await request.json();
    const existing = await getPlayer(id);
    if (!existing) return Response.json({ error: "Player not found" }, { status: 404 });
    const result = await savePlayer({ ...existing, ...body }, id);
    return Response.json({ success: true, data: result });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  const unauthorized = await requireAdmin(request);
  if (unauthorized) return unauthorized;
  const { id } = await params;
  await deletePlayer(id);
  return Response.json({ success: true, data: { id, deleted: true } });
}
