import { requireAdmin } from "@/lib/admin-auth";
import { resetCompetitionData } from "@/lib/admin-reset";

export async function POST(request: Request) {
  const unauthorized = await requireAdmin(request);
  if (unauthorized) return unauthorized;

  try {
    const result = await resetCompetitionData();
    return Response.json({ success: true, data: result, message: result.message });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return Response.json({ error: message }, { status: 500 });
  }
}
