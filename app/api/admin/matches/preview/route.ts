import { requireAdmin } from "@/lib/admin-auth";
import { writeAuditLogFromRequest } from "@/lib/audit-logs";
import { previewCompetitionMatch } from "@/lib/competition-relational";
import {
  getUserFacingPlayerLabel,
  getUserFacingTeamLabel,
  USER_FACING_LABELS,
} from "@/lib/user-facing-errors";
import type { MatchPlayerResult, TeamMatchResult, TournamentMatch } from "@/lib/types";

function normalizeTeamResults(value: unknown) {
  if (!Array.isArray(value)) return [];

  return value
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
    .map(
      (item) =>
        ({
          teamId: typeof item.teamId === "string" ? item.teamId : undefined,
          teamName: getUserFacingTeamLabel(
            typeof item.teamName === "string" ? item.teamName : undefined,
            USER_FACING_LABELS.teamPendingMapping
          ),
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
          playerName: getUserFacingPlayerLabel(
            typeof item.playerName === "string" ? item.playerName : undefined,
            USER_FACING_LABELS.playerPendingMapping
          ),
          pubgPlayerId: typeof item.pubgPlayerId === "string" ? item.pubgPlayerId : undefined,
          teamId: typeof item.teamId === "string" ? item.teamId : undefined,
          teamName: getUserFacingTeamLabel(
            typeof item.teamName === "string" ? item.teamName : undefined,
            USER_FACING_LABELS.teamPendingMapping
          ),
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
    pointSystemId: typeof value.pointSystemId === "string" ? value.pointSystemId : undefined,
    pointSystemName: typeof value.pointSystemName === "string" ? value.pointSystemName : undefined,
    status: value.status === "draft" ? "draft" : "published",
    playedAt: typeof value.playedAt === "string" ? value.playedAt : undefined,
    vodUrl: typeof value.vodUrl === "string" ? value.vodUrl : undefined,
    scoreboardImageUrl: typeof value.scoreboardImageUrl === "string" ? value.scoreboardImageUrl : undefined,
    resultImageUrl: typeof value.resultImageUrl === "string" ? value.resultImageUrl : undefined,
    screenshotUrls,
    sourceUrl: typeof value.sourceUrl === "string" ? value.sourceUrl : undefined,
    dataSource: value.dataSource === "pubg_api" || value.dataSource === "external_feed" ? value.dataSource : "manual_correction",
    teamResults: normalizeTeamResults(value.teamResults),
    playerResults: normalizePlayerResults(value.playerResults),
  } satisfies Partial<TournamentMatch> & { map: string };
}

export async function POST(request: Request) {
  const unauthorized = await requireAdmin(request);
  if (unauthorized) return unauthorized;

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const entry = normalizeMatchInput(body);

    if (!entry.tournamentId || !entry.map) {
      return Response.json({ error: "tournamentId and map are required" }, { status: 400 });
    }

    const data = await previewCompetitionMatch(entry);
    await writeAuditLogFromRequest(request, {
      action: "preview",
      entityType: "match",
      entityId: data.id ?? null,
      newValue: data,
    });

    return Response.json({ success: true, data });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return Response.json({ error: message }, { status: 500 });
  }
}
