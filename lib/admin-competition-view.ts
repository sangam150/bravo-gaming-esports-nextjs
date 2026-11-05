import type { TournamentMatch } from "./types";
import { compareTeamLeaderboardPerformance } from "./ranking-sort";

export function competitionMatches(matches: TournamentMatch[], tournamentId: string) {
  return matches
    .filter((match) => match.tournamentId === tournamentId && !match.deletedAt)
    .sort((a, b) => (a.matchNumber ?? a.sequenceNumber ?? 0) - (b.matchNumber ?? b.sequenceNumber ?? 0));
}
export function competitionStandings(matches: TournamentMatch[]) {
  const rows = new Map<
    string,
    {
      id: string;
      name: string;
      matches: number;
      wins: number;
      kills: number;
      placementPoints: number;
      killPoints: number;
      totalPoints: number;
    }
  >();
  for (const match of matches.filter((match) => match.status === "published" && !match.deletedAt)) {
    for (const result of match.teamResults ?? []) {
      const id = result.teamId || result.teamName;
      const row = rows.get(id) ?? {
        id,
        name: result.teamName,
        matches: 0,
        wins: 0,
        kills: 0,
        placementPoints: 0,
        killPoints: 0,
        totalPoints: 0,
      };
      row.matches++;
      row.wins += result.placement === 1 ? 1 : 0;
      row.kills += result.kills;
      row.placementPoints += result.placementPoints;
      row.killPoints += result.killPoints;
      row.totalPoints += result.totalPoints;
      rows.set(id, row);
    }
  }
  return [...rows.values()].sort(compareTeamLeaderboardPerformance);
}
