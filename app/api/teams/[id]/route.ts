import { requirePlatformAdmin } from "@/lib/admin-auth";
import { writeRequiredAuditLogFromRequest } from "@/lib/audit-logs";
import {
  archiveCanonicalAdminTeam,
  CanonicalTeamError,
  getCanonicalAdminTeam,
  parseCanonicalTeamWriteInput,
  updateCanonicalAdminTeam,
} from "@/lib/canonical-teams";
import { getPlayers, getTeams } from "@/lib/data";
import { revalidateTeamAssetPaths } from "@/lib/revalidate-public";
import { requireSameOrigin } from "@/lib/request-origin";
import { logServerError } from "@/lib/server-monitoring";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: RouteParams) {
  const { id } = await params;
  const teams = await getTeams();
  const team = teams.find((candidate) => candidate.id === id || candidate.slug === id);
  if (!team) return Response.json({ error: "Team not found" }, { status: 404 });
  const allPlayers = await getPlayers();
  const roster = allPlayers.filter((player) => player.teamId === team.id);
  return Response.json({ success: true, data: { ...team, roster } });
}

export async function PUT(request: Request, { params }: RouteParams) {
  const invalidOrigin = requireSameOrigin(request);
  if (invalidOrigin) return invalidOrigin;
  const auth = await requirePlatformAdmin(request);
  if (auth.response) return auth.response;
  const { id } = await params;
  try {
    const existing = await getCanonicalAdminTeam(id);
    if (!existing) return Response.json({ error: "Team not found" }, { status: 404 });
    const updates = parseCanonicalTeamWriteInput(await request.json());
    await writeRequiredAuditLogFromRequest(request, {
      action: "update_requested",
      entityType: "team",
      entityId: existing.id,
      oldValue: existing,
      newValue: updates,
    });
    const result = await updateCanonicalAdminTeam(existing.id, updates);
    revalidateTeamAssetPaths(result.id, result.slug);
    return Response.json({ success: true, data: result });
  } catch (error: unknown) {
    await logServerError("teams.update", error, request);
    if (error instanceof CanonicalTeamError) {
      return Response.json({ error: error.message, code: error.code }, { status: error.status });
    }
    return Response.json({ error: "The official team could not be updated right now." }, { status: 500 });
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
    if (!existing) return Response.json({ error: "Team not found" }, { status: 404 });
    await writeRequiredAuditLogFromRequest(request, {
      action: "archive_requested",
      entityType: "team",
      entityId: existing.id,
      oldValue: existing,
      newValue: { status: "archived" },
    });
    const result = await archiveCanonicalAdminTeam(existing.id);
    revalidateTeamAssetPaths(result.id, result.slug);
    return Response.json({ success: true, data: result });
  } catch (error) {
    await logServerError("teams.archive", error, request);
    if (error instanceof CanonicalTeamError) {
      return Response.json({ error: error.message, code: error.code }, { status: error.status });
    }
    return Response.json({ error: "The official team could not be archived right now." }, { status: 500 });
  }
}
