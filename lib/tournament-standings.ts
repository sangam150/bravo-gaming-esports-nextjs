import { placementPoints, totalPoints } from "./pubg";
import { compareBravoTeamSlotOrder, resolveBravoTeamIdentity } from "./bravo-teams";
import type { LeaderboardRow, TeamMatchResult, TournamentMatch, TournamentStanding } from "./types";

const MAP_NAME_LOOKUP: Record<string, string> = {
  Baltic_Main: "Erangel",
  Desert_Main: "Miramar",
  Tiger_Main: "Taego",
  Neon_Main: "Rondo",
};

export function normalizeMapName(value?: string) {
  if (!value) return "Unknown";
  return MAP_NAME_LOOKUP[value] ?? value.replace(/_/g, " ");
}

export function toTeamMatchResults(
  results: Array<{
    teamId?: string | null;
    teamName: string;
    slotNumber?: number;
    placement: number;
    kills: number;
  }>
): TeamMatchResult[] {
  return [...results]
    .map((result) => {
      const normalizedPlacementPoints = placementPoints(result.placement);
      const normalizedKillPoints = result.kills;

      return {
        teamId: result.teamId ?? undefined,
        teamName: result.teamName,
        slotNumber: result.slotNumber ?? resolveBravoTeamIdentity(result.teamName)?.slotNumber,
        placement: result.placement,
        kills: result.kills,
        damage: 0,
        placementPoints: normalizedPlacementPoints,
        killPoints: normalizedKillPoints,
        totalPoints: totalPoints(result.placement, result.kills),
      } satisfies TeamMatchResult;
    })
    .sort(
      (firstResult, secondResult) =>
        firstResult.placement - secondResult.placement ||
        secondResult.kills - firstResult.kills ||
        firstResult.teamName.localeCompare(secondResult.teamName)
    );
}

export function buildTournamentStandings(
  tournamentId: string,
  tournamentTitle: string,
  matches: TournamentMatch[]
): TournamentStanding[] {
  const standingsMap = new Map<
    string,
    Omit<TournamentStanding, "rank"> & {
      placementTotal: number;
    }
  >();

  for (const match of matches) {
    for (const result of match.teamResults ?? []) {
      const teamKey = result.teamId ?? result.teamName.toLowerCase();
      const standing = standingsMap.get(teamKey) ?? {
        id: teamKey,
        tournamentId,
        teamId: result.teamId ?? teamKey,
        teamName: result.teamName,
        slotNumber: result.slotNumber ?? resolveBravoTeamIdentity(result.teamName)?.slotNumber,
        matches: 0,
        wins: 0,
        kills: 0,
        killPoints: 0,
        placementPoints: 0,
        totalPoints: 0,
        bestPlacement: Number.POSITIVE_INFINITY,
        averagePlacement: 0,
        placementTotal: 0,
        sourceTournamentId: tournamentId,
        sourceTournamentTitle: tournamentTitle,
        sourceProvider: "bravo_feed",
      };

      standing.matches += 1;
      standing.wins += result.placement === 1 ? 1 : 0;
      standing.kills += result.kills;
      standing.killPoints += result.killPoints ?? result.kills;
      standing.placementPoints += result.placementPoints ?? placementPoints(result.placement);
      standing.totalPoints += result.totalPoints ?? totalPoints(result.placement, result.kills);
      standing.bestPlacement = Math.min(standing.bestPlacement, result.placement);
      standing.placementTotal += result.placement;

      standingsMap.set(teamKey, standing);
    }
  }

  return Array.from(standingsMap.values())
    .map(({ placementTotal, ...standing }) => ({
      ...standing,
      averagePlacement: Number((placementTotal / Math.max(standing.matches, 1)).toFixed(2)),
      bestPlacement: Number.isFinite(standing.bestPlacement) ? standing.bestPlacement : 0,
      rank: 0,
    }))
    .sort(
      (firstStanding, secondStanding) =>
        secondStanding.totalPoints - firstStanding.totalPoints ||
        secondStanding.placementPoints - firstStanding.placementPoints ||
        secondStanding.kills - firstStanding.kills ||
        firstStanding.bestPlacement - secondStanding.bestPlacement ||
        compareBravoTeamSlotOrder(
          { slotNumber: firstStanding.slotNumber, teamName: firstStanding.teamName },
          { slotNumber: secondStanding.slotNumber, teamName: secondStanding.teamName }
        )
    )
    .map((standing, index) => ({
      ...standing,
      rank: index + 1,
    }));
}

export function standingsToLeaderboardRows(standings: TournamentStanding[]): LeaderboardRow[] {
  return standings.map((standing) => ({
    rank: standing.rank,
    teamId: standing.teamId,
    team: standing.teamName,
    slotNumber: standing.slotNumber,
    matches: standing.matches,
    kills: standing.kills,
    placement: standing.placementPoints,
    points: standing.totalPoints,
  }));
}
