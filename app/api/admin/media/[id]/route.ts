import { requireAdmin } from "@/lib/admin-auth";
import { writeAuditLogFromRequest } from "@/lib/audit-logs";
import { deleteVideo, getVideos, saveVideo } from "@/lib/data";
import { revalidatePlatformMediaPaths } from "@/lib/revalidate-public";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PUT(request: Request, context: RouteContext) {
  const unauthorized = await requireAdmin(request);
  if (unauthorized) return unauthorized;

  try {
    const { id } = await context.params;
    const body = await request.json();
    if (!body.title) {
      return Response.json({ error: "title is required" }, { status: 400 });
    }

    const existingItem = (await getVideos({ includeUnpublished: true })).find((item) => item.id === id) ?? null;
    const result = await saveVideo(body, id);
    await writeAuditLogFromRequest(request, {
      action: "update",
      entityType: "media",
      entityId: result.id,
      oldValue: existingItem,
      newValue: result,
    });
    revalidatePlatformMediaPaths(result.slug ?? body.slug ?? existingItem?.slug);
    return Response.json({ success: true, data: result });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  const unauthorized = await requireAdmin(request);
  if (unauthorized) return unauthorized;

  const { id } = await context.params;
  const existingItem = (await getVideos({ includeUnpublished: true })).find((item) => item.id === id) ?? null;
  const result = await deleteVideo(id);
  await writeAuditLogFromRequest(request, {
    action: "soft_delete",
    entityType: "media",
    entityId: id,
    oldValue: existingItem,
    newValue: existingItem ? { ...existingItem, deletedAt: new Date().toISOString() } : null,
  });
  revalidatePlatformMediaPaths(existingItem?.slug);
  return Response.json({ success: true, data: result });
}
