import { requireAdmin } from "@/lib/admin-auth";
import { writeAuditLogFromRequest } from "@/lib/audit-logs";
import { getPlayers, savePlayer } from "@/lib/data";
import { revalidatePlayerPaths } from "@/lib/revalidate-public";
import { requireSameOrigin } from "@/lib/request-origin";
import { validatePlayerProfileInput, PlayerProfileInputError } from "@/lib/player-profile-input";

export async function GET(request: Request) {
  const internal = new URL(request.url).searchParams.get("admin") === "true";
  if (internal) {
    const denied = await requireAdmin(request);
    if (denied) return denied;
  }
  const data = await getPlayers({ includeInternal: internal });
  return Response.json({ success: true, data }, { headers: { "Cache-Control": internal ? "private, no-store" : "no-cache" } });
}

export async function POST(request: Request) {
  const unauthorized = await requireAdmin(request);
  if (unauthorized) return unauthorized;
  const invalidOrigin = requireSameOrigin(request);
  if (invalidOrigin) return invalidOrigin;
  try {
    const body = await request.json();
    validatePlayerProfileInput(body);
    if (!body || typeof body.name !== "string" || !body.name.trim()) {
      return Response.json({ error: "name is required" }, { status: 400 });
    }
    if (body.id) return Response.json({ error: "Use the player edit endpoint to update an existing player." }, { status: 400 });
    const result = await savePlayer(body, undefined, { canonicalProfile: true });
    await writeAuditLogFromRequest(request, {
      action: "create",
      entityType: "player",
      entityId: result.id,
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
      { error: /required|at most/.test(message) ? message : "Player save failed. Check the database connection and retry." },
      { status: /required|at most/.test(message) ? 400 : 503 },
    );
  }
}
