import { requireAdmin } from "@/lib/admin-auth";
import { writeAuditLogFromRequest } from "@/lib/audit-logs";
import { getSponsors, saveSponsor } from "@/lib/data";
import { revalidatePlatformSponsorPaths } from "@/lib/revalidate-public";

export async function GET(request: Request) {
  const unauthorized = await requireAdmin(request);
  if (unauthorized) return unauthorized;

  const data = await getSponsors({ includeUnpublished: true });
  return Response.json({ success: true, data });
}

export async function POST(request: Request) {
  const unauthorized = await requireAdmin(request);
  if (unauthorized) return unauthorized;

  try {
    const body = await request.json();
    if (!body.name) {
      return Response.json({ error: "name is required" }, { status: 400 });
    }

    const result = await saveSponsor(body, body.id);
    await writeAuditLogFromRequest(request, {
      action: "create",
      entityType: "sponsor",
      entityId: result.id,
      newValue: result,
    });
    revalidatePlatformSponsorPaths(result.slug ?? body.slug, result.eventSlugs ?? body.eventSlugs);
    return Response.json({ success: true, data: result });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return Response.json({ error: message }, { status: 500 });
  }
}
