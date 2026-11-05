import { parseScoringRules } from "./scoring-rules";
export function parsePointSystemInput(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("A scoring configuration is required.");
  const row = value as Record<string, unknown>;
  if (typeof row.name !== "string" || !row.name.trim() || row.name.trim().length > 100)
    throw new Error("A scoring name of 1–100 characters is required.");
  const validPoints = (points: unknown): points is number =>
    typeof points === "number" &&
    Number.isFinite(points) &&
    points >= 0 &&
    points <= 1000 &&
    Math.abs(points * 100 - Math.round(points * 100)) < 0.000001;
  if (!validPoints(row.kill_points)) throw new Error("Kill points must be between 0 and 1000, with at most two decimal places.");
  if (!row.placement_points || typeof row.placement_points !== "object" || Array.isArray(row.placement_points))
    throw new Error("Placement points must be an object mapping places to points.");
  const entries = Object.entries(row.placement_points);
  if (!entries.length || entries.length > 64) throw new Error("Configure between 1 and 64 placements.");
  const placementPoints: Record<string, number> = {};
  for (const [place, points] of entries) {
    if (!/^[1-9]\d?$/.test(place) || Number(place) > 64 || !validPoints(points))
      throw new Error("Places must be 1–64 and points must be nonnegative numbers with at most two decimal places.");
    placementPoints[place] = points;
  }
  return {
    name: row.name.trim(),
    kill_points: row.kill_points,
    placement_points: placementPoints,
    game: "PUBG PC",
    active: true,
    rules_json: { ...parseScoringRules(row.rules_json), versioned: true },
  };
}
