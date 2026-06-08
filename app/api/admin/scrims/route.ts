import { requireAdmin } from "@/lib/admin-auth";
import { COLLECTIONS, createFirestoreDocument, deleteFirestoreDocument, fetchFirestoreCollection, saveFirestoreDocument } from "@/lib/firebase";
import type { Scrim } from "@/lib/types";

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
    const payload: Partial<Scrim> = {
      title: body.title,
      date: body.date,
      map: body.map,
      lobbyTime: body.lobbyTime ?? "8:00 PM NPT",
      roomId: body.roomId,
      roomPassword: body.roomPassword,
      teamIds: body.teamIds ?? [],
      status: body.status ?? "scheduled",
      announcement: body.announcement,
      mapRotation: body.mapRotation ?? [],
    };
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
    await saveFirestoreDocument(COLLECTIONS.scrims, body.id, body);
    return Response.json({ success: true, data: body });
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
