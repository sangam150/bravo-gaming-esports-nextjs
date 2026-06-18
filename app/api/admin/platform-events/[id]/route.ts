import { requireAdmin } from "@/lib/admin-auth";
import { writeAuditLogFromRequest } from "@/lib/audit-logs";
import { deleteManagedPlatformEvent, getManagedPlatformEventById, saveManagedPlatformEvent } from "@/lib/platform-cms";
import { revalidatePlatformEventPaths } from "@/lib/revalidate-public";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PUT(request: Request, context: RouteContext) {
  const unauthorized = await requireAdmin(request);
  if (unauthorized) return unauthorized;

  try {
    const { id } = await context.params;
    const body = await request.json();
    if (!body.name) {
      return Response.json({ error: "name is required" }, { status: 400 });
    }

    const existingEvent = await getManagedPlatformEventById(id);
    const result = await saveManagedPlatformEvent(body, id);
    await writeAuditLogFromRequest(request, {
      action: "update",
      entityType: "event",
      entityId: result.id,
      oldValue: existingEvent,
      newValue: result,
    });
    revalidatePlatformEventPaths(result.slug);
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
  const existingEvent = await getManagedPlatformEventById(id);
  const result = await deleteManagedPlatformEvent(id);
  await writeAuditLogFromRequest(request, {
    action: "soft_delete",
    entityType: "event",
    entityId: id,
    oldValue: existingEvent,
    newValue: existingEvent ? { ...existingEvent, deletedAt: new Date().toISOString() } : null,
  });
  revalidatePlatformEventPaths();
  return Response.json({ success: true, data: result });
}
