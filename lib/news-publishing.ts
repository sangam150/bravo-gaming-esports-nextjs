export type ManagedNewsStateValue = "draft" | "published" | "scheduled";

type NewsPublicationShape = {
  state?: string | null;
  publishAt?: string | null;
  publishedAt?: string | null;
  updatedAt?: string | null;
  date?: string | null;
  excerpt?: string | null;
  summary?: string | null;
};

const KATHMANDU_OFFSET = "+05:45";
const KATHMANDU_TIME_ZONE = "Asia/Kathmandu";

function padDatePart(value: string) {
  return value.padStart(2, "0");
}

export function normalizeNewsDateTime(value?: string | null) {
  const normalizedValue = value?.trim();
  if (!normalizedValue) {
    return undefined;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(normalizedValue)) {
    return `${normalizedValue}T00:00:00${KATHMANDU_OFFSET}`;
  }

  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(normalizedValue)) {
    return `${normalizedValue}:00${KATHMANDU_OFFSET}`;
  }

  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(normalizedValue)) {
    return `${normalizedValue}${KATHMANDU_OFFSET}`;
  }

  const parsedValue = new Date(normalizedValue);
  if (Number.isNaN(parsedValue.getTime())) {
    return undefined;
  }

  return parsedValue.toISOString();
}

export function formatKathmanduDateTimeInput(value?: string | null) {
  const normalizedValue = normalizeNewsDateTime(value);
  if (!normalizedValue) {
    return "";
  }

  const parsedValue = new Date(normalizedValue);
  if (Number.isNaN(parsedValue.getTime())) {
    return "";
  }

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: KATHMANDU_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    hourCycle: "h23",
  }).formatToParts(parsedValue);

  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;
  const hour = parts.find((part) => part.type === "hour")?.value;
  const minute = parts.find((part) => part.type === "minute")?.value;

  if (!year || !month || !day || hour === undefined || minute === undefined) {
    return "";
  }

  return `${year}-${padDatePart(month)}-${padDatePart(day)}T${padDatePart(hour)}:${padDatePart(minute)}`;
}

function getPublicationTimestamp(value?: string | null) {
  if (!value) return Number.NaN;
  return Date.parse(value);
}

export function resolveManagedNewsEffectiveState(
  article: Pick<NewsPublicationShape, "state" | "publishAt">,
  referenceDate = new Date(),
): ManagedNewsStateValue {
  if (article.state === "published") {
    return "published";
  }

  if (article.state === "scheduled") {
    const publishTimestamp = getPublicationTimestamp(normalizeNewsDateTime(article.publishAt));
    if (Number.isFinite(publishTimestamp) && publishTimestamp <= referenceDate.getTime()) {
      return "published";
    }

    return "scheduled";
  }

  return "draft";
}

export function isManagedNewsArticlePublic(article: Pick<NewsPublicationShape, "state" | "publishAt">, referenceDate = new Date()) {
  return resolveManagedNewsEffectiveState(article, referenceDate) === "published";
}

function getManagedNewsPublishedAt(article: NewsPublicationShape) {
  return normalizeNewsDateTime(article.publishedAt) ?? normalizeNewsDateTime(article.publishAt);
}

export function getManagedNewsSortValue(article: NewsPublicationShape) {
  return (
    getManagedNewsPublishedAt(article) ??
    normalizeNewsDateTime(article.publishAt) ??
    article.date?.trim() ??
    article.updatedAt?.trim() ??
    ""
  );
}
