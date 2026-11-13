import { requireAdmin } from "@/lib/admin-auth";
import { requireSameOrigin } from "@/lib/request-origin";
import { writeAuditLogFromRequest } from "@/lib/audit-logs";
import { parseBroadcastState, type BroadcastState } from "@/lib/broadcast";
import { getBroadcastState, saveBroadcastState, buildStudioPreviewSnapshot } from "@/lib/broadcast-server";
import { getPublicTournament, getTournament, getTournamentMatches, getTournamentTeams } from "@/lib/data";
import type { StudioAction } from "@/lib/broadcast-studio";
import { claimStagedAdminPublicAssets } from "@/lib/public-asset-cleanup";
import { COLLECTIONS, getDocument, DocumentWriteConflictError } from "@/lib/document-store";
import { isPublicScrim } from "@/lib/public-scrims";
import type { Scrim } from "@/lib/types";
import { validateScrimSlots } from "@/lib/scrim-slots";
import { enforceRateLimit } from "@/lib/rate-limit";
import { getEventProduction } from "@/lib/event-production-server";
import { parseEventSchedule } from "@/lib/event-schedule";
import { revalidateTag } from "next/cache";

export async function GET(request: Request) {
  const denied = await requireAdmin(request);
  if (denied) return denied;
  try {
    if (new URL(request.url).searchParams.get("preview") === "1") return Response.json({ success: true, data: await buildStudioPreviewSnapshot() }, { headers: { "Cache-Control": "private, no-store", "X-Broadcast-Time": String(Date.now()) } });
    return Response.json(
      { success: true, data: await getBroadcastState(), serverTime: Date.now() },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch {
    return Response.json({ error: "Broadcast controls are unavailable. Check the database connection." }, { status: 503 });
  }
}

export async function PUT(request: Request) {
  const denied = await requireAdmin(request);
  if (denied) return denied;
  const originError = requireSameOrigin(request);
  if (originError) return originError;
  const limited = await enforceRateLimit(request, { key: "broadcast-control", maxRequests: 120, windowMs: 60_000 });
  if (limited) return limited;
  let body: Record<string, unknown>;
  let next: BroadcastState;
  let action: StudioAction;
  try {
    body = await request.json();
    if (!["draft", "preview", "ready", "take", "hide", "restore", "refresh", "reveal"].includes(String(body.action))) throw new Error("Select an explicit studio action.");
    action = body.action as StudioAction;
    next = parseBroadcastState(body);
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Invalid JSON." }, { status: 400 });
  }
  try {
    const previous = await getBroadcastState();
    if (previous.revision !== next.revision) throw new DocumentWriteConflictError();
    const privateEdit = ["draft", "preview", "ready"].includes(action);
    if (action === "restore" && !previous.previousProgram) return Response.json({ error: "No previous program is available." }, { status: 409 });
    if (action === "restore") next = { ...previous.previousProgram!, revision: next.revision };
    if (action === "hide" || action === "refresh") next = { ...previous, revision: next.revision };
    if (next.tournamentId && action !== "hide") {
      const tournament = privateEdit ? await getTournament(next.tournamentId, { includeInternal: true }) : await getPublicTournament(next.tournamentId);
      if (!tournament) return Response.json({ error: "Select a published tournament." }, { status: 400 });
      next.tournamentId = tournament.id;
      if (next.scrimId) {
        const scrim = await getDocument<Scrim>(COLLECTIONS.scrims, next.scrimId);
        if (!scrim || scrim.deletedAt || scrim.tournamentId !== tournament.id || (!privateEdit && !isPublicScrim(scrim)))
          return Response.json({ error: "Select a published scrim linked to this tournament." }, { status: 400 });
        if (next.graphic === "team-slots") {
          try {
            if (typeof scrim.teamCapacity !== "number") throw new Error("Slot capacity is unconfigured.");
            validateScrimSlots(scrim as unknown as Record<string, unknown>);
          } catch {
            return Response.json({ error: "Configure and save valid slots in Scrims before preparing this graphic." }, { status: 400 });
          }
        }
      }
      if (next.graphic === "team-slots" && !next.scrimId)
        return Response.json({ error: "Select the scrim whose saved team slots should be shown." }, { status: 400 });
      const productionRecord = await getEventProduction(tournament.id);
      const production = privateEdit ? productionRecord.draft : productionRecord.approved;
      const stage = production?.stages.find(row => row.id === next.stageId && !row.archived);
      const group = production?.groups.find(row => row.id === next.groupId && !row.archived);
      const day = production?.days.find(row => row.id === next.dayId && !row.archived);
      if (next.stageId && !stage || next.groupId && (!group || next.stageId && group.stageId !== next.stageId) || next.dayId && (!day || next.stageId && day.stageId !== next.stageId) || group && day && group.stageId !== day.stageId)
        return Response.json({ error: "Select an approved stage, group and day belonging to this event." }, { status: 400 });
      const matches = await getTournamentMatches(tournament.id, { includeDrafts: privateEdit });
      const match = matches.find((row) => row.id === next.matchId);
      if (match && (next.stageId || next.groupId || next.dayId)) {
        const schedule = parseEventSchedule(tournament.schedule);
        if (!schedule?.matches.some(row => (row.matchId === match.id || !row.matchId && row.matchNumber === (match.matchNumber ?? match.sequenceNumber)) && (!next.stageId || row.stageId === next.stageId) && (!next.groupId || row.groupId === next.groupId) && (!next.dayId || row.dayId === next.dayId)))
          return Response.json({ error: "This match is outside the selected stage, group or day." }, { status: 400 });
      }
      if (next.matchId && !match) return Response.json({ error: "Select a published match in this tournament." }, { status: 400 });
      if (next.playerId && !match?.playerResults?.some((row) => row.playerId === next.playerId))
        return Response.json({ error: "Select a player from this match." }, { status: 400 });
      if (next.comparisonPlayerId && (!next.playerId || next.comparisonPlayerId === next.playerId || !match?.playerResults?.some(row => row.playerId === next.comparisonPlayerId))) return Response.json({ error: "Choose two different players from the selected match." }, { status: 400 });
      if (next.teamId) {
        const teams = await getTournamentTeams(tournament.id);
        if (!teams.some((team) => team.id === next.teamId))
          return Response.json({ error: "Select a team in this competition." }, { status: 400 });
        const playerRows =
          next.statsScope === "tournament" ? matches.flatMap((row) => row.playerResults ?? []) : (match?.playerResults ?? []);
        if (next.rosterIds?.some((id) => !playerRows.some((player) => player.playerId === id && player.teamId === next.teamId)))
          return Response.json({ error: "Select roster players from this team and statistics period." }, { status: 400 });
      } else if (next.rosterIds?.length) return Response.json({ error: "Select a team before roster players." }, { status: 400 });
    } else if (action !== "hide" && (next.visible || next.matchId || next.playerId)) {
      return Response.json({ error: "Select a published tournament first." }, { status: 400 });
    }
    const data = await saveBroadcastState(next, action);
    await claimStagedAdminPublicAssets({
      relatedId: "program",
      relatedType: "broadcast",
      urls: [...Object.values(next.mapArtwork ?? {}), ...(next.casters ?? []).map((caster) => caster.portraitUrl), ...Object.values(next.templates ?? {}).flatMap(template => [template.logoUrl, template.backgroundUrl]), ...(next.presets ?? []).flatMap(preset => [preset.template.logoUrl, preset.template.backgroundUrl])],
    });
    revalidateTag("broadcast", { expire: 0 });
    await writeAuditLogFromRequest(request, {
      action: `broadcast.${action}`,
      entityType: "broadcast",
      entityId: "program",
      oldValue: previous,
      newValue: data,
    });
    return Response.json({ success: true, data }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (error instanceof Error && (error.message.startsWith("Mark this exact") || error.message.startsWith("Use the explicit"))) return Response.json({ error: error.message }, { status: 409 });
    if (error instanceof DocumentWriteConflictError)
      return Response.json({ error: "Another operator changed the program. Reload controls before continuing." }, { status: 409 });
    return Response.json({ error: "Broadcast update failed. Reload controls and retry." }, { status: 503 });
  }
}
