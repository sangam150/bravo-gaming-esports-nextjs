export type EventSchedule = {
  version: 1;
  stage: string;
  timeZone: string;
  matches: {
    matchNumber: number;
    map: string;
    scheduledAt: string;
    status: "upcoming" | "scheduled" | "lobby-open" | "in-progress" | "awaiting-results" | "under-review" | "completed" | "postponed" | "cancelled";
    matchId?: string;
    stageId?: string;
    groupId?: string;
    dayId?: string;
    title?: string;
    displayTitle?: string;
    actualStartAt?: string;
    actualEndAt?: string;
    teamIds?: string[];
    observerNotes?: string;
  }[];
};
export function formatEventSchedule(value?: string) {
  try {
    const schedule = parseEventSchedule(value);
    if (!schedule) return value || "";
    const formatter = new Intl.DateTimeFormat("en-GB", {
      timeZone: schedule.timeZone,
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    });
    return [
      schedule.stage,
      ...schedule.matches.map(
        (match) =>
          `Match ${match.matchNumber} · ${match.map} · ${formatter.format(new Date(match.scheduledAt))} (${schedule.timeZone}) · ${match.status.replaceAll("-", " ")}`,
      ),
    ]
      .filter(Boolean)
      .join("\n");
  } catch {
    return "Schedule unavailable. Please review its settings.";
  }
}
export function publicEventSchedule(value?: string) {
  try {
    const parsed = parseEventSchedule(value);
    if (!parsed) return value?.trim().startsWith("{") ? undefined : value;
    return JSON.stringify({ ...parsed, matches: parsed.matches.map(row => { const match = { ...row }; delete match.observerNotes; return match; }) });
  } catch { return undefined; }
}
export function scheduleForDay<T extends { scheduledAt: string }>(matches: T[], timeZone: string, epoch: number) {
  const format = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" });
  const today = format.format(new Date(epoch));
  return matches.filter((match) => format.format(new Date(match.scheduledAt)) === today);
}
export function parseEventSchedule(value?: string): EventSchedule | null {
  if (!value?.trim().startsWith("{")) return null;
  let row;
  try {
    row = JSON.parse(value);
  } catch {
    return null;
  }
  if (row.version !== 1) return null;
  if (typeof row.stage !== "string" || row.stage.length > 100 || typeof row.timeZone !== "string")
    throw new Error("Invalid event schedule settings.");
  try {
    new Intl.DateTimeFormat("en", { timeZone: row.timeZone }).format();
  } catch {
    throw new Error("Select a valid event timezone.");
  }
  if (!Array.isArray(row.matches) || row.matches.length > 100) throw new Error("A schedule supports up to 100 matches.");
  const seen = new Set<number>();
  const matches = row.matches.map((item: Record<string, unknown>) => {
    if (!item || !Number.isInteger(item.matchNumber) || Number(item.matchNumber) < 1 || seen.has(Number(item.matchNumber)))
      throw new Error("Schedule match numbers must be positive and unique.");
    seen.add(Number(item.matchNumber));
    if (typeof item.map !== "string" || !item.map.trim() || item.map.length > 80)
      throw new Error("A map is required for each scheduled match.");
    if (
      typeof item.scheduledAt !== "string" ||
      !/(Z|[+-]\d{2}:\d{2})$/.test(item.scheduledAt) ||
      !Number.isFinite(Date.parse(item.scheduledAt))
    )
      throw new Error("Schedule times must include a timezone.");
    if (!["upcoming", "scheduled", "lobby-open", "in-progress", "awaiting-results", "under-review", "completed", "postponed", "cancelled"].includes(String(item.status))) throw new Error("Select a valid schedule status.");
    if (item.matchId !== undefined && (typeof item.matchId !== "string" || item.matchId.length > 160))
      throw new Error("Invalid scheduled match reference.");
    const context: Record<string, string> = {};
    for (const key of ["stageId", "groupId", "dayId", "title", "displayTitle", "observerNotes", "actualStartAt", "actualEndAt"]) {
      if (item[key] !== undefined && (typeof item[key] !== "string" || String(item[key]).length > (key === "observerNotes" ? 1000 : 160))) throw new Error(`Invalid match ${key}.`);
      if (item[key]) context[key] = String(item[key]);
    }
    for (const key of ["actualStartAt", "actualEndAt"]) if (context[key] && (!/(Z|[+-]\d{2}:\d{2})$/.test(context[key]) || !Number.isFinite(Date.parse(context[key])))) throw new Error("Actual match times must have explicit timezones.");
    if (item.teamIds !== undefined && (!Array.isArray(item.teamIds) || item.teamIds.length > 200 || item.teamIds.some(id => typeof id !== "string" || id.length > 160))) throw new Error("Invalid participating teams.");
    return {
      ...context,
      teamIds: (item.teamIds ?? []) as string[],
      matchNumber: Number(item.matchNumber),
      map: item.map.trim(),
      scheduledAt: new Date(item.scheduledAt).toISOString(),
      status: item.status as EventSchedule["matches"][number]["status"],
      ...(item.matchId ? { matchId: item.matchId as string } : {}),
    };
  });
  return {
    version: 1,
    stage: row.stage.trim(),
    timeZone: row.timeZone,
    matches: matches.sort((a: { matchNumber: number }, b: { matchNumber: number }) => a.matchNumber - b.matchNumber),
  };
}
