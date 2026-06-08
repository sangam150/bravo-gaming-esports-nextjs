import { requireAdmin } from "@/lib/admin-auth";
import { getLiveMatchResults } from "@/lib/pubg-sync";
import { COLLECTIONS, fetchFirestoreCollection } from "@/lib/firebase";
import type { UploadRecord } from "@/lib/types";

export async function GET(request: Request) {
  const unauthorized = await requireAdmin(request);
  if (unauthorized) return unauthorized;

  const [matches, uploads] = await Promise.all([
    getLiveMatchResults(30),
    fetchFirestoreCollection<UploadRecord>(COLLECTIONS.uploads, 10).catch(() => []),
  ]);

  return Response.json({
    success: true,
    data: { matches, uploads },
    message: matches.length === 0 ? "Waiting for live match data" : undefined,
  });
}
