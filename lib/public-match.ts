import { sanitizePublicAssetUrl } from "./public-content";
import { normalizeVerifiedStreamHref } from "./public-event-policy";
import type { MatchPlayerResult, TeamMatchResult, TournamentMatch } from "./types";

export function isExplicitlyPublishedMatch(match: Pick<TournamentMatch, "status">) {
  return match.status?.trim().toLowerCase() === "published";
}

function sanitizeTeamResult(result: TeamMatchResult): TeamMatchResult {
  return {
    adjustmentPoints: result.adjustmentPoints,
    decisionReason: result.decisionReason,
    disqualified: result.disqualified,
    tieBreakers: result.tieBreakers,
    teamId: result.teamId,
    teamName: result.teamName,
    slotNumber: result.slotNumber,
    placement: result.placement,
    kills: result.kills,
    damage: result.damage,
    placementPoints: result.placementPoints,
    killPoints: result.killPoints,
    totalPoints: result.totalPoints,
  };
}

export function publicMatchPlayerId(result: MatchPlayerResult, matchId: string, index: number) {
  return result.playerId === result.pubgPlayerId || /^account\./i.test(result.playerId)
    ? `unlinked-${matchId}-${index}` : result.playerId;
}

function sanitizePlayerResult(result: MatchPlayerResult, matchId: string, index: number): MatchPlayerResult {
  return {
    disqualified: result.disqualified,
    awardCriteria: result.awardCriteria,
    playerId: publicMatchPlayerId(result, matchId, index),
    playerName: result.playerName,
    teamId: result.teamId,
    teamName: result.teamName,
    slotNumber: result.slotNumber,
    placement: result.placement,
    kills: result.kills,
    assists: result.assists,
    knocks: result.knocks,
    damage: result.damage,
    survivalTime: result.survivalTime,
    placementPoints: result.placementPoints,
    totalPoints: result.totalPoints,
  };
}

export function sanitizePublicMatch(match: TournamentMatch): TournamentMatch {
  return {
    id: match.id,
    tournamentId: match.tournamentId,
    scrimId: match.scrimId,
    pubgMatchId: match.pubgMatchId,
    sequenceNumber: match.sequenceNumber,
    matchNumber: match.matchNumber,
    map: match.map,
    eventName: match.eventName,
    eventSlug: match.eventSlug,
    status: match.status,
    winner: match.winner,
    points: match.points,
    knockouts: match.knockouts,
    placementPoints: match.placementPoints,
    killPoints: match.killPoints,
    playedAt: match.playedAt,
    vodUrl: normalizeVerifiedStreamHref(match.vodUrl) ?? undefined,
    resultScreenshotUrl: sanitizePublicAssetUrl(match.resultScreenshotUrl) ?? undefined,
    scoreboardImageUrl: sanitizePublicAssetUrl(match.scoreboardImageUrl) ?? undefined,
    resultImageUrl: sanitizePublicAssetUrl(match.resultImageUrl) ?? undefined,
    screenshotUrls: match.screenshotUrls?.map((url) => sanitizePublicAssetUrl(url)).filter((url): url is string => Boolean(url)),
    dataSource: match.dataSource,
    publishedAt: match.publishedAt,
    pointSystemName: match.pointSystemName,
    scoringRules: match.scoringRules,
    teamResults: (match.teamResults ?? []).map(sanitizeTeamResult),
    playerResults: (match.playerResults ?? []).map((row, index) => sanitizePlayerResult(row, match.id, index)),
  };
}
