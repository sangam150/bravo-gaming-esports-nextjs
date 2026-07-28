type CanonicalPublicEventStatus = "live" | "upcoming" | "completed" | "planned";
export type PublicEventLifecycle = "draft" | "registration_open" | "upcoming" | "ongoing" | "completed" | "cancelled" | "archived";

export type PublicEventPolicyInput = {
  status?: string | null;
  state?: string | null;
  published?: boolean | null;
  startDate?: string | null;
  endDate?: string | null;
  registrationOpen?: boolean | null;
  registrationStatus?: string | null;
  registrationStartDate?: string | null;
  registrationEndDate?: string | null;
  registrationRequiresWindow?: boolean;
  teamCount?: number | null;
  maxTeams?: number | null;
  streamHref?: string | null;
};

export type PublicEventPolicy = {
  lifecycle: PublicEventLifecycle;
  status: CanonicalPublicEventStatus;
  published: boolean;
  registrationOpen: boolean;
  streamHref: string | null;
};

const COMPLETED_STATUSES = new Set(["completed", "finished", "ended"]);
const LIVE_STATUSES = new Set(["active", "live", "ongoing"]);
const PLANNED_STATUSES = new Set(["draft", "planned", "coming_soon"]);
const EXPLICIT_OPEN_REGISTRATION_STATUSES = new Set(["open", "registering", "registration_open"]);

function parseTimestamp(value?: string | null, endOfDayForDateOnly = false) {
  if (!value) return Number.NaN;
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return Number.NaN;
  return endOfDayForDateOnly && /^\d{4}-\d{2}-\d{2}$/.test(value) ? timestamp + 86_399_999 : timestamp;
}

export function normalizeVerifiedStreamHref(value?: string | null) {
  const normalizedValue = value?.trim();
  if (!normalizedValue) return null;

  try {
    const parsedUrl = new URL(normalizedValue);
    if (parsedUrl.protocol !== "https:" || !parsedUrl.hostname || parsedUrl.username || parsedUrl.password) {
      return null;
    }
    return parsedUrl.toString();
  } catch {
    return null;
  }
}

function resolvePublicEventLifecycle(
  input: Pick<PublicEventPolicyInput, "status" | "startDate" | "endDate">,
  now = Date.now(),
): PublicEventLifecycle {
  const normalizedStatus = input.status?.trim().toLowerCase() ?? "";
  if (normalizedStatus === "cancelled" || normalizedStatus === "canceled") return "cancelled";
  if (normalizedStatus === "archived") return "archived";
  if (COMPLETED_STATUSES.has(normalizedStatus)) return "completed";

  const endTimestamp = parseTimestamp(input.endDate, true);
  if (Number.isFinite(endTimestamp) && endTimestamp < now) return "completed";

  const startTimestamp = parseTimestamp(input.startDate);
  if (Number.isFinite(startTimestamp) && startTimestamp > now) {
    return PLANNED_STATUSES.has(normalizedStatus) ? "draft" : "upcoming";
  }

  if (LIVE_STATUSES.has(normalizedStatus)) return "ongoing";
  if (PLANNED_STATUSES.has(normalizedStatus)) return "draft";
  if (Number.isFinite(startTimestamp) && startTimestamp <= now) return "draft";
  return "upcoming";
}

function toLegacyPublicEventStatus(lifecycle: PublicEventLifecycle): CanonicalPublicEventStatus {
  if (lifecycle === "ongoing") return "live";
  if (lifecycle === "registration_open" || lifecycle === "upcoming") return "upcoming";
  if (lifecycle === "draft") return "planned";
  return "completed";
}

function isWithinRegistrationWindow(input: PublicEventPolicyInput, now: number) {
  const startTimestamp = parseTimestamp(input.registrationStartDate);
  const endTimestamp = parseTimestamp(input.registrationEndDate, true);
  const hasStart = Number.isFinite(startTimestamp);
  const hasEnd = Number.isFinite(endTimestamp);

  if (input.registrationRequiresWindow && (!hasStart || !hasEnd)) {
    return false;
  }
  if (hasStart && startTimestamp > now) return false;
  if (hasEnd && endTimestamp < now) return false;

  if (!hasEnd) {
    const eventStartTimestamp = parseTimestamp(input.startDate);
    if (Number.isFinite(eventStartTimestamp) && eventStartTimestamp <= now) return false;
  }

  return true;
}

export function resolvePublicEventPolicy(input: PublicEventPolicyInput, now = Date.now()): PublicEventPolicy {
  const normalizedState = input.state?.trim().toLowerCase();
  const published = input.published !== false && (!normalizedState || normalizedState === "published" || normalizedState === "locked");
  const inferredLifecycle = resolvePublicEventLifecycle(input, now);
  const registrationStatus = input.registrationStatus?.trim().toLowerCase() ?? "";
  const explicitlyOpen =
    input.registrationOpen === true ||
    EXPLICIT_OPEN_REGISTRATION_STATUSES.has(registrationStatus) ||
    EXPLICIT_OPEN_REGISTRATION_STATUSES.has(input.status?.trim().toLowerCase() ?? "");
  const isFull =
    typeof input.maxTeams === "number" && input.maxTeams > 0 && typeof input.teamCount === "number" && input.teamCount >= input.maxTeams;
  const registrationOpen =
    published && inferredLifecycle === "upcoming" && explicitlyOpen && !isFull && isWithinRegistrationWindow(input, now);
  const lifecycle: PublicEventLifecycle =
    !published && inferredLifecycle !== "cancelled" && inferredLifecycle !== "archived"
      ? "draft"
      : registrationOpen
        ? "registration_open"
        : inferredLifecycle;

  return {
    lifecycle,
    status: toLegacyPublicEventStatus(lifecycle),
    published,
    registrationOpen,
    streamHref: published && lifecycle === "ongoing" ? normalizeVerifiedStreamHref(input.streamHref) : null,
  };
}

export function canRegisterForPublicEvent(
  event: Pick<PublicEventPolicyInput, "status" | "state" | "published" | "registrationOpen" | "startDate" | "endDate">,
  now = Date.now(),
) {
  return resolvePublicEventPolicy(event, now).registrationOpen;
}
