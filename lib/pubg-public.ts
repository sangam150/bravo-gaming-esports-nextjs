const PUBG_MATCH_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CONTROL_CHARACTER_PATTERN = /[\u0000-\u001f\u007f]/;
const PUBG_TELEMETRY_HOST = "telemetry-cdn.pubg.com";

type JsonRecord = Record<string, unknown>;

export type PublicPubgPlayer = {
  name: string;
};

export type PublicPubgMatchSummary = {
  id: string;
  mapName: string | null;
  gameMode: string | null;
  createdAt: string | null;
  duration: number | null;
};

function asRecord(value: unknown): JsonRecord | null {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? (value as JsonRecord) : null;
}

function getResource(document: unknown) {
  const data = asRecord(document)?.data;
  const resource = Array.isArray(data) ? data[0] : data;
  return asRecord(resource);
}

function safeString(value: unknown, maxLength: number) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  if (!normalized || normalized.length > maxLength || CONTROL_CHARACTER_PATTERN.test(normalized)) {
    return null;
  }

  return normalized;
}

function safeDuration(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 86_400 ? value : null;
}

export function normalizePubgPlayerName(value: string | null) {
  const normalized = safeString(value, 64);
  return normalized && !normalized.includes(",") ? normalized : null;
}

export function normalizePubgMatchId(value: string | null) {
  const normalized = safeString(value, 64);
  return normalized && PUBG_MATCH_ID_PATTERN.test(normalized) ? normalized : null;
}

export function toPublicPubgPlayer(document: unknown): PublicPubgPlayer | null {
  const attributes = asRecord(getResource(document)?.attributes);
  const name = safeString(attributes?.name, 64);
  return name ? { name } : null;
}

export function toPublicPubgMatchSummary(document: unknown, requestedMatchId: string): PublicPubgMatchSummary | null {
  const fallbackId = normalizePubgMatchId(requestedMatchId);
  const resource = getResource(document);
  const attributes = asRecord(resource?.attributes);
  if (!fallbackId || !resource || !attributes) {
    return null;
  }

  const resourceId = safeString(resource.id, 64);
  const id = resourceId && PUBG_MATCH_ID_PATTERN.test(resourceId) ? resourceId : fallbackId;

  return {
    id,
    mapName: safeString(attributes.mapName, 100),
    gameMode: safeString(attributes.gameMode, 100),
    createdAt: safeString(attributes.createdAt, 80),
    duration: safeDuration(attributes.duration),
  };
}

export function isTrustedPubgTelemetryUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname.toLowerCase() === PUBG_TELEMETRY_HOST;
  } catch {
    return false;
  }
}

export function isPubgNotFoundError(error: unknown) {
  return error instanceof Error && /^PUBG API error 404(?:\s|:|$)/i.test(error.message);
}
