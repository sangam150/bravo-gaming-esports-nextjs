export const TEAM_TIE_BREAKS = [
  "killPoints",
  "kills",
  "wins",
  "placementPoints",
  "bestPlacement",
  "latestPlacement",
  "latestKills",
] as const;
export const AWARD_CRITERIA = ["kills", "damage", "assists", "knocks", "survivalTime"] as const;
export type TeamTieBreak = (typeof TEAM_TIE_BREAKS)[number];
export type AwardMetric = (typeof AWARD_CRITERIA)[number];
export type ScoringRules = { version: 2; tieBreakers: TeamTieBreak[]; awardCriteria: AwardMetric[] };
export const DEFAULT_SCORING_RULES: ScoringRules = {
  version: 2,
  tieBreakers: ["killPoints", "kills", "wins", "placementPoints", "bestPlacement"],
  awardCriteria: ["kills", "damage", "assists"],
};
export function parseScoringRules(value: unknown): ScoringRules {
  const row = value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
  const sequence = <T extends string>(key: string, choices: readonly T[], fallback: T[]): T[] => {
    const items = row[key] ?? fallback;
    if (
      !Array.isArray(items) ||
      !items.length ||
      items.length > choices.length ||
      items.some((item) => !choices.includes(item)) ||
      new Set(items).size !== items.length
    )
      throw new Error(`Invalid scoring ${key} sequence.`);
    return [...items] as T[];
  };
  return {
    version: 2,
    tieBreakers: sequence("tieBreakers", TEAM_TIE_BREAKS, DEFAULT_SCORING_RULES.tieBreakers),
    awardCriteria: sequence("awardCriteria", AWARD_CRITERIA, DEFAULT_SCORING_RULES.awardCriteria),
  };
}
export function readSavedScoringRules(value: unknown): ScoringRules | undefined {
  if (!value || typeof value !== "object" || !("version" in value) || value.version !== 2) return undefined;
  return parseScoringRules(value);
}
export type ScoringDecision = { adjustmentPoints?: number; decisionReason?: string; disqualified?: boolean };
export function parseScoringDecision(value: unknown): Required<ScoringDecision> {
  const row = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const adjustmentPoints = row.adjustmentPoints ?? 0;
  const decisionReason = row.decisionReason ?? "";
  const disqualified = row.disqualified ?? false;
  if (
    typeof adjustmentPoints !== "number" ||
    !Number.isFinite(adjustmentPoints) ||
    Math.abs(adjustmentPoints) > 1000 ||
    Math.abs(adjustmentPoints * 100 - Math.round(adjustmentPoints * 100)) > 0.000001
  )
    throw new Error("Invalid match results: adjustments must be within ±1000 points with at most two decimals.");
  if (typeof decisionReason !== "string" || decisionReason.length > 500 || typeof disqualified !== "boolean")
    throw new Error("Invalid match results: invalid scoring decision.");
  if ((adjustmentPoints !== 0 || disqualified) && !decisionReason.trim())
    throw new Error("Invalid match results: a public ruling reason is required for every adjustment or disqualification.");
  if (disqualified && adjustmentPoints !== 0)
    throw new Error("Invalid match results: disqualified teams receive zero points; do not combine DQ with an adjustment.");
  return { adjustmentPoints, decisionReason: decisionReason.trim(), disqualified };
}
export function hasScoringDecisions(teams: ScoringDecision[] = []) {
  return teams.some((team) => Boolean(team.disqualified || team.adjustmentPoints));
}
