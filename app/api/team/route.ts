import { requireTeamWorkspaceUser } from "@/lib/admin-auth";
import { enforceRateLimit } from "@/lib/rate-limit";
import { logServerError } from "@/lib/server-monitoring";
import { getTeamWorkspace } from "@/lib/team-workspace";
import {
  jsonErrorResponse,
  USER_FACING_ERROR_MESSAGES,
} from "@/lib/user-facing-errors";

export async function GET(request: Request) {
  const limited = await enforceRateLimit(request, { key: "team-workspace", maxRequests: 30, windowMs: 60_000 });
  if (limited) return limited;

  const auth = await requireTeamWorkspaceUser(request);
  if (auth.response || !auth.session) {
    return auth.response ??
      Response.json({ error: USER_FACING_ERROR_MESSAGES.session }, { status: 401 });
  }

  try {
    const data = await getTeamWorkspace(auth.session);
    return Response.json({ success: true, data });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    const status = /team workspace|linked to a team|profile record/i.test(message) ? 403 : 500;

    if (status === 500) {
      await logServerError("team.workspace.fetch", error, request);
    }

    return jsonErrorResponse(error, {
      status,
      fallback:
        status === 403 ? USER_FACING_ERROR_MESSAGES.permission : USER_FACING_ERROR_MESSAGES.teamWorkspace,
    });
  }
}

