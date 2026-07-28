import { requirePlatformAdmin } from "@/lib/admin-auth";
import { writeAuditLog } from "@/lib/audit-log-writer";
import { isPlayerTeamLinkingUnavailableResult, recalculatePlayerTeamLinks } from "@/lib/player-team-linking";
import { enforceRateLimit } from "@/lib/rate-limit";
import { requireSameOrigin } from "@/lib/request-origin";
import { revalidateCompetitionPaths } from "@/lib/revalidate-public";

export async function POST(request: Request) {
  const auth = await requirePlatformAdmin(request);
  if (auth.response) {
    return auth.response;
  }
  const originResponse = requireSameOrigin(request);
  if (originResponse) {
    return originResponse;
  }
  const rateLimitResponse = await enforceRateLimit(request, {
    key: "admin:player-team-linking:recalculate",
    maxRequests: 5,
    windowMs: 60_000,
  });
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const pubgAccountId = typeof body.pubgAccountId === "string" ? body.pubgAccountId.trim() : null;

  try {
    const data = await recalculatePlayerTeamLinks(pubgAccountId);
    if (isPlayerTeamLinkingUnavailableResult(data)) {
      return Response.json(
        { success: false, available: false, error: "Migration 022 is not applied; no recalculation was performed.", data },
        { status: 503 },
      );
    }
    await writeAuditLog({
      actorId: auth.session.profileId,
      action: "player_team_links_recalculated",
      entityType: "player_team_membership",
      newValue: { scope: pubgAccountId ? "account" : "all", pubgAccountId },
    });
    revalidateCompetitionPaths();
    return Response.json({ success: true, data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to recalculate player/team links.";
    return Response.json({ error: message }, { status: 500 });
  }
}
