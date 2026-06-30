import { deleteTournament, getPublicTournament, getTournament, getTournamentMatches, saveTournament } from "@/lib/data";
import { requireAdmin } from "@/lib/admin-auth";
import { revalidateTournamentPaths } from "@/lib/revalidate-public";
import { jsonErrorResponse, USER_FACING_ERROR_MESSAGES } from "@/lib/user-facing-errors";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: RouteParams) {
  const { id } = await params;
  const [tournament, matches] = await Promise.all([getPublicTournament(id), getTournamentMatches(id)]);
  if (!tournament) {
    return Response.json({ error: "The page you are looking for does not exist or may have been moved." }, { status: 404 });
  }
  return Response.json({ success: true, data: { ...tournament, matches } });
}

export async function PUT(request: Request, { params }: RouteParams) {
  const unauthorized = await requireAdmin(request);
  if (unauthorized) return unauthorized;
  const { id } = await params;
  try {
    const body = await request.json();
    const existing = await getTournament(id);
    if (!existing) {
      return Response.json({ error: "The page you are looking for does not exist or may have been moved." }, { status: 404 });
    }
    const result = await saveTournament({ ...existing, ...body }, id);
    revalidateTournamentPaths(result.id);
    return Response.json({ success: true, data: result });
  } catch (error: unknown) {
    return jsonErrorResponse(error, { status: 500, fallback: USER_FACING_ERROR_MESSAGES.admin });
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  const unauthorized = await requireAdmin(request);
  if (unauthorized) return unauthorized;
  const { id } = await params;
  await deleteTournament(id);
  revalidateTournamentPaths(id);
  return Response.json({ success: true, data: { id, deleted: true } });
}
