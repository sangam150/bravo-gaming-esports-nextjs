import type { HomepageFeaturedEventRecord } from "./platform-content";
import { resolvePublicEventPolicy } from "./public-event-policy";
import { getCanonicalPublicEventHref, normalizePublicActionHref } from "./public-links";

export type HomepageEventFeature = Omit<HomepageFeaturedEventRecord, "eventSlug">;

export type HomepageEventCandidate = {
  gameSlug?: string | null;
  id: string;
  slug: string;
  status: string;
  state?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  registrationOpen?: boolean | null;
  registrationStartDate?: string | null;
  registrationEndDate?: string | null;
  streamHref?: string | null;
};

export type FeaturedHomepageEvent<T extends HomepageEventCandidate> = T & {
  homepageFeature?: HomepageEventFeature;
};

export type HomepageEventAction = {
  href: string;
  kind: "custom" | "details" | "registration" | "stream";
  label: string;
  fallbackReason?: "invalid_custom_destination" | "registration_closed" | "stream_unavailable";
};

function parseTimestamp(value?: string | null, endOfDayForDateOnly = false) {
  if (!value) return Number.NaN;
  return Date.parse(endOfDayForDateOnly && /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T23:59:59.999Z` : value);
}

function isFeatureActive(feature: HomepageFeaturedEventRecord, now: number) {
  const activeFrom = parseTimestamp(feature.activeFrom);
  const activeUntil = parseTimestamp(feature.activeUntil, true);
  if (Number.isFinite(activeFrom) && activeFrom > now) return false;
  if (Number.isFinite(activeUntil) && activeUntil < now) return false;
  return true;
}

function isHomepageEligible(event: HomepageEventCandidate, now: number) {
  const policy = resolvePublicEventPolicy(event, now);
  return (
    policy.published && (policy.lifecycle === "registration_open" || policy.lifecycle === "upcoming" || policy.lifecycle === "ongoing")
  );
}

/**
 * Resolve the exact homepage action from the same policy used to publish the
 * event. Registration and stream modes intentionally ignore custom
 * destinations so a stale override cannot bypass lifecycle checks.
 */
export function resolveHomepageEventAction(
  event: HomepageEventCandidate,
  feature?: HomepageEventFeature,
  options: { detailHref?: string; now?: number } = {},
): HomepageEventAction {
  const detailHref = options.detailHref ?? getCanonicalPublicEventHref(event);
  const policy = resolvePublicEventPolicy(event, options.now ?? Date.now());
  const customLabel = feature?.ctaLabel?.trim() || undefined;

  if (feature?.mode === "registration") {
    if (policy.registrationOpen) {
      return {
        href: `/teams/register?tournament=${encodeURIComponent(event.id)}`,
        kind: "registration",
        label: customLabel ?? "Register Team",
      };
    }
    return {
      href: detailHref,
      kind: "details",
      label: "View Details",
      fallbackReason: "registration_closed",
    };
  }

  if (feature?.mode === "stream") {
    if (policy.lifecycle === "ongoing" && policy.streamHref) {
      return {
        href: policy.streamHref,
        kind: "stream",
        label: customLabel ?? "Watch Live",
      };
    }
    return {
      href: detailHref,
      kind: "details",
      label: "View Details",
      fallbackReason: "stream_unavailable",
    };
  }

  const customHref = feature?.mode === "details" ? normalizePublicActionHref(feature.ctaHref) : undefined;
  if (customHref) {
    return {
      href: customHref,
      kind: "custom",
      label: customLabel ?? "View Details",
    };
  }

  return {
    href: detailHref,
    kind: "details",
    label: customLabel ?? "View Details",
    fallbackReason: feature?.mode === "details" && feature.ctaHref ? "invalid_custom_destination" : undefined,
  };
}

function compareFallbackEvents(firstEvent: HomepageEventCandidate, secondEvent: HomepageEventCandidate, now: number) {
  const firstPolicy = resolvePublicEventPolicy(firstEvent, now);
  const secondPolicy = resolvePublicEventPolicy(secondEvent, now);
  const ongoingDelta = Number(secondPolicy.lifecycle === "ongoing") - Number(firstPolicy.lifecycle === "ongoing");
  if (ongoingDelta !== 0) return ongoingDelta;

  const firstDate = parseTimestamp(firstEvent.startDate);
  const secondDate = parseTimestamp(secondEvent.startDate);
  if (Number.isFinite(firstDate) && Number.isFinite(secondDate) && firstDate !== secondDate) {
    return firstDate - secondDate;
  }
  if (Number.isFinite(firstDate) !== Number.isFinite(secondDate)) return Number.isFinite(firstDate) ? -1 : 1;
  return firstEvent.slug.localeCompare(secondEvent.slug);
}

export function selectHomepageEvents<T extends HomepageEventCandidate>(
  events: readonly T[],
  features: readonly HomepageFeaturedEventRecord[],
  options: { now?: number; limit?: number } = {},
): Array<FeaturedHomepageEvent<T>> {
  const now = options.now ?? Date.now();
  const limit = Math.max(1, options.limit ?? 4);
  const eventBySlug = new Map(events.map((event) => [event.slug, event] as const));
  const selectedIds = new Set<string>();
  const configured = [...features]
    .filter((feature) => isFeatureActive(feature, now))
    .sort(
      (firstFeature, secondFeature) =>
        Number(secondFeature.primary) - Number(firstFeature.primary) ||
        firstFeature.priority - secondFeature.priority ||
        firstFeature.eventSlug.localeCompare(secondFeature.eventSlug),
    )
    .flatMap((feature) => {
      const event = eventBySlug.get(feature.eventSlug);
      if (!event || selectedIds.has(event.id) || !isHomepageEligible(event, now)) return [];
      selectedIds.add(event.id);
      const homepageFeature: HomepageEventFeature = {
        priority: feature.priority,
        activeFrom: feature.activeFrom,
        activeUntil: feature.activeUntil,
        label: feature.label,
        mode: feature.mode,
        ctaLabel: feature.ctaLabel,
        ctaHref: normalizePublicActionHref(feature.ctaHref),
        primary: feature.primary,
      };
      return [{ ...event, homepageFeature }];
    });

  const fallback = [...events]
    .filter((event) => !selectedIds.has(event.id) && isHomepageEligible(event, now))
    .sort((firstEvent, secondEvent) => compareFallbackEvents(firstEvent, secondEvent, now));

  return [...configured, ...fallback].slice(0, limit);
}
