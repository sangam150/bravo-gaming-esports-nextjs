import { requireAdmin } from "@/lib/admin-auth";
import { writeAuditLogFromRequest } from "@/lib/audit-logs";
import { syncYouTubeChannelDrafts } from "@/lib/youtube-service";

export async function POST(request: Request) {
  const unauthorized = await requireAdmin(request);
  if (unauthorized) return unauthorized;

  try {
    const body = await request.json().catch(() => ({}));
    const limit = typeof body.limit === "number" ? body.limit : undefined;
    const defaultGameSlug = typeof body.defaultGameSlug === "string" ? body.defaultGameSlug.trim() : undefined;

    const data = await syncYouTubeChannelDrafts({
      limit,
      defaultGameSlug: defaultGameSlug || undefined,
    });

    await writeAuditLogFromRequest(request, {
      action: "sync",
      entityType: "media_youtube",
      entityId: data.channelId,
      newValue: data,
    });

    return Response.json({ success: true, data });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    const status = /YOUTUBE_API_KEY|YouTube API request failed|uploads playlist|document storage is not configured/i.test(message)
      ? 503
      : 500;
    return Response.json({ error: message }, { status });
  }
}
