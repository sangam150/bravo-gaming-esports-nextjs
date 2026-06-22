import { createRegistration, getRegistrations, updateRegistrationStatus } from "@/lib/data";
import { requireAdmin } from "@/lib/admin-auth";
import { enforceRateLimit } from "@/lib/rate-limit";
import { logServerError } from "@/lib/server-monitoring";
import {
  jsonErrorResponse,
  USER_FACING_ERROR_MESSAGES,
} from "@/lib/user-facing-errors";

export async function GET(request: Request) {
  const unauthorized = await requireAdmin(request);
  if (unauthorized) return unauthorized;
  const data = await getRegistrations();
  return Response.json({ success: true, data });
}

export async function POST(request: Request) {
  const limited = enforceRateLimit(request, { key: "team-registration", maxRequests: 5, windowMs: 60_000 });
  if (limited) return limited;

  try {
    const body = await request.json();
    if (!body.teamName || !body.captainName || !body.captainDiscord) {
      return Response.json(
        { error: "Please provide the team name, captain name, and captain Discord before submitting." },
        { status: 400 }
      );
    }
    const result = await createRegistration({
      teamName: body.teamName,
      captainName: body.captainName,
      captainDiscord: body.captainDiscord,
      playerNames: body.playerNames ?? [],
      tournamentId: body.tournamentId,
    });
    return Response.json({ success: true, data: result });
  } catch (error: unknown) {
    await logServerError("registrations.create", error, request);
    return jsonErrorResponse(error, {
      status: 500,
      fallback: USER_FACING_ERROR_MESSAGES.registration,
    });
  }
}

export async function PATCH(request: Request) {
  const unauthorized = await requireAdmin(request);
  if (unauthorized) return unauthorized;

  const limited = enforceRateLimit(request, { key: "registration-admin-update", maxRequests: 30, windowMs: 60_000 });
  if (limited) return limited;

  try {
    const body = await request.json();
    if (!body.id || !body.status) {
      return Response.json({ error: "id and status are required" }, { status: 400 });
    }
    const result = await updateRegistrationStatus(body.id, body.status);
    return Response.json({ success: true, data: result });
  } catch (error: unknown) {
    await logServerError("registrations.update", error, request);
    return jsonErrorResponse(error, {
      status: 500,
      fallback: USER_FACING_ERROR_MESSAGES.admin,
    });
  }
}
