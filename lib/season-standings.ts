import type { LeaderboardRow, Team, TournamentStanding } from "./types";
import { compareBravoTeamSlotOrder } from "./bravo-teams";

export interface SeasonLeaderboardEntry {
  teamId: string;
  teamName: string;
  matches: number;
  kills: number;
  killPoints: number;
  placementPoints: number;
  totalPoints: number;
  averagePlacement: number;
  chickenDinners: number;
  bestPlacement: number;
  dayNumbers: number[];
  rank: number;
  slotNumber?: number;
  logoUrl?: string;
}

export function buildSeasonLeaderboard(
  standings: TournamentStanding[],
  teamsById?: Map<string, Team>
): SeasonLeaderboardEntry[] {
  const leaderboardMap = new Map<
    string,
    Omit<SeasonLeaderboardEntry, "rank" | "averagePlacement"> & {
      placementTotal: number;
    }
  >();

  for (const standing of standings) {
    const teamKey = standing.teamId || standing.teamName.toLowerCase();
    const existingRow = leaderboardMap.get(teamKey) ?? {
      teamId: standing.teamId,
      teamName: standing.teamName,
      matches: 0,
      kills: 0,
      killPoints: 0,
      placementPoints: 0,
      totalPoints: 0,
      chickenDinners: 0,
      bestPlacement: Number.POSITIVE_INFINITY,
      dayNumbers: [],
      placementTotal: 0,
      logoUrl: teamsById?.get(standing.teamId)?.logoUrl ?? teamsById?.get(standing.teamId)?.logo,
      slotNumber: teamsById?.get(standing.teamId)?.slotNumber,
    };

    existingRow.matches += standing.matches;
    existingRow.kills += standing.kills;
    existingRow.killPoints += standing.killPoints;
    existingRow.placementPoints += standing.placementPoints;
    existingRow.totalPoints += standing.totalPoints;
    existingRow.chickenDinners += standing.wins;
    existingRow.bestPlacement = Math.min(existingRow.bestPlacement, standing.bestPlacement);
    existingRow.placementTotal += standing.averagePlacement * standing.matches;
    if (typeof standing.seasonDayNumber === "number" && !existingRow.dayNumbers.includes(standing.seasonDayNumber)) {
      existingRow.dayNumbers.push(standing.seasonDayNumber);
    }

    leaderboardMap.set(teamKey, existingRow);
  }

  return Array.from(leaderboardMap.values())
    .map(({ placementTotal, ...entry }) => ({
      ...entry,
      dayNumbers: entry.dayNumbers.sort((firstDay, secondDay) => firstDay - secondDay),
      averagePlacement: Number((placementTotal / Math.max(entry.matches, 1)).toFixed(2)),
      bestPlacement: Number.isFinite(entry.bestPlacement) ? entry.bestPlacement : 0,
      rank: 0,
    }))
    .sort(
      (firstEntry, secondEntry) =>
        secondEntry.totalPoints - firstEntry.totalPoints ||
        secondEntry.placementPoints - firstEntry.placementPoints ||
        secondEntry.kills - firstEntry.kills ||
        firstEntry.averagePlacement - secondEntry.averagePlacement ||
        compareBravoTeamSlotOrder(
          { slotNumber: firstEntry.slotNumber, teamName: firstEntry.teamName },
          { slotNumber: secondEntry.slotNumber, teamName: secondEntry.teamName }
        )
    )
    .map((entry, index) => ({
      ...entry,
      rank: index + 1,
    }));
}

export function seasonLeaderboardToRows(entries: SeasonLeaderboardEntry[]): LeaderboardRow[] {
  return entries.map((entry) => ({
    rank: entry.rank,
    teamId: entry.teamId,
    team: entry.teamName,
    slotNumber: entry.slotNumber,
    matches: entry.matches,
    kills: entry.kills,
    killPoints: entry.killPoints,
    placement: entry.placementPoints,
    points: entry.totalPoints,
    averagePlacement: entry.averagePlacement,
    chickenDinners: entry.chickenDinners,
    logoUrl: entry.logoUrl,
    scope: "season",
  }));
}
