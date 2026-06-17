import { requireAdmin } from "@/lib/admin-auth";
import { getLiveMatchResults } from "@/lib/pubg-sync";
import { getRecentUploadRecords } from "@/lib/upload-records";

export async function GET(request: Request) {
  const unauthorized = await requireAdmin(request);
  if (unauthorized) return unauthorized;

  const [matches, uploads] = await Promise.all([
    getLiveMatchResults(30),
    getRecentUploadRecords(10).catch(() => []),
  ]);

  return Response.json({
    success: true,
    data: { matches, uploads },
    message: matches.length === 0 ? "Match results will appear once results are published." : undefined,
  });
}
