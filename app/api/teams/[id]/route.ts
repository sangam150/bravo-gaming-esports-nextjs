import { deleteTeam, getPlayers, getTeam, saveTeam } from "@/lib/data";
import { requireAdmin } from "@/lib/admin-auth";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: RouteParams) {
  const { id } = await params;
  const team = await getTeam(id);
  if (!team) return Response.json({ error: "Team not found" }, { status: 404 });
  const allPlayers = await getPlayers();
  const roster = allPlayers.filter((p) => p.teamId === id);
  return Response.json({ success: true, data: { ...team, roster } });
}

export async function PUT(request: Request, { params }: RouteParams) {
  const unauthorized = await requireAdmin(request);
  if (unauthorized) return unauthorized;
  const { id } = await params;
  try {
    const body = await request.json();
    const existing = await getTeam(id);
    if (!existing) return Response.json({ error: "Team not found" }, { status: 404 });
    const result = await saveTeam({ ...existing, ...body }, id);
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
  await deleteTeam(id);
  return Response.json({ success: true, data: { id, deleted: true } });
}
