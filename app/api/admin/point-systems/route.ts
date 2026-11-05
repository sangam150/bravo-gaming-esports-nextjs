import { requireAdmin, requirePlatformAdmin } from "@/lib/admin-auth";
import { requireSameOrigin } from "@/lib/request-origin";
import { writeAuditLogFromRequest } from "@/lib/audit-logs";
import { listCompetitionPointSystems } from "@/lib/competition-relational";
import { parsePointSystemInput } from "@/lib/point-system-input";
import { getSupabaseServiceRoleClient } from "@/lib/supabase/service-role-client";
import { enforceRateLimit } from "@/lib/rate-limit";

export async function GET(request: Request) {
  const denied = await requireAdmin(request);
  if (denied) return denied;
  try {
    return Response.json(
      { success: true, data: await listCompetitionPointSystems() },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch {
    return Response.json({ error: "Scoring configurations are unavailable." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const permission = await requirePlatformAdmin(request);
  if (permission.response) return permission.response;
  const originError = requireSameOrigin(request);
  if (originError) return originError;
  const limited = await enforceRateLimit(request, { key: "point-system-create", maxRequests: 20, windowMs: 60_000 });
  if (limited) return limited;
  let input;
  try {
    input = parsePointSystemInput(await request.json());
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Invalid JSON." }, { status: 400 });
  }
  const { data, error } = await getSupabaseServiceRoleClient()
    .from("point_systems")
    .insert(input)
    .select("id,name,kill_points,placement_points,rules_json,active")
    .single();
  if (error)
    return Response.json(
      { error: error.code === "23505" ? "Use a unique name for this scoring version." : "Could not save the scoring configuration." },
      { status: error.code === "23505" ? 409 : 503 },
    );
  await writeAuditLogFromRequest(request, { action: "create", entityType: "point_system", entityId: data.id, newValue: data });
  return Response.json({ success: true, data }, { status: 201 });
}
