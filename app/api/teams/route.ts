import { requirePlatformAdmin } from "@/lib/admin-auth";
import { writeRequiredAuditLogFromRequest } from "@/lib/audit-logs";
import { CanonicalTeamError, createCanonicalAdminTeam, parseCanonicalTeamWriteInput } from "@/lib/canonical-teams";
import { getTeams } from "@/lib/data";
import { revalidateTeamAssetPaths } from "@/lib/revalidate-public";
import { requireSameOrigin } from "@/lib/request-origin";
import { jsonErrorResponse, USER_FACING_ERROR_MESSAGES } from "@/lib/user-facing-errors";

export async function GET() {
  const data = await getTeams();
  return Response.json({ success: true, data });
}

export async function POST(request: Request) {
  const invalidOrigin = requireSameOrigin(request);
  if (invalidOrigin) return invalidOrigin;
  const auth = await requirePlatformAdmin(request);
  if (auth.response) return auth.response;
  try {
    const input = parseCanonicalTeamWriteInput(await request.json());
    if (!input.name) {
      return Response.json({ error: "Please provide a team name before saving." }, { status: 400 });
    }
    await writeRequiredAuditLogFromRequest(request, {
      action: "create_requested",
      entityType: "team",
      newValue: input,
    });
    const result = await createCanonicalAdminTeam({ ...input, name: input.name });
    revalidateTeamAssetPaths(result.id, result.slug);
    return Response.json({ success: true, data: result });
  } catch (error: unknown) {
    if (error instanceof CanonicalTeamError) {
      return Response.json({ error: error.message, code: error.code }, { status: error.status });
    }
    return jsonErrorResponse(error, {
      status: 500,
      fallback: USER_FACING_ERROR_MESSAGES.admin,
    });
  }
}
