/** Convert using the event timezone rather than the operator computer's timezone. */
export function formatEventDateTimeInput(value: string | undefined, timeZone: string) {
  if (!value || !Number.isFinite(Date.parse(value))) return "";
  try {
    const parts = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date(value));
    const part = (name: string) => parts.find(item => item.type === name)?.value ?? "";
    return `${part("year")}-${part("month")}-${part("day")}T${part("hour")}:${part("minute")}`;
  } catch { return ""; }
}
export function eventDateTimeLocalToUtcIso(value: string, timeZone: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return null;
  const wall = Date.parse(`${value}:00Z`);
  if (!Number.isFinite(wall)) return null;
  const offsets = new Set<number>();
  for (let hours = -36; hours <= 36; hours += 6) {
    const probe = wall + hours * 3600000;
    const local = formatEventDateTimeInput(new Date(probe).toISOString(), timeZone);
    if (local) offsets.add(Date.parse(`${local}:00Z`) - probe);
  }
  const candidates = [...offsets].map(offset => new Date(wall - offset).toISOString()).filter(iso => formatEventDateTimeInput(iso, timeZone) === value);
  // Reject nonexistent and ambiguous DST times; never silently select another instant.
  return candidates.length === 1 ? candidates[0] : null;
}
