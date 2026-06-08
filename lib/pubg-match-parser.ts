import { placementPoints, totalPoints } from "./pubg";
import type { TeamMatchResult } from "./types";

export interface ParsedPlayerStat {
  playerName: string;
  playerId: string;
  rosterId: string;
  teamName: string;
  kills: number;
  damage: number;
  placement: number;
  survivalTime: number;
}

export function parseMatchParticipants(matchData: unknown): ParsedPlayerStat[] {
  const data = matchData as {
    included?: Array<{
      type: string;
      id: string;
      attributes?: Record<string, unknown>;
      relationships?: { roster?: { data?: { id: string } } };
    }>;
  };

  const included = data.included ?? [];
  const rosters = new Map<string, { teamName: string; placement: number }>();

  for (const item of included) {
    if (item.type === "roster") {
      const stats = item.attributes?.stats as { rank?: number } | undefined;
      const team = item.attributes?.teamId as string | undefined;
      rosters.set(item.id, {
        teamName: team || `Team ${item.id.slice(0, 4)}`,
        placement: stats?.rank ?? 99,
      });
    }
  }

  const players: ParsedPlayerStat[] = [];

  for (const item of included) {
    if (item.type !== "participant") continue;
    const attrs = item.attributes ?? {};
    const stats = (attrs.stats as Record<string, number>) ?? {};
    const rosterId = item.relationships?.roster?.data?.id ?? "";
    const roster = rosters.get(rosterId);
    const name = (attrs.name as string) || (attrs.stats as { name?: string })?.name || "Unknown";

    players.push({
      playerName: name,
      playerId: item.id,
      rosterId,
      teamName: roster?.teamName ?? "Unknown",
      kills: stats.kills ?? 0,
      damage: Math.round(stats.damageDealt ?? 0),
      placement: roster?.placement ?? stats.winPlace ?? 99,
      survivalTime: stats.timeSurvived ?? 0,
    });
  }

  return players;
}

export function aggregateTeamResults(players: ParsedPlayerStat[]): TeamMatchResult[] {
  const teamMap = new Map<string, TeamMatchResult & { damage: number }>();

  for (const p of players) {
    const key = p.teamName;
    const existing = teamMap.get(key) ?? {
      teamName: p.teamName,
      placement: p.placement,
      kills: 0,
      damage: 0,
      placementPoints: 0,
      killPoints: 0,
      totalPoints: 0,
    };
    existing.kills += p.kills;
    existing.damage += p.damage;
    existing.placement = Math.min(existing.placement, p.placement);
    teamMap.set(key, existing);
  }

  return Array.from(teamMap.values())
    .map((t) => {
      const pp = placementPoints(t.placement);
      const kp = t.kills;
      return {
        teamName: t.teamName,
        placement: t.placement,
        kills: t.kills,
        damage: t.damage,
        placementPoints: pp,
        killPoints: kp,
        totalPoints: totalPoints(t.placement, t.kills),
      };
    })
    .sort((a, b) => a.placement - b.placement);
}
