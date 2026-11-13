import { resolvePublicAssetUrl } from "./public-asset-url";
export const BROADCAST_LABELS = { kills: "Kills", damage: "Damage", assists: "Assists", knocks: "Knockdowns", survivalTime: "Survival time", totalPoints: "Total", rank: "Rank", team: "Team", matches: "Played", wins: "Wins", placement: "Place", placementPoints: "Place pts", killPoints: "Kill pts", matchPerformance: "Match performance", matchMvp: "Match MVP", upcomingMatch: "Upcoming match", resumingIn: "Stream resuming in", returnMessage: "The broadcast returns shortly." };
export type BroadcastLabelKey = keyof typeof BROADCAST_LABELS;
export const DEFAULT_BROADCAST_TEMPLATE = {
  title: "",
  subtitle: "",
  tournamentTitle: "",
  dayLabel: "",
  matchLabel: "",
  logoUrl: "",
  backgroundUrl: "",
  accent: "#2f8cff",
  font: "condensed",
  layout: "reference",
  alignment: "left",
  rows: 12,
  safeMargin: 72,
  logoSize: 100,
  portraitX: 50,
  portraitY: 50,
  backgroundX: 50,
  backgroundY: 50,
  showSponsors: true,
  sponsorPosition: "bottom",
  hiddenColumns: [] as string[],
  hiddenStats: [] as string[],
  labels: { ...BROADCAST_LABELS },
  animation: "fade",
  duration: 380,
};
export type BroadcastTemplate = typeof DEFAULT_BROADCAST_TEMPLATE;
export function defaultBroadcastTemplate(graphic: string) {
  return {
    ...DEFAULT_BROADCAST_TEMPLATE,
    layout: ["compact-scoreboard", "match-info", "sponsor-strip", "lower-third"].includes(graphic) ? "transparent" : "reference",
    rows:
      graphic === "team-slots"
        ? 16
        : graphic === "todays-matches"
        ? 5
        : ["scoreboard", "results", "rankings", "standings", "group-standings", "day-standings", "final-rankings"].includes(graphic)
          ? 24
          : 12,
    hiddenColumns: [] as string[],
    hiddenStats: ["mvp"].includes(graphic) ? ["assists"] : ["players", "top-fragger", "top-damage", "team-stats"].includes(graphic) ? ["survivalTime"] : [],
    labels: { ...BROADCAST_LABELS },
  };
}
export function parseBroadcastTemplate(value: unknown): BroadcastTemplate {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid graphic template.");
  const input = value as Record<string, unknown>;
  const output = { ...DEFAULT_BROADCAST_TEMPLATE, hiddenColumns: [] as string[] };
  for (const key of ["title", "subtitle", "tournamentTitle", "dayLabel", "matchLabel"] as const) {
    if (input[key] !== undefined && (typeof input[key] !== "string" || String(input[key]).length > 160))
      throw new Error("Graphic text must be at most 160 characters.");
    output[key] = String(input[key] ?? "").trim();
  }
  for (const key of ["logoUrl", "backgroundUrl"] as const) {
    const url = input[key] ?? "";
    if (typeof url !== "string" || url.length > 2000 || (url && (!resolvePublicAssetUrl(url) || /\/private\//i.test(url))))
      throw new Error("Use a public approved graphic asset.");
    if (url.includes("://")) {
      const parsed = new URL(url);
      if (parsed.username || parsed.password || (parsed.search && parsed.pathname !== "/api/uploads/r2"))
        throw new Error("Signed or credential-bearing URLs are not allowed.");
    }
    output[key] = url;
  }
  if (input.accent !== undefined && !/^#[0-9a-f]{6}$/i.test(String(input.accent))) throw new Error("Select a valid accent color.");
  output.accent = String(input.accent ?? output.accent);
  for (const [key, choices] of Object.entries({
    font: ["condensed", "sans"],
    layout: ["reference", "clean", "compact", "transparent"],
    alignment: ["left", "center", "right"],
    animation: ["fade", "none"],
    sponsorPosition: ["top", "bottom"],
  })) {
    if (input[key] !== undefined && !choices.includes(String(input[key]))) throw new Error(`Invalid ${key} preset.`);
    if (input[key] !== undefined) (output as Record<string, unknown>)[key] = input[key];
  }
  for (const [key, min, max] of [
    ["rows", 4, 24],
    ["safeMargin", 32, 96],
    ["logoSize", 48, 140],
    ["portraitX", 0, 100],
    ["portraitY", 0, 100],
    ["backgroundX", 0, 100],
    ["backgroundY", 0, 100],
    ["duration", 0, 1000],
  ] as const) {
    if (input[key] !== undefined && (!Number.isSafeInteger(input[key]) || Number(input[key]) < min || Number(input[key]) > max))
      throw new Error(`${key} must be between ${min} and ${max}.`);
    if (input[key] !== undefined) output[key] = Number(input[key]);
  }
  if (input.showSponsors !== undefined && typeof input.showSponsors !== "boolean") throw new Error("Invalid sponsor visibility.");
  output.showSponsors = input.showSponsors !== false;
  if (
    input.hiddenColumns !== undefined &&
    (!Array.isArray(input.hiddenColumns) ||
      input.hiddenColumns.some((column) => !["matches", "placementPoints", "killPoints", "kills", "wins"].includes(String(column))))
  )
    throw new Error("Invalid visible columns.");
  output.hiddenColumns = [...new Set((input.hiddenColumns ?? []) as string[])];
  if (input.hiddenStats !== undefined && (!Array.isArray(input.hiddenStats) || input.hiddenStats.length > 5 || input.hiddenStats.some(key => !["kills", "damage", "assists", "knocks", "survivalTime"].includes(String(key))))) throw new Error("Invalid visible statistics.");
  output.hiddenStats = [...new Set((input.hiddenStats ?? []) as string[])];
  const labels = input.labels ?? {};
  if (!labels || typeof labels !== "object" || Array.isArray(labels)) throw new Error("Invalid graphic labels.");
  output.labels = { ...BROADCAST_LABELS };
  for (const [key, value] of Object.entries(labels)) {
    if (!(key in BROADCAST_LABELS) || typeof value !== "string" || !value.trim() || value.length > 60) throw new Error("Graphic labels must use supported keys and 1–60 characters.");
    output.labels[key as BroadcastLabelKey] = value.trim();
  }
  return output;
}
export function broadcastLabel(template: BroadcastTemplate, key: BroadcastLabelKey) { return template.labels?.[key] || BROADCAST_LABELS[key]; }
