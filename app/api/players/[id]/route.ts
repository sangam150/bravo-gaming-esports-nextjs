import { requireAdmin } from "@/lib/admin-auth";
import { writeAuditLogFromRequest } from "@/lib/audit-logs";
import { deletePlayer, getPlayer, getPublicPlayer, savePlayer } from "@/lib/data";
import { revalidatePlayerPaths } from "@/lib/revalidate-public";
import { requireSameOrigin } from "@/lib/request-origin";
import { validatePlayerProfileInput, PlayerProfileInputError } from "@/lib/player-profile-input";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: RouteParams) {
  const { id } = await params;
  const player = await getPublicPlayer(id);
  if (!player) return Response.json({ error: "Player not found" }, { status: 404 });
  return Response.json({ success: true, data: player });
}

export async function PUT(request: Request, { params }: RouteParams) {
  const unauthorized = await requireAdmin(request);
  if (unauthorized) return unauthorized;
  const invalidOrigin = requireSameOrigin(request);
  if (invalidOrigin) return invalidOrigin;
  const { id } = await params;
  try {
    const body = await request.json();
    validatePlayerProfileInput(body);
    const existing = await getPlayer(id);
    if (!existing) return Response.json({ error: "Player not found" }, { status: 404 });
    const result = await savePlayer({ ...existing, ...body }, id, { canonicalProfile: true });
    await writeAuditLogFromRequest(request, {
      action: "update",
      entityType: "player",
      entityId: result.id,
      oldValue: existing,
      newValue: result,
    });
    revalidatePlayerPaths(result.slug ?? result.id);
    return Response.json({ success: true, data: result });
  } catch (error: unknown) {
    if (error instanceof PlayerProfileInputError || error instanceof SyntaxError)
      return Response.json({ error: error.message }, { status: 400 });
    if (error && typeof error === "object" && "code" in error && error.code === "23505")
      return Response.json({ error: "A player with this name, slug, or PUBG account already exists." }, { status: 409 });
    const message = error instanceof Error ? error.message : String(error);
    return Response.json(
      { error: /required|at most/.test(message) ? message : "Player update failed. Reload the profile and retry." },
      { status: /required|at most/.test(message) ? 400 : 503 },
    );
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  const unauthorized = await requireAdmin(request);
  if (unauthorized) return unauthorized;
  const invalidOrigin = requireSameOrigin(request);
  if (invalidOrigin) return invalidOrigin;
  const { id } = await params;
  const existing = await getPlayer(id);
  await deletePlayer(id);
  await writeAuditLogFromRequest(request, {
    action: "soft_delete",
    entityType: "player",
    entityId: id,
    oldValue: existing,
    newValue: existing ? { ...existing, deletedAt: new Date().toISOString() } : null,
  });
  revalidatePlayerPaths(existing?.slug ?? id);
  return Response.json({ success: true, data: { id, deleted: true } });
}
