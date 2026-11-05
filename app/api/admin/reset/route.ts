import { getRequestSession, permissionDeniedResponse } from "@/lib/admin-auth";
import { resetCompetitionData } from "@/lib/admin-reset";
import { writeRequiredAuditLogFromRequest } from "@/lib/audit-logs";
import { requireSameOrigin } from "@/lib/request-origin";

const RESET_CONFIRMATION = "RESET COMPETITION DATA";

export async function POST(request: Request) {
  const invalidOrigin = requireSameOrigin(request);
  if (invalidOrigin) return invalidOrigin;

  const session = await getRequestSession(request);
  if (!session) {
    return Response.json({ error: "Unauthorized. Login required." }, { status: 401 });
  }
  if (session.role !== "super_admin" || !session.profileId) {
    return permissionDeniedResponse("Only the permanent owner can reset competition data.");
  }

  const body = (await request.json().catch(() => ({}))) as { confirmation?: unknown };
  if (body.confirmation !== RESET_CONFIRMATION) {
    return Response.json({ error: `Type ${RESET_CONFIRMATION} to confirm this irreversible reset.` }, { status: 400 });
  }

  try {
    await writeRequiredAuditLogFromRequest(request, {
      action: "reset_competition_data_requested",
      entityType: "competition_data",
      entityId: session.profileId,
      newValue: {
        confirmationVerified: true,
        ownerProfileId: session.profileId,
      },
    });
    const result = await resetCompetitionData();
    return Response.json({
      success: true,
      data: result,
      message: result.message,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return Response.json({ error: message }, { status: 500 });
  }
}
