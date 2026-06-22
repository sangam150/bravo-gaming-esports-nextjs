const DISPLAY_LOCALE = "en-US";
const DISPLAY_TIME_ZONE = "Asia/Kathmandu";

function parseDateValue(value?: string | number | Date | null) {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  return null;
}

export function formatDisplayNumber(value?: number | null, fallback = "0") {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }

  return value.toLocaleString(DISPLAY_LOCALE);
}

export function formatDisplayDateTime(
  value?: string | number | Date | null,
  fallback = "Time unavailable"
) {
  const parsed = parseDateValue(value);

  if (!parsed) {
    return typeof value === "string" && value.trim() ? value : fallback;
  }

  return new Intl.DateTimeFormat(DISPLAY_LOCALE, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: DISPLAY_TIME_ZONE,
  }).format(parsed);
}

export function formatDisplayDate(
  value?: string | number | Date | null,
  fallback = "Date unavailable"
) {
  const parsed = parseDateValue(value);

  if (!parsed) {
    return typeof value === "string" && value.trim() ? value : fallback;
  }

  return new Intl.DateTimeFormat(DISPLAY_LOCALE, {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: DISPLAY_TIME_ZONE,
  }).format(parsed);
}

export function formatAnnouncementDate(value?: string | number | Date | null) {
  return formatDisplayDate(value ?? new Date(), "").toUpperCase();
}
