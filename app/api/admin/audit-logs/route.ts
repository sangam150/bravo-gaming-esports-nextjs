import { requireAdmin } from "@/lib/admin-auth";
import { listRecentAuditLogs } from "@/lib/audit-logs";

export async function GET(request: Request) {
  const unauthorized = await requireAdmin(request);
  if (unauthorized) return unauthorized;

  const { searchParams } = new URL(request.url);
  const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit") ?? 20) || 20));

  try {
    const data = await listRecentAuditLogs(limit);
    return Response.json({ success: true, data });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return Response.json({ error: message }, { status: 500 });
  }
}
