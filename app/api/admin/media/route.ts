import { requireAdmin } from "@/lib/admin-auth";
import { writeAuditLogFromRequest } from "@/lib/audit-logs";
import { getVideos, saveVideo } from "@/lib/data";
import { revalidatePlatformMediaPaths } from "@/lib/revalidate-public";

export async function GET(request: Request) {
  const unauthorized = await requireAdmin(request);
  if (unauthorized) return unauthorized;

  const data = await getVideos({ includeUnpublished: true });
  return Response.json({ success: true, data });
}

export async function POST(request: Request) {
  const unauthorized = await requireAdmin(request);
  if (unauthorized) return unauthorized;

  try {
    const body = await request.json();
    if (!body.title) {
      return Response.json({ error: "title is required" }, { status: 400 });
    }

    const result = await saveVideo(body, body.id);
    await writeAuditLogFromRequest(request, {
      action: "create",
      entityType: "media",
      entityId: result.id,
      newValue: result,
    });
    revalidatePlatformMediaPaths(result.slug ?? body.slug);
    return Response.json({ success: true, data: result });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return Response.json({ error: message }, { status: 500 });
  }
}
