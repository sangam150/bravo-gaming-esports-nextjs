import { requirePlatformAdmin } from "@/lib/admin-auth";
import { isPlayerTeamLinkingUnavailableResult, unlinkPlayerTeamMembership } from "@/lib/player-team-linking";
import { enforceRateLimit } from "@/lib/rate-limit";
import { requireSameOrigin } from "@/lib/request-origin";
import { revalidateCompetitionPaths, revalidatePlayerPaths, revalidateTeamPaths } from "@/lib/revalidate-public";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requirePlatformAdmin(request);
  if (auth.response) {
    return auth.response;
  }
  const originResponse = requireSameOrigin(request);
  if (originResponse) {
    return originResponse;
  }
  const rateLimitResponse = await enforceRateLimit(request, {
    key: "admin:player-team-linking:unlink",
    maxRequests: 10,
    windowMs: 60_000,
  });
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  const { id } = await context.params;
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const reason = typeof body.reason === "string" ? body.reason.trim() : "";
  if (!UUID_PATTERN.test(id) || !reason) {
    return Response.json({ error: "A membership and audit reason are required." }, { status: 400 });
  }

  try {
    const data = await unlinkPlayerTeamMembership(id, auth.session.profileId, reason);
    if (isPlayerTeamLinkingUnavailableResult(data)) {
      return Response.json(
        { success: false, available: false, error: "Migration 022 is not applied; the membership was not changed.", data },
        { status: 503 },
      );
    }
    revalidatePlayerPaths();
    revalidateTeamPaths();
    revalidateCompetitionPaths();
    return Response.json({ success: true, data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to unlink player/team membership.";
    return Response.json({ error: message }, { status: 500 });
  }
}
