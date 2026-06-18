import { requireAdmin } from "@/lib/admin-auth";
import { writeAuditLogFromRequest } from "@/lib/audit-logs";
import { deleteSponsor, getSponsors, saveSponsor } from "@/lib/data";
import { revalidatePlatformSponsorPaths } from "@/lib/revalidate-public";

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

    const existingSponsor = (await getSponsors({ includeUnpublished: true })).find((sponsor) => sponsor.id === id) ?? null;
    const result = await saveSponsor(body, id);
    await writeAuditLogFromRequest(request, {
      action: "update",
      entityType: "sponsor",
      entityId: result.id,
      oldValue: existingSponsor,
      newValue: result,
    });
    revalidatePlatformSponsorPaths(result.slug ?? body.slug, result.eventSlugs ?? body.eventSlugs);
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
  const existingSponsor = (await getSponsors({ includeUnpublished: true })).find((sponsor) => sponsor.id === id) ?? null;
  const result = await deleteSponsor(id);
  await writeAuditLogFromRequest(request, {
    action: "soft_delete",
    entityType: "sponsor",
    entityId: id,
    oldValue: existingSponsor,
    newValue: existingSponsor ? { ...existingSponsor, deletedAt: new Date().toISOString() } : null,
  });
  revalidatePlatformSponsorPaths(existingSponsor?.slug, existingSponsor?.eventSlugs);
  return Response.json({ success: true, data: result });
}
