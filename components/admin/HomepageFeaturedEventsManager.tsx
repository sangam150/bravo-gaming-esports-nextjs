"use client";

import type { HomepageEventFeatureMode, HomepageFeaturedEventRecord } from "@/lib/platform-content";
import { resolveHomepageEventAction } from "@/lib/homepage-events";
import { formatNepalDateTimeInput, nepalDateTimeLocalToUtcIso } from "@/lib/nepal-datetime";
import { resolvePublicEventPolicy } from "@/lib/public-event-policy";
import { getCanonicalPublicEventHref } from "@/lib/public-links";

export type HomepageFeatureEventOption = {
  gameSlug?: string;
  id: string;
  slug: string;
  name: string;
  status: string;
  state?: string;
  startDate?: string;
  endDate?: string;
  registrationOpen?: boolean;
  streamHref?: string | null;
};

type Props = {
  value: HomepageFeaturedEventRecord[];
  eventOptions: HomepageFeatureEventOption[];
  onChange: (nextValue: HomepageFeaturedEventRecord[]) => void;
  disabled?: boolean;
};

const inputClass = "input-esports";

function createFeature(eventSlug: string, priority: number): HomepageFeaturedEventRecord {
  return {
    eventSlug,
    priority,
    mode: "auto",
    primary: priority === 0,
  };
}

function formatDateTime(value?: string) {
  if (!value) return "open-ended";
  const parsedValue = new Date(value);
  if (Number.isNaN(parsedValue.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(parsedValue);
}

function formatFeatureWindow(feature: HomepageFeaturedEventRecord) {
  if (!feature.activeFrom && !feature.activeUntil) {
    return "Always active";
  }

  return `${formatDateTime(feature.activeFrom)} to ${formatDateTime(feature.activeUntil)}`;
}

function resolveFeaturePreview(feature: HomepageFeaturedEventRecord, event?: HomepageFeatureEventOption) {
  if (!event) {
    return {
      eventState: "Event record unavailable",
      featureWindow: formatFeatureWindow(feature),
      cta: "Hidden until the event is available",
    };
  }

  const policy = resolvePublicEventPolicy({
    status: event.status,
    state: event.state,
    startDate: event.startDate,
    endDate: event.endDate,
    registrationOpen: event.registrationOpen,
    streamHref: event.streamHref,
  });
  const action = resolveHomepageEventAction(event, feature, {
    detailHref: getCanonicalPublicEventHref(event),
  });
  const fallbackCopy =
    action.fallbackReason === "registration_closed"
      ? " (registration is not open)"
      : action.fallbackReason === "stream_unavailable"
        ? " (no verified live stream)"
        : action.fallbackReason === "invalid_custom_destination"
          ? " (invalid custom destination ignored)"
          : "";

  return {
    eventState: `${event.name} - ${policy.lifecycle.replace("_", " ")}`,
    featureWindow: formatFeatureWindow(feature),
    cta: `${action.label} -> ${action.href}${fallbackCopy}`,
  };
}

export default function HomepageFeaturedEventsManager({ value, eventOptions, onChange, disabled = false }: Props) {
  const selectedSlugs = new Set(value.map((feature) => feature.eventSlug));
  const availableEvents = eventOptions.filter((event) => !selectedSlugs.has(event.slug));

  function updateFeature(index: number, patch: Partial<HomepageFeaturedEventRecord>) {
    onChange(value.map((feature, featureIndex) => (featureIndex === index ? { ...feature, ...patch } : feature)));
  }

  function removeFeature(index: number) {
    const nextValue = value.filter((_, featureIndex) => featureIndex !== index);
    const hasPrimary = nextValue.some((feature) => feature.primary);
    onChange(
      nextValue.map((feature, featureIndex) => ({
        ...feature,
        priority: featureIndex,
        primary: hasPrimary ? feature.primary && !nextValue.slice(0, featureIndex).some((item) => item.primary) : featureIndex === 0,
      })),
    );
  }

  function setPrimary(index: number) {
    onChange(value.map((feature, featureIndex) => ({ ...feature, primary: featureIndex === index })));
  }

  return (
    <section className="rounded-card border border-white/10 bg-bg-primary p-4">
      <div>
        <p className="font-semibold text-white">Homepage event features</p>
        <p className="mt-1 text-xs leading-5 text-text-muted">
          Priority, visibility windows, and calls to action are applied only while an event remains public and actionable.
        </p>
      </div>

      <div className="mt-4 space-y-4">
        {value.map((feature, index) => {
          const event = eventOptions.find((option) => option.slug === feature.eventSlug);
          const preview = resolveFeaturePreview(feature, event);
          return (
            <fieldset key={`${feature.eventSlug}-${index}`} disabled={disabled} className="rounded-card border border-white/10 p-4">
              <legend className="px-2 text-sm font-semibold text-white">{event?.name ?? feature.eventSlug}</legend>
              <div className="grid gap-3 sm:grid-cols-2">
                <input
                  className={inputClass}
                  type="number"
                  min={0}
                  aria-label={`Priority for ${event?.name ?? feature.eventSlug}`}
                  value={feature.priority}
                  onChange={(changeEvent) => updateFeature(index, { priority: Number(changeEvent.target.value) })}
                />
                <select
                  className={inputClass}
                  aria-label={`Action mode for ${event?.name ?? feature.eventSlug}`}
                  value={feature.mode}
                  onChange={(changeEvent) => updateFeature(index, { mode: changeEvent.target.value as HomepageEventFeatureMode })}
                >
                  <option value="auto">Automatic details action</option>
                  <option value="details">Event details</option>
                  <option value="registration">Registration when open</option>
                  <option value="stream">Verified stream when live</option>
                </select>
                <input
                  className={inputClass}
                  type="datetime-local"
                  aria-label={`Feature starts for ${event?.name ?? feature.eventSlug}`}
                  value={formatNepalDateTimeInput(feature.activeFrom)}
                  onChange={(changeEvent) =>
                    updateFeature(index, {
                      activeFrom: nepalDateTimeLocalToUtcIso(changeEvent.target.value),
                    })
                  }
                />
                <input
                  className={inputClass}
                  type="datetime-local"
                  aria-label={`Feature ends for ${event?.name ?? feature.eventSlug}`}
                  value={formatNepalDateTimeInput(feature.activeUntil)}
                  onChange={(changeEvent) =>
                    updateFeature(index, {
                      activeUntil: nepalDateTimeLocalToUtcIso(changeEvent.target.value),
                    })
                  }
                />
                <input
                  className={inputClass}
                  aria-label={`Feature label for ${event?.name ?? feature.eventSlug}`}
                  placeholder="Feature label"
                  value={feature.label ?? ""}
                  onChange={(changeEvent) => updateFeature(index, { label: changeEvent.target.value || undefined })}
                />
                <input
                  className={inputClass}
                  aria-label={`CTA label for ${event?.name ?? feature.eventSlug}`}
                  placeholder="CTA label"
                  value={feature.ctaLabel ?? ""}
                  onChange={(changeEvent) => updateFeature(index, { ctaLabel: changeEvent.target.value || undefined })}
                />
                <input
                  className={`${inputClass} sm:col-span-2`}
                  aria-label={`CTA destination for ${event?.name ?? feature.eventSlug}`}
                  placeholder="/events/example or https://..."
                  value={feature.ctaHref ?? ""}
                  onChange={(changeEvent) => updateFeature(index, { ctaHref: changeEvent.target.value || undefined })}
                />
                <p className="text-xs leading-5 text-text-muted sm:col-span-2">
                  Custom destinations are used only in Event details mode. Registration and stream modes always resolve to the verified
                  event registration or live-stream destination.
                </p>
              </div>
              <div className="mt-3 flex flex-wrap gap-3">
                <button
                  type="button"
                  className={feature.primary ? "btn-primary !text-[11px]" : "btn-secondary !text-[11px]"}
                  onClick={() => setPrimary(index)}
                >
                  {feature.primary ? "Primary feature" : "Make primary"}
                </button>
                <button type="button" className="btn-secondary !text-[11px]" onClick={() => removeFeature(index)}>
                  Remove
                </button>
              </div>
              <div className="mt-3 rounded-card border border-accent-blue/20 bg-accent-blue/5 p-3 text-xs leading-5 text-text-muted">
                <p className="font-semibold text-white">{feature.label?.trim() || preview.eventState}</p>
                {feature.label?.trim() ? <p>{preview.eventState}</p> : null}
                <p>Feature window: {preview.featureWindow}</p>
                <p>Resolved action: {preview.cta}</p>
              </div>
            </fieldset>
          );
        })}
      </div>

      {availableEvents.length > 0 ? (
        <label className="mt-4 block text-xs font-semibold uppercase tracking-[0.12em] text-text-muted">
          Add event
          <select
            className={`${inputClass} mt-2 w-full`}
            value=""
            disabled={disabled}
            onChange={(event) => {
              if (!event.target.value) return;
              onChange([...value, createFeature(event.target.value, value.length)]);
            }}
          >
            <option value="">Select a published event</option>
            {availableEvents.map((event) => (
              <option key={event.id} value={event.slug}>
                {event.name} ({event.status})
              </option>
            ))}
          </select>
        </label>
      ) : null}
    </section>
  );
}
