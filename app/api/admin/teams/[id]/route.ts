import { requireAdmin, requirePlatformAdmin } from "@/lib/admin-auth";
import { writeRequiredAuditLogFromRequest } from "@/lib/audit-logs";
import {
  archiveCanonicalAdminTeam,
  CanonicalTeamError,
  getCanonicalAdminTeam,
  parseCanonicalTeamWriteInput,
  updateCanonicalAdminTeam,
} from "@/lib/canonical-teams";
import { revalidateTeamAssetPaths } from "@/lib/revalidate-public";
import { requireSameOrigin } from "@/lib/request-origin";
import { logServerError } from "@/lib/server-monitoring";

type RouteParams = { params: Promise<{ id: string }> };

function errorResponse(error: unknown) {
  if (error instanceof CanonicalTeamError) {
    return Response.json({ success: false, error: error.message, code: error.code }, { status: error.status });
  }
  return Response.json(
    { success: false, error: "The official team could not be updated right now.", code: "canonical_team_error" },
    { status: 500 },
  );
}

export async function GET(request: Request, { params }: RouteParams) {
  const unauthorized = await requireAdmin(request);
  if (unauthorized) return unauthorized;
  const { id } = await params;
  try {
    const team = await getCanonicalAdminTeam(id);
    if (!team) {
      throw new CanonicalTeamError("The official team could not be found.", { code: "team_not_found", status: 404 });
    }
    return Response.json({ success: true, data: { team } });
  } catch (error) {
    await logServerError("admin.teams.get", error, request);
    return errorResponse(error);
  }
}

export async function PUT(request: Request, context: RouteParams) {
  return PATCH(request, context);
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const invalidOrigin = requireSameOrigin(request);
  if (invalidOrigin) return invalidOrigin;
  const auth = await requirePlatformAdmin(request);
  if (auth.response) return auth.response;
  const { id } = await params;

  try {
    const existing = await getCanonicalAdminTeam(id);
    if (!existing) {
      throw new CanonicalTeamError("The official team could not be found.", { code: "team_not_found", status: 404 });
    }
    const input = parseCanonicalTeamWriteInput(await request.json());
    await writeRequiredAuditLogFromRequest(request, {
      action: "update_requested",
      entityId: existing.id,
      entityType: "team",
      oldValue: existing,
      newValue: input,
    });
    const team = await updateCanonicalAdminTeam(existing.id, input);
    revalidateTeamAssetPaths(team.id, team.slug);
    return Response.json({ success: true, data: { team } });
  } catch (error) {
    await logServerError("admin.teams.update", error, request);
    return errorResponse(error);
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  const invalidOrigin = requireSameOrigin(request);
  if (invalidOrigin) return invalidOrigin;
  const auth = await requirePlatformAdmin(request);
  if (auth.response) return auth.response;
  const { id } = await params;

  try {
    const existing = await getCanonicalAdminTeam(id);
    if (!existing) {
      throw new CanonicalTeamError("The official team could not be found.", { code: "team_not_found", status: 404 });
    }
    await writeRequiredAuditLogFromRequest(request, {
      action: "archive_requested",
      entityId: existing.id,
      entityType: "team",
      oldValue: existing,
      newValue: { status: "archived" },
    });
    const team = await archiveCanonicalAdminTeam(existing.id);
    revalidateTeamAssetPaths(team.id, team.slug);
    return Response.json({ success: true, data: { team } });
  } catch (error) {
    await logServerError("admin.teams.archive", error, request);
    return errorResponse(error);
  }
}
