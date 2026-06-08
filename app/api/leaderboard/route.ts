import { getLeaderboard } from "@/lib/data";

export async function GET() {
  const data = await getLeaderboard();
  return Response.json({ success: true, data });
}
