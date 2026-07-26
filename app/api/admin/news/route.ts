import { requireAdmin } from "@/lib/admin-auth";
import { writeAuditLogFromRequest } from "@/lib/audit-logs";
import { normalizeNewsDateTime } from "@/lib/news-publishing";
import { getManagedNewsArticles, saveManagedNewsArticle } from "@/lib/platform-content";
import { revalidatePath } from "next/cache";

export async function GET(request: Request) {
  const unauthorized = await requireAdmin(request);
  if (unauthorized) return unauthorized;

  const data = await getManagedNewsArticles({ includeDrafts: true });
  return Response.json({ success: true, data });
}

export async function POST(request: Request) {
  const unauthorized = await requireAdmin(request);
  if (unauthorized) return unauthorized;

  try {
    const body = await request.json();
    if (!body.title || !body.summary) {
      return Response.json({ error: "title and summary are required" }, { status: 400 });
    }
    if (body.state === "scheduled") {
      if (!body.publishAt) {
        return Response.json({ error: "publishAt is required for scheduled articles" }, { status: 400 });
      }
      if (!normalizeNewsDateTime(body.publishAt)) {
        return Response.json({ error: "publishAt must be a valid date and time" }, { status: 400 });
      }
    }

    const result = await saveManagedNewsArticle(body);
    await writeAuditLogFromRequest(request, {
      action: "create",
      entityType: "news",
      entityId: result.id,
      newValue: result,
    });

    revalidatePath("/");
    revalidatePath("/news");
    revalidatePath(`/news/${result.slug}`);
    revalidatePath("/pubg/community");
    revalidatePath("/sitemap.xml");

    return Response.json({ success: true, data: result });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return Response.json({ error: message }, { status: 500 });
  }
}
