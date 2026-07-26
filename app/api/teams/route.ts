import { requireAdmin } from "@/lib/admin-auth";
import { writeAuditLogFromRequest } from "@/lib/audit-logs";
import { getTeams, saveTeam } from "@/lib/data";
import { revalidateTeamPaths } from "@/lib/revalidate-public";
import { jsonErrorResponse, USER_FACING_ERROR_MESSAGES } from "@/lib/user-facing-errors";

export async function GET() {
  const data = await getTeams();
  return Response.json({ success: true, data });
}

export async function POST(request: Request) {
  const unauthorized = await requireAdmin(request);
  if (unauthorized) return unauthorized;
  try {
    const body = await request.json();
    if (!body.name) {
      return Response.json({ error: "Please provide a team name before saving." }, { status: 400 });
    }
    const result = await saveTeam(body, body.id);
    await writeAuditLogFromRequest(request, {
      action: "create",
      entityType: "team",
      entityId: result.id,
      newValue: result,
    });
    revalidateTeamPaths(result.slug ?? result.id);
    return Response.json({ success: true, data: result });
  } catch (error: unknown) {
    return jsonErrorResponse(error, {
      status: 500,
      fallback: USER_FACING_ERROR_MESSAGES.admin,
    });
  }
}
