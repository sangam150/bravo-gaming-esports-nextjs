import { choosePreferredPlayerTeam } from "./player-team-history";
import type { MatchPlayerRecord, Player } from "./types";

export function sortMatchPlayersByPlayedAtDesc(matchPlayers: MatchPlayerRecord[]) {
  return [...matchPlayers].sort(
    (firstMatchPlayer, secondMatchPlayer) =>
      (secondMatchPlayer.playedAt ?? "").localeCompare(firstMatchPlayer.playedAt ?? "") ||
      secondMatchPlayer.matchId.localeCompare(firstMatchPlayer.matchId)
  );
}

export function buildPlayerTeamHistory(matchPlayers: MatchPlayerRecord[]) {
  const groupedTeams = new Map<
    string,
    {
      teamId?: string;
      teamName: string;
      slotNumber?: number;
      matches: number;
      kills: number;
      damage: number;
      assists: number;
      latestPlayedAt?: string;
    }
  >();

  for (const matchPlayer of matchPlayers) {
    const teamKey = matchPlayer.teamId ?? matchPlayer.teamName.toLowerCase();
    const currentTeam = groupedTeams.get(teamKey) ?? {
      teamId: matchPlayer.teamId,
      teamName: matchPlayer.teamName,
      slotNumber: matchPlayer.slotNumber,
      matches: 0,
      kills: 0,
      damage: 0,
      assists: 0,
      latestPlayedAt: matchPlayer.playedAt,
    };

    currentTeam.matches += 1;
    currentTeam.kills += matchPlayer.kills;
    currentTeam.damage += matchPlayer.damage;
    currentTeam.assists += matchPlayer.assists;
    if ((matchPlayer.playedAt ?? "").localeCompare(currentTeam.latestPlayedAt ?? "") >= 0) {
      currentTeam.latestPlayedAt = matchPlayer.playedAt;
      currentTeam.slotNumber = matchPlayer.slotNumber ?? currentTeam.slotNumber;
    }

    groupedTeams.set(teamKey, currentTeam);
  }

  return Array.from(groupedTeams.values()).sort(
    (firstTeam, secondTeam) =>
      secondTeam.matches - firstTeam.matches ||
      (secondTeam.latestPlayedAt ?? "").localeCompare(firstTeam.latestPlayedAt ?? "") ||
      firstTeam.teamName.localeCompare(secondTeam.teamName)
  );
}

export function buildPlayerPreferredTeam(matchPlayers: MatchPlayerRecord[]) {
  return choosePreferredPlayerTeam(
    buildPlayerTeamHistory(matchPlayers).map((teamHistory, index) => ({
      teamId: teamHistory.teamId,
      teamName: teamHistory.teamName,
      slotNumber: teamHistory.slotNumber,
      matches: teamHistory.matches,
      latestPlayedAt: teamHistory.latestPlayedAt,
      latestSequence: matchPlayers.length - index,
    }))
  );
}

export function buildTeamRosterHistory(matchPlayers: MatchPlayerRecord[], currentRoster: Player[]) {
  const currentRosterIds = new Set(
    currentRoster.map((player) => player.pubgId ?? player.sourcePlayerId ?? player.inGameName ?? player.name)
  );
  const groupedPlayers = new Map<
    string,
    {
      sourcePlayerId: string;
      playerName: string;
      matches: number;
      kills: number;
      damage: number;
      assists: number;
      latestPlayedAt?: string;
    }
  >();

  for (const matchPlayer of matchPlayers) {
    const playerKey = matchPlayer.sourcePlayerId;
    const currentPlayer = groupedPlayers.get(playerKey) ?? {
      sourcePlayerId: playerKey,
      playerName: matchPlayer.playerName,
      matches: 0,
      kills: 0,
      damage: 0,
      assists: 0,
      latestPlayedAt: matchPlayer.playedAt,
    };

    currentPlayer.matches += 1;
    currentPlayer.kills += matchPlayer.kills;
    currentPlayer.damage += matchPlayer.damage;
    currentPlayer.assists += matchPlayer.assists;
    if ((matchPlayer.playedAt ?? "").localeCompare(currentPlayer.latestPlayedAt ?? "") >= 0) {
      currentPlayer.latestPlayedAt = matchPlayer.playedAt;
      currentPlayer.playerName = matchPlayer.playerName;
    }

    groupedPlayers.set(playerKey, currentPlayer);
  }

  return Array.from(groupedPlayers.values())
    .filter((player) => !currentRosterIds.has(player.sourcePlayerId))
    .sort(
      (firstPlayer, secondPlayer) =>
        (secondPlayer.latestPlayedAt ?? "").localeCompare(firstPlayer.latestPlayedAt ?? "") ||
        secondPlayer.matches - firstPlayer.matches ||
        firstPlayer.playerName.localeCompare(secondPlayer.playerName)
    );
}

export function buildUniqueMatchCount(matchPlayers: MatchPlayerRecord[]) {
  return new Set(matchPlayers.map((matchPlayer) => matchPlayer.matchId)).size;
}
