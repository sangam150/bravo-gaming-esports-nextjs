import { requireAuthenticatedUser } from "@/lib/admin-auth";
import { enforceRateLimit } from "@/lib/rate-limit";
import { logServerError } from "@/lib/server-monitoring";
import { getTeamWorkspace } from "@/lib/team-workspace";

export async function GET(request: Request) {
  const limited = enforceRateLimit(request, { key: "team-workspace", maxRequests: 30, windowMs: 60_000 });
  if (limited) return limited;

  const auth = await requireAuthenticatedUser(request);
  if (auth.response || !auth.session) {
    return auth.response ?? Response.json({ error: "Unauthorized. Login required." }, { status: 401 });
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

    return Response.json({ error: message }, { status });
  }
}
