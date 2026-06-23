import { requireTeamWorkspaceUser } from "@/lib/admin-auth";
import { enforceRateLimit } from "@/lib/rate-limit";
import { logServerError } from "@/lib/server-monitoring";
import { createMossSubmission } from "@/lib/team-workspace";
import {
  jsonErrorResponse,
  USER_FACING_ERROR_MESSAGES,
} from "@/lib/user-facing-errors";

export async function POST(request: Request) {
  const limited = enforceRateLimit(request, { key: "team-moss-submit", maxRequests: 10, windowMs: 60_000 });
  if (limited) return limited;

  const auth = await requireTeamWorkspaceUser(request);
  if (auth.response || !auth.session) {
    return auth.response ??
      Response.json({ error: USER_FACING_ERROR_MESSAGES.session }, { status: 401 });
  }

  try {
    const body = await request.json();
    const data = await createMossSubmission(auth.session, {
      eventId: typeof body.eventId === "string" ? body.eventId.trim() : null,
      matchId: typeof body.matchId === "string" ? body.matchId.trim() : null,
      playerId: typeof body.playerId === "string" ? body.playerId.trim() : null,
      fileUrl: typeof body.fileUrl === "string" ? body.fileUrl.trim() : null,
      externalLink: typeof body.externalLink === "string" ? body.externalLink.trim() : null,
    });

    return Response.json({ success: true, data });
  } catch (error: unknown) {
    await logServerError("team.moss.create", error, request);
    const message = error instanceof Error ? error.message : String(error);
    const status = /team workspace|linked to a team|profile record/i.test(message) ? 403 : 500;
    return jsonErrorResponse(error, {
      status,
      fallback:
        status === 403
          ? USER_FACING_ERROR_MESSAGES.permission
          : "We couldn't submit that MOSS report right now. Please try again shortly.",
    });
  }
}
