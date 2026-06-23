import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin-auth";
import { writeAuditLogFromRequest } from "@/lib/audit-logs";
import { normalizeNewsDateTime } from "@/lib/news-publishing";
import {
  deleteManagedNewsArticle,
  getManagedNewsArticleById,
  saveManagedNewsArticle,
} from "@/lib/platform-content";

type RouteProps = {
  params: Promise<{ id: string }>;
};

export async function PUT(request: Request, { params }: RouteProps) {
  const unauthorized = await requireAdmin(request);
  if (unauthorized) return unauthorized;

  try {
    const { id } = await params;
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

    const existingArticle = await getManagedNewsArticleById(id);
    const result = await saveManagedNewsArticle(body, id);
    await writeAuditLogFromRequest(request, {
      action: "update",
      entityType: "news",
      entityId: result.id,
      oldValue: existingArticle,
      newValue: result,
    });

    revalidatePath("/");
    revalidatePath("/news");
    revalidatePath(`/news/${result.slug}`);
    revalidatePath("/pubg/community");
    revalidatePath("/sitemap.xml");
    if (existingArticle?.slug && existingArticle.slug !== result.slug) {
      revalidatePath(`/news/${existingArticle.slug}`);
    }

    return Response.json({ success: true, data: result });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: RouteProps) {
  const unauthorized = await requireAdmin(request);
  if (unauthorized) return unauthorized;

  try {
    const { id } = await params;
    const existingArticle = await getManagedNewsArticleById(id);
    await deleteManagedNewsArticle(id);
    await writeAuditLogFromRequest(request, {
      action: "soft_delete",
      entityType: "news",
      entityId: id,
      oldValue: existingArticle,
      newValue: existingArticle ? { ...existingArticle, deletedAt: new Date().toISOString() } : null,
    });

    revalidatePath("/");
    revalidatePath("/news");
    revalidatePath("/pubg/community");
    revalidatePath("/sitemap.xml");
    if (existingArticle?.slug) {
      revalidatePath(`/news/${existingArticle.slug}`);
    }

    return Response.json({ success: true, data: { id, deleted: true } });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return Response.json({ error: message }, { status: 500 });
  }
}
