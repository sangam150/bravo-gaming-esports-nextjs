import { requirePlatformAdmin } from "@/lib/admin-auth";
import { requireSameOrigin } from "@/lib/request-origin";
import { writeAuditLogFromRequest } from "@/lib/audit-logs";
import { resetImportedPubgMatch } from "@/lib/pubg-import-relational";
import { enforceRateLimit } from "@/lib/rate-limit";
import { revalidateCompetitionPaths } from "@/lib/revalidate-public";
import { logServerError } from "@/lib/server-monitoring";

export async function POST(request: Request) {
  const authorization = await requirePlatformAdmin(request);
  if (authorization.response) return authorization.response;
  const invalidOrigin = requireSameOrigin(request);
  if (invalidOrigin) return invalidOrigin;

  const limited = await enforceRateLimit(request, {
    key: "admin-pubg-reset",
    maxRequests: 20,
    windowMs: 60_000,
  });
  if (limited) return limited;

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const matchId = typeof body.matchId === "string" ? body.matchId.trim() : "";
    if (!matchId) {
      return Response.json({ error: "matchId is required." }, { status: 400 });
    }

    const result = await resetImportedPubgMatch(matchId, {
      confirmPublished: body.confirmPublished === true,
      allowScoringDecisions: true,
      actorId: authorization.session.profileId,
    });

    await writeAuditLogFromRequest(request, {
      action: "reset",
      entityType: "match",
      entityId: result.id,
      oldValue: result.before,
    });

    revalidateCompetitionPaths(result.id);
    return Response.json({
      success: true,
      data: { id: result.id },
      message: "Imported match reset successfully.",
    });
  } catch (error: unknown) {
    await logServerError("admin.pubg.import.reset", error, request);
    const message = error instanceof Error ? error.message : String(error);
    return Response.json({ error: message }, { status: message.includes("revision conflict") ? 409 : 500 });
  }
}
