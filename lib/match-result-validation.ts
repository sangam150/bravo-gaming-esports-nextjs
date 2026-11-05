import type { MatchPlayerResult, TeamMatchResult } from "./types";

export class MatchResultValidationError extends Error {}

/** Publication requires complete placements; empty drafts remain valid. */
export function validateMatchResultsForPublication(teams: TeamMatchResult[], players: MatchPlayerResult[]) {
  const invalid = (message: string): never => {
    throw new MatchResultValidationError(`Invalid match results: ${message}`);
  };
  if (!teams.length || teams.length > 64) invalid("publish between 1 and 64 team results.");
  const teamKeys = new Set<string>();
  const placements = new Set<number>();
  for (const team of teams) {
    const key = team.teamId?.trim() || team.teamName.trim().toLowerCase();
    if (!key || teamKeys.has(key)) invalid("team identities must be present and unique.");
    teamKeys.add(key);
    if (!Number.isSafeInteger(team.placement) || team.placement < 1 || team.placement > 64 || placements.has(team.placement))
      invalid("placements must be unique integers from 1 to 64.");
    placements.add(team.placement);
    if (!Number.isSafeInteger(team.kills) || team.kills < 0 || !Number.isFinite(team.damage) || team.damage < 0)
      invalid("team kills and damage must be nonnegative; kills must be whole numbers.");
  }
  if (!placements.has(1)) invalid("a first-place team is required before publishing.");
  const playerKeys = new Set<string>();
  if (players.length > 256) invalid("a match can contain at most 256 players.");
  for (const player of players) {
    const key = player.pubgPlayerId?.trim() || player.playerId?.trim();
    if (!key || playerKeys.has(key)) invalid("player identities must be present and unique.");
    playerKeys.add(key);
    for (const value of [player.kills, player.assists, player.knocks])
      if (!Number.isSafeInteger(value) || value < 0) invalid("player kill, assist and knock counts must be nonnegative whole numbers.");
    for (const value of [player.damage, player.survivalTime])
      if (!Number.isFinite(value) || value < 0) invalid("player damage and survival time must be nonnegative.");
    const relatedTeam = teams.find((team) =>
      player.teamId && team.teamId
        ? player.teamId === team.teamId
        : player.teamName.trim().toLowerCase() === team.teamName.trim().toLowerCase(),
    );
    if (!relatedTeam || player.placement !== relatedTeam.placement)
      invalid("every player must belong to a listed team with the same placement.");
  }
}
