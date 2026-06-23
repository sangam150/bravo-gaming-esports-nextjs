import { compareMatchPlayerResults, compareMatchTeamResults } from "./ranking-sort";
import type { MatchPlayerResult, TeamMatchResult } from "./types";
import type { Tables } from "@/types/database.types";

export const DEFAULT_POINT_SYSTEM_ID = "00000000-0000-4000-8000-000000000001";

export type PointSystemRecord = Pick<Tables<"point_systems">, "id" | "kill_points" | "name" | "placement_points" | "rules_json">;

type PlacementPointsMap = Map<number, number>;

function toFiniteNumber(value: unknown, fallback = 0) {
  const numericValue = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numericValue) ? numericValue : fallback;
}

function normalizePlacementPointsMap(value: PointSystemRecord["placement_points"]): PlacementPointsMap {
  const normalizedMap = new Map<number, number>();
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return normalizedMap;
  }

  for (const [key, rawValue] of Object.entries(value)) {
    const placement = Number(key);
    if (!Number.isFinite(placement)) {
      continue;
    }

    normalizedMap.set(placement, toFiniteNumber(rawValue));
  }

  return normalizedMap;
}

function resolvePlacementPoints(placementPointsMap: PlacementPointsMap, placement: number) {
  return placementPointsMap.get(placement) ?? 0;
}

function normalizeTeamKey(teamResult: Pick<TeamMatchResult, "teamId" | "teamName" | "slotNumber">) {
  if (teamResult.teamId?.trim()) {
    return `id:${teamResult.teamId.trim().toLowerCase()}`;
  }

  if (typeof teamResult.slotNumber === "number" && Number.isFinite(teamResult.slotNumber)) {
    return `slot:${teamResult.slotNumber}`;
  }

  return `name:${teamResult.teamName.trim().toLowerCase()}`;
}

export function scoreMatchResults(
  teamResults: TeamMatchResult[],
  playerResults: MatchPlayerResult[],
  pointSystem: PointSystemRecord
) {
  const placementPointsMap = normalizePlacementPointsMap(pointSystem.placement_points);
  const killPointMultiplier = toFiniteNumber(pointSystem.kill_points, 1);

  const scoredTeamResults = [...teamResults]
    .map((teamResult) => {
      const placement = toFiniteNumber(teamResult.placement);
      const kills = toFiniteNumber(teamResult.kills);
      const placementPoints = resolvePlacementPoints(placementPointsMap, placement);
      const killPoints = Number((kills * killPointMultiplier).toFixed(2));
      const totalPoints = Number((placementPoints + killPoints).toFixed(2));

      return {
        ...teamResult,
        placement,
        kills,
        damage: toFiniteNumber(teamResult.damage),
        placementPoints,
        killPoints,
        totalPoints,
      } satisfies TeamMatchResult;
    })
    .sort((firstValue, secondValue) => compareMatchTeamResults(firstValue, secondValue));

  const teamLookup = new Map(scoredTeamResults.map((teamResult) => [normalizeTeamKey(teamResult), teamResult] as const));

  const scoredPlayerResults = [...playerResults]
    .map((playerResult) => {
      const relatedTeam =
        teamLookup.get(normalizeTeamKey(playerResult)) ??
        (playerResult.teamName.trim()
          ? teamLookup.get(`name:${playerResult.teamName.trim().toLowerCase()}`) ?? null
          : null);
      const placement = toFiniteNumber(playerResult.placement, relatedTeam?.placement ?? 0);
      const kills = toFiniteNumber(playerResult.kills);
      const placementPoints = resolvePlacementPoints(placementPointsMap, placement);
      const totalPoints = Number((placementPoints + kills * killPointMultiplier).toFixed(2));

      return {
        ...playerResult,
        teamId: playerResult.teamId ?? relatedTeam?.teamId,
        teamName: playerResult.teamName || relatedTeam?.teamName || "Team Pending",
        slotNumber: playerResult.slotNumber ?? relatedTeam?.slotNumber,
        placement,
        kills,
        assists: toFiniteNumber(playerResult.assists),
        knocks: toFiniteNumber(playerResult.knocks),
        damage: toFiniteNumber(playerResult.damage),
        survivalTime: toFiniteNumber(playerResult.survivalTime),
        placementPoints,
        totalPoints,
      } satisfies MatchPlayerResult;
    })
    .sort((firstValue, secondValue) => compareMatchPlayerResults(firstValue, secondValue));

  const winningTeam = scoredTeamResults[0] ?? null;

  return {
    pointSystemId: pointSystem.id,
    pointSystemName: pointSystem.name,
    teamResults: scoredTeamResults,
    playerResults: scoredPlayerResults,
    winner: winningTeam?.teamName ?? "Winner Pending",
    placementPoints: winningTeam?.placementPoints ?? 0,
    killPoints: winningTeam?.killPoints ?? 0,
    totalPoints: winningTeam?.totalPoints ?? 0,
    totalKills: scoredTeamResults.reduce((sum, teamResult) => sum + teamResult.kills, 0),
  };
}
