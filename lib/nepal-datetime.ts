const KATHMANDU_OFFSET = "+05:45";
const KATHMANDU_TIME_ZONE = "Asia/Kathmandu";

function padDatePart(value: string) {
  return value.padStart(2, "0");
}

/**
 * Convert a value entered in a Nepal-local `datetime-local` control to a
 * timezone-safe UTC ISO timestamp. Existing ISO timestamps are normalized too.
 */
export function nepalDateTimeLocalToUtcIso(value?: string | null) {
  const normalizedValue = value?.trim();
  if (!normalizedValue) return undefined;

  let parseableValue = normalizedValue;
  if (/^\d{4}-\d{2}-\d{2}$/.test(normalizedValue)) {
    parseableValue = `${normalizedValue}T00:00:00${KATHMANDU_OFFSET}`;
  } else if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(normalizedValue)) {
    parseableValue = `${normalizedValue}:00${KATHMANDU_OFFSET}`;
  } else if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(normalizedValue)) {
    parseableValue = `${normalizedValue}${KATHMANDU_OFFSET}`;
  }

  const parsedValue = new Date(parseableValue);
  return Number.isNaN(parsedValue.getTime()) ? undefined : parsedValue.toISOString();
}

/** Format a stored timestamp for a Nepal-local `datetime-local` control. */
export function formatNepalDateTimeInput(value?: string | null) {
  const normalizedValue = nepalDateTimeLocalToUtcIso(value);
  if (!normalizedValue) return "";

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: KATHMANDU_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    hourCycle: "h23",
  }).formatToParts(new Date(normalizedValue));

  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;
  const hour = parts.find((part) => part.type === "hour")?.value;
  const minute = parts.find((part) => part.type === "minute")?.value;
  if (!year || !month || !day || hour === undefined || minute === undefined) return "";

  return `${year}-${padDatePart(month)}-${padDatePart(day)}T${padDatePart(hour)}:${padDatePart(minute)}`;
}
