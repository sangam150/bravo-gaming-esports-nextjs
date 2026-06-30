import { requireAdmin } from "@/lib/admin-auth";
import {
  applyPubgImportCandidateAction,
  listPubgImportCandidates,
} from "@/lib/pubg-import-candidates";
import { enforceRateLimit } from "@/lib/rate-limit";
import { revalidateCompetitionPaths } from "@/lib/revalidate-public";
import { logServerError } from "@/lib/server-monitoring";

export async function GET(request: Request) {
  const unauthorized = await requireAdmin(request);
  if (unauthorized) return unauthorized;

  try {
    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get("status")?.trim().toLowerCase() ?? null;
    const watcherIdFilter = searchParams.get("watcherId")?.trim() ?? null;
    const candidates = await listPubgImportCandidates();
    const filteredCandidates = candidates.filter((candidate) => {
      if (statusFilter && candidate.status !== statusFilter) {
        return false;
      }

      if (watcherIdFilter && candidate.watcherId !== watcherIdFilter) {
        return false;
      }

      return true;
    });

    return Response.json({ success: true, data: filteredCandidates });
  } catch (error: unknown) {
    await logServerError("admin.pubg.candidates.list", error, request);
    const message = error instanceof Error ? error.message : String(error);
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const unauthorized = await requireAdmin(request);
  if (unauthorized) return unauthorized;

  const limited = enforceRateLimit(request, { key: "admin-pubg-candidate-actions", maxRequests: 20, windowMs: 60_000 });
  if (limited) return limited;

  try {
    const body = (await request.json().catch(() => ({}))) as {
      id?: string;
      action?: "approve_publish" | "reject" | "force_import_draft";
    };
    const candidateId = body.id?.trim();
    const action = body.action;

    if (!candidateId || !action) {
      return Response.json({ error: "id and action are required." }, { status: 400 });
    }

    if (!["approve_publish", "reject", "force_import_draft"].includes(action)) {
      return Response.json({ error: "Unsupported action." }, { status: 400 });
    }

    const candidate = await applyPubgImportCandidateAction(request, candidateId, action);
    revalidateCompetitionPaths();
    return Response.json({ success: true, data: candidate });
  } catch (error: unknown) {
    await logServerError("admin.pubg.candidates.patch", error, request);
    const message = error instanceof Error ? error.message : String(error);
    return Response.json({ error: message }, { status: 500 });
  }
}
