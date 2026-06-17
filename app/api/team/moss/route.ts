import { requireAuthenticatedUser } from "@/lib/admin-auth";
import { enforceRateLimit } from "@/lib/rate-limit";
import { logServerError } from "@/lib/server-monitoring";
import { createMossSubmission } from "@/lib/team-workspace";

export async function POST(request: Request) {
  const limited = enforceRateLimit(request, { key: "team-moss-submit", maxRequests: 10, windowMs: 60_000 });
  if (limited) return limited;

  const auth = await requireAuthenticatedUser(request);
  if (auth.response || !auth.session) {
    return auth.response ?? Response.json({ error: "Unauthorized. Login required." }, { status: 401 });
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
    return Response.json({ error: message }, { status });
  }
}
