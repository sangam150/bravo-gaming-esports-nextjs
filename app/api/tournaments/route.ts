import { getTournaments, saveTournament } from "@/lib/data";
import { requireAdmin } from "@/lib/admin-auth";
import { revalidateTournamentPaths } from "@/lib/revalidate-public";
import { jsonErrorResponse, USER_FACING_ERROR_MESSAGES } from "@/lib/user-facing-errors";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") ?? undefined;
  const data = await getTournaments(status);
  return Response.json({ success: true, data });
}

export async function POST(request: Request) {
  const unauthorized = await requireAdmin(request);
  if (unauthorized) return unauthorized;
  try {
    const body = await request.json();
    if (!body.title) {
      return Response.json({ error: "Please provide a tournament title before saving." }, { status: 400 });
    }
    const result = await saveTournament(body, body.id);
    revalidateTournamentPaths(result.id);
    return Response.json({ success: true, data: result });
  } catch (error: unknown) {
    return jsonErrorResponse(error, { status: 500, fallback: USER_FACING_ERROR_MESSAGES.admin });
  }
}
