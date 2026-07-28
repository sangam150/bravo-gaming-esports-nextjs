import { requireAdmin } from "@/lib/admin-auth";
import { writeRequiredAuditLogFromRequest } from "@/lib/audit-logs";
import { getHomepageContent, saveHomepageContent } from "@/lib/platform-content";
import { enforceRateLimit } from "@/lib/rate-limit";
import { revalidateHomepagePaths } from "@/lib/revalidate-public";
import { requireSameOrigin } from "@/lib/request-origin";
import { logServerError } from "@/lib/server-monitoring";

export async function GET(request: Request) {
  const unauthorized = await requireAdmin(request);
  if (unauthorized) return unauthorized;

  const data = await getHomepageContent();
  return Response.json({ success: true, data });
}

export async function PUT(request: Request) {
  const invalidOrigin = requireSameOrigin(request);
  if (invalidOrigin) return invalidOrigin;
  const unauthorized = await requireAdmin(request);
  if (unauthorized) return unauthorized;
  const limited = await enforceRateLimit(request, {
    key: "admin-homepage-content",
    maxRequests: 20,
    windowMs: 60_000,
  });
  if (limited) return limited;

  try {
    const body = await request.json();
    const previousValue = await getHomepageContent();
    await writeRequiredAuditLogFromRequest(request, {
      action: "update_requested",
      entityType: "homepage_content",
      entityId: previousValue.id,
      oldValue: previousValue,
      newValue: body,
    });
    const result = await saveHomepageContent(body);
    revalidateHomepagePaths();

    return Response.json({ success: true, data: result });
  } catch (error: unknown) {
    await logServerError("admin.homepage.update", error, request);
    return Response.json({ error: "Homepage content could not be updated right now." }, { status: 500 });
  }
}
