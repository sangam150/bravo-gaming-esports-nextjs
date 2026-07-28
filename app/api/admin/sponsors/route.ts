import { requireAdmin } from "@/lib/admin-auth";
import { writeRequiredAuditLogFromRequest } from "@/lib/audit-logs";
import { getSponsors, saveSponsor } from "@/lib/data";
import { enforceRateLimit } from "@/lib/rate-limit";
import { revalidatePlatformSponsorPaths } from "@/lib/revalidate-public";
import { requireSameOrigin } from "@/lib/request-origin";
import { logServerError } from "@/lib/server-monitoring";
import { SponsorLinkValidationError } from "@/lib/sponsor-links";

export async function GET(request: Request) {
  const unauthorized = await requireAdmin(request);
  if (unauthorized) return unauthorized;

  const data = await getSponsors({ includeUnpublished: true });
  return Response.json({ success: true, data });
}

export async function POST(request: Request) {
  const invalidOrigin = requireSameOrigin(request);
  if (invalidOrigin) return invalidOrigin;
  const unauthorized = await requireAdmin(request);
  if (unauthorized) return unauthorized;
  const limited = await enforceRateLimit(request, {
    key: "admin-sponsors-create",
    maxRequests: 20,
    windowMs: 60_000,
  });
  if (limited) return limited;

  try {
    const body = await request.json();
    if (!body.name) {
      return Response.json({ error: "name is required" }, { status: 400 });
    }

    await writeRequiredAuditLogFromRequest(request, {
      action: "create_requested",
      entityType: "sponsor",
      entityId: typeof body.id === "string" ? body.id : null,
      newValue: body,
    });
    const result = await saveSponsor(body, body.id);
    revalidatePlatformSponsorPaths(result.slug ?? body.slug, result.eventSlugs ?? body.eventSlugs);
    return Response.json({ success: true, data: result });
  } catch (error: unknown) {
    await logServerError("admin.sponsors.create", error, request);
    const message = error instanceof Error ? error.message : String(error);
    return Response.json(
      { error: error instanceof SponsorLinkValidationError ? message : "The sponsor could not be created right now." },
      { status: error instanceof SponsorLinkValidationError ? 400 : 500 },
    );
  }
}
