import { requireTeamWorkspaceUser } from "@/lib/admin-auth";
import { enforceRateLimit } from "@/lib/rate-limit";
import { logServerError } from "@/lib/server-monitoring";
import { createTeamRosterRequest } from "@/lib/team-workspace";
import {
  jsonErrorResponse,
  USER_FACING_ERROR_MESSAGES,
} from "@/lib/user-facing-errors";

export async function POST(request: Request) {
  const limited = await enforceRateLimit(request, { key: "team-roster-request", maxRequests: 12, windowMs: 60_000 });
  if (limited) return limited;

  const auth = await requireTeamWorkspaceUser(request);
  if (auth.response || !auth.session) {
    return auth.response ??
      Response.json({ error: USER_FACING_ERROR_MESSAGES.session }, { status: 401 });
  }

  try {
    const body = await request.json();
    const requestType = typeof body.requestType === "string" ? body.requestType.trim() : "";
    const payload = typeof body.payload === "object" && body.payload !== null ? body.payload : {};

    if (!requestType) {
      return Response.json({ error: "Please choose a roster request type before submitting." }, { status: 400 });
    }

    const data = await createTeamRosterRequest(auth.session, {
      requestType,
      oldPlayerId: typeof body.oldPlayerId === "string" ? body.oldPlayerId : null,
      newPlayerName: typeof body.newPlayerName === "string" ? body.newPlayerName.trim() : null,
      newPlayerPubgName: typeof body.newPlayerPubgName === "string" ? body.newPlayerPubgName.trim() : null,
      payload,
    });

    return Response.json({ success: true, data });
  } catch (error: unknown) {
    await logServerError("team.roster-request.create", error, request);
    const message = error instanceof Error ? error.message : String(error);
    const status = /team workspace|linked to a team|profile record/i.test(message) ? 403 : 500;
    return jsonErrorResponse(error, {
      status,
      fallback:
        status === 403
          ? USER_FACING_ERROR_MESSAGES.permission
          : "We couldn't submit that roster request right now. Please try again shortly.",
    });
  }
}

