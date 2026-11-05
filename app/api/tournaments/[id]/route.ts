import { requireAdmin, requirePlatformAdmin } from "@/lib/admin-auth";
import { getEventProduction, saveEventProduction } from "@/lib/event-production-server";
import { writeRequiredAuditLogFromRequest } from "@/lib/audit-logs";
import { DocumentWriteConflictError } from "@/lib/document-store";
import { parseEventProduction } from "@/lib/event-production";
import { claimStagedAdminPublicAssets } from "@/lib/public-asset-cleanup";
import { requireSameOrigin } from "@/lib/request-origin";
import { deleteTournament, getPublicTournament, getTournament, getTournamentMatches, saveTournament } from "@/lib/data";
import { revalidateTournamentPaths } from "@/lib/revalidate-public";
import { jsonErrorResponse, USER_FACING_ERROR_MESSAGES } from "@/lib/user-facing-errors";
import { getPublicTournamentWorkspace } from "@/lib/tournament-workspace";
import { listCompetitionPointSystems } from "@/lib/competition-relational";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const internal = new URL(request.url).searchParams.get("admin") === "true";
  if (internal) {
    const denied = await requireAdmin(request);
    if (denied) return denied;
  }
  if (new URL(request.url).searchParams.get("production") === "true") {
    const denied = await requireAdmin(request);
    if (denied) return denied;
    if (!(await getTournament(id, { includeInternal: true }))) return Response.json({ error: "Competition not found." }, { status: 404 });
    return Response.json({ success: true, data: await getEventProduction(id) }, { headers: { "Cache-Control": "private, no-store" } });
  }
  if (!internal) {
    try {
      const data = await getPublicTournamentWorkspace(id);
      if (!data) return Response.json({ error: "Competition not found." }, { status: 404, headers: { "Cache-Control": "no-store" } });
      return Response.json({ success: true, data }, { headers: { "Cache-Control": "no-cache, must-revalidate" } });
    } catch { return Response.json({ error: "Published competition data is temporarily unavailable." }, { status: 503, headers: { "Cache-Control": "no-store", "Retry-After": "15" } }); }
  }
  const [tournament, matches] = await Promise.all([
    internal ? getTournament(id, { includeInternal: true }) : getPublicTournament(id),
    getTournamentMatches(id, { includeDrafts: internal }),
  ]);
  if (!tournament) {
    return Response.json(
      {
        error: "The page you are looking for does not exist or may have been moved.",
      },
      { status: 404 },
    );
  }
  const production = await getEventProduction(tournament.id);
  return Response.json(
    { success: true, data: { ...tournament, matches, production: internal ? production.draft : production.approved } },
    { headers: { "Cache-Control": internal ? "private, no-store" : "no-cache" } },
  );
}

export async function PUT(request: Request, { params }: RouteParams) {
  const unauthorized = await requireAdmin(request);
  if (unauthorized) return unauthorized;
  const invalidOrigin = requireSameOrigin(request);
  if (invalidOrigin) return invalidOrigin;
  const { id } = await params;
  try {
    const body = await request.json();
    const existing = await getTournament(id, { includeInternal: true });
    if (!existing) {
      return Response.json(
        {
          error: "The page you are looking for does not exist or may have been moved.",
        },
        { status: 404 },
      );
    }
    if (body.productionAction !== undefined) {
      if (!["draft", "approve"].includes(body.productionAction))
        return Response.json({ error: "Choose draft or approve." }, { status: 400 });
      if (body.productionAction === "approve") {
        const permission = await requirePlatformAdmin(request);
        if (permission.response) return permission.response;
      }
      let production;
      try {
        production = parseEventProduction(body.production);
        if (!Number.isSafeInteger(body.productionRevision) || body.productionRevision < 0) throw new Error("Invalid production revision.");
      } catch (error) {
        return Response.json({ error: error instanceof Error ? error.message : "Invalid production settings." }, { status: 400 });
      }
      const previous = await getEventProduction(id);
      if (previous.revision !== body.productionRevision) throw new DocumentWriteConflictError();
      if (body.productionAction === "approve" && production.stages.some(stage => stage.pointSystemId)) {
        const versions = await listCompetitionPointSystems();
        if (production.stages.some(stage => stage.pointSystemId && !versions.some(version => version.id === stage.pointSystemId))) return Response.json({ error: "Select an existing scoring version for every configured stage." }, { status: 400 });
      }
      await writeRequiredAuditLogFromRequest(request, {
        action: `event.production.${body.productionAction}`,
        entityType: "tournament",
        entityId: id,
        oldValue: previous,
        newValue: { revision: body.productionRevision, requested: production },
      });
      const data = await saveEventProduction(id, body.productionRevision, production, body.productionAction === "approve");
      await claimStagedAdminPublicAssets({
        relatedId: id,
        relatedType: "broadcast",
        urls: [
          production.eventLogo,
          production.organizerLogo,
          ...production.maps.flatMap((map) => [map.artwork, map.thumbnail, map.background, map.annotations]),
          ...production.assets.map((asset) => asset.url),
        ],
      });
      revalidateTournamentPaths(id);
      return Response.json({ success: true, data }, { headers: { "Cache-Control": "private, no-store" } });
    }
    const result = await saveTournament({ ...existing, ...body }, id);
    revalidateTournamentPaths(result.id);
    return Response.json({ success: true, data: result });
  } catch (error: unknown) {
    if (error instanceof DocumentWriteConflictError)
      return Response.json({ error: "Event settings changed in another session. Reload before saving." }, { status: 409 });
    return jsonErrorResponse(error, {
      status: 500,
      fallback: USER_FACING_ERROR_MESSAGES.admin,
    });
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  const unauthorized = await requireAdmin(request);
  if (unauthorized) return unauthorized;
  const invalidOrigin = requireSameOrigin(request);
  if (invalidOrigin) return invalidOrigin;
  const { id } = await params;
  await deleteTournament(id);
  revalidateTournamentPaths(id);
  return Response.json({ success: true, data: { id, deleted: true } });
}
