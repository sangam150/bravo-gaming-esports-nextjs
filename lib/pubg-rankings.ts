import type { PubgHubMatch, PubgHubPlayer, PubgHubRecentMatch, PubgHubTeam } from "./pubg-hub";

type TeamRankShape = {
  id: string;
  name: string;
  totalPoints: number;
  kills: number;
  wins: number;
  placementPoints: number;
  avgPlacement: number;
  slotNumber?: number | null;
};

type PlayerRankShape = {
  id: string;
  pubgName: string;
  kills: number;
  damage: number;
  knocks: number;
  assists: number;
  avgKills: number;
};

export interface PubgTeamBoardRow extends TeamRankShape {
  rank: number;
  teamId: string;
  slug: string;
  tag?: string | null;
  logoUrl?: string | null;
  matches: number;
  damage: number;
  killPoints: number;
  trend: number[];
}

export interface PubgPlayerBoardRow extends PlayerRankShape {
  rank: number;
  playerId: string;
  slug: string;
  avatarUrl?: string | null;
  teamId?: string | null;
  teamName?: string | null;
  matches: number;
  wins: number;
  avgDamage: number;
  trend: number[];
  bestMatch?: PubgHubRecentMatch | null;
}

export function comparePubgTeams<T extends TeamRankShape>(firstValue: T, secondValue: T) {
  return (
    secondValue.totalPoints - firstValue.totalPoints ||
    secondValue.kills - firstValue.kills ||
    secondValue.wins - firstValue.wins ||
    secondValue.placementPoints - firstValue.placementPoints ||
    firstValue.avgPlacement - secondValue.avgPlacement ||
    (firstValue.slotNumber ?? Number.MAX_SAFE_INTEGER) - (secondValue.slotNumber ?? Number.MAX_SAFE_INTEGER) ||
    firstValue.name.localeCompare(secondValue.name) ||
    firstValue.id.localeCompare(secondValue.id)
  );
}

export function comparePubgPlayers<T extends PlayerRankShape>(firstValue: T, secondValue: T) {
  return (
    secondValue.kills - firstValue.kills ||
    secondValue.damage - firstValue.damage ||
    secondValue.knocks - firstValue.knocks ||
    secondValue.assists - firstValue.assists ||
    secondValue.avgKills - firstValue.avgKills ||
    firstValue.pubgName.localeCompare(secondValue.pubgName) ||
    firstValue.id.localeCompare(secondValue.id)
  );
}

export function getRankedTeams<T extends TeamRankShape>(teams: readonly T[]) {
  return [...teams].sort(comparePubgTeams);
}

export function getRankedPlayers<T extends PlayerRankShape>(players: readonly T[]) {
  return [...players].sort(comparePubgPlayers);
}

export function getTeamRankMap(teams: readonly TeamRankShape[]) {
  return new Map(getRankedTeams(teams).map((team, index) => [team.id, index + 1] as const));
}

export function getPlayerRankMap(players: readonly PlayerRankShape[]) {
  return new Map(getRankedPlayers(players).map((player, index) => [player.id, index + 1] as const));
}

export function buildPubgTeamBoardRows(matches: readonly PubgHubMatch[], teamLookup: Map<string, PubgHubTeam>) {
  const orderedMatches = [...matches].sort((firstValue, secondValue) => firstValue.startTime.localeCompare(secondValue.startTime));
  const summary = new Map<
    string,
    {
      teamId: string;
      matches: number;
      wins: number;
      kills: number;
      damage: number;
      placementPoints: number;
      killPoints: number;
      totalPoints: number;
      totalPlacement: number;
      trend: number[];
    }
  >();

  for (const match of orderedMatches) {
    const damageByTeamId = new Map<string, number>();

    for (const playerResult of match.playerResults) {
      damageByTeamId.set(playerResult.teamId, (damageByTeamId.get(playerResult.teamId) ?? 0) + playerResult.damage);
    }

    for (const teamResult of match.teamResults) {
      const currentValue = summary.get(teamResult.teamId) ?? {
        teamId: teamResult.teamId,
        matches: 0,
        wins: 0,
        kills: 0,
        damage: 0,
        placementPoints: 0,
        killPoints: 0,
        totalPoints: 0,
        totalPlacement: 0,
        trend: [],
      };

      currentValue.matches += 1;
      currentValue.wins += teamResult.wwcd ? 1 : 0;
      currentValue.kills += teamResult.kills;
      currentValue.damage += damageByTeamId.get(teamResult.teamId) ?? 0;
      currentValue.placementPoints += teamResult.placementPoints;
      currentValue.killPoints += teamResult.killPoints;
      currentValue.totalPoints += teamResult.totalPoints;
      currentValue.totalPlacement += teamResult.placement;
      currentValue.trend.push(teamResult.totalPoints);

      summary.set(teamResult.teamId, currentValue);
    }
  }

  return getRankedTeams(
    Array.from(summary.values()).map((row) => {
      const team = teamLookup.get(row.teamId);

      return {
        rank: 0,
        id: row.teamId,
        teamId: row.teamId,
        slug: team?.slug ?? row.teamId,
        name: team?.name ?? row.teamId,
        tag: team?.tag ?? null,
        logoUrl: team?.logoUrl ?? null,
        slotNumber: team?.slotNumber ?? null,
        matches: row.matches,
        wins: row.wins,
        kills: row.kills,
        damage: row.damage,
        placementPoints: row.placementPoints,
        killPoints: row.killPoints,
        totalPoints: row.totalPoints,
        avgPlacement: Number((row.totalPlacement / Math.max(row.matches, 1)).toFixed(2)),
        trend: row.trend.slice(-6),
      } satisfies PubgTeamBoardRow;
    })
  ).map((row, index) => ({
    ...row,
    rank: index + 1,
  }));
}

export function buildPubgPlayerBoardRows(matches: readonly PubgHubMatch[], playerLookup: Map<string, PubgHubPlayer>) {
  const orderedMatches = [...matches].sort((firstValue, secondValue) => firstValue.startTime.localeCompare(secondValue.startTime));
  const summary = new Map<
    string,
    {
      playerId: string;
      matches: number;
      wins: number;
      kills: number;
      assists: number;
      knocks: number;
      damage: number;
      trend: number[];
      bestMatch?: PubgHubRecentMatch | null;
    }
  >();

  for (const match of orderedMatches) {
    const teamResultById = new Map(match.teamResults.map((teamResult) => [teamResult.teamId, teamResult] as const));
    const winningTeamId = match.winnerTeamId;

    for (const playerResult of match.playerResults) {
      const teamResult = teamResultById.get(playerResult.teamId);
      const currentValue = summary.get(playerResult.playerId) ?? {
        playerId: playerResult.playerId,
        matches: 0,
        wins: 0,
        kills: 0,
        assists: 0,
        knocks: 0,
        damage: 0,
        trend: [],
        bestMatch: null,
      };

      currentValue.matches += 1;
      currentValue.wins += playerResult.teamId === winningTeamId ? 1 : 0;
      currentValue.kills += playerResult.kills;
      currentValue.assists += playerResult.assists;
      currentValue.knocks += playerResult.knocks;
      currentValue.damage += playerResult.damage;
      currentValue.trend.push(playerResult.kills);

      const candidateBestMatch = {
        matchId: match.id,
        eventId: match.eventId,
        eventSlug: match.eventSlug,
        eventName: match.eventName,
        matchNumber: match.matchNumber,
        mapName: match.mapName,
        startTime: match.startTime,
        placement: teamResult?.placement ?? 0,
        kills: playerResult.kills,
        totalPoints: teamResult?.totalPoints ?? 0,
        wwcd: teamResult?.wwcd ?? false,
        damage: playerResult.damage,
        assists: playerResult.assists,
        knocks: playerResult.knocks,
        teamId: playerResult.teamId,
        teamName: playerResult.teamName,
        playerId: playerResult.playerId,
        playerName: playerResult.pubgName,
        vodUrl: match.vodUrl ?? null,
      } satisfies PubgHubRecentMatch;

      if (
        !currentValue.bestMatch ||
        candidateBestMatch.kills > currentValue.bestMatch.kills ||
        (candidateBestMatch.kills === currentValue.bestMatch.kills &&
          (candidateBestMatch.damage ?? 0) > (currentValue.bestMatch.damage ?? 0)) ||
        (candidateBestMatch.kills === currentValue.bestMatch.kills &&
          (candidateBestMatch.damage ?? 0) === (currentValue.bestMatch.damage ?? 0) &&
          (candidateBestMatch.assists ?? 0) > (currentValue.bestMatch.assists ?? 0))
      ) {
        currentValue.bestMatch = candidateBestMatch;
      }

      summary.set(playerResult.playerId, currentValue);
    }
  }

  return getRankedPlayers(
    Array.from(summary.values()).map((row) => {
      const player = playerLookup.get(row.playerId);

      return {
        rank: 0,
        id: row.playerId,
        playerId: row.playerId,
        slug: player?.slug ?? row.playerId,
        pubgName: player?.pubgName ?? row.playerId,
        avatarUrl: player?.avatarUrl ?? null,
        teamId: player?.currentTeamId ?? null,
        teamName: player?.currentTeamName ?? null,
        matches: row.matches,
        wins: row.wins,
        kills: row.kills,
        assists: row.assists,
        knocks: row.knocks,
        damage: row.damage,
        avgKills: Number((row.kills / Math.max(row.matches, 1)).toFixed(2)),
        avgDamage: Number((row.damage / Math.max(row.matches, 1)).toFixed(2)),
        trend: row.trend.slice(-6),
        bestMatch: row.bestMatch ?? null,
      } satisfies PubgPlayerBoardRow;
    })
  ).map((row, index) => ({
    ...row,
    rank: index + 1,
  }));
}
