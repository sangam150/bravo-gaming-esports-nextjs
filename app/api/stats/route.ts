import { requireAdmin } from "@/lib/admin-auth";
import { getAdminDashboardStats, getSiteStats } from "@/lib/data";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  if (searchParams.get("admin") === "true") {
    const unauthorized = await requireAdmin(request);
    if (unauthorized) return unauthorized;
    const data = await getAdminDashboardStats();
    return Response.json({ success: true, data });
  }
  const data = await getSiteStats();
  return Response.json({ success: true, data });
}
