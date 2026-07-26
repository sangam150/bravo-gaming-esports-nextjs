import type { TournamentMatch } from "./types";

export interface PlayerTeamAppearanceSummary {
  teamId?: string;
  teamName?: string;
  slotNumber?: number;
  matches: number;
  latestPlayedAt?: string;
  latestSequence?: number;
}

function compareAppearanceRecency(
  firstAppearance: Pick<PlayerTeamAppearanceSummary, "latestSequence" | "latestPlayedAt">,
  secondAppearance: Pick<PlayerTeamAppearanceSummary, "latestSequence" | "latestPlayedAt">,
) {
  return (
    (secondAppearance.latestSequence ?? Number.NEGATIVE_INFINITY) - (firstAppearance.latestSequence ?? Number.NEGATIVE_INFINITY) ||
    (secondAppearance.latestPlayedAt ?? "").localeCompare(firstAppearance.latestPlayedAt ?? "")
  );
}

export function choosePreferredPlayerTeam(appearances: PlayerTeamAppearanceSummary[]): PlayerTeamAppearanceSummary | null {
  if (appearances.length === 0) return null;

  return (
    [...appearances].sort(
      (firstAppearance, secondAppearance) =>
        secondAppearance.matches - firstAppearance.matches ||
        compareAppearanceRecency(firstAppearance, secondAppearance) ||
        (firstAppearance.teamName ?? "").localeCompare(secondAppearance.teamName ?? ""),
    )[0] ?? null
  );
}

export function buildPlayerAppearanceMapFromMatches(matches: TournamentMatch[]) {
  const appearanceMap = new Map<string, Map<string, PlayerTeamAppearanceSummary>>();

  for (const match of matches) {
    for (const playerResult of match.playerResults ?? []) {
      const playerKey = playerResult.pubgPlayerId ?? playerResult.playerId ?? playerResult.playerName;
      const teamKey = playerResult.teamId ?? playerResult.teamName.toLowerCase();
      const playerAppearances = appearanceMap.get(playerKey) ?? new Map<string, PlayerTeamAppearanceSummary>();
      const currentAppearance = playerAppearances.get(teamKey) ?? {
        teamId: playerResult.teamId,
        teamName: playerResult.teamName,
        slotNumber: playerResult.slotNumber,
        matches: 0,
        latestPlayedAt: match.playedAt,
        latestSequence: match.sequenceNumber,
      };

      currentAppearance.matches += 1;
      currentAppearance.teamId = playerResult.teamId ?? currentAppearance.teamId;
      currentAppearance.teamName = playerResult.teamName ?? currentAppearance.teamName;
      currentAppearance.slotNumber = playerResult.slotNumber ?? currentAppearance.slotNumber;

      const isNewerMatch =
        (match.sequenceNumber ?? Number.NEGATIVE_INFINITY) >= (currentAppearance.latestSequence ?? Number.NEGATIVE_INFINITY) ||
        (match.playedAt ?? "").localeCompare(currentAppearance.latestPlayedAt ?? "") >= 0;
      if (isNewerMatch) {
        currentAppearance.latestPlayedAt = match.playedAt ?? currentAppearance.latestPlayedAt;
        currentAppearance.latestSequence = match.sequenceNumber ?? currentAppearance.latestSequence;
      }

      playerAppearances.set(teamKey, currentAppearance);
      appearanceMap.set(playerKey, playerAppearances);
    }
  }

  return appearanceMap;
}
