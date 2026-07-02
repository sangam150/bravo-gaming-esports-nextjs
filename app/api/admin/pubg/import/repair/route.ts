import { requireAdmin } from "@/lib/admin-auth";
import { writeAuditLogFromRequest } from "@/lib/audit-logs";
import { repairImportedPubgMatchFromCache } from "@/lib/pubg-import-relational";
import { enforceRateLimit } from "@/lib/rate-limit";
import { revalidateCompetitionPaths } from "@/lib/revalidate-public";
import { logServerError } from "@/lib/server-monitoring";

export async function POST(request: Request) {
  const unauthorized = await requireAdmin(request);
  if (unauthorized) return unauthorized;

  const limited = await enforceRateLimit(request, { key: "admin-pubg-repair", maxRequests: 20, windowMs: 60_000 });
  if (limited) return limited;

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const matchId = typeof body.matchId === "string" ? body.matchId.trim() : "";
    if (!matchId) {
      return Response.json({ error: "matchId is required." }, { status: 400 });
    }

    const repaired = await repairImportedPubgMatchFromCache(matchId, {
      publish: body.publish === true,
      forcePublished: body.forcePublished === true,
    });

    await writeAuditLogFromRequest(request, {
      action: "repair",
      entityType: "match",
      entityId: repaired.id,
      newValue: repaired,
    });

    revalidateCompetitionPaths(repaired.id);
    return Response.json({ success: true, data: repaired, message: "Match repaired from cached payload." });
  } catch (error: unknown) {
    await logServerError("admin.pubg.import.repair", error, request);
    const message = error instanceof Error ? error.message : String(error);
    return Response.json({ error: message }, { status: 500 });
  }
}

