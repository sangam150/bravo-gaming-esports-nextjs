import { requirePlatformAdmin } from "@/lib/admin-auth";
import {
  isPlayerTeamLinkingUnavailableResult,
  isPlayerTeamLinkReviewStaleResult,
  resolvePlayerTeamLinkReview,
} from "@/lib/player-team-linking";
import { enforceRateLimit } from "@/lib/rate-limit";
import { requireSameOrigin } from "@/lib/request-origin";
import { revalidateCompetitionPaths, revalidatePlayerPaths, revalidateTeamPaths } from "@/lib/revalidate-public";

const allowedDecisions = new Set(["approve_transfer", "keep_existing", "reject", "mark_substitute"]);
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requirePlatformAdmin(request);
  if (auth.response) {
    return auth.response;
  }
  const originResponse = requireSameOrigin(request);
  if (originResponse) {
    return originResponse;
  }
  const rateLimitResponse = await enforceRateLimit(request, {
    key: "admin:player-team-linking:review",
    maxRequests: 20,
    windowMs: 60_000,
  });
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  const { id } = await context.params;
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const decision = typeof body.decision === "string" ? body.decision : "";
  const note = typeof body.note === "string" ? body.note : null;
  if (!UUID_PATTERN.test(id) || !allowedDecisions.has(decision)) {
    return Response.json({ error: "A valid review and decision are required." }, { status: 400 });
  }
  if (decision === "approve_transfer" && !note?.trim()) {
    return Response.json({ error: "An audit note is required to approve a transfer." }, { status: 400 });
  }

  try {
    const data = await resolvePlayerTeamLinkReview(
      id,
      decision as "approve_transfer" | "keep_existing" | "reject" | "mark_substitute",
      auth.session.profileId,
      note,
    );
    if (isPlayerTeamLinkingUnavailableResult(data)) {
      return Response.json(
        { success: false, available: false, error: "Migration 022 is not applied; the review was not changed.", data },
        { status: 503 },
      );
    }
    if (isPlayerTeamLinkReviewStaleResult(data)) {
      return Response.json(
        {
          success: false,
          error: "This review is no longer actionable. Refresh the queue and confirm player/team linking is enabled.",
          data,
        },
        { status: 409 },
      );
    }
    revalidatePlayerPaths();
    revalidateTeamPaths();
    revalidateCompetitionPaths();
    return Response.json({ success: true, data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to resolve player/team link review.";
    return Response.json({ error: message }, { status: 500 });
  }
}
