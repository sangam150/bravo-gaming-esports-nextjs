import { getCurrentSeasonOverview } from "@/lib/data";

export async function GET() {
  const data = await getCurrentSeasonOverview();
  return Response.json({ success: true, data });
}
