import { requireAdmin } from "@/lib/admin-auth";
import { randomUUID } from "node:crypto";
import {
  COLLECTIONS,
  fetchDocumentCollection,
  getDocument,
  saveDocument,
  saveDocumentIfFieldsMatch,
  DocumentWriteConflictError,
} from "@/lib/document-store";
import { getSupabaseServiceRoleClient } from "@/lib/supabase/service-role-client";
import { requireSameOrigin } from "@/lib/request-origin";
import { writeAuditLogFromRequest } from "@/lib/audit-logs";
import { validateScrimInput, ScrimInputError, scrimAuditSummary } from "@/lib/scrim-input";
import { revalidateCompetitionPaths } from "@/lib/revalidate-public";
import type { Scrim } from "@/lib/types";

function normalizePubgMatchIds(body: Record<string, unknown>) {
  const rawMatchIds = Array.isArray(body.pubgMatchIds)
    ? body.pubgMatchIds
    : typeof body.pubgMatchIds === "string"
      ? body.pubgMatchIds.split(/[\n,]+/g)
      : [];

  const primaryMatchId = typeof body.pubgMatchId === "string" ? body.pubgMatchId : "";

  return Array.from(
    new Set([primaryMatchId, ...rawMatchIds].map((value) => (typeof value === "string" ? value.trim() : "")).filter(Boolean)),
  );
}

function buildScrimPayload(body: Record<string, unknown>): Partial<Scrim> {
  const pubgMatchIds = normalizePubgMatchIds(body);

  return {
    title: typeof body.title === "string" ? body.title : "",
    date: typeof body.date === "string" ? body.date : "",
    map: typeof body.map === "string" ? body.map : "",
    lobbyTime: typeof body.lobbyTime === "string" && body.lobbyTime ? body.lobbyTime : "8:00 PM NPT",
    roomId: typeof body.roomId === "string" ? body.roomId : undefined,
    roomPassword: typeof body.roomPassword === "string" ? body.roomPassword : undefined,
    teamIds: Array.isArray(body.teamIds) ? body.teamIds.filter((value): value is string => typeof value === "string") : [],
    pubgMatchId: pubgMatchIds[0],
    pubgMatchIds,
    status: (typeof body.status === "string" ? body.status : "scheduled") as Scrim["status"],
    announcement: typeof body.announcement === "string" ? body.announcement : undefined,
    mapRotation: Array.isArray(body.mapRotation)
      ? body.mapRotation.filter((value): value is string => typeof value === "string" && Boolean(value))
      : [],
    seasonId: typeof body.seasonId === "string" ? body.seasonId : undefined,
    seasonTitle: typeof body.seasonTitle === "string" ? body.seasonTitle : undefined,
    seasonDayNumber: typeof body.seasonDayNumber === "number" && Number.isFinite(body.seasonDayNumber) ? body.seasonDayNumber : undefined,
    tournamentId: typeof body.tournamentId === "string" ? body.tournamentId : undefined,
    published: body.published === true,
  };
}

export async function GET(request: Request) {
  const unauthorized = await requireAdmin(request);
  if (unauthorized) return unauthorized;
  const data = await fetchDocumentCollection<Scrim>(COLLECTIONS.scrims, 100);
  return Response.json(
    { success: true, data: data.filter((scrim) => !scrim.deletedAt) },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}

export async function POST(request: Request) {
  const unauthorized = await requireAdmin(request);
  if (unauthorized) return unauthorized;
  const originError = requireSameOrigin(request);
  if (originError) return originError;
  try {
    const body = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new ScrimInputError("A scrim object is required.");
    if (!body.title || !body.date || !body.map) {
      return Response.json({ error: "title, date, and map are required" }, { status: 400 });
    }
    validateScrimInput(body);
    const payload = buildScrimPayload(body as Record<string, unknown>);
    const id = typeof body.id === "string" && body.id.trim() ? body.id.trim() : randomUUID();
    if (id.length > 160) return Response.json({ error: "Invalid scrim ID." }, { status: 400 });
    const now = new Date().toISOString();
    const { error } = await getSupabaseServiceRoleClient()
      .from("app_documents")
      .insert({
        collection_name: COLLECTIONS.scrims,
        id,
        data: JSON.parse(JSON.stringify({ ...payload, createdAt: now, updatedAt: now })),
      });
    if (error) {
      if (error.code === "23505") return Response.json({ error: "A scrim with this ID already exists." }, { status: 409 });
      throw error;
    }
    const result = { id };
    await writeAuditLogFromRequest(request, {
      action: "create",
      entityType: "scrim",
      entityId: id,
      newValue: scrimAuditSummary({ ...payload, id }),
    });
    revalidateCompetitionPaths();
    return Response.json({
      success: true,
      data: { id: result.id, ...payload },
    });
  } catch (error: unknown) {
    return scrimError(error);
  }
}

export async function PUT(request: Request) {
  const unauthorized = await requireAdmin(request);
  if (unauthorized) return unauthorized;
  const originError = requireSameOrigin(request);
  if (originError) return originError;
  try {
    const body = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new ScrimInputError("A scrim object is required.");
    if (typeof body.id !== "string" || !body.id) return Response.json({ error: "id is required" }, { status: 400 });
    const existing = await getDocument<Scrim>(COLLECTIONS.scrims, body.id);
    if (!existing || existing.deletedAt) return Response.json({ error: "Scrim not found." }, { status: 404 });
    const merged = { ...existing, ...body };
    validateScrimInput(merged);
    const payload = buildScrimPayload(merged);
    await saveDocumentIfFieldsMatch(COLLECTIONS.scrims, body.id, payload as Record<string, unknown>, { updatedAt: existing.updatedAt });
    await writeAuditLogFromRequest(request, {
      action: "edit",
      entityType: "scrim",
      entityId: body.id,
      oldValue: scrimAuditSummary(existing),
      newValue: scrimAuditSummary({ ...payload, id: body.id }),
    });
    revalidateCompetitionPaths();
    return Response.json({ success: true, data: { id: body.id, ...payload } });
  } catch (error: unknown) {
    return scrimError(error);
  }
}

export async function DELETE(request: Request) {
  const unauthorized = await requireAdmin(request);
  if (unauthorized) return unauthorized;
  const originError = requireSameOrigin(request);
  if (originError) return originError;
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return Response.json({ error: "id is required" }, { status: 400 });
  try {
    const existing = await getDocument<Scrim>(COLLECTIONS.scrims, id);
    if (!existing || existing.deletedAt) return Response.json({ error: "Scrim not found." }, { status: 404 });
    await saveDocument(COLLECTIONS.scrims, id, { published: false, deletedAt: new Date().toISOString() });
    await writeAuditLogFromRequest(request, {
      action: "archive",
      entityType: "scrim",
      entityId: id,
      oldValue: scrimAuditSummary(existing),
      newValue: { published: false, deleted: true },
    });
    revalidateCompetitionPaths();
    return Response.json({ success: true });
  } catch (error) {
    return scrimError(error);
  }
}

function scrimError(error: unknown) {
  if (error instanceof ScrimInputError || error instanceof SyntaxError) return Response.json({ error: error.message }, { status: 400 });
  if (error instanceof DocumentWriteConflictError)
    return Response.json({ error: "Scrim changed while saving. Reload and try again." }, { status: 409 });
  return Response.json({ error: "Could not save the scrim. Check the database connection and retry." }, { status: 503 });
}
