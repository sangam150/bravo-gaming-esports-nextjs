import { requireAdmin } from "@/lib/admin-auth";
import { COLLECTIONS, createFirestoreDocument, deleteFirestoreDocument, fetchFirestoreCollection, saveFirestoreDocument } from "@/lib/firebase";
import type { Scrim } from "@/lib/types";

function normalizePubgMatchIds(body: Record<string, unknown>) {
  const rawMatchIds = Array.isArray(body.pubgMatchIds)
    ? body.pubgMatchIds
    : typeof body.pubgMatchIds === "string"
      ? body.pubgMatchIds.split(/[\n,]+/g)
      : [];

  const primaryMatchId = typeof body.pubgMatchId === "string" ? body.pubgMatchId : "";

  return Array.from(
    new Set(
      [primaryMatchId, ...rawMatchIds]
        .map((value) => (typeof value === "string" ? value.trim() : ""))
        .filter(Boolean)
    )
  );
}

function buildScrimPayload(body: Record<string, unknown>): Partial<Scrim> {
  const pubgMatchIds = normalizePubgMatchIds(body);

  return {
    title: typeof body.title === "string" ? body.title : "",
    date: typeof body.date === "string" ? body.date : "",
    map: typeof body.map === "string" ? body.map : "",
    lobbyTime: typeof body.lobbyTime === "string" && body.lobbyTime ? body.lobbyTime : "8:00 PM NPT",
    roomId: typeof body.roomId === "string" ? body.roomId : undefined,
    roomPassword: typeof body.roomPassword === "string" ? body.roomPassword : undefined,
    teamIds: Array.isArray(body.teamIds) ? body.teamIds.filter((value): value is string => typeof value === "string") : [],
    pubgMatchId: pubgMatchIds[0],
    pubgMatchIds,
    status: (typeof body.status === "string" ? body.status : "scheduled") as Scrim["status"],
    announcement: typeof body.announcement === "string" ? body.announcement : undefined,
    mapRotation: Array.isArray(body.mapRotation)
      ? body.mapRotation.filter((value): value is string => typeof value === "string" && Boolean(value))
      : [],
    seasonId: typeof body.seasonId === "string" ? body.seasonId : undefined,
    seasonTitle: typeof body.seasonTitle === "string" ? body.seasonTitle : undefined,
    seasonDayNumber:
      typeof body.seasonDayNumber === "number" && Number.isFinite(body.seasonDayNumber)
        ? body.seasonDayNumber
        : undefined,
    tournamentId: typeof body.tournamentId === "string" ? body.tournamentId : undefined,
  };
}

export async function GET(request: Request) {
  const unauthorized = await requireAdmin(request);
  if (unauthorized) return unauthorized;
  const data = await fetchFirestoreCollection<Scrim>(COLLECTIONS.scrims, 100);
  return Response.json({ success: true, data });
}

export async function POST(request: Request) {
  const unauthorized = await requireAdmin(request);
  if (unauthorized) return unauthorized;
  try {
    const body = await request.json();
    if (!body.title || !body.date || !body.map) {
      return Response.json({ error: "title, date, and map are required" }, { status: 400 });
    }
    const payload = buildScrimPayload(body as Record<string, unknown>);
    const result = await createFirestoreDocument(COLLECTIONS.scrims, payload as Record<string, unknown>, body.id);
    return Response.json({ success: true, data: { id: result.id, ...payload } });
  } catch (error: unknown) {
    return Response.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const unauthorized = await requireAdmin(request);
  if (unauthorized) return unauthorized;
  try {
    const body = await request.json();
    if (!body.id) return Response.json({ error: "id is required" }, { status: 400 });
    const payload = buildScrimPayload(body as Record<string, unknown>);
    await saveFirestoreDocument(COLLECTIONS.scrims, body.id, payload as Record<string, unknown>);
    return Response.json({ success: true, data: { id: body.id, ...payload } });
  } catch (error: unknown) {
    return Response.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const unauthorized = await requireAdmin(request);
  if (unauthorized) return unauthorized;
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return Response.json({ error: "id is required" }, { status: 400 });
  await deleteFirestoreDocument(COLLECTIONS.scrims, id);
  return Response.json({ success: true });
}
