import { deleteAnnouncement, getAnnouncements, saveAnnouncement } from "@/lib/data";
import { requireAdmin } from "@/lib/admin-auth";

export async function GET() {
  const data = await getAnnouncements();
  return Response.json({ success: true, data });
}

export async function POST(request: Request) {
  const unauthorized = await requireAdmin(request);
  if (unauthorized) return unauthorized;
  try {
    const body = await request.json();
    if (!body.title || !body.detail) {
      return Response.json({ error: "title and detail are required" }, { status: 400 });
    }
    const result = await saveAnnouncement(body, body.id);
    return Response.json({ success: true, data: result });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const unauthorized = await requireAdmin(request);
  if (unauthorized) return unauthorized;
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return Response.json({ error: "id is required" }, { status: 400 });
  await deleteAnnouncement(id);
  return Response.json({ success: true, data: { id, deleted: true } });
}
