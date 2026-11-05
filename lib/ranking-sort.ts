import { compareBravoTeamSlotOrder } from "./bravo-teams";
import type { MatchPlayerResult, Player, ScrimDayStanding, TeamMatchResult, TournamentMatch, TournamentStanding } from "./types";
import type { TeamTieBreak } from "./scoring-rules";

function compareOptionalNumberDesc(firstValue?: number | null, secondValue?: number | null) {
  const normalizedFirstValue = typeof firstValue === "number" && Number.isFinite(firstValue) ? firstValue : Number.NEGATIVE_INFINITY;
  const normalizedSecondValue = typeof secondValue === "number" && Number.isFinite(secondValue) ? secondValue : Number.NEGATIVE_INFINITY;

  return normalizedSecondValue - normalizedFirstValue;
}

function compareOptionalNumberAsc(firstValue?: number | null, secondValue?: number | null) {
  const normalizedFirstValue = typeof firstValue === "number" && Number.isFinite(firstValue) ? firstValue : Number.POSITIVE_INFINITY;
  const normalizedSecondValue = typeof secondValue === "number" && Number.isFinite(secondValue) ? secondValue : Number.POSITIVE_INFINITY;

  return normalizedFirstValue - normalizedSecondValue;
}

function compareOptionalIsoDateDesc(firstValue?: string | null, secondValue?: string | null) {
  return (secondValue ?? "").localeCompare(firstValue ?? "");
}

function getStableTeamKey(value: { teamId?: string; id?: string; teamName?: string; name?: string }) {
  return value.teamId ?? value.id ?? value.teamName ?? value.name ?? "";
}

function getStablePlayerKey(value: { playerId?: string; pubgPlayerId?: string; id?: string; playerName?: string; name?: string }) {
  return value.playerId ?? value.pubgPlayerId ?? value.id ?? value.playerName ?? value.name ?? "";
}

type TeamPerformanceLike = {
  disqualified?: boolean;
  tieBreakers?: TeamTieBreak[];
  latestPlacement?: number;
  latestKills?: number;
  teamId?: string;
  id?: string;
  teamName?: string;
  name?: string;
  slotNumber?: number;
  totalPoints?: number;
  killPoints?: number;
  kills?: number;
  bestPlacement?: number;
  latestDayNumber?: number;
  seasonDayNumber?: number;
  latestPlayedAt?: string;
  latestUpdatedAt?: string;
  updatedAt?: string;
  sequenceNumber?: number;
  wins?: number;
  placementPoints?: number;
};

export function compareTeamLeaderboardPerformance<T extends TeamPerformanceLike>(firstValue: T, secondValue: T) {
  const eligibility = Number(Boolean(firstValue.disqualified)) - Number(Boolean(secondValue.disqualified));
  if (eligibility) return eligibility;
  if (firstValue.tieBreakers?.length && JSON.stringify(firstValue.tieBreakers) === JSON.stringify(secondValue.tieBreakers)) {
    const points = compareOptionalNumberDesc(firstValue.totalPoints, secondValue.totalPoints);
    if (points) return points;
    for (const key of firstValue.tieBreakers) {
      const difference = key === "bestPlacement" || key === "latestPlacement" ? compareOptionalNumberAsc(firstValue[key], secondValue[key]) : compareOptionalNumberDesc(firstValue[key], secondValue[key]);
      if (difference) return difference;
    }
    return getStableTeamKey(firstValue).localeCompare(getStableTeamKey(secondValue));
  }
  return (
    compareOptionalNumberDesc(firstValue.totalPoints, secondValue.totalPoints) ||
    compareOptionalNumberDesc(firstValue.killPoints ?? firstValue.kills, secondValue.killPoints ?? secondValue.kills) ||
    compareOptionalNumberDesc(firstValue.kills, secondValue.kills) ||
    compareOptionalNumberDesc(firstValue.wins, secondValue.wins) ||
    compareOptionalNumberDesc(firstValue.placementPoints, secondValue.placementPoints) ||
    compareOptionalNumberAsc(firstValue.bestPlacement, secondValue.bestPlacement) ||
    compareBravoTeamSlotOrder(firstValue, secondValue) ||
    compareOptionalNumberDesc(
      firstValue.latestDayNumber ?? firstValue.seasonDayNumber,
      secondValue.latestDayNumber ?? secondValue.seasonDayNumber,
    ) ||
    compareOptionalIsoDateDesc(
      firstValue.latestPlayedAt ?? firstValue.latestUpdatedAt ?? firstValue.updatedAt,
      secondValue.latestPlayedAt ?? secondValue.latestUpdatedAt ?? secondValue.updatedAt,
    ) ||
    compareOptionalNumberDesc(firstValue.sequenceNumber, secondValue.sequenceNumber) ||
    getStableTeamKey(firstValue).localeCompare(getStableTeamKey(secondValue))
  );
}

type PlayerPerformanceLike = {
  playerId?: string;
  pubgPlayerId?: string;
  id?: string;
  playerName?: string;
  name?: string;
  kills?: number;
  damage?: number;
  assists?: number;
  matches?: number;
  totalPoints?: number;
  rating?: number;
  mvpCount?: number;
  updatedAt?: string;
};

export function comparePlayerLeaderboardPerformance<T extends PlayerPerformanceLike>(firstValue: T, secondValue: T) {
  return (
    compareOptionalNumberDesc(firstValue.kills, secondValue.kills) ||
    compareOptionalNumberDesc(firstValue.damage, secondValue.damage) ||
    compareOptionalNumberDesc(firstValue.assists, secondValue.assists) ||
    compareOptionalNumberDesc(firstValue.matches, secondValue.matches) ||
    compareOptionalNumberDesc(firstValue.totalPoints ?? firstValue.rating, secondValue.totalPoints ?? secondValue.rating) ||
    compareOptionalIsoDateDesc(firstValue.updatedAt, secondValue.updatedAt) ||
    getStablePlayerKey(firstValue).localeCompare(getStablePlayerKey(secondValue))
  );
}

export function compareTopFraggerPerformance<T extends PlayerPerformanceLike>(firstValue: T, secondValue: T) {
  return (
    compareOptionalNumberDesc(firstValue.kills, secondValue.kills) ||
    compareOptionalNumberDesc(firstValue.damage, secondValue.damage) ||
    compareOptionalNumberDesc(firstValue.assists, secondValue.assists) ||
    compareOptionalNumberDesc(firstValue.matches, secondValue.matches) ||
    getStablePlayerKey(firstValue).localeCompare(getStablePlayerKey(secondValue))
  );
}

export function compareMvpRankingPlayers<T extends PlayerPerformanceLike>(firstValue: T, secondValue: T) {
  return (
    compareOptionalNumberDesc(firstValue.mvpCount, secondValue.mvpCount) ||
    compareTopFraggerPerformance(firstValue, secondValue) ||
    compareOptionalNumberDesc(firstValue.totalPoints ?? firstValue.rating, secondValue.totalPoints ?? secondValue.rating) ||
    getStablePlayerKey(firstValue).localeCompare(getStablePlayerKey(secondValue))
  );
}

export function compareMatchTeamResults<T extends TeamMatchResult>(firstValue: T, secondValue: T) {
  return (
    compareOptionalNumberAsc(firstValue.placement, secondValue.placement) ||
    compareOptionalNumberDesc(firstValue.kills, secondValue.kills) ||
    compareOptionalNumberDesc(firstValue.totalPoints, secondValue.totalPoints) ||
    compareOptionalNumberDesc(firstValue.placementPoints, secondValue.placementPoints) ||
    compareOptionalNumberDesc(firstValue.killPoints, secondValue.killPoints) ||
    getStableTeamKey(firstValue).localeCompare(getStableTeamKey(secondValue))
  );
}

export function compareMatchPlayerResults<T extends MatchPlayerResult>(firstValue: T, secondValue: T) {
  const eligibility = Number(Boolean(firstValue.disqualified)) - Number(Boolean(secondValue.disqualified));
  if (eligibility) return eligibility;
  if (firstValue.awardCriteria?.length && JSON.stringify(firstValue.awardCriteria) === JSON.stringify(secondValue.awardCriteria)) {
    for (const key of firstValue.awardCriteria) { const difference = compareOptionalNumberDesc(firstValue[key], secondValue[key]); if (difference) return difference; }
    return getStablePlayerKey(firstValue).localeCompare(getStablePlayerKey(secondValue));
  }
  return (
    compareOptionalNumberDesc(firstValue.totalPoints, secondValue.totalPoints) ||
    compareOptionalNumberDesc(firstValue.kills, secondValue.kills) ||
    compareOptionalNumberDesc(firstValue.damage, secondValue.damage) ||
    compareOptionalNumberDesc(firstValue.assists, secondValue.assists) ||
    firstValue.playerName.localeCompare(secondValue.playerName) ||
    getStablePlayerKey(firstValue).localeCompare(getStablePlayerKey(secondValue))
  );
}

export function compareMatchSequenceOrder<T extends Pick<TournamentMatch, "id" | "sequenceNumber" | "playedAt" | "syncedAt">>(
  firstValue: T,
  secondValue: T,
) {
  return (
    compareOptionalNumberAsc(firstValue.sequenceNumber, secondValue.sequenceNumber) ||
    (firstValue.playedAt ?? "").localeCompare(secondValue.playedAt ?? "") ||
    (firstValue.syncedAt ?? "").localeCompare(secondValue.syncedAt ?? "") ||
    firstValue.id.localeCompare(secondValue.id)
  );
}

export function sortMvpRanking(players: Player[]) {
  return [...players].sort((firstPlayer, secondPlayer) => compareMvpRankingPlayers(firstPlayer, secondPlayer));
}

export function sortTournamentStandings(standings: TournamentStanding[]) {
  return [...standings].sort((firstStanding, secondStanding) => compareTeamLeaderboardPerformance(firstStanding, secondStanding));
}

export function sortScrimDayStandings(standings: ScrimDayStanding[]) {
  return [...standings].sort((firstStanding, secondStanding) => compareTeamLeaderboardPerformance(firstStanding, secondStanding));
}
