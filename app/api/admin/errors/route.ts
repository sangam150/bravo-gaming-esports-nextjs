import { requireAdmin } from "@/lib/admin-auth";
import { getRecentErrorLogs } from "@/lib/server-monitoring";

export async function GET(request: Request) {
  const unauthorized = await requireAdmin(request);
  if (unauthorized) return unauthorized;

  const { searchParams } = new URL(request.url);
  const limit = Number(searchParams.get("limit") ?? 20);
  const data = await getRecentErrorLogs(Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 50) : 20);
  return Response.json({ success: true, data });
}
