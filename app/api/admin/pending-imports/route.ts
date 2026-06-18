import { requireAdmin } from "@/lib/admin-auth";
import { COLLECTIONS, createDocument, fetchDocumentCollection } from "@/lib/document-store";
import { enforceRateLimit } from "@/lib/rate-limit";
import { logServerError } from "@/lib/server-monitoring";
import type {
  MatchPlayerResult,
  PubgDuplicateMode,
  PubgImportBatch,
  PubgImportBatchPreviewMatch,
  PubgImportConflict,
  PubgImportEdit,
  TeamMatchResult,
} from "@/lib/types";

function normalizeMatchIds(body: Record<string, unknown>) {
  const rawMatchIds = Array.isArray(body.matchIds)
    ? body.matchIds
    : typeof body.matchIds === "string"
      ? body.matchIds.split(/[\n,]+/g)
      : [];

  return Array.from(
    new Set(rawMatchIds.map((value) => (typeof value === "string" ? value.trim() : "")).filter(Boolean))
  );
}

function normalizeDayMapRotation(value: unknown) {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string" && Boolean(item.trim()));
  }

  if (typeof value === "string") {
    return value
      .split(/[\n,]+/g)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return undefined;
}

function normalizeTeamResults(value: unknown) {
  if (!Array.isArray(value)) return [];

  return value
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
    .map(
      (item) =>
        ({
          teamId: typeof item.teamId === "string" ? item.teamId : undefined,
          teamName: typeof item.teamName === "string" ? item.teamName : "Unknown Team",
          slotNumber:
            typeof item.slotNumber === "number" && Number.isFinite(item.slotNumber) ? item.slotNumber : undefined,
          placement: typeof item.placement === "number" && Number.isFinite(item.placement) ? item.placement : 0,
          kills: typeof item.kills === "number" && Number.isFinite(item.kills) ? item.kills : 0,
          damage: typeof item.damage === "number" && Number.isFinite(item.damage) ? item.damage : 0,
          placementPoints:
            typeof item.placementPoints === "number" && Number.isFinite(item.placementPoints)
              ? item.placementPoints
              : 0,
          killPoints:
            typeof item.killPoints === "number" && Number.isFinite(item.killPoints) ? item.killPoints : 0,
          totalPoints:
            typeof item.totalPoints === "number" && Number.isFinite(item.totalPoints) ? item.totalPoints : 0,
        }) satisfies TeamMatchResult
    );
}

function normalizePlayerResults(value: unknown) {
  if (!Array.isArray(value)) return [];

  return value
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
    .map(
      (item) =>
        ({
          playerId: typeof item.playerId === "string" ? item.playerId : "",
          playerName: typeof item.playerName === "string" ? item.playerName : "Unknown Player",
          pubgPlayerId: typeof item.pubgPlayerId === "string" ? item.pubgPlayerId : undefined,
          teamId: typeof item.teamId === "string" ? item.teamId : undefined,
          teamName: typeof item.teamName === "string" ? item.teamName : "Unknown Team",
          slotNumber:
            typeof item.slotNumber === "number" && Number.isFinite(item.slotNumber) ? item.slotNumber : undefined,
          placement: typeof item.placement === "number" && Number.isFinite(item.placement) ? item.placement : 0,
          kills: typeof item.kills === "number" && Number.isFinite(item.kills) ? item.kills : 0,
          assists: typeof item.assists === "number" && Number.isFinite(item.assists) ? item.assists : 0,
          knocks: typeof item.knocks === "number" && Number.isFinite(item.knocks) ? item.knocks : 0,
          damage: typeof item.damage === "number" && Number.isFinite(item.damage) ? item.damage : 0,
          survivalTime:
            typeof item.survivalTime === "number" && Number.isFinite(item.survivalTime) ? item.survivalTime : 0,
          placementPoints:
            typeof item.placementPoints === "number" && Number.isFinite(item.placementPoints)
              ? item.placementPoints
              : 0,
          totalPoints:
            typeof item.totalPoints === "number" && Number.isFinite(item.totalPoints) ? item.totalPoints : 0,
        }) satisfies MatchPlayerResult
    );
}

function normalizeConflicts(value: unknown) {
  if (!Array.isArray(value)) return [];

  return value
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
    .map(
      (item) =>
        ({
          type: "player_team_mismatch",
          playerName: typeof item.playerName === "string" ? item.playerName : "Unknown Player",
          pubgPlayerId: typeof item.pubgPlayerId === "string" ? item.pubgPlayerId : undefined,
          currentTeamId: typeof item.currentTeamId === "string" ? item.currentTeamId : undefined,
          currentTeamName: typeof item.currentTeamName === "string" ? item.currentTeamName : undefined,
          importedTeamId: typeof item.importedTeamId === "string" ? item.importedTeamId : undefined,
          importedTeamName:
            typeof item.importedTeamName === "string" ? item.importedTeamName : "Unknown Team",
        }) satisfies PubgImportConflict
    );
}

function normalizeMatchEdits(body: Record<string, unknown>) {
  if (!Array.isArray(body.matchEdits)) {
    return [];
  }

  return body.matchEdits
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
    .map(
      (item) =>
        ({
          sourceMatchId: typeof item.sourceMatchId === "string" ? item.sourceMatchId : "",
          matchId: typeof item.matchId === "string" ? item.matchId : undefined,
          matchNumber:
            typeof item.matchNumber === "number" && Number.isFinite(item.matchNumber) ? item.matchNumber : undefined,
          map: typeof item.map === "string" ? item.map : undefined,
          playedAt: typeof item.playedAt === "string" ? item.playedAt : undefined,
          teamResults: normalizeTeamResults(item.teamResults),
          playerResults: normalizePlayerResults(item.playerResults),
        }) satisfies PubgImportEdit
    )
    .filter((item) => Boolean(item.sourceMatchId));
}

function normalizePreviews(body: Record<string, unknown>) {
  if (!Array.isArray(body.previews)) {
    return [];
  }

  return body.previews
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
    .map((item) => {
      const summary =
        item.summary && typeof item.summary === "object" ? (item.summary as Record<string, unknown>) : null;

      return {
          sourceMatchId: typeof item.sourceMatchId === "string" ? item.sourceMatchId : "",
          matchId: typeof item.matchId === "string" ? item.matchId : "",
          matchNumber:
            typeof item.matchNumber === "number" && Number.isFinite(item.matchNumber) ? item.matchNumber : undefined,
          map: typeof item.map === "string" ? item.map : undefined,
          matchDate: typeof item.matchDate === "string" ? item.matchDate : undefined,
          matchTime: typeof item.matchTime === "string" ? item.matchTime : undefined,
          alreadyImported: item.alreadyImported === true,
          summary: summary
            ? {
                id: typeof summary.id === "string" ? summary.id : undefined,
                mapName: typeof summary.mapName === "string" ? summary.mapName : undefined,
                gameMode: typeof summary.gameMode === "string" ? summary.gameMode : undefined,
                createdAt: typeof summary.createdAt === "string" ? summary.createdAt : undefined,
                duration:
                  typeof summary.duration === "number" && Number.isFinite(summary.duration)
                    ? summary.duration
                    : undefined,
                telemetryUrl: typeof summary.telemetryUrl === "string" ? summary.telemetryUrl : undefined,
              }
            : {},
          tournamentTitle: typeof item.tournamentTitle === "string" ? item.tournamentTitle : undefined,
          scrimTitle: typeof item.scrimTitle === "string" ? item.scrimTitle : undefined,
          teamResults: normalizeTeamResults(item.teamResults),
          playerResults: normalizePlayerResults(item.playerResults),
          conflicts: normalizeConflicts(item.conflicts),
        } satisfies PubgImportBatchPreviewMatch;
    })
    .filter((item) => Boolean(item.sourceMatchId && item.matchId));
}

function sortImportBatches(importBatches: PubgImportBatch[]) {
  const statusWeight: Record<PubgImportBatch["status"], number> = {
    pending: 0,
    approved: 1,
    rejected: 2,
  };

  return [...importBatches].sort(
    (firstBatch, secondBatch) =>
      statusWeight[firstBatch.status ?? "pending"] - statusWeight[secondBatch.status ?? "pending"] ||
      (secondBatch.createdAt ?? "").localeCompare(firstBatch.createdAt ?? "")
  );
}

export async function GET(request: Request) {
  const unauthorized = await requireAdmin(request);
  if (unauthorized) return unauthorized;

  try {
    const importBatches = await fetchDocumentCollection<PubgImportBatch>(COLLECTIONS.pubgImportBatches, 100).catch(
      () => []
    );
    return Response.json({ success: true, data: sortImportBatches(importBatches) });
  } catch (error: unknown) {
    await logServerError("admin.pending-imports.list", error, request);
    return Response.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const unauthorized = await requireAdmin(request);
  if (unauthorized) return unauthorized;

  const limited = enforceRateLimit(request, { key: "admin-pending-imports-create", maxRequests: 20, windowMs: 60_000 });
  if (limited) return limited;

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const matchIds = normalizeMatchIds(body);
    const previews = normalizePreviews(body);
    const matchEdits = normalizeMatchEdits(body);

    if (matchIds.length === 0 || previews.length === 0) {
      return Response.json({ error: "Preview at least one match before saving to pending imports." }, { status: 400 });
    }

    const payload = {
      status: "pending",
      seasonId: typeof body.seasonId === "string" ? body.seasonId : undefined,
      seasonTitle: typeof body.seasonTitle === "string" ? body.seasonTitle : undefined,
      seasonDayNumber:
        typeof body.seasonDayNumber === "number" && Number.isFinite(body.seasonDayNumber)
          ? body.seasonDayNumber
          : undefined,
      tournamentId: typeof body.tournamentId === "string" ? body.tournamentId : undefined,
      tournamentTitle: typeof body.tournamentTitle === "string" ? body.tournamentTitle : undefined,
      scrimId: typeof body.scrimId === "string" ? body.scrimId : undefined,
      scrimTitle: typeof body.scrimTitle === "string" ? body.scrimTitle : undefined,
      dayTitle: typeof body.dayTitle === "string" ? body.dayTitle : undefined,
      dayDate: typeof body.dayDate === "string" ? body.dayDate : undefined,
      dayMap: typeof body.dayMap === "string" ? body.dayMap : undefined,
      dayLobbyTime: typeof body.dayLobbyTime === "string" ? body.dayLobbyTime : undefined,
      dayMapRotation: normalizeDayMapRotation(body.dayMapRotation),
      matchIds,
      duplicateMode:
        body.duplicateMode === "skip" || body.duplicateMode === "error" || body.duplicateMode === "overwrite"
          ? (body.duplicateMode as PubgDuplicateMode)
          : "overwrite",
      screenshotUrl: typeof body.screenshotUrl === "string" ? body.screenshotUrl : undefined,
      previews,
      matchEdits,
    } satisfies Omit<PubgImportBatch, "id" | "createdAt" | "updatedAt" | "approvedAt" | "rejectedAt" | "importResult" | "rejectedReason">;

    const result = await createDocument(COLLECTIONS.pubgImportBatches, payload as Record<string, unknown>);
    return Response.json({
      success: true,
      data: { id: result.id, ...payload },
      message: `Saved ${matchIds.length} match${matchIds.length === 1 ? "" : "es"} to pending imports.`,
    });
  } catch (error: unknown) {
    await logServerError("admin.pending-imports.create", error, request);
    return Response.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}

