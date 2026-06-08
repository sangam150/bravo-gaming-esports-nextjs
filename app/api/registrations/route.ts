import { createRegistration, getRegistrations, updateRegistrationStatus } from "@/lib/data";
import { requireAdmin } from "@/lib/admin-auth";

export async function GET(request: Request) {
  const unauthorized = await requireAdmin(request);
  if (unauthorized) return unauthorized;
  const data = await getRegistrations();
  return Response.json({ success: true, data });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body.teamName || !body.captainName || !body.captainDiscord) {
      return Response.json({ error: "teamName, captainName, and captainDiscord are required" }, { status: 400 });
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
    const message = error instanceof Error ? error.message : String(error);
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const unauthorized = await requireAdmin(request);
  if (unauthorized) return unauthorized;
  try {
    const body = await request.json();
    if (!body.id || !body.status) {
      return Response.json({ error: "id and status are required" }, { status: 400 });
    }
    const result = await updateRegistrationStatus(body.id, body.status);
    return Response.json({ success: true, data: result });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return Response.json({ error: message }, { status: 500 });
  }
}
