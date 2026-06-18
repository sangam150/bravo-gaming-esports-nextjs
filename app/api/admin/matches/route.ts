import { requireAdmin } from "@/lib/admin-auth";
import { writeAuditLogFromRequest } from "@/lib/audit-logs";
import { deleteAdminMatch, getAdminMatch, listAdminMatches, saveAdminMatch, saveAdminMatches } from "@/lib/admin-matches";
import { syncTournamentAndSeasonDerivedData } from "@/lib/pubg-sync";
import { revalidateCompetitionPaths } from "@/lib/revalidate-public";
import { getRecentUploadRecords } from "@/lib/upload-records";
import type { MatchPlayerResult, TeamMatchResult, TournamentMatch } from "@/lib/types";

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

function normalizeMatchInput(value: Record<string, unknown>) {
  const screenshotUrls = Array.isArray(value.screenshotUrls)
    ? value.screenshotUrls.filter((item): item is string => typeof item === "string")
    : typeof value.screenshotUrls === "string"
      ? value.screenshotUrls.split(/[\n,]+/g).map((item) => item.trim()).filter(Boolean)
      : [];

  return {
    id: typeof value.id === "string" ? value.id : undefined,
    tournamentId: typeof value.tournamentId === "string" ? value.tournamentId : undefined,
    scrimId: typeof value.scrimId === "string" ? value.scrimId : undefined,
    pubgMatchId: typeof value.pubgMatchId === "string" ? value.pubgMatchId : "",
    externalMatchId: typeof value.externalMatchId === "string" ? value.externalMatchId : undefined,
    sequenceNumber:
      typeof value.sequenceNumber === "number" && Number.isFinite(value.sequenceNumber) ? value.sequenceNumber : undefined,
    matchNumber:
      typeof value.matchNumber === "number" && Number.isFinite(value.matchNumber) ? value.matchNumber : undefined,
    map: typeof value.map === "string" ? value.map : "",
    eventName: typeof value.eventName === "string" ? value.eventName : undefined,
    eventSlug: typeof value.eventSlug === "string" ? value.eventSlug : undefined,
    status: value.status === "draft" ? "draft" : "published",
    winner: typeof value.winner === "string" ? value.winner : undefined,
    points: typeof value.points === "number" && Number.isFinite(value.points) ? value.points : undefined,
    knockouts: typeof value.knockouts === "number" && Number.isFinite(value.knockouts) ? value.knockouts : undefined,
    placementPoints:
      typeof value.placementPoints === "number" && Number.isFinite(value.placementPoints)
        ? value.placementPoints
        : undefined,
    killPoints:
      typeof value.killPoints === "number" && Number.isFinite(value.killPoints) ? value.killPoints : undefined,
    playedAt: typeof value.playedAt === "string" ? value.playedAt : undefined,
    vodUrl: typeof value.vodUrl === "string" ? value.vodUrl : undefined,
    resultScreenshotUrl: typeof value.resultScreenshotUrl === "string" ? value.resultScreenshotUrl : undefined,
    scoreboardImageUrl: typeof value.scoreboardImageUrl === "string" ? value.scoreboardImageUrl : undefined,
    resultImageUrl: typeof value.resultImageUrl === "string" ? value.resultImageUrl : undefined,
    screenshotUrls,
    sourceUrl: typeof value.sourceUrl === "string" ? value.sourceUrl : undefined,
    dataSource: value.dataSource === "pubg_api" || value.dataSource === "external_feed" ? value.dataSource : "manual_correction",
    syncedAt: typeof value.syncedAt === "string" ? value.syncedAt : undefined,
    publishedAt: typeof value.publishedAt === "string" ? value.publishedAt : undefined,
    teamResults: normalizeTeamResults(value.teamResults),
    playerResults: normalizePlayerResults(value.playerResults),
  } satisfies Partial<TournamentMatch> & { pubgMatchId: string; map: string };
}

function getAffectedTournamentIds(matches: TournamentMatch | TournamentMatch[] | null | undefined) {
  const records = Array.isArray(matches) ? matches : matches ? [matches] : [];
  return Array.from(
    new Set(records.map((match) => match.tournamentId).filter((tournamentId): tournamentId is string => Boolean(tournamentId)))
  );
}

export async function GET(request: Request) {
  const unauthorized = await requireAdmin(request);
  if (unauthorized) return unauthorized;

  const [matches, uploads] = await Promise.all([listAdminMatches(200), getRecentUploadRecords(20).catch(() => [])]);

  return Response.json({
    success: true,
    data: { matches, uploads },
    message: matches.filter((match) => match.status !== "draft").length === 0
      ? "Match data will appear once results are published."
      : undefined,
  });
}

export async function POST(request: Request) {
  const unauthorized = await requireAdmin(request);
  if (unauthorized) return unauthorized;

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const entries = Array.isArray(body.matches)
      ? body.matches
          .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
          .map(normalizeMatchInput)
      : [normalizeMatchInput(body)];

    if (entries.some((entry) => !entry.pubgMatchId || !entry.map)) {
      return Response.json({ error: "pubgMatchId and map are required for every match" }, { status: 400 });
    }

    const data = entries.length === 1 ? await saveAdminMatch(entries[0]) : await saveAdminMatches(entries);
    await writeAuditLogFromRequest(request, {
      action: entries.length === 1 ? "create" : "bulk_create",
      entityType: "match",
      entityId: Array.isArray(data) ? null : data.id,
      newValue: data,
    });
    await Promise.all(getAffectedTournamentIds(data).map((tournamentId) => syncTournamentAndSeasonDerivedData(tournamentId)));
    revalidateCompetitionPaths(Array.isArray(data) ? undefined : data.id);
    return Response.json({ success: true, data });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const unauthorized = await requireAdmin(request);
  if (unauthorized) return unauthorized;

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const entry = normalizeMatchInput(body);

    if (!entry.pubgMatchId || !entry.map) {
      return Response.json({ error: "pubgMatchId and map are required" }, { status: 400 });
    }

    const existingMatch = entry.id ? await getAdminMatch(entry.id) : null;
    const data = await saveAdminMatch(entry);
    await writeAuditLogFromRequest(request, {
      action: "update",
      entityType: "match",
      entityId: data.id,
      oldValue: existingMatch,
      newValue: data,
    });
    await Promise.all(getAffectedTournamentIds(data).map((tournamentId) => syncTournamentAndSeasonDerivedData(tournamentId)));
    revalidateCompetitionPaths(data.id);
    return Response.json({ success: true, data });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const unauthorized = await requireAdmin(request);
  if (unauthorized) return unauthorized;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return Response.json({ error: "id is required" }, { status: 400 });
  }

  const existingMatch = await getAdminMatch(id);
  const data = await deleteAdminMatch(id);
  await writeAuditLogFromRequest(request, {
    action: "soft_delete",
    entityType: "match",
    entityId: id,
    oldValue: existingMatch,
    newValue: existingMatch ? { ...existingMatch, deletedAt: new Date().toISOString() } : { id, deletedAt: new Date().toISOString() },
  });
  await Promise.all(getAffectedTournamentIds(existingMatch).map((tournamentId) => syncTournamentAndSeasonDerivedData(tournamentId)));
  revalidateCompetitionPaths(id);
  return Response.json({ success: true, data });
}
