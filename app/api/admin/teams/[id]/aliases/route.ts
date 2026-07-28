import { requirePlatformAdmin } from "@/lib/admin-auth";
import { writeRequiredAuditLogFromRequest } from "@/lib/audit-logs";
import { CanonicalTeamError, getCanonicalAdminTeam, saveCanonicalTeamAlias } from "@/lib/canonical-teams";
import { enforceRateLimit } from "@/lib/rate-limit";
import { requireSameOrigin } from "@/lib/request-origin";
import { logServerError } from "@/lib/server-monitoring";

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: RouteParams) {
  const invalidOrigin = requireSameOrigin(request);
  if (invalidOrigin) return invalidOrigin;
  const auth = await requirePlatformAdmin(request);
  if (auth.response) return auth.response;
  const limited = await enforceRateLimit(request, {
    key: "admin-team-logo-alias",
    maxRequests: 30,
    windowMs: 60_000,
  });
  if (limited) return limited;

  const { id } = await params;
  try {
    const body = (await request.json()) as { alias?: unknown };
    const aliasValue = typeof body.alias === "string" ? body.alias : "";
    const team = await getCanonicalAdminTeam(id);
    if (!team) {
      throw new CanonicalTeamError("The official team could not be found.", { code: "team_not_found", status: 404 });
    }
    await writeRequiredAuditLogFromRequest(request, {
      action: "team_logo_alias_requested",
      entityId: team.id,
      entityType: "team_alias",
      newValue: { alias: aliasValue, teamId: team.id },
    });
    const alias = await saveCanonicalTeamAlias(team.id, aliasValue);
    return Response.json({ success: true, data: { alias } }, { status: 201 });
  } catch (error) {
    await logServerError("admin.teams.alias", error, request);
    if (error instanceof CanonicalTeamError) {
      return Response.json({ success: false, error: error.message, code: error.code }, { status: error.status });
    }
    return Response.json(
      { success: false, error: "The team alias could not be saved right now.", code: "team_alias_error" },
      { status: 500 },
    );
  }
}
