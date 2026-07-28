import { requireAdmin, requirePlatformAdmin } from "@/lib/admin-auth";
import { writeRequiredAuditLogFromRequest } from "@/lib/audit-logs";
import { CanonicalTeamError, createCanonicalAdminTeam, listCanonicalAdminTeams, parseCanonicalTeamWriteInput } from "@/lib/canonical-teams";
import { enforceRateLimit } from "@/lib/rate-limit";
import { requireSameOrigin } from "@/lib/request-origin";
import { logServerError } from "@/lib/server-monitoring";

function errorResponse(error: unknown) {
  if (error instanceof CanonicalTeamError) {
    return Response.json({ success: false, error: error.message, code: error.code }, { status: error.status });
  }
  return Response.json(
    {
      success: false,
      error: "Official teams could not be updated right now.",
      code: "canonical_team_error",
    },
    { status: 500 },
  );
}

export async function GET(request: Request) {
  const unauthorized = await requireAdmin(request);
  if (unauthorized) return unauthorized;
  try {
    const teams = await listCanonicalAdminTeams();
    return Response.json({ success: true, data: { teams } });
  } catch (error) {
    await logServerError("admin.teams.list", error, request);
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  const invalidOrigin = requireSameOrigin(request);
  if (invalidOrigin) return invalidOrigin;
  const auth = await requirePlatformAdmin(request);
  if (auth.response) return auth.response;
  const limited = await enforceRateLimit(request, {
    key: "admin-canonical-teams-create",
    maxRequests: 12,
    windowMs: 60_000,
  });
  if (limited) return limited;

  try {
    const input = parseCanonicalTeamWriteInput(await request.json());
    if (!input.name?.trim()) {
      throw new CanonicalTeamError("Team name is required.", { code: "invalid_team_name", status: 400 });
    }
    await writeRequiredAuditLogFromRequest(request, {
      action: "create_requested",
      entityType: "team",
      newValue: input,
    });
    const team = await createCanonicalAdminTeam({ ...input, name: input.name });
    return Response.json({ success: true, data: { team } }, { status: 201 });
  } catch (error) {
    await logServerError("admin.teams.create", error, request);
    return errorResponse(error);
  }
}
