import { requireAdmin } from "@/lib/admin-auth";
import { requireSameOrigin } from "@/lib/request-origin";
import { getTournaments, saveTournament } from "@/lib/data";
import { revalidateTournamentPaths } from "@/lib/revalidate-public";
import { jsonErrorResponse, USER_FACING_ERROR_MESSAGES } from "@/lib/user-facing-errors";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") ?? undefined;
  const internal = searchParams.get("admin") === "true";
  if (internal) {
    const unauthorized = await requireAdmin(request);
    if (unauthorized) return unauthorized;
  }
  const data = await getTournaments(status, { includeInternal: internal });
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
      return Response.json({ error: "Please provide a tournament title before saving." }, { status: 400 });
    }
    const result = await saveTournament(body, body.id);
    revalidateTournamentPaths(result.id);
    return Response.json({ success: true, data: result });
  } catch (error: unknown) {
    return jsonErrorResponse(error, {
      status: 500,
      fallback: USER_FACING_ERROR_MESSAGES.admin,
    });
  }
}
