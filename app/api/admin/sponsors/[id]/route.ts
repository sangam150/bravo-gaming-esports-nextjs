import { requireAdmin } from "@/lib/admin-auth";
import { writeRequiredAuditLogFromRequest } from "@/lib/audit-logs";
import { deleteSponsor, getSponsors, saveSponsor } from "@/lib/data";
import { enforceRateLimit } from "@/lib/rate-limit";
import { revalidatePlatformSponsorPaths } from "@/lib/revalidate-public";
import { requireSameOrigin } from "@/lib/request-origin";
import { logServerError } from "@/lib/server-monitoring";
import { SponsorLinkValidationError } from "@/lib/sponsor-links";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PUT(request: Request, context: RouteContext) {
  const invalidOrigin = requireSameOrigin(request);
  if (invalidOrigin) return invalidOrigin;
  const unauthorized = await requireAdmin(request);
  if (unauthorized) return unauthorized;
  const limited = await enforceRateLimit(request, {
    key: "admin-sponsors-update",
    maxRequests: 30,
    windowMs: 60_000,
  });
  if (limited) return limited;

  try {
    const { id } = await context.params;
    const body = await request.json();
    if (!body.name) {
      return Response.json({ error: "name is required" }, { status: 400 });
    }

    const existingSponsor = (await getSponsors({ includeUnpublished: true })).find((sponsor) => sponsor.id === id) ?? null;
    if (!existingSponsor) {
      return Response.json({ error: "Sponsor not found." }, { status: 404 });
    }
    await writeRequiredAuditLogFromRequest(request, {
      action: "update_requested",
      entityType: "sponsor",
      entityId: id,
      oldValue: existingSponsor,
      newValue: body,
    });
    const result = await saveSponsor(body, id);
    revalidatePlatformSponsorPaths(result.slug ?? body.slug, result.eventSlugs ?? body.eventSlugs);
    return Response.json({ success: true, data: result });
  } catch (error: unknown) {
    await logServerError("admin.sponsors.update", error, request);
    const message = error instanceof Error ? error.message : String(error);
    return Response.json(
      { error: error instanceof SponsorLinkValidationError ? message : "The sponsor could not be updated right now." },
      { status: error instanceof SponsorLinkValidationError ? 400 : 500 },
    );
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  const invalidOrigin = requireSameOrigin(request);
  if (invalidOrigin) return invalidOrigin;
  const unauthorized = await requireAdmin(request);
  if (unauthorized) return unauthorized;
  const limited = await enforceRateLimit(request, {
    key: "admin-sponsors-delete",
    maxRequests: 12,
    windowMs: 60_000,
  });
  if (limited) return limited;

  try {
    const { id } = await context.params;
    const existingSponsor = (await getSponsors({ includeUnpublished: true })).find((sponsor) => sponsor.id === id) ?? null;
    if (!existingSponsor) {
      return Response.json({ error: "Sponsor not found." }, { status: 404 });
    }
    await writeRequiredAuditLogFromRequest(request, {
      action: "soft_delete_requested",
      entityType: "sponsor",
      entityId: id,
      oldValue: existingSponsor,
      newValue: { ...existingSponsor, deletedAt: new Date().toISOString() },
    });
    const result = await deleteSponsor(id);
    revalidatePlatformSponsorPaths(existingSponsor.slug, existingSponsor.eventSlugs);
    return Response.json({ success: true, data: result });
  } catch (error: unknown) {
    await logServerError("admin.sponsors.delete", error, request);
    return Response.json({ error: "The sponsor could not be deleted right now." }, { status: 500 });
  }
}
